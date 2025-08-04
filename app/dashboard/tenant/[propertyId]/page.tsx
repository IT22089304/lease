"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, User, FileText, Download, Eye, Calendar, Home, Mail, Phone, MapPin, CheckCircle, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/lib/auth"
import { useRouter, useParams } from "next/navigation"
import { propertyService } from "@/lib/services/property-service"
import { leaseService } from "@/lib/services/lease-service"
import { userService } from "@/lib/services/user-service"
import { applicationService } from "@/lib/services/application-service"
import { documentService, type DocumentData } from "@/lib/services/document-service"
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Property } from "@/types"
import { toast } from "sonner"

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



export default function TenantDetailsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const propertyId = params.propertyId as string
  
  const [property, setProperty] = useState<Property | null>(null)
  const [tenant, setTenant] = useState<TenantData | null>(null)
  const [lease, setLease] = useState<LeaseData | null>(null)
  const [documents, setDocuments] = useState<DocumentData[]>([])
  const [application, setApplication] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("application")

  useEffect(() => {
    async function fetchData() {
      if (!user?.id || !propertyId) return
      
      try {
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

        // Fetch active lease for this property
        const landlordLeases = await leaseService.getLandlordLeases(user.id)
        console.log("All landlord leases:", landlordLeases)
        
        // Look for any lease for this property (not just active)
        const propertyLease = landlordLeases.find(lease => 
          lease.propertyId === propertyId
        )
        
        console.log("Property lease found:", propertyLease)
        
        if (propertyLease) {
          // Convert Lease to LeaseData format
          const leaseData: LeaseData = {
            id: propertyLease.id,
            propertyId: propertyLease.propertyId,
            renterId: propertyLease.renterId,
            landlordId: propertyLease.landlordId,
            status: propertyLease.status,
            startDate: propertyLease.startDate,
            endDate: propertyLease.endDate,
            monthlyRent: propertyLease.monthlyRent,
            securityDeposit: propertyLease.securityDeposit,
            renterEmail: propertyLease.renterId, // Use renterId as email for now
            createdAt: propertyLease.createdAt,
            applicationId: propertyLease.applicationId,
            leaseTerms: propertyLease.leaseTerms,
            signatureStatus: propertyLease.signatureStatus
          }
          setLease(leaseData)
          
          // Fetch tenant data
          try {
            // Check if renterId is an email address
            const isEmail = propertyLease.renterId.includes('@')
            
            if (isEmail) {
              // If renterId is an email, we need to find the user by email
              console.log("RenterId is an email:", propertyLease.renterId)
              
              // Try to get user by email from the users collection
              const usersQuery = query(collection(db, "users"), where("email", "==", propertyLease.renterId))
              const userSnapshot = await getDocs(usersQuery)
              
              if (!userSnapshot.empty) {
                const userDoc = userSnapshot.docs[0]
                const userData = userDoc.data()
                console.log("Found user by email:", userData)
                
                setTenant({
                  id: userDoc.id,
                  name: userData.name || userData.email || "Unknown",
                  email: userData.email || propertyLease.renterId,
                  phone: userData.phone || "",
                  profile: userData.profile || {}
                })
              } else {
                console.log("No user found for email:", propertyLease.renterId)
                // Create tenant data from email
                setTenant({
                  id: propertyLease.renterId,
                  name: propertyLease.renterId.split('@')[0] || "Unknown",
                  email: propertyLease.renterId,
                  phone: "",
                  profile: {}
                })
              }
            } else {
              // If renterId is a user ID, fetch directly
              const tenantDoc = await getDoc(doc(db, "users", propertyLease.renterId))
              console.log("Tenant doc exists:", tenantDoc.exists())
              if (tenantDoc.exists()) {
                const tenantData = tenantDoc.data()
                console.log("Tenant data:", tenantData)
                setTenant({
                  id: tenantDoc.id,
                  name: tenantData.name || tenantData.email || "Unknown",
                  email: tenantData.email || "",
                  phone: tenantData.phone || "",
                  profile: tenantData.profile || {}
                })
              } else {
                console.log("No tenant document found for renterId:", propertyLease.renterId)
              }
            }
          } catch (error) {
            console.error("Error fetching tenant data:", error)
          }

                     // Fetch actual tenant documents
           try {
             const propertyDocuments = await documentService.getPropertyDocuments(propertyId)
             setDocuments(propertyDocuments)
           } catch (error) {
             console.error("Error fetching documents:", error)
             // Fallback to empty array if documents can't be fetched
             setDocuments([])
           }

                       // Fetch rental application
            try {
              const applications = await applicationService.getApplicationsForLandlord(user.id)
              console.log("All applications for landlord:", applications)
              console.log("Looking for propertyId:", propertyId)
              
              // Debug: Log each application's propertyId
              applications.forEach((app: any, index: number) => {
                console.log(`Application ${index}:`, {
                  id: app.id,
                  propertyId: app.propertyId,
                  fullName: app.fullName,
                  renterEmail: app.renterEmail,
                  status: app.status
                })
              })
              
              const propertyApplication = applications.find((app: any) => app.propertyId === propertyId)
              console.log("Found property application:", propertyApplication)
              if (propertyApplication) {
                setApplication(propertyApplication)
              }
            } catch (error) {
              console.error("Error fetching application:", error)
            }
        } else {
          console.log("No lease found for property:", propertyId)
          // Try to find any user associated with this property
          // This could be from notices, invoices, or other records
          try {
            // Check if there are any notices for this property that might have tenant info
            const { noticeService } = await import("@/lib/services/notice-service")
            const propertyNotices = await noticeService.getPropertyNotices(propertyId)
            const tenantNotices = propertyNotices.filter(notice => 
              notice.landlordId === user.id && 
              notice.renterId && 
              notice.renterId !== "test-renter"
            )
            
            console.log("Found tenant notices:", tenantNotices)
            
            if (tenantNotices.length > 0) {
              const tenantId = tenantNotices[0].renterId
              console.log("Found tenant from notices:", tenantId)
              
              // Check if tenantId is an email address
              const isEmail = tenantId.includes('@')
              
              if (isEmail) {
                // If tenantId is an email, find user by email
                const usersQuery = query(collection(db, "users"), where("email", "==", tenantId))
                const userSnapshot = await getDocs(usersQuery)
                
                if (!userSnapshot.empty) {
                  const userDoc = userSnapshot.docs[0]
                  const userData = userDoc.data()
                  console.log("Found user by email from notices:", userData)
                  
                  setTenant({
                    id: userDoc.id,
                    name: userData.name || userData.email || "Unknown",
                    email: userData.email || tenantId,
                    phone: userData.phone || "",
                    profile: userData.profile || {}
                  })
                  
                  // Create a mock lease for display purposes
                  const mockLease: LeaseData = {
                    id: "mock-lease",
                    propertyId: propertyId,
                    renterId: tenantId,
                    landlordId: user.id,
                    status: "active",
                    startDate: new Date(),
                    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
                    monthlyRent: propertyData.monthlyRent || 0,
                    securityDeposit: propertyData.securityDeposit || 0,
                    renterEmail: userData.email || tenantId,
                    createdAt: new Date()
                  }
                  setLease(mockLease)
                  
                  // Fetch actual documents
                  try {
                    const propertyDocuments = await documentService.getPropertyDocuments(propertyId)
                    setDocuments(propertyDocuments)
                  } catch (error) {
                    console.error("Error fetching documents:", error)
                    setDocuments([])
                  }

                  // Fetch rental application
                  try {
                    const applications = await applicationService.getApplicationsForLandlord(user.id)
                    console.log("All applications for landlord (branch 4):", applications)
                    console.log("Looking for propertyId (branch 4):", propertyId)
                    
                    // Debug: Log each application's propertyId
                    applications.forEach((app: any, index: number) => {
                      console.log(`Application ${index} (branch 4):`, {
                        id: app.id,
                        propertyId: app.propertyId,
                        fullName: app.fullName,
                        renterEmail: app.renterEmail,
                        status: app.status
                      })
                    })
                    
                    const propertyApplication = applications.find((app: any) => app.propertyId === propertyId)
                    console.log("Found property application (branch 4):", propertyApplication)
                    if (propertyApplication) {
                      setApplication(propertyApplication)
                    }
                  } catch (error) {
                    console.error("Error fetching application:", error)
                  }
                } else {
                  console.log("No user found for email from notices:", tenantId)
                  // Create tenant data from email
                  setTenant({
                    id: tenantId,
                    name: tenantId.split('@')[0] || "Unknown",
                    email: tenantId,
                    phone: "",
                    profile: {}
                  })
                  
                  // Create a mock lease for display purposes
                  const mockLease: LeaseData = {
                    id: "mock-lease",
                    propertyId: propertyId,
                    renterId: tenantId,
                    landlordId: user.id,
                    status: "active",
                    startDate: new Date(),
                    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
                    monthlyRent: propertyData.monthlyRent || 0,
                    securityDeposit: propertyData.securityDeposit || 0,
                    renterEmail: tenantId,
                    createdAt: new Date()
                  }
                  setLease(mockLease)
                  
                  // Fetch actual documents
                  try {
                    const propertyDocuments = await documentService.getPropertyDocuments(propertyId)
                    setDocuments(propertyDocuments)
                  } catch (error) {
                    console.error("Error fetching documents:", error)
                    setDocuments([])
                  }
                  
                  // Fetch rental application
                  try {
                    const applications = await applicationService.getApplicationsForLandlord(user.id)
                    const propertyApplication = applications.find((app: any) => app.propertyId === propertyId)
                    if (propertyApplication) {
                      setApplication(propertyApplication)
                    }
                  } catch (error) {
                    console.error("Error fetching application:", error)
                  }
                }
              } else {
                // If tenantId is a user ID, fetch directly
                const tenantDoc = await getDoc(doc(db, "users", tenantId))
                if (tenantDoc.exists()) {
                  const tenantData = tenantDoc.data()
                  console.log("Tenant data from notices:", tenantData)
                  setTenant({
                    id: tenantDoc.id,
                    name: tenantData.name || tenantData.email || "Unknown",
                    email: tenantData.email || "",
                    phone: tenantData.phone || "",
                    profile: tenantData.profile || {}
                  })
                  
                  // Create a mock lease for display purposes
                  const mockLease: LeaseData = {
                    id: "mock-lease",
                    propertyId: propertyId,
                    renterId: tenantId,
                    landlordId: user.id,
                    status: "active",
                    startDate: new Date(),
                    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
                    monthlyRent: propertyData.monthlyRent || 0,
                    securityDeposit: propertyData.securityDeposit || 0,
                    renterEmail: tenantData.email || "",
                    createdAt: new Date()
                  }
                  setLease(mockLease)
                  
                  // Set mock documents
                  const mockDocuments: DocumentData[] = [
                    {
                      id: "1",
                      type: "application",
                      name: "Rental Application",
                      url: "#",
                      uploadedAt: new Date(),
                      status: "approved"
                    },
                    {
                      id: "2", 
                      type: "lease",
                      name: "Signed Lease Agreement",
                      url: "#",
                      uploadedAt: new Date(),
                      status: "completed"
                    },
                    {
                      id: "3",
                      type: "id",
                      name: "Government ID",
                      url: "#", 
                      uploadedAt: new Date(),
                      status: "verified"
                    },
                    {
                      id: "4",
                      type: "income",
                      name: "Income Verification",
                      url: "#",
                      uploadedAt: new Date(),
                      status: "approved"
                    },
                    {
                      id: "5",
                      type: "reference",
                      name: "Reference Letter",
                      url: "#",
                      uploadedAt: new Date(),
                      status: "pending"
                    }
                  ]
                  setDocuments(mockDocuments)
                  
                                     // Fetch rental application
                   try {
                     const applications = await applicationService.getApplicationsForLandlord(user.id)
                     console.log("All applications for landlord (branch 2):", applications)
                     console.log("Looking for propertyId (branch 2):", propertyId)
                     
                     // Debug: Log each application's propertyId
                     applications.forEach((app: any, index: number) => {
                       console.log(`Application ${index} (branch 2):`, {
                         id: app.id,
                         propertyId: app.propertyId,
                         fullName: app.fullName,
                         renterEmail: app.renterEmail,
                         status: app.status
                       })
                     })
                     
                     const propertyApplication = applications.find((app: any) => app.propertyId === propertyId)
                     console.log("Found property application (branch 2):", propertyApplication)
                     if (propertyApplication) {
                       setApplication(propertyApplication)
                     }
                   } catch (error) {
                     console.error("Error fetching application:", error)
                   }
                } else {
                  console.log("No tenant document found for renterId from notices:", tenantId)
                }
              }
            } else {
              console.log("No tenant notices found for property:", propertyId)
            }
          } catch (error) {
            console.error("Error trying to find tenant from notices:", error)
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error)
        toast.error("Failed to load tenant details")
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [user?.id, propertyId, router])

  const getPropertyAddress = (property: Property) => {
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

  if (!user || user.role !== "landlord") {
    return <div>Access denied. Landlord access required.</div>
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

  if (!lease && !tenant) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold">No Tenant Information</h2>
          <p className="text-muted-foreground">This property doesn't have any tenant information available.</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => router.push("/dashboard")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => router.push("/dashboard")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>

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
                <h3 className="font-semibold text-lg">{tenant?.name || "Unknown Tenant"}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="default">Active Tenant</Badge>
                  <Badge variant="outline">Lease Active</Badge>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{tenant?.email || "N/A"}</span>
                </div>
                {tenant?.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{tenant.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Lease: {lease?.startDate ? lease.startDate.toLocaleDateString() : "N/A"} - {lease?.endDate ? lease.endDate.toLocaleDateString() : "N/A"}</span>
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

                     {/* Applicants Information */}
                     {application.applicants && application.applicants.length > 0 && (
                       <div className="space-y-4">
                         <h4 className="font-semibold text-lg">Applicants</h4>
                         <div className="space-y-4">
                           {application.applicants.map((applicant: any, index: number) => (
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
                     {application.occupants && application.occupants.length > 0 && (
                       <div className="space-y-4">
                         <h4 className="font-semibold text-lg">Occupants</h4>
                         <div className="space-y-4">
                           {application.occupants.map((occupant: any, index: number) => (
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
                     {application.employments && application.employments.length > 0 && (
                       <div className="space-y-4">
                         <h4 className="font-semibold text-lg">Employment History</h4>
                         <div className="space-y-4">
                           {application.employments.map((employment: any, index: number) => (
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
                     {application.references && application.references.length > 0 && (
                       <div className="space-y-4">
                         <h4 className="font-semibold text-lg">References</h4>
                         <div className="space-y-4">
                           {application.references.map((reference: any, index: number) => (
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
                     {application.autos && application.autos.length > 0 && (
                       <div className="space-y-4">
                         <h4 className="font-semibold text-lg">Vehicles</h4>
                         <div className="space-y-4">
                           {application.autos.map((auto: any, index: number) => (
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
                     {application.currentAddress && (
                       <div className="space-y-4">
                         <h4 className="font-semibold text-lg">Current Address</h4>
                         <div className="grid gap-4 md:grid-cols-2">
                           <div>
                             <span className="text-sm text-muted-foreground">Street:</span>
                             <p className="font-medium">{application.currentAddress.street || "N/A"}</p>
                           </div>
                           <div>
                             <span className="text-sm text-muted-foreground">City:</span>
                             <p className="font-medium">{application.currentAddress.city || "N/A"}</p>
                           </div>
                           <div>
                             <span className="text-sm text-muted-foreground">Province:</span>
                             <p className="font-medium">{application.currentAddress.province || "N/A"}</p>
                           </div>
                           <div>
                             <span className="text-sm text-muted-foreground">Postal Code:</span>
                             <p className="font-medium">{application.currentAddress.postalCode || "N/A"}</p>
                           </div>
                         </div>
                       </div>
                     )}

                     {/* Previous Residences */}
                     {application.residences && application.residences.length > 0 && (
                       <div className="space-y-4">
                         <h4 className="font-semibold text-lg">Previous Residences</h4>
                         <div className="space-y-4">
                           {application.residences.map((residence: any, index: number) => (
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
                     {application.attachments && application.attachments.length > 0 && (
                       <div className="space-y-4">
                         <h4 className="font-semibold text-lg">Attachments</h4>
                         <div className="space-y-2">
                           {application.attachments.map((attachment: string, index: number) => (
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
                        <p className="font-medium">{lease?.id || "N/A"}</p>
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
                        <p className="font-medium">{lease?.startDate ? lease.startDate.toLocaleDateString() : "N/A"}</p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">End Date:</span>
                        <p className="font-medium">{lease?.endDate ? lease.endDate.toLocaleDateString() : "N/A"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold">Financial Terms</h4>
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm text-muted-foreground">Monthly Rent:</span>
                        <p className="font-medium text-lg">${lease?.monthlyRent?.toLocaleString() || "0"}</p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Security Deposit:</span>
                        <p className="font-medium">${lease?.securityDeposit?.toLocaleString() || "0"}</p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Total Lease Value:</span>
                        <p className="font-medium">${((lease?.monthlyRent || 0) * 12).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {lease?.applicationId && (
                  <div className="border-t pt-6">
                    <h4 className="font-semibold mb-4">Lease Application</h4>
                    <div className="flex items-center gap-4">
                      <FileText className="h-8 w-8 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="font-medium">Lease Application</p>
                        <p className="text-sm text-muted-foreground">
                          Application ID: {lease.applicationId}
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
    </div>
  )
} 