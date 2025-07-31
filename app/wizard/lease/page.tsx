"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { leaseService } from "@/lib/services/lease-service"
import { propertyService } from "@/lib/services/property-service"
import { noticeService } from "@/lib/services/notice-service"
import { PDFTemplateSelector } from "@/components/lease/pdf-template-selector"
import { TemplateMeta } from "@/lib/services/template-service"
import { toast } from "sonner"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"

export default function LeaseWizardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const propertyId = searchParams.get("propertyId")
  const [property, setProperty] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateMeta | null>(null)
  const [receiverEmail, setReceiverEmail] = useState("")

  useEffect(() => {
    async function fetchProperty() {
      if (!propertyId) return
      setLoading(true)
      const prop = await propertyService.getProperty(propertyId)
      setProperty(prop)
      setLoading(false)
    }
    fetchProperty()
  }, [propertyId])

  const handleTemplateSelect = (template: TemplateMeta | null) => {
    setSelectedTemplate(template)
  }

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    if (!propertyId || !selectedTemplate || !receiverEmail.trim()) {
      toast.error("Please select a PDF template and enter receiver email")
      return
    }
    try {
      setLoading(true)
      
      // Create the lease
      const leaseId = await leaseService.createLease({
        propertyId,
        landlordId: property.landlordId,
        renterId: receiverEmail.trim(),
        startDate: new Date(),
        endDate: new Date(),
        monthlyRent: 0,
        securityDeposit: 0,
        status: "draft",
        leaseTerms: {
          petPolicy: false,
          smokingAllowed: false,
          utilitiesIncluded: [],
          parkingIncluded: false,
          customClauses: [],
        },
        signatureStatus: {
          renterSigned: false,
          coSignerRequired: false,
          landlordSigned: false,
        },
      })

      // Create a filledLeases record
      const filledLeaseData = {
        originalTemplateUrl: selectedTemplate.url,
        filledPdfUrl: null, // Will be filled when renter completes it
        receiverEmail: receiverEmail.trim(),
        templateName: selectedTemplate.name,
        status: "pending",
        leaseId: leaseId,
        propertyId: propertyId,
        landlordId: property.landlordId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }
      
      const filledLeaseRef = await addDoc(collection(db, "filledLeases"), filledLeaseData)

      // Create a notice for the renter
      await noticeService.createNotice({
        type: "lease_received",
        subject: "New Lease Agreement Received",
        message: `You have received a new lease agreement for the property. Please review and sign the document at your earliest convenience.`,
        landlordId: property.landlordId,
        propertyId: propertyId,
        renterId: receiverEmail.trim(),
        leaseAgreementId: filledLeaseRef.id,
      })

      toast.success("Lease created and notice sent to renter successfully")
      router.push(`/properties/${propertyId}`)
    } catch (error) {
      console.error("Error creating lease:", error)
      toast.error("Failed to create lease")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="container mx-auto p-6">Loading...</div>
  }

  if (!property) {
    return <div className="container mx-auto p-6 text-destructive">Property not found.</div>
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-8 text-primary">Select PDF Template for {property.address.street}</h1>
        
        <div className="space-y-8">
          <PDFTemplateSelector 
            onTemplateSelect={handleTemplateSelect}
            selectedTemplate={selectedTemplate}
            propertyId={propertyId || undefined}
            landlordId={property?.landlordId}
            receiverEmail={receiverEmail}
            onReceiverEmailChange={setReceiverEmail}
          />
          
          <div className="flex justify-center">
            <Button 
              onClick={handleSubmit} 
              disabled={loading || !selectedTemplate || !receiverEmail.trim()} 
              size="lg"
              className="px-8 py-3"
            >
              {loading ? "Creating..." : "Create Lease and Send to Renter"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
