"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Send, Calendar, AlertTriangle, CheckCircle, FileText, Eye, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { NoticeForm } from "@/components/notices/notice-form"
import { useAuth } from "@/lib/auth"
import { useRouter, useParams } from "next/navigation"
import { propertyService } from "@/lib/services/property-service"
import { noticeService } from "@/lib/services/notice-service"
import { leaseService } from "@/lib/services/lease-service"
import type { Property, Notice } from "@/types"
import { toast } from "sonner"

export default function PropertyNoticesPage() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const propertyId = params.propertyId as string
  
  const [property, setProperty] = useState<Property | null>(null)
  const [notices, setNotices] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  useEffect(() => {
    async function fetchData() {
      if (!user?.id || !propertyId) return
      
      try {
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
        
        // Fetch notices for this property
        const propertyNotices = await noticeService.getPropertyNotices(propertyId)
        console.log("Fetched notices:", propertyNotices)
        
        // Filter to only show notices sent by this landlord for this property
        // Include manually sent notices and exclude only system-generated notices
        const sentNotices = propertyNotices.filter(notice => {
          // Must be sent by this landlord for this property
          const isFromThisLandlord = notice.landlordId === user.id && notice.propertyId === propertyId
          
          // Exclude only specific system-generated notice types
          const isSystemGenerated = [
            'payment_received',
            'payment_successful', 
            'invoice_sent',
            'lease_received',
            'lease_completed'
          ].includes(notice.type)
          
          return isFromThisLandlord && !isSystemGenerated
        })
        console.log("Filtered sent notices:", sentNotices)
        setNotices(sentNotices)
      } catch (error) {
        console.error("Error fetching data:", error)
        toast.error("Failed to load property details")
        router.push("/dashboard")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user?.id, propertyId, router])

  const getPropertyAddress = (property: Property) => {
    const addr = property.address
    return `${addr.street}${addr.unit ? `, Unit ${addr.unit}` : ""}, ${addr.city}, ${addr.state}`
  }

  const getNoticeTypeLabel = (type: Notice["type"]) => {
    const labels: Record<string, string> = {
      eviction: "Eviction Notice",
      late_rent: "Late Rent",
      noise_complaint: "Noise Complaint",
      inspection: "Inspection",
      lease_violation: "Lease Violation",
      rent_increase: "Rent Increase",
      maintenance: "Maintenance",
      parking_violation: "Parking Violation",
      pet_violation: "Pet Violation",
      utility_shutdown: "Utility Shutdown",
      cleanliness: "Cleanliness",
      custom: "Custom",
      lease_received: "Lease Agreement Received",
      lease_completed: "Lease Agreement Completed",
      invoice_sent: "Invoice Sent",
      payment_received: "Payment Received",
      payment_successful: "Payment Successful",
    }
    return labels[type] || type
  }

  const getNoticeTypeBadge = (type: Notice["type"]) => {
    const variants: Record<string, string> = {
      eviction: "destructive",
      late_rent: "destructive",
      noise_complaint: "secondary",
      inspection: "default",
      lease_violation: "destructive",
      rent_increase: "default",
      maintenance: "default",
      parking_violation: "secondary",
      pet_violation: "secondary",
      utility_shutdown: "destructive",
      cleanliness: "secondary",
      custom: "outline",
      lease_received: "default",
      lease_completed: "default",
      invoice_sent: "default",
      payment_received: "default",
      payment_successful: "default",
    }
    return variants[type] || "outline"
  }

  const createTestNotice = async () => {
    if (!user?.id || !propertyId) return
    
    try {
      await noticeService.createNotice({
        landlordId: user.id,
        propertyId: propertyId,
        renterId: "test-renter",
        type: "maintenance",
        subject: "Test Notice",
        message: "This is a test notice for demonstration purposes.",
      })
      toast.success("Test notice created!")
      
      // Refresh notices
      const updatedNotices = await noticeService.getPropertyNotices(propertyId)
      const sentNotices = updatedNotices.filter(notice => {
        // Must be sent by this landlord for this property
        const isFromThisLandlord = notice.landlordId === user.id && notice.propertyId === propertyId
        
        // Exclude only specific system-generated notice types
        const isSystemGenerated = [
          'payment_received',
          'payment_successful', 
          'invoice_sent',
          'lease_received',
          'lease_completed'
        ].includes(notice.type)
        
        return isFromThisLandlord && !isSystemGenerated
      })
      setNotices(sentNotices)
    } catch (error) {
      console.error("Failed to create test notice:", error)
      toast.error("Failed to create test notice")
    }
  }

  const handleSendNotice = async (noticeData: Partial<Notice>) => {
    if (!user?.id || !propertyId) {
      toast.error("You must be logged in to send a notice.")
      return
    }
    
    console.log("Notice data received:", noticeData)
    
    // Validate required fields
    if (!noticeData.subject?.trim()) {
      toast.error("Subject is required")
      return
    }
    
    if (!noticeData.message?.trim()) {
      toast.error("Message is required")
      return
    }
    
    if (!noticeData.type) {
      toast.error("Notice type is required")
      return
    }
    
    try {
      const newNotice = {
        landlordId: user.id,
        propertyId: propertyId,
        renterId: noticeData.renterId || "test-renter",
        type: noticeData.type,
        subject: noticeData.subject.trim(),
        message: noticeData.message.trim(),
      }
      
      console.log("Creating notice with data:", newNotice)
      
      await noticeService.createNotice(newNotice)
      toast.success("Notice sent successfully!")
      setIsDialogOpen(false) // Close the dialog after successful send
      
      // Refresh notices list with a small delay to ensure the database is updated
      setTimeout(async () => {
        try {
          const updatedNotices = await noticeService.getPropertyNotices(propertyId)
          const sentNotices = updatedNotices.filter(notice => {
            // Must be sent by this landlord for this property
            const isFromThisLandlord = notice.landlordId === user.id && notice.propertyId === propertyId
            
            // Exclude only specific system-generated notice types
            const isSystemGenerated = [
              'payment_received',
              'payment_successful', 
              'invoice_sent',
              'lease_received',
              'lease_completed'
            ].includes(notice.type)
            
            return isFromThisLandlord && !isSystemGenerated
          })
          setNotices(sentNotices)
        } catch (error) {
          console.error("Error refreshing notices:", error)
        }
      }, 1000)
    } catch (error) {
      console.error("Failed to send notice:", error)
      toast.error("Failed to send notice. Please try again.")
    }
  }

  const handleCancelNotice = () => {
    setIsDialogOpen(false)
  }

  if (!user || user.role !== "landlord") {
    return <div>Access denied. Landlord access required.</div>
  }

  if (loading) {
    return (
      <div className="container mx-auto p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading property notices...</p>
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
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => router.push("/dashboard")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-primary">Sent Notices</h1>
          <p className="text-lg text-muted-foreground">
            Manually sent notices for {getPropertyAddress(property)}
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Send Notice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Send New Notice</DialogTitle>
            </DialogHeader>
            <NoticeForm 
              properties={[property]}
              onSend={handleSendNotice}
              onCancel={handleCancelNotice}
              defaultPropertyId={propertyId}
              prefilledProperty={property}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Notices List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Manually Sent Notices ({notices.length})</span>
            <Button variant="outline" size="sm" onClick={createTestNotice}>
              Create Test Notice
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {notices.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Notices Sent Yet</h3>
              <p className="text-muted-foreground mb-4">
                You haven't sent any manual notices for this property yet.
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Send className="h-4 w-4 mr-2" />
                Send Your First Notice
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {notices.map((notice) => (
                <div
                  key={notice.id}
                  className="border rounded-lg p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">Notice</h4>
                        <Badge variant={getNoticeTypeBadge(notice.type) as "outline" | "destructive" | "secondary" | "default"}>
                          {getNoticeTypeLabel(notice.type)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Subject: {notice.subject}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Message: {notice.message}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Sent {notice.sentAt ? new Date(notice.sentAt).toLocaleDateString() : 'Unknown'}
                        </span>
                        {notice.readAt && (
                          <span className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3 text-green-600" />
                            Read {new Date(notice.readAt).toLocaleDateString()}
                          </span>
                        )}
                        {!notice.readAt && (
                          <span className="flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3 text-orange-600" />
                            Unread
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      {/* The original code had a Send button here, but the new createTestNotice doesn't have it.
                          Keeping the original logic for now, but it might need adjustment based on the new createTestNotice. */}
                      {/* {notice.status === "pending" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/dashboard/notice/${propertyId}`)}
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Send Another
                        </Button>
                      )} */}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 