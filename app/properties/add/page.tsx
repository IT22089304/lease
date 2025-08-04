"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PropertyForm } from "@/components/properties/property-form"
import { propertyService } from "@/lib/services/property-service"
import { useAuth } from "@/lib/auth"
import type { Property } from "@/types"
import { toast } from "sonner"

type PropertyFormData = {
  title: string
  address: {
    street: string
    unit?: string
    city: string
    state: string
    country: string
    postalCode: string
  }
  type: string
  bedrooms: number
  bathrooms: number
  squareFeet: number
  description?: string
  amenities?: string[]
  images?: string[]
  monthlyRent: number
  securityDeposit: number
  applicationFee: number
  petPolicy?: {
    allowed: boolean
    maxPets?: number
    fee?: number
    restrictions?: string
  }
}

export default function AddPropertyPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)

  const handleSaveProperty = async (propertyData: PropertyFormData, imageFiles: File[]) => {
    if (!user) return

    try {
      setLoading(true)
      // Add landlordId to the property data
      const propertyWithLandlord = {
        ...propertyData,
        landlordId: user.id,
      }

      // Save to Firebase with image uploads
      await propertyService.addProperty(propertyWithLandlord, imageFiles)
      
      toast.success("Property added successfully")
      router.push("/dashboard")
    } catch (error) {
      console.error("Error adding property:", error)
      toast.error("Failed to add property. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (!user || user.role !== "landlord") {
    return <div>Access denied. Landlord access required.</div>
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => router.push("/dashboard")} disabled={loading}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">Add New Property</h1>
        <p className="text-muted-foreground">Enter the details for your new rental property</p>
      </div>

      <PropertyForm 
        onSave={handleSaveProperty} 
        onCancel={() => router.push("/dashboard")} 
        loading={loading}
      />
    </div>
  )
}
