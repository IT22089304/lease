"use client"

import { useState, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { X, Download, ZoomIn, ZoomOut, Send, CheckCircle, Maximize2, Minimize2 } from "lucide-react"
import { storage, db } from "@/lib/firebase"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { collection, addDoc, serverTimestamp, doc, updateDoc, query, where, getDocs } from "firebase/firestore"
import { toast } from "sonner"

interface PDFViewerProps {
  isOpen: boolean
  onClose: () => void
  pdfUrl: string
  title?: string
  isFilling?: boolean
  receiverEmail?: string
  onReceiverEmailChange?: (email: string) => void
  onSubmit?: () => void
  isSaving?: boolean
  onComplete?: () => void
  propertyId?: string
  landlordId?: string
  isRenterSubmission?: boolean
  leaseAgreementId?: string
  currentUserEmail?: string
  onLeaseSubmitted?: () => void
  isLandlordView?: boolean
  selectedNotice?: any
  onDownload?: () => void
  onSendInvoice?: (e?: React.MouseEvent) => void
}

export function PDFViewer({ 
  isOpen, 
  onClose, 
  pdfUrl, 
  title = "PDF Viewer",
  isFilling = false,
  receiverEmail = "",
  onReceiverEmailChange,
  onSubmit,
  isSaving = false,
  onComplete,
  propertyId,
  landlordId,
  isRenterSubmission,
  leaseAgreementId,
  currentUserEmail,
  onLeaseSubmitted,
  isLandlordView = false,
  selectedNotice,
  onDownload,
  onSendInvoice
}: PDFViewerProps) {
  const [scale, setScale] = useState(1)
  const [isMaximized, setIsMaximized] = useState(false)
  const [isSavingToStorage, setIsSavingToStorage] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  console.log("PDFViewer props:", { isOpen, pdfUrl, title, isFilling, receiverEmail })

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.2, 3))
  }

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.2, 0.5))
  }



  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Store the uploaded file for later use
    setUploadedFile(file)
    toast.success(`PDF file "${file.name}" selected for upload`)
    
    // Reset file input
    if (event.target) {
      event.target.value = ''
    }
  }

  const handleSendLease = async () => {
    if (!receiverEmail.trim()) {
      toast.error("Please enter receiver email")
      return
    }

    if (!uploadedFile) {
      toast.error("Please upload a filled PDF first")
      return
    }

    try {
      console.log("Sending filled PDF file:", uploadedFile.name, uploadedFile.size, "bytes")
      
      // Save to Firebase Storage
      const filledPdfUrl = await saveFilledPDFToStorage(uploadedFile, receiverEmail)
      
      // Save to database
      const docId = await saveToDatabase(filledPdfUrl, receiverEmail)
      
      // Create a notice for the renter
      const noticeData = {
        type: "lease_received",
        subject: "New Lease Agreement Received",
        message: `You have received a new lease agreement for the property. Please review and sign the document at your earliest convenience.`,
        renterId: receiverEmail.trim(), // Use renterId to match the notice service query
        propertyId: propertyId || "",
        landlordId: landlordId || "",
        leaseAgreementId: docId,
        sentAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }

      console.log("Creating notice with data:", noticeData)
      
      // Save the notice to the notices collection
      const noticeRef = await addDoc(collection(db, "notices"), noticeData)
      
      console.log("Successfully created notice with ID:", noticeRef.id)
      
      toast.success("Lease sent successfully! Notice sent to renter.")
      console.log("Sent filled PDF with ID:", docId)
      
      if (onSubmit) {
        onSubmit()
      }
    } catch (error) {
      console.error("Error sending filled PDF:", error)
      toast.error("Failed to send filled PDF")
    } finally {
      setUploadedFile(null)
    }
  }

  const handleRenterSubmitLease = async () => {
    if (!uploadedFile) {
      toast.error("Please upload your filled lease PDF first")
      return
    }

    if (!leaseAgreementId) {
      toast.error("Lease agreement ID not found")
      return
    }

    if (!currentUserEmail) {
      toast.error("User email not found")
      return
    }

    if (!landlordId || !propertyId) {
      toast.error("Landlord or property information missing")
      return
    }

    try {
      console.log("Renter submitting filled lease:", uploadedFile.name, uploadedFile.size, "bytes")
      
      // Save the filled PDF to Firebase Storage
      const filledPdfUrl = await saveFilledPDFToStorage(uploadedFile, currentUserEmail)
      
      // Update the lease agreement document with the new PDF URL and additional info
      const leaseRef = doc(db, "filledLeases", leaseAgreementId)
      await updateDoc(leaseRef, {
        filledPdfUrl: filledPdfUrl,
        renterCompletedAt: serverTimestamp(),
        status: "renter_completed",
        landlordId: landlordId,
        propertyId: propertyId,
        renterEmail: currentUserEmail,
        updatedAt: serverTimestamp(),
      })

      // Mark any existing "lease_received" notifications as read to avoid duplicates
      const noticesQuery = query(
        collection(db, "notices"),
        where("type", "==", "lease_received"),
        where("leaseAgreementId", "==", leaseAgreementId),
        where("renterId", "==", currentUserEmail)
      )
      const noticesSnapshot = await getDocs(noticesQuery)
      
      // Mark all existing lease_received notices as read
      const updatePromises = noticesSnapshot.docs.map((doc: any) => 
        updateDoc(doc.ref, { readAt: serverTimestamp() })
      )
      await Promise.all(updatePromises)

      // Create a notice for the landlord
      const landlordNoticeData = {
        type: "lease_completed",
        subject: "Lease Agreement Signed by Renter",
        message: `The renter has completed and signed the lease agreement. Please review the completed document.`,
        landlordId: landlordId,
        propertyId: propertyId,
        renterEmail: currentUserEmail,
        leaseAgreementId: leaseAgreementId,
        status: "unread",
        priority: "high",
        sentAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }

      console.log("Creating landlord notice with data:", landlordNoticeData)
      
      // Save the notice to the notices collection
      const noticeRef = await addDoc(collection(db, "notices"), landlordNoticeData)
      
      console.log("Successfully created landlord notice with ID:", noticeRef.id)
      
      toast.success("Lease submitted successfully! Landlord has been notified.")
      
      if (onSubmit) {
        onSubmit()
      }
      
      if (onLeaseSubmitted) {
        onLeaseSubmitted()
      }
    } catch (error) {
      console.error("Error submitting lease:", error)
      toast.error("Failed to submit lease")
    } finally {
      setUploadedFile(null)
    }
  }

  const handleMaximize = () => {
    setIsMaximized(!isMaximized)
  }



  const captureFilledPDF = async (): Promise<Blob | null> => {
    try {
      console.log("Attempting to capture filled PDF from iframe...")
      
      if (!iframeRef.current) {
        console.error("Iframe reference not found")
        return null
      }

      // Try to get the PDF content from the iframe
      const iframe = iframeRef.current
      
      // Method 1: Try to get the PDF via postMessage if the PDF viewer supports it
      try {
        iframe.contentWindow?.postMessage({ type: 'GET_PDF_CONTENT' }, '*')
        
        // Wait for response (this is a simplified approach)
        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (error) {
        console.log("PostMessage method not available, trying alternative...")
      }

      // Method 2: Create a download link to capture the current PDF
      const downloadLink = document.createElement('a')
      downloadLink.href = iframe.src
      downloadLink.download = 'filled-lease.pdf'
      
      // Method 3: If the above doesn't work, create a blob from the current URL
      // This is a fallback that creates a basic PDF structure
      const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length 100
>>
stream
BT
/F1 12 Tf
72 720 Td
(Filled Lease Agreement) Tj
0 -20 Td
(Receiver: ${receiverEmail}) Tj
0 -20 Td
(Date: ${new Date().toLocaleDateString()}) Tj
0 -20 Td
(Status: Completed) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000204 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
353
%%EOF`

      const blob = new Blob([pdfContent], { type: 'application/pdf' })
      console.log("Created filled PDF blob:", blob.size, "bytes")
      return blob
      
    } catch (error) {
      console.error("Error capturing filled PDF:", error)
      console.error("Error details:", {
        message: error instanceof Error ? error.message : 'Unknown error',
        name: error instanceof Error ? error.name : 'Unknown',
        stack: error instanceof Error ? error.stack : undefined
      })
      return null
    }
  }

  const saveFilledPDFToStorage = async (filledPdfBlob: Blob, receiverEmail: string): Promise<string> => {
    const timestamp = Date.now()
    const fileName = `filled-lease-${timestamp}.pdf`
    const storageRef = ref(storage, `filled-pdfs/${fileName}`)
    
    try {
      console.log("Uploading PDF to Firebase Storage:", fileName)
      console.log("Blob size:", filledPdfBlob.size, "bytes")
      
      const snapshot = await uploadBytes(storageRef, filledPdfBlob)
      console.log("Upload successful, getting download URL...")
      
      const downloadURL = await getDownloadURL(snapshot.ref)
      console.log("Download URL obtained:", downloadURL)
      
      return downloadURL
    } catch (error) {
      console.error("Error uploading to Firebase Storage:", error)
      console.error("Error details:", {
        message: error instanceof Error ? error.message : 'Unknown error',
        name: error instanceof Error ? error.name : 'Unknown',
        code: (error as any)?.code,
        stack: error instanceof Error ? error.stack : undefined
      })
      throw error
    }
  }

  const saveToDatabase = async (filledPdfUrl: string, receiverEmail: string) => {
    try {
      const leaseData = {
        originalTemplateUrl: pdfUrl,
        filledPdfUrl: filledPdfUrl,
        receiverEmail: receiverEmail.trim(),
        templateName: title,
        status: "completed",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }
      
      const docRef = await addDoc(collection(db, "filledLeases"), leaseData)
      return docRef.id
    } catch (error) {
      console.error("Error saving to database:", error)
      throw error
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`${isMaximized ? 'w-screen h-screen max-w-none' : 'max-w-7xl w-full h-[98vh]'} p-0`}>
        <DialogHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">
              {isFilling ? "Fill Lease Form" : title}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomOut}
                disabled={scale <= 0.5}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground min-w-[3rem] text-center">
                {Math.round(scale * 100)}%
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomIn}
                disabled={scale >= 3}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={pdfUrl} download>
                  <Download className="h-4 w-4" />
                </a>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleMaximize}
              >
                {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-auto bg-gray-100">
            <div className="flex justify-center p-4 pb-8">
              <iframe
                ref={iframeRef}
                src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                className="border-0 shadow-lg"
                style={{
                  width: `${scale * 100}%`,
                  height: `${scale * 100}%`,
                  minHeight: '800px',
                  maxWidth: '100%'
                }}
                title={title}
              />
            </div>
          </div>
          
          {isFilling && (
            <div className="p-4 border-t bg-white">
              <div className="space-y-4">
                {/* Instructions */}
                <div className="text-sm text-muted-foreground bg-blue-50 p-3 rounded-lg">
                  <p className="font-medium mb-2">
                    {isRenterSubmission 
                      ? "📝 How to submit your completed lease:"
                      : "📝 How to save and send your filled PDF:"
                    }
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-xs">
                    {isRenterSubmission ? (
                      <>
                        <li>Fill out the lease agreement above</li>
                        <li>Use Ctrl+S in the PDF viewer to save to your computer</li>
                        <li>Upload the saved file using the "Upload Completed Lease" button below</li>
                        <li>Click "Submit Lease" to send to your landlord</li>
                      </>
                    ) : (
                      <>
                        <li>Fill out the PDF form above</li>
                        <li>Use Ctrl+S in the PDF viewer to save to your computer</li>
                        <li>Upload the saved file using the "Upload Filled PDF" button below</li>
                        <li>Enter the receiver email and click "Send Lease"</li>
                      </>
                    )}
                  </ol>
                  {uploadedFile && (
                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs">
                      ✅ File ready: {uploadedFile.name}
                    </div>
                  )}
                </div>
                
                {!isRenterSubmission && (
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <Label htmlFor="receiver-email" className="text-sm">Receiver Email</Label>
                      <Input
                        id="receiver-email"
                        type="email"
                        placeholder="renter@example.com"
                        value={receiverEmail}
                        onChange={(e) => {
                          onReceiverEmailChange?.(e.target.value)
                        }}
                        className="mt-1"
                      />
                    </div>
                    <div className="flex gap-2">
                      <div className="relative">
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={handleFileUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          disabled={isSavingToStorage}
                        />
                        <Button 
                          variant="outline"
                          disabled={isSavingToStorage}
                          className="flex items-center gap-2"
                        >
                          <CheckCircle className="h-4 w-4" />
                          {isSavingToStorage ? "Uploading..." : "Upload Filled PDF"}
                        </Button>
                      </div>
                      <Button 
                        onClick={handleSendLease}
                        disabled={isSaving || !receiverEmail.trim() || !uploadedFile}
                        className="flex items-center gap-2"
                      >
                        <Send className="h-4 w-4" />
                        {isSaving ? "Sending..." : uploadedFile ? `Send ${uploadedFile.name}` : "Send Lease"}
                      </Button>
                    </div>
                  </div>
                )}

                {isRenterSubmission && (
                  <div className="flex items-center gap-4">
                    <div className="flex gap-2 flex-1">
                      <div className="relative">
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={handleFileUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          disabled={isSavingToStorage}
                        />
                        <Button 
                          variant="outline"
                          disabled={isSavingToStorage}
                          className="flex items-center gap-2"
                        >
                          <CheckCircle className="h-4 w-4" />
                          {isSavingToStorage ? "Uploading..." : "Upload Completed Lease"}
                        </Button>
                      </div>
                      <Button 
                        onClick={handleRenterSubmitLease}
                        disabled={isSaving || !uploadedFile}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                      >
                        <Send className="h-4 w-4" />
                        {isSaving ? "Submitting..." : uploadedFile ? `Submit ${uploadedFile.name}` : "Submit Lease"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Landlord View Actions */}
          {isLandlordView && selectedNotice && (
            <div className="p-4 border-t bg-white">
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground bg-blue-50 p-3 rounded-lg">
                  <p className="font-medium mb-2">📋 Lease Agreement Actions</p>
                  <p className="text-xs">
                    Property: {selectedNotice.propertyId} | Renter: {selectedNotice.renterEmail || selectedNotice.renterId}
                  </p>
                </div>
                
                <div className="flex items-center gap-4">
                  <Button 
                    onClick={onDownload}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download Lease
                  </Button>
                  {selectedNotice.type === "lease_completed" && (
                    <Button 
                      onClick={onSendInvoice}
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                    >
                      <Send className="h-4 w-4" />
                      Send Invoice
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}