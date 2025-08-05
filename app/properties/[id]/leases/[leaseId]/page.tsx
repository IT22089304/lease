"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, FileText, Eye, Download, Calendar, User, DollarSign, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth"
import { propertyService } from "@/lib/services/property-service"
import { leaseService } from "@/lib/services/lease-service"
import { documentService } from "@/lib/services/document-service"
import { toast } from "sonner"
import type { Property, Lease } from "@/types"

export default function LeaseDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { user } = useAuth()
  const propertyId = params.id as string
  const leaseId = params.leaseId as string
  
  const [property, setProperty] = useState<Property | null>(null)
  const [lease, setLease] = useState<Lease | null>(null)
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      if (!user?.id || !propertyId || !leaseId) return
      
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
        
        // Fetch lease details
        const leaseData = await leaseService.getLease(leaseId)
        if (!leaseData) {
          toast.error("Lease not found")
          router.push(`/properties/${propertyId}/leases`)
          return
        }
        
        if (leaseData.propertyId !== propertyId) {
          toast.error("Lease doesn't belong to this property")
          router.push(`/properties/${propertyId}/leases`)
          return
        }
        
        setLease(leaseData)
        
        // Fetch lease documents
        const leaseDocuments = await documentService.getLeaseDocuments(propertyId)
        setDocuments(leaseDocuments)
        
      } catch (error) {
        console.error("Error fetching lease details:", error)
        toast.error("Failed to load lease details")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user?.id, propertyId, leaseId, router])

  const handleBackToLeases = () => {
    router.push(`/properties/${propertyId}/leases`)
  }

  const handleViewProperty = () => {
    router.push(`/properties/${propertyId}`)
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { variant: "secondary" as const, text: "Draft" },
      pending: { variant: "outline" as const, text: "Pending" },
      active: { variant: "default" as const, text: "Active" },
      completed: { variant: "default" as const, text: "Completed" },
      terminated: { variant: "destructive" as const, text: "Terminated" },
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft
    return <Badge variant={config.variant}>{config.text}</Badge>
  }

  const formatDate = (date: Date | string) => {
    if (!date) return "N/A"
    const dateObj = typeof date === "string" ? new Date(date) : date
    return dateObj.toLocaleDateString()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="container mx-auto p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading lease details...</p>
        </div>
      </div>
    )
  }

  if (!property || !lease) {
    return (
      <div className="container mx-auto p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Lease Not Found</h1>
          <p className="text-muted-foreground">The lease you're looking for doesn't exist.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={handleBackToLeases}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Leases
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-primary">Lease Details</h1>
            <p className="text-muted-foreground">
              {property.address.street}, {property.address.city}
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleViewProperty}>
            View Property
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Lease Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Lease Information
              </CardTitle>
              {getStatusBadge(lease.status || "draft")}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Renter</label>
                <p className="text-sm font-medium flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  {lease.renterId || "Not assigned"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Monthly Rent</label>
                <p className="text-sm font-medium flex items-center">
                  <DollarSign className="h-4 w-4 mr-2" />
                  {formatCurrency(lease.monthlyRent || 0)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Security Deposit</label>
                <p className="text-sm font-medium flex items-center">
                  <DollarSign className="h-4 w-4 mr-2" />
                  {formatCurrency(lease.securityDeposit || 0)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Lease Term</label>
                <p className="text-sm font-medium flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  {formatDate(lease.startDate)} - {formatDate(lease.endDate)}
                </p>
              </div>
            </div>
            
            <div className="pt-4 border-t">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Created</label>
                  <p className="text-sm">{formatDate(lease.createdAt)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                  <p className="text-sm">{formatDate(lease.updatedAt)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Signature Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="h-5 w-5 mr-2" />
              Signature Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Landlord Signature</span>
                <Badge variant={lease.signatureStatus?.landlordSigned ? "default" : "secondary"}>
                  {lease.signatureStatus?.landlordSigned ? "Signed" : "Pending"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Renter Signature</span>
                <Badge variant={lease.signatureStatus?.renterSigned ? "default" : "secondary"}>
                  {lease.signatureStatus?.renterSigned ? "Signed" : "Pending"}
                </Badge>
              </div>
              {lease.signatureStatus?.coSignerRequired && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Co-Signer Signature</span>
                  <Badge variant={lease.signatureStatus?.coSignerSigned ? "default" : "secondary"}>
                    {lease.signatureStatus?.coSignerSigned ? "Signed" : "Pending"}
                  </Badge>
                </div>
              )}
            </div>
            
            {lease.signatureStatus?.completedAt && (
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Completed</span>
                  <span className="text-sm">{formatDate(lease.signatureStatus.completedAt)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lease Documents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Lease Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          {documents.length > 0 ? (
            <div className="space-y-4">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{doc.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Uploaded {formatDate(doc.uploadedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={() => window.open(doc.url, '_blank')}>
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => {
                      const link = document.createElement('a')
                      link.href = doc.url
                      link.download = doc.name
                      link.click()
                    }}>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No lease documents available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 