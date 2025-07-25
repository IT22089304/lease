"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Edit, Send, Home, Bed, Bath, Square, MapPin, FileText, Bell, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { invitationService } from "@/lib/services/invitation-service"
import { toast } from "sonner"
import { propertyService } from "@/lib/services/property-service"
import { noticeService } from "@/lib/services/notice-service"
import { PropertyDetailsView } from "@/components/properties/property-details-view"

export default function PropertyDetailsPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const [property, setProperty] = useState<any>(null)
  const [activeTab, setActiveTab] = useState("details")
  const [loading, setLoading] = useState(true)
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteLoading, setInviteLoading] = useState(false)
  const [noticeDialogOpen, setNoticeDialogOpen] = useState(false)
  const [noticeSubject, setNoticeSubject] = useState("")
  const [noticeMessage, setNoticeMessage] = useState("")
  const [noticeLoading, setNoticeLoading] = useState(false)

  useEffect(() => {
    async function fetchProperty() {
      if (!params?.id) return
      setLoading(true)
      const prop = await propertyService.getProperty(params.id)
      setProperty(prop)
      setLoading(false)
    }
    fetchProperty()
  }, [params?.id])

  if (loading) {
    return <div className="container mx-auto p-6">Loading property...</div>
  }

  if (!property) {
    return <div className="container mx-auto p-6 text-destructive">Property not found.</div>
  }

  const formatAddress = (address: any) => {
    return `${address.street}${address.unit ? `, Unit ${address.unit}` : ""}, ${address.city}, ${address.state} ${address.postalCode}`
  }

  const handleEditProperty = () => {
    router.push(`/properties/${property.id}/edit`)
  }

  const handleSendInvitation = async () => {
    if (!inviteEmail) return
    try {
      setInviteLoading(true)
      await invitationService.createInvitation({
        propertyId: property.id,
        landlordId: property.landlordId,
        renterEmail: inviteEmail,
        status: "pending",
        invitedAt: new Date(),
      })
      toast.success("Invitation sent!")
      setInviteDialogOpen(false)
      setInviteEmail("")
    } catch (error) {
      toast.error("Failed to send invitation")
    } finally {
      setInviteLoading(false)
    }
  }

  const handleSendNoticeDialog = async () => {
    if (!noticeSubject || !noticeMessage) return
    try {
      setNoticeLoading(true)
      await noticeService.createNotice({
        landlordId: property.landlordId,
        propertyId: property.id,
        renterId: property.renterId || "", // You may want to select a renter if there are multiple
        type: "custom",
        subject: noticeSubject,
        message: noticeMessage,
        attachments: [],
        sentAt: new Date(),
      })
      toast.success("Notice sent!")
      setNoticeDialogOpen(false)
      setNoticeSubject("")
      setNoticeMessage("")
    } catch (error) {
      toast.error("Failed to send notice")
    } finally {
      setNoticeLoading(false)
    }
  }

  const handleSendNotice = () => {
    router.push(`/notices/new?propertyId=${property.id}`)
  }

  const handleReviewApplications = () => {
    router.push(`/applications?propertyId=${property.id}`)
  }

  return (
    <PropertyDetailsView
      property={property}
      actionButton={
          <Button variant="outline" onClick={handleEditProperty}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Property
          </Button>
      }
      tabs={
        <>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="notices">Notices</TabsTrigger>
          {property.status === "occupied" && <TabsTrigger value="tenant">Tenant</TabsTrigger>}
        </>
      }
      activeTab={activeTab}
      setActiveTab={setActiveTab}
    />
  )
}
