"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Download, Upload, Save, Eye } from "lucide-react"

interface PDFFillerProps {
  pdfUrl?: string
  onSave?: (formData: any) => void
  propertyData?: any
  renterData?: any
}

export function PDFFiller({ pdfUrl, onSave, propertyData, renterData }: PDFFillerProps) {
  const [pdfDocument, setPdfDocument] = useState<any>(null)
  const [formFields, setFormFields] = useState<any[]>([])
  const [formData, setFormData] = useState<any>({})
  const [loading, setLoading] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load PDF.js dynamically
  useEffect(() => {
    const loadPDFJS = async () => {
      if (typeof window !== 'undefined') {
        const pdfjsLib = await import('pdfjs-dist')
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`
        return pdfjsLib
      }
    }
    loadPDFJS()
  }, [])

  const loadPDF = async (file: File) => {
    setLoading(true)
    try {
      const pdfjsLib = await import('pdfjs-dist')
      const arrayBuffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      setPdfDocument(pdf)
      
      // Extract form fields
      const fields: any[] = []
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const annotations = await page.getAnnotations()
        
        annotations.forEach((annotation: any) => {
          if (annotation.subtype === 'Widget' && annotation.fieldType) {
            fields.push({
              id: annotation.fieldName,
              type: annotation.fieldType,
              page: i,
              rect: annotation.rect,
              value: annotation.fieldValue || ''
            })
          }
        })
      }
      setFormFields(fields)
      
      // Pre-fill with property/renter data
      const prefillData: any = {}
      fields.forEach(field => {
        if (propertyData && propertyData[field.id]) {
          prefillData[field.id] = propertyData[field.id]
        } else if (renterData && renterData[field.id]) {
          prefillData[field.id] = renterData[field.id]
        }
      })
      setFormData(prefillData)
      
    } catch (error) {
      console.error('Error loading PDF:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === 'application/pdf') {
      loadPDF(file)
    }
  }

  const handleFieldChange = (fieldId: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }))
  }

  const handleSave = () => {
    if (onSave) {
      onSave(formData)
    }
  }

  const renderFormFields = () => {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Fill Form Fields</h3>
        {formFields.map((field) => (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>{field.id}</Label>
            <Input
              id={field.id}
              type={field.type === 'Tx' ? 'text' : 'text'}
              value={formData[field.id] || ''}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              placeholder={`Enter ${field.id}`}
            />
          </div>
        ))}
      </div>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          PDF Form Filler
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File Upload */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="pdf-upload">Upload Fillable PDF</Label>
            <Input
              id="pdf-upload"
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              ref={fileInputRef}
              className="mt-2"
            />
          </div>
          
          {loading && (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">Loading PDF...</p>
            </div>
          )}
        </div>

        {/* PDF Preview */}
        {pdfDocument && (
          <div className="space-y-4">
            <canvas
              ref={canvasRef}
              className="border rounded-lg w-full max-w-2xl mx-auto"
              style={{ height: '600px' }}
            />
            
            {/* Form Fields */}
            {formFields.length > 0 && renderFormFields()}
            
            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button onClick={handleSave} className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                Save Form Data
              </Button>
              <Button variant="outline" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Download Filled PDF
              </Button>
            </div>
          </div>
        )}

        {/* Instructions */}
        {!pdfDocument && (
          <div className="text-center py-8 text-muted-foreground">
            <Upload className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Upload a fillable PDF to get started</p>
            <p className="text-sm mt-2">Supported: PDF forms with text fields, checkboxes, and radio buttons</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 