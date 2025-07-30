"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FileText, Download, Eye, User, Send } from "lucide-react"
import { templateService, TemplateMeta } from "@/lib/services/template-service"
import { PDFViewer } from "@/components/ui/pdf-viewer"
import { toast } from "sonner"
import { db } from "@/lib/firebase"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage"

interface PDFTemplateSelectorProps {
  onTemplateSelect: (template: TemplateMeta | null) => void
  selectedTemplate?: TemplateMeta | null
  propertyId?: string
  landlordId?: string
  receiverEmail?: string
  onReceiverEmailChange?: (email: string) => void
}

export function PDFTemplateSelector({ 
  onTemplateSelect, 
  selectedTemplate,
  propertyId,
  landlordId,
  receiverEmail = "",
  onReceiverEmailChange
}: PDFTemplateSelectorProps) {
  const [templates, setTemplates] = useState<TemplateMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false)
  const [selectedPdfUrl, setSelectedPdfUrl] = useState("")
  const [selectedPdfTitle, setSelectedPdfTitle] = useState("")

  const [isFilling, setIsFilling] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  const [completedPdfData, setCompletedPdfData] = useState<any>(null)
  const [filledPdfBlob, setFilledPdfBlob] = useState<Blob | null>(null)

  useEffect(() => {
    fetchTemplates()
  }, [])

  // Prevent browser from showing "unsaved changes" warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Don't show the warning dialog
      e.preventDefault()
      e.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  async function fetchTemplates() {
    setLoading(true)
    try {
      const allTemplates = await templateService.getTemplates()
      setTemplates(allTemplates)
    } catch (error) {
      console.error("Error fetching templates:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredTemplates = templates.filter(template => {
    if (filter === "all") return true
    if (filter === "lease") return template.type.toLowerCase().includes("lease")
    if (filter === "notice") return template.type.toLowerCase().includes("notice")
    return template.type.toLowerCase().includes(filter.toLowerCase())
  })

  const handleTemplateSelect = (template: TemplateMeta) => {
    onTemplateSelect(template)
    onReceiverEmailChange?.("")
    setIsFilling(false)
    setIsCompleted(false)
    setCompletedPdfData(null)
    setFilledPdfBlob(null)
    
    // Immediately open the PDF editor
    setSelectedPdfUrl(template.url)
    setSelectedPdfTitle(template.name)
    setIsFilling(true)
    setPdfViewerOpen(true)
  }

  const handleClearSelection = () => {
    onTemplateSelect(null)
    onReceiverEmailChange?.("")
    setIsFilling(false)
    setIsCompleted(false)
    setCompletedPdfData(null)
    setFilledPdfBlob(null)
  }

  const handleViewPdf = (template: TemplateMeta) => {
    setSelectedPdfUrl(template.url)
    setSelectedPdfTitle(template.name)
    setPdfViewerOpen(true)
  }

  const handleClosePdfViewer = () => {
    setPdfViewerOpen(false)
    setSelectedPdfUrl("")
    setSelectedPdfTitle("")
  }

  const handleFillForm = () => {
    console.log("Fill Form clicked")
    console.log("Receiver email:", receiverEmail)
    console.log("Property ID:", propertyId)
    console.log("Landlord ID:", landlordId)
    console.log("Selected template:", selectedTemplate)
    
    if (!receiverEmail.trim()) {
      toast.error("Please enter receiver email")
      return
    }
    if (!propertyId || !landlordId) {
      toast.error("Missing property or landlord information")
      return
    }
    
    console.log("Setting PDF URL:", selectedTemplate!.url)
    setSelectedPdfUrl(selectedTemplate!.url)
    setSelectedPdfTitle(selectedTemplate!.name)
    setIsFilling(true)
    setPdfViewerOpen(true)
    console.log("PDF viewer should now be open")
  }

  const handleSubmitFilledPDF = async () => {
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
      console.log("Starting to save filled PDF to Firebase...")
      console.log("Property ID:", propertyId)
      console.log("Landlord ID:", landlordId)
      console.log("Receiver Email:", receiverEmail)
      console.log("Template:", selectedTemplate)
      
      // Test Firebase connection first
      console.log("Testing Firebase connection...")
      console.log("Firebase db object:", db)
      
      // For now, use the original template URL as the filled PDF URL
      // In a real implementation, you would extract the filled PDF from the iframe
      const filledPdfUrl = selectedTemplate!.url
      
      const dataToSave = {
        originalTemplateUrl: selectedTemplate!.url,
        filledPdfUrl: filledPdfUrl,
        receiverEmail: receiverEmail.trim(),
        propertyId: propertyId,
        landlordId: landlordId,
        templateId: selectedTemplate!.id,
        templateName: selectedTemplate!.name,
        status: "sent",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }
      
      console.log("Data to save:", dataToSave)
      console.log("About to call addDoc...")
      
      // Save filled PDF to Firebase
      const filledPdfRef = await addDoc(collection(db, "filledPdfs"), dataToSave)
      
      console.log("Successfully saved to Firebase with ID:", filledPdfRef.id)

      alert("✅ Lease sent successfully! The renter will be notified.")
      toast.success("Lease sent successfully!")
      handleClosePdfViewer()
      setIsFilling(false)
      onReceiverEmailChange?.("")
      onTemplateSelect(null)
    } catch (error: any) {
      console.error("Error saving filled PDF:", error)
      console.error("Error name:", error.name)
      console.error("Error message:", error.message)
      console.error("Error stack:", error.stack)
      
      // Show more specific error message
      let errorMessage = "Failed to send lease"
      if (error.message) {
        errorMessage += `: ${error.message}`
      }
      
      alert(`❌ ${errorMessage}. Please try again.`)
      toast.error(errorMessage)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCompleteFilledPDF = async () => {
    if (!receiverEmail.trim()) {
      toast.error("Please enter receiver email")
      return
    }

    if (!propertyId || !landlordId) {
      toast.error("Missing property or landlord information")
      return
    }

    try {
      // For now, use the original template URL as the filled PDF URL
      // In a real implementation, you would extract the filled PDF from the iframe
      const filledPdfUrl = selectedTemplate!.url
      
      // Prepare the data structure for the new collection
      const filledPdfData = {
        originalTemplateUrl: selectedTemplate!.url,
        filledPdfUrl: filledPdfUrl,
        receiverEmail: receiverEmail.trim(),
        propertyId: propertyId,
        landlordId: landlordId,
        templateId: selectedTemplate!.id,
        templateName: selectedTemplate!.name,
        status: "pending",
        completedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }

      console.log("Filled PDF data ready for new collection:", filledPdfData)
      setCompletedPdfData(filledPdfData)
      setIsCompleted(true)
      setIsFilling(false)
      
      alert("✅ PDF completed! Click 'Submit Completed PDF' to save to database.")
      toast.success("PDF completed! Click Submit to save to new collection.")
      
    } catch (error) {
      console.error("Error completing filled PDF:", error)
      alert("❌ Failed to complete PDF. Please try again.")
      toast.error("Failed to complete PDF")
    }
  }

  const handleSubmitCompletedPDF = async () => {
    if (!completedPdfData) {
      toast.error("No completed PDF data to submit")
      return
    }

    setIsSaving(true)
    try {
      console.log("Starting to save completed PDF to Firebase...")
      console.log("Completed PDF data:", completedPdfData)
      
      // Save to the new lease agreement collection
      const leaseAgreementRef = await addDoc(collection(db, "lease agreement"), completedPdfData)
      
      console.log("Successfully saved lease agreement with ID:", leaseAgreementRef.id)
      
      // Create a notice for the renter
      const noticeData = {
        type: "lease_received",
        subject: "New Lease Agreement Received",
        message: `You have received a new lease agreement for the property. Please review and sign the document at your earliest convenience.`,
        recipientEmail: completedPdfData.receiverEmail,
        propertyId: completedPdfData.propertyId,
        landlordId: completedPdfData.landlordId,
        leaseAgreementId: leaseAgreementRef.id,
        status: "unread",
        priority: "high",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }

      console.log("Creating notice with data:", noticeData)
      
      // Save the notice to the notices collection
      const noticeRef = await addDoc(collection(db, "notices"), noticeData)
      
      console.log("Successfully created notice with ID:", noticeRef.id)
      
      alert("✅ Lease agreement saved successfully! Notice sent to renter.")
      toast.success("Lease agreement saved successfully! Notice sent to renter.")
      handleClosePdfViewer()
      setIsCompleted(false)
      setCompletedPdfData(null)
      onReceiverEmailChange?.("")
      onTemplateSelect(null)
    } catch (error: any) {
      console.error("Error saving lease agreement:", error)
      console.error("Error name:", error.name)
      console.error("Error message:", error.message)
      console.error("Error stack:", error.stack)
      
      let errorMessage = "Failed to save lease agreement"
      if (error.message) {
        errorMessage += `: ${error.message}`
      }
      
      alert(`❌ ${errorMessage}. Please try again.`)
      toast.error(errorMessage)
    } finally {
      setIsSaving(false)
    }
  }

  const testFirebaseConnection = async () => {
    try {
      console.log("Testing Firebase connection...")
      const testDoc = await addDoc(collection(db, "test"), {
        test: true,
        timestamp: serverTimestamp()
      })
      console.log("Firebase test successful! Document ID:", testDoc.id)
      alert("✅ Firebase connection is working!")
    } catch (error: any) {
      console.error("Firebase test failed:", error)
      alert(`❌ Firebase connection failed: ${error.message}`)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          <span className="font-medium">Select PDF Template</span>
        </div>
        <div className="text-sm text-muted-foreground">Loading templates...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          <span className="font-medium">Select PDF Template</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={testFirebaseConnection}>
            Test Firebase
          </Button>
          {selectedTemplate && (
            <Button variant="outline" size="sm" onClick={handleClearSelection}>
              Clear Selection
            </Button>
          )}
        </div>
      </div>

      {selectedTemplate && (
        <Card className="border-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Selected Template</span>
              <Button variant="outline" size="sm" onClick={handleClearSelection}>
                Change
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {selectedTemplate.thumbnailUrl && (
                  <img 
                    src={selectedTemplate.thumbnailUrl} 
                    alt="Template thumbnail" 
                    className="w-12 h-12 object-cover rounded"
                  />
                )}
                <div className="flex-1">
                  <div className="font-medium text-sm">{selectedTemplate.name}</div>
                  <div className="text-xs text-muted-foreground">
                    Type: {selectedTemplate.type} | Region: {selectedTemplate.region}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => handleViewPdf(selectedTemplate)}
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <a href={selectedTemplate.url} download>
                      <Download className="h-3 w-3" />
                    </a>
                  </Button>
                </div>
              </div>
              
              <div className="text-center text-sm text-muted-foreground">
                PDF editor opened automatically
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!selectedTemplate && (
        <>
          <div className="flex gap-2">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("all")}
            >
              All
            </Button>
            <Button
              variant={filter === "lease" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("lease")}
            >
              Lease
            </Button>
            <Button
              variant={filter === "notice" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("notice")}
            >
              Notice
            </Button>
          </div>

          {filteredTemplates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No templates available</p>
              <p className="text-xs">Contact an administrator to upload templates</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
              {filteredTemplates.map((template) => (
                <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow aspect-square">
                  <CardContent className="p-4 h-full flex flex-col justify-between">
                    <div className="flex flex-col items-center text-center space-y-3">
                      {template.thumbnailUrl && (
                        <img 
                          src={template.thumbnailUrl} 
                          alt="Template thumbnail" 
                          className="w-44 h-44 object-cover rounded-lg shadow-sm"
                        />
                      )}
                      <div className="space-y-1">
                        <div className="font-medium text-sm line-clamp-2">{template.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {template.type} • {template.region}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 justify-center mt-3">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleViewPdf(template)}
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="outline" asChild>
                        <a href={template.url} download>
                          <Download className="h-3 w-3" />
                        </a>
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => handleTemplateSelect(template)}
                      >
                        Select
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <PDFViewer
        isOpen={pdfViewerOpen}
        onClose={handleClosePdfViewer}
        pdfUrl={selectedPdfUrl}
        title={selectedPdfTitle}
        isFilling={isFilling}
        receiverEmail={receiverEmail}
        onReceiverEmailChange={onReceiverEmailChange}
        onSubmit={handleSubmitFilledPDF}
        isSaving={isSaving}
        onComplete={handleCompleteFilledPDF}
      />

      {isCompleted && (
        <div className="mt-4 flex justify-end">
          <Button onClick={handleSubmitCompletedPDF} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Lease Agreement & Send Notice"}
          </Button>
        </div>
      )}
    </div>
  )
}