"use client"

import { useState } from "react"
import { Search, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface AuditLog {
  id: string
  timestamp: Date
  userId: string
  userEmail: string
  action: string
  resource: string
  resourceId: string
  ipAddress: string
  userAgent: string
  status: "success" | "failed"
}

const INITIAL_LOGS: AuditLog[] = [
  {
    id: "1",
    timestamp: new Date("2024-01-15T10:30:00"),
    userId: "user123",
    userEmail: "landlord@example.com",
    action: "create_lease",
    resource: "lease",
    resourceId: "lease456",
    ipAddress: "192.168.1.100",
    userAgent: "Mozilla/5.0...",
    status: "success",
  },
  {
    id: "2",
    timestamp: new Date("2024-01-15T09:15:00"),
    userId: "user789",
    userEmail: "renter@example.com",
    action: "login",
    resource: "user",
    resourceId: "user789",
    ipAddress: "192.168.1.101",
    userAgent: "Mozilla/5.0...",
    status: "success",
  },
  {
    id: "3",
    timestamp: new Date("2024-01-15T08:45:00"),
    userId: "admin001",
    userEmail: "admin@example.com",
    action: "update_template",
    resource: "lease_template",
    resourceId: "template123",
    ipAddress: "192.168.1.102",
    userAgent: "Mozilla/5.0...",
    status: "success",
  },
]

export function AuditLogs() {
  const [logs] = useState<AuditLog[]>(INITIAL_LOGS)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterAction, setFilterAction] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resource.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesAction = filterAction === "all" || log.action === filterAction
    const matchesStatus = filterStatus === "all" || log.status === filterStatus
    return matchesSearch && matchesAction && matchesStatus
  })

  const actions = Array.from(new Set(logs.map((log) => log.action)))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Audit Logs</h2>
          <p className="text-muted-foreground">Monitor system activity and user actions</p>
        </div>
        <Button variant="outline" className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export Logs
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {actions.map((action) => (
                  <SelectItem key={action} value={action}>
                    {action.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {log.action.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                    </span>
                    <Badge variant={log.status === "success" ? "default" : "destructive"}>{log.status}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <span>User: {log.userEmail}</span>
                    <span className="mx-2">•</span>
                    <span>Resource: {log.resource}</span>
                    <span className="mx-2">•</span>
                    <span>ID: {log.resourceId}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <span>IP: {log.ipAddress}</span>
                    <span className="mx-2">•</span>
                    <span>{log.timestamp.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredLogs.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No logs found matching your search criteria.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
