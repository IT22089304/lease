import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore"
import { db } from "../firebase"
import type { RentPayment } from "@/types"

export const paymentService = {
  // Get all payments for a lease
  async getLeasePayments(leaseId: string): Promise<RentPayment[]> {
    const q = query(
      collection(db, "payments"),
      where("leaseId", "==", leaseId),
      orderBy("dueDate", "desc")
    )
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      dueDate: doc.data().dueDate?.toDate(),
      paidDate: doc.data().paidDate?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
    })) as RentPayment[]
  },

  // Get a single payment by ID
  async getPayment(paymentId: string): Promise<RentPayment | null> {
    const docRef = doc(db, "payments", paymentId)
    const docSnap = await getDoc(docRef)
    
    if (!docSnap.exists()) {
      return null
    }

    return {
      id: docSnap.id,
      ...docSnap.data(),
      dueDate: docSnap.data().dueDate?.toDate(),
      paidDate: docSnap.data().paidDate?.toDate(),
      createdAt: docSnap.data().createdAt?.toDate(),
    } as RentPayment
  },

  // Create a new payment
  async createPayment(payment: Omit<RentPayment, "id" | "createdAt">): Promise<string> {
    const docRef = await addDoc(collection(db, "payments"), {
      ...payment,
      createdAt: serverTimestamp(),
    })
    return docRef.id
  },

  // Update a payment (e.g., mark as paid)
  async updatePayment(paymentId: string, payment: Partial<RentPayment>): Promise<void> {
    const docRef = doc(db, "payments", paymentId)
    await updateDoc(docRef, {
      ...payment,
      updatedAt: serverTimestamp(),
    })
  },

  // Get overdue payments for a lease
  async getOverduePayments(leaseId: string): Promise<RentPayment[]> {
    const q = query(
      collection(db, "payments"),
      where("leaseId", "==", leaseId),
      where("status", "==", "overdue")
    )
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      dueDate: doc.data().dueDate?.toDate(),
      paidDate: doc.data().paidDate?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
    })) as RentPayment[]
  },

  // Get pending payments for a lease
  async getPendingPayments(leaseId: string): Promise<RentPayment[]> {
    const q = query(
      collection(db, "payments"),
      where("leaseId", "==", leaseId),
      where("status", "==", "pending")
    )
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      dueDate: doc.data().dueDate?.toDate(),
      paidDate: doc.data().paidDate?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
    })) as RentPayment[]
  },

  // Get all payments for a landlord
  async getLandlordPayments(landlordId: string): Promise<RentPayment[]> {
    const q = query(
      collection(db, "payments"),
      where("landlordId", "==", landlordId)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      dueDate: doc.data().dueDate?.toDate(),
      paidDate: doc.data().paidDate?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
    })) as RentPayment[];
  },

  // Get all payments for a renter
  async getRenterPayments(renterId: string): Promise<RentPayment[]> {
    const q = query(
      collection(db, "payments"),
      where("renterId", "==", renterId),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      dueDate: doc.data().dueDate?.toDate(),
      paidDate: doc.data().paidDate?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
    })) as RentPayment[];
  },
} 