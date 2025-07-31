import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, updateDoc, setDoc } from "firebase/firestore"
import { db } from "../firebase"
import { notificationService } from "./notification-service"

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

  async updateApplicationStatus(applicationId: string, status: string) {
    const docRef = doc(db, "applications", applicationId)
    await updateDoc(docRef, {
      status,
      reviewedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  },

  async saveIncompleteApplication(invitationId: string, applicationData: any) {
    const docRef = doc(db, "applications", invitationId)
    await setDoc(docRef, {
      ...applicationData,
      updatedAt: serverTimestamp(),
    }, { merge: true }) // merge: true allows partial updates
  },
} 