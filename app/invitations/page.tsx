"use client"

import { useState, useEffect } from "react"
import { Plus, Send, Eye, Clock, CheckCircle, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { InvitationForm } from "@/components/invitations/invitation-form"
import { useAuth } from "@/lib/auth"
import type { LeaseInvitation, Property } from "@/types"
import { invitationService } from "@/lib/services/invitation-service"
import { propertyService } from "@/lib/services/property-service"
import { useRouter } from "next/navigation"

// Helper to safely convert Firestore Timestamp, string, or Date to a readable date string
function toDateString(val: any) {
  if (!val) return "";
  if (val instanceof Date) return val.toLocaleDateString();
  if (typeof val === "string" || typeof val === "number") return new Date(val).toLocaleDateString();
  if (val.seconds) return new Date(val.seconds * 1000).toLocaleDateString();
  return "";
}

export default function InvitationsPage() {
  const { user } = useAuth()
  const router = useRouter()
  // Firestore returns plain objects, not LeaseInvitation typed objects
  const [invitations, setInvitations] = useState<any[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [isFormOpen, setIsFormOpen] = useState(false)

  useEffect(() => {
    if (!user || !user.id) return
    async function fetchData() {
      const [realInvitations, realProperties] = await Promise.all([
        invitationService.getLandlordInvitations(user.id),
        propertyService.getLandlordProperties(user.id),
      ])
      setInvitations(realInvitations)
      setProperties(realProperties)
    }
    fetchData()
  }, [user?.id])

  const handleSendInvitation = async (invitationData: any) => {
    if (!user || !user.id) {
      alert("You must be logged in to send an invitation.")
      return
    }
    try {
      await invitationService.createInvitation({
        propertyId: invitationData.propertyId,
        landlordId: user.id,
        renterEmail: invitationData.renterEmail,
        status: "pending",
        invitedAt: new Date(),
      })
      // Optionally, fetch updated invitations from Firestore
      const realInvitations = await invitationService.getLandlordInvitations(user.id)
      setInvitations(realInvitations)
      setIsFormOpen(false)
      alert("Invitation sent successfully!")
    } catch (error) {
      console.error("Failed to send invitation:", error)
      alert("Failed to send invitation. Please try again.")
    }
  }

  const handleAccept = async (invitation: any) => {
    await invitationService.updateInvitationStatus(invitation.id, "accepted")
    // Redirect to lease creation with prefilled renterEmail
    router.push(`/wizard/lease?propertyId=${invitation.propertyId}&renterEmail=${encodeURIComponent(invitation.renterEmail)}`)
  }
  const handleReject = async (invitation: any) => {
    await invitationService.updateInvitationStatus(invitation.id, "declined")
    // Optionally refresh invitations
    const realInvitations = await invitationService.getLandlordInvitations(user.id)
    setInvitations(realInvitations)
  }

  const getStatusBadge = (status: LeaseInvitation["status"]) => {
    const variants = {
      pending: { variant: "default", icon: Clock, label: "Pending" },
      accepted: { variant: "default", icon: CheckCircle, label: "Accepted" },
      declined: { variant: "secondary", icon: XCircle, label: "Declined" },
      expired: { variant: "destructive", icon: XCircle, label: "Expired" },
    }
    const config = variants[status]
    const Icon = config.icon
    return (
      <Badge variant={config.variant as any} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const getPropertyAddress = (propertyId: string) => {
    const property = properties.find((p) => p.id === propertyId)
    if (!property) return "Unknown Property"
    const addr = property.address
    return `${addr.street}${addr.unit ? `, Unit ${addr.unit}` : ""}, ${addr.city}, ${addr.state}`
  }

  if (!user || user.role !== "landlord") {
    return <div>Access denied. Landlord access required.</div>
  }

  return (
    <div className="container mx-auto p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-primary">Lease Invitations</h1>
          <p className="text-lg text-muted-foreground">Invite potential renters to apply for your properties</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Send Invitation
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Send Lease Application Invitation</DialogTitle>
            </DialogHeader>
            <InvitationForm
              properties={properties}
              onSubmit={handleSendInvitation}
              onCancel={() => setIsFormOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invitations</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invitations.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {invitations.filter((i) => i.status === "pending").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accepted</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {invitations.filter((i) => i.status === "accepted").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {invitations.length > 0
                ? Math.round((invitations.filter((i) => i.respondedAt).length / invitations.length) * 100)
                : 0}
              %
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invitations List */}
      <div className="space-y-6">
        {invitations.map((invitation) => (
          <Card key={invitation.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-semibold">{invitation.renterEmail}</h3>
                    {getStatusBadge(invitation.status)}
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground">
                      <span className="font-medium">Property:</span> {getPropertyAddress(invitation.propertyId)}
                    </p>
                    <p className="text-muted-foreground">
                      <span className="font-medium">Invited:</span> {toDateString(invitation.invitedAt)}
                    </p>
                    {invitation.respondedAt && (
                      <p className="text-muted-foreground">
                        <span className="font-medium">Responded:</span> {toDateString(invitation.respondedAt)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => router.push(`/renter/invitations/${invitation.id}`)}>
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                  {invitation.status === "pending" && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => handleAccept(invitation)}>
                        Accept
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleReject(invitation)}>
                        Reject
                      </Button>
                    </>
                  )}
                  {invitation.status === "pending" && (
                    <Button variant="outline" size="sm">
                      Resend
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            {invitation.message && (
              <CardContent>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm">{invitation.message}</p>
                </div>
              </CardContent>
            )}
          </Card>
        ))}

        {invitations.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Send className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No invitations sent yet</h3>
              <p className="text-muted-foreground mb-6">
                Start by sending lease application invitations to potential renters
              </p>
              <Button onClick={() => setIsFormOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Send Your First Invitation
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
