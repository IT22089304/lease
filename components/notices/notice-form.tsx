"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Wand2, Languages, FileText, Mail, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Notice, Property } from "@/types"
import { leaseService } from "@/lib/services/lease-service"
import { useAuth } from "@/lib/auth"

interface NoticeFormProps {
  prefilledProperty?: Property
  onSend: (notice: Partial<Notice>) => void
  onCancel: () => void
  properties?: Property[]
  defaultPropertyId?: string
  defaultRenterEmail?: string
}

export function NoticeForm({ prefilledProperty, onSend, onCancel, properties = [], defaultPropertyId, defaultRenterEmail }: NoticeFormProps) {
  const [formData, setFormData] = useState({
    propertyId: defaultPropertyId || prefilledProperty?.id || "",
    renterId: defaultRenterEmail || "",
    type: "custom" as Notice["type"],
    subject: "",
    message: "",
    originalMessage: "", // For storing user's original message before paraphrasing
  })
  // Remove local properties state and mock data
  // const [properties, setProperties] = useState<Property[]>([])
  const [isParaphrasing, setIsParaphrasing] = useState(false)
  const [renterEmail, setRenterEmail] = useState(defaultRenterEmail || "")
  const { user } = useAuth()

  // useEffect(() => {
  //   // Mock properties data
  //   const mockProperties: Property[] = [
  //     {
  //       id: "1",
  //       landlordId: "1",
  //       address: "123 Main St, Anytown, ST 12345",
  //       unit: "A",
  //       type: "apartment",
  //       region: "california",
  //       bedrooms: 2,
  //       bathrooms: 1,
  //       createdAt: new Date(),
  //       updatedAt: new Date(),
  //     },
  //     {
  //       id: "2",
  //       landlordId: "1",
  //       address: "456 Oak Ave, Somewhere, ST 67890",
  //       type: "house",
  //       region: "california",
  //       bedrooms: 3,
  //       bathrooms: 2,
  //       createdAt: new Date(),
  //       updatedAt: new Date(),
  //     },
  //   ]
  //   setProperties(mockProperties)
  // }, [])

  useEffect(() => {
    if (formData.propertyId && user?.id) {
      leaseService.getLandlordLeases(user.id).then(leases => {
        const lease = leases.find(l => l.propertyId === formData.propertyId && l.status === "active")
        if (lease) {
          setRenterEmail(lease.renterId)
          setFormData(prev => ({ ...prev, renterId: lease.renterId }))
        } else {
          setRenterEmail("")
          setFormData(prev => ({ ...prev, renterId: "" }))
        }
      })
    }
  }, [formData.propertyId, user?.id])

  const noticeTypes = [
    {
      value: "eviction",
      label: "Eviction Notice",
      description: "Formal notice to vacate the property",
      urgency: "high",
    },
    {
      value: "late_rent",
      label: "Late Rent Payment",
      description: "Notice for overdue rent payment",
      urgency: "high",
    },
    {
      value: "rent_increase",
      label: "Rent Increase",
      description: "Notice of rental amount increase",
      urgency: "medium",
    },
    {
      value: "noise_complaint",
      label: "Noise Complaint",
      description: "Warning about excessive noise",
      urgency: "medium",
    },
    {
      value: "cleanliness",
      label: "Cleanliness Issues",
      description: "Notice about property maintenance",
      urgency: "medium",
    },
    {
      value: "lease_violation",
      label: "Lease Violation",
      description: "Notice of lease agreement violation",
      urgency: "high",
    },
    {
      value: "inspection",
      label: "Property Inspection",
      description: "Scheduled property inspection notice",
      urgency: "low",
    },
    {
      value: "maintenance",
      label: "Maintenance Notice",
      description: "Upcoming maintenance or repairs",
      urgency: "low",
    },
    {
      value: "parking_violation",
      label: "Parking Violation",
      description: "Unauthorized parking notice",
      urgency: "medium",
    },
    {
      value: "pet_violation",
      label: "Pet Policy Violation",
      description: "Unauthorized pet or pet policy breach",
      urgency: "medium",
    },
    {
      value: "utility_shutdown",
      label: "Utility Shutdown",
      description: "Notice of temporary utility interruption",
      urgency: "high",
    },
    {
      value: "custom",
      label: "Custom Notice",
      description: "Custom notice type",
      urgency: "low",
    },
  ]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSend(formData)
  }

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleTypeChange = (type: Notice["type"]) => {
    updateField("type", type)

    // Auto-populate subject and message based on type
    const templates = {
      eviction: {
        subject: "Notice to Quit and Vacate Premises",
        message:
          "You are hereby notified that your tenancy of the above-described premises is hereby terminated. You are required to quit and surrender the premises to the landlord within the time period specified by law. Failure to vacate may result in legal action for unlawful detainer.",
      },
      late_rent: {
        subject: "Late Rent Payment Notice",
        message:
          "This notice serves to inform you that your rent payment for the current period is overdue. Please remit payment immediately to avoid further action. Late fees may apply as specified in your lease agreement.",
      },
      rent_increase: {
        subject: "Notice of Rent Increase",
        message:
          "Please be advised that effective [DATE], your monthly rent will be increased as permitted under your lease agreement and local law. The new rental amount will be $[AMOUNT] per month.",
      },
      noise_complaint: {
        subject: "Noise Complaint Notice",
        message:
          "We have received complaints regarding excessive noise from your unit. Please be considerate of your neighbors and maintain appropriate noise levels, especially during quiet hours. Continued violations may result in lease termination.",
      },
      cleanliness: {
        subject: "Property Maintenance and Cleanliness Notice",
        message:
          "This notice is to inform you that the condition of your rental unit requires immediate attention. Please address the cleanliness and maintenance issues within [TIMEFRAME] to comply with your lease agreement.",
      },
      lease_violation: {
        subject: "Lease Violation Notice",
        message:
          "You are in violation of your lease agreement. Please remedy this violation within the time period specified in your lease or as required by law. Failure to cure may result in termination of tenancy.",
      },
      inspection: {
        subject: "Property Inspection Notice",
        message:
          "Please be advised that we will be conducting a routine inspection of your rental unit on [DATE] at [TIME]. This inspection is for maintenance and safety purposes. We will provide appropriate notice as required by law.",
      },
      maintenance: {
        subject: "Maintenance Notice",
        message:
          "We will be performing necessary maintenance work on [DATE] between [TIME]. This work is essential for the proper upkeep of the property. Please ensure access to the areas requiring maintenance.",
      },
      parking_violation: {
        subject: "Parking Violation Notice",
        message:
          "You are in violation of the parking rules as outlined in your lease agreement. Please park only in designated areas and ensure compliance with all parking regulations to avoid further notices.",
      },
      pet_violation: {
        subject: "Pet Policy Violation Notice",
        message:
          "You are in violation of the pet policy outlined in your lease agreement. Please remedy this situation immediately or face potential lease termination. Unauthorized pets must be removed from the premises.",
      },
      utility_shutdown: {
        subject: "Utility Service Interruption Notice",
        message:
          "Please be advised that [UTILITY] service will be temporarily interrupted on [DATE] from [TIME] to [TIME] for necessary maintenance/repairs. We apologize for any inconvenience this may cause.",
      },
      custom: {
        subject: "",
        message: "",
      },
    }

    const template = templates[type as keyof typeof templates]
    if (template) {
      updateField("subject", template.subject)
      updateField("message", template.message)
      updateField("originalMessage", "")
    }
  }

  const paraphraseMessage = async () => {
    if (!formData.message.trim()) return

    setIsParaphrasing(true)

    // Store original message if not already stored
    if (!formData.originalMessage) {
      updateField("originalMessage", formData.message)
    }

    // Simulate AI paraphrasing - in a real app, this would call an AI service
    await new Promise((resolve) => setTimeout(resolve, 2000))

    const paraphrasedMessages = [
      "We respectfully request your attention to an important matter regarding your tenancy. It has come to our notice that certain aspects of your lease agreement require immediate compliance. Please address these concerns promptly to maintain a positive landlord-tenant relationship.",
      "We hope this message finds you well. We are writing to bring to your attention some matters that need your immediate consideration. Your cooperation in resolving these issues would be greatly appreciated to ensure continued smooth tenancy.",
      "Thank you for being our tenant. We need to discuss some important matters with you regarding your rental unit. Please take the necessary steps to address these concerns at your earliest convenience.",
    ]

    const randomParaphrased = paraphrasedMessages[Math.floor(Math.random() * paraphrasedMessages.length)]
    updateField("message", randomParaphrased)
    setIsParaphrasing(false)
  }

  const restoreOriginal = () => {
    if (formData.originalMessage) {
      updateField("message", formData.originalMessage)
    }
  }

  const selectedNoticeType = noticeTypes.find((t) => t.value === formData.type)

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Send New Notice</h2>
        <p className="text-muted-foreground">Choose a notice type and compose your message</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Notice Types Selection - Left Side */}
        <div className="xl:col-span-1">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Notice Types
              </CardTitle>
              <p className="text-sm text-muted-foreground">Select the type of notice you want to send</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3">
                {noticeTypes.slice(0, 9).map((type) => (
                  <div
                    key={type.value}
                    className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                      formData.type === type.value 
                        ? "border-primary bg-primary/5 shadow-md" 
                        : "border-border hover:bg-muted/50 hover:border-primary/30"
                    }`}
                    onClick={() => handleTypeChange(type.value as Notice["type"])}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm mb-1">{type.label}</h4>
                        <p className="text-xs text-muted-foreground">{type.description}</p>
                      </div>
                      <Badge
                        variant={
                          type.urgency === "high" ? "destructive" : type.urgency === "medium" ? "default" : "secondary"
                        }
                        className="text-xs ml-2"
                      >
                        {type.urgency}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Notice Form - Right Side */}
        <div className="xl:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Notice Details Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  {selectedNoticeType ? selectedNoticeType.label : "Notice Details"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {!prefilledProperty && (
                    <div className="space-y-2">
                      <Label htmlFor="property" className="text-sm font-medium">Property *</Label>
                      <Select value={formData.propertyId} onValueChange={(value) => updateField("propertyId", value)} disabled={properties.length === 1}>
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Select property" />
                        </SelectTrigger>
                        <SelectContent>
                          {properties.map((property) => (
                            <SelectItem key={property.id} value={property.id}>
                              {property.address.street}{property.address.unit ? `, Unit ${property.address.unit}` : ""}, {property.address.city}, {property.address.state}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="renter" className="text-sm font-medium">Tenant Email *</Label>
                    <Input
                      id="renter"
                      type="email"
                      value={formData.renterId}
                      onChange={(e) => updateField("renterId", e.target.value)}
                      placeholder="tenant@example.com"
                      required
                      readOnly={!!renterEmail}
                      className="h-10"
                    />
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="subject" className="text-sm font-medium">Subject *</Label>
                    <Input
                      id="subject"
                      value={formData.subject}
                      onChange={(e) => updateField("subject", e.target.value)}
                      placeholder="Notice subject"
                      required
                      className="h-10"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Message Content Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Message Content
                  </CardTitle>
                  <div className="flex gap-2">
                    {formData.originalMessage && (
                      <Button type="button" variant="outline" size="sm" onClick={restoreOriginal}>
                        Restore Original
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={paraphraseMessage}
                      disabled={!formData.message.trim() || isParaphrasing}
                    >
                      {isParaphrasing ? (
                        <>
                          <Wand2 className="h-4 w-4 mr-2 animate-spin" />
                          Paraphrasing...
                        </>
                      ) : (
                        <>
                          <Languages className="h-4 w-4 mr-2" />
                          Paraphrase
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="message" className="text-sm font-medium">Message *</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => updateField("message", e.target.value)}
                    placeholder="Enter your notice message or write in your own language and use the paraphrase feature..."
                    rows={6}
                    required
                    className="resize-none"
                  />
                  <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                    <div className="text-blue-600 mt-0.5">💡</div>
                    <p className="text-xs text-blue-700">
                      <strong>Tip:</strong> Use the "Paraphrase" button to convert your message to professional legal language.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1 h-11" size="lg">
                <Send className="h-4 w-4 mr-2" />
                Send Notice
              </Button>
              <Button type="button" variant="outline" onClick={onCancel} className="flex-1 h-11" size="lg">
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
