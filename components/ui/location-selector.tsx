"use client"

import { useState, useEffect } from "react"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LOCATIONS, type State } from "@/types/locations"

interface LocationSelectorProps {
  country?: string
  state?: string
  onCountryChange: (country: string) => void
  onStateChange: (state: string) => void
  required?: boolean
  disabled?: boolean
}

export function LocationSelector({
  country,
  state,
  onCountryChange,
  onStateChange,
  required = false,
  disabled = false,
}: LocationSelectorProps) {
  const [availableStates, setAvailableStates] = useState<State[]>([])

  useEffect(() => {
    if (country) {
      const selectedCountry = LOCATIONS.find((c) => c.code === country)
      setAvailableStates(selectedCountry?.states || [])
      // Reset state if it doesn't belong to the new country
      if (state && !selectedCountry?.states.find((s) => s.code === state)) {
        onStateChange("")
      }
    } else {
      setAvailableStates([])
      onStateChange("")
    }
  }, [country, state, onStateChange])

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="country">Country {required && <span className="text-destructive">*</span>}</Label>
        <Select value={country} onValueChange={onCountryChange} disabled={disabled}>
          <SelectTrigger>
            <SelectValue placeholder="Select country" />
          </SelectTrigger>
          <SelectContent>
            {LOCATIONS.map((countryOption) => (
              <SelectItem key={countryOption.code} value={countryOption.code}>
                {countryOption.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="state">
          {country === "CA" ? "Province" : "State"} {required && <span className="text-destructive">*</span>}
        </Label>
        <Select value={state} onValueChange={onStateChange} disabled={disabled || !country}>
          <SelectTrigger>
            <SelectValue placeholder={`Select ${country === "CA" ? "province" : "state"}`} />
          </SelectTrigger>
          <SelectContent>
            {availableStates.map((stateOption) => (
              <SelectItem key={stateOption.code} value={stateOption.code}>
                {stateOption.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
