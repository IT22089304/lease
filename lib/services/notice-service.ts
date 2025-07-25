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
  orderBy,
  serverTimestamp,
} from "firebase/firestore"
import { db } from "../firebase"
import type { Notice } from "@/types"

export const noticeService = {
  // Get all notices for a property
  async getPropertyNotices(propertyId: string): Promise<Notice[]> {
    const q = query(
      collection(db, "notices"),
      where("propertyId", "==", propertyId),
      orderBy("sentAt", "desc")
    )
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      sentAt: doc.data().sentAt?.toDate(),
      readAt: doc.data().readAt?.toDate(),
    })) as Notice[]
  },

  // Get all notices for a renter
  async getRenterNotices(renterEmail: string): Promise<Notice[]> {
    const q = query(
      collection(db, "notices"),
      where("renterId", "==", renterEmail),
      orderBy("sentAt", "desc")
    )
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      sentAt: doc.data().sentAt?.toDate(),
      readAt: doc.data().readAt?.toDate(),
    })) as Notice[]
  },

  // Get all notices sent by a landlord
  async getLandlordNotices(landlordId: string): Promise<Notice[]> {
    const q = query(
      collection(db, "notices"),
      where("landlordId", "==", landlordId),
      orderBy("sentAt", "desc")
    )
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      sentAt: doc.data().sentAt?.toDate(),
      readAt: doc.data().readAt?.toDate(),
    })) as Notice[]
  },

  // Get a single notice by ID
  async getNotice(noticeId: string): Promise<Notice | null> {
    const docRef = doc(db, "notices", noticeId)
    const docSnap = await getDoc(docRef)
    
    if (!docSnap.exists()) {
      return null
    }

    return {
      id: docSnap.id,
      ...docSnap.data(),
      sentAt: docSnap.data().sentAt?.toDate(),
      readAt: docSnap.data().readAt?.toDate(),
    } as Notice
  },

  // Create a new notice
  async createNotice(notice: Omit<Notice, "id" | "sentAt" | "readAt">) {
    await addDoc(collection(db, "notices"), {
      ...notice,
      sentAt: serverTimestamp(),
      readAt: null,
      updatedAt: serverTimestamp(),
    })
  },

  // Mark a notice as read
  async markAsRead(noticeId: string): Promise<void> {
    const docRef = doc(db, "notices", noticeId)
    await updateDoc(docRef, {
      readAt: serverTimestamp(),
    })
  },

  // Delete a notice
  async deleteNotice(noticeId: string): Promise<void> {
    const docRef = doc(db, "notices", noticeId)
    await deleteDoc(docRef)
  },

  // Get unread notices count for a renter
  async getUnreadNoticesCount(renterId: string): Promise<number> {
    const q = query(
      collection(db, "notices"),
      where("renterId", "==", renterId),
      where("readAt", "==", null)
    )
    const querySnapshot = await getDocs(q)
    return querySnapshot.size
  }
} 