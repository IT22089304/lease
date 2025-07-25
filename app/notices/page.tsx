"use client"

import { useState, useEffect } from "react"
import { Plus, Eye, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { NoticeForm } from "@/components/notices/notice-form"
import { useAuth } from "@/lib/auth"
import type { Notice } from "@/types"
import { noticeService } from "@/lib/services/notice-service"
import { propertyService } from "@/lib/services/property-service"
import type { Property } from "@/types"

export default function NoticesPage() {
  const { user } = useAuth()
  const [notices, setNotices] = useState<Notice[]>([])
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [properties, setProperties] = useState<Property[]>([])

  useEffect(() => {
    if (!user || !user.id) return;
    async function fetchData() {
      const realNotices = await noticeService.getLandlordNotices(user.id)
      setNotices(realNotices)
      const props = await propertyService.getLandlordProperties(user.id)
      setProperties(props)
    }
    fetchData()
  }, [user])

  const handleSendNotice = async (noticeData: Partial<Notice>) => {
    if (!user || !user.id) return;
    // Compose notice object
    const newNotice = {
      ...noticeData,
      landlordId: user.id,
    } as Omit<Notice, "id" | "sentAt" | "readAt">;
    await noticeService.createNotice(newNotice)
    // Refresh notices
    const realNotices = await noticeService.getLandlordNotices(user.id)
    setNotices(realNotices)
    setIsFormOpen(false)
  }

  const deleteNotice = (noticeId: string) => {
    setNotices((prev) => prev.filter((n) => n.id !== noticeId))
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
    }
    return variants[type] || "outline"
  }

  // Helper to get property address from ID
  const getPropertyAddress = (propertyId: string) => {
    const property = properties.find((p) => p.id === propertyId)
    if (!property) return propertyId
    const addr = property.address
    return `${addr.street}${addr.unit ? ", Unit " + addr.unit : ""}, ${addr.city}, ${addr.state}`
  }

  if (!user || user.role !== "landlord") {
    return <div>Access denied. Landlord access required.</div>
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Notices</h1>
          <p className="text-muted-foreground">Send notices and communications to tenants</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Send Notice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl w-full">
            <DialogHeader>
              <DialogTitle>Send Notice to Tenant</DialogTitle>
            </DialogHeader>
            <NoticeForm onSend={handleSendNotice} onCancel={() => setIsFormOpen(false)} properties={properties} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {notices.map((notice) => (
          <Card key={notice.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">{notice.subject}</CardTitle>
                    <Badge variant={getNoticeTypeBadge(notice.type) as any}>{getNoticeTypeLabel(notice.type)}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Property: {getPropertyAddress(notice.propertyId)}</span>
                    <span>Tenant: {notice.renterId}</span>
                    <span>Sent: {notice.sentAt.toLocaleDateString()}</span>
                    {notice.readAt && (
                      <Badge variant="outline" className="text-xs">
                        Read {notice.readAt.toLocaleDateString()}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteNotice(notice.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-3">{notice.message}</p>
              {notice.attachments && notice.attachments.length > 0 && (
                <div className="mt-3">
                  <span className="text-xs text-muted-foreground">{notice.attachments.length} attachment(s)</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {notices.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No notices sent yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}
