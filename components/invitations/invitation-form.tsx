"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { X, Plus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Property {
  id: string
  address: {
    street: string
    unit?: string
    city: string
    state: string
    country: string
    postalCode: string
  }
  type: string
  rent?: number
}

interface InvitationFormProps {
  properties: Property[]
  onSubmit: (data: any) => void
  onCancel: () => void
  defaultPropertyId?: string
}

export function InvitationForm({ properties, onSubmit, onCancel, defaultPropertyId }: InvitationFormProps) {
  const { toast } = useToast()
  const [selectedProperty, setSelectedProperty] = useState(defaultPropertyId || "")
  const [renterEmail, setRenterEmail] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const property = properties.find((p) => p.id === selectedProperty)
      const invitationData = {
        propertyId: selectedProperty,
        propertyAddress: property?.address,
        renterEmail,
        message: "You are invited to take a look at the property.",
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
      }
      console.log("Submitting invitation", invitationData)
      await new Promise((resolve) => setTimeout(resolve, 500))
      onSubmit(invitationData)
      toast({
        title: "Invitation Sent!",
        description: `Lease application invitation sent to ${renterEmail}`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send invitation. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Send Lease Application Invitation</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="property">Select Property</Label>
            <Select value={selectedProperty} onValueChange={setSelectedProperty} disabled={properties.length === 1}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a property" />
              </SelectTrigger>
              <SelectContent>
                {properties.map((property) => (
                  <SelectItem key={property.id} value={property.id}>
                    {typeof property.address === "string"
                      ? property.address
                      : `${property.address.street}${property.address.unit ? ", Unit " + property.address.unit : ""}, ${property.address.city}, ${property.address.state}`}
                    {` - ${property.type}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Renter Email</Label>
            <Input
              id="email"
              type="email"
              value={renterEmail}
              onChange={(e) => setRenterEmail(e.target.value)}
              placeholder="renter@example.com"
              required
            />
          </div>
          <div className="flex gap-4">
            <Button type="submit" disabled={loading || !selectedProperty || !renterEmail} className="flex-1">
              {loading ? "Sending..." : "Send Invitation"}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
