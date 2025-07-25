"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PropertyForm } from "@/components/properties/property-form"
import { propertyService } from "@/lib/services/property-service"
import { toast } from "sonner"

export default function EditPropertyPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const [property, setProperty] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchProperty() {
      if (!params?.id) return
      setLoading(true)
      const prop = await propertyService.getProperty(params.id)
      setProperty(prop)
      setLoading(false)
    }
    fetchProperty()
  }, [params?.id])

  const handleSave = async (updatedData: any) => {
    try {
      setLoading(true)
      await propertyService.updateProperty(params.id, updatedData)
      toast.success("Property updated successfully")
    router.push(`/properties/${params.id}`)
    } catch (error) {
      toast.error("Failed to update property")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="container mx-auto p-6">Loading property...</div>
  }

  if (!property) {
    return <div className="container mx-auto p-6 text-destructive">Property not found.</div>
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => router.push(`/properties/${params.id}`)} disabled={loading}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Property
        </Button>
      </div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Edit Property</h1>
        <p className="text-muted-foreground">Update the details for this property</p>
      </div>
      <PropertyForm
        property={property}
        onSave={handleSave}
        onCancel={() => router.push(`/properties/${params.id}`)}
      />
    </div>
  )
}
