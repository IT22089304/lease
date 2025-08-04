"use client"

import { useState, useEffect } from "react"
import { Send, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { InvitationForm } from "@/components/invitations/invitation-form"
import { useAuth } from "@/lib/auth"
import { useRouter, useParams } from "next/navigation"
import { invitationService } from "@/lib/services/invitation-service"
import { propertyService } from "@/lib/services/property-service"
import type { Property } from "@/types"
import { toast } from "sonner"

export default function PropertyInvitePage() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const propertyId = params.propertyId as string
  
  const [property, setProperty] = useState<Property | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchProperty() {
      if (!user?.id || !propertyId) return
      
      try {
        const propertyData = await propertyService.getProperty(propertyId)
        if (propertyData.landlordId !== user.id) {
          toast.error("Access denied. This property doesn't belong to you.")
          router.push("/dashboard")
          return
        }
        setProperty(propertyData)
      } catch (error) {
        console.error("Error fetching property:", error)
        toast.error("Failed to load property details")
        router.push("/dashboard")
      } finally {
        setLoading(false)
      }
    }

    fetchProperty()
  }, [user?.id, propertyId, router])

  const handleSendInvitation = async (invitationData: any) => {
    if (!user?.id || !propertyId) {
      toast.error("You must be logged in to send an invitation.")
      return
    }
    
    try {
      await invitationService.createInvitation({
        propertyId: propertyId,
        landlordId: user.id,
        renterEmail: invitationData.renterEmail,
        status: "pending",
        invitedAt: new Date(),
      })
      
      toast.success("Invitation sent successfully!")
      setIsFormOpen(false)
    } catch (error) {
      console.error("Failed to send invitation:", error)
      toast.error("Failed to send invitation. Please try again.")
    }
  }

  const getPropertyAddress = (property: Property) => {
    const addr = property.address
    return `${addr.street}${addr.unit ? `, Unit ${addr.unit}` : ""}, ${addr.city}, ${addr.state}`
  }

  if (!user || user.role !== "landlord") {
    return <div>Access denied. Landlord access required.</div>
  }

  if (loading) {
    return (
      <div className="container mx-auto p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading property details...</p>
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
          <Button className="mt-4" onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-8 space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => router.push("/dashboard")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-primary">Send Invitation</h1>
          <p className="text-lg text-muted-foreground">
            Invite potential renters to apply for {getPropertyAddress(property)}
          </p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Send Invitation
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Send Lease Application Invitation</DialogTitle>
            </DialogHeader>
            <InvitationForm
              properties={[property]}
              onSubmit={handleSendInvitation}
              onCancel={() => setIsFormOpen(false)}
              defaultPropertyId={propertyId}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Property Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>Property Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Address</h4>
              <p className="text-muted-foreground">{getPropertyAddress(property)}</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Type</h4>
              <p className="text-muted-foreground capitalize">{property.type}</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Monthly Rent</h4>
              <p className="text-2xl font-bold text-primary">
                ${property.monthlyRent?.toLocaleString() || "N/A"}
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Security Deposit</h4>
              <p className="text-lg font-semibold">
                ${property.securityDeposit?.toLocaleString() || "N/A"}
              </p>
            </div>
          </div>
          
          {property.description && (
            <div>
              <h4 className="font-medium mb-2">Description</h4>
              <p className="text-muted-foreground">{property.description}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 