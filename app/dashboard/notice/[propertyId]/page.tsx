"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Send, Calendar, AlertTriangle, CheckCircle, FileText, Eye, Trash2, Mail, User, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { NoticeForm } from "@/components/notices/notice-form"
import { useAuth } from "@/lib/auth"
import { useRouter, useParams } from "next/navigation"
import { propertyService } from "@/lib/services/property-service"
import { noticeService } from "@/lib/services/notice-service"
import { leaseService } from "@/lib/services/lease-service"
import type { Property, Notice } from "@/types"
import { toast } from "sonner"
import { doc, collection, query, where, orderBy, getDocs, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { FileUploadService } from "@/lib/services/file-upload-service"

interface LandlordMessage {
  id: string
  renterId: string
  renterEmail: string
  renterName: string
  landlordId: string
  propertyId: string
  leaseId: string
  message: string
  files: Array<{
    name: string
    size: number
    type: string
    url?: string
  }>
  status: "unread" | "read"
  createdAt: any
  updatedAt: any
}

export default function PropertyNoticesPage() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const propertyId = params.propertyId as string
  
  const [property, setProperty] = useState<Property | null>(null)
  const [notices, setNotices] = useState<Notice[]>([])
  const [messages, setMessages] = useState<LandlordMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedMessage, setSelectedMessage] = useState<LandlordMessage | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)

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

        // Fetch messages from tenants for this property
        const messagesQuery = query(
          collection(db, "landlordMessages"),
          where("landlordId", "==", user.id),
          where("propertyId", "==", propertyId),
          orderBy("createdAt", "desc")
        )
        
        const messagesSnapshot = await getDocs(messagesQuery)
        const messagesData: LandlordMessage[] = []
        
        messagesSnapshot.forEach((doc) => {
          const data = doc.data()
          messagesData.push({
            id: doc.id,
            renterId: data.renterId,
            renterEmail: data.renterEmail,
            renterName: data.renterName,
            landlordId: data.landlordId,
            propertyId: data.propertyId,
            leaseId: data.leaseId,
            message: data.message,
            files: data.files || [],
            status: data.status || "unread",
            createdAt: data.createdAt,
            updatedAt: data.updatedAt
          })
        })
        
        setMessages(messagesData)
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

  const handleViewMessage = async (message: LandlordMessage) => {
    setSelectedMessage(message)
    setIsViewDialogOpen(true)
    
    // Mark as read if unread
    if (message.status === "unread") {
      try {
        const messageRef = doc(db, "landlordMessages", message.id)
        await updateDoc(messageRef, {
          status: "read",
          updatedAt: new Date()
        })
        
        // Update local state
        setMessages(prev => 
          prev.map(msg => 
            msg.id === message.id 
              ? { ...msg, status: "read" as const }
              : msg
          )
        )
      } catch (error) {
        console.error("Error marking message as read:", error)
      }
    }
  }

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm("Are you sure you want to delete this message?")) return
    
    try {
      // Find the message to get file URLs
      const message = messages.find(msg => msg.id === messageId)
      if (!message) {
        toast.error("Message not found")
        return
      }

      // Delete files from storage if they exist
      if (message.files && message.files.length > 0) {
        const fileUrls = message.files
          .filter(file => file.url)
          .map(file => file.url!)
        
        if (fileUrls.length > 0) {
          try {
            await FileUploadService.deleteFiles(fileUrls)
            console.log("Files deleted from storage successfully")
          } catch (deleteError) {
            console.error("Error deleting files from storage:", deleteError)
            // Continue with message deletion even if file deletion fails
          }
        }
      }

      // Update message status in Firestore
      const messageRef = doc(db, "landlordMessages", messageId)
      await updateDoc(messageRef, {
        status: "deleted",
        updatedAt: new Date()
      })
      
      // Remove from local state
      setMessages(prev => prev.filter(msg => msg.id !== messageId))
      toast.success("Message deleted successfully")
    } catch (error) {
      console.error("Error deleting message:", error)
      toast.error("Failed to delete message")
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const hasImageFiles = (files: Array<{ type: string }>) => {
    return files.some(file => file.type.startsWith('image/'))
  }

  // Show loading state only if still loading and no data yet
  if (loading && !property) {
    return (
      <div className="container mx-auto p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading property notices...</p>
        </div>
      </div>
    )
  }

  const unreadCount = messages.filter(msg => msg.status === "unread").length

  // If no property data, show minimal loading or redirect
  if (!property) {
    return (
      <div className="container mx-auto p-8 space-y-8">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading property data...</p>
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
          <h1 className="text-4xl font-bold text-primary">Property Communications</h1>
          <p className="text-lg text-muted-foreground">
            Manage notices and messages for {getPropertyAddress(property)}
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

      {/* Tabs */}
      <Tabs defaultValue="sent" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="sent" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Sent Notices ({notices.length})
          </TabsTrigger>
          <TabsTrigger value="received" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Received Messages ({messages.length})
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-1 text-xs">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Sent Notices Tab */}
        <TabsContent value="sent" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Manually Sent Notices</span>
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
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Received Messages Tab */}
        <TabsContent value="received" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Tenant Messages
              </CardTitle>
            </CardHeader>
            <CardContent>
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Messages Received</h3>
                  <p className="text-muted-foreground">
                    You haven't received any messages from tenants for this property yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`border rounded-lg p-4 transition-colors hover:bg-muted/50 ${
                        message.status === "unread" ? "border-blue-200 bg-blue-50" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{message.renterName}</h4>
                            <Badge variant={message.status === "unread" ? "default" : "secondary"}>
                              {message.status === "unread" ? "New" : "Read"}
                            </Badge>
                            {message.files.length > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {message.files.length} file{message.files.length > 1 ? 's' : ''}
                                {hasImageFiles(message.files) && (
                                  <span className="ml-1">📷</span>
                                )}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {message.renterEmail}
                          </p>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {message.message}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {message.createdAt ? new Date(message.createdAt.toDate()).toLocaleDateString() : 'Unknown'}
                            </span>
                            {message.files.length > 0 && (
                              <span className="flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                {message.files.length} attachment{message.files.length > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewMessage(message)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteMessage(message.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Message View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Message from {selectedMessage?.renterName}</DialogTitle>
          </DialogHeader>
          {selectedMessage && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{selectedMessage.renterName}</span>
                  <span className="text-sm text-muted-foreground">({selectedMessage.renterEmail})</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {selectedMessage.createdAt ? new Date(selectedMessage.createdAt.toDate()).toLocaleString() : 'Unknown'}
                  </span>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Message</h4>
                <p className="text-sm whitespace-pre-wrap">{selectedMessage.message}</p>
              </div>

              {selectedMessage.files.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Attachments</h4>
                  <div className="space-y-4">
                    {selectedMessage.files.map((file, index) => {
                      const isImage = file.type.startsWith('image/')
                      return (
                        <div key={index} className="border rounded-lg p-4 bg-gray-50">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              {isImage ? (
                                <div className="w-4 h-4 bg-blue-500 rounded flex items-center justify-center">
                                  <span className="text-white text-xs">IMG</span>
                                </div>
                              ) : (
                                <FileText className="h-4 w-4 text-gray-500" />
                              )}
                              <span className="text-sm font-medium">{file.name}</span>
                              <span className="text-xs text-gray-500">
                                ({formatFileSize(file.size)})
                              </span>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={!file.url}
                              onClick={() => file.url && window.open(file.url, '_blank')}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </Button>
                          </div>
                          
                          {isImage && (
                            <div className="mt-3">
                              {file.url ? (
                                <>
                                  <img 
                                    src={file.url} 
                                    alt={file.name}
                                    className="max-w-full h-auto max-h-64 object-contain rounded border"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none'
                                      e.currentTarget.nextElementSibling?.classList.remove('hidden')
                                    }}
                                  />
                                  <div className="hidden text-center py-4 text-sm text-gray-500">
                                    <p>Image failed to load</p>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="mt-2"
                                      onClick={() => file.url && window.open(file.url, '_blank')}
                                    >
                                      <Download className="h-4 w-4 mr-2" />
                                      Download Image
                                    </Button>
                                  </div>
                                </>
                              ) : (
                                <div className="text-center py-8 text-sm text-gray-500 border-2 border-dashed border-gray-300 rounded">
                                  <div className="text-4xl mb-2">📷</div>
                                  <p className="mb-2">Image file: {file.name}</p>
                                  <p className="text-xs text-gray-400 mb-3">
                                    File size: {formatFileSize(file.size)}
                                  </p>
                                  <p className="text-xs text-gray-400">
                                    Image preview not available
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setIsViewDialogOpen(false)}
                >
                  Close
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    handleDeleteMessage(selectedMessage.id)
                    setIsViewDialogOpen(false)
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Message
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
} 