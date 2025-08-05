"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Plus, Search, FileText, Eye, Calendar, CheckCircle, ArrowLeft, Download, Check, X, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/lib/auth"
import { propertyService } from "@/lib/services/property-service"
import { leaseService } from "@/lib/services/lease-service"
import { documentService } from "@/lib/services/document-service"
import { renterStatusService } from "@/lib/services/renter-status-service"
import { invoiceService } from "@/lib/services/invoice-service"
import { toast } from "sonner"
import Link from "next/link"
import type { Property, Lease } from "@/types"
import { collection, query, where, getDocs, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"

export default function PropertyLeasesPage() {
  const router = useRouter()
  const params = useParams()
  const { user } = useAuth()
  const propertyId = params.id as string
  
  const [property, setProperty] = useState<Property | null>(null)
  const [sentLeases, setSentLeases] = useState<any[]>([])
  const [receivedLeases, setReceivedLeases] = useState<any[]>([])
  const [renterStatuses, setRenterStatuses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("sent")
  const [isProcessing, setIsProcessing] = useState(false)
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false)
  const [selectedLeaseForInvoice, setSelectedLeaseForInvoice] = useState<any>(null)
  const [invoiceFormData, setInvoiceFormData] = useState({
    includePetFee: false,
    notes: ""
  })

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
        
        // Fetch renter statuses for this property
        const statuses = await renterStatusService.getRenterStatusByProperty(propertyId)
        setRenterStatuses(statuses)
        
        // Fetch sent leases (from leases collection)
        const allLeases = await leaseService.getLandlordLeases(user.id)
        const propertyLeases = allLeases.filter(lease => lease.propertyId === propertyId)
        setSentLeases(propertyLeases)
        
                // Fetch sent leases (from filledPdfs collection)
        const filledPdfsQuery = query(
          collection(db, "filledPdfs"),
          where("propertyId", "==", propertyId),
          orderBy("createdAt", "desc")
        )
        const filledPdfsSnapshot = await getDocs(filledPdfsQuery)
        const sentLeasesData = filledPdfsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate(),
        }))
        setSentLeases(sentLeasesData)
        
        // Fetch received leases (from filledLeases collection)
        const filledLeasesQuery = query(
          collection(db, "filledLeases"),
          where("propertyId", "==", propertyId),
          orderBy("createdAt", "desc")
        )
        const filledLeasesSnapshot = await getDocs(filledLeasesQuery)
        const receivedLeasesData = filledLeasesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate(),
        }))
        setReceivedLeases(receivedLeasesData)
        
      } catch (error) {
        console.error("Error fetching property leases:", error)
        toast.error("Failed to load property leases")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user?.id, propertyId, router])

  const handleCreateLease = () => {
    router.push(`/wizard/lease?propertyId=${propertyId}`)
  }

  const handleViewLease = (lease: any) => {
    const pdfUrl = lease.filledPdfUrl || lease.originalTemplateUrl
    if (pdfUrl) {
      window.open(pdfUrl, '_blank')
    } else {
      toast.error("PDF not available")
    }
  }

  const handleViewProperty = () => {
    router.push(`/properties/${propertyId}`)
  }

  const handleViewReceivedLease = (lease: any) => {
    const pdfUrl = lease.filledPdfUrl || lease.originalTemplateUrl
    if (pdfUrl) {
      window.open(pdfUrl, '_blank')
    } else {
      toast.error("PDF not available")
    }
  }

  const handleDownloadLease = (lease: any) => {
    const pdfUrl = lease.filledPdfUrl || lease.originalTemplateUrl
    if (pdfUrl) {
      const link = document.createElement('a')
      link.href = pdfUrl
      link.download = `${lease.templateName || 'Lease Agreement'}.pdf`
      link.click()
    } else {
      toast.error("PDF not available")
    }
  }

  const shouldShowLeaseActions = (lease: any) => {
    if (!lease.receiverEmail) return false
    
    // Find the renter status for this lease
    const renterStatus = renterStatuses.find((rs: any) => 
      rs.renterEmail === lease.receiverEmail
    )
    
    // Only show actions if renter status is "lease" (not accepted, lease_rejected, or higher)
    return renterStatus?.status === "lease"
  }

  const handleLeaseAction = async (lease: any, action: 'accept' | 'reject') => {
    setIsProcessing(true)
    try {
      // Update renter status based on action
      if (lease.receiverEmail && propertyId) {
        // Find the renter status entry
        const renterStatuses = await renterStatusService.getRenterStatusByProperty(propertyId)
        const renterStatus = renterStatuses.find((rs: any) => 
          rs.renterEmail === lease.receiverEmail
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
      
      // Refresh the data
      const filledLeasesQuery = query(
        collection(db, "filledLeases"),
        where("propertyId", "==", propertyId),
        orderBy("createdAt", "desc")
      )
      const filledLeasesSnapshot = await getDocs(filledLeasesQuery)
      const receivedLeasesData = filledLeasesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      }))
      setReceivedLeases(receivedLeasesData)
      
    } catch (error) {
      console.error(`Error ${action}ing lease:`, error)
      toast.error(`Failed to ${action} lease`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSendInvoice = (lease: any) => {
    setSelectedLeaseForInvoice(lease)
    setIsInvoiceDialogOpen(true)
  }

  const calculateInvoiceAmount = () => {
    if (!property) return 0
    
    const monthlyRent = property.monthlyRent || 0
    const securityDeposit = property.securityDeposit || 0
    const applicationFee = property.applicationFee || 0
    const petFee = invoiceFormData.includePetFee ? (property.petPolicy?.fee || 0) : 0
    
    // Calculate total: 1 month rent + security deposit + application fee + pet deposit (if included)
    const total = monthlyRent + securityDeposit + applicationFee + petFee
    
    return total
  }

  const handleSubmitInvoice = async () => {
    if (!selectedLeaseForInvoice || !property || !user) return
    
    setIsProcessing(true)
    try {
      const invoiceData = {
        landlordId: user.id,
        propertyId: property.id,
        renterEmail: selectedLeaseForInvoice.receiverEmail,
        renterId: selectedLeaseForInvoice.receiverEmail, // Using email as ID for now
        amount: calculateInvoiceAmount(),
        monthlyRent: property.monthlyRent || 0,
        securityDeposit: property.securityDeposit || 0,
        applicationFee: property.applicationFee || 0,
        petFee: invoiceFormData.includePetFee ? (property.petPolicy?.fee || 0) : 0,
        notes: invoiceFormData.notes,
        includePetFee: invoiceFormData.includePetFee,
        status: "sent" as const,
        propertyDetails: property
      }

      const invoiceId = await invoiceService.createInvoice(invoiceData)
      
      toast.success("Invoice sent successfully")
      setIsInvoiceDialogOpen(false)
      setSelectedLeaseForInvoice(null)
      setInvoiceFormData({ includePetFee: false, notes: "" })
      
    } catch (error) {
      console.error("Error sending invoice:", error)
      toast.error("Failed to send invoice")
    } finally {
      setIsProcessing(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { variant: "secondary" as const, text: "Draft" },
      pending: { variant: "outline" as const, text: "Pending" },
      active: { variant: "default" as const, text: "Active" },
      completed: { variant: "default" as const, text: "Completed" },
      terminated: { variant: "destructive" as const, text: "Terminated" },
      renter_completed: { variant: "default" as const, text: "Renter Completed" },
      accepted: { variant: "default" as const, text: "Accepted" },
      rejected: { variant: "destructive" as const, text: "Rejected" },
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft
    return <Badge variant={config.variant}>{config.text}</Badge>
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

  const filteredSentLeases = sentLeases.filter(lease =>
    lease.receiverEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lease.status?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lease.templateName?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredReceivedLeases = receivedLeases.filter(lease =>
    lease.receiverEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lease.status?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lease.templateName?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="container mx-auto p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading property leases...</p>
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
          <Button variant="outline" size="sm" onClick={handleViewProperty}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Property
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-primary">Leases</h1>
            <p className="text-muted-foreground">
              Managing leases for {property.address.street}, {property.address.city}
            </p>
          </div>
        </div>
        <Button onClick={handleCreateLease}>
          <Plus className="h-4 w-4 mr-2" />
          Create New Lease
        </Button>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search leases by renter, status, or template..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="sent">Sent Leases ({sentLeases.length})</TabsTrigger>
          <TabsTrigger value="received">Received Leases ({receivedLeases.length})</TabsTrigger>
        </TabsList>

        {/* Sent Leases Tab */}
        <TabsContent value="sent" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredSentLeases.map((lease) => (
              <Card key={lease.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Lease Agreement</CardTitle>
                    {getStatusBadge(lease.status || "draft")}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                                     <div className="space-y-2">
                     <div className="flex justify-between text-sm">
                       <span className="text-muted-foreground">Sent to:</span>
                       <span className="font-medium">{lease.receiverEmail || "Not assigned"}</span>
                     </div>
                     <div className="flex justify-between text-sm">
                       <span className="text-muted-foreground">Template:</span>
                       <span className="font-medium">{lease.templateName || "Standard Lease"}</span>
                     </div>
                     <div className="flex justify-between text-sm">
                       <span className="text-muted-foreground">Status:</span>
                       <span className="font-medium">{lease.status || "pending"}</span>
                     </div>
                     <div className="flex justify-between text-sm">
                       <span className="text-muted-foreground">Created:</span>
                       <span className="font-medium">{formatDate(lease.createdAt)}</span>
                     </div>
                   </div>
                  
                  <div className="flex space-x-2 pt-4">
                                         <Button 
                       variant="outline" 
                       size="sm" 
                       onClick={() => handleViewLease(lease)}
                       className="flex-1"
                     >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredSentLeases.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <div className="space-y-4">
                  <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">
                      {sentLeases.length === 0 ? "No sent leases yet" : "No sent leases found"}
                    </h3>
                    <p className="text-muted-foreground">
                      {sentLeases.length === 0 
                        ? "Create your first lease agreement for this property."
                        : "Try adjusting your search terms."
                      }
                    </p>
                  </div>
                  {sentLeases.length === 0 && (
                    <Button onClick={handleCreateLease}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Lease
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Received Leases Tab */}
        <TabsContent value="received" className="space-y-4">
          <div className="space-y-4">
            {filteredReceivedLeases.map((lease) => (
              <Card key={lease.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <h4 className="font-medium">{lease.templateName || "Lease Agreement"}</h4>
                        <p className="text-sm text-muted-foreground">
                          Sent to: {lease.receiverEmail}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Created: {formatDate(lease.createdAt)}
                        </p>
                        {lease.renterCompletedAt && (
                          <p className="text-sm text-muted-foreground">
                            Completed: {formatDate(lease.renterCompletedAt)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(lease.status || "pending")}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewReceivedLease(lease)}
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
                                             <Button
                         variant="outline"
                         size="sm"
                         onClick={() => handleSendInvoice(lease)}
                         disabled={isProcessing}
                       >
                         <Send className="h-4 w-4 mr-2" />
                         Send Invoice
                       </Button>
                       {shouldShowLeaseActions(lease) && (
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
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredReceivedLeases.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <div className="space-y-4">
                  <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">
                      {receivedLeases.length === 0 ? "No received leases yet" : "No received leases found"}
                    </h3>
                    <p className="text-muted-foreground">
                      {receivedLeases.length === 0 
                        ? "Received lease agreements from renters will appear here."
                        : "Try adjusting your search terms."
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
                 </TabsContent>
       </Tabs>

       {/* Invoice Dialog */}
       <Dialog open={isInvoiceDialogOpen} onOpenChange={setIsInvoiceDialogOpen}>
         <DialogContent className="max-w-lg">
           <DialogHeader className="pb-4">
             <DialogTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
               <Send className="h-5 w-5 text-blue-600" />
               Send Invoice
             </DialogTitle>
             <p className="text-sm text-gray-600">Create and send an invoice for deposits and fees</p>
           </DialogHeader>
           {selectedLeaseForInvoice && property && (
             <div className="space-y-6">
               {/* Property Details */}
               <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
                 <Label className="text-sm font-semibold text-gray-700 mb-3 block">Property Details</Label>
                 <div className="space-y-1">
                   <p className="text-sm font-medium text-gray-900">{property.address.street}, {property.address.city}</p>
                   <p className="text-sm text-gray-600">Monthly Rent: <span className="font-semibold text-green-600">${property.monthlyRent?.toLocaleString()}</span></p>
                 </div>
               </div>

               {/* Deposit Breakdown */}
               <div className="bg-white rounded-lg border border-gray-200 p-4">
                 <Label className="text-sm font-semibold text-gray-700 mb-3 block">Invoice Breakdown</Label>
                 <div className="space-y-3">
                   <div className="flex justify-between items-center py-2 border-b border-gray-100">
                     <span className="text-sm text-gray-600">Security Deposit</span>
                     <span className="text-sm font-medium text-gray-900">${(property.securityDeposit || 0).toLocaleString()}</span>
                   </div>
                   <div className="flex justify-between items-center py-2 border-b border-gray-100">
                     <span className="text-sm text-gray-600">Application Fee</span>
                     <span className="text-sm font-medium text-gray-900">${(property.applicationFee || 0).toLocaleString()}</span>
                   </div>
                   {property.petPolicy?.fee && (
                     <div className="flex justify-between items-center py-2 border-b border-gray-100">
                       <span className="text-sm text-gray-600">Pet Deposit</span>
                       <span className="text-sm font-medium text-gray-900">${property.petPolicy.fee.toLocaleString()}</span>
                     </div>
                   )}
                   <div className="flex justify-between items-center py-3 pt-4 border-t-2 border-gray-200">
                     <span className="text-base font-semibold text-gray-900">Total Amount</span>
                     <span className="text-lg font-bold text-green-600">${calculateInvoiceAmount().toLocaleString()}</span>
                   </div>
                 </div>
               </div>

               {/* Options */}
               <div className="space-y-4">
                 <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                   <input
                     type="checkbox"
                     id="includePetFee"
                     checked={invoiceFormData.includePetFee}
                     onChange={(e) => setInvoiceFormData(prev => ({
                       ...prev,
                       includePetFee: e.target.checked
                     }))}
                     className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                   />
                   <Label htmlFor="includePetFee" className="text-sm font-medium text-gray-700 cursor-pointer">
                     Include pet deposit in invoice
                   </Label>
                 </div>

                 <div className="space-y-2">
                   <Label htmlFor="notes" className="text-sm font-semibold text-gray-700">
                     Additional Notes
                   </Label>
                   <textarea
                     id="notes"
                     value={invoiceFormData.notes}
                     onChange={(e) => setInvoiceFormData(prev => ({
                       ...prev,
                       notes: e.target.value
                     }))}
                     className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                     placeholder="Add any additional notes or instructions for the tenant..."
                     rows={3}
                   />
                 </div>
               </div>

               {/* Action Buttons */}
               <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                 <Button
                   variant="outline"
                   onClick={() => {
                     setIsInvoiceDialogOpen(false)
                     setSelectedLeaseForInvoice(null)
                     setInvoiceFormData({ includePetFee: false, notes: "" })
                   }}
                   className="border-gray-300 text-gray-700 hover:bg-gray-50"
                 >
                   Cancel
                 </Button>
                 <Button
                   onClick={handleSubmitInvoice}
                   disabled={isProcessing}
                   className="bg-blue-600 hover:bg-blue-700 text-white px-6"
                 >
                   {isProcessing ? (
                     <div className="flex items-center gap-2">
                       <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                       Sending...
                     </div>
                   ) : (
                     <div className="flex items-center gap-2">
                       <Send className="h-4 w-4" />
                       Send Invoice
                     </div>
                   )}
                 </Button>
               </div>
             </div>
           )}
         </DialogContent>
       </Dialog>
     </div>
   )
 } 