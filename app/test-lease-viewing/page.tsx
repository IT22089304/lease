"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PDFViewer } from "@/components/ui/pdf-viewer"
import { FileText, Download, Send } from "lucide-react"
import { toast } from "sonner"

export default function TestLeaseViewingPage() {
  const [isPdfViewerOpen, setIsPdfViewerOpen] = useState(false)
  const [selectedPdfUrl, setSelectedPdfUrl] = useState("")
  const [selectedPdfTitle, setSelectedPdfTitle] = useState("")

  // Mock lease agreement data for testing
  const mockLeaseAgreement = {
    id: "test-lease-123",
    leaseAgreementId: "test-lease-123",
    propertyId: "test-property-456",
    renterEmail: "test@example.com",
    type: "lease_completed",
    subject: "Lease Agreement Completed",
    message: "A lease agreement has been completed for your property.",
    readAt: null,
    sentAt: new Date(),
    createdAt: new Date(),
  }

  const handleViewLease = async () => {
    // In a real scenario, this would fetch the lease from Firebase
    // For testing, we'll use a sample PDF URL
    const samplePdfUrl = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
    
    setSelectedPdfUrl(samplePdfUrl)
    setSelectedPdfTitle("Sample Lease Agreement")
    setIsPdfViewerOpen(true)
    
    toast.success("Opening lease agreement...")
  }

  const handleDownloadLease = async () => {
    toast.success("Lease agreement downloaded successfully")
  }

  const handleSendInvoice = async (e?: React.MouseEvent) => {
    e?.preventDefault()
    e?.stopPropagation()
    toast.success("Invoice sent successfully")
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-primary">Lease Agreement Viewing Test</h1>
        <p className="text-muted-foreground">Test the functionality to open and view lease agreements from notifications</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mock Lease Notification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-medium">Notification Details</h3>
            <div className="text-sm text-muted-foreground space-y-1">
              <p><strong>Type:</strong> {mockLeaseAgreement.type}</p>
              <p><strong>Subject:</strong> {mockLeaseAgreement.subject}</p>
              <p><strong>Message:</strong> {mockLeaseAgreement.message}</p>
              <p><strong>Property ID:</strong> {mockLeaseAgreement.propertyId}</p>
              <p><strong>Renter Email:</strong> {mockLeaseAgreement.renterEmail}</p>
              <p><strong>Lease Agreement ID:</strong> {mockLeaseAgreement.leaseAgreementId}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleViewLease}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              View Lease Agreement
            </Button>
            
            <Button
              variant="outline"
              onClick={handleDownloadLease}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download Lease
            </Button>
            
            <Button
              variant="outline"
              onClick={handleSendInvoice}
              className="flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              Send Invoice
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-medium">Notification Click Flow</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>User receives a lease-related notification</li>
              <li>User clicks on the notification</li>
              <li>System checks if notification has a leaseAgreementId</li>
              <li>If yes, automatically opens the PDF viewer</li>
              <li>User can view, download, or take actions on the lease</li>
            </ol>
          </div>

          <div className="space-y-2">
            <h3 className="font-medium">Supported Notification Types</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li><strong>lease_completed:</strong> When a lease agreement is fully signed and completed</li>
              <li><strong>lease_received:</strong> When a renter submits a completed lease for landlord review</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="font-medium">PDF Viewer Features</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Zoom in/out functionality</li>
              <li>Download lease agreement</li>
              <li>Send invoice (for completed leases)</li>
              <li>View property details</li>
              <li>Mark notifications as read automatically</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* PDF Viewer Dialog */}
      <PDFViewer
        isOpen={isPdfViewerOpen}
        onClose={() => {
          setIsPdfViewerOpen(false);
        }}
        pdfUrl={selectedPdfUrl}
        title={selectedPdfTitle}
        isFilling={false}
        isLandlordView={true}
        selectedNotice={mockLeaseAgreement}
        onDownload={handleDownloadLease}
        onSendInvoice={handleSendInvoice}
      />
    </div>
  )
} 