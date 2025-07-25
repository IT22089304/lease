"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, Bed, Bath, Square, Eye, Send, FileText } from "lucide-react"
import type { Property } from "@/types"

interface PropertyCardProps {
  property: Property
  onViewProperty: (id: string) => void
  onCreateLease: (id: string) => void
  onSendNotice: (id: string) => void
  onSendInvitation: (id: string) => void
}

export function PropertyCard({ 
  property,
  onViewProperty,
  onCreateLease,
  onSendNotice,
  onSendInvitation
}: PropertyCardProps) {
  const formatAddress = (address: Property["address"]) => {
    return `${address.street}${address.unit ? `, Unit ${address.unit}` : ""}, ${address.city}`
  }

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg capitalize">{property.type}</CardTitle>
        </div>
        <div className="flex items-center text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 mr-1" />
          {formatAddress(property.address)}
        </div>
      </CardHeader>

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

        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => onViewProperty(property.id)}>
          <Eye className="h-4 w-4 mr-2" />
            View
          </Button>
          <Button variant="outline" onClick={() => onCreateLease(property.id)}>
            <FileText className="h-4 w-4 mr-2" />
            Lease
          </Button>
          <Button variant="outline" onClick={() => onSendNotice(property.id)}>
            <FileText className="h-4 w-4 mr-2" />
            Notice
          </Button>
          <Button variant="outline" onClick={() => onSendInvitation(property.id)}>
            <Send className="h-4 w-4 mr-2" />
            Invite
        </Button>
        </div>
      </CardContent>
    </Card>
  )
}
