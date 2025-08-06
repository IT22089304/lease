import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"
import { storage } from "@/lib/firebase"

export interface UploadedFile {
  name: string
  size: number
  type: string
  url: string
}

export class FileUploadService {
  /**
   * Upload a file to Firebase Storage
   * @param file - The file to upload
   * @param path - The storage path (e.g., 'messages', 'notices')
   * @param userId - The user ID for organizing files
   * @returns Promise<UploadedFile>
   */
  static async uploadFile(
    file: File, 
    path: string, 
    userId: string
  ): Promise<UploadedFile> {
    try {
      // Create a unique filename to avoid conflicts
      const timestamp = Date.now()
      const fileName = `${timestamp}_${file.name}`
      const storagePath = `${path}/${userId}/${fileName}`
      
      // Create a reference to the file location
      const storageRef = ref(storage, storagePath)
      
      // Upload the file
      const snapshot = await uploadBytes(storageRef, file)
      
      // Get the download URL
      const downloadURL = await getDownloadURL(snapshot.ref)
      
      return {
        name: file.name,
        size: file.size,
        type: file.type,
        url: downloadURL
      }
    } catch (error) {
      console.error("Error uploading file:", error)
      throw new Error("Failed to upload file")
    }
  }

  /**
   * Upload multiple files to Firebase Storage
   * @param files - Array of files to upload
   * @param path - The storage path
   * @param userId - The user ID for organizing files
   * @returns Promise<UploadedFile[]>
   */
  static async uploadFiles(
    files: File[], 
    path: string, 
    userId: string
  ): Promise<UploadedFile[]> {
    try {
      const uploadPromises = files.map(file => this.uploadFile(file, path, userId))
      return await Promise.all(uploadPromises)
    } catch (error) {
      console.error("Error uploading files:", error)
      throw new Error("Failed to upload files")
    }
  }

  /**
   * Delete a file from Firebase Storage
   * @param fileUrl - The download URL of the file to delete
   * @returns Promise<void>
   */
  static async deleteFile(fileUrl: string): Promise<void> {
    try {
      // Extract the file path from the URL
      const url = new URL(fileUrl)
      const path = decodeURIComponent(url.pathname.split('/o/')[1]?.split('?')[0] || '')
      
      if (!path) {
        throw new Error("Invalid file URL")
      }
      
      const storageRef = ref(storage, path)
      await deleteObject(storageRef)
    } catch (error) {
      console.error("Error deleting file:", error)
      throw new Error("Failed to delete file")
    }
  }

  /**
   * Delete multiple files from Firebase Storage
   * @param fileUrls - Array of download URLs to delete
   * @returns Promise<void>
   */
  static async deleteFiles(fileUrls: string[]): Promise<void> {
    try {
      const deletePromises = fileUrls.map(url => this.deleteFile(url))
      await Promise.all(deletePromises)
    } catch (error) {
      console.error("Error deleting files:", error)
      throw new Error("Failed to delete files")
    }
  }
} 