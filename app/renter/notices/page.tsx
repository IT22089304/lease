"use client"

import { useState, useEffect } from "react"
import { Eye, Calendar, AlertTriangle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { NoticeViewer } from "@/components/renter/notice-viewer"
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

  useEffect(() => {
    if (!user || !user.email || !user.id) return;
    async function fetchData() {
      const realNotices = await noticeService.getRenterNotices(user.email)
      setNotices(realNotices)
      const invs = await invitationService.getInvitationsForEmail(user.email)
      setInvitations(invs)
    }
    fetchData()
  }, [user])

  useEffect(() => {
    if (!user?.email) return;
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
    }
    return variants[type] || "outline"
  }

  const getUrgencyLevel = (type: Notice["type"]) => {
    const urgentTypes = ["eviction", "late_rent", "lease_violation", "utility_shutdown"]
    return urgentTypes.includes(type) ? "high" : "normal"
  }

  const markNoticeAsRead = (noticeId: string) => {
    setNotices((prev) => prev.map((notice) => (notice.id === noticeId ? { ...notice, readAt: new Date() } : notice)))
  }

  const handleAcceptLeaseFromNotice = async (notice: Notice) => {
    // Find the lease for this property and renter
    // (Assume only one active lease per property/renter)
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
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Notices</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{notices.length}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Invitations</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{invitationCount}</div>
            <p className="text-xs text-muted-foreground">Received</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unread Notices</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{unreadCount}</div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Urgent Notices</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{urgentCount}</div>
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
                      View
                    </Button>
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
          onAcceptLease={selectedNotice && selectedNotice.type === "lease_violation" && selectedNotice.subject?.toLowerCase().includes("lease created") ? () => handleAcceptLeaseFromNotice(selectedNotice) : undefined}
          accepted={selectedNotice && selectedNotice.type === "lease_violation" && selectedNotice.subject?.toLowerCase().includes("lease created") ? getLeaseAcceptanceStatus(selectedNotice) : undefined}
          propertyAddress={propertyAddress}
          landlordName={landlordName}
        />
      )}
    </div>
  )
}
