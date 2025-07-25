"use client"

import { Bell, LogOut, Settings, User, Home, CreditCard, FileText, Send } from "lucide-react"
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

export function Header() {
  const { user, logout } = useAuth()

  if (!user) return null

  const getRoleSpecificNavigation = () => {
    switch (user.role) {
      case "landlord":
        return [
          { label: "Dashboard", href: "/dashboard", icon: Home },
          { label: "Properties", href: "/properties", icon: Home },
          { label: "Invitations", href: "/invitations", icon: Send },
          { label: "Applications", href: "/applications", icon: FileText },
          { label: "Incomes", href: "/dashboard/incomes", icon: CreditCard },
          { label: "Notices", href: "/notices", icon: FileText },
        ]
      case "renter":
        return [
          { label: "Dashboard", href: "/renter/dashboard", icon: Home },
          { label: "Payments", href: "/payments", icon: CreditCard },
          { label: "Notices", href: "/renter/notices", icon: FileText },
          { label: "Profile", href: "/renter/profile", icon: User },
        ]
      case "admin":
        return [{ label: "Admin Panel", href: "/admin", icon: Settings }]
      default:
        return []
    }
  }

  const navigation = getRoleSpecificNavigation()

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
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-4 w-4" />
            <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs">3</Badge>
          </Button>

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
