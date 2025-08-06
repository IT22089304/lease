"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Bell, FileText, DollarSign, Calendar, Eye, Check, AlertTriangle, Mail } from "lucide-react"
import { useAuth } from "@/lib/auth"
import { notificationService } from "@/lib/services/notification-service"
import { noticeService } from "@/lib/services/notice-service"
import { invitationService } from "@/lib/services/invitation-service"
import type { Notification } from "@/lib/services/notification-service"
import type { Notice } from "@/types"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export default function RenterNotificationsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [notices, setNotices] = useState<Notice[]>([])
  const [invitations, setInvitations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    async function fetchAllData() {
      if (!user?.email) return
      
      try {
        setLoading(true)
        const [notificationsData, noticesData, invitationsData, unreadCountData] = await Promise.all([
          notificationService.getRenterNotifications(user.email),
          noticeService.getRenterNotices(user.email),
          invitationService.getInvitationsForEmail(user.email),
          notificationService.getRenterUnreadCount(user.email)
        ])
        setNotifications(notificationsData)
        setNotices(noticesData)
        setInvitations(invitationsData)
        setUnreadCount(unreadCountData + noticesData.filter(n => !n.readAt).length + invitationsData.filter(i => i.status === 'pending').length)
      } catch (error) {
        console.error("Error fetching data:", error)
        toast.error("Failed to load notifications and notices")
      } finally {
        setLoading(false)
      }
    }

    fetchAllData()
  }, [user?.email])

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId)
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, readAt: new Date() }
            : notif
        )
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error("Error marking notification as read:", error)
      toast.error("Failed to mark notification as read")
    }
  }

  const handleMarkNoticeAsRead = async (noticeId: string) => {
    try {
      await noticeService.markAsRead(noticeId)
      setNotices(prev => 
        prev.map(notice => 
          notice.id === noticeId 
            ? { ...notice, readAt: new Date() }
            : notice
        )
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error("Error marking notice as read:", error)
      toast.error("Failed to mark notice as read")
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      // Mark all notifications as read
      await notificationService.markAllRenterNotificationsAsRead(user?.email || "")
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, readAt: new Date() }))
      )
      
      // Mark all notices as read
      const unreadNotices = notices.filter(n => !n.readAt)
      await Promise.all(unreadNotices.map(notice => noticeService.markAsRead(notice.id)))
      setNotices(prev => 
        prev.map(notice => ({ ...notice, readAt: new Date() }))
      )
      
      setUnreadCount(0)
      toast.success("All notifications and notices marked as read")
    } catch (error) {
      console.error("Error marking all as read:", error)
      toast.error("Failed to mark all as read")
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read first
    if (!notification.readAt) {
      handleMarkAsRead(notification.id)
    }

    // Navigate based on notification type
    if (notification.navigation?.path) {
      const params = notification.navigation.params
      let path = notification.navigation.path
      
      if (params?.invoiceId) {
        path += `?invoiceId=${params.invoiceId}`
      }
      
      router.push(path)
    }
  }

  const handleNoticeClick = (notice: Notice) => {
    // Mark as read first
    if (!notice.readAt) {
      handleMarkNoticeAsRead(notice.id)
    }

    // Navigate to notices page or handle specific notice types
    if (notice.type === "lease_received" && notice.leaseAgreementId) {
      // Handle lease notices specially
      router.push("/renter/notices")
    } else {
      router.push("/renter/notices")
    }
  }

  const handleInvitationClick = (invitation: any) => {
    // Navigate to applications page
    router.push(`/renter/applications/new?invitationId=${invitation.id}`)
  }

  const getNotificationIcon = (type: Notification["type"]) => {
    switch (type) {
      case "invoice_sent":
        return <DollarSign className="h-5 w-5 text-blue-600" />
      case "payment_received":
        return <DollarSign className="h-5 w-5 text-green-600" />
      case "lease_completed":
      case "lease_received":
        return <FileText className="h-5 w-5 text-green-600" />
      default:
        return <Bell className="h-5 w-5 text-gray-600" />
    }
  }

  const getNoticeIcon = (type: Notice["type"]) => {
    switch (type) {
      case "lease_received":
      case "lease_completed":
        return <FileText className="h-5 w-5 text-green-600" />
      case "late_rent":
      case "eviction":
        return <AlertTriangle className="h-5 w-5 text-red-600" />
      case "maintenance":
        return <Calendar className="h-5 w-5 text-orange-600" />
      default:
        return <Bell className="h-5 w-5 text-blue-600" />
    }
  }

  const getNotificationBadge = (type: Notification["type"]) => {
    const variants = {
      invoice_sent: "default",
      payment_received: "default",
      lease_completed: "default",
      lease_received: "secondary",
    }
    return variants[type] || "outline"
  }

  const getNoticeBadge = (type: Notice["type"]) => {
    const variants = {
      lease_received: "default",
      lease_completed: "default",
      late_rent: "destructive",
      eviction: "destructive",
      maintenance: "secondary",
      custom: "outline",
    }
    return variants[type] || "outline"
  }

  // Combine all items for display
  const allItems = [
    ...notifications.map(n => ({ ...n, _type: "notification" })),
    ...notices.map(n => ({ ...n, _type: "notice" })),
    ...invitations.map(i => ({ ...i, _type: "invitation" }))
  ].sort((a, b) => {
    const aDate = a.createdAt || a.sentAt || a.invitedAt || new Date(0)
    const bDate = b.createdAt || b.sentAt || b.invitedAt || new Date(0)
    return new Date(bDate).getTime() - new Date(aDate).getTime()
  })

  if (!user || user.role !== "renter") {
    return <div>Access denied. Renter access required.</div>
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2">Loading notifications and notices...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Notifications & Notices</h1>
          <p className="text-muted-foreground">Stay updated with your rental activities</p>
        </div>
        {unreadCount > 0 && (
          <Button onClick={handleMarkAllAsRead} variant="outline">
            <Check className="h-4 w-4 mr-2" />
            Mark All as Read
          </Button>
        )}
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{allItems.length}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{unreadCount}</div>
              <div className="text-sm text-muted-foreground">Unread</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {notifications.filter(n => n.type === "invoice_sent" || n.type === "payment_received").length}
              </div>
              <div className="text-sm text-muted-foreground">Payments</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {notices.filter(n => n.type === "lease_completed" || n.type === "lease_received").length}
              </div>
              <div className="text-sm text-muted-foreground">Leases</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {invitations.filter(i => i.status === "pending").length}
              </div>
              <div className="text-sm text-muted-foreground">Invitations</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items List */}
      <div className="space-y-4">
        {allItems.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No notifications or notices yet</h3>
              <p className="text-muted-foreground">
                You'll see notifications and notices here when you receive invoices, lease updates, and other important messages.
              </p>
            </CardContent>
          </Card>
        ) : (
          allItems.map((item) => {
            const isNotification = item._type === "notification"
            const isNotice = item._type === "notice"
            const isInvitation = item._type === "invitation"
            const isUnread = isNotification ? !item.readAt : isNotice ? !item.readAt : isInvitation ? item.status === "pending" : false

            return (
              <Card 
                key={item.id} 
                className={`cursor-pointer transition-all hover:shadow-md ${
                  isUnread ? 'border-blue-200 bg-blue-50' : ''
                }`}
                onClick={() => {
                  if (isNotification) handleNotificationClick(item as Notification)
                  else if (isNotice) handleNoticeClick(item as Notice)
                  else if (isInvitation) handleInvitationClick(item)
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="mt-1">
                        {isNotification && getNotificationIcon((item as Notification).type)}
                        {isNotice && getNoticeIcon((item as Notice).type)}
                        {isInvitation && <Mail className="h-5 w-5 text-purple-600" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold">
                            {isNotification && (item as Notification).title}
                            {isNotice && ((item as Notice).subject || getNoticeTypeLabel((item as Notice).type))}
                            {isInvitation && "Property Invitation"}
                          </h4>
                          {isUnread && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                          )}
                          <Badge variant={
                            isNotification ? getNotificationBadge((item as Notification).type) as any :
                            isNotice ? getNoticeBadge((item as Notice).type) as any :
                            "secondary"
                          }>
                            {isNotification && (item as Notification).type.replace('_', ' ')}
                            {isNotice && getNoticeTypeLabel((item as Notice).type)}
                            {isInvitation && "Invitation"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {isNotification && (item as Notification).message}
                          {isNotice && (item as Notice).message}
                          {isInvitation && "You are invited to view a property."}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>
                            {isNotification && (item as Notification).createdAt && new Date((item as Notification).createdAt).toLocaleDateString()}
                            {isNotice && (item as Notice).sentAt && new Date((item as Notice).sentAt).toLocaleDateString()}
                            {isInvitation && (item as any).invitedAt && new Date((item as any).invitedAt).toLocaleDateString()}
                          </span>
                          {isNotification && (item as Notification).data?.amount && (
                            <span className="font-medium text-green-600">
                              ${(item as Notification).data.amount.toLocaleString()}
                            </span>
                          )}
                          {isNotice && (item as Notice).propertyAddress && (
                            <span>{(item as Notice).propertyAddress}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isUnread && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (isNotification) handleMarkAsRead(item.id)
                            else if (isNotice) handleMarkNoticeAsRead(item.id)
                          }}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (isNotification) handleNotificationClick(item as Notification)
                          else if (isNotice) handleNoticeClick(item as Notice)
                          else if (isInvitation) handleInvitationClick(item)
                        }}
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}

// Helper function to get notice type label
function getNoticeTypeLabel(type: string) {
  const labels = {
    eviction: "Eviction",
    late_rent: "Late Rent",
    rent_increase: "Rent Increase",
    noise_complaint: "Noise Complaint",
    cleanliness: "Cleanliness",
    lease_violation: "Lease Violation",
    inspection: "Inspection",
    maintenance: "Maintenance",
    parking_violation: "Parking Violation",
    pet_violation: "Pet Violation",
    utility_shutdown: "Utility Shutdown",
    custom: "Custom",
    lease_received: "Lease Agreement",
    lease_completed: "Lease Completed",
  };
  return labels[type as keyof typeof labels] || "Notice";
} 