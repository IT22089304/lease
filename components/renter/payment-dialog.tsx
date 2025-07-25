"use client"

import type React from "react"

import { useState } from "react"
import { CreditCard, Building, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { loadStripe } from "@stripe/stripe-js"
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js"

interface PaymentDialogProps {
  amount: number
  onSuccess: (paymentData: any) => void
  onCancel: () => void
}

function StripeCardForm({ amount, onSuccess, onCancel }: PaymentDialogProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)
    setError(null)
    // 1. Create payment intent
    const res = await fetch("/api/stripe/intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    })
    const data = await res.json()
    if (!data.clientSecret) {
      setError(data.error || "Failed to create payment intent")
      setIsProcessing(false)
      return
    }
    // 2. Confirm card payment
    const cardElement = elements?.getElement(CardElement)
    if (!stripe || !cardElement) {
      setError("Stripe not loaded")
      setIsProcessing(false)
      return
    }
    const result = await stripe.confirmCardPayment(data.clientSecret, {
      payment_method: {
        card: cardElement,
      },
    })
    if (result.error) {
      setError(result.error.message || "Payment failed")
      setIsProcessing(false)
      return
    }
    if (result.paymentIntent?.status === "succeeded") {
      onSuccess({ amount, method: "Stripe Card", stripeId: result.paymentIntent.id, timestamp: new Date() })
    }
    setIsProcessing(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <CardElement options={{ hidePostalCode: true }} className="p-2 border rounded" />
      {error && <div className="text-destructive text-sm">{error}</div>}
      <div className="flex gap-2 pt-4">
        <Button type="submit" className="flex-1" disabled={isProcessing}>
          {isProcessing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Processing...
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" />
              Pay ${amount.toFixed(2)}
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

export function PaymentDialog({ amount, onSuccess, onCancel }: PaymentDialogProps) {
  const [paymentMethod, setPaymentMethod] = useState("card")
  const [isProcessing, setIsProcessing] = useState(false)
  const [formData, setFormData] = useState({
    cardNumber: "",
    expiryDate: "",
    cvv: "",
    cardholderName: "",
    bankAccount: "",
    routingNumber: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)

    // Simulate payment processing
    await new Promise((resolve) => setTimeout(resolve, 2000))

    onSuccess({
      amount,
      method: paymentMethod === "card" ? "Credit Card" : "Bank Transfer",
      timestamp: new Date(),
    })

    setIsProcessing(false)
  }

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

  return (
    <div className="space-y-6">
      {/* Payment Summary */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Amount Due</p>
              <p className="text-2xl font-bold">${amount.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Due Date</p>
              <p className="font-medium">{new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Method Selection */}
      <div>
        <Label>Payment Method</Label>
        <div className="grid grid-cols-2 gap-4 mt-2">
          <Card
            className={`cursor-pointer transition-colors ${paymentMethod === "card" ? "ring-2 ring-primary" : ""}`}
            onClick={() => setPaymentMethod("card")}
          >
            <CardContent className="p-4 text-center">
              <CreditCard className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="font-medium">Credit/Debit Card</p>
              <p className="text-xs text-muted-foreground">Instant processing</p>
            </CardContent>
          </Card>
          <Card
            className={`cursor-pointer transition-colors ${paymentMethod === "bank" ? "ring-2 ring-primary" : ""}`}
            onClick={() => setPaymentMethod("bank")}
          >
            <CardContent className="p-4 text-center">
              <Building className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="font-medium">Bank Transfer</p>
              <p className="text-xs text-muted-foreground">1-3 business days</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Payment Form */}
      {paymentMethod === "card" ? (
        <Elements stripe={stripePromise}>
          <StripeCardForm amount={amount} onSuccess={onSuccess} onCancel={onCancel} />
        </Elements>
      ) : (
        <div className="text-muted-foreground">Bank transfer coming soon.</div>
      )}
    </div>
  )
}
