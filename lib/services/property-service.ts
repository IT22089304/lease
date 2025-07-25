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
import type { Property } from "@/types"

export const propertyService = {
  // Get all properties for a landlord
  async getLandlordProperties(landlordId: string): Promise<Property[]> {
    const q = query(collection(db, "properties"), where("landlordId", "==", landlordId))
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as Property[]
  },

  // Get a single property by ID
  async getProperty(propertyId: string): Promise<Property | null> {
    const docRef = doc(db, "properties", propertyId)
    const docSnap = await getDoc(docRef)
    
    if (!docSnap.exists()) {
      return null
    }

    return {
      id: docSnap.id,
      ...docSnap.data(),
      createdAt: docSnap.data().createdAt?.toDate(),
      updatedAt: docSnap.data().updatedAt?.toDate(),
    } as Property
  },

  // Add a new property
  async addProperty(property: Omit<Property, "id" | "createdAt" | "updatedAt">): Promise<string> {
    const docRef = await addDoc(collection(db, "properties"), {
      ...property,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    return docRef.id
  },

  // Update a property
  async updateProperty(propertyId: string, property: Partial<Property>): Promise<void> {
    const docRef = doc(db, "properties", propertyId)
    await updateDoc(docRef, {
      ...property,
      updatedAt: serverTimestamp(),
    })
  },

  // Delete a property
  async deleteProperty(propertyId: string): Promise<void> {
    const docRef = doc(db, "properties", propertyId)
    await deleteDoc(docRef)
  }
} 