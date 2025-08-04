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
  Trash2, 
  Bell,
  Calendar,
  User,
  Building,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock
} from "lucide-react"
import { useAuth } from "@/lib/auth"
import { noticeService } from "@/lib/services/notice-service"
import { propertyService } from "@/lib/services/property-service"
import { invitationService } from "@/lib/services/invitation-service"
import { toast } from "sonner"
import type { Notice } from "@/types"
import { PDFViewer } from "@/components/ui/pdf-viewer"
import { NoticeViewer } from "@/components/renter/notice-viewer"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

export default function RenterNoticesPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [notices, setNotices] = useState<Notice[]>([])
  const [filteredNotices, setFilteredNotices] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isPdfViewerOpen, setIsPdfViewerOpen] = useState(false)
  const [selectedPdfUrl, setSelectedPdfUrl] = useState("")
  const [selectedPdfTitle, setSelectedPdfTitle] = useState("")
  const [propertyDetails, setPropertyDetails] = useState<{[key: string]: { address: string, landlordName: string }}>({})
  const [loadingPropertyDetails, setLoadingPropertyDetails] = useState<{[key: string]: boolean}>({})

  // Fetch property details when a notice is selected
  useEffect(() => {
    async function fetchPropertyDetails(propertyId: string, landlordId: string) {
      if (!propertyId || !landlordId || propertyDetails[propertyId]) return

      setLoadingPropertyDetails(prev => ({ ...prev, [propertyId]: true }))

      try {
        const propertyData = await propertyService.getProperty(propertyId)

        if (propertyData) {
          setPropertyDetails(prev => ({
            ...prev,
            [propertyId]: {
              address: `${propertyData.address.street}, ${propertyData.address.city}, ${propertyData.address.state}`,
              landlordName: "Property Manager"
            }
          }))
        }
      } catch (error) {
        console.error("Error fetching property details:", error)
      } finally {
        setLoadingPropertyDetails(prev => ({ ...prev, [propertyId]: false }))
      }
    }

    if (selectedNotice?.propertyId && selectedNotice?.landlordId) {
      fetchPropertyDetails(selectedNotice.propertyId, selectedNotice.landlordId)
    }
  }, [selectedNotice?.propertyId, selectedNotice?.landlordId])

  useEffect(() => {
    async function fetchNotices() {
      if (!user?.email) return

      try {
        setLoading(true)
        console.log("[NoticesPage] Fetching notices for user:", user.email)
        const noticesData = await noticeService.getRenterNotices(user.email)
        console.log("[NoticesPage] Received notices:", noticesData.length)
        console.log("[NoticesPage] Notice types:", noticesData.map(n => n.type))
        setNotices(noticesData)
        setFilteredNotices(noticesData)
      } catch (error) {
        console.error("Error fetching notices:", error)
        toast.error("Failed to load notices")
      } finally {
        setLoading(false)
      }
    }

    fetchNotices()
  }, [user?.email])

  useEffect(() => {
    let filtered = notices

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(notice =>
        notice.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        notice.message.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by status (read/unread)
    if (statusFilter !== "all") {
      filtered = filtered.filter(notice => {
        if (statusFilter === "unread") return !notice.readAt
        if (statusFilter === "read") return notice.readAt
        return true
      })
    }

    // Filter by type
    if (typeFilter !== "all") {
      filtered = filtered.filter(notice => notice.type === typeFilter)
    }

    setFilteredNotices(filtered)
  }, [notices, searchTerm, statusFilter, typeFilter])

  const handleViewNotice = async (notice: Notice) => {
    // Mark as read if not already read
    if (!notice.readAt) {
      try {
        await noticeService.markAsRead(notice.id)
        setNotices(prev => 
          prev.map(n => n.id === notice.id ? { ...n, readAt: new Date() } : n)
        )
      } catch (error) {
        console.error("Error marking notice as read:", error)
      }
    }

    // For invitation notices, redirect to invitations page with the invitation ID
    if (notice.type === "invitation_sent") {
      if (notice.invitationId) {
        router.push(`/renter/invitations?highlight=${notice.invitationId}`)
      } else {
        router.push("/renter/invitations")
      }
      return
    }

    // Set the selected notice first
    setSelectedNotice(notice)

    // For regular notices, open the notice viewer dialog
    setIsViewDialogOpen(true)
  }

  const handleViewLease = async () => {
    if (!selectedNotice?.leaseAgreementId) return

    try {
      const leaseRef = doc(db, "filledLeases", selectedNotice.leaseAgreementId)
      const leaseSnap = await getDoc(leaseRef)
      
      if (leaseSnap.exists()) {
        const leaseData = leaseSnap.data()
        const pdfUrl = leaseData.filledPdfUrl || leaseData.originalTemplateUrl
        
        if (pdfUrl) {
          setSelectedPdfUrl(pdfUrl)
          setSelectedPdfTitle(leaseData.templateName || "Lease Agreement")
          setIsPdfViewerOpen(true)
          setIsViewDialogOpen(false) // Close the notice viewer
          return
        }
      }
      toast.error("Lease agreement not found")
    } catch (error) {
      console.error("Error opening lease PDF:", error)
      toast.error("Failed to open lease agreement")
    }
  }

  const handleViewInvoice = () => {
    if (!selectedNotice?.invoiceId) return
    window.location.href = `/renter/invoices?id=${selectedNotice.invoiceId}`
  }

  const handleContactLandlord = () => {
    // You can implement this based on your communication system
    // For now, we'll just show a toast
    toast.info("Contact feature coming soon!")
  }

  const handleDownloadAttachment = (url: string) => {
    window.open(url, "_blank")
  }

  const handleDeleteNotice = async (noticeId: string) => {
    try {
      await noticeService.deleteNotice(noticeId)
      setNotices(prev => prev.filter(n => n.id !== noticeId))
      toast.success("Notice deleted successfully")
    } catch (error) {
      console.error("Error deleting notice:", error)
      toast.error("Failed to delete notice")
    }
  }

  // Test function to create a manual invitation notice
  const handleCreateTestInvitationNotice = async () => {
    if (!user?.email) return
    
    try {
      console.log("[NoticesPage] Creating test invitation notice for:", user.email)
      
      // First, let's check what notices already exist
      console.log("[NoticesPage] Checking existing notices...")
      const existingNotices = await noticeService.getRenterNotices(user.email)
      console.log("[NoticesPage] Existing notices:", existingNotices)
      
      // Create the test notice
      await noticeService.createNotice({
        landlordId: "test-landlord-id",
        propertyId: "test-property-id",
        renterId: user.email,
        renterEmail: user.email,
        type: "invitation_sent",
        subject: "Test Property Invitation",
        message: "This is a test invitation notice to verify the system is working.",
        invitationId: "test-invitation-id"
      })
      
      toast.success("Test invitation notice created!")
      
      // Refresh notices and log the results
      console.log("[NoticesPage] Refreshing notices after creation...")
      const noticesData = await noticeService.getRenterNotices(user.email)
      console.log("[NoticesPage] New notices data:", noticesData)
      setNotices(noticesData)
      setFilteredNotices(noticesData)
    } catch (error) {
      console.error("Error creating test notice:", error)
      toast.error("Failed to create test notice")
    }
  }

  const getNoticeTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      late_rent: "Late Rent Notice",
      noise_complaint: "Noise Complaint",
      inspection: "Inspection Notice",
      lease_violation: "Lease Violation",
      eviction: "Eviction Notice",
      rent_increase: "Rent Increase",
      maintenance: "Maintenance Notice",
      parking_violation: "Parking Violation",
      pet_violation: "Pet Violation",
      utility_shutdown: "Utility Shutdown",
      cleanliness: "Cleanliness Notice",
      custom: "Custom Notice",
      invitation_sent: "Property Invitation",
      lease_received: "Lease Agreement Received",
      invoice_sent: "Invoice Sent",
      payment_successful: "Payment Successful"
    }
    return labels[type] || type
  }

  const getNoticeTypeBadge = (type: string) => {
    const badgeStyles: Record<string, string> = {
      late_rent: "bg-red-100 text-red-700",
      noise_complaint: "bg-orange-100 text-orange-700",
      inspection: "bg-blue-100 text-blue-700",
      lease_violation: "bg-red-100 text-red-700",
      eviction: "bg-red-100 text-red-700",
      rent_increase: "bg-yellow-100 text-yellow-700",
      maintenance: "bg-green-100 text-green-700",
      parking_violation: "bg-orange-100 text-orange-700",
      pet_violation: "bg-orange-100 text-orange-700",
      utility_shutdown: "bg-red-100 text-red-700",
      cleanliness: "bg-yellow-100 text-yellow-700",
      custom: "bg-gray-100 text-gray-700",
      invitation_sent: "bg-blue-100 text-blue-700",
      lease_received: "bg-green-100 text-green-700",
      invoice_sent: "bg-blue-100 text-blue-700",
      payment_successful: "bg-green-100 text-green-700"
    }
    return badgeStyles[type] || "bg-gray-100 text-gray-700"
  }

  const getNoticeIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      late_rent: <AlertCircle className="h-4 w-4" />,
      noise_complaint: <AlertCircle className="h-4 w-4" />,
      inspection: <Eye className="h-4 w-4" />,
      lease_violation: <AlertCircle className="h-4 w-4" />,
      eviction: <AlertCircle className="h-4 w-4" />,
      rent_increase: <AlertCircle className="h-4 w-4" />,
      maintenance: <Building className="h-4 w-4" />,
      parking_violation: <AlertCircle className="h-4 w-4" />,
      pet_violation: <AlertCircle className="h-4 w-4" />,
      utility_shutdown: <AlertCircle className="h-4 w-4" />,
      cleanliness: <AlertCircle className="h-4 w-4" />,
      custom: <FileText className="h-4 w-4" />,
      invitation_sent: <Building className="h-4 w-4" />,
      lease_received: <FileText className="h-4 w-4" />,
      invoice_sent: <FileText className="h-4 w-4" />,
      payment_successful: <CheckCircle className="h-4 w-4" />
    }
    return icons[type] || <Bell className="h-4 w-4" />
  }

  const unreadCount = notices.filter(notice => !notice.readAt).length

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
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Notices & Notifications</h1>
            <p className="text-muted-foreground">
              View notices and notifications from your landlord
              {unreadCount > 0 && (
                <span className="ml-2 text-sm font-medium text-blue-600">
                  ({unreadCount} unread)
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleCreateTestInvitationNotice}
          >
            Create Test Invitation Notice
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search notices..."
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
            <SelectItem value="all">All Notices</SelectItem>
            <SelectItem value="unread">Unread Only</SelectItem>
            <SelectItem value="read">Read Only</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="invitation_sent">Property Invitation</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
            <SelectItem value="inspection">Inspection</SelectItem>
            <SelectItem value="lease_received">Lease Agreement</SelectItem>
            <SelectItem value="invoice_sent">Invoice</SelectItem>
            <SelectItem value="payment_successful">Payment</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Notices List */}
      <div className="space-y-4">
        {filteredNotices.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Bell className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No notices found</h3>
              <p className="text-muted-foreground text-center">
                {notices.length === 0 
                  ? "You haven't received any notices yet."
                  : "No notices match your current filters."
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredNotices.map((notice) => (
            <Card 
              key={notice.id} 
              className={`transition-all hover:shadow-md ${
                !notice.readAt ? 'border-l-4 border-l-blue-500 bg-blue-50/50' : ''
              }`}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="flex-shrink-0">
                      {getNoticeIcon(notice.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold truncate">
                          {notice.subject}
                        </h3>
                        {!notice.readAt && (
                          <Badge variant="secondary" className="text-xs">
                            New
                          </Badge>
                        )}
                        <Badge className={`text-xs ${getNoticeTypeBadge(notice.type)}`}>
                          {getNoticeTypeLabel(notice.type)}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground line-clamp-2 mb-3">
                        {notice.message}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {new Date(notice.sentAt).toLocaleDateString()}
                          </span>
                        </div>
                        {notice.readAt && (
                          <div className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            <span>Read {new Date(notice.readAt).toLocaleDateString()}</span>
                          </div>
                        )}
                        {!notice.readAt && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>Unread</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewNotice(notice)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteNotice(notice.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Notice Viewer */}
      {selectedNotice && (
        <NoticeViewer
          notice={selectedNotice}
          isOpen={isViewDialogOpen}
          onClose={() => {
            setIsViewDialogOpen(false)
            setSelectedNotice(null)
          }}
          onViewLease={handleViewLease}
          onViewInvoice={handleViewInvoice}
          onContactLandlord={handleContactLandlord}
          onDownloadAttachment={handleDownloadAttachment}
          propertyDetails={
            selectedNotice.propertyId && propertyDetails[selectedNotice.propertyId]
              ? propertyDetails[selectedNotice.propertyId]
              : {
                  address: loadingPropertyDetails[selectedNotice.propertyId] 
                    ? "Loading..." 
                    : "Property Address Not Available",
                  landlordName: loadingPropertyDetails[selectedNotice.propertyId]
                    ? "Loading..."
                    : "Property Manager"
                }
          }
        />
      )}

      {/* PDF Viewer Dialog */}
      <PDFViewer
        isOpen={isPdfViewerOpen}
        onClose={() => {
          setIsPdfViewerOpen(false)
          setSelectedPdfUrl("")
          setSelectedPdfTitle("")
          setSelectedNotice(null)
        }}
        pdfUrl={selectedPdfUrl}
        title={selectedPdfTitle}
        isFilling={true}
        isRenterSubmission={true}
        leaseAgreementId={selectedNotice?.leaseAgreementId}
        currentUserEmail={user?.email}
        propertyId={selectedNotice?.propertyId}
        landlordId={selectedNotice?.landlordId}
        onLeaseSubmitted={() => {
          setIsPdfViewerOpen(false)
          setSelectedPdfUrl("")
          setSelectedPdfTitle("")
          setSelectedNotice(null)
          // Refresh notices to show updated status
          window.location.reload()
        }}
      />
    </div>
  )
} 