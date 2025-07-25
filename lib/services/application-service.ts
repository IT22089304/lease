import { collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore"
import { db } from "../firebase"

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
    await addDoc(collection(db, "applications"), {
      ...application,
      submittedAt: application.submittedAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  },

  async getApplicationsForLandlord(landlordId: string) {
    const q = query(collection(db, "applications"), where("landlordId", "==", landlordId))
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  },
} 