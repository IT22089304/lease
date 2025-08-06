import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, updateDoc, setDoc, getDoc } from "firebase/firestore"
import { db } from "../firebase"
import { notificationService } from "./notification-service"
import { renterStatusService } from "./renter-status-service"

export const applicationService = {
  async createApplication(application: {
    invitationId: string
    propertyId: string
    landlordId: string
    renterEmail: string
    fullName: string
    phone: string
    employmentCompany?: string
    employmentJobTitle?: string
    employmentMonthlyIncome?: string
    submittedAt?: Date
  }) {
    const docRef = await addDoc(collection(db, "applications"), {
      ...application,
      submittedAt: application.submittedAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    
    // Create or update renter status entry for the kanban board
    try {
      // Check if renter already has a status entry for this property
      const renterStatuses = await renterStatusService.getRenterStatusByProperty(application.propertyId)
      const existingStatus = renterStatuses.find(rs => 
        rs.renterEmail === application.renterEmail && 
        (rs.invitationId === application.invitationId || rs.applicationId)
      )
      
      if (existingStatus && existingStatus.id) {
        // Update existing status to application stage
        await renterStatusService.updateRenterStatus(existingStatus.id, {
          status: "application",
          applicationId: docRef.id,
          notes: "Application submitted"
        })
      } else {
        // Create new renter status entry
        await renterStatusService.createRenterStatus({
          propertyId: application.propertyId,
          landlordId: application.landlordId,
          renterEmail: application.renterEmail,
          renterName: application.fullName?.split(' ')[0] || application.renterEmail.split('@')[0],
          status: "application",
          invitationId: application.invitationId,
          applicationId: docRef.id,
          notes: "Application submitted"
        })
      }
    } catch (error) {
      console.error("Error creating/updating renter status:", error)
      // Don't throw here - application creation should still succeed
    }
    
    // Send notification to landlord
    try {
      await notificationService.notifyApplicationSubmitted(application.landlordId, {
        ...application,
        id: docRef.id
      })
    } catch (error) {
      console.error("Error sending notification:", error)
    }
    
    return docRef.id
  },

  async getApplicationsForLandlord(landlordId: string) {
    const q = query(collection(db, "applications"), where("landlordId", "==", landlordId))
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  },

  async getApplicationByProperty(propertyId: string) {
    const q = query(collection(db, "applications"), where("propertyId", "==", propertyId))
    const snapshot = await getDocs(q)
    if (snapshot.empty) return null
    const doc = snapshot.docs[0]
    return { id: doc.id, ...doc.data() }
  },

  async getApplicationsByProperty(propertyId: string) {
    const q = query(collection(db, "applications"), where("propertyId", "==", propertyId))
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data(),
      submittedAt: doc.data().submittedAt?.toDate?.(),
      updatedAt: doc.data().updatedAt?.toDate?.(),
      reviewedAt: doc.data().reviewedAt?.toDate?.(),
    }))
  },

  async getApprovedApplicationsByProperty(propertyId: string) {
    const q = query(
      collection(db, "applications"), 
      where("propertyId", "==", propertyId),
      where("status", "==", "approved")
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data(),
      submittedAt: doc.data().submittedAt?.toDate?.(),
      updatedAt: doc.data().updatedAt?.toDate?.(),
      reviewedAt: doc.data().reviewedAt?.toDate?.(),
    }))
  },

  async getApplication(applicationId: string) {
    const docRef = doc(db, "applications", applicationId)
    const docSnap = await getDoc(docRef)
    if (!docSnap.exists()) {
      return null
    }
    return { 
      id: docSnap.id, 
      ...docSnap.data(),
      submittedAt: docSnap.data().submittedAt?.toDate?.(),
      updatedAt: docSnap.data().updatedAt?.toDate?.(),
      reviewedAt: docSnap.data().reviewedAt?.toDate?.(),
    }
  },

  async getApplicationsByRenterEmail(renterEmail: string) {
    const q = query(collection(db, "applications"), where("renterEmail", "==", renterEmail))
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data(),
      submittedAt: doc.data().submittedAt?.toDate?.(),
      updatedAt: doc.data().updatedAt?.toDate?.(),
      reviewedAt: doc.data().reviewedAt?.toDate?.(),
    }))
  },

  async updateApplicationStatus(applicationId: string, status: string) {
    const docRef = doc(db, "applications", applicationId)
    
    // Get the application data to find the associated renter status
    const applicationDoc = await getDoc(docRef)
    if (!applicationDoc.exists()) {
      throw new Error("Application not found")
    }
    
    const applicationData = applicationDoc.data()
    
    // Update the application status
    await updateDoc(docRef, {
      status,
      reviewedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    
    // Update the renter status in the kanban board
    if (applicationData.propertyId && applicationData.renterEmail) {
      try {
        // Find the renter status entry for this application
        const renterStatuses = await renterStatusService.getRenterStatusByProperty(applicationData.propertyId)
        const renterStatus = renterStatuses.find(rs => 
          rs.renterEmail === applicationData.renterEmail && 
          (rs.applicationId === applicationId || rs.invitationId === applicationData.invitationId)
        )
        
        if (renterStatus && renterStatus.id) {
          let newStage: "invite" | "application" | "lease" | "accepted" | "payment" | "leased"
          let notes: string
          
          switch (status) {
            case "approved":
              newStage = "application"
              notes = "Application approved"
              break
            case "rejected":
              // Keep in application stage but update notes
              newStage = "application"
              notes = "Application rejected"
              break
            case "under_review":
              newStage = "application"
              notes = "Application under review"
              break
            default:
              newStage = "application"
              notes = `Application status: ${status}`
          }
          
          // Update the renter status
          await renterStatusService.updateRenterStatus(renterStatus.id, {
            status: newStage,
            applicationId: applicationId,
            notes: notes
          })
        } else {
          // If no existing renter status found, create one
          if (status === "approved" || status === "rejected" || status === "under_review") {
            const newStage = "application" // All application statuses stay in application column
            const notes = status === "approved" ? "Application approved" : 
                         status === "rejected" ? "Application rejected" : "Application under review"
            
            await renterStatusService.createRenterStatus({
              propertyId: applicationData.propertyId,
              landlordId: applicationData.landlordId,
              renterEmail: applicationData.renterEmail,
              renterName: applicationData.fullName?.split(' ')[0] || applicationData.renterEmail.split('@')[0],
              status: newStage,
              applicationId: applicationId,
              notes: notes
            })
          }
        }
      } catch (error) {
        console.error("Error updating renter status:", error)
        // Don't throw here - application status update should still succeed
      }
    }
  },

  async saveIncompleteApplication(invitationId: string, applicationData: any) {
    const docRef = doc(db, "applications", invitationId)
    await setDoc(docRef, {
      ...applicationData,
      updatedAt: serverTimestamp(),
    }, { merge: true }) // merge: true allows partial updates
  },
} 