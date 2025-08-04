import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, updateDoc } from "firebase/firestore"
import { db } from "../firebase"

export const invitationService = {
  async createInvitation(invitation: {
    propertyId: string
    landlordId: string
    renterEmail: string
    status: string
    invitedAt?: Date
  }) {
    await addDoc(collection(db, "invitations"), {
      ...invitation,
      invitedAt: invitation.invitedAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
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