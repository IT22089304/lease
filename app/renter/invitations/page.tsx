"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { 
  ArrowLeft, 
  Search, 
  Filter, 
  Eye, 
  CheckCircle, 
  XCircle,
  Home,
  DollarSign,
  Calendar,
  User,
  MapPin,
  Building,
  FileText,
  BedDouble,
  Bath,
  Ruler,
  Car,
  Wifi,
  Dog,
  Trash2,
  ExternalLink,
  Clock,
  Bed,
  Square
} from "lucide-react"
import { useAuth } from "@/lib/auth"
import { invitationService } from "@/lib/services/invitation-service"
import { propertyService } from "@/lib/services/property-service"
import { notificationService } from "@/lib/services/notification-service"
import { noticeService } from "@/lib/services/notice-service"
import { renterStatusService } from "@/lib/services/renter-status-service"
import { toast } from "sonner"
import type { Property } from "@/types"
import type { Notice } from "@/types"

export default function RenterInvitationsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [invitations, setInvitations] = useState<any[]>([])
  const [invitationNotices, setInvitationNotices] = useState<Notice[]>([])
  const [properties, setProperties] = useState<{[key: string]: Property}>({})
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)

  useEffect(() => {
    async function fetchInvitations() {
      if (!user?.email) return

      try {
        setLoading(true)
        
        // Fetch both invitations and invitation-related notices
        const [invitationsData, noticesData] = await Promise.all([
          invitationService.getInvitationsForEmail(user.email),
          noticeService.getRenterNotices(user.email)
        ])
        
        setInvitations(invitationsData)
        
        // Filter notices that are invitation-related
        const invitationNotices = noticesData.filter(notice => 
          notice.type === "invitation_sent" || 
          notice.subject?.toLowerCase().includes("invitation") ||
          notice.message?.toLowerCase().includes("invitation")
        )
        setInvitationNotices(invitationNotices)

        // Fetch property details for each invitation
        const propertyData: {[key: string]: Property} = {}
        for (const invitation of invitationsData) {
          if (invitation.propertyId && !propertyData[invitation.propertyId]) {
            const property = await propertyService.getProperty(invitation.propertyId)
            if (property) {
              propertyData[invitation.propertyId] = property
            }
          }
        }
        setProperties(propertyData)
      } catch (error) {
        console.error("Error fetching invitations:", error)
        toast.error("Failed to load invitations")
      } finally {
        setLoading(false)
      }
    }

    fetchInvitations()
  }, [user?.email])

  const handleViewProperty = (property: Property) => {
    setSelectedProperty(property)
    setIsViewDialogOpen(true)
  }

  const handleStartApplication = (invitationId: string) => {
    router.push(`/renter/applications/new?invitationId=${invitationId}`)
  }

  const formatAddress = (address: any) => {
    if (!address) return ""
    return `${address.street}${address.unit ? `, Unit ${address.unit}` : ""}, ${address.city}, ${address.state} ${address.postalCode}`
  }

  const handleAcceptInvitation = async (invitation: any) => {
    try {
      await invitationService.updateInvitationStatus(invitation.id, "accepted")
      
      // Create renter status entry for the landlord's kanban board
      await renterStatusService.createRenterStatus({
        propertyId: invitation.propertyId,
        landlordId: invitation.landlordId,
        renterEmail: invitation.renterEmail,
        renterName: invitation.renterEmail.split('@')[0],
        status: "invite", // Accepted invitations show in invite stage
        invitationId: invitation.id,
        notes: `Invitation accepted - ${invitation.renterEmail}`
      })
      
      // Notify landlord
      await notificationService.notifyApplicationStatusChange(
        invitation.landlordId,
        invitation.id,
        "accepted",
        user!.email!
      )

      // Update local state
      setInvitations(prev => 
        prev.map(inv => 
          inv.id === invitation.id 
            ? { ...inv, status: "accepted" }
            : inv
        )
      )

      toast.success("Invitation accepted successfully")
    } catch (error) {
      console.error("Error accepting invitation:", error)
      toast.error("Failed to accept invitation")
    }
  }

  const handleRejectInvitation = async (invitation: any) => {
    try {
      await invitationService.updateInvitationStatus(invitation.id, "rejected")
      
      // Notify landlord
      await notificationService.notifyApplicationStatusChange(
        invitation.landlordId,
        invitation.id,
        "rejected",
        user!.email!
      )

      // Update local state
      setInvitations(prev => 
        prev.map(inv => 
          inv.id === invitation.id 
            ? { ...inv, status: "rejected" }
            : inv
        )
      )

      toast.success("Invitation rejected successfully")
    } catch (error) {
      console.error("Error rejecting invitation:", error)
      toast.error("Failed to reject invitation")
    }
  }

  const filteredInvitations = invitations.filter(invitation => {
    // Filter by search term
    const property = properties[invitation.propertyId]
    const searchString = `${property?.title || ""} ${property?.address?.street || ""} ${property?.address?.city || ""}`.toLowerCase()
    const matchesSearch = !searchTerm || searchString.includes(searchTerm.toLowerCase())

    // Filter by status
    const matchesStatus = statusFilter === "all" || invitation.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const filteredNotices = invitationNotices.filter(notice => {
    // Filter by search term
    const searchString = `${notice.subject || ""} ${notice.message || ""}`.toLowerCase()
    const matchesSearch = !searchTerm || searchString.includes(searchTerm.toLowerCase())

    // Filter by status (read/unread)
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "pending" && !notice.readAt) ||
      (statusFilter === "accepted" && notice.readAt)

    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Property Invitations</h1>
          <p className="text-muted-foreground">
            View and manage your property invitations
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search properties..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Invitations</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Invitations List */}
      <div className="space-y-4">
        {/* Direct Invitations */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Direct Invitations</h3>
          {filteredInvitations.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Home className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No invitations found</h3>
                <p className="text-muted-foreground text-center">
                  {invitations.length === 0 
                    ? "You haven't received any property invitations yet."
                    : "No invitations match your current filters."
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredInvitations.map((invitation) => {
              const property = properties[invitation.propertyId]
              if (!property) return null

              return (
                <Card 
                  key={invitation.id} 
                  className={invitation.status === "pending" ? "border-l-4 border-l-blue-500" : ""}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="flex-shrink-0">
                          <div className="w-20 h-20 bg-muted rounded-lg overflow-hidden">
                            {property.images && property.images.length > 0 ? (
                              <img
                                src={property.images[0]}
                                alt={property.title || "Property"}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  // Fallback to building icon if image fails to load
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  target.nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                            ) : null}
                            <div className={`w-full h-full flex items-center justify-center ${property.images && property.images.length > 0 ? 'hidden' : ''}`}>
                              <Building className="h-8 w-8 text-muted-foreground" />
                            </div>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-semibold truncate">
                              {property.title || property.address?.street}
                            </h3>
                            <Badge 
                              className={
                                invitation.status === "pending" ? "bg-blue-100 text-blue-700" :
                                invitation.status === "accepted" ? "bg-green-100 text-green-700" :
                                "bg-red-100 text-red-700"
                              }
                            >
                              {invitation.status.charAt(0).toUpperCase() + invitation.status.slice(1)}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <MapPin className="h-4 w-4" />
                              <span className="truncate">{property.address?.city}</span>
                            </div>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <DollarSign className="h-4 w-4" />
                              <span>\${property.monthlyRent?.toLocaleString()}/month</span>
                            </div>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              <span>{new Date(invitation.invitedAt).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <User className="h-4 w-4" />
                              <span>From: {invitation.landlordName || "Landlord"}</span>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {property.bedrooms} {property.bedrooms === 1 ? "Bedroom" : "Bedrooms"}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {property.bathrooms} {property.bathrooms === 1 ? "Bathroom" : "Bathrooms"}
                            </Badge>
                            {property.squareFeet && (
                              <Badge variant="secondary" className="text-xs">
                                {property.squareFeet} sq ft
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewProperty(property)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Property
                          </Button>
                          {invitation.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => handleAcceptInvitation(invitation)}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Accept
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleRejectInvitation(invitation)}
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Reject
                              </Button>
                            </>
                          )}
                          {invitation.status === "accepted" && (
                            <Button
                              size="sm"
                              onClick={() => handleStartApplication(invitation.id)}
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              Start Application
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </div>

      {/* Property View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Property Details</DialogTitle>
          </DialogHeader>
          {selectedProperty && (
            <div className="space-y-6">
              {/* Property Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold">{selectedProperty.title || formatAddress(selectedProperty.address)}</h1>
                  {selectedProperty.title && (
                    <p className="text-muted-foreground mt-1">{formatAddress(selectedProperty.address)}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className="capitalize">{selectedProperty.type}</Badge>
                    <Badge variant={selectedProperty.status === "available" ? "default" : "secondary"}>
                      {selectedProperty.status === "available"
                        ? "Available"
                        : selectedProperty.status === "occupied"
                          ? "Occupied"
                          : "Maintenance"}
                    </Badge>
                  </div>
                </div>
                {/* Find the invitation for this property to get the invitation ID */}
                {(() => {
                  const invitation = invitations.find(inv => properties[inv.propertyId]?.id === selectedProperty.id)
                  return invitation && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          setIsViewDialogOpen(false)
                          handleStartApplication(invitation.id)
                        }}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Start Application
                      </Button>
                    </div>
                  )
                })()}
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                {/* Main Content */}
                <div className="md:col-span-2 space-y-6">
                  {/* Property Images */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Property Images</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedProperty.images?.map((image: string, index: number) => (
                          <div key={index} className="aspect-video relative rounded-lg overflow-hidden bg-muted">
                            <img
                              src={image || "/placeholder.svg"}
                              alt={`Property ${index + 1}`}
                              className="object-cover w-full h-full"
                            />
                          </div>
                        ))}
                        {(!selectedProperty.images || selectedProperty.images.length === 0) && (
                          <div className="aspect-video bg-muted rounded-md flex items-center justify-center">
                            <p className="text-muted-foreground">No images available</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Property Details */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Property Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="flex items-center gap-2">
                          <Home className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Type</p>
                            <p className="font-medium capitalize">{selectedProperty.type}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Bed className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Bedrooms</p>
                            <p className="font-medium">{selectedProperty.bedrooms}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Bath className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Bathrooms</p>
                            <p className="font-medium">{selectedProperty.bathrooms}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Square className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Square Footage</p>
                            <p className="font-medium">{selectedProperty.squareFeet?.toLocaleString?.() ?? "N/A"}</p>
                          </div>
                        </div>
                      </div>

                      {selectedProperty.description && (
                        <div className="mt-4">
                          <h4 className="font-medium mb-2">Description</h4>
                          <p className="text-muted-foreground">{selectedProperty.description}</p>
                        </div>
                      )}

                      {selectedProperty.amenities && selectedProperty.amenities.length > 0 && (
                        <div className="mt-4">
                          <h4 className="font-medium mb-2">Amenities</h4>
                          <div className="flex flex-wrap gap-2">
                            {selectedProperty.amenities.map((amenity: string) => (
                              <Badge key={amenity} variant="outline">
                                {amenity}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedProperty.petPolicy && (
                        <div className="mt-4">
                          <h4 className="font-medium mb-2">Pet Policy</h4>
                          <div className="space-y-1">
                            <p>
                              <span className="font-medium">Pets allowed:</span> {selectedProperty.petPolicy.allowed ? "Yes" : "No"}
                            </p>
                            {selectedProperty.petPolicy.allowed && (
                              <>
                                {selectedProperty.petPolicy.restrictions && (
                                  <p>
                                    <span className="font-medium">Restrictions:</span> {selectedProperty.petPolicy.restrictions}
                                  </p>
                                )}
                                {selectedProperty.petPolicy.fee && (
                                  <p>
                                    <span className="font-medium">Pet deposit:</span> $
                                    {selectedProperty.petPolicy.fee.toLocaleString()}
                                  </p>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                  {/* Rent Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Rent Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="text-center">
                          {selectedProperty.monthlyRent !== undefined ? (
                            <p className="text-3xl font-bold">${selectedProperty.monthlyRent.toLocaleString()}</p>
                          ) : (
                            <p className="text-3xl font-bold text-muted-foreground">No rent info</p>
                          )}
                          <p className="text-muted-foreground">per month</p>
                        </div>
                        
                        <div className="space-y-2">
                          {selectedProperty.securityDeposit && (
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Security Deposit:</span>
                              <span className="font-medium">${selectedProperty.securityDeposit.toLocaleString()}</span>
                            </div>
                          )}
                          {selectedProperty.applicationFee && (
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Application Fee:</span>
                              <span className="font-medium">${selectedProperty.applicationFee.toLocaleString()}</span>
                            </div>
                          )}
                          {selectedProperty.petPolicy?.fee && (
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Pet Deposit:</span>
                              <span className="font-medium">${selectedProperty.petPolicy.fee.toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Location */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Location</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm">{formatAddress(selectedProperty.address)}</p>
                      </div>
                      {selectedProperty.latitude && selectedProperty.longitude ? (
                        <div className="aspect-video bg-muted rounded-md flex items-center justify-center mt-4">
                          <p className="text-muted-foreground">Map View</p>
                        </div>
                      ) : (
                        <div className="aspect-video bg-muted rounded-md flex items-center justify-center mt-4">
                          <p className="text-muted-foreground">Map will appear here</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Quick Actions */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {(() => {
                        const invitation = invitations.find(inv => properties[inv.propertyId]?.id === selectedProperty.id)
                        return invitation && (
                          <Button
                            onClick={() => {
                              setIsViewDialogOpen(false)
                              handleStartApplication(invitation.id)
                            }}
                            className="w-full bg-blue-600 hover:bg-blue-700"
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Start Application
                          </Button>
                        )
                      })()}
                      <Button
                        variant="outline"
                        onClick={() => setIsViewDialogOpen(false)}
                        className="w-full"
                      >
                        Close
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}