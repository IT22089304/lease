"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/lib/auth"
import { invitationService } from "@/lib/services/invitation-service"
import { propertyService } from "@/lib/services/property-service"
// import { applicationService } from "@/lib/services/application-service" // implement as needed

export default function NewApplicationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const invitationId = searchParams.get("invitationId")
  const { user } = useAuth()
  const [invitation, setInvitation] = useState<any>(null)
  const [property, setProperty] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState<any>({})

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      if (!user || !invitationId) return
      // Fetch invitation
      const invs = await invitationService.getInvitationsForEmail(user.email)
      const inv = invs.find((i: any) => i.id === invitationId)
      setInvitation(inv)
      // Fetch property
      if (inv?.propertyId) {
        const prop = await propertyService.getProperty(inv.propertyId)
        setProperty(prop)
      }
      // Fetch profile (mock: use user info)
      setProfile({
        fullName: user.name,
        email: user.email,
        phone: user.phone || "",
        employment: {
          company: "",
          jobTitle: "",
          monthlyIncome: "",
        },
      })
      setForm({
        fullName: user.name,
        email: user.email,
        phone: user.phone || "",
        employmentCompany: "",
        employmentJobTitle: "",
        employmentMonthlyIncome: "",
      })
      setLoading(false)
    }
    fetchData()
  }, [user, invitationId])

  const handleChange = (e: any) => {
    setForm((prev: any) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    setSubmitting(true)
    // Save application to Firestore (implement applicationService as needed)
    // await applicationService.createApplication({ ...form, invitationId, propertyId: invitation.propertyId, landlordId: invitation.landlordId, renterEmail: user.email })
    setSubmitting(false)
    router.push("/renter/dashboard")
  }

  if (loading) return <div className="p-8">Loading...</div>
  if (!invitation || !property) return <div className="p-8 text-destructive">Invalid invitation or property.</div>

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Lease Application</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label>Full Name</Label>
              <Input name="fullName" value={form.fullName} onChange={handleChange} required />
            </div>
            <div>
              <Label>Email</Label>
              <Input name="email" type="email" value={form.email} onChange={handleChange} required />
            </div>
            <div>
              <Label>Phone</Label>
              <Input name="phone" value={form.phone} onChange={handleChange} required />
            </div>
            <div>
              <Label>Employment Company</Label>
              <Input name="employmentCompany" value={form.employmentCompany} onChange={handleChange} />
            </div>
            <div>
              <Label>Job Title</Label>
              <Input name="employmentJobTitle" value={form.employmentJobTitle} onChange={handleChange} />
            </div>
            <div>
              <Label>Monthly Income</Label>
              <Input name="employmentMonthlyIncome" value={form.employmentMonthlyIncome} onChange={handleChange} />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Application"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
} 