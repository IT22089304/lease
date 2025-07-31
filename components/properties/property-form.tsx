"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import type { Property } from "@/types"

type PropertyFormData = {
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

interface PropertyFormProps {
  property?: PropertyFormData | null
  onSave: (property: PropertyFormData) => void
  onCancel: () => void
}

export function PropertyForm({ property, onSave, onCancel }: PropertyFormProps) {
  const [formData, setFormData] = useState<PropertyFormData>({
    address: {
      street: "",
      unit: "",
      city: "",
      state: "CA",
      country: "US",
      postalCode: "",
    },
    type: "apartment",
    bedrooms: 1,
    bathrooms: 1,
    squareFeet: 0,
    description: "",
    amenities: [],
    images: [],
    monthlyRent: 0,
    securityDeposit: 0,
    applicationFee: 0,
    petPolicy: { allowed: false, maxPets: 1, fee: 0, restrictions: "" },
  })

  // Only update form data when property prop changes
  useEffect(() => {
    if (property) {
      setFormData(property)
    }
  }, [property])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const updateAddressField = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      address: { ...prev.address, [field]: value },
    }))
  }

  const amenityOptions = [
    "Air Conditioning",
    "Balcony",
    "Dishwasher",
    "Elevator",
    "Fitness Center",
    "Furnished",
    "Garage",
    "In-unit Laundry",
    "Pool",
    "Parking",
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Property Address */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-medium mb-4">Property Address</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="street">Street Address*</Label>
                <Input
                  id="street"
                  value={formData.address.street}
                  onChange={(e) => updateAddressField("street", e.target.value)}
                  placeholder="123 Main Street"
                  required
                />
              </div>
              <div>
                <Label htmlFor="unit">Unit/Apt Number</Label>
                <Input
                  id="unit"
                  value={formData.address.unit}
                  onChange={(e) => updateAddressField("unit", e.target.value)}
                  placeholder="A, 1B, etc."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">City*</Label>
                <Input
                  id="city"
                  value={formData.address.city}
                  onChange={(e) => updateAddressField("city", e.target.value)}
                  placeholder="City name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="postal-code">Postal/ZIP Code*</Label>
                <Input
                  id="postal-code"
                  value={formData.address.postalCode}
                  onChange={(e) => updateAddressField("postalCode", e.target.value)}
                  placeholder="12345 or A1B 2C3"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="country">Country*</Label>
                <Select
                  value={formData.address.country}
                  onValueChange={(value) => updateAddressField("country", value)}
                >
                  <SelectTrigger id="country">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="US">United States</SelectItem>
                    <SelectItem value="CA">Canada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="state">State/Province*</Label>
                <Select value={formData.address.state} onValueChange={(value) => updateAddressField("state", value)}>
                  <SelectTrigger id="state">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {formData.address.country === "US" ? (
                      <>
                        <SelectItem value="AL">Alabama</SelectItem>
                        <SelectItem value="AK">Alaska</SelectItem>
                        <SelectItem value="AZ">Arizona</SelectItem>
                        <SelectItem value="CA">California</SelectItem>
                        <SelectItem value="CO">Colorado</SelectItem>
                        <SelectItem value="FL">Florida</SelectItem>
                        <SelectItem value="NY">New York</SelectItem>
                        <SelectItem value="TX">Texas</SelectItem>
                        {/* Add more states as needed */}
                      </>
                    ) : (
                      <>
                        <SelectItem value="AB">Alberta</SelectItem>
                        <SelectItem value="BC">British Columbia</SelectItem>
                        <SelectItem value="ON">Ontario</SelectItem>
                        <SelectItem value="QC">Quebec</SelectItem>
                        {/* Add more provinces as needed */}
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Property Details */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-medium mb-4">Property Details</h3>
          <div className="space-y-4">
              <div>
                <Label htmlFor="type">Property Type*</Label>
                <Select value={formData.type} onValueChange={(value: any) => updateField("type", value)}>
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="apartment">Apartment</SelectItem>
                    <SelectItem value="house">House</SelectItem>
                    <SelectItem value="condo">Condo</SelectItem>
                    <SelectItem value="townhouse">Townhouse</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="bedrooms">Bedrooms*</Label>
                <Input
                  id="bedrooms"
                  type="number"
                  min="0"
                  value={formData.bedrooms}
                  onChange={(e) => updateField("bedrooms", Number.parseInt(e.target.value) || 0)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="bathrooms">Bathrooms*</Label>
                <Input
                  id="bathrooms"
                  type="number"
                  min="0"
                  step="0.5"
                  value={formData.bathrooms}
                  onChange={(e) => updateField("bathrooms", Number.parseFloat(e.target.value) || 0)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="square-feet">Square Feet*</Label>
                <Input
                  id="square-feet"
                  type="number"
                  min="0"
                  value={formData.squareFeet}
                  onChange={(e) => updateField("squareFeet", Number.parseInt(e.target.value) || 0)}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => updateField("description", e.target.value)}
                placeholder="Describe the property features, amenities, neighborhood, etc."
                rows={3}
              />
            </div>

            <div>
              <Label className="mb-2 block">Amenities</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {amenityOptions.map((amenity) => (
                  <div key={amenity} className="flex items-center space-x-2">
                    <Checkbox
                      id={`amenity-${amenity}`}
                      checked={formData.amenities?.includes(amenity)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          updateField("amenities", [...(formData.amenities || []), amenity])
                        } else {
                          updateField("amenities", formData.amenities?.filter((a) => a !== amenity) || [])
                        }
                      }}
                    />
                    <label
                      htmlFor={`amenity-${amenity}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {amenity}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <Label htmlFor="monthlyRent">Monthly Rent ($)*</Label>
            <Input
              id="monthlyRent"
              type="number"
              min="0"
              value={formData.monthlyRent}
              onChange={(e) => updateField("monthlyRent", Number.parseInt(e.target.value) || 0)}
              required
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="securityDeposit">Security Deposit ($)</Label>
                <Input
                  id="securityDeposit"
                  type="number"
                  min="0"
                  value={formData.securityDeposit}
                  onChange={(e) => updateField("securityDeposit", Number.parseInt(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="applicationFee">Application Fee ($)</Label>
                <Input
                  id="applicationFee"
                  type="number"
                  min="0"
                  value={formData.applicationFee}
                  onChange={(e) => updateField("applicationFee", Number.parseInt(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pet Policy */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-medium mb-4">Pet Policy</h3>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="pets-allowed"
                checked={formData.petPolicy?.allowed}
                onCheckedChange={(checked) => setFormData((prev) => ({
                  ...prev,
                  petPolicy: { ...prev.petPolicy, allowed: Boolean(checked) }
                }))}
              />
              <Label htmlFor="pets-allowed">Allow Pets</Label>
            </div>
            {formData.petPolicy?.allowed && (
              <div className="space-y-2 pl-6">
                <Label htmlFor="max-pets">Maximum Number of Pets</Label>
                <Input
                  id="max-pets"
                  type="number"
                  min="1"
                  value={formData.petPolicy?.maxPets || 1}
                  onChange={(e) => setFormData((prev) => ({
                    ...prev,
                    petPolicy: { ...prev.petPolicy, allowed: prev.petPolicy?.allowed ?? false, maxPets: Number(e.target.value) }
                  }))}
                />
                <Label htmlFor="pet-fee">Pet Fee/Deposit ($)</Label>
                <Input
                  id="pet-fee"
                  type="number"
                  min="0"
                  value={formData.petPolicy?.fee || 0}
                  onChange={(e) => setFormData((prev) => ({
                    ...prev,
                    petPolicy: { ...prev.petPolicy, allowed: prev.petPolicy?.allowed ?? false, fee: Number(e.target.value) }
                  }))}
                />
                <Label htmlFor="pet-restrictions">Pet Restrictions</Label>
                <Input
                  id="pet-restrictions"
                  value={formData.petPolicy?.restrictions || ""}
                  onChange={(e) => setFormData((prev) => ({
                    ...prev,
                    petPolicy: { ...prev.petPolicy, allowed: prev.petPolicy?.allowed ?? false, restrictions: e.target.value }
                  }))}
                  placeholder="E.g., Cats only, no dogs over 30lbs"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button type="submit" className="flex-1">
          {property ? "Update Property" : "Add Property"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
      </div>
    </form>
  )
}
