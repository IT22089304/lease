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
import { imageUploadService } from "./image-upload-service"
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

  // Add a new property with image uploads
  async addProperty(property: Omit<Property, "id" | "createdAt" | "updatedAt">, imageFiles?: File[]): Promise<string> {
    let imageUrls: string[] = []
    
    // Upload images if provided
    if (imageFiles && imageFiles.length > 0) {
      try {
        imageUrls = await imageUploadService.uploadMultipleImages(imageFiles)
      } catch (error) {
        console.error("Error uploading images:", error)
        throw new Error("Failed to upload images")
      }
    }

    const docRef = await addDoc(collection(db, "properties"), {
      ...property,
      images: imageUrls,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    return docRef.id
  },

  // Update a property with image uploads
  async updateProperty(propertyId: string, property: Partial<Property>, imageFiles?: File[], deletedImages?: string[]): Promise<void> {
    // Get existing property to preserve images if not being updated
    const existingProperty = await this.getProperty(propertyId)
    let imageUrls: string[] = property.images || existingProperty?.images || []
    
    // Upload new images if provided
    if (imageFiles && imageFiles.length > 0) {
      try {
        const newImageUrls = await imageUploadService.uploadMultipleImages(imageFiles)
        imageUrls = [...imageUrls, ...newImageUrls]
      } catch (error) {
        console.error("Error uploading images:", error)
        throw new Error("Failed to upload images")
      }
    }

    // Delete removed images from storage
    if (deletedImages && deletedImages.length > 0) {
      try {
        await imageUploadService.deleteMultipleImages(deletedImages)
      } catch (error) {
        console.error("Error deleting images:", error)
        // Don't throw error as images might already be deleted
      }
    }

    const docRef = doc(db, "properties", propertyId)
    await updateDoc(docRef, {
      ...property,
      images: imageUrls,
      updatedAt: serverTimestamp(),
    })
  },

  // Delete a property and its images
  async deleteProperty(propertyId: string): Promise<void> {
    // Get the property first to delete its images
    const property = await this.getProperty(propertyId)
    
    if (property?.images && property.images.length > 0) {
      try {
        await imageUploadService.deleteMultipleImages(property.images)
      } catch (error) {
        console.error("Error deleting property images:", error)
        // Continue with property deletion even if image deletion fails
      }
    }

    const docRef = doc(db, "properties", propertyId)
    await deleteDoc(docRef)
  }
} 