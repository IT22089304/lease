"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Plus, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PropertyCard } from "@/components/dashboard/property-card"
import { propertyService } from "@/lib/services/property-service"
import { leaseService } from "@/lib/services/lease-service"
import { useAuth } from "@/lib/auth"

export default function PropertiesPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState("")
  const [properties, setProperties] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [leases, setLeases] = useState<any[]>([]);

  useEffect(() => {
    async function fetchProperties() {
      if (!user?.id) return
      setLoading(true)
      const props = await propertyService.getLandlordProperties(user.id)
      setProperties(props)
      // Fetch all leases for this landlord's properties
      const allLeases = [];
      for (const prop of props) {
        const propLeases = await leaseService.getLandlordLeases(user.id);
        allLeases.push(...propLeases.filter(l => l.propertyId === prop.id));
      }
      setLeases(allLeases)
      setLoading(false)
    }
    fetchProperties()
  }, [user?.id])

  const filteredProperties = properties.filter(
    (property) =>
      property.address.street.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.address.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.type.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleViewDetails = (id: string) => {
    router.push(`/properties/${id}`)
  }

  const handleEditProperty = (id: string) => {
    router.push(`/properties/${id}/edit`)
  }

  const handleInviteRenter = (id: string) => {
    router.push(`/invitations/new?propertyId=${id}`)
  }

  const handleCreateLease = (propertyId: string) => {
    router.push(`/wizard/lease?propertyId=${propertyId}`)
  }

  const handleSendNotice = (propertyId: string) => {
    router.push(`/dashboard/notice/${propertyId}`)
  }

  const handleSendInvitation = (propertyId: string) => {
    router.push(`/dashboard/invite/${propertyId}`)
  }

  const handleFindTenants = (propertyId: string) => {
    router.push(`/dashboard/invite/${propertyId}`)
  }

  const handleViewIncome = (propertyId: string) => {
    router.push(`/dashboard/incomes?propertyId=${propertyId}`)
  }

  const handleMakeAvailable = async (propertyId: string) => {
    try {
      // Update property status to available
      await propertyService.updateProperty(propertyId, { status: "available" })
      // Refresh the page to show updated status
      router.refresh()
    } catch (error) {
      console.error("Error updating property status:", error)
    }
  }

  const handleViewTenantDetails = (propertyId: string) => {
    router.push(`/dashboard/tenant/${propertyId}`)
  }

  if (loading) {
    return <div className="container mx-auto p-6">Loading properties...</div>
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Properties</h1>
          <p className="text-muted-foreground">Manage your rental properties</p>
        </div>
        <Button onClick={() => router.push("/properties/add")}>
          <Plus className="h-4 w-4 mr-2" />
          Add Property
        </Button>
      </div>

      <div className="mb-6">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search properties..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredProperties.map((property) => {
          const leased = leases.some(l => l.propertyId === property.id && l.renterId && l.status === "active");
          return (
            <PropertyCard
              key={property.id}
              property={property}
              onViewProperty={handleViewDetails}
              onEditProperty={handleEditProperty}
              onCreateLease={handleCreateLease}
              onSendNotice={handleSendNotice}
              onSendInvitation={handleSendInvitation}
              onFindTenants={handleFindTenants}
              onViewIncome={handleViewIncome}
              onMakeAvailable={handleMakeAvailable}
              onViewTenantDetails={handleViewTenantDetails}
              leased={leased}
            />
          );
        })}
      </div>

      {filteredProperties.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No properties found matching your search.</p>
        </div>
      )}
    </div>
  )
}
