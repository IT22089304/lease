import { DollarSign, Home, FileText, AlertTriangle, Bell, Eye } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { DashboardStats } from "@/types"
import { useRouter } from "next/navigation"

interface StatsOverviewProps {
  stats: DashboardStats
}

export function StatsOverview({ stats }: StatsOverviewProps) {
  const router = useRouter()
  const handleNoticesClick = () => {
    router.push("/dashboard/notifications")
  }

  const statCards = [
    {
      title: "Total Properties",
      value: stats.totalProperties,
      icon: Home,
      description: "Properties under management",
    },
    {
      title: "Active Leases",
      value: stats.activeLeases,
      icon: FileText,
      description: "Currently active lease agreements",
    },
    {
      title: "Monthly Revenue",
      value: `$${stats.monthlyRevenue.toLocaleString()}`,
      icon: DollarSign,
      description: "Total monthly rental income",
    },
    {
      title: "Overdue Payments",
      value: stats.overduePayments,
      icon: AlertTriangle,
      description: "Payments past due date",
      alert: stats.overduePayments > 0,
    },
  ]

  // Add notice cards if notice data is available
  if (stats.totalNotices !== undefined) {
    statCards.push({
      title: "Total Notices",
      value: stats.totalNotices,
      icon: Bell,
      description: "All notifications received",
      clickable: true,
      onClick: handleNoticesClick,
    } as any)
  }

  if (stats.unreadNotices !== undefined) {
    statCards.push({
      title: "Unread Notices",
      value: stats.unreadNotices,
      icon: Eye,
      description: "Notices requiring attention",
      alert: stats.unreadNotices > 0,
      clickable: true,
      onClick: handleNoticesClick,
    } as any)
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat, index) => (
        <Card 
          key={index} 
          className={`${stat.alert ? "border-destructive/50" : ""} ${stat.clickable ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`}
          onClick={stat.clickable ? stat.onClick : undefined}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.alert ? "text-destructive" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stat.alert ? "text-destructive" : "text-primary"}`}>{stat.value}</div>
            <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
            {stat.clickable && (
              <p className="text-xs text-blue-600 mt-1">Click to view details</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
