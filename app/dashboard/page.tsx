"use client"

import { useState, useEffect } from "react"
import { Plus, Search, Filter, Send, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PropertyCard } from "@/components/dashboard/property-card"
import { StatsOverview } from "@/components/dashboard/stats-overview"
import { useAuth } from "@/lib/auth"
import { useLandlordDashboard } from "@/hooks/use-landlord-dashboard"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function DashboardPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { properties, stats, loading, error } = useLandlordDashboard()
  const [searchTerm, setSearchTerm] = useState("")
  const [debugInfo, setDebugInfo] = useState("")
  const [activeTab, setActiveTab] = useState("overview")

  // Debug: log user and dashboard data
  useEffect(() => {
    console.log("[Dashboard] user:", user)
    console.log("[Dashboard] properties:", properties)
    console.log("[Dashboard] stats:", stats)
    console.log("[Dashboard] error:", error)
    setDebugInfo(JSON.stringify({ user, properties, stats, error }, null, 2))
  }, [user, properties, stats, error])

  const filteredProperties = properties.filter(
    (property) =>
      `${property.address.street} ${property.address.city}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.type.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleViewProperty = (propertyId: string) => {
    router.push(`/properties/${propertyId}`)
  }

  const handleCreateLease = (propertyId: string) => {
    router.push(`/wizard/lease?propertyId=${propertyId}`)
  }

  const handleSendNotice = (propertyId: string) => {
    router.push(`/notices?propertyId=${propertyId}`)
  }

  const handleAddProperty = () => {
    router.push("/properties/add")
  }

  const handleSendInvitation = (propertyId: string) => {
    router.push(`/invitations?propertyId=${propertyId}`)
  }

  if (!user || user.role !== "landlord") {
    return <div>Access denied. Landlord access required.</div>
  }

  if (loading) {
    return (
      <div className="container mx-auto p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-8">
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
          <p>{error}</p>
          <Button variant="outline" className="mt-4" onClick={() => router.refresh()}>
            Try Again
          </Button>
          <pre className="mt-4 text-xs bg-muted/50 p-2 rounded overflow-x-auto">{debugInfo}</pre>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-8 space-y-8">
      {/* Tabs */}
      <div className="flex gap-6 border-b mb-6">
        <button className={`pb-2 px-2 font-semibold ${activeTab === "overview" ? "border-b-2 border-primary" : "text-muted-foreground"}`} onClick={() => setActiveTab("overview")}>Overview</button>
        <Link href="/dashboard/incomes" className={`pb-2 px-2 font-semibold ${activeTab === "incomes" ? "border-b-2 border-primary" : "text-muted-foreground"}`}>Incomes</Link>
      </div>
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-primary">Dashboard</h1>
          <p className="text-lg text-muted-foreground">
            Welcome back, {user.name}. Here's an overview of your properties.
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => router.push("/invitations")}
            className="flex items-center gap-2"
          >
            <Send className="h-4 w-4" />
            Send Invitation
          </Button>
          <Button onClick={handleAddProperty} size="lg" className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Property
          </Button>
        </div>
      </div>

      <StatsOverview stats={stats} />

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Button
          variant="outline"
          className="h-20 flex-col gap-2"
          onClick={() => router.push("/invitations")}
        >
          <Send className="h-6 w-6" />
          <span>Send Invitations</span>
        </Button>
        <Button
          variant="outline"
          className="h-20 flex-col gap-2"
          onClick={() => router.push("/applications")}
        >
          <FileText className="h-6 w-6" />
          <span>Review Applications</span>
        </Button>
        <Button
          variant="outline"
          className="h-20 flex-col gap-2"
          onClick={() => router.push("/properties")}
        >
          <Plus className="h-6 w-6" />
          <span>Manage Properties</span>
        </Button>
        <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => router.push("/notices")}>
          <FileText className="h-6 w-6" />
          <span>Send Notices</span>
        </Button>
      </div>

      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search properties..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredProperties.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              onViewProperty={handleViewProperty}
              onCreateLease={handleCreateLease}
              onSendNotice={handleSendNotice}
              onSendInvitation={handleSendInvitation}
            />
          ))}
        </div>

        {filteredProperties.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {searchTerm ? "No properties found matching your search." : "No properties added yet."}
            </p>
            {!searchTerm && (
              <Button onClick={handleAddProperty} className="mt-4">
                Add Your First Property
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
