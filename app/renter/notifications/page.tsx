"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Bell, FileText, DollarSign, Calendar, Eye, Check } from "lucide-react"
import { useAuth } from "@/lib/auth"
import { notificationService } from "@/lib/services/notification-service"
import type { Notification } from "@/lib/services/notification-service"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export default function RenterNotificationsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    async function fetchNotifications() {
      if (!user?.email) return
      
      try {
        setLoading(true)
        const [notificationsData, unreadCountData] = await Promise.all([
          notificationService.getRenterNotifications(user.email),
          notificationService.getRenterUnreadCount(user.email)
        ])
        setNotifications(notificationsData)
        setUnreadCount(unreadCountData)
      } catch (error) {
        console.error("Error fetching notifications:", error)
        toast.error("Failed to load notifications")
      } finally {
        setLoading(false)
      }
    }

    fetchNotifications()
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

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllRenterNotificationsAsRead(user?.email || "")
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, readAt: new Date() }))
      )
      setUnreadCount(0)
      toast.success("All notifications marked as read")
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
      toast.error("Failed to mark all notifications as read")
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

  const getNotificationBadge = (type: Notification["type"]) => {
    const variants = {
      invoice_sent: "default",
      payment_received: "default",
      lease_completed: "default",
      lease_received: "secondary",
    }
    return variants[type] || "outline"
  }

  if (!user || user.role !== "renter") {
    return <div>Access denied. Renter access required.</div>
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2">Loading notifications...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Notifications</h1>
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
            Notification Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{notifications.length}</div>
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
                 {notifications.filter(n => n.type === "lease_completed" || n.type === "lease_received").length}
               </div>
               <div className="text-sm text-muted-foreground">Leases</div>
             </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <div className="space-y-4">
        {notifications.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No notifications yet</h3>
              <p className="text-muted-foreground">
                You'll see notifications here when you receive invoices, lease updates, and other important messages.
              </p>
            </CardContent>
          </Card>
        ) : (
          notifications.map((notification) => (
            <Card 
              key={notification.id} 
              className={`cursor-pointer transition-all hover:shadow-md ${
                !notification.readAt ? 'border-blue-200 bg-blue-50' : ''
              }`}
              onClick={() => handleNotificationClick(notification)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold">{notification.title}</h4>
                        {!notification.readAt && (
                          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        )}
                        <Badge variant={getNotificationBadge(notification.type) as any}>
                          {notification.type.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>
                          {notification.createdAt ? new Date(notification.createdAt).toLocaleDateString() : 'N/A'}
                        </span>
                        {notification.data?.amount && (
                          <span className="font-medium text-green-600">
                            ${notification.data.amount.toLocaleString()}
                          </span>
                        )}
                        {notification.data?.propertyAddress && (
                          <span>{notification.data.propertyAddress}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!notification.readAt && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleMarkAsRead(notification.id)
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
                        handleNotificationClick(notification)
                      }}
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
} 