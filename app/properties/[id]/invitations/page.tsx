"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Plus, Search, Mail, Eye, ArrowLeft, CheckCircle, XCircle, Clock, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth"
import { propertyService } from "@/lib/services/property-service"
import { invitationService } from "@/lib/services/invitation-service"
import { toast } from "sonner"
import type { Property } from "@/types"
import { collection, query, where, getDocs, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"

export default function PropertyInvitationsPage() {
  const router = useRouter()
  const params = useParams()
  const { user } = useAuth()
  const propertyId = params.id as string
  
  const [property, setProperty] = useState<Property | null>(null)
  const [invitations, setInvitations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    async function fetchData() {
      if (!user?.id || !propertyId) return
      
      try {
        setLoading(true)
        
        // Fetch property details
        const propertyData = await propertyService.getProperty(propertyId)
        if (!propertyData) {
          toast.error("Property not found")
          router.push("/dashboard")
          return
        }
        
        if (propertyData.landlordId !== user.id) {
          toast.error("Access denied. This property doesn't belong to you.")
          router.push("/dashboard")
          return
        }
        
        setProperty(propertyData)
        
        // Fetch invitations for this property
        const invitationsQuery = query(
          collection(db, "invitations"),
          where("propertyId", "==", propertyId),
          orderBy("invitedAt", "desc")
        )
        const invitationsSnapshot = await getDocs(invitationsQuery)
        const invitationsData = invitationsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          invitedAt: doc.data().invitedAt?.toDate(),
          respondedAt: doc.data().respondedAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate(),
        }))
        setInvitations(invitationsData)
        
      } catch (error) {
        console.error("Error fetching property invitations:", error)
        toast.error("Failed to load property invitations")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user?.id, propertyId, router])

  const handleCreateInvitation = () => {
    router.push(`/dashboard/invite/${propertyId}`)
  }

  const handleViewProperty = () => {
    router.push(`/properties/${propertyId}`)
  }

  const handleViewInvitation = (invitation: any) => {
    // For now, just show a toast with invitation details
    toast.info(`Invitation sent to ${invitation.renterEmail} on ${formatDate(invitation.invitedAt)}`)
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: "outline" as const, text: "Pending", icon: Clock },
      accepted: { variant: "default" as const, text: "Accepted", icon: CheckCircle },
      declined: { variant: "destructive" as const, text: "Declined", icon: XCircle },
      expired: { variant: "secondary" as const, text: "Expired", icon: Clock },
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    const IconComponent = config.icon
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <IconComponent className="h-3 w-3" />
        {config.text}
      </Badge>
    )
  }

  const formatDate = (date: Date | string | any) => {
    if (!date) return "N/A"
    
    let dateObj: Date
    
    if (typeof date === "string") {
      dateObj = new Date(date)
    } else if (date instanceof Date) {
      dateObj = date
    } else if (date && typeof date.toDate === "function") {
      // Handle Firestore Timestamp
      dateObj = date.toDate()
    } else if (date && typeof date.seconds === "number") {
      // Handle Firestore Timestamp object
      dateObj = new Date(date.seconds * 1000)
    } else {
      // Try to create a Date object
      dateObj = new Date(date)
    }
    
    // Check if the date is valid
    if (isNaN(dateObj.getTime())) {
      return "N/A"
    }
    
    return dateObj.toLocaleDateString()
  }

  const getStatusCounts = () => {
    const counts = {
      pending: 0,
      accepted: 0,
      declined: 0,
      expired: 0,
      total: invitations.length
    }
    
    invitations.forEach(invitation => {
      const status = invitation.status || "pending"
      if (counts.hasOwnProperty(status)) {
        counts[status as keyof typeof counts]++
      }
    })
    
    return counts
  }

  const filteredInvitations = invitations.filter(invitation =>
    invitation.renterEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invitation.status?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invitation.message?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const statusCounts = getStatusCounts()

  if (loading) {
    return (
      <div className="container mx-auto p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading property invitations...</p>
        </div>
      </div>
    )
  }

  if (!property) {
    return (
      <div className="container mx-auto p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Property Not Found</h1>
          <p className="text-muted-foreground">The property you're looking for doesn't exist.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={handleViewProperty}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Property
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-primary">Invitations</h1>
            <p className="text-muted-foreground">
              Managing invitations for {property.address.street}, {property.address.city}
            </p>
          </div>
        </div>
        <Button onClick={handleCreateInvitation}>
          <Plus className="h-4 w-4 mr-2" />
          Send New Invitation
        </Button>
      </div>

      {/* Status Overview */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invitations</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.total}</div>
            <p className="text-xs text-muted-foreground">All invitations sent</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.pending}</div>
            <p className="text-xs text-muted-foreground">Awaiting response</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accepted</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.accepted}</div>
            <p className="text-xs text-muted-foreground">Positive responses</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Declined</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.declined}</div>
            <p className="text-xs text-muted-foreground">Negative responses</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.expired}</div>
            <p className="text-xs text-muted-foreground">No response received</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search invitations by email, status, or message..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Invitations List */}
      <div className="space-y-4">
        {filteredInvitations.map((invitation) => (
          <Card key={invitation.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium">{invitation.renterEmail}</h4>
                    <p className="text-sm text-muted-foreground">
                      Invited: {formatDate(invitation.invitedAt)}
                    </p>
                    {invitation.respondedAt && (
                      <p className="text-sm text-muted-foreground">
                        Responded: {formatDate(invitation.respondedAt)}
                      </p>
                    )}
                    {invitation.message && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Message: {invitation.message}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(invitation.status || "pending")}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewInvitation(invitation)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredInvitations.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <div className="space-y-4">
              <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                <Mail className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">
                  {invitations.length === 0 ? "No invitations sent yet" : "No invitations found"}
                </h3>
                <p className="text-muted-foreground">
                  {invitations.length === 0 
                    ? "Send your first invitation to potential renters for this property."
                    : "Try adjusting your search terms."
                  }
                </p>
              </div>
              {invitations.length === 0 && (
                <Button onClick={handleCreateInvitation}>
                  <Plus className="h-4 w-4 mr-2" />
                  Send First Invitation
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 