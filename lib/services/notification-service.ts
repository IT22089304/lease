import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, updateDoc, writeBatch } from "firebase/firestore"
import { db } from "../firebase"

export interface Notification {
  id: string
  landlordId?: string
  renterId?: string
  type: "application_submitted" | "application_approved" | "application_rejected" | "invitation_sent" | "tenant_moved_in" | "payment_received" | "lease_completed" | "lease_received" | "invoice_sent" | "renter_message"
  title: string
  message: string
  data?: any
  readAt?: Date
  createdAt: Date
  navigation?: {
    type: "page" | "modal" | "external"
    path?: string
    params?: Record<string, string | undefined>
    action?: string
  }
}

export const notificationService = {
  // Create a new notification
  async createNotification(notification: Omit<Notification, "id" | "createdAt">) {
    console.log("[NotificationService] Creating notification:", notification);
    const docRef = await addDoc(collection(db, "notifications"), {
      ...notification,
      createdAt: serverTimestamp(),
      readAt: null,
    })
    console.log("[NotificationService] Notification created with ID:", docRef.id);
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

  // Get notifications for a renter
  async getRenterNotifications(renterId: string): Promise<Notification[]> {
    console.log("[NotificationService] Getting notifications for renter:", renterId);
    const q = query(
      collection(db, "notifications"),
      where("renterId", "==", renterId),
      where("createdAt", ">", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) // Last 30 days
    )
    const snapshot = await getDocs(q)
    console.log("[NotificationService] Found notifications:", snapshot.docs.length);
    const notifications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      readAt: doc.data().readAt?.toDate(),
    })) as Notification[]
    console.log("[NotificationService] Returning notifications:", notifications.length);
    return notifications
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

  // Get unread notifications count for a renter
  async getRenterUnreadCount(renterId: string): Promise<number> {
    const q = query(
      collection(db, "notifications"),
      where("renterId", "==", renterId),
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

  // Mark all notifications as read for a renter
  async markAllRenterNotificationsAsRead(renterId: string): Promise<void> {
    const q = query(
      collection(db, "notifications"),
      where("renterId", "==", renterId),
      where("readAt", "==", null)
    )
    const snapshot = await getDocs(q)
    
    const batch = writeBatch(db)
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, { readAt: serverTimestamp() })
    })
    
    await batch.commit()
  },

  // Get navigation data for notification type
  getNotificationNavigation(type: Notification["type"], data?: any) {
    switch (type) {
      case "application_submitted":
        return {
          type: "page" as const,
          path: "/applications",
          params: { tab: "submitted" },
          action: "view_applications"
        }
      case "application_approved":
        return {
          type: "page" as const,
          path: "/applications",
          params: { tab: "under_review" },
          action: "view_applications"
        }
      case "application_rejected":
        return {
          type: "page" as const,
          path: "/applications",
          params: { tab: "all" },
          action: "view_applications"
        }
      case "tenant_moved_in":
        return {
          type: "page" as const,
          path: "/properties",
          params: data?.propertyId ? { propertyId: data.propertyId.toString() } : undefined,
          action: "view_property"
        }
      case "payment_received":
        return {
          type: "page" as const,
          path: "/dashboard/incomes",
          action: "view_income"
        }
      case "lease_completed":
        return {
          type: "page" as const,
          path: "/notifications",
          params: { tab: "lease" },
          action: "view_lease_notifications"
        }
      case "lease_received":
        return {
          type: "page" as const,
          path: "/notifications",
          params: { tab: "lease" },
          action: "view_lease_notifications"
        }
      case "invoice_sent":
        return {
          type: "page" as const,
          path: "/notifications",
          params: { tab: "sent" },
          action: "view_sent_notifications"
        }
      case "renter_message":
        return {
          type: "page" as const,
          path: `/dashboard/notice/${data?.propertyId || ""}`,
          params: { tab: "received" },
          action: "view_received_messages"
        }
      default:
        return {
          type: "page" as const,
          path: "/notifications",
          action: "view_all_notifications"
        }
    }
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
      },
      navigation: this.getNotificationNavigation("application_submitted", {
        propertyId: applicationData.propertyId
      })
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
      },
      navigation: this.getNotificationNavigation(status === "approved" ? "application_approved" : "application_rejected", {
        applicationId
      })
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
      },
      navigation: this.getNotificationNavigation("tenant_moved_in", {
        propertyId
      })
    }
    
    return await this.createNotification(notification)
  },

  // Create payment received notification
  async notifyPaymentReceived(landlordId: string, propertyId: string, renterEmail: string, amount: number, propertyName?: string, month?: string) {
    const propertyTitle = propertyName || `Property ${propertyId.slice(-6)}`
    const monthText = month ? ` for ${month}` : ""
    
    const notification: Omit<Notification, "id" | "createdAt"> = {
      landlordId,
      type: "payment_received",
      title: "Payment Received",
      message: `Payment of $${amount.toLocaleString()} received for ${propertyTitle}${monthText} from ${renterEmail}.`,
      data: {
        propertyId,
        renterEmail,
        amount,
        propertyName: propertyTitle,
        month,
      },
      navigation: this.getNotificationNavigation("payment_received", {
        propertyId
      })
    }
    
    return await this.createNotification(notification)
  },

  // Create lease completed notification
  async notifyLeaseCompleted(landlordId: string, propertyId: string, renterEmail: string, leaseAgreementId?: string) {
    const notification: Omit<Notification, "id" | "createdAt"> = {
      landlordId,
      type: "lease_completed",
      title: "Lease Agreement Completed",
      message: `A lease agreement has been completed for your property. Click to view the signed document.`,
      data: {
        propertyId,
        renterEmail,
        leaseAgreementId,
      },
      navigation: this.getNotificationNavigation("lease_completed", {
        propertyId,
        leaseAgreementId
      })
    }
    
    return await this.createNotification(notification)
  },

  // Create lease received notification (when renter submits completed lease)
  async notifyLeaseReceived(landlordId: string, propertyId: string, renterEmail: string, leaseAgreementId: string) {
    const notification: Omit<Notification, "id" | "createdAt"> = {
      landlordId,
      type: "lease_received",
      title: "Lease Agreement Received",
      message: `A tenant has submitted a completed lease agreement for your property. Click to review and sign.`,
      data: {
        propertyId,
        renterEmail,
        leaseAgreementId,
      },
      navigation: this.getNotificationNavigation("lease_received", {
        propertyId,
        leaseAgreementId
      })
    }
    
    return await this.createNotification(notification)
  },

  // Create renter message notification
  async notifyRenterMessage(landlordId: string, propertyId: string, renterName: string, renterEmail: string, messagePreview: string, messageId: string) {
    const notification: Omit<Notification, "id" | "createdAt"> = {
      landlordId,
      type: "renter_message",
      title: "New Message from Tenant",
      message: `${renterName} (${renterEmail}) sent you a message: "${messagePreview.length > 50 ? messagePreview.substring(0, 50) + '...' : messagePreview}"`,
      data: {
        propertyId,
        renterName,
        renterEmail,
        messageId,
        messagePreview,
      },
      navigation: this.getNotificationNavigation("renter_message", {
        propertyId
      })
    }
    
    return await this.createNotification(notification)
  }
} 