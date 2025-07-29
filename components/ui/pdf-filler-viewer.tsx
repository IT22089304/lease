"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { X, Download, Save, User } from "lucide-react"
import { toast } from "sonner"
import { db, storage } from "@/lib/firebase"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"

interface PDFFillerViewerProps {
  isOpen: boolean
  onClose: () => void
  pdfUrl: string
  title?: string
  propertyId?: string
  landlordId?: string
}

export function PDFFillerViewer({ 
  isOpen, 
  onClose, 
  pdfUrl, 
  title = "PDF Filler", 
  propertyId,
  landlordId 
}: PDFFillerViewerProps) {
  const [receiverEmail, setReceiverEmail] = useState("")
  const [isFilling, setIsFilling] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const handleSaveFilledPDF = async () => {
    if (!receiverEmail.trim()) {
      toast.error("Please enter receiver email")
      return
    }

    if (!propertyId || !landlordId) {
      toast.error("Missing property or landlord information")
      return
    }

    setIsSaving(true)
    try {
      // Get the filled PDF from the iframe
      const iframe = iframeRef.current
      if (!iframe || !iframe.contentWindow) {
        toast.error("Cannot access PDF content")
        return
      }

      // Create a message to request the filled PDF data
      iframe.contentWindow.postMessage({ type: 'GET_FILLED_PDF' }, '*')

      // For now, we'll simulate saving the original PDF with metadata
      // In a real implementation, you'd need to extract the filled PDF data
      const filledPdfUrl = pdfUrl // This would be the filled PDF URL

      // Save to Firebase
      const filledPdfRef = await addDoc(collection(db, "filledPdfs"), {
        originalTemplateUrl: pdfUrl,
        filledPdfUrl: filledPdfUrl,
        receiverEmail: receiverEmail.trim(),
        propertyId: propertyId,
        landlordId: landlordId,
        status: "sent",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      toast.success("Filled PDF saved successfully")
      onClose()
    } catch (error) {
      console.error("Error saving filled PDF:", error)
      toast.error("Failed to save filled PDF")
    } finally {
      setIsSaving(false)
    }
  }

  const handleStartFilling = () => {
    setIsFilling(true)
    // Add PDF.js viewer parameters for form filling
    const iframe = iframeRef.current
    if (iframe) {
      iframe.src = `${pdfUrl}#toolbar=1&navpanes=1&scrollbar=1&view=FitH`
    }
  }

  const handleCancelFilling = () => {
    setIsFilling(false)
    const iframe = iframeRef.current
    if (iframe) {
      iframe.src = `${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-full h-[90vh] p-0">
        <DialogHeader className="p-3 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
            <div className="flex items-center gap-2">
              {!isFilling && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleStartFilling}
                >
                  <User className="h-4 w-4 mr-1" />
                  Fill Form
                </Button>
              )}
              {isFilling && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelFilling}
                >
                  Cancel Filling
                </Button>
              )}
              <Button variant="outline" size="sm" asChild>
                <a href={pdfUrl} download>
                  <Download className="h-4 w-4" />
                </a>
              </Button>
              <Button variant="outline" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col h-full">
          {isFilling && (
            <div className="p-3 border-b bg-muted/50">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label htmlFor="receiver-email">Receiver Email (Renter)</Label>
                  <Input
                    id="receiver-email"
                    type="email"
                    placeholder="renter@example.com"
                    value={receiverEmail}
                    onChange={(e) => setReceiverEmail(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <Button 
                  onClick={handleSaveFilledPDF}
                  disabled={isSaving || !receiverEmail.trim()}
                  className="mt-6"
                >
                  <Save className="h-4 w-4 mr-1" />
                  {isSaving ? "Saving..." : "Save Filled PDF"}
                </Button>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-auto bg-gray-100">
            <div className="flex justify-center p-0 h-full">
              <iframe
                ref={iframeRef}
                src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                className="border-0 shadow-lg w-full h-full"
                title={title}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}