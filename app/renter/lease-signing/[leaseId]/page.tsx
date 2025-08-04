"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { PDFViewer } from "@/components/ui/pdf-viewer"
import { ArrowLeft, FileText, CheckCircle, Clock, AlertTriangle, Download } from "lucide-react"
import { useAuth } from "@/lib/auth"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { toast } from "sonner"

export default function LeaseSigningPage() {
  const router = useRouter()
  const params = useParams()
  const { user } = useAuth()
  const leaseId = params.leaseId as string

  const [leaseData, setLeaseData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isPdfViewerOpen, setIsPdfViewerOpen] = useState(false)
  const [selectedPdfUrl, setSelectedPdfUrl] = useState("")
  const [selectedPdfTitle, setSelectedPdfTitle] = useState("")

  useEffect(() => {
    if (!leaseId || !user?.email) return

    async function fetchLeaseData() {
      try {
        setLoading(true)
        
        // Try to fetch from filledLeases collection first
        const filledLeaseRef = doc(db, "filledLeases", leaseId)
        const filledLeaseSnap = await getDoc(filledLeaseRef)
        
        if (filledLeaseSnap.exists()) {
          const data = filledLeaseSnap.data()
          setLeaseData({
            ...data,
            id: leaseId,
            isFilledLease: true
          })
        } else {
          // If not found in filledLeases, try the regular leases collection
          const leaseRef = doc(db, "leases", leaseId)
          const leaseSnap = await getDoc(leaseRef)
          
          if (leaseSnap.exists()) {
            setLeaseData({
              ...leaseSnap.data(),
              id: leaseId,
              isFilledLease: false
            })
          } else {
            toast.error("Lease agreement not found")
            router.push("/renter/dashboard")
          }
        }
      } catch (error) {
        console.error("Error fetching lease data:", error)
        toast.error("Failed to load lease agreement")
      } finally {
        setLoading(false)
      }
    }

    fetchLeaseData()
  }, [leaseId, user?.email, router])

  const handleViewLease = () => {
    if (!leaseData) return

    const pdfUrl = leaseData.filledPdfUrl || leaseData.originalTemplateUrl || leaseData.templateUrl
    
    if (pdfUrl) {
      setSelectedPdfUrl(pdfUrl)
      setSelectedPdfTitle(leaseData.templateName || "Lease Agreement")
      setIsPdfViewerOpen(true)
    } else {
      toast.error("PDF document not available")
    }
  }

  const handleDownloadLease = () => {
    if (!leaseData) return

    const pdfUrl = leaseData.filledPdfUrl || leaseData.originalTemplateUrl || leaseData.templateUrl
    
    if (pdfUrl) {
      const link = document.createElement('a')
      link.href = pdfUrl
      link.download = `${leaseData.templateName || 'Lease Agreement'}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success("Lease agreement downloaded")
    } else {
      toast.error("PDF document not available for download")
    }
  }

  const getLeaseStatus = () => {
    if (!leaseData) return { status: "unknown", label: "Unknown", color: "gray" }

    if (leaseData.status === "renter_completed") {
      return { status: "completed", label: "Completed & Submitted", color: "green" }
    } else if (leaseData.renterCompletedAt) {
      return { status: "submitted", label: "Submitted to Landlord", color: "blue" }
    } else if (leaseData.filledPdfUrl) {
      return { status: "ready", label: "Ready for Signing", color: "yellow" }
    } else {
      return { status: "pending", label: "Pending Review", color: "gray" }
    }
  }

  const getProgressPercentage = () => {
    if (!leaseData) return 0

    if (leaseData.status === "renter_completed") return 100
    if (leaseData.renterCompletedAt) return 80
    if (leaseData.filledPdfUrl) return 60
    return 20
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Loading lease agreement...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!leaseData) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center space-y-4">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
          <h1 className="text-2xl font-bold">Lease Agreement Not Found</h1>
          <p className="text-muted-foreground">The lease agreement you're looking for could not be found.</p>
          <Button onClick={() => router.push("/renter/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  const status = getLeaseStatus()
  const progress = getProgressPercentage()

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => router.push("/renter/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
          <h1 className="text-3xl font-bold">Lease Agreement Signing</h1>
          <p className="text-muted-foreground">Review and sign your lease agreement</p>
        </div>
        <Badge 
          variant={status.color === "green" ? "default" : status.color === "blue" ? "secondary" : "outline"}
          className="text-sm"
        >
          {status.label}
        </Badge>
      </div>

      {/* Progress Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Signing Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-sm text-muted-foreground">{progress}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className={`h-4 w-4 ${progress >= 20 ? 'text-green-500' : 'text-gray-300'}`} />
              <span className="text-sm">Lease Received</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className={`h-4 w-4 ${progress >= 60 ? 'text-green-500' : 'text-gray-300'}`} />
              <span className="text-sm">Document Available</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className={`h-4 w-4 ${progress >= 80 ? 'text-green-500' : 'text-gray-300'}`} />
              <span className="text-sm">Signed & Submitted</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className={`h-4 w-4 ${progress >= 100 ? 'text-green-500' : 'text-gray-300'}`} />
              <span className="text-sm">Completed</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lease Details Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Lease Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Template Name</p>
              <p className="font-medium">{leaseData.templateName || "Standard Lease Agreement"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Property ID</p>
              <p className="font-medium">{leaseData.propertyId || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Landlord ID</p>
              <p className="font-medium">{leaseData.landlordId || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant="outline">{leaseData.status || "pending"}</Badge>
            </div>
          </div>

          {leaseData.renterCompletedAt && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  Submitted on {new Date(leaseData.renterCompletedAt.toDate()).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm text-green-700 mt-1">
                Your signed lease agreement has been submitted to the landlord for final review.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions Card */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <Button onClick={handleViewLease} className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {status.status === "completed" ? "View Signed Lease" : "Review & Sign Lease"}
            </Button>
            
            <Button variant="outline" onClick={handleDownloadLease} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Download PDF
            </Button>

            {status.status === "completed" && (
              <Button variant="outline" onClick={() => router.push("/renter/dashboard")}>
                Back to Dashboard
              </Button>
            )}
          </div>

          {status.status !== "completed" && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Next Steps:</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                <li>Click "Review & Sign Lease" to open the PDF document</li>
                <li>Fill out any required fields in the lease agreement</li>
                <li>Save the completed PDF to your computer (Ctrl+S)</li>
                <li>Upload the signed PDF using the "Upload Completed Lease" button</li>
                <li>Click "Submit Lease" to send it to your landlord</li>
              </ol>
            </div>
          )}
        </CardContent>
      </Card>

      {/* PDF Viewer Dialog */}
      <PDFViewer
        isOpen={isPdfViewerOpen}
        onClose={() => setIsPdfViewerOpen(false)}
        pdfUrl={selectedPdfUrl}
        title={selectedPdfTitle}
        isFilling={true}
        isRenterSubmission={true}
        leaseAgreementId={leaseId}
        currentUserEmail={user?.email}
        propertyId={leaseData.propertyId}
        landlordId={leaseData.landlordId}
        onLeaseSubmitted={() => {
          setIsPdfViewerOpen(false)
          // Refresh the page to show updated status
          window.location.reload()
        }}
      />
    </div>
  )
}