"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { 
  ArrowLeft, 
  Plus, 
  Mail, 
  FileText, 
  CheckCircle, 
  DollarSign, 
  Home,
  User,
  Calendar,
  Phone,
  MapPin,
  GripVertical
} from "lucide-react"
import { useAuth } from "@/lib/auth"
import { propertyService } from "@/lib/services/property-service"
import { invitationService } from "@/lib/services/invitation-service"
import { applicationService } from "@/lib/services/application-service"
import { leaseService } from "@/lib/services/lease-service"
import { renterStatusService, type RenterStatus } from "@/lib/services/renter-status-service"
import { toast } from "sonner"

const stages = [
  { id: "invite", title: "Invite", color: "bg-blue-100 text-blue-700" },
  { id: "application", title: "Rental Application", color: "bg-yellow-100 text-yellow-700" },
  { id: "lease", title: "Lease Agreement", color: "bg-purple-100 text-purple-700" },
  { id: "accepted", title: "Accepted", color: "bg-green-100 text-green-700" },
  { id: "payment", title: "Payment", color: "bg-orange-100 text-orange-700" },
  { id: "leased", title: "Leased", color: "bg-emerald-100 text-emerald-700" }
]

export default function FindTenantsPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [property, setProperty] = useState<any>(null)
  const [renterStatuses, setRenterStatuses] = useState<RenterStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteMessage, setInviteMessage] = useState("")
  const [draggedItem, setDraggedItem] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      if (!params.propertyId || !user) return

      try {
        setLoading(true)
        
        // Fetch property details
        const propertyData = await propertyService.getProperty(params.propertyId as string)
        setProperty(propertyData)

        // Fetch renter statuses for this property
        const statuses = await renterStatusService.getRenterStatusByProperty(params.propertyId as string)
        setRenterStatuses(statuses)

        // If no renter statuses exist, sync from existing data
        if (statuses.length === 0) {
          await syncExistingData()
        }
      } catch (error) {
        console.error("Error fetching tenant data:", error)
        toast.error("Failed to load tenant data")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [params.propertyId, user])

  const syncExistingData = async () => {
    try {
      // First, clean up existing renter statuses for this property to avoid duplicates
      const existingStatuses = await renterStatusService.getRenterStatusByProperty(params.propertyId as string)
      
      // Delete all existing statuses to rebuild from scratch
      for (const status of existingStatuses) {
        if (status.id) {
          await renterStatusService.deleteRenterStatus(status.id)
        }
      }

      // Fetch existing invitations, applications, and leases
      const invitations = await invitationService.getPropertyInvitations(params.propertyId as string)
      const applications = await applicationService.getApplicationsByProperty(params.propertyId as string)
      const leases = await leaseService.getLandlordLeases(user!.id)
      const propertyLeases = leases.filter(lease => 
        lease.propertyId === params.propertyId && lease.status === "active"
      )

      const newStatuses: RenterStatus[] = []

      // Create status entries from invitations (only accepted ones show in invite stage)
      for (const invitation of invitations) {
        // Only process accepted invitations for the kanban board
        if (invitation.status === "accepted") {
          const statusData = {
            propertyId: params.propertyId as string,
            landlordId: user!.id,
            renterEmail: invitation.renterEmail,
            renterName: invitation.renterEmail.split('@')[0],
            status: "invite" as const, // Accepted invitations show in invite stage
            invitationId: invitation.id,
            notes: `Invitation accepted - ${invitation.renterEmail}`
          }
          const statusId = await renterStatusService.createRenterStatus(statusData)
          newStatuses.push({ ...statusData, id: statusId, createdAt: new Date(), updatedAt: new Date() })
        }
        // Skip pending/rejected invitations - they won't appear on the kanban board
      }

      // Create status entries from applications
      for (const application of applications) {
        const statusData = {
          propertyId: params.propertyId as string,
          landlordId: user!.id,
          renterEmail: (application as any).renterEmail || "applicant@example.com",
          renterName: (application as any).renterEmail?.split('@')[0] || (application as any).fullName?.split(' ')[0] || "Applicant",
          status: ((application as any).status === "approved" ? "lease" : "application") as "invite" | "application" | "lease" | "accepted" | "payment" | "leased",
          applicationId: application.id,
          notes: (application as any).status || "Application submitted"
        }
        const statusId = await renterStatusService.createRenterStatus(statusData)
        newStatuses.push({ ...statusData, id: statusId, createdAt: new Date(), updatedAt: new Date() })
      }

      // Create status entries from leases
      for (const lease of propertyLeases) {
        const statusData = {
          propertyId: params.propertyId as string,
          landlordId: user!.id,
          renterEmail: lease.renterId || "tenant@example.com",
          renterName: lease.renterId?.split('@')[0] || "Tenant",
          status: "leased" as const,
          leaseId: lease.id,
          notes: "Active lease"
        }
        const statusId = await renterStatusService.createRenterStatus(statusData)
        newStatuses.push({ ...statusData, id: statusId, createdAt: new Date(), updatedAt: new Date() })
      }

      setRenterStatuses(newStatuses)
    } catch (error) {
      console.error("Error syncing existing data:", error)
    }
  }

  const handleSendInvitation = async () => {
    if (!inviteEmail.trim()) {
      toast.error("Please enter an email address")
      return
    }

    try {
      // Create invitation
      await invitationService.createInvitation({
        landlordId: user!.id,
        propertyId: params.propertyId as string,
        renterEmail: inviteEmail,
        status: "pending",
        invitedAt: new Date()
      })

      // Don't create renter status entry for pending invitations
      // They will only appear on the kanban board once accepted
      // The invitation is sent but won't show up until the renter accepts it

      toast.success("Invitation sent successfully")
      setIsInviteDialogOpen(false)
      setInviteEmail("")
      setInviteMessage("")
    } catch (error) {
      console.error("Error sending invitation:", error)
      toast.error("Failed to send invitation")
    }
  }

  const handleDragStart = (e: React.DragEvent, statusId: string) => {
    setDraggedItem(statusId)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleDrop = async (e: React.DragEvent, targetStage: string) => {
    e.preventDefault()
    
    if (!draggedItem) return

    try {
      // Update the status in the database
      await renterStatusService.moveRenterToStage(draggedItem, targetStage as any)
      
      // Update local state
      setRenterStatuses(prev => 
        prev.map(status => 
          status.id === draggedItem 
            ? { ...status, status: targetStage as any, updatedAt: new Date() }
            : status
        )
      )

      toast.success("Renter moved successfully")
    } catch (error) {
      console.error("Error moving renter:", error)
      toast.error("Failed to move renter")
    } finally {
      setDraggedItem(null)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  if (!property) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Property not found</h2>
          <p className="text-muted-foreground">The property you're looking for doesn't exist.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Find Tenants</h1>
          <p className="text-muted-foreground">{property.title || property.address?.street}</p>
        </div>
        <div className="ml-auto">
          <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Invite Tenant
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Send Invitation</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Email Address</label>
                  <Input
                    type="email"
                    placeholder="tenant@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Message (Optional)</label>
                  <Textarea
                    placeholder="Add a personal message to your invitation..."
                    value={inviteMessage}
                    onChange={(e) => setInviteMessage(e.target.value)}
                    rows={3}
                  />
                </div>
                <Button onClick={handleSendInvitation} className="w-full">
                  <Mail className="h-4 w-4 mr-2" />
                  Send Invitation
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {stages.map((stage) => {
          let stageRenters = renterStatuses.filter(status => {
            // For lease stage, include both "lease" and "lease_rejected" statuses
            if (stage.id === "lease") {
              return status.status === "lease" || status.status === "lease_rejected"
            }
            return status.status === stage.id
          })
          
          // For invite stage, only show renters with accepted invitations
          if (stage.id === "invite") {
            stageRenters = stageRenters.filter(status => {
              // Only show if there's an invitationId and the notes indicate acceptance
              return status.invitationId && 
                     (status.notes?.includes("accepted") || status.notes?.includes("Invitation accepted"))
            })
          }
          
          // Filter out renters who have progressed to later stages
          // Each email should only appear in the furthest stage they've reached
          stageRenters = stageRenters.filter(status => {
            const currentStageIndex = stages.findIndex(s => s.id === stage.id)
            
            // Check if this renter has progressed to any later stage
            const hasLaterStage = renterStatuses.some(otherStatus => {
              if (otherStatus.renterEmail !== status.renterEmail) return false
              
              const otherStageIndex = stages.findIndex(s => s.id === otherStatus.status)
              return otherStageIndex > currentStageIndex
            })
            
            // Only show if this is the furthest stage for this renter
            return !hasLaterStage
          })
          
          return (
            <Card 
              key={stage.id} 
              className="h-fit"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">{stage.title}</CardTitle>
                  <Badge className={`text-xs ${stage.color}`}>
                    {stageRenters.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {stageRenters.map((renter) => (
                  <Card 
                    key={renter.id} 
                    className={`p-3 cursor-move hover:shadow-md transition-shadow ${
                      renter.status === "lease_rejected" ? "border-red-500 bg-red-50" : ""
                    }`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, renter.id!)}
                  >
                    <div className="flex items-start gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <Avatar className="h-8 w-8">
                        <AvatarImage src="" />
                        <AvatarFallback className="text-xs">
                          {renter.renterName?.charAt(0).toUpperCase() || "T"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{renter.renterName}</p>
                          {renter.status === "lease_rejected" && (
                            <Badge variant="destructive" className="text-xs">Rejected</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{renter.renterEmail}</p>
                        {renter.notes && (
                          <p className="text-xs text-muted-foreground mt-1">{renter.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 mt-2">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {new Date(renter.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </Card>
                ))}
                
                {stageRenters.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground">
                    <p className="text-xs">No tenants</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            {stages.map((stage) => {
              let stageRenters = renterStatuses.filter(status => {
                // For lease stage, include both "lease" and "lease_rejected" statuses
                if (stage.id === "lease") {
                  return status.status === "lease" || status.status === "lease_rejected"
                }
                return status.status === stage.id
              })
              
              // Apply the same filtering logic as the kanban board
              if (stage.id === "invite") {
                stageRenters = stageRenters.filter(status => {
                  // Only show if there's an invitationId and the notes indicate acceptance
                  return status.invitationId && 
                         (status.notes?.includes("accepted") || status.notes?.includes("Invitation accepted"))
                })
              }
              
              // Filter out renters who have progressed to later stages (same logic as kanban board)
              stageRenters = stageRenters.filter(status => {
                const currentStageIndex = stages.findIndex(s => s.id === stage.id)
                
                // Check if this renter has progressed to any later stage
                const hasLaterStage = renterStatuses.some(otherStatus => {
                  if (otherStatus.renterEmail !== status.renterEmail) return false
                  
                  const otherStageIndex = stages.findIndex(s => s.id === otherStatus.status)
                  return otherStageIndex > currentStageIndex
                })
                
                // Only show if this is the furthest stage for this renter
                return !hasLaterStage
              })
              
              const count = stageRenters.length
              return (
                <div key={stage.id} className="text-center">
                  <div className={`text-2xl font-bold ${stage.color.split(' ')[0]}`}>
                    {count}
                  </div>
                  <div className="text-xs text-muted-foreground">{stage.title}</div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 