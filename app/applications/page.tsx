"use client"

import { useState, useEffect } from "react"
import { FileText, Clock, CheckCircle, XCircle, Eye, Download, HelpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/lib/auth"
import type { LeaseApplication, Property } from "@/types"
import { applicationService } from "@/lib/services/application-service"
import { propertyService } from "@/lib/services/property-service"
import { toDateString } from "@/lib/utils"
import { useRouter } from "next/navigation"

export default function ApplicationsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [applications, setApplications] = useState<LeaseApplication[]>([])
  const [properties, setProperties] = useState<Property[]>([])

  useEffect(() => {
    if (!user || !user.id) return;
    async function fetchData(userId: string) {
      const realApplications = await applicationService.getApplicationsForLandlord(userId);
      setApplications(
        realApplications.map(app => ({
          ...app,
        })) as LeaseApplication[]
      );
      // Fetch properties for this landlord
      const props = await propertyService.getLandlordProperties(userId);
      setProperties(props);
    }
    fetchData(user.id);
  }, [user?.id]);

  const getStatusBadge = (status: LeaseApplication["status"]) => {
    const variants = {
      draft: { variant: "secondary", icon: FileText, label: "Draft" },
      submitted: { variant: "default", icon: Clock, label: "Submitted" },
      under_review: { variant: "default", icon: Eye, label: "Under Review" },
      approved: { variant: "default", icon: CheckCircle, label: "Approved" },
      rejected: { variant: "destructive", icon: XCircle, label: "Rejected" },
    };
    const config = variants[status] || variants["draft"];
    if (!config) {
      return (
        <Badge variant="outline" className="flex items-center gap-1">
          <HelpCircle className="h-3 w-3" />
          Unknown
        </Badge>
      );
    }
    const Icon = config.icon;
    return (
      <Badge variant={config.variant as any} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  }

  const getPropertyAddress = (propertyId: string) => {
    const property = properties.find((p) => p.id === propertyId)
    if (!property) return "Unknown Property"
    const addr = property.address
    return `${addr.street}${addr.unit ? `, Unit ${addr.unit}` : ""}, ${addr.city}, ${addr.state}`
  }

  const handleApprove = async (applicationId: string) => {
    await applicationService.updateApplicationStatus(applicationId, "approved")
    setApplications((prev) =>
      prev.map((app) => (app.id === applicationId ? { ...app, status: "approved", reviewedAt: new Date() } : app)),
    )
    // Find the approved application
    const app = applications.find((a) => a.id === applicationId)
    if (app) {
      // Prepare query params
      const params = new URLSearchParams({
        propertyId: app.propertyId,
        renterEmail: app.renterEmail,
      })
      if (app.applicationData?.personalInfo?.fullName) {
        params.append("fullName", app.applicationData.personalInfo.fullName)
      }
      if (app.applicationData?.personalInfo?.phone) {
        params.append("phone", app.applicationData.personalInfo.phone)
      }
      router.push(`/wizard/lease?${params.toString()}`)
    }
  }

  const handleReject = async (applicationId: string) => {
    await applicationService.updateApplicationStatus(applicationId, "rejected")
    setApplications((prev) =>
      prev.map((app) => (app.id === applicationId ? { ...app, status: "rejected", reviewedAt: new Date() } : app)),
    )
  }

  const filterApplications = (status?: LeaseApplication["status"]) => {
    return status ? applications.filter((app) => app.status === status) : applications
  }

  if (!user || user.role !== "landlord") {
    return <div>Access denied. Landlord access required.</div>
  }

  return (
    <div className="container mx-auto p-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-primary">Lease Applications</h1>
        <p className="text-lg text-muted-foreground">Review and manage rental applications from potential tenants</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{applications.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {applications.filter((a) => a.status === "submitted" || a.status === "under_review").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {applications.filter((a) => a.status === "approved").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {applications.length > 0
                ? Math.round((applications.filter((a) => a.status === "approved").length / applications.length) * 100)
                : 0}
              %
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Applications Tabs */}
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">All ({applications.length})</TabsTrigger>
          <TabsTrigger value="submitted">New ({filterApplications("submitted").length})</TabsTrigger>
          <TabsTrigger value="under_review">Reviewing ({filterApplications("under_review").length})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({filterApplications("approved").length})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({filterApplications("rejected").length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6">
          {applications.map((application) => (
            <ApplicationCard
              key={application.id}
              application={application}
              propertyAddress={getPropertyAddress(application.propertyId)}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))}
        </TabsContent>

        <TabsContent value="submitted" className="space-y-6">
          {filterApplications("submitted").map((application) => (
            <ApplicationCard
              key={application.id}
              application={application}
              propertyAddress={getPropertyAddress(application.propertyId)}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))}
        </TabsContent>

        <TabsContent value="under_review" className="space-y-6">
          {filterApplications("under_review").map((application) => (
            <ApplicationCard
              key={application.id}
              application={application}
              propertyAddress={getPropertyAddress(application.propertyId)}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))}
        </TabsContent>

        <TabsContent value="approved" className="space-y-6">
          {filterApplications("approved").map((application) => (
            <ApplicationCard
              key={application.id}
              application={application}
              propertyAddress={getPropertyAddress(application.propertyId)}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))}
        </TabsContent>

        <TabsContent value="rejected" className="space-y-6">
          {filterApplications("rejected").map((application) => (
            <ApplicationCard
              key={application.id}
              application={application}
              propertyAddress={getPropertyAddress(application.propertyId)}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))}
        </TabsContent>
      </Tabs>

      {applications.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No applications yet</h3>
            <p className="text-muted-foreground mb-6">
              Applications will appear here when renters respond to your invitations
            </p>
            <Button onClick={() => (window.location.href = "/invitations")}>Send Invitations</Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

interface ApplicationCardProps {
  application: LeaseApplication
  propertyAddress: string
  onApprove: (id: string) => void
  onReject: (id: string) => void
}

function ApplicationCard({ application, propertyAddress, onApprove, onReject }: ApplicationCardProps) {
  const getStatusBadge = (status: LeaseApplication["status"]) => {
    const variants = {
      draft: { variant: "secondary", icon: FileText, label: "Draft" },
      submitted: { variant: "default", icon: Clock, label: "Submitted" },
      under_review: { variant: "default", icon: Eye, label: "Under Review" },
      approved: { variant: "default", icon: CheckCircle, label: "Approved" },
      rejected: { variant: "destructive", icon: XCircle, label: "Rejected" },
    }
    const config = variants[status]
    if (!config) {
      return (
        <Badge variant="outline" className="flex items-center gap-1">
          <HelpCircle className="h-3 w-3" />
          Unknown
        </Badge>
      )
    }
    const Icon = config.icon
    return (
      <Badge variant={config.variant as any} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-semibold">
                {application.applicationData?.personalInfo?.fullName || application.renterEmail}
              </h3>
              {getStatusBadge(application.status)}
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">
                <span className="font-medium">Property:</span> {propertyAddress}
              </p>
              <p className="text-muted-foreground">
                <span className="font-medium">Email:</span> {application.renterEmail}
              </p>
              {application.applicationData?.personalInfo?.phone && (
                <p className="text-muted-foreground">
                  <span className="font-medium">Phone:</span> {application.applicationData.personalInfo.phone}
                </p>
              )}
              {application.submittedAt && (
                <p className="text-muted-foreground">
                  <span className="font-medium">Submitted:</span> {toDateString(application.submittedAt)}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            {(!["approved", "rejected"].includes(application.status)) && (
              <>
                <Button size="sm" onClick={() => onApprove(application.id)}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button variant="destructive" size="sm" onClick={() => onReject(application.id)}>
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      {application.applicationData?.employment && (
        <CardContent>
          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Employment Information</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Company:</span>
                <p className="font-medium">{application.applicationData.employment.company}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Position:</span>
                <p className="font-medium">{application.applicationData.employment.position}</p>
              </div>
              {application.applicationData.employment.monthlyIncome && (
                <div>
                  <span className="text-muted-foreground">Monthly Income:</span>
                  <p className="font-medium">
                    ${application.applicationData.employment.monthlyIncome.toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
