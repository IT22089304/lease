"use client"

import { Bell, LogOut, Settings, User, Home, CreditCard, FileText, Send, Eye, CheckCircle, Mail, Receipt } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth"
import { useState, useEffect } from "react"
import { noticeService } from "@/lib/services/notice-service"
import { invitationService } from "@/lib/services/invitation-service"
import { notificationService } from "@/lib/services/notification-service"
import type { Notice } from "@/types"
import type { Notification } from "@/lib/services/notification-service"

export function Header() {
  const { user, logout } = useAuth()
  const [notices, setNotices] = useState<Notice[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [invitations, setInvitations] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!user) return;
    
    const fetchNotifications = async () => {
      try {
        if (user.role === "landlord") {
          // Fetch landlord notifications
          const landlordNotifications = await notificationService.getLandlordNotifications(user.id);
          setNotifications(landlordNotifications);
          setUnreadCount(landlordNotifications.filter(n => !n.readAt).length);
        } else if (user.role === "renter" && user.email) {
          // Fetch renter notifications, notices and invitations
          const [renterNotifications, realNotices, realInvitations] = await Promise.all([
            notificationService.getRenterNotifications(user.email),
            noticeService.getRenterNotices(user.email),
            invitationService.getInvitationsForEmail(user.email),
          ]);
          
          console.log("[Header] Renter notifications:", renterNotifications.length);
          console.log("[Header] Renter notices:", realNotices.length);
          console.log("[Header] Renter invitations:", realInvitations.length);
          console.log("[Header] Sample notices:", realNotices.slice(0, 2).map(n => ({
            id: n.id,
            subject: n.subject,
            sentAt: n.sentAt,
            readAt: n.readAt
          })));
          
          setNotifications(renterNotifications);
          setNotices(realNotices);
          setInvitations(realInvitations);
          
          // Calculate unread count (notifications + notices + invitations)
          const unreadNotifications = renterNotifications.filter(n => !n.readAt).length;
          const unreadNotices = realNotices.filter(n => !n.readAt).length;
          const unreadInvitations = realInvitations.filter((i: any) => i.status === 'pending').length;
          setUnreadCount(unreadNotifications + unreadNotices + unreadInvitations);
          
          console.log("[Header] Unread counts:", {
            notifications: unreadNotifications,
            notices: unreadNotices,
            invitations: unreadInvitations,
            total: unreadNotifications + unreadNotices + unreadInvitations
          });
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };

    fetchNotifications();
  }, [user]);

  if (!user) return null

  const getRoleSpecificNavigation = () => {
    switch (user.role) {
      case "landlord":
        return [
          { label: "Dashboard", href: "/dashboard", icon: Home },
          { label: "Properties", href: "/properties", icon: Home },
          { label: "Incomes", href: "/dashboard/incomes", icon: CreditCard },
        ]
      case "renter":
        return [
          { label: "Dashboard", href: "/renter/dashboard", icon: Home },
          { label: "Payments", href: "/payments", icon: CreditCard },
          { label: "Invoices", href: "/renter/invoices", icon: Receipt },
          { label: "Notices", href: "/renter/notices", icon: Bell },
          { label: "Invitations", href: "/renter/invitations", icon: Mail },
          { label: "Profile", href: "/renter/profile", icon: User },
        ]
      case "admin":
        return [{ label: "Admin Panel", href: "/admin", icon: Settings }]
      default:
        return []
    }
  }

  const navigation = getRoleSpecificNavigation()

  const handleNotificationClick = async (item: Notice | Notification | any) => {
    try {
      // Mark as read if not already read
      if ('readAt' in item && !item.readAt) {
        if (user.role === "landlord") {
          await notificationService.markAsRead(item.id);
          setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, readAt: new Date() } : n));
        } else {
          // For renters, handle different types
          if (item._type === "notification") {
            await notificationService.markAsRead(item.id);
            setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, readAt: new Date() } : n));
          } else if (item._type === "notice") {
            await noticeService.markAsRead(item.id);
            setNotices(prev => prev.map(n => n.id === item.id ? { ...n, readAt: new Date() } : n));
          }
        }
        setUnreadCount(prev => Math.max(0, prev - 1));
      }

      // Navigate based on notification type and user role
      if (user.role === "landlord") {
        // For landlords, use the navigation data from the notification
        if ('navigation' in item && item.navigation) {
          const nav = item.navigation;
          let url = nav.path;
          
          // Add query parameters if they exist
          if (nav.params) {
            const params = new URLSearchParams();
            Object.entries(nav.params).forEach(([key, value]) => {
              if (value) params.append(key, value.toString());
            });
            if (params.toString()) {
              url += `?${params.toString()}`;
            }
          }
          
          window.location.href = url;
        } else {
          // Fallback to notifications page
          window.location.href = "/dashboard/notifications";
        }
      } else {
        // For renters, navigate based on notification type
        if (item._type === "invitation") {
          window.location.href = `/renter/applications/new?invitationId=${item.id}`;
        } else if (item._type === "notice") {
          window.location.href = "/renter/notices";
        } else if ('navigation' in item && item.navigation) {
          // Handle notifications with navigation data
          const nav = item.navigation;
          let url = nav.path;
          
          // Add query parameters if they exist
          if (nav.params) {
            const params = new URLSearchParams();
            Object.entries(nav.params).forEach(([key, value]) => {
              if (value) params.append(key, value.toString());
            });
            if (params.toString()) {
              url += `?${params.toString()}`;
            }
          }
          
          window.location.href = url;
        } else {
          // Fallback to notifications page
          window.location.href = "/renter/notifications";
        }
      }
    } catch (error) {
      console.error('Error handling notification click:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      if (user.role === "landlord") {
        // Mark all landlord notifications as read
        await notificationService.markAllAsRead(user.id);
        setNotifications(prev => prev.map(n => ({ ...n, readAt: n.readAt || new Date() })));
      } else {
        // Mark all renter notifications and notices as read
        const unreadNotifications = notifications.filter(n => !n.readAt);
        const unreadNotices = notices.filter(n => !n.readAt);
        
        await Promise.all([
          ...unreadNotifications.map(notification => notificationService.markAsRead(notification.id)),
          ...unreadNotices.map(notice => noticeService.markAsRead(notice.id))
        ]);
        
        setNotifications(prev => prev.map(n => ({ ...n, readAt: n.readAt || new Date() })));
        setNotices(prev => prev.map(n => ({ ...n, readAt: n.readAt || new Date() })));
      }
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const getNoticeTypeLabel = (type: string) => {
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
    };
    return labels[type as keyof typeof labels] || "Notice";
  };

  // Combine notifications for display
  const allNotifications = user.role === "landlord" 
    ? notifications.slice(0, 5) // For landlords, show notifications
    : [
        ...notifications.map((n) => ({ ...n, _type: "notification" })),
        ...notices.map((n) => ({ ...n, _type: "notice" })),
        ...invitations.map((i) => ({ ...i, _type: "invitation" })),
      ].filter((item) => {
        // Filter out items with invalid dates
        if (item._type === "notice") {
          const isValid = item.sentAt && !isNaN(new Date(item.sentAt).getTime());
          if (!isValid) {
            console.log("[Header] Filtering out notice with invalid date:", item.id, item.sentAt);
          }
          return isValid;
        } else if (item._type === "invitation") {
          // For invitations, check both invitedAt and createdAt
          const isValid = (item.invitedAt && !isNaN(new Date(item.invitedAt).getTime())) || 
                         (item.createdAt && !isNaN(new Date(item.createdAt).getTime()));
          if (!isValid) {
            console.log("[Header] Filtering out invitation with invalid date:", item.id, { invitedAt: item.invitedAt, createdAt: item.createdAt });
          }
          return isValid;
        } else {
          // For notifications, check createdAt
          const isValid = item.createdAt && !isNaN(new Date(item.createdAt).getTime());
          if (!isValid) {
            console.log("[Header] Filtering out notification with invalid date:", item.id, item.createdAt);
          }
          return isValid;
        }
      }).filter((item) => {
        // Additional filter to remove items that would show "N/A" dates
        if (item._type === "notice") {
          return item.sentAt && !isNaN(new Date(item.sentAt).getTime());
        } else if (item._type === "invitation") {
          return (item.invitedAt && !isNaN(new Date(item.invitedAt).getTime())) || 
                 (item.createdAt && !isNaN(new Date(item.createdAt).getTime()));
        } else {
          return item.createdAt && !isNaN(new Date(item.createdAt).getTime());
        }
      }).sort((a, b) => {
        const aDate = a.sentAt || a.invitedAt || a.createdAt || new Date(0);
        const bDate = b.sentAt || b.invitedAt || b.createdAt || new Date(0);
        return new Date(bDate).getTime() - new Date(aDate).getTime();
      }).slice(0, 5); // For renters, show notifications, notices and invitations

  console.log("[Header] All notifications after filtering:", allNotifications.length);
  console.log("[Header] Sample allNotifications:", allNotifications.slice(0, 2).map(n => ({
    id: n.id,
    type: n._type,
    subject: n.subject,
    sentAt: n.sentAt,
    createdAt: n.createdAt
  })));

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1
            className="text-xl font-semibold text-primary cursor-pointer"
            onClick={() => (window.location.href = "/")}
          >
            PropertyManager
          </h1>
          <Badge variant="secondary" className="hidden sm:inline-flex">
            {user.role === "landlord" ? "Landlord" : user.role === "renter" ? "Renter" : "Admin"}
          </Badge>
        </div>

        {/* Navigation for larger screens */}
        <nav className="hidden lg:flex items-center space-x-2">
          {navigation.map((item) => (
            <Button
              key={item.href}
              variant="ghost"
              size="sm"
              onClick={() => (window.location.href = item.href)}
              className="flex items-center gap-2"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Button>
          ))}
        </nav>

        <div className="flex items-center space-x-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Notifications</span>
                  {unreadCount > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {unreadCount} new
                    </Badge>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              {allNotifications.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No notifications
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto">
                  {user.role === "landlord" ? (
                    // Landlord notifications
                    notifications.map((item) => (
                      <DropdownMenuItem
                        key={item.id}
                        onClick={() => handleNotificationClick(item)}
                        className="flex items-start gap-3 p-3 cursor-pointer hover:bg-muted/50"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium truncate">
                              {item.title}
                            </span>
                            {!item.readAt && (
                              <Badge variant="destructive" className="text-xs">New</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {item.message}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">
                              {new Date(item.createdAt).toLocaleDateString()}
                            </span>
                            {item.navigation?.action && (
                              <span className="text-xs text-blue-600">
                                {item.navigation.action.replace(/_/g, " ")}
                              </span>
                            )}
                          </div>
                        </div>
                      </DropdownMenuItem>
                    ))
                  ) : (
                    // Renter notifications
                    allNotifications.map((item) => (
                      <DropdownMenuItem
                        key={item.id}
                        onClick={() => handleNotificationClick(item)}
                        className="flex items-start gap-3 p-3 cursor-pointer hover:bg-muted/50"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium truncate">
                              {item._type === "notice" 
                                ? item.subject || getNoticeTypeLabel(item.type)
                                : "Property Invitation"
                              }
                            </span>
                            {item._type === "notice" && !item.readAt && (
                              <Badge variant="destructive" className="text-xs">New</Badge>
                            )}
                            {item._type === "invitation" && item.status === "pending" && (
                              <Badge variant="secondary" className="text-xs">Pending</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {item._type === "notice" 
                              ? item.message || "You have a new notice from your landlord."
                              : "You are invited to view a property."
                            }
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">
                              {item._type === "notice" 
                                ? (item.sentAt && !isNaN(new Date(item.sentAt).getTime()) ? new Date(item.sentAt).toLocaleDateString() : "N/A")
                                : item._type === "invitation"
                                ? (item.invitedAt && !isNaN(new Date(item.invitedAt).getTime()) ? new Date(item.invitedAt).toLocaleDateString() : 
                                   item.createdAt && !isNaN(new Date(item.createdAt).getTime()) ? new Date(item.createdAt).toLocaleDateString() : "N/A")
                                : (item.createdAt && !isNaN(new Date(item.createdAt).getTime()) ? new Date(item.createdAt).toLocaleDateString() : "N/A")
                              }
                            </span>
                            <Eye className="h-3 w-3 text-muted-foreground" />
                          </div>
                        </div>
                      </DropdownMenuItem>
                    ))
                  )}
                </div>
              )}
              
              <DropdownMenuSeparator />
              {unreadCount > 0 && (
                <DropdownMenuItem onClick={handleMarkAllAsRead}>
                  <Eye className="mr-2 h-4 w-4" />
                  <span>Mark All as Read</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => (window.location.href = user.role === "landlord" ? "/dashboard/notifications" : "/renter/notices")}>
                <FileText className="mr-2 h-4 w-4" />
                <span>View All</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/placeholder.svg?height=32&width=32" alt={user.name} />
                  <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              {/* Mobile navigation */}
              <div className="lg:hidden">
                {navigation.map((item) => (
                  <DropdownMenuItem key={item.href} onClick={() => (window.location.href = item.href)}>
                    <item.icon className="mr-2 h-4 w-4" />
                    <span>{item.label}</span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
              </div>

              <DropdownMenuItem onClick={() => (window.location.href = "/profile")}>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
