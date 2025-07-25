"use client"
import { Settings, FileText, Users, BarChart3 } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RegionalTemplates } from "@/components/admin/regional-templates"
import { FieldBuilder } from "@/components/admin/field-builder"
import { AuditLogs } from "@/components/admin/audit-logs"
import { SystemStats } from "@/components/admin/system-stats"
import { useAuth } from "@/lib/auth"

export default function AdminPage() {
  const { user } = useAuth()

  if (!user || user.role !== "admin") {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-2">Access Denied</h1>
          <p className="text-muted-foreground">Administrator access required.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage system configuration and templates</p>
      </div>

      <Tabs defaultValue="templates" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="fields" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Field Builder
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Statistics
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Audit Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates">
          <RegionalTemplates />
        </TabsContent>

        <TabsContent value="fields">
          <FieldBuilder />
        </TabsContent>

        <TabsContent value="stats">
          <SystemStats />
        </TabsContent>

        <TabsContent value="logs">
          <AuditLogs />
        </TabsContent>
      </Tabs>
    </div>
  )
}
