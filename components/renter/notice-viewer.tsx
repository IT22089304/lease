"use client"

import { 
  X, 
  Calendar, 
  User, 
  Home, 
  Bell,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
  ExternalLink,
  MessageCircle,
  DollarSign,
  Eye
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import type { Notice } from "@/types"

interface NoticeViewerProps {
  notice: Notice
  isOpen: boolean
  onClose: () => void
  onViewLease?: () => void
  onViewInvoice?: () => void
  onContactLandlord?: () => void
  onDownloadAttachment?: (url: string) => void
  propertyDetails?: {
    address: string
    landlordName: string
  }
}

export function NoticeViewer({ 
  notice, 
  isOpen, 
  onClose,
  onViewLease,
  onViewInvoice,
  onContactLandlord,
  onDownloadAttachment,
  propertyDetails = {
    address: "Property Address Not Available",
    landlordName: "Property Manager"
  }
}: NoticeViewerProps) {
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
      lease_completed: "Lease Agreement Completed",
      invoice_sent: "Invoice Sent",
      payment_received: "Payment Received",
      payment_successful: "Payment Successful",
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
      lease_completed: "default",
      invoice_sent: "default",
      payment_received: "default",
      payment_successful: "default",
    }
    return variants[type] || "outline"
  }

  const getUrgencyLevel = (type: Notice["type"]) => {
    const urgentTypes = ["eviction", "late_rent", "lease_violation", "utility_shutdown", "lease_received", "lease_completed"]
    return urgentTypes.includes(type) ? "high" : "normal"
  }

  const getNoticeIcon = (type: Notice["type"]) => {
    const icons = {
      eviction: <AlertCircle className="h-5 w-5 text-destructive" />,
      late_rent: <DollarSign className="h-5 w-5 text-destructive" />,
      rent_increase: <DollarSign className="h-5 w-5 text-yellow-600" />,
      noise_complaint: <AlertCircle className="h-5 w-5 text-orange-600" />,
      cleanliness: <AlertCircle className="h-5 w-5 text-yellow-600" />,
      lease_violation: <AlertCircle className="h-5 w-5 text-destructive" />,
      inspection: <Eye className="h-5 w-5 text-blue-600" />,
      maintenance: <Home className="h-5 w-5 text-green-600" />,
      parking_violation: <AlertCircle className="h-5 w-5 text-orange-600" />,
      pet_violation: <AlertCircle className="h-5 w-5 text-orange-600" />,
      utility_shutdown: <AlertCircle className="h-5 w-5 text-destructive" />,
      custom: <Bell className="h-5 w-5 text-gray-600" />,
      lease_received: <FileText className="h-5 w-5 text-blue-600" />,
      lease_completed: <CheckCircle className="h-5 w-5 text-green-600" />,
      invoice_sent: <FileText className="h-5 w-5 text-blue-600" />,
      payment_received: <DollarSign className="h-5 w-5 text-green-600" />,
      payment_successful: <CheckCircle className="h-5 w-5 text-green-600" />,
    }
    return icons[type] || <Bell className="h-5 w-5" />
  }

  const getQuickActions = () => {
    const actions = []

    // View Lease action for lease-related notices
    if ((notice.type === "lease_received" || notice.type === "lease_completed") && onViewLease) {
      actions.push(
        <Button key="view-lease" onClick={onViewLease} className="flex-1">
          <FileText className="h-4 w-4 mr-2" />
          View Lease Agreement
        </Button>
      )
    }

    // View Invoice action for invoice/payment notices
    if ((notice.type === "invoice_sent" || notice.type.includes("payment")) && onViewInvoice) {
      actions.push(
        <Button key="view-invoice" onClick={onViewInvoice} className="flex-1">
          <DollarSign className="h-4 w-4 mr-2" />
          View Invoice
        </Button>
      )
    }

    // Contact Landlord action for urgent notices
    if (getUrgencyLevel(notice.type) === "high" && onContactLandlord) {
      actions.push(
        <Button key="contact" variant="outline" onClick={onContactLandlord} className="flex-1">
          <MessageCircle className="h-4 w-4 mr-2" />
          Contact Landlord
        </Button>
      )
    }

    return actions
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              {getNoticeIcon(notice.type)}
              <div className="space-y-2">
                <DialogTitle className="text-xl">{notice.subject}</DialogTitle>
                <div className="flex items-center gap-2 flex-wrap">
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
                <p className="text-sm font-medium truncate">{propertyDetails.address}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">From</p>
                <p className="text-sm font-medium">{propertyDetails.landlordName}</p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          {getQuickActions().length > 0 && (
            <>
              <div className="flex flex-wrap gap-2">
                {getQuickActions()}
              </div>
              <Separator />
            </>
          )}

          {/* Notice Content */}
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Message</h4>
              <div className="prose prose-sm max-w-none bg-muted/30 p-4 rounded-lg">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{notice.message}</p>
              </div>
            </div>

            {notice.attachments && notice.attachments.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Attachments</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {notice.attachments.map((attachment, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-4 w-4 flex-shrink-0" />
                        <span className="text-sm truncate">{attachment}</span>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => onDownloadAttachment?.(attachment)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Status Footer */}
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {notice.readAt 
                    ? `Read ${new Date(notice.readAt).toLocaleString()}`
                    : "Unread"
                  }
                </span>
              </div>
              {notice.readAt && (
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-600">Acknowledged</span>
                </div>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>

          {/* Important Notice Footer */}
          {getUrgencyLevel(notice.type) === "high" && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-destructive">
                    This is an urgent notice that requires your attention
                  </p>
                  <p className="text-sm text-destructive/80">
                    Please review the notice carefully and take any necessary actions. If you have questions,
                    use the "Contact Landlord" button above to get in touch immediately.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
