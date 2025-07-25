"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/lib/auth"
import { Home, Users, Shield } from "lucide-react"

export default function LoginPage() {
  const [selectedTab, setSelectedTab] = useState("landlord")
  const [email, setEmail] = useState("landlord@test.com")
  const [password, setPassword] = useState("landlord123")
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Update email and password based on selected tab
    switch (selectedTab) {
      case "landlord":
        setEmail("landlord@test.com")
        setPassword("landlord123")
        break
      case "renter":
        setEmail("renter@test.com")
        setPassword("renter123")
        break
      case "admin":
        setEmail("admin@test.com")
        setPassword("admin123")
        break
    }
  }, [selectedTab])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await login(email, password)
      // Redirect will be handled in auth context
    } catch (error) {
      console.error("Login failed:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">PropertyManager</CardTitle>
          <CardDescription>Sign in to manage your properties or rental applications</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="landlord" className="w-full" onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="landlord" className="flex items-center gap-1 text-xs">
                <Home className="h-3 w-3" />
                Landlord
              </TabsTrigger>
              <TabsTrigger value="renter" className="flex items-center gap-1 text-xs">
                <Users className="h-3 w-3" />
                Renter
              </TabsTrigger>
              <TabsTrigger value="admin" className="flex items-center gap-1 text-xs">
                <Shield className="h-3 w-3" />
                Admin
              </TabsTrigger>
            </TabsList>

            <TabsContent value="landlord" className="space-y-4 mt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="landlord@test.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="landlord123"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in..." : "Sign in as Landlord"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="renter" className="space-y-4 mt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="renter-email">Email</Label>
                  <Input
                    id="renter-email"
                    type="email"
                    placeholder="renter@test.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="renter-password">Password</Label>
                  <Input
                    id="renter-password"
                    type="password"
                    placeholder="renter123"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in..." : "Sign in as Renter"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="admin" className="space-y-4 mt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-email">Email</Label>
                  <Input
                    id="admin-email"
                    type="email"
                    placeholder="admin@test.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-password">Password</Label>
                  <Input
                    id="admin-password"
                    type="password"
                    placeholder="admin123"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in..." : "Sign in as Admin"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-4 text-center">
            <Button variant="link" className="text-sm" onClick={() => (window.location.href = "/test-accounts")}>
              View Test Accounts
            </Button>
          </div>

          <div className="mt-6 text-center">
            <Button variant="link" className="text-sm">
              Forgot your password?
            </Button>
          </div>

          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              {"Don't have an account? "}
              <Button
                variant="link"
                className="p-0 h-auto text-sm"
                onClick={() => router.push("/signup/renter")}
              >
                Sign up as Renter
              </Button>
              {" | "}
              <Button
                variant="link"
                className="p-0 h-auto text-sm"
                onClick={() => router.push("/signup/landlord")}
              >
                Sign up as Landlord
              </Button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
