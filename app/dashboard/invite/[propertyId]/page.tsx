"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { 
  ArrowLeft, 
  User, 
  FileText, 
  Download, 
  Eye, 
  Calendar, 
  Home,
  Mail,
  Phone,
  MapPin,
  GripVertical,
  CheckCircle,
  AlertCircle
} from "lucide-react"
import { useAuth } from "@/lib/auth"
import { propertyService } from "@/lib/services/property-service"
import { invitationService } from "@/lib/services/invitation-service"
import { applicationService } from "@/lib/services/application-service"
import { leaseService } from "@/lib/services/lease-service"
import { renterStatusService, type RenterStatus } from "@/lib/services/renter-status-service"
import { documentService, type DocumentData } from "@/lib/services/document-service"
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { toast } from "sonner"

const stages = [
  { id: "invite", title: "Invite", color: "bg-blue-100 text-blue-700" },
  { id: "application", title: "Rental Application", color: "bg-yellow-100 text-yellow-700" },
  { id: "lease", title: "Lease Agreement", color: "bg-purple-100 text-purple-700" },
  { id: "accepted", title: "Accepted", color: "bg-green-100 text-green-700" },
  { id: "payment", title: "Payment", color: "bg-orange-100 text-orange-700" },
  { id: "leased", title: "Leased", color: "bg-emerald-100 text-emerald-700" }
]

interface TenantData {
  id: string
  name: string
  email: string
  phone?: string
  profile?: {
    fullName?: string
    phone?: string
    dateOfBirth?: string
    emergencyContact?: {
      name?: string
      phone?: string
      relationship?: string
    }
    employment?: {
      employer?: string
      position?: string
      income?: number
    }
    references?: Array<{
      name?: string
      phone?: string
      relationship?: string
    }>
  }
}

interface LeaseData {
  id: string
  propertyId: string
  renterId: string
  landlordId: string
  status: string
  startDate: Date
  endDate: Date
  monthlyRent: number
  securityDeposit: number
  renterEmail: string
  createdAt: Date
  applicationId?: string
  leaseTerms?: any
  signatureStatus?: any
}

export default function FindTenantsPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [property, setProperty] = useState<any>(null)
  const [renterStatuses, setRenterStatuses] = useState<RenterStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [draggedItem, setDraggedItem] = useState<string | null>(null)
  const [selectedTenant, setSelectedTenant] = useState<RenterStatus | null>(null)
  const [isTenantModalOpen, setIsTenantModalOpen] = useState(false)
  const [tenantData, setTenantData] = useState<TenantData | null>(null)
  const [leaseData, setLeaseData] = useState<LeaseData | null>(null)
  const [documents, setDocuments] = useState<DocumentData[]>([])
  const [application, setApplication] = useState<any>(null)
  const [tenantLoading, setTenantLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("application")

  useEffect(() => {
    async function fetchData() {
      if (!params.propertyId || !user) return

      try {
        setLoading(true)
        
        // Fetch property details
        const propertyData = await propertyService.getProperty(params.propertyId as string)
        setProperty(propertyData)

        // Fetch renter statuses for this property
        const statuses = await renterStatusService.getRenterStatusByProperty(params.propertyId as string)
        setRenterStatuses(statuses)

        // If no renter statuses exist, sync from existing data
        if (statuses.length === 0) {
          await syncExistingData()
        }
      } catch (error) {
        console.error("Error fetching tenant data:", error)
        toast.error("Failed to load tenant data")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [params.propertyId, user])

  const syncExistingData = async () => {
    try {
      // First, clean up existing renter statuses for this property to avoid duplicates
      const existingStatuses = await renterStatusService.getRenterStatusByProperty(params.propertyId as string)
      
      // Delete all existing statuses to rebuild from scratch
      for (const status of existingStatuses) {
        if (status.id) {
          await renterStatusService.deleteRenterStatus(status.id)
        }
      }

      // Fetch existing invitations, applications, and leases
      const invitations = await invitationService.getPropertyInvitations(params.propertyId as string)
      const applications = await applicationService.getApplicationsByProperty(params.propertyId as string)
      const leases = await leaseService.getLandlordLeases(user!.id)
      const propertyLeases = leases.filter(lease => 
        lease.propertyId === params.propertyId && lease.status === "active"
      )

      const newStatuses: RenterStatus[] = []

      // Create status entries from invitations (only accepted ones show in invite stage)
      for (const invitation of invitations) {
        // Only process accepted invitations for the kanban board
        if (invitation.status === "accepted") {
          const statusData = {
            propertyId: params.propertyId as string,
            landlordId: user!.id,
            renterEmail: invitation.renterEmail,
            renterName: invitation.renterEmail.split('@')[0],
            status: "invite" as const, // Accepted invitations show in invite stage
            invitationId: invitation.id,
            notes: `Invitation accepted - ${invitation.renterEmail}`
          }
          const statusId = await renterStatusService.createRenterStatus(statusData)
          newStatuses.push({ ...statusData, id: statusId, createdAt: new Date(), updatedAt: new Date() })
        }
        // Skip pending/rejected invitations - they won't appear on the kanban board
      }

      // Create status entries from applications
      for (const application of applications) {
        const statusData = {
          propertyId: params.propertyId as string,
          landlordId: user!.id,
          renterEmail: (application as any).renterEmail || "applicant@example.com",
          renterName: (application as any).renterEmail?.split('@')[0] || (application as any).fullName?.split(' ')[0] || "Applicant",
          status: ((application as any).status === "approved" ? "lease" : "application") as "invite" | "application" | "lease" | "accepted" | "payment" | "leased",
          applicationId: application.id,
          notes: (application as any).status || "Application submitted"
        }
        const statusId = await renterStatusService.createRenterStatus(statusData)
        newStatuses.push({ ...statusData, id: statusId, createdAt: new Date(), updatedAt: new Date() })
      }

      // Create status entries from leases
      for (const lease of propertyLeases) {
        const statusData = {
          propertyId: params.propertyId as string,
          landlordId: user!.id,
          renterEmail: lease.renterId || "tenant@example.com",
          renterName: lease.renterId?.split('@')[0] || "Tenant",
          status: "leased" as const,
          leaseId: lease.id,
          notes: "Active lease"
        }
        const statusId = await renterStatusService.createRenterStatus(statusData)
        newStatuses.push({ ...statusData, id: statusId, createdAt: new Date(), updatedAt: new Date() })
      }

      setRenterStatuses(newStatuses)
    } catch (error) {
      console.error("Error syncing existing data:", error)
    }
  }

  const handleTenantClick = async (renter: RenterStatus) => {
    setSelectedTenant(renter)
    setIsTenantModalOpen(true)
    setTenantLoading(true)
    setActiveTab("application")

    try {
      // Fetch tenant data
      const isEmail = renter.renterEmail.includes('@')
      
      if (isEmail) {
        // Try to get user by email from the users collection
        const usersQuery = query(collection(db, "users"), where("email", "==", renter.renterEmail))
        const userSnapshot = await getDocs(usersQuery)
        
        if (!userSnapshot.empty) {
          const userDoc = userSnapshot.docs[0]
          const userData = userDoc.data()
          
          setTenantData({
            id: userDoc.id,
            name: userData.name || userData.email || "Unknown",
            email: userData.email || renter.renterEmail,
            phone: userData.phone || "",
            profile: userData.profile || {}
          })
        } else {
          // Create tenant data from email
          setTenantData({
            id: renter.renterEmail,
            name: renter.renterName || renter.renterEmail.split('@')[0] || "Unknown",
            email: renter.renterEmail,
            phone: "",
            profile: {}
          })
        }
      } else {
        // If renterEmail is a user ID, fetch directly
        const tenantDoc = await getDoc(doc(db, "users", renter.renterEmail))
        if (tenantDoc.exists()) {
          const tenantData = tenantDoc.data()
          setTenantData({
            id: tenantDoc.id,
            name: tenantData.name || tenantData.email || "Unknown",
            email: tenantData.email || "",
            phone: tenantData.phone || "",
            profile: tenantData.profile || {}
          })
        } else {
          setTenantData({
            id: renter.renterEmail,
            name: renter.renterName || "Unknown",
            email: renter.renterEmail,
            phone: "",
            profile: {}
          })
        }
      }

      // Fetch lease data if available
      if (renter.leaseId) {
        try {
          const lease = await leaseService.getLease(renter.leaseId)
          if (lease) {
            const leaseData: LeaseData = {
              id: lease.id,
              propertyId: lease.propertyId,
              renterId: lease.renterId,
              landlordId: lease.landlordId,
              status: lease.status,
              startDate: lease.startDate,
              endDate: lease.endDate,
              monthlyRent: lease.monthlyRent,
              securityDeposit: lease.securityDeposit,
              renterEmail: lease.renterId,
              createdAt: lease.createdAt,
              applicationId: lease.applicationId,
              leaseTerms: lease.leaseTerms,
              signatureStatus: lease.signatureStatus
            }
            setLeaseData(leaseData)
          }
        } catch (error) {
          console.error("Error fetching lease:", error)
        }
      }

      // Fetch application data if available
      if (renter.applicationId) {
        try {
          const applicationData = await applicationService.getApplication(renter.applicationId)
          setApplication(applicationData)
        } catch (error) {
          console.error("Error fetching application:", error)
        }
      } else if (renter.renterEmail) {
        // If no applicationId, try to find application by renter email
        try {
          const applicationsByEmail = await applicationService.getApplicationsByRenterEmail(renter.renterEmail)
          const propertyApplication = applicationsByEmail.find((app: any) => app.propertyId === params.propertyId)
          if (propertyApplication) {
            setApplication(propertyApplication)
          }
        } catch (error) {
          console.error("Error fetching application by email:", error)
        }
      }

      // Fetch documents
      try {
        const propertyDocuments = await documentService.getPropertyDocuments(params.propertyId as string)
        setDocuments(propertyDocuments)
      } catch (error) {
        console.error("Error fetching documents:", error)
        setDocuments([])
      }

    } catch (error) {
      console.error("Error fetching tenant details:", error)
      toast.error("Failed to load tenant details")
    } finally {
      setTenantLoading(false)
    }
  }

  const handleDragStart = (e: React.DragEvent, statusId: string) => {
    setDraggedItem(statusId)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleDrop = async (e: React.DragEvent, targetStage: string) => {
    e.preventDefault()
    
    if (!draggedItem) return

    try {
      // Update the status in the database
      await renterStatusService.moveRenterToStage(draggedItem, targetStage as any)
      
      // Update local state
      setRenterStatuses(prev => 
        prev.map(status => 
          status.id === draggedItem 
            ? { ...status, status: targetStage as any, updatedAt: new Date() }
            : status
        )
      )

      toast.success("Renter moved successfully")
    } catch (error) {
      console.error("Error moving renter:", error)
      toast.error("Failed to move renter")
    } finally {
      setDraggedItem(null)
    }
  }

  const getPropertyAddress = (property: any) => {
    const addr = property.address
    return `${addr.street}${addr.unit ? `, Unit ${addr.unit}` : ""}, ${addr.city}, ${addr.state}`
  }

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      application: "Rental Application",
      lease: "Lease Agreement", 
      id: "Government ID",
      income: "Income Verification",
      reference: "Reference Letter",
      background: "Background Check",
      credit: "Credit Report"
    }
    return labels[type] || type
  }

  const getDocumentStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
      case "completed":
      case "verified":
        return <Badge variant="default" className="bg-green-100 text-green-700 border-green-200">Approved</Badge>
      case "pending":
        return <Badge variant="secondary">Pending</Badge>
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const handleViewDocument = (doc: DocumentData) => {
    if (doc.url && doc.url !== "#") {
      window.open(doc.url, '_blank')
    } else {
      toast.info(`Viewing ${doc.name}`)
    }
  }

  const handleDownloadDocument = (doc: DocumentData) => {
    if (doc.url && doc.url !== "#") {
      const link = document.createElement('a')
      link.href = doc.url
      link.download = doc.name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success(`Downloading ${doc.name}`)
    } else {
      toast.error("Document not available for download")
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  if (!property) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Property not found</h2>
          <p className="text-muted-foreground">The property you're looking for doesn't exist.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Find Tenants</h1>
          <p className="text-muted-foreground">{property.title || property.address?.street}</p>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {stages.map((stage) => {
          let stageRenters = renterStatuses.filter(status => {
            // For lease stage, include both "lease" and "lease_rejected" statuses
            if (stage.id === "lease") {
              return status.status === "lease" || status.status === "lease_rejected"
            }
            return status.status === stage.id
          })
          
          // For invite stage, only show renters with accepted invitations
          if (stage.id === "invite") {
            stageRenters = stageRenters.filter(status => {
              // Only show if there's an invitationId and the notes indicate acceptance
              return status.invitationId && 
                     (status.notes?.includes("accepted") || status.notes?.includes("Invitation accepted"))
            })
          }
          
          // Filter out renters who have progressed to later stages
          // Each email should only appear in the furthest stage they've reached
          stageRenters = stageRenters.filter(status => {
            const currentStageIndex = stages.findIndex(s => s.id === stage.id)
            
            // Check if this renter has progressed to any later stage
            const hasLaterStage = renterStatuses.some(otherStatus => {
              if (otherStatus.renterEmail !== status.renterEmail) return false
              
              const otherStageIndex = stages.findIndex(s => s.id === otherStatus.status)
              return otherStageIndex > currentStageIndex
            })
            
            // Only show if this is the furthest stage for this renter
            return !hasLaterStage
          })
          
          return (
            <Card 
              key={stage.id} 
              className="h-fit"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">{stage.title}</CardTitle>
                  <Badge className={`text-xs ${stage.color}`}>
                    {stageRenters.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {stageRenters.map((renter) => (
                  <Card 
                    key={renter.id} 
                    className={`p-3 cursor-pointer hover:shadow-md transition-shadow ${
                      renter.status === "lease_rejected" ? "border-red-500 bg-red-50" : ""
                    }`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, renter.id!)}
                    onClick={() => handleTenantClick(renter)}
                  >
                    <div className="flex items-start gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <Avatar className="h-8 w-8">
                        <AvatarImage src="" />
                        <AvatarFallback className="text-xs">
                          {renter.renterName?.charAt(0).toUpperCase() || "T"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{renter.renterName}</p>
                          {renter.status === "lease_rejected" && (
                            <Badge variant="destructive" className="text-xs">Rejected</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{renter.renterEmail}</p>
                        {renter.notes && (
                          <p className="text-xs text-muted-foreground mt-1">{renter.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 mt-2">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {new Date(renter.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </Card>
                ))}
                
                {stageRenters.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground">
                    <p className="text-xs">No tenants</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            {stages.map((stage) => {
              let stageRenters = renterStatuses.filter(status => {
                // For lease stage, include both "lease" and "lease_rejected" statuses
                if (stage.id === "lease") {
                  return status.status === "lease" || status.status === "lease_rejected"
                }
                return status.status === stage.id
              })
              
              // Apply the same filtering logic as the kanban board
              if (stage.id === "invite") {
                stageRenters = stageRenters.filter(status => {
                  // Only show if there's an invitationId and the notes indicate acceptance
                  return status.invitationId && 
                         (status.notes?.includes("accepted") || status.notes?.includes("Invitation accepted"))
                })
              }
              
              // Filter out renters who have progressed to later stages (same logic as kanban board)
              stageRenters = stageRenters.filter(status => {
                const currentStageIndex = stages.findIndex(s => s.id === stage.id)
                
                // Check if this renter has progressed to any later stage
                const hasLaterStage = renterStatuses.some(otherStatus => {
                  if (otherStatus.renterEmail !== status.renterEmail) return false
                  
                  const otherStageIndex = stages.findIndex(s => s.id === otherStatus.status)
                  return otherStageIndex > currentStageIndex
                })
                
                // Only show if this is the furthest stage for this renter
                return !hasLaterStage
              })
              
              const count = stageRenters.length
              return (
                <div key={stage.id} className="text-center">
                  <div className={`text-2xl font-bold ${stage.color.split(' ')[0]}`}>
                    {count}
                  </div>
                  <div className="text-xs text-muted-foreground">{stage.title}</div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Tenant Profile Modal */}
      <Dialog open={isTenantModalOpen} onOpenChange={setIsTenantModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Tenant Profile - {selectedTenant?.renterName}
            </DialogTitle>
          </DialogHeader>
          
          {tenantLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Property and Tenant Info */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Property Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Home className="h-5 w-5" />
                      Property Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-lg">{getPropertyAddress(property)}</h3>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className="capitalize">{property.type}</Badge>
                        <Badge variant="secondary">Occupied</Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Monthly Rent:</span>
                        <p className="font-semibold">${property.monthlyRent?.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Security Deposit:</span>
                        <p className="font-semibold">${property.securityDeposit?.toLocaleString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Tenant Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Tenant Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-lg">{tenantData?.name || "Unknown Tenant"}</h3>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="default">Active Tenant</Badge>
                        <Badge variant="outline">Lease Active</Badge>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{tenantData?.email || "N/A"}</span>
                      </div>
                      {tenantData?.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{tenantData.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>Lease: {leaseData?.startDate ? leaseData.startDate.toLocaleDateString() : "N/A"} - {leaseData?.endDate ? leaseData.endDate.toLocaleDateString() : "N/A"}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="application">Rental Application</TabsTrigger>
                  <TabsTrigger value="documents">Documents</TabsTrigger>
                  <TabsTrigger value="lease">Lease Details</TabsTrigger>
                </TabsList>

                {/* Rental Application Tab */}
                <TabsContent value="application" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Rental Application Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {application ? (
                        <div className="space-y-6">
                          {/* Personal Information */}
                          <div className="space-y-4">
                            <h4 className="font-semibold text-lg">Personal Information</h4>
                            <div className="grid gap-4 md:grid-cols-2">
                              <div>
                                <span className="text-sm text-muted-foreground">Full Name:</span>
                                <p className="font-medium">{application.fullName || "N/A"}</p>
                              </div>
                              <div>
                                <span className="text-sm text-muted-foreground">Email:</span>
                                <p className="font-medium">{application.renterEmail || "N/A"}</p>
                              </div>
                              <div>
                                <span className="text-sm text-muted-foreground">Phone:</span>
                                <p className="font-medium">{application.phone || "N/A"}</p>
                              </div>
                              <div>
                                <span className="text-sm text-muted-foreground">Application ID:</span>
                                <p className="font-medium">{application.id || "N/A"}</p>
                              </div>
                            </div>
                          </div>

                          {/* Employment Information */}
                          {application.employmentCompany && (
                            <div className="space-y-4">
                              <h4 className="font-semibold text-lg">Employment Information</h4>
                              <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                  <span className="text-sm text-muted-foreground">Company:</span>
                                  <p className="font-medium">{application.employmentCompany}</p>
                                </div>
                                <div>
                                  <span className="text-sm text-muted-foreground">Job Title:</span>
                                  <p className="font-medium">{application.employmentJobTitle || "N/A"}</p>
                                </div>
                                <div>
                                  <span className="text-sm text-muted-foreground">Monthly Income:</span>
                                  <p className="font-medium">${application.employmentMonthlyIncome || "N/A"}</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Application Status */}
                          <div className="space-y-4">
                            <h4 className="font-semibold text-lg">Application Status</h4>
                            <div className="flex items-center gap-2">
                              <Badge variant={application.status === "approved" ? "default" : "secondary"}>
                                {application.status || "Submitted"}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                Submitted on {application.submittedAt ? new Date(application.submittedAt).toLocaleDateString() : "N/A"}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <h3 className="text-lg font-medium mb-2">No Application Found</h3>
                          <p className="text-muted-foreground">
                            No rental application has been submitted for this property.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Documents Tab */}
                <TabsContent value="documents" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Submitted Documents</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {documents.length > 0 ? (
                          documents.map((document) => (
                            <div key={document.id} className="flex items-center justify-between p-4 border rounded-lg">
                              <div className="flex items-center gap-4">
                                <FileText className="h-5 w-5 text-muted-foreground" />
                                <div>
                                  <h4 className="font-medium">{document.name}</h4>
                                  <p className="text-sm text-muted-foreground">
                                    {getDocumentTypeLabel(document.type)} • Uploaded {document.uploadedAt.toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {getDocumentStatusBadge(document.status)}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewDocument(document)}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDownloadDocument(document)}
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  Download
                                </Button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8">
                            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-medium mb-2">No Documents Available</h3>
                            <p className="text-muted-foreground">
                              No documents have been uploaded for this property yet.
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Lease Details Tab */}
                <TabsContent value="lease" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Lease Agreement Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-4">
                          <h4 className="font-semibold">Lease Information</h4>
                          <div className="space-y-3">
                            <div>
                              <span className="text-sm text-muted-foreground">Lease ID:</span>
                              <p className="font-medium">{leaseData?.id || "N/A"}</p>
                            </div>
                            <div>
                              <span className="text-sm text-muted-foreground">Status:</span>
                              <div className="flex items-center gap-2 mt-1">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <Badge variant="default">Active</Badge>
                              </div>
                            </div>
                            <div>
                              <span className="text-sm text-muted-foreground">Start Date:</span>
                              <p className="font-medium">{leaseData?.startDate ? leaseData.startDate.toLocaleDateString() : "N/A"}</p>
                            </div>
                            <div>
                              <span className="text-sm text-muted-foreground">End Date:</span>
                              <p className="font-medium">{leaseData?.endDate ? leaseData.endDate.toLocaleDateString() : "N/A"}</p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h4 className="font-semibold">Financial Terms</h4>
                          <div className="space-y-3">
                            <div>
                              <span className="text-sm text-muted-foreground">Monthly Rent:</span>
                              <p className="font-medium text-lg">${leaseData?.monthlyRent?.toLocaleString() || "0"}</p>
                            </div>
                            <div>
                              <span className="text-sm text-muted-foreground">Security Deposit:</span>
                              <p className="font-medium">${leaseData?.securityDeposit?.toLocaleString() || "0"}</p>
                            </div>
                            <div>
                              <span className="text-sm text-muted-foreground">Total Lease Value:</span>
                              <p className="font-medium">${((leaseData?.monthlyRent || 0) * 12).toLocaleString()}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {leaseData?.applicationId && (
                        <div className="border-t pt-6">
                          <h4 className="font-semibold mb-4">Lease Application</h4>
                          <div className="flex items-center gap-4">
                            <FileText className="h-8 w-8 text-muted-foreground" />
                            <div className="flex-1">
                              <p className="font-medium">Lease Application</p>
                              <p className="text-sm text-muted-foreground">
                                Application ID: {leaseData.applicationId}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4 mr-2" />
                                View
                              </Button>
                              <Button variant="outline" size="sm">
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
} 