"use client"

import { useState } from "react"
import { Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"

interface LeaseTermsProps {
  data: any
  onUpdate: (field: string, value: any) => void
}

export function LeaseTerms({ data, onUpdate }: LeaseTermsProps) {
  const [newClause, setNewClause] = useState("")

  const utilities = [
    { id: "water", label: "Water" },
    { id: "electricity", label: "Electricity" },
    { id: "gas", label: "Gas" },
    { id: "internet", label: "Internet" },
    { id: "trash", label: "Trash Collection" },
    { id: "sewer", label: "Sewer" },
  ]

  const handleUtilityChange = (utilityId: string, checked: boolean) => {
    const currentUtilities = data.utilitiesIncluded || []
    if (checked) {
      onUpdate("utilitiesIncluded", [...currentUtilities, utilityId])
    } else {
      onUpdate(
        "utilitiesIncluded",
        currentUtilities.filter((id: string) => id !== utilityId),
      )
    }
  }

  const addCustomClause = () => {
    if (newClause.trim()) {
      const currentClauses = data.customClauses || []
      onUpdate("customClauses", [...currentClauses, newClause.trim()])
      setNewClause("")
    }
  }

  const removeCustomClause = (index: number) => {
    const currentClauses = data.customClauses || []
    onUpdate(
      "customClauses",
      currentClauses.filter((_: any, i: number) => i !== index),
    )
  }

  return (
    <div className="space-y-6">
      <div className="form-section">
        <h3 className="text-lg font-semibold mb-4">Pet Policy</h3>
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="pets-allowed"
              checked={data.petPolicy}
              onCheckedChange={(checked) => onUpdate("petPolicy", checked)}
            />
            <Label htmlFor="pets-allowed">Pets allowed</Label>
          </div>
          {data.petPolicy && (
            <div>
              <Label htmlFor="pet-deposit">Pet Deposit ($)</Label>
              <Input
                id="pet-deposit"
                type="number"
                placeholder="300"
                value={data.petDeposit}
                onChange={(e) => onUpdate("petDeposit", e.target.value)}
              />
            </div>
          )}
        </div>
      </div>

      <div className="form-section">
        <h3 className="text-lg font-semibold mb-4">Property Policies</h3>
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="smoking-allowed"
              checked={data.smokingAllowed}
              onCheckedChange={(checked) => onUpdate("smokingAllowed", checked)}
            />
            <Label htmlFor="smoking-allowed">Smoking allowed</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="parking-included"
              checked={data.parkingIncluded}
              onCheckedChange={(checked) => onUpdate("parkingIncluded", checked)}
            />
            <Label htmlFor="parking-included">Parking included</Label>
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3 className="text-lg font-semibold mb-4">Utilities Included</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {utilities.map((utility) => (
            <div key={utility.id} className="flex items-center space-x-2">
              <Checkbox
                id={utility.id}
                checked={(data.utilitiesIncluded || []).includes(utility.id)}
                onCheckedChange={(checked) => handleUtilityChange(utility.id, checked as boolean)}
              />
              <Label htmlFor={utility.id}>{utility.label}</Label>
            </div>
          ))}
        </div>
      </div>

      <div className="form-section">
        <h3 className="text-lg font-semibold mb-4">Custom Lease Clauses</h3>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Textarea
              placeholder="Add a custom lease clause..."
              value={newClause}
              onChange={(e) => setNewClause(e.target.value)}
              className="flex-1"
            />
            <Button onClick={addCustomClause} disabled={!newClause.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {data.customClauses && data.customClauses.length > 0 && (
            <div className="space-y-2">
              {data.customClauses.map((clause: string, index: number) => (
                <Card key={index}>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm flex-1">{clause}</p>
                      <Button variant="ghost" size="sm" onClick={() => removeCustomClause(index)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
