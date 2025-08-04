"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { PropertyDetailsView } from "@/components/properties/property-details-view"
import { propertyService } from "@/lib/services/property-service"
import { applicationService } from "@/lib/services/application-service"
import { documentService } from "@/lib/services/document-service"
import { useAuth } from "@/lib/auth"
import { toast } from "sonner"
import { Property } from "@/types"
import { TabsTrigger } from "@/components/ui/tabs"

export default function PropertyDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [property, setProperty] = useState<Property | null>(null)
  const [applications, setApplications] = useState<any[]>([])
  const [leases, setLeases] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("details")

  const fetchData = async () => {
    if (!params.id || !user) return

    try {
      setLoading(true)
      
      // Fetch property details
      const propertyData = await propertyService.getProperty(params.id as string)
      setProperty(propertyData)

      // Fetch applications for this property
      const propertyApplications = await applicationService.getApplicationsByProperty(params.id as string)
      setApplications(propertyApplications)

      // Fetch lease documents from filledLeases collection
      const leaseDocuments = await documentService.getLeaseDocuments(params.id as string)
      setLeases(leaseDocuments)

    } catch (error) {
      console.error("Error fetching property data:", error)
      toast.error("Failed to load property data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [params.id, user])

  const handleApplicationStatusChange = () => {
    // Refresh the data when application status changes
    fetchData()
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  if (!property) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Property not found</h2>
          <p className="text-muted-foreground">The property you're looking for doesn't exist.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/properties")}> 
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Properties
          </Button>
          <Button variant="default" onClick={() => router.push(`/properties/${params.id}/edit`)}>
            Edit
          </Button>
        </div>
      </div>

      <PropertyDetailsView
        property={property}
        tabs={
          <>
            <TabsTrigger value="applications">Applications</TabsTrigger>
            <TabsTrigger value="leases">Leases</TabsTrigger>
          </>
        }
        applications={applications}
        leases={leases}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onApplicationStatusChange={handleApplicationStatusChange}
      />
    </div>
  )
}