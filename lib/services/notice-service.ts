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
    
    // Filter out notices that should only be visible to landlords
    const notices = querySnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
        sentAt: doc.data().sentAt?.toDate(),
        readAt: doc.data().readAt?.toDate(),
      }))
      .filter((notice: any) => 
        notice.type !== "lease_completed" && 
        notice.type !== "payment_received" // Filter out landlord-specific payment notices
      )
    
    return notices as Notice[]
  },

  // Get all notices sent by a landlord
  async getLandlordNotices(landlordId: string): Promise<Notice[]> {
    const q = query(
      collection(db, "notices"),
      where("landlordId", "==", landlordId),
      orderBy("sentAt", "desc")
    )
    const querySnapshot = await getDocs(q)
    
    // Include all notices for landlord, including payment_received notices
    const notices = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      sentAt: doc.data().sentAt?.toDate(),
      readAt: doc.data().readAt?.toDate(),
    }))
    
    return notices as Notice[]
  },

  // Get lease-related notices for landlords (like lease completions)
  async getLandlordLeaseNotices(landlordId: string): Promise<Notice[]> {
    // First get all notices for the landlord
    const q = query(
      collection(db, "notices"),
      where("landlordId", "==", landlordId),
      orderBy("sentAt", "desc")
    )
    const querySnapshot = await getDocs(q)
    
    console.log(`[NoticeService] Found ${querySnapshot.size} total notices for landlord ${landlordId}`)
    
    // Filter for lease-related notices in memory
    const leaseNotices = querySnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
        sentAt: doc.data().sentAt?.toDate(),
        readAt: doc.data().readAt?.toDate(),
      }))
      .filter((notice: any) => {
        const isLeaseNotice = notice.type === "lease_completed" || notice.type === "lease_received"
        console.log(`[NoticeService] Notice ${notice.id}: type=${notice.type}, isLeaseNotice=${isLeaseNotice}`)
        return isLeaseNotice
      })
    
    console.log(`[NoticeService] Filtered to ${leaseNotices.length} lease notices`)
    
    return leaseNotices as Notice[]
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
    console.log("[NoticeService] Creating notice:", notice)
    const docRef = await addDoc(collection(db, "notices"), {
      ...notice,
      sentAt: serverTimestamp(),
      readAt: null,
      updatedAt: serverTimestamp(),
    })
    console.log("[NoticeService] Notice created with ID:", docRef.id)
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