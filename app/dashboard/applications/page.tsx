"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { 
  ArrowLeft, 
  Search, 
  Eye, 
  CheckCircle, 
  XCircle,
  FileText,
  User,
  Building,
  MapPin,
  DollarSign,
  Calendar,
  Clock
} from "lucide-react"
import { useAuth } from "@/lib/auth"
import { applicationService } from "@/lib/services/application-service"
import { propertyService } from "@/lib/services/property-service"
import { toast } from "sonner"
import type { Property } from "@/types"

export default function LandlordApplicationsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [applications, setApplications] = useState<any[]>([])
  const [properties, setProperties] = useState<{[key: string]: Property}>({})
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedApplication, setSelectedApplication] = useState<any>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)

  useEffect(() => {
    async function fetchApplications() {
      if (!user?.id) return

      try {
        setLoading(true)
        
        // Fetch all applications for this landlord
        const applicationsData = await applicationService.getApplicationsForLandlord(user.id)
        setApplications(applicationsData)

        // Fetch property details for each application
        const propertyData: {[key: string]: Property} = {}
        for (const application of applicationsData) {
          if (application.propertyId && !propertyData[application.propertyId]) {
            const property = await propertyService.getProperty(application.propertyId)
            if (property) {
              propertyData[application.propertyId] = property
            }
          }
        }
        setProperties(propertyData)
      } catch (error) {
        console.error("Error fetching applications:", error)
        toast.error("Failed to load applications")
      } finally {
        setLoading(false)
      }
    }

    fetchApplications()
  }, [user?.id])

  const handleViewApplication = (application: any) => {
    setSelectedApplication(application)
    setIsViewDialogOpen(true)
  }

  const handleApproveApplication = async (application: any) => {
    try {
      await applicationService.updateApplicationStatus(application.id, "approved")
      
      // Update local state
      setApplications(prev => 
        prev.map(app => 
          app.id === application.id 
            ? { ...app, status: "approved" }
            : app
        )
      )
      
      toast.success("Application approved successfully")
    } catch (error) {
      console.error("Error approving application:", error)
      toast.error("Failed to approve application")
    }
  }

  const handleRejectApplication = async (application: any) => {
    try {
      await applicationService.updateApplicationStatus(application.id, "rejected")
      
      // Update local state
      setApplications(prev => 
        prev.map(app => 
          app.id === application.id 
            ? { ...app, status: "rejected" }
            : app
        )
      )
      
      toast.success("Application rejected successfully")
    } catch (error) {
      console.error("Error rejecting application:", error)
      toast.error("Failed to reject application")
    }
  }

  const formatAddress = (address: any) => {
    if (!address) return ""
    return `${address.street}${address.unit ? `, Unit ${address.unit}` : ""}, ${address.city}, ${address.state} ${address.postalCode}`
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      submitted: { variant: "outline" as const, text: "Submitted", className: "bg-blue-100 text-blue-700" },
      approved: { variant: "default" as const, text: "Approved", className: "bg-green-100 text-green-700" },
      rejected: { variant: "destructive" as const, text: "Rejected", className: "bg-red-100 text-red-700" },
      pending: { variant: "secondary" as const, text: "Pending", className: "bg-yellow-100 text-yellow-700" },
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.submitted
    return (
      <Badge className={config.className}>
        {config.text}
      </Badge>
    )
  }

  const formatDate = (date: Date | string | any) => {
    if (!date) return "N/A"
    
    let dateObj: Date
    
    if (typeof date === "string") {
      dateObj = new Date(date)
    } else if (date instanceof Date) {
      dateObj = date
    } else if (date && typeof date.toDate === "function") {
      // Handle Firestore Timestamp
      dateObj = date.toDate()
    } else if (date && typeof date.seconds === "number") {
      // Handle Firestore Timestamp object
      dateObj = new Date(date.seconds * 1000)
    } else {
      // Try to create a Date object
      dateObj = new Date(date)
    }
    
    // Check if the date is valid
    if (isNaN(dateObj.getTime())) {
      return "N/A"
    }
    
    return dateObj.toLocaleDateString()
  }

  const getStatusCounts = () => {
    const counts = {
      submitted: 0,
      approved: 0,
      rejected: 0,
      pending: 0,
      total: applications.length
    }
    
    applications.forEach(application => {
      const status = application.status || "submitted"
      if (counts.hasOwnProperty(status)) {
        counts[status as keyof typeof counts]++
      }
    })
    
    return counts
  }

  const filteredApplications = applications.filter(application => {
    // Filter by search term
    const property = properties[application.propertyId]
    const searchString = `${application.fullName || ""} ${application.renterEmail || ""} ${property?.title || ""} ${property?.address?.street || ""}`.toLowerCase()
    const matchesSearch = !searchTerm || searchString.includes(searchTerm.toLowerCase())

    // Filter by status
    const matchesStatus = statusFilter === "all" || application.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const statusCounts = getStatusCounts()

  if (loading) {
    return (
      <div className="container mx-auto p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading applications...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-primary">Applications</h1>
            <p className="text-muted-foreground">
              Review and manage rental applications from all your properties
            </p>
          </div>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.total}</div>
            <p className="text-xs text-muted-foreground">All applications received</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Submitted</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.submitted}</div>
            <p className="text-xs text-muted-foreground">Awaiting review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.approved}</div>
            <p className="text-xs text-muted-foreground">Accepted applications</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.rejected}</div>
            <p className="text-xs text-muted-foreground">Declined applications</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.pending}</div>
            <p className="text-xs text-muted-foreground">Under review</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search applications by name, email, or property..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Applications</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Applications List */}
      <div className="space-y-4">
        {filteredApplications.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No applications found</h3>
              <p className="text-muted-foreground text-center">
                {applications.length === 0 
                  ? "You haven't received any applications yet."
                  : "No applications match your current filters."
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredApplications.map((application) => {
            const property = properties[application.propertyId]
            if (!property) return null

            return (
              <Card 
                key={application.id} 
                className={application.status === "submitted" ? "border-l-4 border-l-blue-500" : ""}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                          <User className="h-6 w-6 text-primary" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold truncate">
                            {application.fullName || application.renterEmail}
                          </h3>
                          {getStatusBadge(application.status || "submitted")}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <User className="h-4 w-4" />
                            <span className="truncate">{application.renterEmail}</span>
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Building className="h-4 w-4" />
                            <span className="truncate">{property.title || property.address?.street}</span>
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            <span className="truncate">{property.address?.city}</span>
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>Submitted: {formatDate(application.submittedAt)}</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {application.employmentCompany && (
                            <Badge variant="secondary" className="text-xs">
                              {application.employmentCompany}
                            </Badge>
                          )}
                          {application.employmentJobTitle && (
                            <Badge variant="secondary" className="text-xs">
                              {application.employmentJobTitle}
                            </Badge>
                          )}
                          {application.employmentMonthlyIncome && (
                            <Badge variant="secondary" className="text-xs">
                              ${application.employmentMonthlyIncome}/month
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewApplication(application)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                        {application.status === "submitted" && (
                          <>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleApproveApplication(application)}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Approve
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleRejectApplication(application)}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Application Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Application Details</DialogTitle>
          </DialogHeader>
          {selectedApplication && (
            <div className="space-y-6">
              {/* Application Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold">{selectedApplication.fullName || selectedApplication.renterEmail}</h1>
                  <p className="text-muted-foreground mt-1">{selectedApplication.renterEmail}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {getStatusBadge(selectedApplication.status || "submitted")}
                    <span className="text-sm text-muted-foreground">
                      Submitted: {formatDate(selectedApplication.submittedAt)}
                    </span>
                  </div>
                </div>
                {selectedApplication.status === "submitted" && (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleApproveApplication(selectedApplication)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleRejectApplication(selectedApplication)}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                )}
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {/* Personal Information */}
                <Card>
                  <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Full Name</p>
                        <p className="font-medium">{selectedApplication.fullName || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-medium">{selectedApplication.renterEmail}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="font-medium">{selectedApplication.phone || "N/A"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Employment Information */}
                <Card>
                  <CardHeader>
                    <CardTitle>Employment Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Company</p>
                        <p className="font-medium">{selectedApplication.employmentCompany || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Job Title</p>
                        <p className="font-medium">{selectedApplication.employmentJobTitle || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Monthly Income</p>
                        <p className="font-medium">
                          {selectedApplication.employmentMonthlyIncome 
                            ? `$${selectedApplication.employmentMonthlyIncome}` 
                            : "N/A"
                          }
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Property Information */}
                <Card>
                  <CardHeader>
                    <CardTitle>Property Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {(() => {
                      const property = properties[selectedApplication.propertyId]
                      if (!property) return <p className="text-muted-foreground">Property not found</p>
                      
                      return (
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Property</p>
                            <p className="font-medium">{property.title || formatAddress(property.address)}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Address</p>
                              <p className="font-medium">{formatAddress(property.address)}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Rent</p>
                              <p className="font-medium">
                                {property.monthlyRent 
                                  ? `$${property.monthlyRent.toLocaleString()}/month` 
                                  : "N/A"
                                }
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    })()}
                  </CardContent>
                </Card>

                {/* Application Details */}
                <Card>
                  <CardHeader>
                    <CardTitle>Application Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedApplication.applicants && selectedApplication.applicants.length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Applicants</p>
                        <div className="space-y-2">
                          {selectedApplication.applicants.map((applicant: any, index: number) => (
                            <div key={index} className="text-sm">
                              <p className="font-medium">{applicant.name || "N/A"}</p>
                              <p className="text-muted-foreground">
                                {applicant.occupation || "N/A"} • {applicant.dob || "N/A"}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {selectedApplication.occupants && selectedApplication.occupants.length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Occupants</p>
                        <div className="space-y-2">
                          {selectedApplication.occupants.map((occupant: any, index: number) => (
                            <div key={index} className="text-sm">
                              <p className="font-medium">{occupant.name || "N/A"}</p>
                              <p className="text-muted-foreground">
                                {occupant.relationship || "N/A"} • Age: {occupant.age || "N/A"}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
} 