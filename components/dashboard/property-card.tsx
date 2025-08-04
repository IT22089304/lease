"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, Bed, Bath, Square, Eye, Send, FileText, User, DollarSign, Home } from "lucide-react"
import type { Property } from "@/types"
import { useRouter } from "next/navigation"

interface PropertyCardProps {
  property: Property
  onViewProperty: (id: string) => void
  onCreateLease: (id: string) => void
  onSendNotice: (id: string) => void
  onSendInvitation: (id: string) => void
  onEditProperty: (id: string) => void // Added
  onFindTenants?: (id: string) => void
  onViewIncome?: (id: string) => void
  onMakeAvailable?: (id: string) => void
  onViewTenantDetails?: (id: string) => void
  leased?: boolean
  renterInfo?: {
    name: string
    email: string
  }
}

export function PropertyCard({ 
  property,
  onViewProperty,
  onCreateLease,
  onSendNotice,
  onSendInvitation,
  onEditProperty, // Added
  onFindTenants,
  onViewIncome,
  onMakeAvailable,
  onViewTenantDetails,
  leased,
  renterInfo
}: PropertyCardProps) {
  console.log(`[PropertyCard] Property ${property.id}:`, { leased, renterInfo })
  
  const formatAddress = (address: Property["address"]) => {
    return `${address.street}${address.unit ? `, Unit ${address.unit}` : ""}, ${address.city}`
  }

  const router = useRouter()

  return (
    <Card className="hover:shadow-lg transition-shadow relative">
      {leased && (
        <Badge className="absolute top-3 right-3 bg-green-100 text-green-700 border-green-200">Leased</Badge>
      )}
      {property.status === "occupied" && !leased && (
        <Badge className="absolute top-3 right-3 bg-blue-100 text-blue-700 border-blue-200">Occupied</Badge>
      )}
      {property.status === "maintenance" && (
        <Badge className="absolute top-3 right-3 bg-orange-100 text-orange-700 border-orange-200">Maintenance</Badge>
      )}
      {property.status === "available" && !leased && (
        <Badge className="absolute top-3 right-3 bg-green-100 text-green-700 border-green-200">Available</Badge>
      )}
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{property.title || property.type}</CardTitle>
        </div>
        <div className="flex items-center text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 mr-1" />
          {formatAddress(property.address)}
        </div>
      </CardHeader>

      {/* Property Image Preview */}
      {property.images && property.images.length > 0 && (
        <div className="px-6 pb-3">
          <img
            src={property.images[0]}
            alt={`${property.type} at ${formatAddress(property.address)}`}
            className="w-full h-32 object-cover rounded-lg"
          />
        </div>
      )}

      <CardContent className="space-y-4">
        <div className="flex justify-between text-sm">
          <div className="flex items-center">
            <Bed className="h-4 w-4 mr-1" />
            {property.bedrooms} bed
          </div>
          <div className="flex items-center">
            <Bath className="h-4 w-4 mr-1" />
            {property.bathrooms} bath
          </div>
          <div className="flex items-center">
            <Square className="h-4 w-4 mr-1" />
            {property.squareFeet} sq ft
          </div>
        </div>

        {property.monthlyRent && (
          <div className="text-center py-2 bg-muted/50 rounded">
            <p className="text-lg font-semibold text-primary">${property.monthlyRent.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">per month</p>
          </div>
        )}

        {leased && renterInfo && (
          <div className="flex items-center text-sm text-muted-foreground bg-muted/50 p-2 rounded">
            <User className="h-4 w-4 mr-2" />
            <div>
              <p className="font-medium text-foreground">{renterInfo.name}</p>
              <p className="text-xs">{renterInfo.email}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => onViewProperty(property.id)}>
            <Eye className="h-4 w-4 mr-2" />
            View
          </Button>
          <Button variant="outline" onClick={() => onEditProperty(property.id)}>
            <FileText className="h-4 w-4 mr-2" />
            Edit
          </Button>
          {!leased && property.status !== "occupied" && (
            <Button variant="outline" onClick={() => onCreateLease(property.id)}>
              <FileText className="h-4 w-4 mr-2" />
              Lease
            </Button>
          )}
          <Button variant="outline" onClick={() => onSendNotice(property.id)}>
            <FileText className="h-4 w-4 mr-2" />
            Notice
          </Button>
          {!leased && property.status !== "occupied" && (
            <Button variant="outline" onClick={() => onSendInvitation(property.id)}>
              <Send className="h-4 w-4 mr-2" />
              Invite
            </Button>
          )}
          {!leased && property.status !== "occupied" && (
            <Button variant="outline" onClick={() => onFindTenants?.(property.id)}>
              <User className="h-4 w-4 mr-2" />
              Find Tenants
            </Button>
          )}
          <Button variant="outline" onClick={() => onViewIncome?.(property.id)}>
            <DollarSign className="h-4 w-4 mr-2" />
            Income
          </Button>
          {property.status === "occupied" && !leased && (
            <Button variant="outline" onClick={() => onMakeAvailable?.(property.id)}>
              <Home className="h-4 w-4 mr-2" />
              Make Available
            </Button>
          )}
          {property.status === "occupied" && (
            <Button variant="outline" onClick={() => onViewTenantDetails?.(property.id)}>
              <User className="h-4 w-4 mr-2" />
              Tenant Details
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
