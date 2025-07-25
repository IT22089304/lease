import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore"
import { db } from "../firebase"
import type { Lease } from "@/types"

export const leaseService = {
  // Get all leases for a landlord
  async getLandlordLeases(landlordId: string): Promise<Lease[]> {
    const q = query(collection(db, "leases"), where("landlordId", "==", landlordId))
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      startDate: doc.data().startDate?.toDate(),
      endDate: doc.data().endDate?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as Lease[]
  },

  // Get all leases for a renter
  async getRenterLeases(renterId: string): Promise<Lease[]> {
    const q = query(collection(db, "leases"), where("renterId", "==", renterId))
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      startDate: doc.data().startDate?.toDate(),
      endDate: doc.data().endDate?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as Lease[]
  },

  // Get a single lease by ID
  async getLease(leaseId: string): Promise<Lease | null> {
    const docRef = doc(db, "leases", leaseId)
    const docSnap = await getDoc(docRef)
    
    if (!docSnap.exists()) {
      return null
    }

    return {
      id: docSnap.id,
      ...docSnap.data(),
      startDate: docSnap.data().startDate?.toDate(),
      endDate: docSnap.data().endDate?.toDate(),
      createdAt: docSnap.data().createdAt?.toDate(),
      updatedAt: docSnap.data().updatedAt?.toDate(),
    } as Lease
  },

  // Create a new lease
  async createLease(lease: Omit<Lease, "id" | "createdAt" | "updatedAt">): Promise<string> {
    const docRef = await addDoc(collection(db, "leases"), {
      ...lease,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    return docRef.id
  },

  // Update a lease
  async updateLease(leaseId: string, lease: Partial<Lease>): Promise<void> {
    const docRef = doc(db, "leases", leaseId)
    await updateDoc(docRef, {
      ...lease,
      updatedAt: serverTimestamp(),
    })
  },

  // Delete a lease
  async deleteLease(leaseId: string): Promise<void> {
    const docRef = doc(db, "leases", leaseId)
    await deleteDoc(docRef)
  }
} 