import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  orderBy,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore"
import { db } from "../firebase"
import type { Invoice } from "@/types"

export const invoiceService = {
  // Create a new invoice
  async createInvoice(invoice: Omit<Invoice, "id" | "createdAt" | "updatedAt">): Promise<string> {
    const docRef = await addDoc(collection(db, "invoices"), {
      ...invoice,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    return docRef.id
  },

  // Get invoices for a renter
  async getRenterInvoices(renterEmail: string): Promise<Invoice[]> {
    const q = query(
      collection(db, "invoices"),
      where("renterEmail", "==", renterEmail),
      orderBy("createdAt", "desc")
    )
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as Invoice[]
  },

  // Get invoices for a landlord
  async getLandlordInvoices(landlordId: string): Promise<Invoice[]> {
    const q = query(
      collection(db, "invoices"),
      where("landlordId", "==", landlordId),
      orderBy("createdAt", "desc")
    )
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as Invoice[]
  },

  // Get a single invoice by ID
  async getInvoice(invoiceId: string): Promise<Invoice | null> {
    const docRef = doc(db, "invoices", invoiceId)
    const docSnap = await getDoc(docRef)
    
    if (!docSnap.exists()) {
      return null
    }

    return {
      id: docSnap.id,
      ...docSnap.data(),
      createdAt: docSnap.data().createdAt?.toDate(),
      updatedAt: docSnap.data().updatedAt?.toDate(),
    } as Invoice
  },

  // Update invoice status
  async updateInvoiceStatus(invoiceId: string, status: Invoice["status"]): Promise<void> {
    const docRef = doc(db, "invoices", invoiceId)
    await updateDoc(docRef, {
      status,
      updatedAt: serverTimestamp(),
    })
  }
} 