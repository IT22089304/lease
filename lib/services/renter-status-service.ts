import { collection, addDoc, updateDoc, doc, getDocs, query, where, serverTimestamp, deleteDoc } from "firebase/firestore"
import { db } from "../firebase"

export interface RenterStatus {
  id?: string
  propertyId: string
  landlordId: string
  renterEmail: string
  renterName?: string
  status: "invite" | "application" | "lease" | "lease_rejected" | "accepted" | "payment" | "leased"
  invitationId?: string
  applicationId?: string
  leaseId?: string
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export const renterStatusService = {
  async createRenterStatus(statusData: Omit<RenterStatus, 'id' | 'createdAt' | 'updatedAt'>) {
    const docRef = await addDoc(collection(db, "renterStatus"), {
      ...statusData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    return docRef.id
  },

  async updateRenterStatus(statusId: string, updates: Partial<RenterStatus>) {
    const statusRef = doc(db, "renterStatus", statusId)
    await updateDoc(statusRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    })
  },

  async getRenterStatusByProperty(propertyId: string) {
    const q = query(collection(db, "renterStatus"), where("propertyId", "==", propertyId))
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as RenterStatus[]
  },

  async getRenterStatusByLandlord(landlordId: string) {
    const q = query(collection(db, "renterStatus"), where("landlordId", "==", landlordId))
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as RenterStatus[]
  },

  async getRenterStatusByEmail(email: string, propertyId?: string) {
    let q = query(collection(db, "renterStatus"), where("renterEmail", "==", email))
    if (propertyId) {
      q = query(q, where("propertyId", "==", propertyId))
    }
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as RenterStatus[]
  },

  async deleteRenterStatus(statusId: string) {
    const statusRef = doc(db, "renterStatus", statusId)
    await deleteDoc(statusRef)
  },

  async moveRenterToStage(statusId: string, newStage: RenterStatus['status'], notes?: string) {
    const statusRef = doc(db, "renterStatus", statusId)
    await updateDoc(statusRef, {
      status: newStage,
      notes: notes,
      updatedAt: serverTimestamp(),
    })
  },

  async syncFromInvitations(propertyId: string, landlordId: string) {
    // This would sync invitations to renter status
    // Implementation depends on your invitation structure
  },

  async syncFromApplications(propertyId: string, landlordId: string) {
    // This would sync applications to renter status
    // Implementation depends on your application structure
  },

  async syncFromLeases(propertyId: string, landlordId: string) {
    // This would sync leases to renter status
    // Implementation depends on your lease structure
  }
} 