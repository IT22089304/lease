"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { invitationService } from "@/lib/services/invitation-service"
import { propertyService } from "@/lib/services/property-service"
import { useAuth } from "@/lib/auth"
import { PropertyDetailsView } from "@/components/properties/property-details-view"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { applicationService } from "@/lib/services/application-service"

export default function RenterInvitationDetailsPage() {
  const router = useRouter()
  const params = useParams<{ invitationId: string }>()
  const { user } = useAuth()
  const [invitation, setInvitation] = useState<any>(null)
  const [property, setProperty] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [showAppDialog, setShowAppDialog] = useState(false)
  const [appSubmitting, setAppSubmitting] = useState(false)
  const [appForm, setAppForm] = useState<any>({})

  useEffect(() => {
    async function fetchData() {
      if (!params?.invitationId) return
      setLoading(true)
      // Fetch invitation by ID
      const invs = await invitationService.getInvitationsForEmail(user?.email || "")
      const inv = invs.find((i: any) => i.id === params.invitationId)
      setInvitation(inv)
      if ((inv as any)?.propertyId) {
        const prop = await propertyService.getProperty((inv as any).propertyId)
        setProperty(prop)
      }
      setLoading(false)
    }
    if (user?.email) fetchData()
  }, [params?.invitationId, user?.email])

  useEffect(() => {
    if (invitation && user) {
      setAppForm({
        fullName: user.name,
        email: user.email,
        phone: (user as any)?.phone || "",
        employmentCompany: "",
        employmentJobTitle: "",
        employmentMonthlyIncome: "",
      })
    }
  }, [invitation, user])

  const handleAccept = async () => {
    if (!invitation) return
    setAccepting(true)
    try {
      console.log("Updating invitation with ID:", invitation.id)
      await invitationService.updateInvitationStatus(invitation.id, "accepted")
      // Re-fetch invitation to update UI
      const invs = await invitationService.getInvitationsForEmail(user?.email || "")
      const updated = invs.find((i: any) => i.id === invitation.id)
      setInvitation(updated)
    } catch (e) {
      alert("Failed to accept invitation.")
    } finally {
      setAccepting(false)
    }
  }

  const handleAppChange = (e: any) => {
    setAppForm((prev: any) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleAppSubmit = async (e: any) => {
    e.preventDefault()
    setAppSubmitting(true)
    try {
      await applicationService.createApplication({
        invitationId: invitation?.id || "",
        propertyId: (invitation as any)?.propertyId || "",
        landlordId: (invitation as any)?.landlordId || "",
        renterEmail: user?.email || "",
        fullName: appForm.fullName,
        phone: appForm.phone || (user as any)?.phone || "",
        employmentCompany: appForm.employmentCompany,
        employmentJobTitle: appForm.employmentJobTitle,
        employmentMonthlyIncome: appForm.employmentMonthlyIncome,
      })
      setShowAppDialog(false)
      router.push("/renter/dashboard")
    } catch (err) {
      alert("Failed to submit application.")
    } finally {
      setAppSubmitting(false)
    }
  }

  if (loading) return <div className="p-8">Loading...</div>
  if (!invitation) return <div className="p-8 text-destructive">Invitation not found.</div>

  return (
    <PropertyDetailsView
      property={property}
      actionButton={null}
      tabs={null}
      activeTab={"details"}
      setActiveTab={() => {}}
      belowLocation={
        <>
          {invitation.status === "pending" && (
            <Button onClick={handleAccept} disabled={accepting} className="w-full mt-4">
              {accepting ? "Accepting..." : "Accept Invitation"}
            </Button>
          )}
          {invitation.status === "accepted" && (
            <>
              <div className="text-success font-semibold w-full text-center mt-4">You have accepted this invitation.</div>
              <Dialog open={showAppDialog} onOpenChange={setShowAppDialog}>
                <DialogTrigger asChild>
                  <Button className="w-full mt-4" variant="outline">Submit Application</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Lease Application</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAppSubmit} className="space-y-6">
                    <div>
                      <Label>Full Name</Label>
                      <Input name="fullName" value={appForm.fullName} onChange={handleAppChange} required />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input name="email" type="email" value={appForm.email} onChange={handleAppChange} required />
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <Input name="phone" value={appForm.phone} onChange={handleAppChange} required />
                    </div>
                    <div>
                      <Label>Employment Company</Label>
                      <Input name="employmentCompany" value={appForm.employmentCompany} onChange={handleAppChange} />
                    </div>
                    <div>
                      <Label>Job Title</Label>
                      <Input name="employmentJobTitle" value={appForm.employmentJobTitle} onChange={handleAppChange} />
                    </div>
                    <div>
                      <Label>Monthly Income</Label>
                      <Input name="employmentMonthlyIncome" value={appForm.employmentMonthlyIncome} onChange={handleAppChange} />
                    </div>
                    <Button type="submit" className="w-full" disabled={appSubmitting}>
                      {appSubmitting ? "Submitting..." : "Submit Application"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </>
          )}
        </>
      }
    />
  )
} 