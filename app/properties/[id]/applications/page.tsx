"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { 
  ArrowLeft, 
  Eye, 
  CheckCircle, 
  XCircle,
  User,
  Building,
  MapPin,
  DollarSign,
  Calendar,
  Clock,
  FileText
} from "lucide-react"
import { useAuth } from "@/lib/auth"
import { applicationService } from "@/lib/services/application-service"
import { propertyService } from "@/lib/services/property-service"
import { notificationService } from "@/lib/services/notification-service"
import { toast } from "sonner"
import type { Property } from "@/types"

export default function PropertyApplicationsPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const propertyId = params.id as string
  
  const [property, setProperty] = useState<Property | null>(null)
  const [applications, setApplications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedApplication, setSelectedApplication] = useState<any>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    async function fetchData() {
      if (!user?.id || !propertyId) return

      try {
        setLoading(true)
        
        // Fetch property details
        const propertyData = await propertyService.getProperty(propertyId)
        if (!propertyData) {
          toast.error("Property not found")
          router.push("/dashboard")
          return
        }
        
        if (propertyData.landlordId !== user.id) {
          toast.error("Access denied. This property doesn't belong to you.")
          router.push("/dashboard")
          return
        }
        
        setProperty(propertyData)
        
        // Fetch applications for this property
        const applicationsData = await applicationService.getApplicationsByProperty(propertyId)
        setApplications(applicationsData)
        
      } catch (error) {
        console.error("Error fetching property applications:", error)
        toast.error("Failed to load applications")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user?.id, propertyId, router])

  const handleViewApplication = (application: any) => {
    setSelectedApplication(application)
    setIsViewDialogOpen(true)
  }

  const handleApplicationAction = async (applicationId: string, action: 'approve' | 'reject') => {
    setIsProcessing(true)
    try {
      // Find the application to get renter email
      const application = applications.find(app => app.id === applicationId)
      if (!application) {
        toast.error("Application not found")
        return
      }

      await applicationService.updateApplicationStatus(applicationId, action === 'approve' ? 'approved' : 'rejected')
      
      // Send notification to renter
      if (application.renterEmail) {
        try {
          const status = action === 'approve' ? 'approved' : 'rejected'
          const notificationData = {
            renterId: application.renterEmail, // Using email as renterId
            type: (action === 'approve' ? 'application_approved' : 'application_rejected') as 'application_approved' | 'application_rejected',
            title: `Application ${status.charAt(0).toUpperCase() + status.slice(1)}`,
            message: action === 'approve' 
              ? "Your rental application has been approved! Please check your email for next steps."
              : "Your rental application has been rejected. You can apply for other properties.",
            data: {
              applicationId,
              propertyId,
              status,
              propertyTitle: property?.title || formatAddress(property?.address || {}),
            },
            navigation: {
              type: "page" as const,
              path: "/renter/applications",
              action: "view_applications"
            }
          }
          
          await notificationService.createNotification(notificationData)
        } catch (notificationError) {
          console.error("Error sending notification to renter:", notificationError)
          // Don't fail the whole operation if notification fails
        }
      }
      
      // Update local state
      setApplications(prev => 
        prev.map(app => 
          app.id === applicationId 
            ? { ...app, status: action === 'approve' ? 'approved' : 'rejected' }
            : app
        )
      )
      
      toast.success(`Application ${action === 'approve' ? 'approved' : 'rejected'} successfully`)
    } catch (error) {
      console.error("Error updating application status:", error)
      toast.error(`Failed to ${action} application`)
    } finally {
      setIsProcessing(false)
    }
  }

  const formatAddress = (address: any): string => {
    if (!address) return "N/A"
    
    // Handle case where address is an object
    if (typeof address === 'object' && address !== null) {
      const parts = []
      
      if (address.street) parts.push(address.street)
      if (address.unit) parts.push(`Unit ${address.unit}`)
      if (address.city) parts.push(address.city)
      if (address.state) parts.push(address.state)
      if (address.province) parts.push(address.province)
      if (address.postalCode) parts.push(address.postalCode)
      
      return parts.length > 0 ? parts.join(', ') : "N/A"
    }
    
    // Handle case where address is a string
    if (typeof address === 'string') {
      return address
    }
    
    return "N/A"
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

  const formatDate = (date: Date | string | any): string => {
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

  const safeString = (value: any): string => {
    if (value === null || value === undefined) return "N/A"
    if (typeof value === 'object') return "N/A"
    return String(value)
  }

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

  if (!property) {
    return (
      <div className="container mx-auto p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Property Not Found</h1>
          <p className="text-muted-foreground">The property you're looking for doesn't exist.</p>
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
              Rental applications for {safeString(property.title) || formatAddress(property.address)}
            </p>
          </div>
        </div>
      </div>

      {/* Property Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Property Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Property</p>
              <p className="font-medium">{safeString(property.title) || safeString(property.type)}</p>
            </div>
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
        </CardContent>
      </Card>

      {/* Applications List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Rental Applications ({applications.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {applications.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No applications found</h3>
              <p className="text-muted-foreground">
                Applications will appear here when renters apply for this property.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {applications.map((application) => (
                <div key={application.id} className="border rounded-lg p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium text-lg">
                          {safeString(application.fullName) || safeString(application.renterEmail)}
                        </h4>
                        <p className="text-sm text-muted-foreground">{safeString(application.renterEmail)}</p>
                      </div>
                    </div>
                    {getStatusBadge(application.status || "submitted")}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {application.employmentCompany && (
                      <div>
                        <p className="text-muted-foreground">Company</p>
                        <p className="font-medium">{safeString(application.employmentCompany)}</p>
                      </div>
                    )}
                    {application.employmentJobTitle && (
                      <div>
                        <p className="text-muted-foreground">Job Title</p>
                        <p className="font-medium">{safeString(application.employmentJobTitle)}</p>
                      </div>
                    )}
                    {application.employmentMonthlyIncome && (
                      <div>
                        <p className="text-muted-foreground">Monthly Income</p>
                        <p className="font-medium">${safeString(application.employmentMonthlyIncome)}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-muted-foreground">Submitted</p>
                      <p className="font-medium">{formatDate(application.submittedAt)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewApplication(application)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                    {application.status !== "approved" && application.status !== "rejected" && (
                      <>
                        <Button 
                          variant="default" 
                          size="sm" 
                          onClick={() => handleApplicationAction(application.id, 'approve')}
                          disabled={isProcessing}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          {isProcessing ? "Processing..." : "Approve"}
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={() => handleApplicationAction(application.id, 'reject')}
                          disabled={isProcessing}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          {isProcessing ? "Processing..." : "Reject"}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
                  <h1 className="text-2xl font-bold">{safeString(selectedApplication.fullName) || safeString(selectedApplication.renterEmail)}</h1>
                  <p className="text-muted-foreground mt-1">{safeString(selectedApplication.renterEmail)}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {getStatusBadge(selectedApplication.status || "submitted")}
                    <span className="text-sm text-muted-foreground">
                      Submitted: {formatDate(selectedApplication.submittedAt)}
                    </span>
                  </div>
                </div>
                {selectedApplication.status !== "approved" && selectedApplication.status !== "rejected" && (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleApplicationAction(selectedApplication.id, 'approve')}
                      className="bg-green-600 hover:bg-green-700"
                      disabled={isProcessing}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleApplicationAction(selectedApplication.id, 'reject')}
                      disabled={isProcessing}
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
                        <p className="font-medium">{safeString(selectedApplication.fullName)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-medium">{safeString(selectedApplication.renterEmail)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="font-medium">{safeString(selectedApplication.phone)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Date of Birth</p>
                        <p className="font-medium">{safeString(selectedApplication.dob)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Social Security Number</p>
                        <p className="font-medium">{safeString(selectedApplication.ssn)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Driver's License</p>
                        <p className="font-medium">{safeString(selectedApplication.driversLicense)}</p>
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
                        <p className="font-medium">{safeString(selectedApplication.employmentCompany)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Job Title</p>
                        <p className="font-medium">{safeString(selectedApplication.employmentJobTitle)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Monthly Income</p>
                        <p className="font-medium">
                          {selectedApplication.employmentMonthlyIncome 
                            ? `$${safeString(selectedApplication.employmentMonthlyIncome)}` 
                            : "N/A"
                          }
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Employment Start Date</p>
                        <p className="font-medium">{safeString(selectedApplication.employmentStartDate)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Supervisor Name</p>
                        <p className="font-medium">{safeString(selectedApplication.employmentSupervisor)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Work Phone</p>
                        <p className="font-medium">{safeString(selectedApplication.employmentPhone)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Rental History */}
                <Card>
                  <CardHeader>
                    <CardTitle>Rental History</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Current Address</p>
                        <p className="font-medium">{safeString(selectedApplication.currentAddress)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Current Rent</p>
                        <p className="font-medium">
                          {selectedApplication.currentRent 
                            ? `$${safeString(selectedApplication.currentRent)}` 
                            : "N/A"
                          }
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Landlord Name</p>
                        <p className="font-medium">{safeString(selectedApplication.currentLandlordName)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Landlord Phone</p>
                        <p className="font-medium">{safeString(selectedApplication.currentLandlordPhone)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Move-in Date</p>
                        <p className="font-medium">{safeString(selectedApplication.currentMoveInDate)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Move-out Date</p>
                        <p className="font-medium">{safeString(selectedApplication.currentMoveOutDate)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Reason for Moving</p>
                        <p className="font-medium">{safeString(selectedApplication.reasonForMoving)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Emergency Contact */}
                <Card>
                  <CardHeader>
                    <CardTitle>Emergency Contact</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Emergency Contact Name</p>
                        <p className="font-medium">{safeString(selectedApplication.emergencyContactName)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Emergency Contact Phone</p>
                        <p className="font-medium">{safeString(selectedApplication.emergencyContactPhone)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Emergency Contact Relationship</p>
                        <p className="font-medium">{safeString(selectedApplication.emergencyContactRelationship)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Emergency Contact Address</p>
                        <p className="font-medium">{safeString(selectedApplication.emergencyContactAddress)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Vehicle Information */}
                <Card>
                  <CardHeader>
                    <CardTitle>Vehicle Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Vehicle Make</p>
                        <p className="font-medium">{safeString(selectedApplication.vehicleMake)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Vehicle Model</p>
                        <p className="font-medium">{safeString(selectedApplication.vehicleModel)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Vehicle Year</p>
                        <p className="font-medium">{safeString(selectedApplication.vehicleYear)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">License Plate</p>
                        <p className="font-medium">{safeString(selectedApplication.vehicleLicensePlate)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Vehicle Color</p>
                        <p className="font-medium">{safeString(selectedApplication.vehicleColor)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Pet Information */}
                <Card>
                  <CardHeader>
                    <CardTitle>Pet Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Has Pets</p>
                        <p className="font-medium">{selectedApplication.hasPets ? "Yes" : "No"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Pet Type</p>
                        <p className="font-medium">{safeString(selectedApplication.petType)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Pet Breed</p>
                        <p className="font-medium">{safeString(selectedApplication.petBreed)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Pet Age</p>
                        <p className="font-medium">{safeString(selectedApplication.petAge)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Pet Weight</p>
                        <p className="font-medium">{safeString(selectedApplication.petWeight)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Pet Vaccinated</p>
                        <p className="font-medium">{selectedApplication.petVaccinated ? "Yes" : "No"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Application Details */}
                <Card>
                  <CardHeader>
                    <CardTitle>Application Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Application ID</p>
                        <p className="font-medium">{safeString(selectedApplication.id)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Property ID</p>
                        <p className="font-medium">{safeString(selectedApplication.propertyId)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Landlord ID</p>
                        <p className="font-medium">{safeString(selectedApplication.landlordId)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <p className="font-medium">{safeString(selectedApplication.status)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Submitted At</p>
                        <p className="font-medium">{formatDate(selectedApplication.submittedAt)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Updated At</p>
                        <p className="font-medium">{formatDate(selectedApplication.updatedAt)}</p>
                      </div>
                    </div>

                    {selectedApplication.applicants && selectedApplication.applicants.length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Additional Applicants</p>
                        <div className="space-y-2">
                          {selectedApplication.applicants.map((applicant: any, index: number) => (
                            <div key={index} className="text-sm border p-2 rounded">
                              <p className="font-medium">{safeString(applicant.name)}</p>
                              <p className="text-muted-foreground">
                                {safeString(applicant.occupation)} • {safeString(applicant.dob)}
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
                            <div key={index} className="text-sm border p-2 rounded">
                              <p className="font-medium">{safeString(occupant.name)}</p>
                              <p className="text-muted-foreground">
                                {safeString(occupant.relationship)} • Age: {safeString(occupant.age)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Property Information */}
                <Card>
                  <CardHeader>
                    <CardTitle>Property Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Property</p>
                        <p className="font-medium">{safeString(property.title) || formatAddress(property.address)}</p>
                      </div>
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
                      <div>
                        <p className="text-sm text-muted-foreground">Property Type</p>
                        <p className="font-medium">{safeString(property.type)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Bedrooms</p>
                        <p className="font-medium">{safeString(property.bedrooms)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Bathrooms</p>
                        <p className="font-medium">{safeString(property.bathrooms)}</p>
                      </div>
                    </div>
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