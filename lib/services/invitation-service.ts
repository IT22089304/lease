import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, updateDoc } from "firebase/firestore"
import { db } from "../firebase"
import { noticeService } from "./notice-service"

export const invitationService = {
  async createInvitation(invitation: {
    propertyId: string
    landlordId: string
    renterEmail: string
    status: string
    invitedAt?: Date
  }) {
    // Create the invitation
    const invitationRef = await addDoc(collection(db, "invitations"), {
      ...invitation,
      invitedAt: invitation.invitedAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    // Also create a notice for the renter
    try {
      console.log("[InvitationService] Creating notice for invitation:", invitationRef.id)
      const noticeData = {
        landlordId: invitation.landlordId,
        propertyId: invitation.propertyId,
        renterId: invitation.renterEmail,
        renterEmail: invitation.renterEmail, // Set both for consistency
        type: "invitation_sent",
        subject: "New Property Invitation",
        message: `You have received an invitation to view a property. Click "View" to see the property details and accept or reject the invitation.`,
        // Add invitation ID to the notice data
        invitationId: invitationRef.id
      }
      console.log("[InvitationService] Notice data:", noticeData)
      await noticeService.createNotice(noticeData)
      console.log("[InvitationService] Notice created successfully")
    } catch (error) {
      console.error("Error creating invitation notice:", error)
      // Don't fail the invitation creation if notice creation fails
    }

    return invitationRef.id
  },

  async updateInvitationStatus(invitationId: string, status: string) {
    const invitationRef = doc(db, "invitations", invitationId)
    await updateDoc(invitationRef, {
      status,
      respondedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  },

  async getLandlordInvitations(landlordId: string) {
    const q = query(collection(db, "invitations"), where("landlordId", "==", landlordId))
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data(),
      invitedAt: doc.data().invitedAt?.toDate(),
      respondedAt: doc.data().respondedAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as any[]
  },

  async getInvitationsForEmail(email: string) {
    const q = query(collection(db, "invitations"), where("renterEmail", "==", email))
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data(),
      invitedAt: doc.data().invitedAt?.toDate(),
      respondedAt: doc.data().respondedAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as any[]
  },

  async getPropertyInvitations(propertyId: string) {
    console.log("Fetching invitations for propertyId:", propertyId)
    const q = query(collection(db, "invitations"), where("propertyId", "==", propertyId))
    const snapshot = await getDocs(q)
    console.log("Raw invitation data:", snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
    return snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data(),
      invitedAt: doc.data().invitedAt?.toDate(),
      respondedAt: doc.data().respondedAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as any[]
  },
} 