"use client"

import { Bell, LogOut, Settings, User, Home, CreditCard, FileText, Send, Eye, CheckCircle } from "lucide-react"
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
import type { Notice } from "@/types"

export function Header() {
  const { user, logout } = useAuth()
  const [notices, setNotices] = useState<Notice[]>([])
  const [invitations, setInvitations] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!user || !user.email) return;
    
    const fetchNotifications = async () => {
      try {
        const [realNotices, realInvitations] = await Promise.all([
          noticeService.getRenterNotices(user.email),
          invitationService.getInvitationsForEmail(user.email),
        ]);
        setNotices(realNotices);
        setInvitations(realInvitations);
        
        // Calculate unread count (notices + invitations)
        const unreadNotices = realNotices.filter(n => !n.readAt).length;
        const unreadInvitations = realInvitations.filter((i: any) => i.status === 'pending').length;
        setUnreadCount(unreadNotices + unreadInvitations);
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
          { label: "Dashboard", href: "/renter/dashboard", icon: FileText },
          { label: "Profile", href: "/renter/profile", icon: User },
        ]
      case "admin":
        return [{ label: "Admin Panel", href: "/admin", icon: Settings }]
      default:
        return []
    }
  }

  const navigation = getRoleSpecificNavigation()

  const handleNotificationClick = (item: Notice | any) => {
    // Mark as read if not already read
    if ('readAt' in item && !item.readAt) {
      noticeService.markAsRead(item.id);
      setNotices(prev => prev.map(n => n.id === item.id ? { ...n, readAt: new Date() } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    // Navigate based on notification type and user role
    if (user.role === "landlord") {
      // For landlords, navigate to the notifications page
      window.location.href = "/dashboard/notifications";
    } else {
      // For renters, navigate based on notification type
      if (item._type === "invitation") {
        window.location.href = `/renter/applications/new?invitationId=${item.id}`;
      } else if (item._type === "notice") {
        // For notices, navigate to the appropriate page based on type
        switch (item.type) {
          case "application_submitted":
          case "application_approved":
          case "application_rejected":
            window.location.href = "/dashboard";
            break;
          case "tenant_moved_in":
            window.location.href = "/properties";
            break;
          case "payment_received":
            window.location.href = "/dashboard/incomes";
            break;
          case "lease_completed":
            window.location.href = "/notifications?tab=lease";
            break;
          default:
            window.location.href = "/renter/dashboard";
        }
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      // Mark all unread notices as read
      const unreadNotices = notices.filter(n => !n.readAt);
      await Promise.all(unreadNotices.map(notice => noticeService.markAsRead(notice.id)));
      
      // Update local state
      setNotices(prev => prev.map(n => ({ ...n, readAt: n.readAt || new Date() })));
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

  // Combine notices and invitations for display (only unread notices)
  const allNotifications = [
    ...notices.filter(n => !n.readAt).map((n) => ({ ...n, _type: "notice" })),
    ...invitations.map((i) => ({ ...i, _type: "invitation" })),
  ].sort((a, b) => {
    const aDate = a.sentAt || a.invitedAt || new Date(0);
    const bDate = b.sentAt || b.invitedAt || new Date(0);
    return new Date(bDate).getTime() - new Date(aDate).getTime();
  }).slice(0, 5); // Show only the 5 most recent

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
                  {allNotifications.map((item) => (
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
                              ? new Date(item.sentAt).toLocaleDateString()
                              : new Date(item.invitedAt).toLocaleDateString()
                            }
                          </span>
                          <Eye className="h-3 w-3 text-muted-foreground" />
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </div>
              )}
              
              <DropdownMenuSeparator />
              {unreadCount > 0 && (
                <DropdownMenuItem onClick={handleMarkAllAsRead}>
                  <Eye className="mr-2 h-4 w-4" />
                  <span>Mark All as Read</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => (window.location.href = user.role === "landlord" ? "/dashboard/notifications" : "/renter/dashboard")}>
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
