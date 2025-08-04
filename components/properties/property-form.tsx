"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { X, Upload, Image as ImageIcon } from "lucide-react"
import type { Property } from "@/types"
import { toast } from "sonner"
import { imageUploadService } from "@/lib/services/image-upload-service"
import { MapPicker } from "@/components/ui/map-picker"

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
  latitude?: number
  longitude?: number
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
  onSave: (property: PropertyFormData, images: File[]) => void
  onCancel: () => void
  loading?: boolean
}

export function PropertyForm({ property, onSave, onCancel, loading = false }: PropertyFormProps) {
  const [formData, setFormData] = useState<PropertyFormData>({
    title: "",
    address: {
      street: "",
      unit: "",
      city: "",
      state: "CA",
      country: "US",
      postalCode: "",
    },
    latitude: undefined,
    longitude: undefined,
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

  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [isDragOver, setIsDragOver] = useState(false)

  // Only update form data when property prop changes
  useEffect(() => {
    if (property) {
      setFormData(property)
      if (property.images) {
        setImageUrls(property.images)
      }
    }
  }, [property])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return // Prevent multiple submissions
    
    // Pass image files separately to parent component
    const formDataWithoutImages = { ...formData, images: imageUrls }
    onSave(formDataWithoutImages, imageFiles)
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

  const handleImageUpload = useCallback((files: FileList | null) => {
    if (!files) return

    const newFiles = Array.from(files).filter(file => {
      const validation = imageUploadService.validateImage(file)
      if (!validation.isValid) {
        toast.error(validation.error || 'Invalid image file')
        return false
      }
      return true
    })

    if (newFiles.length + imageFiles.length > 10) {
      toast.error('Maximum 10 images allowed')
      return
    }

    setImageFiles(prev => [...prev, ...newFiles])
  }, [imageFiles])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    handleImageUpload(e.dataTransfer.files)
  }, [handleImageUpload])

  const removeImage = (index: number, isFile: boolean) => {
    if (isFile) {
      setImageFiles(prev => prev.filter((_, i) => i !== index))
    } else {
      setImageUrls(prev => prev.filter((_, i) => i !== index))
    }
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

  const allImages = [...imageUrls, ...imageFiles.map(file => URL.createObjectURL(file))]

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Property Title */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-medium mb-4">Property Information</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Property Title*</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => updateField("title", e.target.value)}
                placeholder="Enter property name/title"
                required
              />
            </div>
          </div>
        </CardContent>
      </Card>

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

      {/* Location Picker */}
      <Card>
        <CardContent className="pt-6">
          <MapPicker
            onLocationSelect={(lat, lng) => {
              updateField("latitude", lat)
              updateField("longitude", lng)
            }}
            initialLat={formData.latitude}
            initialLng={formData.longitude}
            apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}
          />
        </CardContent>
      </Card>

      {/* Property Images */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-medium mb-4">Property Images</h3>
          <div className="space-y-4">
            {/* Image Upload Area */}
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                isDragOver 
                  ? 'border-primary bg-primary/5' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-sm text-gray-600 mb-2">
                Drag and drop images here, or click to select files
              </p>
              <p className="text-xs text-gray-500 mb-4">
                Maximum 10 images, 5MB each. Supported formats: JPG, PNG, GIF
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('image-upload')?.click()}
                disabled={allImages.length >= 10}
              >
                <ImageIcon className="h-4 w-4 mr-2" />
                Select Images
              </Button>
              <input
                id="image-upload"
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => handleImageUpload(e.target.files)}
              />
            </div>

            {/* Image Preview Grid */}
            {allImages.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {allImages.map((imageUrl, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={imageUrl}
                      alt={`Property image ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index, index >= imageUrls.length)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
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
        <Button type="submit" className="flex-1" disabled={loading}>
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              {property ? "Updating..." : "Adding..."}
            </>
          ) : (
            property ? "Update Property" : "Add Property"
          )}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1" disabled={loading}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
