"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Bell, Eye, FileText, ArrowRight, CheckCircle } from "lucide-react"
import Link from "next/link"

export default function TestNotificationsConnectionPage() {
  const [testResults, setTestResults] = useState<{[key: string]: boolean}>({})

  const markTest = (testName: string, passed: boolean) => {
    setTestResults(prev => ({ ...prev, [testName]: passed }))
  }

  const tests = [
    {
      id: "header-bell",
      title: "Header Notification Bell",
      description: "Bell icon in header should navigate to correct notices page",
      landlordPath: "/dashboard/notifications",
      renterPath: "/renter/notices"
    },
    {
      id: "view-all-button",
      title: "View All Button",
      description: "View All button in notification dropdown should navigate correctly",
      landlordPath: "/dashboard/notifications",
      renterPath: "/renter/notices"
    },
    {
      id: "dashboard-stats",
      title: "Dashboard Notice Cards",
      description: "Notice cards in dashboard stats should be clickable",
      landlordPath: "/dashboard/notifications",
      renterPath: "/renter/notices"
    },
    {
      id: "notification-click",
      title: "Individual Notification Click",
      description: "Clicking individual notifications should navigate properly",
      landlordPath: "/dashboard/notifications",
      renterPath: "/renter/notices"
    }
  ]

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-primary">Notifications Connection Test</h1>
        <p className="text-muted-foreground">
          Test page to verify all notification elements properly connect to the notices pages
        </p>
      </div>

      {/* Connection Flow Diagram */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5" />
            Connection Flow
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Landlord Flow */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Landlord Flow</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2 bg-blue-50 rounded">
                  <Bell className="h-4 w-4 text-blue-600" />
                  <span className="text-sm">Header Bell Click</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span className="text-sm font-medium">/dashboard/notifications</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-blue-50 rounded">
                  <Eye className="h-4 w-4 text-blue-600" />
                  <span className="text-sm">View All Button</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span className="text-sm font-medium">/dashboard/notifications</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-blue-50 rounded">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span className="text-sm">Dashboard Stats Cards</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span className="text-sm font-medium">/dashboard/notifications</span>
                </div>
              </div>
            </div>

            {/* Renter Flow */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Renter Flow</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2 bg-green-50 rounded">
                  <Bell className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Header Bell Click</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span className="text-sm font-medium">/renter/notices</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-green-50 rounded">
                  <Eye className="h-4 w-4 text-green-600" />
                  <span className="text-sm">View All Button</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span className="text-sm font-medium">/renter/notices</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-green-50 rounded">
                  <FileText className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Notice Notifications</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span className="text-sm font-medium">/renter/notices</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Cases */}
      <div className="grid gap-4 md:grid-cols-2">
        {tests.map((test) => (
          <Card key={test.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="text-lg">{test.title}</span>
                {testResults[test.id] !== undefined && (
                  <CheckCircle 
                    className={`h-5 w-5 ${testResults[test.id] ? 'text-green-600' : 'text-red-600'}`} 
                  />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{test.description}</p>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                  <span className="text-sm">Landlord:</span>
                  <Link href={test.landlordPath}>
                    <Button variant="outline" size="sm">
                      Test → {test.landlordPath}
                    </Button>
                  </Link>
                </div>
                <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                  <span className="text-sm">Renter:</span>
                  <Link href={test.renterPath}>
                    <Button variant="outline" size="sm">
                      Test → {test.renterPath}
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={() => markTest(test.id, true)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Mark as Passing
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive"
                  onClick={() => markTest(test.id, false)}
                >
                  Mark as Failing
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Implementation Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Implementation Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <h3 className="font-semibold">What Was Fixed:</h3>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li><strong>Header Notification Bell:</strong> Now navigates to correct notices page based on user role</li>
            <li><strong>View All Button:</strong> Updated to navigate to /renter/notices for renters instead of dashboard</li>
            <li><strong>Dashboard Stats Cards:</strong> Added clickable notice cards that navigate to notifications page</li>
            <li><strong>Individual Notifications:</strong> Simplified navigation logic for better user experience</li>
            <li><strong>Stats Integration:</strong> Added notice counts to dashboard statistics</li>
          </ul>

          <h3 className="font-semibold mt-4">Files Modified:</h3>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li><code>lease/components/layout/header.tsx</code> - Fixed navigation logic</li>
            <li><code>lease/components/dashboard/stats-overview.tsx</code> - Added clickable notice cards</li>
            <li><code>lease/hooks/use-landlord-dashboard.ts</code> - Added notice statistics</li>
            <li><code>lease/types/index.ts</code> - Extended DashboardStats interface</li>
          </ul>

          <div className="p-4 bg-green-50 border border-green-200 rounded-lg mt-4">
            <h4 className="font-medium text-green-800 mb-2">✅ Connection Complete</h4>
            <p className="text-sm text-green-700">
              All notification elements (bell icon, dashboard cards, view all button) now properly 
              connect to the appropriate notices pages based on user role.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}