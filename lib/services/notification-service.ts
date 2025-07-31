import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, updateDoc, writeBatch } from "firebase/firestore"
import { db } from "../firebase"

export interface Notification {
  id: string
  landlordId: string
  type: "application_submitted" | "application_approved" | "application_rejected" | "invitation_sent" | "tenant_moved_in"
  title: string
  message: string
  data?: any
  readAt?: Date
  createdAt: Date
}

export const notificationService = {
  // Create a new notification
  async createNotification(notification: Omit<Notification, "id" | "createdAt">) {
    const docRef = await addDoc(collection(db, "notifications"), {
      ...notification,
      createdAt: serverTimestamp(),
      readAt: null,
    })
    return docRef.id
  },

  // Get notifications for a landlord
  async getLandlordNotifications(landlordId: string): Promise<Notification[]> {
    const q = query(
      collection(db, "notifications"),
      where("landlordId", "==", landlordId),
      where("createdAt", ">", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) // Last 30 days
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      readAt: doc.data().readAt?.toDate(),
    })) as Notification[]
  },

  // Get unread notifications count for a landlord
  async getUnreadCount(landlordId: string): Promise<number> {
    const q = query(
      collection(db, "notifications"),
      where("landlordId", "==", landlordId),
      where("readAt", "==", null)
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.length
  },

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<void> {
    const docRef = doc(db, "notifications", notificationId)
    await updateDoc(docRef, {
      readAt: serverTimestamp(),
    })
  },

  // Mark all notifications as read for a landlord
  async markAllAsRead(landlordId: string): Promise<void> {
    const q = query(
      collection(db, "notifications"),
      where("landlordId", "==", landlordId),
      where("readAt", "==", null)
    )
    const snapshot = await getDocs(q)
    
    const batch = writeBatch(db)
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, { readAt: serverTimestamp() })
    })
    
    await batch.commit()
  },

  // Create application submitted notification
  async notifyApplicationSubmitted(landlordId: string, applicationData: any) {
    const notification: Omit<Notification, "id" | "createdAt"> = {
      landlordId,
      type: "application_submitted",
      title: "New Application Submitted",
      message: `A new rental application has been submitted for your property.`,
      data: {
        applicationId: applicationData.invitationId,
        propertyId: applicationData.propertyId,
        renterEmail: applicationData.renterEmail,
        fullName: applicationData.fullName,
      }
    }
    
    return await this.createNotification(notification)
  },

  // Create application status change notification
  async notifyApplicationStatusChange(landlordId: string, applicationId: string, status: string, renterEmail: string) {
    const statusMessages = {
      approved: "Your rental application has been approved!",
      rejected: "Your rental application has been rejected.",
      under_review: "Your rental application is now under review."
    }
    
    const notification: Omit<Notification, "id" | "createdAt"> = {
      landlordId,
      type: status === "approved" ? "application_approved" : "application_rejected",
      title: `Application ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      message: statusMessages[status as keyof typeof statusMessages] || `Application status changed to ${status}`,
      data: {
        applicationId,
        status,
        renterEmail,
      }
    }
    
    return await this.createNotification(notification)
  },

  // Create tenant moved in notification
  async notifyTenantMovedIn(landlordId: string, propertyId: string, renterEmail: string, propertyAddress: string) {
    const notification: Omit<Notification, "id" | "createdAt"> = {
      landlordId,
      type: "tenant_moved_in",
      title: "New Tenant Moved In",
      message: `A new tenant has moved into your property at ${propertyAddress}. The lease is now active and rent payments have been received.`,
      data: {
        propertyId,
        renterEmail,
        propertyAddress,
      }
    }
    
    return await this.createNotification(notification)
  }
} 