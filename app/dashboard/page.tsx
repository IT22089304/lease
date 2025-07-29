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
import { leaseService } from "@/lib/services/lease-service"
import { doc, getDoc, query, collection, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"

export default function DashboardPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { properties, stats, loading, error } = useLandlordDashboard()
  const [searchTerm, setSearchTerm] = useState("")
  const [debugInfo, setDebugInfo] = useState("")
  const [activeTab, setActiveTab] = useState("overview")
  const [leases, setLeases] = useState<any[]>([])
  const [renterInfo, setRenterInfo] = useState<{[key: string]: any}>({})

  // Debug: log user and dashboard data
  useEffect(() => {
    console.log("[Dashboard] user:", user)
    console.log("[Dashboard] properties:", properties)
    console.log("[Dashboard] stats:", stats)
    console.log("[Dashboard] error:", error)
    setDebugInfo(JSON.stringify({ user, properties, stats, error }, null, 2))
  }, [user, properties, stats, error])

  // Fetch leases and renter information
  useEffect(() => {
    async function fetchLeasesAndRenters() {
      if (!user?.id) return
      
      try {
        // Fetch all leases for this landlord
        const allLeases = await leaseService.getLandlordLeases(user.id)
        console.log(`[Dashboard] Fetched ${allLeases.length} leases:`, allLeases)
        setLeases(allLeases)
        
        // Fetch renter information for each active lease
        const renterData: {[key: string]: any} = {}
        
        for (const lease of allLeases) {
          if (lease.renterId && lease.status === "active") {
            console.log(`[Dashboard] Processing lease for property ${lease.propertyId}, renterId: ${lease.renterId}`)
            
            try {
              // First, try to find user by email (since renterId might be email)
              const usersQuery = query(collection(db, "users"), where("email", "==", lease.renterId))
              const usersSnapshot = await getDocs(usersQuery)
              
              console.log(`[Dashboard] Email search for ${lease.renterId} found ${usersSnapshot.size} users`)
              
              if (!usersSnapshot.empty) {
                const userDoc = usersSnapshot.docs[0]
                const userData = userDoc.data()
                console.log(`[Dashboard] Found user by email:`, userData)
                
                // Try to get renter profile using the user ID
                const renterProfileRef = doc(db, "renterProfiles", userDoc.id)
                const renterProfileSnap = await getDoc(renterProfileRef)
                
                if (renterProfileSnap.exists()) {
                  const profileData = renterProfileSnap.data()
                  console.log(`[Dashboard] Found renter profile:`, profileData)
                  renterData[lease.propertyId] = {
                    name: profileData.fullName || userData.name || "Unknown Renter",
                    email: profileData.email || userData.email || lease.renterId
                  }
                } else {
                  console.log(`[Dashboard] No renter profile found, using user data`)
                  // Use user document data
                  renterData[lease.propertyId] = {
                    name: userData.name || "Unknown Renter",
                    email: userData.email || lease.renterId
                  }
                }
              } else {
                console.log(`[Dashboard] No user found by email, trying direct user ID lookup`)
                // Fallback: try direct lookup by renterId as user ID
                const userRef = doc(db, "users", lease.renterId)
                const userSnap = await getDoc(userRef)
                
                if (userSnap.exists()) {
                  const userData = userSnap.data()
                  console.log(`[Dashboard] Found user by ID:`, userData)
                  
                  // Try to get renter profile
                  const renterProfileRef = doc(db, "renterProfiles", lease.renterId)
                  const renterProfileSnap = await getDoc(renterProfileRef)
                  
                  if (renterProfileSnap.exists()) {
                    const profileData = renterProfileSnap.data()
                    console.log(`[Dashboard] Found renter profile by ID:`, profileData)
                    renterData[lease.propertyId] = {
                      name: profileData.fullName || userData.name || "Unknown Renter",
                      email: profileData.email || userData.email || lease.renterId
                    }
                  } else {
                    console.log(`[Dashboard] No renter profile found by ID, using user data`)
                    renterData[lease.propertyId] = {
                      name: userData.name || "Unknown Renter",
                      email: userData.email || lease.renterId
                    }
                  }
                } else {
                  console.log(`[Dashboard] No user found by ID, using fallback`)
                  // Last resort: use renterId as display name
                  renterData[lease.propertyId] = {
                    name: "Unknown Renter",
                    email: lease.renterId
                  }
                }
              }
              
              console.log(`[Dashboard] Final renter data for property ${lease.propertyId}:`, renterData[lease.propertyId])
            } catch (error) {
              console.error(`Error fetching renter info for property ${lease.propertyId}:`, error)
              renterData[lease.propertyId] = {
                name: "Unknown Renter",
                email: lease.renterId
              }
            }
          }
        }
        
        setRenterInfo(renterData)
      } catch (error) {
        console.error("Error fetching leases and renter info:", error)
      }
    }
    
    fetchLeasesAndRenters()
  }, [user?.id])

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
          {filteredProperties.map((property) => {
            const isLeased = leases.some(l => l.propertyId === property.id && l.renterId && l.status === "active")
            const propertyRenterInfo = renterInfo[property.id]
            
            console.log(`[Dashboard] Rendering property ${property.id}:`, { 
              isLeased, 
              propertyRenterInfo,
              allRenterInfo: renterInfo 
            })
            
            return (
              <PropertyCard
                key={property.id}
                property={property}
                onViewProperty={handleViewProperty}
                onCreateLease={handleCreateLease}
                onSendNotice={handleSendNotice}
                onSendInvitation={handleSendInvitation}
                leased={isLeased}
                renterInfo={propertyRenterInfo}
              />
            )
          })}
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
