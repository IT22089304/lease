"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Eye, 
  Trash2, 
  Bell,
  Building,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  Calendar
} from "lucide-react"
import type { Notice } from "@/types"

interface NoticeCardProps {
  notice: Notice
  onView: (notice: Notice) => void
  onDelete: (noticeId: string) => void
  showActions?: boolean
}

export function NoticeCard({ notice, onView, onDelete, showActions = true }: NoticeCardProps) {
  const getNoticeTypeLabel = (type: Notice["type"]) => {
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
      lease_received: "Lease Agreement Received",
      invoice_sent: "Invoice Sent",
      payment_successful: "Payment Successful"
    }
    return labels[type] || type
  }

  const getNoticeTypeBadge = (type: Notice["type"]) => {
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
      lease_received: "bg-green-100 text-green-700",
      invoice_sent: "bg-blue-100 text-blue-700",
      payment_successful: "bg-green-100 text-green-700"
    }
    return badgeStyles[type] || "bg-gray-100 text-gray-700"
  }

  const getNoticeIcon = (type: Notice["type"]) => {
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
      lease_received: <FileText className="h-4 w-4" />,
      invoice_sent: <FileText className="h-4 w-4" />,
      payment_successful: <CheckCircle className="h-4 w-4" />
    }
    return icons[type] || <Bell className="h-4 w-4" />
  }

  return (
    <Card 
      className={`transition-all hover:shadow-md cursor-pointer ${
        !notice.readAt ? 'border-l-4 border-l-blue-500 bg-blue-50/50' : ''
      }`}
      onClick={() => onView(notice)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className="flex-shrink-0">
              {getNoticeIcon(notice.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-sm font-semibold truncate">
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
              <p className="text-muted-foreground text-sm line-clamp-2 mb-2">
                {notice.message}
              </p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {new Date(notice.sentAt).toLocaleDateString()}
                  </span>
                </div>
                {notice.readAt && (
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    <span>Read</span>
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
          {showActions && (
            <div className="flex items-center gap-1 ml-2">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onView(notice)
                }}
              >
                <Eye className="h-3 w-3 mr-1" />
                View
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(notice.id)
                }}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 