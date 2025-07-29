"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { doc, setDoc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

export default function SignPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const applicantIndex = searchParams.get("applicant")
  const [loading, setLoading] = useState(true)
  const [signing, setSigning] = useState(false)
  const [applicationInfo, setApplicationInfo] = useState<any>(null)
  const [applicantName, setApplicantName] = useState("")
  const signaturePadRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [lastX, setLastX] = useState(0)
  const [lastY, setLastY] = useState(0)

  useEffect(() => {
    async function fetchApplicationInfo() {
      if (!token) {
        setLoading(false)
        return
      }

      try {
        // Parse token to get invitation ID and applicant index
        const [invitationId, applicantIdx] = token.split("_")
        
        // Fetch application info from Firestore
        const applicationDoc = await getDoc(doc(db, "applications", invitationId))
        if (applicationDoc.exists()) {
          const data = applicationDoc.data()
          setApplicationInfo(data)
          
          // Get applicant name if available
          if (data.applicants && data.applicants[parseInt(applicantIdx)]) {
            setApplicantName(data.applicants[parseInt(applicantIdx)].name)
          }
        }
      } catch (error) {
        console.error("Error fetching application info:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchApplicationInfo()
  }, [token])

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = signaturePadRef.current
    if (!canvas) return { x: 0, y: 0 }
    
    const rect = canvas.getBoundingClientRect()
    let clientX, clientY
    
    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = (e as React.MouseEvent<HTMLCanvasElement>).clientX
      clientY = (e as React.MouseEvent<HTMLCanvasElement>).clientY
    }
    
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    }
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const canvas = signaturePadRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    
    // Configure context
    ctx.strokeStyle = "#000"
    ctx.lineWidth = 2
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    
    const coords = getCoordinates(e)
    setLastX(coords.x)
    setLastY(coords.y)
    setIsDrawing(true)
    
    ctx.beginPath()
    ctx.moveTo(coords.x, coords.y)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    if (!isDrawing) return
    
    const canvas = signaturePadRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    
    const coords = getCoordinates(e)
    
    ctx.lineTo(coords.x, coords.y)
    ctx.stroke()
    
    setLastX(coords.x)
    setLastY(coords.y)
  }

  const stopDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    setIsDrawing(false)
  }

  const handleClear = () => {
    const canvas = signaturePadRef.current
    if (canvas) {
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
    }
  }

  const handleSubmit = async () => {
    if (!token || !signaturePadRef.current) return

    setSigning(true)

    try {
      // Get signature from canvas
      const canvas = signaturePadRef.current
      const dataUrl = canvas.toDataURL("image/png")
      
      // Parse token to get invitation ID and applicant index
      const [invitationId, applicantIdx] = token.split("_")
      
      // Store signature data URL directly in Firestore (avoiding Firebase Storage CORS issues)
      const applicationRef = doc(db, "applications", invitationId)
      await setDoc(applicationRef, {
        [`signatures.${applicantIdx}`]: dataUrl,
        [`signatureStatuses.${applicantIdx}`]: 'completed',
        updatedAt: new Date()
      }, { merge: true })

      // Show success message
      alert("Signature submitted successfully!")
      
      // Redirect to a thank you page or close window
      window.close()
    } catch (error) {
      console.error("Error submitting signature:", error)
      alert("Failed to submit signature. Please try again.")
    } finally {
      setSigning(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-destructive">Invalid Signing Link</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              This signing link is invalid or has expired.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Digital Signature</CardTitle>
          {applicationInfo && (
            <div className="text-sm text-muted-foreground text-center">
              {applicantName ? `Signing for: ${applicantName}` : "Please provide your signature below"}
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Your Signature</Label>
            <canvas
              ref={signaturePadRef}
              width={300}
              height={120}
              style={{ 
                border: '1px solid #ccc', 
                background: '#fff', 
                display: 'block',
                margin: '8px 0',
                borderRadius: '4px',
                cursor: 'crosshair'
              }}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
            <div className="flex gap-2 mt-2">
              <Button type="button" size="sm" variant="outline" onClick={handleClear}>
                Clear
              </Button>
            </div>
          </div>
          
          <div className="text-xs text-muted-foreground">
            <p>• Please sign in the box above using your mouse, finger, or stylus</p>
            <p>• Click "Clear" to start over if needed</p>
            <p>• Your signature will be securely stored and associated with this application</p>
          </div>

          <Button 
            type="button" 
            className="w-full" 
            onClick={handleSubmit}
            disabled={signing}
          >
            {signing ? "Submitting..." : "Submit Signature"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
} 