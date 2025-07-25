"use client"

import { useState, useEffect } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { Property } from "@/types"

interface LeaseBasicInfoProps {
  data: any
  onUpdate: (field: string, value: any) => void
}

export function LeaseBasicInfo({ data, onUpdate }: LeaseBasicInfoProps) {
  const [properties, setProperties] = useState<Property[]>([])
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    // Mock properties data
    const mockProperties: Property[] = [
      {
        id: "1",
        landlordId: "1",
        address: "123 Main St, Anytown, ST 12345",
        unit: "A",
        type: "apartment",
        region: "california",
        bedrooms: 2,
        bathrooms: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "2",
        landlordId: "1",
        address: "456 Oak Ave, Somewhere, ST 67890",
        type: "house",
        region: "california",
        bedrooms: 3,
        bathrooms: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]
    setProperties(mockProperties)
  }, [])

  const filteredProperties = properties.filter((property) =>
    property.address.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const selectedProperty = properties.find((p) => p.id === data.propertyId)

  return (
    <div className="space-y-6">
      <div className="form-section">
        <h3 className="text-lg font-semibold mb-4">Property Selection</h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="property-search">Search Properties</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="property-search"
                placeholder="Search your properties..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="grid gap-3">
            {filteredProperties.map((property) => (
              <Card
                key={property.id}
                className={`cursor-pointer transition-colors ${
                  data.propertyId === property.id ? "ring-2 ring-primary" : "hover:bg-muted/50"
                }`}
                onClick={() => onUpdate("propertyId", property.id)}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{property.address}</CardTitle>
                  <CardDescription>
                    {property.type} • {property.bedrooms} bed, {property.bathrooms} bath
                    {property.unit && ` • Unit ${property.unit}`}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {selectedProperty && (
        <div className="form-section">
          <h3 className="text-lg font-semibold mb-4">Lease Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="renter-email">Renter Email</Label>
              <Input
                id="renter-email"
                type="email"
                placeholder="renter@example.com"
                value={data.renterId}
                onChange={(e) => onUpdate("renterId", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="monthly-rent">Monthly Rent ($)</Label>
              <Input
                id="monthly-rent"
                type="number"
                placeholder="1500"
                value={data.monthlyRent}
                onChange={(e) => onUpdate("monthlyRent", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="start-date">Lease Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={data.startDate}
                onChange={(e) => onUpdate("startDate", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="end-date">Lease End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={data.endDate}
                onChange={(e) => onUpdate("endDate", e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="security-deposit">Security Deposit ($)</Label>
              <Input
                id="security-deposit"
                type="number"
                placeholder="1500"
                value={data.securityDeposit}
                onChange={(e) => onUpdate("securityDeposit", e.target.value)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
