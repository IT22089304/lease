"use client"

import { useState, useEffect } from "react"
import { Eye, Calendar, AlertTriangle, CheckCircle, FileText, Home, Download, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PDFViewer } from "@/components/ui/pdf-viewer"
import { InvoiceForm } from "@/components/notices/invoice-form"
import { useAuth } from "@/lib/auth"
import type { Notice } from "@/types"
import { noticeService } from "@/lib/services/notice-service"
import { propertyService } from "@/lib/services/property-service"
import type { Property } from "@/types"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { toast } from "sonner"

export default function LeaseNoticesPage() {
  const { user } = useAuth()
  const [notices, setNotices] = useState<Notice[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [filter, setFilter] = useState<"all" | "unread" | "completed">("all")
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
      const leaseNotices = await noticeService.getLandlordLeaseNotices(user.id)
      setNotices(leaseNotices)
      const props = await propertyService.getLandlordProperties(user.id)
      setProperties(props)
    }
    fetchData()
  }, [user])

  const getNoticeTypeLabel = (type: Notice["type"]) => {
    const labels: Record<string, string> = {
      lease_received: "Lease Agreement Received",
      lease_completed: "Lease Agreement Signed by Renter",
    }
    return labels[type] || type
  }

  const getNoticeTypeBadge = (type: Notice["type"]) => {
    const variants: Record<string, string> = {
      lease_received: "default",
      lease_completed: "default",
    }
    return variants[type] || "outline"
  }

  const getUrgencyLevel = (type: Notice["type"]) => {
    const urgentTypes = ["lease_completed"]
    return urgentTypes.includes(type) ? "high" : "normal"
  }

  const markNoticeAsRead = async (noticeId: string) => {
    setNotices((prev) => prev.map((notice) => (notice.id === noticeId ? { ...notice, readAt: new Date() } : notice)))
    await noticeService.markAsRead(noticeId);
  }

  const handleViewLease = async (notice: Notice) => {
    if (notice.leaseAgreementId) {
      try {
        // Fetch the lease agreement document to get the PDF URL
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
            
            // Mark notice as read
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
            // Create a temporary link to download the PDF
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

    // Open the invoice form
    setSelectedInvoiceNotice(notice);
    setIsInvoiceFormOpen(true);
  };

  const handleInvoiceSubmit = async (invoiceData: any) => {
    try {
      // Here you would integrate with your invoice service
      // For now, we'll show a success message and log the invoice data
      console.log("Invoice data:", invoiceData);
      
      // You could also create an invoice record in the database
      // await invoiceService.createInvoice(invoiceData);
      
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

  // Helper to get property address from ID
  const getPropertyAddress = (propertyId: string) => {
    const property = properties.find((p) => p.id === propertyId)
    if (!property) return propertyId
    const addr = property.address
    return `${addr.street}${addr.unit ? ", Unit " + addr.unit : ""}, ${addr.city}, ${addr.state}`
  }

  const filteredNotices = notices.filter((notice) => {
    switch (filter) {
      case "unread":
        return !notice.readAt
      case "completed":
        return notice.type === "lease_completed"
      default:
        return true
    }
  })

  const unreadCount = notices.filter((n) => !n.readAt).length
  const completedCount = notices.filter((n) => n.type === "lease_completed").length

  if (!user || user.role !== "landlord") {
    return <div>Access denied. Landlord access required.</div>
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary">Lease Notices</h1>
        <p className="text-muted-foreground">View lease-related notices and completed agreements</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Total Lease Notices</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{notices.length}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        <Card className="p-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Unread Notices</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-destructive">{unreadCount}</div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>
        <Card className="p-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Completed Leases</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-success">{completedCount}</div>
            <p className="text-xs text-muted-foreground">Ready for review</p>
          </CardContent>
        </Card>
      </div>

      {/* Notices List */}
      <Tabs value={filter} onValueChange={(value) => setFilter(value as any)}>
        <TabsList>
          <TabsTrigger value="all">All Notices ({notices.length})</TabsTrigger>
          <TabsTrigger value="unread">Unread ({unreadCount})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedCount})</TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="space-y-4 mt-6">
          {filteredNotices.map((notice) => (
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
                      <span>Sent: {new Date(notice.sentAt).toLocaleDateString()}</span>
                      {notice.readAt && (
                        <span className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-success" />
                          Read {new Date(notice.readAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {notice.leaseAgreementId && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewLease(notice)}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          View Lease
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadLease(notice)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                        {notice.type === "lease_completed" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSendInvoice(notice)}
                          >
                            <Send className="h-4 w-4 mr-2" />
                            Send Invoice
                          </Button>
                        )}
                      </>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewProperty(notice)}
                    >
                      <Home className="h-4 w-4 mr-2" />
                      View Property
                    </Button>
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

          {filteredNotices.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {filter === "unread"
                  ? "No unread lease notices"
                  : filter === "completed"
                    ? "No completed leases"
                    : "No lease notices found"}
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
              {/* Property Details */}
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

              {/* Rent & Fees */}
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