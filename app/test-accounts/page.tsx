"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Home, User, Building2, ShieldCheck } from "lucide-react"

export default function TestAccountsPage() {
  const router = useRouter()

  const handleLogin = (role: string) => {
    // In a real app, this would authenticate the user
    localStorage.setItem("userRole", role)

    // Redirect based on role
    if (role === "landlord") {
      router.push("/dashboard")
    } else if (role === "renter") {
      router.push("/renter/dashboard")
    } else if (role === "admin") {
      router.push("/admin")
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Test Accounts</h1>
      <p className="mb-6 text-muted-foreground">Use these accounts to test different user roles in the application.</p>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Landlord
            </CardTitle>
            <CardDescription>Property owner account</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 mb-4">
              <div>
                <span className="font-medium">Email:</span> landlord@test.com
              </div>
              <div>
                <span className="font-medium">Password:</span> landlord123
              </div>
            </div>
            <Button onClick={() => handleLogin("landlord")} className="w-full">
              Login as Landlord
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Renter
            </CardTitle>
            <CardDescription>Tenant account</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 mb-4">
              <div>
                <span className="font-medium">Email:</span> renter@test.com
              </div>
              <div>
                <span className="font-medium">Password:</span> renter123
              </div>
            </div>
            <Button onClick={() => handleLogin("renter")} className="w-full">
              Login as Renter
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Admin
            </CardTitle>
            <CardDescription>System administrator</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 mb-4">
              <div>
                <span className="font-medium">Email:</span> admin@test.com
              </div>
              <div>
                <span className="font-medium">Password:</span> admin123
              </div>
            </div>
            <Button onClick={() => handleLogin("admin")} className="w-full">
              Login as Admin
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <Button variant="outline" onClick={() => router.push("/")} className="flex items-center gap-2">
          <Home className="h-4 w-4" />
          Back to Home
        </Button>
      </div>
    </div>
  )
}
