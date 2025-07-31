"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DollarSign, CreditCard, CheckCircle } from "lucide-react"
import { loadStripe } from "@stripe/stripe-js"
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js"
import { toast } from "sonner"
import { paymentService } from "@/lib/services/payment-service"
import { securityDepositService } from "@/lib/services/security-deposit-service"
import { leaseService } from "@/lib/services/lease-service"
import { noticeService } from "@/lib/services/notice-service"
import { invoiceService } from "@/lib/services/invoice-service"
import { propertyService } from "@/lib/services/property-service"
import { userService } from "@/lib/services/user-service"
import { notificationService } from "@/lib/services/notification-service"
import type { Invoice } from "@/types"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface InvoicePaymentProps {
  invoice: Invoice
  onSuccess: () => void
  onCancel: () => void
}

function StripePaymentForm({ invoice, onSuccess, onCancel }: InvoicePaymentProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsProcessing(true)
    setError(null)

    try {
      // Create payment intent
      const res = await fetch("/api/stripe/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: invoice.amount }),
      })
      
      const data = await res.json()
      if (!data.clientSecret) {
        setError(data.error || "Failed to create payment intent")
        setIsProcessing(false)
        return
      }

      const cardElement = elements?.getElement(CardElement)
      if (!stripe || !cardElement) {
        setError("Stripe not loaded")
        setIsProcessing(false)
        return
      }

      // Confirm payment
      const result = await stripe.confirmCardPayment(data.clientSecret, {
        payment_method: { card: cardElement },
      })

      if (result.error) {
        setError(result.error.message || "Payment failed")
        setIsProcessing(false)
        return
      }

      if (result.paymentIntent?.status === "succeeded") {
        // Process successful payment
        await processSuccessfulPayment(result.paymentIntent.id)
        onSuccess()
      }
    } catch (error) {
      console.error("Payment error:", error)
      setError("Payment failed. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  const processSuccessfulPayment = async (stripePaymentId: string) => {
    try {
      // Update invoice status
      await updateInvoiceStatus(invoice.id, "paid")

      // Create payment records
      await createPaymentRecords(stripePaymentId)

      // Update lease status if this is initial payment
      await updateLeaseStatus()

      // Update renter's current property
      await updateRenterCurrentProperty()

      // Send confirmation notice to landlord
      await sendPaymentConfirmation()

      toast.success("Payment successful! Your invoice has been paid and notifications have been sent.")
    } catch (error) {
      console.error("Error processing payment:", error)
      toast.error("Payment processed but there was an error updating records.")
    }
  }

  const updateInvoiceStatus = async (invoiceId: string, status: "paid") => {
    // Update invoice status in database
    await invoiceService.updateInvoiceStatus(invoiceId, status)
  }

  const createPaymentRecords = async (stripePaymentId: string) => {
    // Use the breakdown amounts from the invoice
    const monthlyRent = invoice.monthlyRent || 0
    const securityDeposit = invoice.securityDeposit || 0
    const applicationFee = invoice.applicationFee || 0
    const petFee = invoice.petFee || 0

    console.log("Creating payment records with breakdown:", {
      monthlyRent,
      securityDeposit,
      applicationFee,
      petFee
    })

    // Create security deposit record if applicable
    if (securityDeposit > 0) {
      await securityDepositService.createDeposit({
        leaseId: invoice.propertyId, // Using propertyId as leaseId for now
        renterId: invoice.renterId,
        landlordId: invoice.landlordId,
        amount: securityDeposit,
        paidDate: new Date(),
        paymentMethod: "Stripe Card",
        transactionId: stripePaymentId,
      })
      console.log("Security deposit record created:", securityDeposit)
    }

    // Create monthly rent payment record
    if (monthlyRent > 0) {
      await paymentService.createPayment({
        leaseId: invoice.propertyId,
        amount: monthlyRent,
        dueDate: new Date(),
        paidDate: new Date(),
        status: "paid",
        paymentMethod: "Stripe Card",
        transactionId: stripePaymentId,
        renterId: invoice.renterId,
        landlordId: invoice.landlordId,
        paymentType: "monthly_rent"
      })
      console.log("Monthly rent payment record created:", monthlyRent)
    }

    // Create application fee payment record
    if (applicationFee > 0) {
      await paymentService.createPayment({
        leaseId: invoice.propertyId,
        amount: applicationFee,
        dueDate: new Date(),
        paidDate: new Date(),
        status: "paid",
        paymentMethod: "Stripe Card",
        transactionId: stripePaymentId,
        renterId: invoice.renterId,
        landlordId: invoice.landlordId,
        paymentType: "application_fee"
      })
      console.log("Application fee payment record created:", applicationFee)
    }

    // Create pet fee payment record
    if (petFee > 0) {
      await paymentService.createPayment({
        leaseId: invoice.propertyId,
        amount: petFee,
        dueDate: new Date(),
        paidDate: new Date(),
        status: "paid",
        paymentMethod: "Stripe Card",
        transactionId: stripePaymentId,
        renterId: invoice.renterId,
        landlordId: invoice.landlordId,
        paymentType: "pet_fee"
      })
      console.log("Pet fee payment record created:", petFee)
    }
  }

  const updateLeaseStatus = async () => {
    try {
      // Find the lease agreement for this property and renter
      const leases = await leaseService.getRenterLeases(invoice.renterEmail)
      const relevantLease = leases.find(lease => lease.propertyId === invoice.propertyId)
      
      if (relevantLease) {
        // Update lease status to "active" (confirmed)
        await leaseService.updateLease(relevantLease.id, {
          status: "active",
          updatedAt: new Date()
        })

        // Update property status to "occupied"
        await propertyService.updateProperty(invoice.propertyId, {
          status: "occupied"
        })

        console.log("Lease confirmed and property status updated")
      } else {
        // If no lease found, create a new active lease
        console.log("No existing lease found, creating new active lease")
        await leaseService.createLease({
          propertyId: invoice.propertyId,
          landlordId: invoice.landlordId,
          renterId: invoice.renterId,
          startDate: new Date(),
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
          monthlyRent: invoice.propertyDetails?.monthlyRent || 0,
          securityDeposit: invoice.propertyDetails?.securityDeposit || 0,
          status: "active",
          leaseTerms: {
            petPolicy: false,
            smokingAllowed: false,
            utilitiesIncluded: [],
            parkingIncluded: false,
            customClauses: []
          },
          signatureStatus: {
            renterSigned: true,
            renterSignedAt: new Date(),
            coSignerRequired: false,
            landlordSigned: true,
            landlordSignedAt: new Date(),
            completedAt: new Date()
          }
        })

        // Update property status to "occupied"
        await propertyService.updateProperty(invoice.propertyId, {
          status: "occupied"
        })

        console.log("New lease created and property status updated")
      }
    } catch (error) {
      console.error("Error updating lease status:", error)
    }
  }

  const updateRenterCurrentProperty = async () => {
    try {
      // Update the renter's current property in the users collection
      await userService.updateRenterCurrentProperty(
        invoice.renterId,
        invoice.propertyId,
        invoice.propertyDetails
      )
      console.log("Renter's current property updated successfully")
    } catch (error) {
      console.error("Error updating renter's current property:", error)
    }
  }

  const sendPaymentConfirmation = async () => {
    try {
      // Send notification to landlord about payment received (landlord should see this)
      await noticeService.createNotice({
        type: "payment_received", // Use specific type for landlord
        subject: "Payment Received - Invoice Paid",
        message: `Payment of $${invoice.amount.toLocaleString()} has been received from ${invoice.renterEmail} for the property at ${invoice.propertyDetails?.address?.street}. The lease agreement has been confirmed and the property is now occupied.`,
        landlordId: invoice.landlordId,
        propertyId: invoice.propertyId,
        renterId: invoice.renterEmail,
        renterEmail: invoice.renterEmail,
      })

      // Send notification to renter about successful payment (renter should see this)
      await noticeService.createNotice({
        type: "payment_successful", // Use specific type for renter
        subject: "Payment Successful - Invoice Paid",
        message: `Your payment of $${invoice.amount.toLocaleString()} has been successfully processed for the property at ${invoice.propertyDetails?.address?.street}. Your lease agreement has been confirmed and you can now move into the property.`,
        landlordId: invoice.landlordId,
        propertyId: invoice.propertyId,
        renterId: invoice.renterEmail,
        renterEmail: invoice.renterEmail,
      })

      // Send landlord notification about new tenant
      const propertyAddress = `${invoice.propertyDetails?.address?.street}${invoice.propertyDetails?.address?.unit ? `, Unit ${invoice.propertyDetails.address.unit}` : ""}, ${invoice.propertyDetails?.address?.city}, ${invoice.propertyDetails?.address?.state}`
      await notificationService.notifyTenantMovedIn(
        invoice.landlordId,
        invoice.propertyId,
        invoice.renterEmail,
        propertyAddress
      )

      console.log("Payment confirmation notifications sent to both landlord and renter")
    } catch (error) {
      console.error("Error sending payment confirmation:", error)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Card Information</label>
        <CardElement 
          options={{ 
            hidePostalCode: true,
            style: {
              base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': {
                  color: '#aab7c4',
                },
              },
            },
          }} 
          className="p-3 border rounded-md"
        />
      </div>
      
      {error && (
        <div className="text-destructive text-sm bg-destructive/10 p-2 rounded">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <div className="flex justify-between items-center text-sm">
          <span>Total Amount:</span>
          <span className="font-semibold text-lg">${invoice.amount.toLocaleString()}</span>
        </div>
        
                 <div className="text-xs text-muted-foreground space-y-1">
           <div className="flex justify-between">
             <span>Monthly Rent:</span>
             <span>${invoice.monthlyRent?.toLocaleString() || 0}</span>
           </div>
           <div className="flex justify-between">
             <span>Security Deposit:</span>
             <span>${invoice.securityDeposit?.toLocaleString() || 0}</span>
           </div>
           <div className="flex justify-between">
             <span>Application Fee:</span>
             <span>${invoice.applicationFee?.toLocaleString() || 0}</span>
           </div>
           {invoice.petFee > 0 && (
             <div className="flex justify-between">
               <span>Pet Fee:</span>
               <span>${invoice.petFee?.toLocaleString() || 0}</span>
             </div>
           )}
         </div>
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" className="flex-1" disabled={isProcessing}>
          {isProcessing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Processing...
            </>
          ) : (
            <>
              <DollarSign className="h-4 w-4 mr-2" />
              Pay ${invoice.amount.toLocaleString()}
            </>
          )}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isProcessing}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

export function InvoicePayment({ invoice, onSuccess, onCancel }: InvoicePaymentProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Elements stripe={stripePromise}>
          <StripePaymentForm invoice={invoice} onSuccess={onSuccess} onCancel={onCancel} />
        </Elements>
      </CardContent>
    </Card>
  )
} 