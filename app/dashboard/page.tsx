"use client"

import { useState, useEffect } from "react"
import { Plus, Search, Filter, Send, FileText, Eye, Calendar, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PropertyCard } from "@/components/dashboard/property-card"
import { StatsOverview } from "@/components/dashboard/stats-overview"
import { useAuth } from "@/lib/auth"
import { useLandlordDashboard } from "@/hooks/use-landlord-dashboard"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { leaseService } from "@/lib/services/lease-service"
import { noticeService } from "@/lib/services/notice-service"
import { doc, getDoc, query, collection, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Notice } from "@/types"
import { propertyService } from "@/lib/services/property-service"

export default function DashboardPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { properties, stats, loading, error } = useLandlordDashboard()
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("overview")
  const [leases, setLeases] = useState<any[]>([])
  const [renterInfo, setRenterInfo] = useState<{[key: string]: any}>({})
  const [notices, setNotices] = useState<Notice[]>([])
  const [leaseNotices, setLeaseNotices] = useState<Notice[]>([])

  // Fetch leases and renter information
  useEffect(() => {
    async function fetchLeasesAndRenters() {
      if (!user?.id) return
      
      try {
        // Fetch all leases for this landlord
        const allLeases = await leaseService.getLandlordLeases(user.id)
        setLeases(allLeases)
        
        // Fetch renter information for each active lease
        const renterData: {[key: string]: any} = {}
        
        for (const lease of allLeases) {
          if (lease.renterId && lease.status === "active") {
            try {
              // First, try to find user by email (since renterId might be email)
              const usersQuery = query(collection(db, "users"), where("email", "==", lease.renterId))
              const usersSnapshot = await getDocs(usersQuery)
              
              if (!usersSnapshot.empty) {
                const userDoc = usersSnapshot.docs[0]
                const userData = userDoc.data()
                
                // Try to get renter profile using the user ID
                const renterProfileRef = doc(db, "renterProfiles", userDoc.id)
                const renterProfileSnap = await getDoc(renterProfileRef)
                
                if (renterProfileSnap.exists()) {
                  const profileData = renterProfileSnap.data()
                  renterData[lease.propertyId] = {
                    name: profileData.fullName || userData.name || "Unknown Renter",
                    email: profileData.email || userData.email || lease.renterId
                  }
                } else {
                  // Use user document data
                  renterData[lease.propertyId] = {
                    name: userData.name || "Unknown Renter",
                    email: userData.email || lease.renterId
                  }
                }
              } else {
                // Fallback: try direct lookup by renterId as user ID
                const userRef = doc(db, "users", lease.renterId)
                const userSnap = await getDoc(userRef)
                
                if (userSnap.exists()) {
                  const userData = userSnap.data()
                  
                  // Try to get renter profile
                  const renterProfileRef = doc(db, "renterProfiles", lease.renterId)
                  const renterProfileSnap = await getDoc(renterProfileRef)
                  
                  if (renterProfileSnap.exists()) {
                    const profileData = renterProfileSnap.data()
                    renterData[lease.propertyId] = {
                      name: profileData.fullName || userData.name || "Unknown Renter",
                      email: profileData.email || userData.email || lease.renterId
                    }
                  } else {
                    renterData[lease.propertyId] = {
                      name: userData.name || "Unknown Renter",
                      email: userData.email || lease.renterId
                    }
                  }
                } else {
                  // No user found, use lease data
                  renterData[lease.propertyId] = {
                    name: "Unknown Renter",
                    email: lease.renterId
                  }
                }
              }
            } catch (error) {
              console.warn("Error fetching renter info for lease:", lease.id, error)
              renterData[lease.propertyId] = {
                name: "Unknown Renter",
                email: lease.renterId
              }
            }
          }
        }
        
        setRenterInfo(renterData)
      } catch (error) {
        console.error("Error fetching leases and renters:", error)
      }
    }

    fetchLeasesAndRenters()
  }, [user?.id])

  // Fetch notices
  useEffect(() => {
    const fetchNotices = async () => {
      if (!user?.id) return
      
      try {
        const [allNotices, leaseNoticesData] = await Promise.all([
          noticeService.getLandlordNotices(user.id),
          noticeService.getLandlordLeaseNotices(user.id)
        ])
        
        setNotices(allNotices)
        setLeaseNotices(leaseNoticesData)
      } catch (error) {
        console.error("Error fetching notices:", error)
      }
    }

    fetchNotices()
  }, [user?.id])

  const handleViewProperty = (propertyId: string) => {
    router.push(`/properties/${propertyId}`)
  }

  const handleCreateLease = (propertyId: string) => {
    router.push(`/properties/${propertyId}/leases`)
  }

  const handleEditProperty = (propertyId: string) => {
    router.push(`/properties/${propertyId}/edit`)
  }

  const handleSendNotice = (propertyId: string) => {
    router.push(`/dashboard/notice/${propertyId}`)
  }

  const handleSendInvitation = (propertyId: string) => {
    router.push(`/properties/${propertyId}/invitations`)
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

  const handleAddProperty = () => {
    router.push("/properties/add")
  }

  if (!user || user.role !== "landlord") {
    return (
      <div className="container mx-auto p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
          <p className="text-muted-foreground">You don't have permission to view this page.</p>
        </div>
      </div>
    )
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
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-primary">Dashboard</h1>
          <p className="text-lg text-muted-foreground">
            Welcome back, {user.name}. Here's an overview of your properties.
          </p>
        </div>

      </div>

      <StatsOverview stats={stats} />

      {/* Properties Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Your Properties</h2>
          <Button onClick={handleAddProperty}>
            <Plus className="h-4 w-4 mr-2" />
            Add Property
          </Button>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search properties..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setSearchTerm("")}>
                All Properties
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSearchTerm("available")}>
                Available
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSearchTerm("occupied")}>
                Occupied
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSearchTerm("maintenance")}>
                Maintenance
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Properties Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {properties
            .filter(property => 
              !searchTerm || 
              property.address.street.toLowerCase().includes(searchTerm.toLowerCase()) ||
              property.address.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
              (property.status || "").toLowerCase().includes(searchTerm.toLowerCase())
            )
            .map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                renterInfo={renterInfo[property.id]}
                onViewProperty={() => handleViewProperty(property.id)}
                onCreateLease={() => handleCreateLease(property.id)}
                onEditProperty={() => handleEditProperty(property.id)}
                onSendNotice={() => handleSendNotice(property.id)}
                onSendInvitation={() => handleSendInvitation(property.id)}
                onFindTenants={() => handleFindTenants(property.id)}
                onViewIncome={() => handleViewIncome(property.id)}
                onMakeAvailable={() => handleMakeAvailable(property.id)}
                onViewTenantDetails={() => handleViewTenantDetails(property.id)}
              />
            ))}
        </div>

        {properties.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <div className="space-y-4">
                <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                  <Plus className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">No properties yet</h3>
                  <p className="text-muted-foreground">
                    Get started by adding your first property to manage.
                  </p>
                </div>
                <Button onClick={handleAddProperty}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Property
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
