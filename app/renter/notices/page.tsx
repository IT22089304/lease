"use client"

import { useState, useEffect } from "react"
import { Eye, Calendar, AlertTriangle, CheckCircle, FileText, Home, Bed, Bath, Square } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { NoticeViewer } from "@/components/renter/notice-viewer"
import { PDFViewer } from "@/components/ui/pdf-viewer"
import { useAuth } from "@/lib/auth"
import type { Notice } from "@/types"
import { invitationService } from "@/lib/services/invitation-service"
import { useRouter } from "next/navigation"
import { noticeService } from "@/lib/services/notice-service"
import { leaseService } from "@/lib/services/lease-service"
import type { Lease } from "@/types"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

export default function RenterNoticesPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [notices, setNotices] = useState<Notice[]>([])
  const [invitations, setInvitations] = useState<any[]>([])
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null)
  const [filter, setFilter] = useState<"all" | "unread" | "urgent">("all")
  const [leases, setLeases] = useState<Lease[]>([]);
  const [propertyAddress, setPropertyAddress] = useState<string>("");
  const [landlordName, setLandlordName] = useState<string>("");
  const [isPdfViewerOpen, setIsPdfViewerOpen] = useState(false);
  const [selectedPdfUrl, setSelectedPdfUrl] = useState("");
  const [selectedPdfTitle, setSelectedPdfTitle] = useState("");
  const [propertyDetails, setPropertyDetails] = useState<any>(null);

  useEffect(() => {
    if (!user || !user.email || !user.id) return;
    const fetchData = async () => {
      if (!user?.email) return;
      const realNotices = await noticeService.getRenterNotices(user.email)
      setNotices(realNotices)
      const invs = await invitationService.getInvitationsForEmail(user.email)
      setInvitations(invs)
    }
    fetchData()
  }, [user])

  useEffect(() => {
    if (!user || !user.email) return;
    leaseService.getRenterLeases(user.email).then(setLeases);
  }, [user?.email]);

  useEffect(() => {
    async function fetchDetails() {
      if (selectedNotice) {
        // Fetch property address
        if (selectedNotice.propertyId) {
          const propRef = doc(db, "properties", selectedNotice.propertyId);
          const propSnap = await getDoc(propRef);
          if (propSnap.exists()) {
            const addr = propSnap.data().address;
            setPropertyAddress(`${addr.street}${addr.unit ? ", Unit " + addr.unit : ""}, ${addr.city}, ${addr.state}`);
          } else {
            setPropertyAddress(selectedNotice.propertyId);
          }
        }
        // Fetch landlord name
        if (selectedNotice.landlordId) {
          const userRef = doc(db, "users", selectedNotice.landlordId);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            setLandlordName(userSnap.data().name || "Landlord");
          } else {
            setLandlordName("Landlord");
          }
        }
      }
    }
    fetchDetails();
  }, [selectedNotice]);

  const getNoticeTypeLabel = (type: Notice["type"]) => {
    const labels = {
      eviction: "Eviction Notice",
      late_rent: "Late Rent Payment",
      rent_increase: "Rent Increase",
      noise_complaint: "Noise Complaint",
      cleanliness: "Cleanliness Issues",
      lease_violation: "Lease Violation",
      inspection: "Property Inspection",
      maintenance: "Maintenance Notice",
      parking_violation: "Parking Violation",
      pet_violation: "Pet Policy Violation",
      utility_shutdown: "Utility Shutdown",
      custom: "Notice",
      lease_received: "Lease Agreement Received",
    }
    return labels[type] || type
  }

  const getNoticeTypeBadge = (type: Notice["type"]) => {
    const variants = {
      eviction: "destructive",
      late_rent: "destructive",
      rent_increase: "default",
      noise_complaint: "secondary",
      cleanliness: "secondary",
      lease_violation: "destructive",
      inspection: "default",
      maintenance: "default",
      parking_violation: "secondary",
      pet_violation: "secondary",
      utility_shutdown: "destructive",
      custom: "outline",
      lease_received: "default",
    }
    return variants[type] || "outline"
  }

  const getUrgencyLevel = (type: Notice["type"]) => {
    const urgentTypes = ["eviction", "late_rent", "lease_violation", "utility_shutdown"]
    return urgentTypes.includes(type) ? "high" : "normal"
  }

  const markNoticeAsRead = async (noticeId: string) => {
    setNotices((prev) => prev.map((notice) => (notice.id === noticeId ? { ...notice, readAt: new Date() } : notice)))
    await noticeService.markAsRead(noticeId);
  }

  const handleAcceptLeaseFromNotice = async (notice: Notice) => {
    // Find the lease for this property and renter
    // (Assume only one active lease per property/renter)
    if (!user || !user.email) return;
    const leases = await leaseService.getRenterLeases(user.email)
    const lease = leases.find(l => l.propertyId === notice.propertyId)
    if (!lease) return;
    await leaseService.updateLease(lease.id, {
      signatureStatus: {
        ...lease.signatureStatus,
        renterSigned: true,
        renterSignedAt: new Date(),
      },
      status: "active",
    });
    window.location.reload();
  }

  const getLeaseAcceptanceStatus = (notice: Notice) => {
    const lease = leases.find(l => l.propertyId === notice.propertyId);
    return lease && lease.signatureStatus.renterSigned;
  };

  const handleViewLease = async (notice: Notice) => {
    if (notice.type === "lease_received" && notice.leaseAgreementId) {
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

  // Combine notices and invitations for display
  const allItems = [
    ...notices.map((n) => ({ ...n, _type: "notice" })),
    ...invitations.map((i) => ({ ...i, _type: "invitation" })),
  ]
  const filteredItems = allItems.filter((item) => {
    if (item._type === "notice") {
      switch (filter) {
        case "unread":
          return !item.readAt
        case "urgent":
          return getUrgencyLevel(item.type) === "high"
        default:
          return true
      }
    }
    // Invitations are always shown in 'all', never in 'urgent' or 'unread'
    return filter === "all"
  })

  const unreadCount = notices.filter((n) => !n.readAt).length
  const urgentCount = notices.filter((n) => getUrgencyLevel(n.type) === "high").length
  const invitationCount = invitations.length

  if (!user || user.role !== "renter") {
    return <div>Access denied. Renter access required.</div>
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary">Notices</h1>
        <p className="text-muted-foreground">View and manage notices from your landlord</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Total Notices</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{notices.length}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        <Card className="p-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Invitations</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-primary">{invitationCount}</div>
            <p className="text-xs text-muted-foreground">Received</p>
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
            <CardTitle className="text-xs font-medium">Urgent Notices</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-warning">{urgentCount}</div>
            <p className="text-xs text-muted-foreground">High priority</p>
          </CardContent>
        </Card>
      </div>

      {/* Notices List */}
      <Tabs value={filter} onValueChange={(value) => setFilter(value as any)}>
        <TabsList>
          <TabsTrigger value="all">All Notices ({notices.length})</TabsTrigger>
          <TabsTrigger value="unread">Unread ({unreadCount})</TabsTrigger>
          <TabsTrigger value="urgent">Urgent ({urgentCount})</TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="space-y-4 mt-6">
          {filteredItems.map((item) => (
            <Card key={item.id} className={item._type === "notice" && !item.readAt ? "border-destructive/50" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">
                        {item._type === "notice" ? item.subject : `Invitation to apply for a property`}
                      </CardTitle>
                      {item._type === "notice" && !item.readAt && (
                        <Badge variant="destructive" className="text-xs">New</Badge>
                      )}
                      {item._type === "notice" && getUrgencyLevel(item.type) === "high" && (
                        <Badge variant="destructive" className="text-xs">Urgent</Badge>
                      )}
                      {item._type === "invitation" && (
                        <Badge variant="outline" className="text-xs">Invitation</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {item._type === "notice" ? (
                        <>
                          <Badge variant={getNoticeTypeBadge(item.type) as any}>{getNoticeTypeLabel(item.type)}</Badge>
                          <span>Sent: {new Date(item.sentAt).toLocaleDateString()}</span>
                          {item.readAt && (
                            <span className="flex items-center gap-1">
                              <CheckCircle className="h-3 w-3 text-success" />
                              Read {new Date(item.readAt).toLocaleDateString()}
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          <span>Invited: {item.invitedAt ? new Date(item.invitedAt).toLocaleDateString() : ""}</span>
                          <span>Status: {item.status}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {item._type === "notice" ? (
                    <div className="flex gap-2">
                      {item.type === "lease_received" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewLease(item)}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          View Lease
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewProperty(item)}
                      >
                        <Home className="h-4 w-4 mr-2" />
                        View Property
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedNotice(item)
                          if (!item.readAt) {
                            markNoticeAsRead(item.id)
                          }
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/renter/invitations/${item.id}`)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Invitation
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                 <p className="text-sm text-muted-foreground line-clamp-2">
                   {item._type === "notice"
                     ? item.message
                     : item.message || "You are invited to take a look at the property."}
                 </p>
              </CardContent>
            </Card>
          ))}

          {filteredItems.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {filter === "unread"
                  ? "No unread notices"
                  : filter === "urgent"
                    ? "No urgent notices"
                    : "No notices or invitations found"}
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Notice Viewer Dialog */}
      {selectedNotice && (
        <NoticeViewer
          notice={selectedNotice}
          isOpen={!!selectedNotice}
          onClose={() => setSelectedNotice(null)}
        />
      )}

      {/* PDF Viewer Dialog */}
      <PDFViewer
        isOpen={isPdfViewerOpen}
        onClose={() => setIsPdfViewerOpen(false)}
        pdfUrl={selectedPdfUrl}
        title={selectedPdfTitle}
        isFilling={true}
        receiverEmail={user?.email || ""}
        onReceiverEmailChange={() => {}}
        propertyId=""
        landlordId=""
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
              {/* Property Images */}
              <Card>
                <CardHeader>
                  <CardTitle>Property Images</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {propertyDetails.images?.map((image: string, index: number) => (
                      <div key={index} className="aspect-video relative rounded-lg overflow-hidden bg-muted">
                        <img
                          src={image || "/placeholder.svg"}
                          alt={`Property ${index + 1}`}
                          className="object-cover w-full h-full"
                        />
                      </div>
                    ))}
                    {(!propertyDetails.images || propertyDetails.images.length === 0) && (
                      <div className="aspect-video bg-muted rounded-md flex items-center justify-center">
                        <p className="text-muted-foreground">No images available</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

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
                      <Bed className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Bedrooms</p>
                        <p className="font-medium">{propertyDetails.bedrooms}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Bath className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Bathrooms</p>
                        <p className="font-medium">{propertyDetails.bathrooms}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Square className="h-5 w-5 text-muted-foreground" />
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

                  {(propertyDetails.applicationFee || propertyDetails.petDeposit || propertyDetails.utilitiesIncluded) && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      {propertyDetails.applicationFee && (
                        <div>
                          <h4 className="font-medium mb-1">Application Fee</h4>
                          <p className="text-sm text-muted-foreground">
                            ${propertyDetails.applicationFee.toLocaleString()}
                          </p>
                        </div>
                      )}
                      {propertyDetails.petDeposit && (
                        <div>
                          <h4 className="font-medium mb-1">Pet Deposit</h4>
                          <p className="text-sm text-muted-foreground">
                            ${propertyDetails.petDeposit.toLocaleString()}
                          </p>
                        </div>
                      )}
                      {propertyDetails.utilitiesIncluded && (
                        <div>
                          <h4 className="font-medium mb-1">Utilities</h4>
                          <p className="text-sm text-muted-foreground">
                            {propertyDetails.utilitiesIncluded}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {propertyDetails.additionalFees && propertyDetails.additionalFees.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium mb-2">Additional Fees</h4>
                      <div className="space-y-2">
                        {propertyDetails.additionalFees.map((fee: any, index: number) => (
                          <div key={index} className="flex justify-between items-center">
                            <span className="text-sm">{fee.name}</span>
                            <span className="text-sm font-medium">${fee.amount.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Lease Terms */}
              <Card>
                <CardHeader>
                  <CardTitle>Lease Terms</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-1">Lease Duration</h4>
                      <p className="text-sm text-muted-foreground">
                        {propertyDetails.leaseTerm || "12 months"}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Move-in Date</h4>
                      <p className="text-sm text-muted-foreground">
                        {propertyDetails.availableDate ? new Date(propertyDetails.availableDate).toLocaleDateString() : "Flexible"}
                      </p>
                    </div>
                  </div>

                  {propertyDetails.petPolicy && (
                    <div>
                      <h4 className="font-medium mb-1">Pet Policy</h4>
                      <div className="text-sm text-muted-foreground space-y-1">
                        {typeof propertyDetails.petPolicy === 'string' ? (
                          <p>{propertyDetails.petPolicy}</p>
                        ) : (
                          <div>
                            {propertyDetails.petPolicy.allowed && (
                              <p><strong>Allowed:</strong> {propertyDetails.petPolicy.allowed ? 'Yes' : 'No'}</p>
                            )}
                            {propertyDetails.petPolicy.maxPets && (
                              <p><strong>Max Pets:</strong> {propertyDetails.petPolicy.maxPets}</p>
                            )}
                            {propertyDetails.petPolicy.fee && (
                              <p><strong>Pet Fee:</strong> ${propertyDetails.petPolicy.fee.toLocaleString()}</p>
                            )}
                            {propertyDetails.petPolicy.restrictions && (
                              <p><strong>Restrictions:</strong> {propertyDetails.petPolicy.restrictions}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {propertyDetails.parking && (
                    <div>
                      <h4 className="font-medium mb-1">Parking</h4>
                      <p className="text-sm text-muted-foreground">{propertyDetails.parking}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
