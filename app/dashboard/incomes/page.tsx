"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { leaseService } from "@/lib/services/lease-service"
import { paymentService } from "@/lib/services/payment-service"
import { propertyService } from "@/lib/services/property-service"
import { invoiceService } from "@/lib/services/invoice-service"
import { renterStatusService } from "@/lib/services/renter-status-service"
import { useAuth } from "@/lib/auth"
import { Property, Lease, RentPayment, Invoice } from "@/types"
import { toast } from "sonner"
import { Play, DollarSign, User, Home, ArrowLeft, FileText, Calendar } from "lucide-react"

export default function PropertyIncomePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()
  const propertyId = searchParams.get("propertyId")

  const [leases, setLeases] = useState<Lease[]>([])
  const [payments, setPayments] = useState<RentPayment[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [property, setProperty] = useState<Property | null>(null)
  const [renterStatuses, setRenterStatuses] = useState<any[]>([])
  const [isLeaseDialogOpen, setIsLeaseDialogOpen] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<any>(null)
  const [leaseDates, setLeaseDates] = useState({
    startDate: "",
    endDate: ""
  })
  const [isProcessingLease, setIsProcessingLease] = useState(false)

  useEffect(() => {
    async function fetchData() {
      if (!user?.id) return
      setLoading(true)
      
      try {
        // Get all properties for this landlord
        const allProperties = await propertyService.getLandlordProperties(user.id)
        
        // Get all leases for this landlord
        const allLeases = await leaseService.getLandlordLeases(user.id)
        
        // Get all payments for this landlord
        const allLandlordPayments = await paymentService.getLandlordPayments(user.id)
        
        // Get all invoices for this landlord
        const allLandlordInvoices = await invoiceService.getLandlordInvoices(user.id)
        
        // Get all renter statuses for this landlord
        const allRenterStatuses = await renterStatusService.getRenterStatusByLandlord(user.id)
        setRenterStatuses(allRenterStatuses)
        setInvoices(allLandlordInvoices)
        
        // If specific property is selected, filter data for that property
        if (propertyId) {
          const propertyLeases = allLeases.filter((l: Lease) => l.propertyId === propertyId)
          const propertyPayments = allLandlordPayments.filter((p: RentPayment) => {
            // Check if payment has invoiceId and get property from invoice
            if (p.invoiceId) {
              const invoice = allLandlordInvoices.find(inv => inv.id === p.invoiceId)
              return invoice && invoice.propertyId === propertyId
            }
            // Fallback to lease-based filtering
            return propertyLeases.some(lease => lease.id === p.leaseId)
          })
          setLeases(propertyLeases)
          setPayments(propertyPayments)
          
          const propertyData = allProperties.find(p => p.id === propertyId)
          setProperty(propertyData || null)
        } else {
          // If no property selected, show all data
          setLeases(allLeases)
          setPayments(allLandlordPayments)
        }
      } catch (error) {
        console.error("Error fetching income data:", error)
        toast.error("Failed to load income data")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [user?.id, propertyId])

  // Helper function to get property information from invoice
  const getPropertyInfo = (payment: RentPayment) => {
    // First try to get property info from invoice
    if (payment.invoiceId) {
      const invoice = invoices.find(inv => inv.id === payment.invoiceId)
      if (invoice) {
        return {
          name: invoice.propertyDetails?.title || "Unnamed Property",
          address: invoice.propertyDetails?.address ? 
            `${invoice.propertyDetails.address.street}, ${invoice.propertyDetails.address.city}` : 
            "N/A",
          propertyId: invoice.propertyId
        }
      }
    }
    
    // Fallback to lease-based property info
    const lease = leases.find(l => l.id === payment.leaseId)
    if (lease) {
      if (property && property.id === lease.propertyId) {
        return {
          name: property.title || "Unnamed Property",
          address: `${property.address.street}, ${property.address.city}`,
          propertyId: property.id
        }
      }
    }
    
    return { name: "Unknown Property", address: "N/A", propertyId: payment.leaseId }
  }

  // Helper function to get tenant information
  const getTenantInfo = (payment: RentPayment) => {
    // First try to get tenant info from invoice
    if (payment.invoiceId) {
      const invoice = invoices.find(inv => inv.id === payment.invoiceId)
      if (invoice) {
        return {
          name: invoice.renterEmail.split('@')[0] || "Unknown Tenant",
          email: invoice.renterEmail,
          status: "unknown" // Invoice doesn't have tenant status
        }
      }
    }
    
    // Fallback to lease-based tenant info
    const lease = leases.find(l => l.id === payment.leaseId)
    if (lease) {
      // Find renter status by property ID and renter ID
      const renterStatus = renterStatuses.find(rs => 
        rs.propertyId === lease.propertyId && rs.renterId === lease.renterId
      )
      
      return {
        name: renterStatus?.renterName || "Unknown Tenant",
        email: renterStatus?.renterEmail || "N/A",
        status: renterStatus?.status || "unknown"
      }
    }
    
    return { name: "Unknown Tenant", email: "N/A", status: "unknown" }
  }

  // Group payments by property and tenant to consolidate deposits
  const groupedPayments = payments
    .filter((p) => p.status === "paid")
    .reduce((groups, payment) => {
      const propertyInfo = getPropertyInfo(payment)
      const tenantInfo = getTenantInfo(payment)
      
      // Create a unique key for property + tenant combination
      const key = `${propertyInfo.propertyId}-${tenantInfo.email}`
      
      if (!groups[key]) {
        groups[key] = {
          propertyInfo,
          tenantInfo,
          payments: [],
          totalAmount: 0,
          latestDate: null
        }
      }
      
      groups[key].payments.push(payment)
      groups[key].totalAmount += payment.amount || 0
      
      // Track the latest payment date
      if (payment.paidDate) {
        const paymentDate = new Date(payment.paidDate)
        if (!groups[key].latestDate || paymentDate > groups[key].latestDate) {
          groups[key].latestDate = paymentDate
        }
      }
      
      return groups
    }, {} as Record<string, any>)

  const totalIncome = Object.values(groupedPayments)
    .reduce((sum, group) => sum + group.totalAmount, 0)

  // Check if lease can be started (tenant is in "payment" status)
  const canStartLease = (group: any) => {
    // Find the renter status for this tenant and property
    const renterStatus = renterStatuses.find(rs => 
      rs.propertyId === group.propertyInfo.propertyId && 
      rs.renterEmail === group.tenantInfo.email
    )
    
    // Show button if tenant is in "payment" status
    return renterStatus?.status === "payment"
  }

  // Check if lease has already been started
  const isLeaseStarted = (group: any) => {
    // Find the renter status for this tenant and property
    const renterStatus = renterStatuses.find(rs => 
      rs.propertyId === group.propertyInfo.propertyId && 
      rs.renterEmail === group.tenantInfo.email
    )
    
    // Check if tenant is in "leased" status
    return renterStatus?.status === "leased"
  }

  // Check if property is available (not occupied)
  const isPropertyAvailable = (group: any) => {
    return property?.status === "available" || property?.status === undefined
  }

  // Helper function to get payment breakdown
  const getPaymentBreakdown = (payments: RentPayment[]) => {
    const breakdown = {
      monthlyRent: 0,
      securityDeposit: 0,
      applicationFee: 0,
      petFee: 0
    }
    
    payments.forEach(payment => {
      switch (payment.paymentType) {
        case "monthly_rent":
          breakdown.monthlyRent += payment.amount || 0
          break
        case "security_deposit":
          breakdown.securityDeposit += payment.amount || 0
          break
        case "application_fee":
          breakdown.applicationFee += payment.amount || 0
          break
        case "pet_fee":
          breakdown.petFee += payment.amount || 0
          break
        default:
          // If no payment type, assume it's rent
          breakdown.monthlyRent += payment.amount || 0
      }
    })
    
    return breakdown
  }

  // Helper function to start lease for a group
  const handleStartLeaseForGroup = async (group: any) => {
    setSelectedGroup(group)
    setIsLeaseDialogOpen(true)
    setIsProcessingLease(true)
    
    try {
      // Find the lease document for this tenant
      const { collection, query, where, getDocs } = await import("firebase/firestore")
      const { db } = await import("@/lib/firebase")
      
      const filledLeasesQuery = query(
        collection(db, "filledLeases"),
        where("propertyId", "==", group.propertyInfo.propertyId),
        where("receiverEmail", "==", group.tenantInfo.email)
      )
      const filledLeasesSnapshot = await getDocs(filledLeasesQuery)
      
      if (!filledLeasesSnapshot.empty) {
        const leaseDoc = filledLeasesSnapshot.docs[0]
        const leaseData = leaseDoc.data()
        
        if (leaseData.filledPdfUrl) {
          // Here you would implement OCR to extract dates from the 2nd page
          // For now, we'll use a placeholder implementation
          const extractedDates = await extractLeaseDates(leaseData.filledPdfUrl)
          setLeaseDates(extractedDates)
        } else {
          toast.error("No signed lease document found")
        }
      } else {
        toast.error("No signed lease document found")
      }
    } catch (error) {
      console.error("Error processing lease document:", error)
      toast.error("Failed to process lease document")
    } finally {
      setIsProcessingLease(false)
    }
  }

  // Function to extract lease dates using OCR (placeholder implementation)
  const extractLeaseDates = async (pdfUrl: string): Promise<{ startDate: string, endDate: string }> => {
    // This is a placeholder implementation
    // In a real implementation, you would:
    // 1. Download the PDF
    // 2. Extract the 2nd page
    // 3. Use OCR to extract text
    // 4. Use AI to parse dates
    // 5. Return the extracted dates
    
    // For now, return placeholder dates
    const today = new Date()
    const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
    const endDate = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate())
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    }
  }

  // Function to confirm and start the lease
  const handleConfirmLease = async () => {
    if (!selectedGroup || !leaseDates.startDate || !leaseDates.endDate) return
    
    setIsProcessingLease(true)
    try {
      // Find the renter status for this tenant
      const renterStatus = renterStatuses.find(rs => 
        rs.propertyId === selectedGroup.propertyInfo.propertyId && rs.renterEmail === selectedGroup.tenantInfo.email
      )
      
      if (renterStatus && renterStatus.id) {
        // Update renter status to "leased"
        await renterStatusService.updateRenterStatus(renterStatus.id, {
          status: "leased",
          notes: "Lease started after payment received"
        })
        
        // Update property status to "occupied"
        await propertyService.updateProperty(selectedGroup.propertyInfo.propertyId, {
          status: "occupied"
        })
        
        // Create a lease record
        const leaseData = {
          propertyId: selectedGroup.propertyInfo.propertyId,
          landlordId: user!.id,
          renterId: selectedGroup.tenantInfo.email,
          startDate: new Date(leaseDates.startDate),
          endDate: new Date(leaseDates.endDate),
          monthlyRent: selectedGroup.payments[0]?.amount || 0,
          securityDeposit: 0, // This would be calculated from payments
          status: "active" as const,
          leaseTerms: {
            petPolicy: false,
            smokingAllowed: false,
            utilitiesIncluded: [],
            parkingIncluded: false,
            customClauses: []
          },
          signatureStatus: {
            renterSigned: true,
            landlordSigned: true,
            coSignerRequired: false,
            completedAt: new Date()
          }
        }
        
        await leaseService.createLease(leaseData)
        
        toast.success(`Lease started for ${selectedGroup.tenantInfo.name} at ${selectedGroup.propertyInfo.name}`)
        
        // Refresh data
        if (user?.id) {
          const updatedRenterStatuses = await renterStatusService.getRenterStatusByLandlord(user.id)
          setRenterStatuses(updatedRenterStatuses)
        }
        
        setIsLeaseDialogOpen(false)
        setSelectedGroup(null)
        setLeaseDates({ startDate: "", endDate: "" })
      } else {
        toast.error("Could not find renter status to update")
      }
    } catch (error) {
      console.error("Error starting lease:", error)
      toast.error("Failed to start lease")
    } finally {
      setIsProcessingLease(false)
    }
  }

  if (!user) {
    return <div className="container mx-auto p-8">You must be logged in to view this page.</div>
  }

  return (
    <div className="container mx-auto p-8">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={() => router.push("/dashboard")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        {property && (
          <div>
            <h1 className="text-2xl font-bold">Income for {property.title}</h1>
            <p className="text-muted-foreground">{property.address.street}, {property.address.city}</p>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            {property ? `Income for ${property.title}` : "All Income"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2">Loading payments...</span>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold">Total Received: <span className="text-primary">${totalIncome.toLocaleString()}</span></h2>
                <p className="text-muted-foreground text-sm">
                  {property ? `All paid payments for ${property.title}` : "All paid payments across all properties"}
                </p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date Paid</TableHead>
                    {!property && <TableHead>Property</TableHead>}
                    <TableHead>Tenant</TableHead>
                    <TableHead>Payment Breakdown</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.values(groupedPayments).map((group: any, index) => {
                    const breakdown = getPaymentBreakdown(group.payments)
                    
                    return (
                      <TableRow key={index}>
                        <TableCell>
                          {group.latestDate ? group.latestDate.toLocaleDateString() : "-"}
                        </TableCell>
                        {!property && (
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Home className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="font-medium">{group.propertyInfo.name}</div>
                                <div className="text-sm text-muted-foreground">{group.propertyInfo.address}</div>
                              </div>
                            </div>
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">{group.tenantInfo.name}</div>
                              <div className="text-sm text-muted-foreground">{group.tenantInfo.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm space-y-1">
                            {breakdown.monthlyRent > 0 && (
                              <div className="flex justify-between">
                                <span>Rent:</span>
                                <span className="font-medium">${breakdown.monthlyRent.toLocaleString()}</span>
                              </div>
                            )}
                            {breakdown.securityDeposit > 0 && (
                              <div className="flex justify-between">
                                <span>Security:</span>
                                <span className="font-medium">${breakdown.securityDeposit.toLocaleString()}</span>
                              </div>
                            )}
                            {breakdown.applicationFee > 0 && (
                              <div className="flex justify-between">
                                <span>Application:</span>
                                <span className="font-medium">${breakdown.applicationFee.toLocaleString()}</span>
                              </div>
                            )}
                            {breakdown.petFee > 0 && (
                              <div className="flex justify-between">
                                <span>Pet Fee:</span>
                                <span className="font-medium">${breakdown.petFee.toLocaleString()}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold text-lg">
                          ${group.totalAmount.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            Paid
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {isLeaseStarted(group) ? (
                            <Badge variant="default" className="bg-green-100 text-green-800">
                              Started
                            </Badge>
                          ) : canStartLease(group) ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStartLeaseForGroup(group)}
                              disabled={isProcessingLease}
                            >
                              <Play className="h-4 w-4 mr-2" />
                              {isProcessingLease ? "Processing..." : "Start Lease"}
                            </Button>
                          ) : isPropertyAvailable(group) ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push(`/dashboard/invite/${group.propertyInfo.propertyId}`)}
                            >
                              <User className="h-4 w-4 mr-2" />
                              Find Tenant
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
              {Object.keys(groupedPayments).length === 0 && (
                <div className="text-center py-8">
                  <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No payments received yet</h3>
                  <p className="text-muted-foreground">
                    {property 
                      ? `No payments have been received for ${property.title} yet.`
                      : "Payments will appear here once tenants make payments for their invoices."
                    }
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Lease Confirmation Dialog */}
      <Dialog open={isLeaseDialogOpen} onOpenChange={setIsLeaseDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Confirm Lease Dates
            </DialogTitle>
          </DialogHeader>
          {selectedGroup && (
            <div className="space-y-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-semibold mb-2">Lease Information</h4>
                <p className="text-sm text-gray-600">
                  Tenant: {selectedGroup.tenantInfo.name}
                </p>
                <p className="text-sm text-gray-600">
                  Property: {selectedGroup.propertyInfo.name}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="startDate">Lease Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={leaseDates.startDate}
                    onChange={(e) => setLeaseDates(prev => ({ ...prev, startDate: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">Lease End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={leaseDates.endDate}
                    onChange={(e) => setLeaseDates(prev => ({ ...prev, endDate: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsLeaseDialogOpen(false)
                    setSelectedGroup(null)
                    setLeaseDates({ startDate: "", endDate: "" })
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmLease}
                  disabled={isProcessingLease || !leaseDates.startDate || !leaseDates.endDate}
                >
                  {isProcessingLease ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Processing...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Play className="h-4 w-4" />
                      Start Lease
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