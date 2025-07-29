"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { leaseService } from "@/lib/services/lease-service"
import { propertyService } from "@/lib/services/property-service"
import { PDFTemplateSelector } from "@/components/lease/pdf-template-selector"
import { TemplateMeta } from "@/lib/services/template-service"
import { toast } from "sonner"

export default function LeaseWizardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const propertyId = searchParams.get("propertyId")
  const [property, setProperty] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateMeta | null>(null)

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
    if (!propertyId || !selectedTemplate) {
      toast.error("Please select a PDF template")
      return
    }
    try {
      setLoading(true)
      await leaseService.createLease({
        propertyId,
        landlordId: property.landlordId,
        renterId: "", // Will be filled later
        startDate: new Date(),
        endDate: new Date(),
        monthlyRent: 0,
        securityDeposit: 0,
        status: "draft",
        templateId: selectedTemplate.id,
        templateUrl: selectedTemplate.url,
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
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      toast.success("Lease template selected successfully")
      router.push(`/properties/${propertyId}`)
    } catch (error) {
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
          />
          
          <div className="flex justify-center">
            <Button 
              onClick={handleSubmit} 
              disabled={loading || !selectedTemplate} 
              size="lg"
              className="px-8 py-3"
            >
              {loading ? "Creating..." : "Create Lease with Selected Template"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
