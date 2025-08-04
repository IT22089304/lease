import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Home, Bed, Bath, Square, MapPin, Eye, Check, X, FileText, CheckCircle, AlertCircle, Download } from "lucide-react"
import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useState, useEffect } from "react"
import { applicationService } from "@/lib/services/application-service"
import { renterStatusService } from "@/lib/services/renter-status-service"
import { toast } from "sonner"
import { MapDisplay } from "@/components/ui/map-display"
import { db } from "@/lib/firebase"

export function PropertyDetailsView({ property, actionButton, tabs, activeTab, setActiveTab, belowLocation, applications, leases, onApplicationStatusChange }: {
  property: any,
  actionButton?: ReactNode,
  tabs?: ReactNode,
  activeTab?: string,
  setActiveTab?: (tab: string) => void,
  belowLocation?: ReactNode,
  applications?: any[],
  leases?: any[],
  onApplicationStatusChange?: () => void
}) {
  const [renterStatuses, setRenterStatuses] = useState<any[]>([])

  // Fetch renter statuses for this property
  useEffect(() => {
    const fetchRenterStatuses = async () => {
      if (property?.id) {
        try {
          const statuses = await renterStatusService.getRenterStatusByProperty(property.id)
          setRenterStatuses(statuses)
        } catch (error) {
          console.error("Error fetching renter statuses:", error)
        }
      }
    }
    
    fetchRenterStatuses()
  }, [property?.id])
  const [selectedApplication, setSelectedApplication] = useState<any>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const formatAddress = (address: any) => {
    return `${address.street}${address.unit ? `, Unit ${address.unit}` : ""}, ${address.city}, ${address.state} ${address.postalCode}`
  }

  const handleApplicationAction = async (applicationId: string, action: 'approve' | 'reject') => {
    setIsProcessing(true)
    try {
      await applicationService.updateApplicationStatus(applicationId, action === 'approve' ? 'approved' : 'rejected')
      toast.success(`Application ${action === 'approve' ? 'approved' : 'rejected'} successfully`)
      
      // Trigger parent component refresh to update both applications and kanban board
      if (onApplicationStatusChange) {
        onApplicationStatusChange()
      }
    } catch (error) {
      toast.error(`Failed to ${action} application`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleViewLease = (lease: any) => {
    if (lease.url) {
      window.open(lease.url, '_blank')
    } else {
      toast.info("Lease PDF not available for viewing.")
    }
  }

  const handleDownloadLease = (lease: any) => {
    if (lease.url) {
      const link = document.createElement('a')
      link.href = lease.url
      link.download = lease.name || `lease_agreement_${lease.id}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success(`Downloading ${lease.name || 'lease agreement'}`)
    } else {
      toast.error("Lease PDF not available for download")
    }
  }

  // Check if accept/reject buttons should show for a lease
  const shouldShowLeaseActions = (lease: any) => {
    if (!lease.renterId && !lease.receiverEmail) return false
    
    const renterEmail = lease.renterId || lease.receiverEmail
    const renterStatus = renterStatuses.find(rs => rs.renterEmail === renterEmail)
    
    // Only show actions if renter status is "lease" (not accepted, lease_rejected, or higher)
    return renterStatus?.status === "lease"
  }

  const handleLeaseAction = async (lease: any, action: 'accept' | 'reject') => {
    setIsProcessing(true)
    try {
      // Update renter status based on action
      if (lease.renterId && property.id) {
        // Find the renter status entry
        const renterStatuses = await renterStatusService.getRenterStatusByProperty(property.id)
        const renterStatus = renterStatuses.find(rs => 
          rs.renterEmail === lease.renterId || rs.renterEmail === lease.receiverEmail
        )
        
        if (renterStatus && renterStatus.id) {
          let newStage: "invite" | "application" | "lease" | "lease_rejected" | "accepted" | "payment" | "leased"
          let notes: string
          
          if (action === 'accept') {
            // When landlord accepts a lease, move renter to "accepted" stage
            newStage = "accepted"
            notes = "Lease accepted by landlord"
          } else {
            // When landlord rejects a lease, keep in lease stage but mark as rejected
            newStage = "lease_rejected"
            notes = "Lease rejected by landlord"
          }
          
          await renterStatusService.updateRenterStatus(renterStatus.id, {
            status: newStage,
            leaseId: lease.id,
            notes: notes
          })
        }
      }
      
      // Update the lease document to mark it as reviewed by landlord
      try {
        const { doc, updateDoc, serverTimestamp } = await import("firebase/firestore")
        const leaseRef = doc(db, "filledLeases", lease.id)
        await updateDoc(leaseRef, {
          landlordReviewed: true,
          landlordReviewedAt: serverTimestamp(),
          landlordAction: action,
          status: action === 'accept' ? 'accepted' : 'rejected'
        })
      } catch (error) {
        console.error("Error updating lease document:", error)
        // Don't fail the whole operation if lease update fails
      }
      
      toast.success(`Lease ${action}ed successfully`)
      
      // Trigger parent component refresh
      if (onApplicationStatusChange) {
        onApplicationStatusChange()
      }
    } catch (error) {
      console.error(`Error ${action}ing lease:`, error)
      toast.error(`Failed to ${action} lease`)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold">{property.title || formatAddress(property.address)}</h1>
          {property.title && (
            <p className="text-muted-foreground mt-1">{formatAddress(property.address)}</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <Badge className="capitalize">{property.type}</Badge>
            <Badge variant={property.status === "available" ? "default" : "secondary"}>
              {property.status === "available"
                ? "Available"
                : property.status === "occupied"
                  ? "Occupied"
                  : "Maintenance"}
            </Badge>
          </div>
        </div>
        {actionButton && <div className="flex gap-2">{actionButton}</div>}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 lg:w-[600px]">
          <TabsTrigger value="details">Details</TabsTrigger>
          {tabs}
        </TabsList>
        <TabsContent value="details" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-3">
            {/* Main Content */}
            <div className="md:col-span-2 space-y-6">
              {/* Property Images */}
              <Card>
                <CardHeader>
                  <CardTitle>Property Images</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {property.images?.map((image: string, index: number) => (
                      <div key={index} className="aspect-video relative rounded-lg overflow-hidden bg-muted">
                        <img
                          src={image || "/placeholder.svg"}
                          alt={`Property ${index + 1}`}
                          className="object-cover w-full h-full"
                        />
                      </div>
                    ))}
                    {(!property.images || property.images.length === 0) && (
                      <div className="aspect-video bg-muted rounded-md flex items-center justify-center">
                        <p className="text-muted-foreground">No images available</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Property Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Property Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center gap-2">
                      <Home className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Type</p>
                        <p className="font-medium capitalize">{property.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Bed className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Bedrooms</p>
                        <p className="font-medium">{property.bedrooms}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Bath className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Bathrooms</p>
                        <p className="font-medium">{property.bathrooms}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Square className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Square Footage</p>
                        <p className="font-medium">{property.squareFeet?.toLocaleString?.() ?? 0}</p>
                      </div>
                    </div>
                  </div>

                  {property.description && (
                    <div className="mt-4">
                      <h4 className="font-medium mb-2">Description</h4>
                      <p className="text-muted-foreground">{property.description}</p>
                    </div>
                  )}

                  {property.amenities && property.amenities.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium mb-2">Amenities</h4>
                      <div className="flex flex-wrap gap-2">
                        {property.amenities.map((amenity: string) => (
                          <Badge key={amenity} variant="outline">
                            {amenity}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {property.petPolicy && (
                    <div className="mt-4">
                      <h4 className="font-medium mb-2">Pet Policy</h4>
                      <div className="space-y-1">
                        <p>
                          <span className="font-medium">Pets allowed:</span> {property.petPolicy.allowed ? "Yes" : "No"}
                        </p>
                        {property.petPolicy.allowed && (
                          <>
                            {property.petPolicy.restrictions && (
                              <p>
                                <span className="font-medium">Restrictions:</span> {property.petPolicy.restrictions}
                              </p>
                            )}
                            {property.petPolicy.petDeposit && (
                              <p>
                                <span className="font-medium">Pet deposit:</span> $
                                {property.petPolicy.petDeposit.toLocaleString()}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Rent Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Rent Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center">
                      {property.monthlyRent !== undefined ? (
                        <p className="text-3xl font-bold">${property.monthlyRent.toLocaleString()}</p>
                      ) : (
                        <p className="text-3xl font-bold text-muted-foreground">No rent info</p>
                      )}
                      <p className="text-muted-foreground">per month</p>
                    </div>
                    
                    <div className="space-y-2">
                      {property.securityDeposit && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Security Deposit:</span>
                          <span className="font-medium">${property.securityDeposit.toLocaleString()}</span>
                        </div>
                      )}
                      {property.applicationFee && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Application Fee:</span>
                          <span className="font-medium">${property.applicationFee.toLocaleString()}</span>
                        </div>
                      )}
                      {property.petPolicy?.fee && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Pet Deposit:</span>
                          <span className="font-medium">${property.petPolicy.fee.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Location */}
              <Card>
                <CardHeader>
                  <CardTitle>Location</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <p>{formatAddress(property.address)}</p>
                  </div>
                  {property.latitude && property.longitude ? (
                    <MapDisplay 
                      lat={property.latitude} 
                      lng={property.longitude} 
                      title={property.title}
                      address={formatAddress(property.address)}
                    />
                  ) : (
                    <div className="aspect-video bg-muted rounded-md flex items-center justify-center mt-4">
                      <p className="text-muted-foreground">Map will appear here</p>
                    </div>
                  )}
                </CardContent>
              </Card>
              {belowLocation}

              {/* Quick Actions */}
              {actionButton && (
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {actionButton}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="applications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Rental Applications</CardTitle>
            </CardHeader>
            <CardContent>
              {applications && applications.length > 0 ? (
                <div className="space-y-4">
                  {applications.map((application) => (
                    <div key={application.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{application.fullName}</h4>
                          <p className="text-sm text-muted-foreground">{application.renterEmail}</p>
                        </div>
                        <Badge variant={application.status === "approved" ? "default" : application.status === "rejected" ? "destructive" : "secondary"}>
                          {application.status || "pending"}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {application.employmentCompany && (
                          <div>
                            <span className="text-muted-foreground">Company:</span>
                            <p className="font-medium">{application.employmentCompany}</p>
                          </div>
                        )}
                        {application.employmentJobTitle && (
                          <div>
                            <span className="text-muted-foreground">Job Title:</span>
                            <p className="font-medium">{application.employmentJobTitle}</p>
                          </div>
                        )}
                        {application.employmentMonthlyIncome && (
                          <div>
                            <span className="text-muted-foreground">Monthly Income:</span>
                            <p className="font-medium">${application.employmentMonthlyIncome}</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="text-xs text-muted-foreground">
                        Submitted: {application.submittedAt ? new Date(application.submittedAt).toLocaleDateString() : "Unknown"}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => {
                          setSelectedApplication(application)
                          setIsViewDialogOpen(true)
                        }}>
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
                              <Check className="h-4 w-4 mr-2" />
                              {isProcessing ? "Processing..." : "Approve"}
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm" 
                              onClick={() => handleApplicationAction(application.id, 'reject')}
                              disabled={isProcessing}
                            >
                              <X className="h-4 w-4 mr-2" />
                              {isProcessing ? "Processing..." : "Reject"}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No applications found for this property.</p>
                  <p className="text-sm text-muted-foreground mt-2">Applications will appear here when renters apply.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leases" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Lease Agreements</CardTitle>
            </CardHeader>
            <CardContent>
              {leases && leases.length > 0 ? (
                <div className="space-y-4">
                  {leases.map((lease) => (
                    <div key={lease.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <h4 className="font-medium">{lease.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            Lease Agreement • Uploaded {lease.uploadedAt ? new Date(lease.uploadedAt).toLocaleDateString() : "N/A"}
                          </p>
                          {lease.renterId && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Sent to: {lease.renterId}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={lease.status === "completed" ? "default" : "secondary"}>
                          {lease.status || "Unknown"}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewLease(lease)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadLease(lease)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                        {(lease.status === "completed" || lease.status === "renter_completed") && 
                         shouldShowLeaseActions(lease) && (
                          <>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleLeaseAction(lease, 'accept')}
                              disabled={isProcessing}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Check className="h-4 w-4 mr-2" />
                              {isProcessing ? "Processing..." : "Accept"}
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleLeaseAction(lease, 'reject')}
                              disabled={isProcessing}
                            >
                              <X className="h-4 w-4 mr-2" />
                              {isProcessing ? "Processing..." : "Reject"}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Lease Agreements</h3>
                  <p className="text-muted-foreground">
                    No lease agreements have been created for this property yet.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {selectedApplication && (
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Application Details - {selectedApplication.fullName}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <h4 className="font-semibold text-lg">Personal Information</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <span className="text-sm text-muted-foreground">Full Name:</span>
                    <p className="font-medium">{selectedApplication.fullName || "N/A"}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Email:</span>
                    <p className="font-medium">{selectedApplication.renterEmail || "N/A"}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Phone:</span>
                    <p className="font-medium">{selectedApplication.phone || "N/A"}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Application ID:</span>
                    <p className="font-medium">{selectedApplication.id || "N/A"}</p>
                  </div>
                </div>
              </div>

              {/* Employment Information */}
              {selectedApplication.employmentCompany && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-lg">Employment Information</h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <span className="text-sm text-muted-foreground">Company:</span>
                      <p className="font-medium">{selectedApplication.employmentCompany}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Job Title:</span>
                      <p className="font-medium">{selectedApplication.employmentJobTitle || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Monthly Income:</span>
                      <p className="font-medium">${selectedApplication.employmentMonthlyIncome || "N/A"}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Applicants Information */}
              {selectedApplication.applicants && selectedApplication.applicants.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-lg">Applicants</h4>
                  <div className="space-y-4">
                    {selectedApplication.applicants.map((applicant: any, index: number) => (
                      <div key={index} className="border rounded-lg p-4">
                        <h5 className="font-medium mb-3">Applicant {index + 1}</h5>
                        <div className="grid gap-3 md:grid-cols-2">
                          <div>
                            <span className="text-sm text-muted-foreground">Name:</span>
                            <p className="font-medium">{applicant.name || "N/A"}</p>
                          </div>
                          <div>
                            <span className="text-sm text-muted-foreground">Date of Birth:</span>
                            <p className="font-medium">{applicant.dob || "N/A"}</p>
                          </div>
                          <div>
                            <span className="text-sm text-muted-foreground">SIN:</span>
                            <p className="font-medium">{applicant.sin || "N/A"}</p>
                          </div>
                          <div>
                            <span className="text-sm text-muted-foreground">Driver's License:</span>
                            <p className="font-medium">{applicant.dl || "N/A"}</p>
                          </div>
                          <div>
                            <span className="text-sm text-muted-foreground">Occupation:</span>
                            <p className="font-medium">{applicant.occupation || "N/A"}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Occupants Information */}
              {selectedApplication.occupants && selectedApplication.occupants.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-lg">Occupants</h4>
                  <div className="space-y-4">
                    {selectedApplication.occupants.map((occupant: any, index: number) => (
                      <div key={index} className="border rounded-lg p-4">
                        <h5 className="font-medium mb-3">Occupant {index + 1}</h5>
                        <div className="grid gap-3 md:grid-cols-3">
                          <div>
                            <span className="text-sm text-muted-foreground">Name:</span>
                            <p className="font-medium">{occupant.name || "N/A"}</p>
                          </div>
                          <div>
                            <span className="text-sm text-muted-foreground">Relationship:</span>
                            <p className="font-medium">{occupant.relationship || "N/A"}</p>
                          </div>
                          <div>
                            <span className="text-sm text-muted-foreground">Age:</span>
                            <p className="font-medium">{occupant.age || "N/A"}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Employment History */}
              {selectedApplication.employments && selectedApplication.employments.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-lg">Employment History</h4>
                  <div className="space-y-4">
                    {selectedApplication.employments.map((employment: any, index: number) => (
                      <div key={index} className="border rounded-lg p-4">
                        <h5 className="font-medium mb-3">Employment {index + 1}</h5>
                        <div className="grid gap-3 md:grid-cols-2">
                          <div>
                            <span className="text-sm text-muted-foreground">Employer:</span>
                            <p className="font-medium">{employment.employer || "N/A"}</p>
                          </div>
                          <div>
                            <span className="text-sm text-muted-foreground">Position:</span>
                            <p className="font-medium">{employment.position || "N/A"}</p>
                          </div>
                          <div>
                            <span className="text-sm text-muted-foreground">Address:</span>
                            <p className="font-medium">{employment.address || "N/A"}</p>
                          </div>
                          <div>
                            <span className="text-sm text-muted-foreground">Phone:</span>
                            <p className="font-medium">{employment.phone || "N/A"}</p>
                          </div>
                          <div>
                            <span className="text-sm text-muted-foreground">Length of Employment:</span>
                            <p className="font-medium">{employment.length || "N/A"}</p>
                          </div>
                          <div>
                            <span className="text-sm text-muted-foreground">Supervisor:</span>
                            <p className="font-medium">{employment.supervisor || "N/A"}</p>
                          </div>
                          <div>
                            <span className="text-sm text-muted-foreground">Salary:</span>
                            <p className="font-medium">${employment.salary || "N/A"}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* References */}
              {selectedApplication.references && selectedApplication.references.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-lg">References</h4>
                  <div className="space-y-4">
                    {selectedApplication.references.map((reference: any, index: number) => (
                      <div key={index} className="border rounded-lg p-4">
                        <h5 className="font-medium mb-3">Reference {index + 1}</h5>
                        <div className="grid gap-3 md:grid-cols-2">
                          <div>
                            <span className="text-sm text-muted-foreground">Name:</span>
                            <p className="font-medium">{reference.name || "N/A"}</p>
                          </div>
                          <div>
                            <span className="text-sm text-muted-foreground">Occupation:</span>
                            <p className="font-medium">{reference.occupation || "N/A"}</p>
                          </div>
                          <div>
                            <span className="text-sm text-muted-foreground">Address:</span>
                            <p className="font-medium">{reference.address || "N/A"}</p>
                          </div>
                          <div>
                            <span className="text-sm text-muted-foreground">Phone:</span>
                            <p className="font-medium">{reference.phone || "N/A"}</p>
                          </div>
                          <div>
                            <span className="text-sm text-muted-foreground">Length Known:</span>
                            <p className="font-medium">{reference.length || "N/A"}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Vehicles */}
              {selectedApplication.autos && selectedApplication.autos.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-lg">Vehicles</h4>
                  <div className="space-y-4">
                    {selectedApplication.autos.map((auto: any, index: number) => (
                      <div key={index} className="border rounded-lg p-4">
                        <h5 className="font-medium mb-3">Vehicle {index + 1}</h5>
                        <div className="grid gap-3 md:grid-cols-2">
                          <div>
                            <span className="text-sm text-muted-foreground">Make:</span>
                            <p className="font-medium">{auto.make || "N/A"}</p>
                          </div>
                          <div>
                            <span className="text-sm text-muted-foreground">Model:</span>
                            <p className="font-medium">{auto.model || "N/A"}</p>
                          </div>
                          <div>
                            <span className="text-sm text-muted-foreground">Year:</span>
                            <p className="font-medium">{auto.year || "N/A"}</p>
                          </div>
                          <div>
                            <span className="text-sm text-muted-foreground">License Plate:</span>
                            <p className="font-medium">{auto.licence || "N/A"}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Current Address */}
              {selectedApplication.currentAddress && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-lg">Current Address</h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <span className="text-sm text-muted-foreground">Street:</span>
                      <p className="font-medium">{selectedApplication.currentAddress.street || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">City:</span>
                      <p className="font-medium">{selectedApplication.currentAddress.city || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Province:</span>
                      <p className="font-medium">{selectedApplication.currentAddress.province || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Postal Code:</span>
                      <p className="font-medium">{selectedApplication.currentAddress.postalCode || "N/A"}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Previous Residences */}
              {selectedApplication.residences && selectedApplication.residences.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-lg">Previous Residences</h4>
                  <div className="space-y-4">
                    {selectedApplication.residences.map((residence: any, index: number) => (
                      <div key={index} className="border rounded-lg p-4">
                        <h5 className="font-medium mb-3">Residence {index + 1}</h5>
                        <div className="grid gap-3 md:grid-cols-2">
                          <div>
                            <span className="text-sm text-muted-foreground">Address:</span>
                            <p className="font-medium">{residence.address || "N/A"}</p>
                          </div>
                          <div>
                            <span className="text-sm text-muted-foreground">Landlord:</span>
                            <p className="font-medium">{residence.landlord || "N/A"}</p>
                          </div>
                          <div>
                            <span className="text-sm text-muted-foreground">From:</span>
                            <p className="font-medium">{residence.from || "N/A"}</p>
                          </div>
                          <div>
                            <span className="text-sm text-muted-foreground">To:</span>
                            <p className="font-medium">{residence.to || "N/A"}</p>
                          </div>
                          <div>
                            <span className="text-sm text-muted-foreground">Phone:</span>
                            <p className="font-medium">{residence.phone || "N/A"}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Attachments */}
              {selectedApplication.attachments && selectedApplication.attachments.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-lg">Attachments</h4>
                  <div className="space-y-2">
                    {selectedApplication.attachments.map((attachment: string, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <span className="font-medium">Attachment {index + 1}</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(attachment, '_blank')}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Application Status */}
              <div className="space-y-4 border-t pt-4">
                <h4 className="font-semibold text-lg">Application Status</h4>
                <div className="flex items-center gap-2">
                  <Badge variant={selectedApplication.status === "approved" ? "default" : "secondary"}>
                    {selectedApplication.status || "Submitted"}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Submitted on {selectedApplication.submittedAt ? new Date(selectedApplication.submittedAt).toLocaleDateString() : "N/A"}
                  </span>
                </div>
              </div>

              {/* Signatures */}
              <div className="space-y-4 border-t pt-4">
                <h4 className="font-semibold text-lg">Signatures</h4>
                <div className="space-y-4">
                  {selectedApplication.signatures && selectedApplication.signatures.length > 0 ? (
                    <div className="space-y-4">
                      {selectedApplication.signatures.map((signature: string, index: number) => (
                        <div key={index} className="border rounded-lg p-4">
                          <h5 className="font-medium mb-3">Signature {index + 1}</h5>
                          <div className="flex items-center gap-4">
                            <div className="border rounded-lg p-2 bg-white">
                              <img 
                                src={signature} 
                                alt={`Signature ${index + 1}`}
                                className="max-w-xs max-h-32 object-contain"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  target.nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                              <div className="hidden text-sm text-muted-foreground mt-2">
                                Invalid signature image
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No signatures found</p>
                    </div>
                  )}
                  
                  {selectedApplication.signatureNotes && (
                    <div>
                      <span className="text-sm text-muted-foreground">Signature Notes:</span>
                      <p className="text-sm mt-1">{selectedApplication.signatureNotes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                  Close
                </Button>
                {selectedApplication.status !== "approved" && selectedApplication.status !== "rejected" && (
                  <>
                    <Button 
                      variant="default" 
                      onClick={async () => {
                        await handleApplicationAction(selectedApplication.id, 'approve')
                        setIsViewDialogOpen(false)
                      }}
                      disabled={isProcessing}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      {isProcessing ? "Processing..." : "Approve Application"}
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={async () => {
                        await handleApplicationAction(selectedApplication.id, 'reject')
                        setIsViewDialogOpen(false)
                      }}
                      disabled={isProcessing}
                    >
                      <X className="h-4 w-4 mr-2" />
                      {isProcessing ? "Processing..." : "Reject Application"}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
} 