import {
  doc,
  updateDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore"
import { db } from "../firebase"

export const userService = {
  // Update renter's current property
  async updateRenterCurrentProperty(renterId: string, propertyId: string, propertyDetails: any): Promise<void> {
    const userRef = doc(db, "users", renterId)
    await updateDoc(userRef, {
      currentPropertyId: propertyId,
      currentPropertyDetails: propertyDetails,
      updatedAt: serverTimestamp(),
    })
  },

  // Get user by ID
  async getUser(userId: string) {
    const userRef = doc(db, "users", userId)
    const userSnap = await getDoc(userRef)
    
    if (!userSnap.exists()) {
      return null
    }

    return {
      id: userSnap.id,
      ...userSnap.data(),
      createdAt: userSnap.data().createdAt?.toDate(),
      updatedAt: userSnap.data().updatedAt?.toDate(),
    }
  }
} 