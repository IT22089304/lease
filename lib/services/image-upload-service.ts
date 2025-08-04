import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"
import { storage } from "../firebase"

export const imageUploadService = {
  // Upload a single image file
  async uploadImage(file: File, folder: string = "properties"): Promise<string> {
    const timestamp = Date.now()
    const fileName = `${folder}/${timestamp}_${file.name}`
    const storageRef = ref(storage, fileName)
    
    const snapshot = await uploadBytes(storageRef, file)
    const downloadURL = await getDownloadURL(snapshot.ref)
    
    return downloadURL
  },

  // Upload multiple image files
  async uploadMultipleImages(files: File[], folder: string = "properties"): Promise<string[]> {
    const uploadPromises = files.map(file => this.uploadImage(file, folder))
    return Promise.all(uploadPromises)
  },

  // Delete an image from storage
  async deleteImage(imageUrl: string): Promise<void> {
    try {
      const imageRef = ref(storage, imageUrl)
      await deleteObject(imageRef)
    } catch (error) {
      console.error("Error deleting image:", error)
      // Don't throw error as the image might already be deleted
    }
  },

  // Delete multiple images from storage
  async deleteMultipleImages(imageUrls: string[]): Promise<void> {
    const deletePromises = imageUrls.map(url => this.deleteImage(url))
    await Promise.all(deletePromises)
  },

  // Validate image file
  validateImage(file: File): { isValid: boolean; error?: string } {
    // Check file type
    if (!file.type.startsWith('image/')) {
      return { isValid: false, error: 'File must be an image' }
    }

    // Check file size (5MB limit)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return { isValid: false, error: 'File size must be less than 5MB' }
    }

    return { isValid: true }
  }
} 