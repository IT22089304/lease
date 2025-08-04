"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { FileText, Bell, CheckCircle, XCircle, Eye, Plus, Search, Filter, Calendar, MapPin, User, Building, Car, Home, Briefcase, Users, Phone, Mail, DollarSign, Clock, HelpCircle, Download, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useAuth } from "@/lib/auth"
import { applicationService } from "@/lib/services/application-service"
import { notificationService } from "@/lib/services/notification-service"
import { propertyService } from "@/lib/services/property-service"
import type { LeaseApplication, Property } from "@/types"
import { toDateString } from "@/lib/utils"
import { toast } from "sonner"

export default function ApplicationsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [applications, setApplications] = useState<LeaseApplication[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [selectedApplication, setSelectedApplication] = useState<LeaseApplication | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  useEffect(() => {
    if (!user?.id) return;
    async function fetchData(userId: string) {
      try {
        const [applicationsData, propertiesData, notificationsData, unreadCountData] = await Promise.all([
          applicationService.getApplicationsForLandlord(userId),
          propertyService.getLandlordProperties(userId),
          notificationService.getLandlordNotifications(userId),
          notificationService.getUnreadCount(userId)
        ])
        
        // Filter to only submitted applications
        const submittedApplications = applicationsData.filter((app: any) => app.status === "submitted")
        setApplications(submittedApplications as LeaseApplication[])
        setProperties(propertiesData)
        setNotifications(notificationsData)
        setUnreadCount(unreadCountData)
      } catch (error) {
        console.error("Error fetching data:", error)
        toast.error("Failed to load applications")
      } finally {
        setIsLoading(false)
      }
    }
    fetchData(user.id)
  }, [user])

  const getStatusBadge = (status: LeaseApplication["status"]) => {
    const statusConfig = {
      draft: { label: "Draft", variant: "secondary" as const },
      incomplete: { label: "Incomplete", variant: "secondary" as const },
      submitted: { label: "Submitted", variant: "default" as const },
      under_review: { label: "Under Review", variant: "default" as const },
      approved: { label: "Approved", variant: "default" as const },
      rejected: { label: "Rejected", variant: "destructive" as const },
    }
    
    const config = statusConfig[status] || statusConfig.draft
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const getPropertyAddress = (propertyId: string) => {
    const property = properties.find((p) => p.id === propertyId)
    if (!property) return propertyId
    const addr = property.address
    return `${addr.street}${addr.unit ? ", Unit " + addr.unit : ""}, ${addr.city}, ${addr.state}`
  }

  const handleApprove = async (applicationId: string) => {
    try {
      await applicationService.updateApplicationStatus(applicationId, "approved")
      setApplications(prev => 
        prev.map(app => 
          app.id === applicationId ? { ...app, status: "approved" as const } : app
        )
      )
      toast.success("Application approved successfully")
    } catch (error) {
      console.error("Error approving application:", error)
      toast.error("Failed to approve application")
    }
  }

  const handleReject = async (applicationId: string) => {
    try {
      await applicationService.updateApplicationStatus(applicationId, "rejected")
      setApplications(prev => 
        prev.map(app => 
          app.id === applicationId ? { ...app, status: "rejected" as const } : app
        )
      )
      toast.success("Application rejected successfully")
    } catch (error) {
      console.error("Error rejecting application:", error)
      toast.error("Failed to reject application")
    }
  }

  const filterApplications = (status?: LeaseApplication["status"] | "all") => {
    let filtered = applications
    
    if (status && status !== "all") {
      filtered = filtered.filter(app => app.status === status)
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(app => 
        (app as any).fullName?.toLowerCase().includes(term) ||
        app.renterEmail?.toLowerCase().includes(term) ||
        getPropertyAddress(app.propertyId).toLowerCase().includes(term)
      )
    }
    
    return filtered
  }

  const handleNotificationClick = async (notification: any) => {
    // Mark as read if not already read
    if (!notification.readAt) {
      await notificationService.markAsRead(notification.id);
      setUnreadCount(prev => Math.max(0, prev - 1));
      setNotifications(prev => 
        prev.map(n => n.id === notification.id ? { ...n, readAt: new Date() } : n)
      );
    }

    // Navigate based on notification type
    if (notification.navigation) {
      const { path, params } = notification.navigation;
      
      if (path) {
        let url = path;
        
        // Add query parameters if they exist
        if (params) {
          const searchParams = new URLSearchParams();
          Object.entries(params).forEach(([key, value]) => {
            if (value && typeof value === 'string') searchParams.append(key, value);
          });
          if (searchParams.toString()) {
            url += `?${searchParams.toString()}`;
          }
        }
        
        router.push(url);
      }
    } else {
      // Fallback navigation based on notification type
      switch (notification.type) {
        case "application_submitted":
        case "application_approved":
        case "application_rejected":
          router.push("/applications");
          break;
        case "tenant_moved_in":
          router.push("/properties");
          break;
        case "payment_received":
          router.push("/dashboard/incomes");
          break;
        case "lease_completed":
          router.push("/notifications?tab=lease");
          break;
        default:
          router.push("/notifications");
      }
    }
  };

  const filteredApplications = filterApplications(statusFilter as LeaseApplication["status"])

  if (!user || user.role !== "landlord") {
    return (
      <div className="container mx-auto p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
          <p className="text-muted-foreground">You don't have permission to view this page.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-primary">Submitted Applications</h1>
          <p className="text-lg text-muted-foreground">Review and manage submitted rental applications from potential tenants</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center text-xs"
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex items-center justify-between">
                  <span>Notifications</span>
                  {unreadCount > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={async () => {
                        if (user?.id) {
                          await notificationService.markAllAsRead(user.id);
                          setUnreadCount(0);
                          setNotifications(prev => prev.map(n => ({ ...n, readAt: n.readAt || new Date() })));
                        }
                      }}
                    >
                      Mark all as read
                    </Button>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No notifications
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.slice(0, 5).map((notification) => (
                      <DropdownMenuItem
                        key={notification.id}
                        className="flex items-start gap-3 p-3 cursor-pointer hover:bg-muted/50"
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium truncate">
                              {notification.title}
                            </span>
                            {!notification.readAt && (
                              <Badge variant="destructive" className="text-xs">New</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">
                              {notification.createdAt ? toDateString(notification.createdAt) : 'Just now'}
                            </span>
                          </div>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Submitted Applications</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{applications.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Under Review</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {applications.filter(app => app.status === "under_review").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {applications.filter(app => app.status === "approved").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {applications.filter(app => app.status === "rejected").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search applications..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filter
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setStatusFilter("all")}>
              All Applications
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter("submitted")}>
              Submitted
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter("under_review")}>
              Under Review
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter("approved")}>
              Approved
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter("rejected")}>
              Rejected
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Applications List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-2">Loading applications...</p>
          </div>
        ) : filteredApplications.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No applications found</h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== "all" 
                  ? "Try adjusting your search or filter criteria."
                  : "No applications have been submitted yet."
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredApplications.map((application) => (
            <ApplicationCard
              key={application.id}
              application={application}
              propertyAddress={getPropertyAddress(application.propertyId)}
              onApprove={handleApprove}
              onReject={handleReject}
              onViewDetails={() => setSelectedApplication(application)}
            />
          ))
        )}
      </div>

      {/* Application Details Modal */}
      {selectedApplication && (
        <ApplicationDetailsModal
          application={selectedApplication}
          propertyAddress={getPropertyAddress(selectedApplication.propertyId)}
          onClose={() => setSelectedApplication(null)}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}
    </div>
  )
}

interface ApplicationCardProps {
  application: LeaseApplication
  propertyAddress: string
  onApprove: (id: string) => void
  onReject: (id: string) => void
  onViewDetails: () => void
}

function ApplicationCard({ application, propertyAddress, onApprove, onReject, onViewDetails }: ApplicationCardProps) {
  const getStatusBadge = (status: LeaseApplication["status"]) => {
    const variants = {
      draft: { variant: "secondary", icon: FileText, label: "Draft" },
      submitted: { variant: "default", icon: Clock, label: "Submitted" },
      under_review: { variant: "default", icon: Eye, label: "Under Review" },
      approved: { variant: "default", icon: CheckCircle, label: "Approved" },
      rejected: { variant: "destructive", icon: XCircle, label: "Rejected" },
    }
    const config = variants[status]
    if (!config) {
      return (
        <Badge variant="outline" className="flex items-center gap-1">
          <HelpCircle className="h-3 w-3" />
          Unknown
        </Badge>
      )
    }
    const Icon = config.icon
    return (
      <Badge variant={config.variant as any} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-semibold">
                {application.applicationData?.personalInfo?.fullName || application.renterEmail}
              </h3>
              {getStatusBadge(application.status)}
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">
                <span className="font-medium">Property:</span> {propertyAddress}
              </p>
              <p className="text-muted-foreground">
                <span className="font-medium">Email:</span> {application.renterEmail}
              </p>
              {application.applicationData?.personalInfo?.phone && (
                <p className="text-muted-foreground">
                  <span className="font-medium">Phone:</span> {application.applicationData.personalInfo.phone}
                </p>
              )}
              {application.submittedAt && (
                <p className="text-muted-foreground">
                  <span className="font-medium">Submitted:</span> {toDateString(application.submittedAt)}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onViewDetails}>
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            {(!["approved", "rejected"].includes(application.status)) && (
              <>
                <Button size="sm" onClick={() => onApprove(application.id)}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button variant="destructive" size="sm" onClick={() => onReject(application.id)}>
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      {application.applicationData?.employment && (
        <CardContent>
          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Employment Information</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Company:</span>
                <p className="font-medium">{application.applicationData.employment.company}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Position:</span>
                <p className="font-medium">{application.applicationData.employment.position}</p>
              </div>
              {application.applicationData.employment.monthlyIncome && (
                <div>
                  <span className="text-muted-foreground">Monthly Income:</span>
                  <p className="font-medium">
                    ${application.applicationData.employment.monthlyIncome.toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

interface ApplicationDetailsModalProps {
  application: LeaseApplication
  propertyAddress: string
  onClose: () => void
  onApprove: (id: string) => void
  onReject: (id: string) => void
}

function ApplicationDetailsModal({ application, propertyAddress, onClose, onApprove, onReject }: ApplicationDetailsModalProps) {
  // Debug: Log the application data structure
  const appData = application as any
  console.log("Application Data:", appData)
  console.log("Applicants:", appData.applicants)
  console.log("Signatures:", appData.signatures)
  console.log("Signature Statuses:", appData.signatureStatuses)

  const getStatusBadge = (status: LeaseApplication["status"]) => {
    const variants = {
      draft: { variant: "secondary", icon: FileText, label: "Draft" },
      submitted: { variant: "default", icon: Clock, label: "Submitted" },
      under_review: { variant: "default", icon: Eye, label: "Under Review" },
      approved: { variant: "default", icon: CheckCircle, label: "Approved" },
      rejected: { variant: "destructive", icon: XCircle, label: "Rejected" },
    }
    const config = variants[status]
    if (!config) {
      return (
        <Badge variant="outline" className="flex items-center gap-1">
          <HelpCircle className="h-3 w-3" />
          Unknown
        </Badge>
      )
    }
    const Icon = config.icon
    return (
      <Badge variant={config.variant as any} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold">
                Application Details
              </DialogTitle>
              <div className="flex items-center gap-2 mt-2">
                {getStatusBadge(application.status)}
                <span className="text-sm text-muted-foreground">
                  Submitted {application.submittedAt ? toDateString(application.submittedAt) : 'Recently'}
                </span>
              </div>
            </div>
            <Button variant="outline" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Applicant Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Applicant Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Personal Information</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Full Name:</span>
                        <span className="font-medium">
                          {application.applicationData?.personalInfo?.fullName || 'Not provided'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Email:</span>
                        <span className="font-medium">{application.renterEmail}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Phone:</span>
                        <span className="font-medium">
                          {application.applicationData?.personalInfo?.phone || 'Not provided'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Date of Birth:</span>
                        <span className="font-medium">
                          {application.applicationData?.personalInfo?.dateOfBirth || 'Not provided'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">SSN:</span>
                        <span className="font-medium">
                          {application.applicationData?.personalInfo?.ssn ? '***-**-' + application.applicationData.personalInfo.ssn.slice(-4) : 'Not provided'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Property Information</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Property:</span>
                        <span className="font-medium">{propertyAddress}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Application ID:</span>
                        <span className="font-medium">{application.id.slice(-8)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <span className="font-medium">{getStatusBadge(application.status)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Information Tabs */}
          <Tabs defaultValue="applicants" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="applicants">Applicants</TabsTrigger>
              <TabsTrigger value="employment">Employment</TabsTrigger>
              <TabsTrigger value="residence">Residence</TabsTrigger>
              <TabsTrigger value="references">References</TabsTrigger>
              <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
              <TabsTrigger value="signatures">Signatures</TabsTrigger>
            </TabsList>

            <TabsContent value="applicants" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Applicants Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {appData.applicants && Array.isArray(appData.applicants) && appData.applicants.length > 0 ? (
                    <div className="space-y-4">
                      {appData.applicants.map((applicant: any, index: number) => (
                        <div key={index} className="border rounded-lg p-4">
                          <h4 className="font-medium mb-2">Applicant {index + 1}</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Name:</span>
                                <span className="font-medium">{applicant.name || 'Not provided'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Date of Birth:</span>
                                <span className="font-medium">{applicant.dob || 'Not provided'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Driver's License:</span>
                                <span className="font-medium">{applicant.dl || 'Not provided'}</span>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Occupation:</span>
                                <span className="font-medium">{applicant.occupation || 'Not provided'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">SIN:</span>
                                <span className="font-medium">
                                  {applicant.sin ? '***-**-' + applicant.sin.slice(-4) : 'Not provided'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No applicants information provided</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="employment" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    Employment Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {appData.employments && appData.employments.length > 0 ? (
                    <div className="space-y-4">
                      {appData.employments.map((employment: any, index: number) => (
                        <div key={index} className="border rounded-lg p-4">
                          <h4 className="font-medium mb-2">Employment {index + 1}</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Employer:</span>
                                <span className="font-medium">{employment.employer || 'Not provided'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Position:</span>
                                <span className="font-medium">{employment.position || 'Not provided'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Length:</span>
                                <span className="font-medium">{employment.length || 'Not provided'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Salary:</span>
                                <span className="font-medium">
                                  {employment.salary ? `$${employment.salary.toLocaleString()}` : 'Not provided'}
                                </span>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Address:</span>
                                <span className="font-medium">{employment.address || 'Not provided'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Phone:</span>
                                <span className="font-medium">{employment.phone || 'Not provided'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Supervisor:</span>
                                <span className="font-medium">{employment.supervisor || 'Not provided'}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="border rounded-lg p-4">
                        <h4 className="font-medium mb-2">Current Employment</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Company:</span>
                              <span className="font-medium">{appData.employmentCompany || 'Not provided'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Job Title:</span>
                              <span className="font-medium">{appData.employmentJobTitle || 'Not provided'}</span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Monthly Income:</span>
                              <span className="font-medium">
                                {appData.employmentMonthlyIncome ? 
                                  `$${appData.employmentMonthlyIncome.toLocaleString()}` : 
                                  'Not provided'
                                }
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="residence" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Home className="h-5 w-5" />
                    Residence History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                                                       {appData.residences && appData.residences.length > 0 ? (
                    <div className="space-y-4">
                      {appData.residences.map((residence: any, index: number) => (
                        <div key={index} className="border rounded-lg p-4">
                          <h4 className="font-medium mb-2">Residence {index + 1}</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Address:</span>
                                <span className="font-medium">{residence.address}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">City:</span>
                                <span className="font-medium">{residence.city}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">State:</span>
                                <span className="font-medium">{residence.state}</span>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">From:</span>
                                <span className="font-medium">{residence.fromDate}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">To:</span>
                                <span className="font-medium">{residence.toDate}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Rent:</span>
                                <span className="font-medium">
                                  {residence.rent ? `$${residence.rent.toLocaleString()}` : 'Not provided'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No residence history provided</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="references" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    References
                  </CardTitle>
                </CardHeader>
                <CardContent>
                                                       {appData.references && appData.references.length > 0 ? (
                    <div className="space-y-4">
                      {appData.references.map((reference: any, index: number) => (
                        <div key={index} className="border rounded-lg p-4">
                          <h4 className="font-medium mb-2">Reference {index + 1}</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Name:</span>
                                <span className="font-medium">{reference.name}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Relationship:</span>
                                <span className="font-medium">{reference.relationship}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Phone:</span>
                                <span className="font-medium">{reference.phone}</span>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Email:</span>
                                <span className="font-medium">{reference.email}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Years Known:</span>
                                <span className="font-medium">{reference.yearsKnown}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No references provided</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

                        <TabsContent value="vehicles" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Car className="h-5 w-5" />
                    Vehicle Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {appData.autos && appData.autos.length > 0 ? (
                    <div className="space-y-4">
                      {appData.autos.map((vehicle: any, index: number) => (
                        <div key={index} className="border rounded-lg p-4">
                          <h4 className="font-medium mb-2">Vehicle {index + 1}</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Make:</span>
                                <span className="font-medium">{vehicle.make || 'Not provided'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Model:</span>
                                <span className="font-medium">{vehicle.model || 'Not provided'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Year:</span>
                                <span className="font-medium">{vehicle.year || 'Not provided'}</span>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">License:</span>
                                <span className="font-medium">{vehicle.licence || 'Not provided'}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No vehicle information provided</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

                        <TabsContent value="signatures" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Signatures
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {appData.signatures && typeof appData.signatures === 'object' && Object.keys(appData.signatures).length > 0 ? (
                    <div className="space-y-4">
                      {Object.entries(appData.signatures as Record<string, any>).map(([signerIndex, signatureData]) => (
                        <div key={signerIndex} className="border rounded-lg p-4">
                          <h4 className="font-medium mb-2">Applicant {parseInt(signerIndex) + 1} Signature</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Status:</span>
                              <span className="font-medium">
                                {(appData.signatureStatuses as Record<string, any>)?.[signerIndex] === 'completed' ? 'Completed' : 'Pending'}
                              </span>
                            </div>
                                                         {signatureData && typeof signatureData === 'string' && (
                               <div className="mt-2">
                                 <span className="text-muted-foreground text-sm">Signature:</span>
                                 <div className="mt-1 p-2 border rounded bg-gray-50">
                                   <img 
                                     src={signatureData} 
                                     alt={`Applicant ${parseInt(signerIndex) + 1} signature`}
                                     className="max-w-full h-20 object-contain"
                                   />
                                 </div>
                               </div>
                             )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No signatures available</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          {(!["approved", "rejected"].includes(application.status)) && (
            <div className="flex justify-end gap-3 pt-6 border-t">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button variant="destructive" onClick={() => onReject(application.id)}>
                <XCircle className="h-4 w-4 mr-2" />
                Reject Application
              </Button>
              <Button onClick={() => onApprove(application.id)}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve Application
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
