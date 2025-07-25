"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { leaseService } from "@/lib/services/lease-service"
import { propertyService } from "@/lib/services/property-service"
import { toast } from "sonner"

export default function LeaseWizardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const propertyId = searchParams.get("propertyId")
  const [property, setProperty] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    renterId: "",
    startDate: "",
    endDate: "",
    monthlyRent: 0,
    securityDeposit: 0,
  })

  useEffect(() => {
    async function fetchProperty() {
      if (!propertyId) return
      setLoading(true)
      const prop = await propertyService.getProperty(propertyId)
      setProperty(prop)
      setLoading(false)
    }
    fetchProperty()
  }, [propertyId])

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    if (!propertyId) return
    try {
      setLoading(true)
      await leaseService.createLease({
        propertyId,
        landlordId: property.landlordId,
        renterId: form.renterId,
        startDate: new Date(form.startDate),
        endDate: new Date(form.endDate),
        monthlyRent: Number(form.monthlyRent),
        securityDeposit: Number(form.securityDeposit),
        status: "active",
        leaseTerms: {
          petPolicy: false,
          smokingAllowed: false,
          utilitiesIncluded: [],
          parkingIncluded: false,
          customClauses: [],
        },
        signatureStatus: {
          renterSigned: false,
          coSignerRequired: false,
          landlordSigned: false,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      toast.success("Lease created successfully")
      router.push(`/properties/${propertyId}`)
    } catch (error) {
      toast.error("Failed to create lease")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="container mx-auto p-6">Loading...</div>
  }

  if (!property) {
    return <div className="container mx-auto p-6 text-destructive">Property not found.</div>
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md bg-card rounded-xl shadow-lg p-8 border">
        <h1 className="text-2xl font-bold mb-6 text-center text-primary">Create Lease for {property.address.street}</h1>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1 text-foreground">Renter ID</label>
            <input
              name="renterId"
              value={form.renterId}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1 text-foreground">Start Date</label>
              <input
                type="date"
                name="startDate"
                value={form.startDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1 text-foreground">End Date</label>
              <input
                type="date"
                name="endDate"
                value={form.endDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1 text-foreground">Monthly Rent</label>
              <input
                type="number"
                name="monthlyRent"
                value={form.monthlyRent}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1 text-foreground">Security Deposit</label>
              <input
                type="number"
                name="securityDeposit"
                value={form.securityDeposit}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
          </div>
          <Button type="submit" disabled={loading} className="w-full mt-2">
            {loading ? "Creating..." : "Create Lease"}
          </Button>
        </form>
      </div>
    </div>
  )
}
