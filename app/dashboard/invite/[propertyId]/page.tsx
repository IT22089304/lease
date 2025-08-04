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
  MapPin
} from "lucide-react"
import { useAuth } from "@/lib/auth"
import { propertyService } from "@/lib/services/property-service"
import { invitationService } from "@/lib/services/invitation-service"
import { applicationService } from "@/lib/services/application-service"
import { leaseService } from "@/lib/services/lease-service"
import { toast } from "sonner"

interface TenantCard {
  id: string
  name: string
  email: string
  phone?: string
  stage: "invite" | "application" | "lease" | "accepted" | "payment" | "leased"
  propertyId: string
  invitationId?: string
  applicationId?: string
  leaseId?: string
  createdAt: Date
  updatedAt: Date
  notes?: string
}

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
  const [tenants, setTenants] = useState<TenantCard[]>([])
  const [loading, setLoading] = useState(true)
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteMessage, setInviteMessage] = useState("")

  useEffect(() => {
    async function fetchData() {
      if (!params.propertyId || !user) return

      try {
        setLoading(true)
        
        // Fetch property details
        const propertyData = await propertyService.getProperty(params.propertyId as string)
        setProperty(propertyData)

        // Fetch invitations, applications, and leases for this property
        const invitations = await invitationService.getPropertyInvitations(params.propertyId as string)
        const applications = await applicationService.getApplicationsByProperty(params.propertyId as string)
        const leases = await leaseService.getLandlordLeases(user.id)

        // Transform data into tenant cards
        const tenantCards: TenantCard[] = []

        // Add invitations
        invitations.forEach((invitation: any) => {
          tenantCards.push({
            id: invitation.id,
            name: invitation.renterEmail.split('@')[0], // Use email prefix as name
            email: invitation.renterEmail,
            stage: invitation.status === "accepted" ? "application" : "invite",
            propertyId: params.propertyId as string,
            invitationId: invitation.id,
            createdAt: invitation.invitedAt,
            updatedAt: invitation.respondedAt || invitation.invitedAt,
            notes: invitation.message || invitation.status
          })
        })

        // Add applications
        applications.forEach((application: any) => {
          tenantCards.push({
            id: application.id,
            name: application.renterEmail?.split('@')[0] || application.fullName?.split(' ')[0] || "Applicant",
            email: application.renterEmail || "applicant@example.com",
            stage: application.status === "approved" ? "lease" : "application",
            propertyId: params.propertyId as string,
            applicationId: application.id,
            createdAt: application.submittedAt || application.createdAt,
            updatedAt: application.reviewedAt || application.updatedAt,
            notes: application.status || "Application submitted"
          })
        })

        // Add active leases
        const propertyLeases = leases.filter(lease => 
          lease.propertyId === params.propertyId && lease.status === "active"
        )
        propertyLeases.forEach(lease => {
          tenantCards.push({
            id: lease.id,
            name: lease.renterId?.split('@')[0] || "Tenant",
            email: lease.renterId || "tenant@example.com",
            stage: "leased",
            propertyId: params.propertyId as string,
            leaseId: lease.id,
            createdAt: lease.createdAt,
            updatedAt: lease.updatedAt,
            notes: "Active lease"
          })
        })

        setTenants(tenantCards)
      } catch (error) {
        console.error("Error fetching tenant data:", error)
        toast.error("Failed to load tenant data")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [params.propertyId, user])

  const handleSendInvitation = async () => {
    if (!inviteEmail.trim()) {
      toast.error("Please enter an email address")
      return
    }

    try {
      await invitationService.createInvitation({
        landlordId: user!.id,
        propertyId: params.propertyId as string,
        renterEmail: inviteEmail,
        status: "pending",
        invitedAt: new Date()
      })

      toast.success("Invitation sent successfully")
      setIsInviteDialogOpen(false)
      setInviteEmail("")
      setInviteMessage("")
      // Refresh the page to show the new invitation
      router.refresh()
    } catch (error) {
      console.error("Error sending invitation:", error)
      toast.error("Failed to send invitation")
    }
  }

  const moveTenant = (tenantId: string, newStage: string) => {
    setTenants(prev => 
      prev.map(tenant => 
        tenant.id === tenantId 
          ? { ...tenant, stage: newStage as any, updatedAt: new Date() }
          : tenant
      )
    )
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
          const stageTenants = tenants.filter(tenant => tenant.stage === stage.id)
          
          return (
            <Card key={stage.id} className="h-fit">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">{stage.title}</CardTitle>
                  <Badge className={`text-xs ${stage.color}`}>
                    {stageTenants.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {stageTenants.map((tenant) => (
                  <Card key={tenant.id} className="p-3 cursor-pointer hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src="" />
                        <AvatarFallback className="text-xs">
                          {tenant.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{tenant.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{tenant.email}</p>
                        {tenant.notes && (
                          <p className="text-xs text-muted-foreground mt-1">{tenant.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 mt-2">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {new Date(tenant.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </Card>
                ))}
                
                {stageTenants.length === 0 && (
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
              const count = tenants.filter(tenant => tenant.stage === stage.id).length
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