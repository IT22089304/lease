"use client"

import { X, Calendar, User, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import type { Notice } from "@/types"

interface NoticeViewerProps {
  notice: Notice
  isOpen: boolean
  onClose: () => void
}

export function NoticeViewer({ notice, isOpen, onClose }: NoticeViewerProps) {
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <DialogTitle className="text-xl">{notice.subject}</DialogTitle>
              <div className="flex items-center gap-2">
                <Badge variant={getNoticeTypeBadge(notice.type) as any}>{getNoticeTypeLabel(notice.type)}</Badge>
                {getUrgencyLevel(notice.type) === "high" && (
                  <Badge variant="destructive" className="text-xs">
                    Urgent
                  </Badge>
                )}
                {!notice.readAt && (
                  <Badge variant="outline" className="text-xs">
                    New
                  </Badge>
                )}
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Notice Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Sent Date</p>
                <p className="text-sm font-medium">{new Date(notice.sentAt).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Home className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Property</p>
                <p className="text-sm font-medium">123 Main St, Unit A</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">From</p>
                <p className="text-sm font-medium">Property Manager</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Notice Content */}
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Message</h4>
              <div className="prose prose-sm max-w-none">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{notice.message}</p>
              </div>
            </div>

            {notice.attachments && notice.attachments.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Attachments</h4>
                <div className="space-y-2">
                  {notice.attachments.map((attachment, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 border rounded">
                      <span className="text-sm">{attachment}</span>
                      <Button variant="outline" size="sm">
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button onClick={onClose} className="flex-1">
              Mark as Read
            </Button>
            <Button variant="outline" onClick={() => (window.location.href = "/renter/dashboard")}>
              View All Notices
            </Button>
          </div>

          {/* Important Notice Footer */}
          {getUrgencyLevel(notice.type) === "high" && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive font-medium">
                ⚠️ This is an urgent notice that may require immediate action. Please contact your landlord if you have
                any questions.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
