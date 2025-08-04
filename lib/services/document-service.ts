import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  doc,
  getDoc,
} from "firebase/firestore"
import { db } from "../firebase"
import { renterStatusService } from "./renter-status-service"

export interface DocumentData {
  id: string
  type: string
  name: string
  url: string
  uploadedAt: Date
  status: string
  leaseId?: string
  propertyId?: string
  landlordId?: string
  renterId?: string
}

export const documentService = {
  // Get lease documents for a property
  async getLeaseDocuments(propertyId: string): Promise<DocumentData[]> {
    try {
      // Query filledLeases collection for this property
      const filledLeasesQuery = query(
        collection(db, "filledLeases"),
        where("propertyId", "==", propertyId),
        orderBy("createdAt", "desc")
      )
      const filledLeasesSnapshot = await getDocs(filledLeasesQuery)
      
      const documents: DocumentData[] = []
      
      for (const doc of filledLeasesSnapshot.docs) {
        const data = doc.data()
        if (data.filledPdfUrl) {
          documents.push({
            id: doc.id,
            type: "lease",
            name: `Lease Agreement - ${data.templateName || "Standard Lease"}`,
            url: data.filledPdfUrl,
            uploadedAt: data.createdAt?.toDate() || new Date(),
            status: data.status || "completed",
            leaseId: data.leaseId,
            propertyId: data.propertyId,
            landlordId: data.landlordId,
            renterId: data.receiverEmail,
          })
        }
      }
      
      return documents
    } catch (error) {
      console.error("Error fetching lease documents:", error)
      return []
    }
  },

  // Get all documents for a property (lease, application, etc.)
  async getPropertyDocuments(propertyId: string): Promise<DocumentData[]> {
    try {
      const documents: DocumentData[] = []
      
      // Get lease documents
      const leaseDocuments = await this.getLeaseDocuments(propertyId)
      documents.push(...leaseDocuments)
      
      // Get application documents (if any)
      const applicationsQuery = query(
        collection(db, "applications"),
        where("propertyId", "==", propertyId)
      )
      const applicationsSnapshot = await getDocs(applicationsQuery)
      
      for (const doc of applicationsSnapshot.docs) {
        const data = doc.data()
        if (data.applicationData?.documents) {
          // Add application documents
          for (const [key, docData] of Object.entries(data.applicationData.documents)) {
            if (typeof docData === 'object' && docData !== null && 'url' in docData) {
              documents.push({
                id: `${doc.id}-${key}`,
                type: key,
                name: `${key.charAt(0).toUpperCase() + key.slice(1)} Document`,
                url: (docData as any).url,
                uploadedAt: data.submittedAt?.toDate() || new Date(),
                status: "approved",
                propertyId: propertyId,
                landlordId: data.landlordId,
                renterId: data.renterEmail,
              })
            }
          }
        }
      }
      
      return documents.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())
    } catch (error) {
      console.error("Error fetching property documents:", error)
      return []
    }
  },

  // Get the latest lease document for a property
  async getLatestLeaseDocument(propertyId: string): Promise<DocumentData | null> {
    try {
      const documents = await this.getLeaseDocuments(propertyId)
      return documents.length > 0 ? documents[0] : null
    } catch (error) {
      console.error("Error fetching latest lease document:", error)
      return null
    }
  },

  // Update renter status when a lease is uploaded/signed
  async updateRenterStatusOnLeaseUpload(propertyId: string, renterEmail: string, leaseId: string) {
    try {
      // Find the renter status entry
      const renterStatuses = await renterStatusService.getRenterStatusByProperty(propertyId)
      const renterStatus = renterStatuses.find(rs => rs.renterEmail === renterEmail)
      
      if (renterStatus && renterStatus.id) {
        // Update status to "lease" when renter uploads signed lease
        await renterStatusService.updateRenterStatus(renterStatus.id, {
          status: "lease",
          leaseId: leaseId,
          notes: "Signed lease uploaded - Awaiting landlord approval"
        })
      } else {
        // Create new renter status if none exists
        await renterStatusService.createRenterStatus({
          propertyId: propertyId,
          landlordId: "", // This should be populated with actual landlord ID
          renterEmail: renterEmail,
          renterName: renterEmail.split('@')[0],
          status: "lease",
          leaseId: leaseId,
          notes: "Signed lease uploaded - Awaiting landlord approval"
        })
      }
    } catch (error) {
      console.error("Error updating renter status on lease upload:", error)
      // Don't throw - this is a secondary operation
    }
  }
} 