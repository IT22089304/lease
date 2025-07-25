"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useAuth } from "@/lib/auth"
import { invitationService } from "@/lib/services/invitation-service"

// Sample properties data
const sampleProperties = [
  {
    id: "1",
    address: {
      street: "123 Main St",
      unit: "A",
      city: "San Francisco",
      state: "CA",
      country: "US",
      postalCode: "94105",
    },
    type: "apartment",
    bedrooms: 2,
    bathrooms: 1,
    squareFootage: 850,
    rent: 2500,
    description: "Modern apartment with great views",
    status: "available",
    amenities: ["Air Conditioning", "Dishwasher", "In-unit Laundry"],
    petPolicy: {
      allowed: true,
      restrictions: "Cats only, max 2",
      petDeposit: 500,
    },
    images: [
      "/placeholder.svg?height=400&width=600",
      "/placeholder.svg?height=400&width=600",
      "/placeholder.svg?height=400&width=600",
    ],
  },
  {
    id: "2",
    address: {
      street: "456 Oak Ave",
      city: "Los Angeles",
      state: "CA",
      country: "US",
      postalCode: "90001",
    },
    type: "house",
    bedrooms: 3,
    bathrooms: 2,
    squareFootage: 1500,
    rent: 3200,
    description: "Spacious house with backyard",
    status: "occupied",
    amenities: ["Garage", "Balcony", "Pool"],
    petPolicy: {
      allowed: false,
    },
    images: ["/placeholder.svg?height=400&width=600", "/placeholder.svg?height=400&width=600"],
  },
  {
    id: "3",
    address: {
      street: "789 Pine St",
      unit: "5B",
      city: "New York",
      state: "NY",
      country: "US",
      postalCode: "10001",
    },
    type: "condo",
    bedrooms: 1,
    bathrooms: 1,
    squareFootage: 650,
    rent: 2100,
    description: "Cozy condo in the heart of the city",
    status: "available",
    amenities: ["Elevator", "Fitness Center"],
    petPolicy: {
      allowed: true,
      restrictions: "Small dogs only",
      petDeposit: 300,
    },
    images: ["/placeholder.svg?height=400&width=600"],
  },
]

export default function NewInvitationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const propertyId = searchParams.get("propertyId")

  const [formData, setFormData] = useState({
    propertyId: propertyId || "",
    renterEmail: "",
    rent: 0,
    securityDeposit: 0,
    petsAllowed: false,
    petDeposit: 0,
    message: "",
    addendums: [] as string[],
    customAddendums: [] as string[],
    landlordInfo: {
      name: "John Landlord",
      phone: "555-123-4567",
      email: "landlord@example.com",
    },
  })

  const [availableProperties, setAvailableProperties] = useState<any[]>([])
  const [selectedProperty, setSelectedProperty] = useState<any>(null)
  const [newAddendum, setNewAddendum] = useState("")
  const [rephraseText, setRephraseText] = useState("")
  const [isRephrasing, setIsRephrasing] = useState(false)

  useEffect(() => {
    // In a real app, fetch available properties from API
    const properties = sampleProperties.filter((p) => p.status === "available")
    setAvailableProperties(properties)

    if (propertyId) {
      const property = properties.find((p) => p.id === propertyId)
      if (property) {
        setSelectedProperty(property)
        setFormData((prev) => ({
          ...prev,
          propertyId: property.id,
          rent: property.rent,
          securityDeposit: property.rent,
          petsAllowed: property.petPolicy?.allowed || false,
          petDeposit: property.petPolicy?.petDeposit || 0,
        }))
      }
    }
  }, [propertyId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      alert("You must be logged in to send an invitation.")
      return
    }
    try {
      await invitationService.createInvitation({
        propertyId: formData.propertyId,
        landlordId: user.id,
        renterEmail: formData.renterEmail,
        status: "pending",
        invitedAt: new Date(),
      })
      alert("Invitation sent successfully!")
      router.push("/invitations")
    } catch (error) {
      console.error("Failed to send invitation:", error)
      alert("Failed to send invitation. Please try again.")
    }
  }

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const updateLandlordField = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      landlordInfo: { ...prev.landlordInfo, [field]: value },
    }))
  }

  const formatAddress = (address: any) => {
    return `${address.street}${address.unit ? `, Unit ${address.unit}` : ""}, ${address.city}, ${address.state} ${address.postalCode}`
  }

  const addendumOptions = [
    "Pet Addendum",
    "Parking Agreement",
    "Utility Responsibility",
    "Maintenance Policy",
    "Smoking Policy",
    "Guest Policy",
    "Storage Agreement",
    "Pool/Amenity Rules",
  ]

  const handleAddCustomAddendum = () => {
    if (newAddendum.trim()) {
      setFormData((prev) => ({
        ...prev,
        customAddendums: [...prev.customAddendums, newAddendum.trim()],
      }))
      setNewAddendum("")
    }
  }

  const handleRemoveCustomAddendum = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      customAddendums: prev.customAddendums.filter((_, i) => i !== index),
    }))
  }

  const handleRephrase = () => {
    if (!rephraseText.trim()) return

    setIsRephrasing(true)
    
    // Simulate AI rephrasing with a timeout
    setTimeout(() => {
      // In a real app, this would call an AI service
      const rephrased = `${rephraseText} [rephrased in a more professional tone]`
      setRephraseText(rephrased)
      setIsRephrasing(false)
    }, 1000)
  }

  const handleAddRephrased = () => {
    if (rephraseText.trim()) {
      setFormData((prev) => ({
        ...prev,
        customAddendums: [...prev.customAddendums, rephraseText.trim()],
      }))
      setRephraseText("")
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => router.push("/invitations")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Invitations
        </Button>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">Send Rental Invitation</h1>
        <p className="text-muted-foreground">Invite a potential renter to apply for your property</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Property & Renter</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="property">Select Property*</Label>
              <Select
                value={formData.propertyId}
                onValueChange={(value) => {
                  const property = availableProperties.find((p) => p.id === value)
                  setSelectedProperty(property)
                  updateField("propertyId", value)
                  updateField("rent", property?.rent || 0)
                  updateField("securityDeposit", property?.rent || 0)
                  updateField("petsAllowed", property?.petPolicy?.allowed || false)
                  updateField("petDeposit", property?.petPolicy?.petDeposit || 0)
                }}
                required
              >
                <SelectTrigger id="property">
                  <SelectValue placeholder="Select a property" />
                </SelectTrigger>
                <SelectContent>
                  {availableProperties.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {formatAddress(property.address)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="renter-email">Renter Email*</Label>
              <Input
                id="renter-email"
                type="email"
                value={formData.renterEmail}
                onChange={(e) => updateField("renterEmail", e.target.value)}
                placeholder="renter@example.com"
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Landlord Information */}
        <Card>
          <CardHeader>
            <CardTitle>Landlord Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="landlord-name">Landlord Name*</Label>
                <Input
                  id="landlord-name"
                  value={formData.landlordInfo.name}
                  onChange={(e) => updateLandlordField("name", e.target.value)}
                  placeholder="Full name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="landlord-phone">Phone Number*</Label>
                <Input
                  id="landlord-phone"
                  value={formData.landlordInfo.phone}
                  onChange={(e) => updateLandlordField("phone", e.target.value)}
                  placeholder="555-123-4567"
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="landlord-email">Email Address*</Label>
              <Input
                id="landlord-email"
                type="email"
                value={formData.landlordInfo.email}
                onChange={(e) => updateLandlordField("email", e.target.value)}
                placeholder="landlord@example.com"
                required
              />
            </div>
          </CardContent>
        </Card>

        {selectedProperty && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Lease Terms</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="rent">Monthly Rent ($)*</Label>
                    <Input
                      id="rent"
                      type="number"
                      min="0"
                      value={formData.rent}
                      onChange={(e) => updateField("rent", Number.parseInt(e.target.value) || 0)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="security-deposit">Security Deposit ($)*</Label>
                    <Input
                      id="security-deposit"
                      type="number"
                      min="0"
                      value={formData.securityDeposit}
                      onChange={(e) => updateField("securityDeposit", Number.parseInt(e.target.value) || 0)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="pets-allowed"
                      checked={formData.petsAllowed}
                      onCheckedChange={(checked) => updateField("petsAllowed", !!checked)}
                    />
                    <label
                      htmlFor="pets-allowed"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Pets Allowed
                    </label>
                  </div>

                  {formData.petsAllowed && (
                    <div className="ml-6 mt-2">
                      <Label htmlFor="pet-deposit">Pet Deposit ($)</Label>
                      <Input
                        id="pet-deposit"
                        type="number"
                        min="0"
                        value={formData.petDeposit}
                        onChange={(e) => updateField("petDeposit", Number.parseInt(e.target.value) || 0)}
                        className="max-w-xs"
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Addendums</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {addendumOptions.map((addendum) => (
                    <div key={addendum} className="flex items-center space-x-2">
                      <Checkbox
                        id={`addendum-${addendum}`}
                        checked={formData.addendums.includes(addendum)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            updateField("addendums", [...formData.addendums, addendum])
                          } else {
                            updateField(
                              "addendums",
                              formData.addendums.filter((a: string) => a !== addendum)
                            )
                          }
                        }}
                      />
                      <label htmlFor={`addendum-${addendum}`}>{addendum}</label>
                    </div>
                  ))}
                </div>
                {/* Custom Addendums and Rephrase UI would go here */}
              </CardContent>
            </Card>
          </>
        )}
        <div className="flex justify-end mt-6">
          <Button type="submit">Send Invitation</Button>
        </div>
      </form>
    </div>
  )
}
