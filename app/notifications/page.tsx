"use client"

import { useState, useEffect } from "react"
import { Plus, Eye, Trash2, Calendar, AlertTriangle, CheckCircle, FileText, Home, Download, Send, Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PDFViewer } from "@/components/ui/pdf-viewer"
import { InvoiceForm } from "@/components/notices/invoice-form"
import { NoticeForm } from "@/components/notices/notice-form"
import { useAuth } from "@/lib/auth"
import type { Notice, Property } from "@/types"
import { noticeService } from "@/lib/services/notice-service"
import { propertyService } from "@/lib/services/property-service"
import { notificationService } from "@/lib/services/notification-service"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { toast } from "sonner"
import { toDateString } from "@/lib/utils"

export default function NotificationsPage() {
  const { user } = useAuth()
  const [sentNotices, setSentNotices] = useState<Notice[]>([])
  const [receivedNotices, setReceivedNotices] = useState<Notice[]>([])
  const [leaseNotices, setLeaseNotices] = useState<Notice[]>([])
  const [applicationNotifications, setApplicationNotifications] = useState<any[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("all")
  const [unreadCount, setUnreadCount] = useState(0)
  const [isPdfViewerOpen, setIsPdfViewerOpen] = useState(false)
  const [selectedPdfUrl, setSelectedPdfUrl] = useState("")
  const [selectedPdfTitle, setSelectedPdfTitle] = useState("")
  const [propertyDetails, setPropertyDetails] = useState<any>(null)
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null)
  const [isInvoiceFormOpen, setIsInvoiceFormOpen] = useState(false)
  const [selectedInvoiceNotice, setSelectedInvoiceNotice] = useState<Notice | null>(null)

  useEffect(() => {
    if (!user?.id) return;
    async function fetchData() {
      if (!user?.id) return;
      
      const [
        allNotices,
        leaseNoticesData,
        applicationNotificationsData,
        unreadCountData,
        props
      ] = await Promise.all([
        noticeService.getLandlordNotices(user.id),
        noticeService.getLandlordLeaseNotices(user.id),
        notificationService.getLandlordNotifications(user.id),
        notificationService.getUnreadCount(user.id),
        propertyService.getLandlordProperties(user.id)
      ])
      
      // Filter sent notices (landlord-initiated notices)
      const landlordSentNotices = allNotices.filter(notice => 
        notice.type !== "lease_completed" && 
        notice.type !== "lease_received"
      )
      setSentNotices(landlordSentNotices)
      
      // Set lease notices
      setLeaseNotices(leaseNoticesData)
      
      // Set application notifications
      setApplicationNotifications(applicationNotificationsData)
      
      // Set unread count
      setUnreadCount(unreadCountData)
      
      // Set properties
      setProperties(props)
    }
    fetchData()
  }, [user])

  const handleSendNotice = async (noticeData: Partial<Notice>) => {
    if (!user?.id) return;
    const newNotice = {
      ...noticeData,
      landlordId: user.id,
    } as Omit<Notice, "id" | "sentAt" | "readAt">;
    await noticeService.createNotice(newNotice)
    
    // Refresh notices
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
    }
    return variants[type] || "outline"
  }

  const getUrgencyLevel = (type: Notice["type"]) => {
    const urgentTypes = ["eviction", "late_rent", "lease_violation", "utility_shutdown", "lease_completed"]
    return urgentTypes.includes(type) ? "high" : "normal"
  }

  const markNoticeAsRead = async (noticeId: string) => {
    setSentNotices((prev) => prev.map((notice) => (notice.id === noticeId ? { ...notice, readAt: new Date() } : notice)))
    setReceivedNotices((prev) => prev.map((notice) => (notice.id === noticeId ? { ...notice, readAt: new Date() } : notice)))
    setLeaseNotices((prev) => prev.map((notice) => (notice.id === noticeId ? { ...notice, readAt: new Date() } : notice)))
    await noticeService.markAsRead(noticeId);
  }

  const handleViewLease = async (notice: Notice) => {
    if (notice.leaseAgreementId) {
      try {
        const leaseRef = doc(db, "filledLeases", notice.leaseAgreementId);
        const leaseSnap = await getDoc(leaseRef);
        
        if (leaseSnap.exists()) {
          const leaseData = leaseSnap.data();
          const pdfUrl = leaseData.filledPdfUrl || leaseData.originalTemplateUrl;
          
          if (pdfUrl) {
            setSelectedPdfUrl(pdfUrl);
            setSelectedPdfTitle(leaseData.templateName || "Lease Agreement");
            setSelectedNotice(notice);
            setIsPdfViewerOpen(true);
            
            if (!notice.readAt) {
              await markNoticeAsRead(notice.id);
            }
          } else {
            console.error("No PDF URL found in lease agreement");
          }
        } else {
          console.error("Lease agreement not found");
        }
      } catch (error) {
        console.error("Error opening lease PDF:", error);
      }
    }
  };

  const handleDownloadLease = async (notice: Notice) => {
    if (notice.leaseAgreementId) {
      try {
        const leaseRef = doc(db, "filledLeases", notice.leaseAgreementId);
        const leaseSnap = await getDoc(leaseRef);
        
        if (leaseSnap.exists()) {
          const leaseData = leaseSnap.data();
          const pdfUrl = leaseData.filledPdfUrl || leaseData.originalTemplateUrl;
          
          if (pdfUrl) {
            const link = document.createElement('a');
            link.href = pdfUrl;
            link.download = `${leaseData.templateName || 'Lease Agreement'}_${notice.renterEmail || 'renter'}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success("Lease agreement downloaded successfully");
          } else {
            toast.error("No PDF URL found in lease agreement");
          }
        } else {
          toast.error("Lease agreement not found");
        }
      } catch (error) {
        console.error("Error downloading lease PDF:", error);
        toast.error("Failed to download lease agreement");
      }
    }
  };

  const handleSendInvoice = async (notice: Notice) => {
    if (!notice.renterEmail) {
      toast.error("Renter email not found");
      return;
    }
    setSelectedInvoiceNotice(notice);
    setIsInvoiceFormOpen(true);
  };

  const handleInvoiceSubmit = async (invoiceData: any) => {
    try {
      console.log("Invoice data:", invoiceData);
      toast.success(`Invoice sent to ${invoiceData.renterEmail}`);
    } catch (error) {
      console.error("Error sending invoice:", error);
      toast.error("Failed to send invoice");
    }
  };

  const handleViewProperty = async (notice: Notice) => {
    if (notice.propertyId) {
      try {
        const propRef = doc(db, "properties", notice.propertyId);
        const propSnap = await getDoc(propRef);
        if (propSnap.exists()) {
          setPropertyDetails(propSnap.data());
        }
      } catch (error) {
        console.error("Error fetching property details:", error);
      }
    }
  };

  const getPropertyAddress = (propertyId: string) => {
    const property = properties.find((p) => p.id === propertyId)
    if (!property) return propertyId
    const addr = property.address
    return `${addr.street}${addr.unit ? ", Unit " + addr.unit : ""}, ${addr.city}, ${addr.state}`
  }

  const allNotifications = [
    ...sentNotices.map(n => ({ ...n, _type: "sent" })),
    ...leaseNotices.map(n => ({ ...n, _type: "lease" })),
    ...applicationNotifications.map(n => ({ ...n, _type: "application" }))
  ].sort((a, b) => {
    const aDate = a.sentAt || a.createdAt || new Date(0);
    const bDate = b.sentAt || b.createdAt || new Date(0);
    return new Date(bDate).getTime() - new Date(aDate).getTime();
  });

  const filteredNotifications = allNotifications.filter((notification) => {
    switch (activeTab) {
      case "unread":
        return !notification.readAt
      case "sent":
        return notification._type === "sent"
      case "lease":
        return notification._type === "lease"
      case "applications":
        return notification._type === "application"
      default:
        return true
    }
  })

  const unreadSentCount = sentNotices.filter((n) => !n.readAt).length
  const unreadLeaseCount = leaseNotices.filter((n) => !n.readAt).length
  const unreadApplicationCount = applicationNotifications.filter((n) => !n.readAt).length
  const totalUnreadCount = unreadSentCount + unreadLeaseCount + unreadApplicationCount

  if (!user || user.role !== "landlord") {
    return <div>Access denied. Landlord access required.</div>
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-primary">Notifications</h1>
          <p className="text-muted-foreground">Manage all your notifications, notices, and lease updates</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center text-xs"
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex items-center justify-between">
                  <span>Quick Notifications</span>
                  {unreadCount > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={async () => {
                        if (user?.id) {
                          await notificationService.markAllAsRead(user.id);
                          setUnreadCount(0);
                        }
                      }}
                    >
                      Mark all as read
                    </Button>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {applicationNotifications.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No new notifications
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto">
                    {applicationNotifications.slice(0, 5).map((notification) => (
                      <DropdownMenuItem
                        key={notification.id}
                        className="flex items-start gap-3 p-3 cursor-pointer hover:bg-muted/50"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium truncate">
                              {notification.title}
                            </span>
                            {!notification.readAt && (
                              <Badge variant="destructive" className="text-xs">New</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">
                              {notification.createdAt ? toDateString(notification.createdAt) : 'Just now'}
                            </span>
                          </div>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
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
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="p-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Total Notifications</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{allNotifications.length}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        <Card className="p-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Unread</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-destructive">{totalUnreadCount}</div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>
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
            <CardTitle className="text-xs font-medium">Lease Updates</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{leaseNotices.length}</div>
            <p className="text-xs text-muted-foreground">Agreements</p>
          </CardContent>
        </Card>
        <Card className="p-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Applications</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{applicationNotifications.length}</div>
            <p className="text-xs text-muted-foreground">Submitted</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">All ({allNotifications.length})</TabsTrigger>
          <TabsTrigger value="unread">Unread ({totalUnreadCount})</TabsTrigger>
          <TabsTrigger value="sent">Sent ({sentNotices.length})</TabsTrigger>
          <TabsTrigger value="lease">Lease ({leaseNotices.length})</TabsTrigger>
          <TabsTrigger value="applications">Applications ({applicationNotifications.length})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4 mt-6">
          {filteredNotifications.map((notification) => (
            <Card key={notification.id} className={!notification.readAt ? "border-destructive/50" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">
                        {notification._type === "application" 
                          ? notification.title 
                          : notification.subject || notification.title
                        }
                      </CardTitle>
                      {!notification.readAt && (
                        <Badge variant="destructive" className="text-xs">New</Badge>
                      )}
                      {notification._type === "lease" && getUrgencyLevel(notification.type) === "high" && (
                        <Badge variant="destructive" className="text-xs">Urgent</Badge>
                      )}
                      {notification._type === "application" && (
                        <Badge variant="default" className="text-xs">Application</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {notification._type !== "application" && (
                        <Badge variant={getNoticeTypeBadge(notification.type) as any}>
                          {getNoticeTypeLabel(notification.type)}
                        </Badge>
                      )}
                      {notification.propertyId && (
                        <span>Property: {getPropertyAddress(notification.propertyId)}</span>
                      )}
                      <span>
                        {notification._type === "application" 
                          ? `Applicant: ${notification.data?.fullName || notification.data?.renterEmail}`
                          : `Renter: ${notification.renterEmail || notification.renterId}`
                        }
                      </span>
                      <span>
                        {notification._type === "application" 
                          ? `Received: ${notification.createdAt ? toDateString(notification.createdAt) : 'Just now'}`
                          : `Sent: ${new Date(notification.sentAt || notification.createdAt).toLocaleDateString()}`
                        }
                      </span>
                      {notification.readAt && (
                        <span className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-success" />
                          Read {new Date(notification.readAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {notification._type === "lease" && notification.leaseAgreementId && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewLease(notification)}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          View Lease
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadLease(notification)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                        {notification.type === "lease_completed" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSendInvoice(notification)}
                          >
                            <Send className="h-4 w-4 mr-2" />
                            Send Invoice
                          </Button>
                        )}
                      </>
                    )}
                    {notification.propertyId && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewProperty(notification)}
                      >
                        <Home className="h-4 w-4 mr-2" />
                        View Property
                      </Button>
                    )}
                    {notification._type === "sent" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteNotice(notification.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (!notification.readAt) {
                          markNoticeAsRead(notification.id)
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
                  {notification._type === "application" 
                    ? notification.message 
                    : notification.message
                  }
                </p>
              </CardContent>
            </Card>
          ))}

          {filteredNotifications.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {activeTab === "unread"
                  ? "No unread notifications"
                  : activeTab === "sent"
                    ? "No notices sent"
                    : activeTab === "lease"
                      ? "No lease notices"
                      : activeTab === "applications"
                        ? "No application notifications"
                        : "No notifications found"}
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* PDF Viewer Dialog */}
      <PDFViewer
        isOpen={isPdfViewerOpen}
        onClose={() => {
          setIsPdfViewerOpen(false);
          setSelectedNotice(null);
        }}
        pdfUrl={selectedPdfUrl}
        title={selectedPdfTitle}
        isFilling={false}
        isLandlordView={true}
        selectedNotice={selectedNotice}
        onDownload={() => selectedNotice && handleDownloadLease(selectedNotice)}
        onSendInvoice={() => selectedNotice && handleSendInvoice(selectedNotice)}
      />

      {/* Property Details Dialog */}
      {propertyDetails && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold">
                  {propertyDetails.address?.street}
                  {propertyDetails.address?.unit && `, Unit ${propertyDetails.address.unit}`}
                  <br />
                  {propertyDetails.address?.city}, {propertyDetails.address?.state} {propertyDetails.address?.postalCode}
                </h1>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className="capitalize">{propertyDetails.type}</Badge>
                  <Badge variant={propertyDetails.status === "available" ? "default" : "secondary"}>
                    {propertyDetails.status === "available"
                      ? "Available"
                      : propertyDetails.status === "occupied"
                        ? "Occupied"
                        : "Maintenance"}
                  </Badge>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPropertyDetails(null)}
              >
                ×
              </Button>
            </div>

            <div className="space-y-6">
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
                        <p className="font-medium capitalize">{propertyDetails.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🛏️</span>
                      <div>
                        <p className="text-sm text-muted-foreground">Bedrooms</p>
                        <p className="font-medium">{propertyDetails.bedrooms}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🚿</span>
                      <div>
                        <p className="text-sm text-muted-foreground">Bathrooms</p>
                        <p className="font-medium">{propertyDetails.bathrooms}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">📏</span>
                      <div>
                        <p className="text-sm text-muted-foreground">Square Feet</p>
                        <p className="font-medium">{propertyDetails.squareFeet || "N/A"}</p>
                      </div>
                    </div>
                  </div>

                  {propertyDetails.description && (
                    <div className="mt-4">
                      <h4 className="font-medium mb-2">Description</h4>
                      <p className="text-sm text-muted-foreground">{propertyDetails.description}</p>
                    </div>
                  )}

                  {propertyDetails.amenities && propertyDetails.amenities.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium mb-2">Amenities</h4>
                      <div className="flex flex-wrap gap-2">
                        {propertyDetails.amenities.map((amenity: string, index: number) => (
                          <Badge key={index} variant="outline">{amenity}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Rent & Fees</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Monthly Rent</h4>
                      <p className="text-2xl font-bold text-primary">
                        ${propertyDetails.monthlyRent?.toLocaleString() || "N/A"}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Security Deposit</h4>
                      <p className="text-lg font-semibold">
                        ${propertyDetails.securityDeposit?.toLocaleString() || "N/A"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Form Dialog */}
      {selectedInvoiceNotice && (
        <InvoiceForm
          isOpen={isInvoiceFormOpen}
          onClose={() => {
            setIsInvoiceFormOpen(false);
            setSelectedInvoiceNotice(null);
          }}
          notice={selectedInvoiceNotice}
          onSubmit={handleInvoiceSubmit}
        />
      )}
    </div>
  )
} 