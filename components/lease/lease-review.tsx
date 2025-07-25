"use client"

import { useState } from "react"
import { FileText, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

interface LeaseReviewProps {
  data: any
  onComplete: () => void
}

export function LeaseReview({ data, onComplete }: LeaseReviewProps) {
  const [agreed, setAgreed] = useState(false)

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(Number(amount))
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Lease Agreement Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="font-semibold text-sm text-muted-foreground mb-2">PROPERTY INFORMATION</h4>
            <p className="font-medium">Property ID: {data.propertyId}</p>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-sm text-muted-foreground mb-2">LEASE TERMS</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Monthly Rent:</span>
                  <span className="font-medium">{formatCurrency(data.monthlyRent)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Security Deposit:</span>
                  <span className="font-medium">{formatCurrency(data.securityDeposit)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Start Date:</span>
                  <span className="font-medium">{formatDate(data.startDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span>End Date:</span>
                  <span className="font-medium">{formatDate(data.endDate)}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-sm text-muted-foreground mb-2">POLICIES</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant={data.petPolicy ? "default" : "secondary"}>
                    {data.petPolicy ? "Pets Allowed" : "No Pets"}
                  </Badge>
                  {data.petPolicy && data.petDeposit && (
                    <span className="text-sm text-muted-foreground">({formatCurrency(data.petDeposit)} deposit)</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={data.smokingAllowed ? "default" : "secondary"}>
                    {data.smokingAllowed ? "Smoking Allowed" : "No Smoking"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={data.parkingIncluded ? "default" : "secondary"}>
                    {data.parkingIncluded ? "Parking Included" : "No Parking"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {data.utilitiesIncluded && data.utilitiesIncluded.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="font-semibold text-sm text-muted-foreground mb-2">UTILITIES INCLUDED</h4>
                <div className="flex flex-wrap gap-2">
                  {data.utilitiesIncluded.map((utility: string) => (
                    <Badge key={utility} variant="outline">
                      {utility}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {data.customClauses && data.customClauses.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="font-semibold text-sm text-muted-foreground mb-2">CUSTOM CLAUSES</h4>
                <div className="space-y-2">
                  {data.customClauses.map((clause: string, index: number) => (
                    <div key={index} className="p-3 bg-muted rounded-md">
                      <p className="text-sm">{clause}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Digital Signature</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox id="agree-terms" checked={agreed} onCheckedChange={(checked) => setAgreed(checked as boolean)} />
            <Label htmlFor="agree-terms" className="text-sm">
              I agree to the terms and conditions outlined in this lease agreement and authorize its electronic
              execution.
            </Label>
          </div>

          <Button onClick={onComplete} disabled={!agreed} className="w-full" size="lg">
            <Send className="h-4 w-4 mr-2" />
            Send Lease for Signature
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            The renter will receive an email with the lease agreement for their signature. The lease will be active once
            both parties have signed.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
