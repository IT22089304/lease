"use client"

import { useState, useEffect } from "react"
import { Plus, Eye, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { NoticeForm } from "@/components/notices/notice-form"
import { useAuth } from "@/lib/auth"
import type { Notice } from "@/types"
import { noticeService } from "@/lib/services/notice-service"
import { propertyService } from "@/lib/services/property-service"
import type { Property } from "@/types"

export default function NoticesPage() {
  const { user } = useAuth()
  const [sentNotices, setSentNotices] = useState<Notice[]>([])
  const [receivedNotices, setReceivedNotices] = useState<Notice[]>([])
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [properties, setProperties] = useState<Property[]>([])
  const [activeTab, setActiveTab] = useState("sent")

  useEffect(() => {
    if (!user?.id) return;
    async function fetchData() {
      if (!user?.id) return;
      
      // Fetch notices we sent (landlord-initiated notices)
      const allNotices = await noticeService.getLandlordNotices(user.id)
      const landlordSentNotices = allNotices.filter(notice => 
        notice.type !== "lease_completed" && 
        notice.type !== "lease_received"
      )
      setSentNotices(landlordSentNotices)
      
      // Fetch notices we received (renter responses like lease completions)
      const leaseNotices = await noticeService.getLandlordLeaseNotices(user.id)
      console.log("Lease notices received:", leaseNotices) // Debug log
      setReceivedNotices(leaseNotices)
      
      const props = await propertyService.getLandlordProperties(user.id)
      setProperties(props)
    }
    fetchData()
  }, [user])

  const handleSendNotice = async (noticeData: Partial<Notice>) => {
    if (!user?.id) return;
    // Compose notice object
    const newNotice = {
      ...noticeData,
      landlordId: user.id,
    } as Omit<Notice, "id" | "sentAt" | "readAt">;
    await noticeService.createNotice(newNotice)
    // Refresh notices
    if (!user?.id) return;
    const allNotices = await noticeService.getLandlordNotices(user.id)
    const landlordSentNotices = allNotices.filter(notice => 
      notice.type !== "lease_completed" && 
      notice.type !== "lease_received"
    )
    setSentNotices(landlordSentNotices)
    setIsFormOpen(false)
  }

  const deleteNotice = (noticeId: string) => {
    setSentNotices((prev) => prev.filter((n) => n.id !== noticeId))
  }

  const getNoticeTypeLabel = (type: Notice["type"]) => {
    const labels = {
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
    }
    return labels[type] || type
  }

  const getNoticeTypeBadge = (type: Notice["type"]) => {
    const variants = {
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
    }
    return variants[type] || "outline"
  }

  const getUrgencyLevel = (type: Notice["type"]) => {
    const urgentTypes = ["eviction", "late_rent", "lease_violation", "utility_shutdown", "lease_completed"]
    return urgentTypes.includes(type) ? "high" : "normal"
  }

  const markNoticeAsRead = async (noticeId: string) => {
    // Update both sent and received notices
    setSentNotices((prev) => prev.map((notice) => (notice.id === noticeId ? { ...notice, readAt: new Date() } : notice)))
    setReceivedNotices((prev) => prev.map((notice) => (notice.id === noticeId ? { ...notice, readAt: new Date() } : notice)))
    await noticeService.markAsRead(noticeId);
  }

  // Helper to get property address from ID
  const getPropertyAddress = (propertyId: string) => {
    const property = properties.find((p) => p.id === propertyId)
    if (!property) return propertyId
    const addr = property.address
    return `${addr.street}${addr.unit ? ", Unit " + addr.unit : ""}, ${addr.city}, ${addr.state}`
  }

  const unreadSentCount = sentNotices.filter((n) => !n.readAt).length
  const unreadReceivedCount = receivedNotices.filter((n) => !n.readAt).length

  if (!user || user.role !== "landlord") {
    return <div>Access denied. Landlord access required.</div>
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Notices</h1>
          <p className="text-muted-foreground">Manage notices sent to renters and view responses</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Send Notice
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send New Notice</DialogTitle>
            </DialogHeader>
            <NoticeForm
              onSend={handleSendNotice}
              properties={properties}
              onCancel={() => setIsFormOpen(false)}
            />
          </DialogContent>
        </Dialog>
        
        {/* Debug button for testing lease notices */}
        <Button
          variant="outline"
          onClick={async () => {
            if (!user?.id) return;
            // Create a test lease notice
            const testNotice = {
              type: "lease_completed" as const,
              subject: "Test Lease Agreement Completed",
              message: "This is a test lease completion notice",
              landlordId: user.id,
              propertyId: properties[0]?.id || "test-property",
              renterId: "test@example.com",
              renterEmail: "test@example.com",
              leaseAgreementId: "test-lease-id",
              status: "unread",
              priority: "high",
            };
            await noticeService.createNotice(testNotice);
            // Refresh notices
            const leaseNotices = await noticeService.getLandlordLeaseNotices(user.id);
            setReceivedNotices(leaseNotices);
            console.log("Test lease notice created");
          }}
        >
          Create Test Lease Notice
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Notices Sent</CardTitle>
            <Plus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{sentNotices.length}</div>
            <p className="text-xs text-muted-foreground">Total sent</p>
          </CardContent>
        </Card>
        <Card className="p-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Notices Received</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{receivedNotices.length}</div>
            <p className="text-xs text-muted-foreground">Total received</p>
          </CardContent>
        </Card>
        <Card className="p-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Unread Sent</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-destructive">{unreadSentCount}</div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>
        <Card className="p-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Unread Received</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-destructive">{unreadReceivedCount}</div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="sent">
            Notices We Send ({sentNotices.length})
          </TabsTrigger>
          <TabsTrigger value="received">
            Notices We Received ({receivedNotices.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sent" className="space-y-4 mt-6">
          {sentNotices.map((notice) => (
            <Card key={notice.id} className={!notice.readAt ? "border-destructive/50" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{notice.subject}</CardTitle>
                      {!notice.readAt && (
                        <Badge variant="destructive" className="text-xs">New</Badge>
                      )}
                      {getUrgencyLevel(notice.type) === "high" && (
                        <Badge variant="destructive" className="text-xs">Urgent</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <Badge variant={getNoticeTypeBadge(notice.type) as any}>{getNoticeTypeLabel(notice.type)}</Badge>
                      <span>Property: {getPropertyAddress(notice.propertyId)}</span>
                      <span>Renter: {notice.renterId}</span>
                      <span>Sent: {new Date(notice.sentAt).toLocaleDateString()}</span>
                      {notice.readAt && (
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3 text-success" />
                          Read {new Date(notice.readAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (!notice.readAt) {
                          markNoticeAsRead(notice.id)
                        }
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Mark Read
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteNotice(notice.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {notice.message}
                </p>
              </CardContent>
            </Card>
          ))}

          {sentNotices.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No notices sent yet.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="received" className="space-y-4 mt-6">
          {/* Debug info */}
          {receivedNotices.length === 0 && (
            <div className="text-center py-4 text-muted-foreground">
              <p>No lease notices received yet.</p>
              <p className="text-xs mt-2">Debug: Check if renters have submitted lease agreements</p>
            </div>
          )}
          
          {receivedNotices.map((notice) => (
            <Card key={notice.id} className={!notice.readAt ? "border-destructive/50" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{notice.subject}</CardTitle>
                      {!notice.readAt && (
                        <Badge variant="destructive" className="text-xs">New</Badge>
                      )}
                      {getUrgencyLevel(notice.type) === "high" && (
                        <Badge variant="destructive" className="text-xs">Urgent</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <Badge variant={getNoticeTypeBadge(notice.type) as any}>{getNoticeTypeLabel(notice.type)}</Badge>
                      <span>Property: {getPropertyAddress(notice.propertyId)}</span>
                      <span>Renter: {notice.renterEmail || notice.renterId}</span>
                      <span>Received: {new Date(notice.sentAt).toLocaleDateString()}</span>
                      {notice.readAt && (
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3 text-success" />
                          Read {new Date(notice.readAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (!notice.readAt) {
                          markNoticeAsRead(notice.id)
                        }
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Mark Read
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {notice.message}
                </p>
              </CardContent>
            </Card>
          ))}

          {receivedNotices.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No notices received yet.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
