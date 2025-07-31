"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { toast } from "sonner"
import type { Property } from "@/types"
import { invoiceService } from "@/lib/services/invoice-service"
import { noticeService } from "@/lib/services/notice-service"

interface InvoiceFormProps {
  isOpen: boolean
  onClose: () => void
  notice: any
  onSubmit: (invoiceData: any) => void
}

export function InvoiceForm({ isOpen, onClose, notice, onSubmit }: InvoiceFormProps) {
  const [propertyDetails, setPropertyDetails] = useState<Property | null>(null)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    notes: "",
    includePetFee: false,
  })

  // Fetch property details
  useEffect(() => {
    if (notice?.propertyId) {
      console.log("Fetching property details for propertyId:", notice.propertyId)
      const fetchProperty = async () => {
        try {
          const propRef = doc(db, "properties", notice.propertyId)
          const propSnap = await getDoc(propRef)
          if (propSnap.exists()) {
            const propertyData = propSnap.data() as Property
            console.log("Property data fetched:", propertyData)
            setPropertyDetails(propertyData)
          } else {
            console.error("Property not found for ID:", notice.propertyId)
          }
        } catch (error) {
          console.error("Error fetching property details:", error)
        }
      }
      fetchProperty()
    }
  }, [notice?.propertyId])

  const calculateInvoiceAmount = () => {
    if (!propertyDetails) return 0
    
    const monthlyRent = propertyDetails.monthlyRent || 0
    const securityDeposit = propertyDetails.securityDeposit || 0
    const applicationFee = propertyDetails.applicationFee || 0
    const petDeposit = formData.includePetFee ? (propertyDetails.petPolicy?.fee || 0) : 0
    
    // Calculate total: 1 month rent + security deposit + application fee + pet deposit (if included)
    const total = monthlyRent + securityDeposit + applicationFee + petDeposit
    
    return total
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Check if property details are loaded
    if (!propertyDetails) {
      toast.error("Property details are still loading. Please wait and try again.")
      return
    }
    
    setLoading(true)

    try {
      const invoiceAmount = calculateInvoiceAmount()
      
      console.log("Property Details:", propertyDetails)
      console.log("Invoice Amount:", invoiceAmount)
      console.log("Include Pet Fee:", formData.includePetFee)
      
      // Calculate breakdown amounts
      const monthlyRent = propertyDetails?.monthlyRent || 0
      const securityDeposit = propertyDetails?.securityDeposit || 0
      const applicationFee = propertyDetails?.applicationFee || 0
      const petFee = formData.includePetFee ? (propertyDetails?.petPolicy?.fee || 0) : 0

      // Create invoice record with breakdown
      const invoiceData = {
        landlordId: notice.landlordId,
        propertyId: notice.propertyId,
        renterEmail: notice.renterEmail,
        renterId: notice.renterId || notice.renterEmail, // Use renterEmail as fallback if renterId is undefined
        amount: invoiceAmount,
        // Breakdown amounts
        monthlyRent: monthlyRent,
        securityDeposit: securityDeposit,
        applicationFee: applicationFee,
        petFee: petFee,
        notes: formData.notes,
        includePetFee: formData.includePetFee,
        status: "sent" as const,
        propertyDetails: propertyDetails,
        noticeId: notice.id,
      }

      console.log("Invoice Data:", invoiceData)
      const invoiceId = await invoiceService.createInvoice(invoiceData)

      // Send notification to renter
      await noticeService.createNotice({
        type: "invoice_sent",
        subject: "New Invoice Received",
        message: `You have received a new invoice for $${invoiceAmount.toLocaleString()} for the property at ${propertyDetails?.address?.street}. Please review and pay by the due date.`,
        landlordId: notice.landlordId,
        propertyId: notice.propertyId,
        renterId: notice.renterEmail,
        renterEmail: notice.renterEmail,
        invoiceId: invoiceId,
      })

      await onSubmit(invoiceData)
      toast.success("Invoice sent successfully!")
      onClose()
    } catch (error) {
      console.error("Error sending invoice:", error)
      toast.error("Failed to send invoice")
    } finally {
      setLoading(false)
    }
  }

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const invoiceAmount = calculateInvoiceAmount()
  const petFee = propertyDetails?.petPolicy?.fee || 0

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send Invoice to Renter</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Property Information */}
          <Card>
            <CardHeader>
              <CardTitle>Property Information</CardTitle>
            </CardHeader>
            <CardContent>
              {propertyDetails ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Property Address</Label>
                      <p className="text-sm text-muted-foreground">
                        {propertyDetails.address?.street}
                        {propertyDetails.address?.unit && `, Unit ${propertyDetails.address.unit}`}
                        <br />
                        {propertyDetails.address?.city}, {propertyDetails.address?.state} {propertyDetails.address?.postalCode}
                      </p>
                    </div>
                    <div>
                      <Label>Property Type</Label>
                      <p className="text-sm text-muted-foreground capitalize">
                        {propertyDetails.type}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label>Monthly Rent</Label>
                      <p className="text-lg font-semibold text-primary">
                        ${propertyDetails.monthlyRent?.toLocaleString() || 0}
                      </p>
                    </div>
                    <div>
                      <Label>Security Deposit</Label>
                      <p className="text-lg font-semibold">
                        ${propertyDetails.securityDeposit?.toLocaleString() || 0}
                      </p>
                    </div>
                    <div>
                      <Label>Application Fee</Label>
                      <p className="text-lg font-semibold">
                        ${propertyDetails.applicationFee?.toLocaleString() || 0}
                      </p>
                    </div>
                    <div>
                      <Label>Pet Fee Available</Label>
                      <p className="text-lg font-semibold">
                        ${petFee.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">Loading property details...</p>
              )}
            </CardContent>
          </Card>

          {/* Renter Information */}
          <Card>
            <CardHeader>
              <CardTitle>Renter Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>Renter Email</Label>
                  <p className="text-sm text-muted-foreground">
                    {notice?.renterEmail || notice?.renterId || "N/A"}
                  </p>
                </div>
                <div>
                  <Label>Lease Agreement</Label>
                  <p className="text-sm text-muted-foreground">
                    {notice?.subject || "Lease Agreement"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Invoice Details */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includePetFee"
                    checked={formData.includePetFee}
                    onCheckedChange={(checked) => updateField("includePetFee", checked)}
                  />
                  <Label htmlFor="includePetFee" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Include Pet Fee (${petFee.toLocaleString()})
                  </Label>
                </div>
                <div>
                  <Label htmlFor="notes">Additional Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => updateField("notes", e.target.value)}
                    placeholder="Any additional notes for the renter..."
                    rows={3}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Invoice Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span>Monthly Rent:</span>
                  <span>${propertyDetails?.monthlyRent?.toLocaleString() || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Security Deposit:</span>
                  <span>${propertyDetails?.securityDeposit?.toLocaleString() || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Application Fee:</span>
                  <span>${propertyDetails?.applicationFee?.toLocaleString() || 0}</span>
                </div>
                {formData.includePetFee && (
                  <div className="flex justify-between items-center">
                    <span>Pet Fee:</span>
                    <span>${petFee.toLocaleString()}</span>
                  </div>
                )}
                <div className="border-t pt-3">
                  <div className="flex justify-between items-center text-lg font-semibold">
                    <span>Total Amount:</span>
                    <span className="text-primary">${invoiceAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !propertyDetails}>
              {loading ? "Sending..." : !propertyDetails ? "Loading Property Details..." : "Send Invoice"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
} 