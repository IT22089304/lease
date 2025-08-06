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
  deleteDoc,
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

  // Check if a payment already exists for the same month and amount
  async checkExistingPayment(leaseId: string, amount: number, dueDate: Date): Promise<boolean> {
    const q = query(
      collection(db, "payments"),
      where("leaseId", "==", leaseId),
      where("amount", "==", amount),
      where("status", "in", ["paid", "pending"])
    )
    const querySnapshot = await getDocs(q)
    
    // Check if there's already a payment for the same month
    const dueMonth = dueDate.getMonth()
    const dueYear = dueDate.getFullYear()
    
    return querySnapshot.docs.some(doc => {
      const paymentData = doc.data()
      const paymentDueDate = paymentData.dueDate?.toDate?.() || new Date(paymentData.dueDate)
      return paymentDueDate.getMonth() === dueMonth && paymentDueDate.getFullYear() === dueYear
    })
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

  // Update a payment
  async updatePayment(paymentId: string, updates: Partial<RentPayment>): Promise<void> {
    const docRef = doc(db, "payments", paymentId)
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    })
  },

  // Remove duplicate payments for a lease
  async removeDuplicatePayments(leaseId: string): Promise<void> {
    const payments = await this.getLeasePayments(leaseId)
    const duplicates = new Map<string, RentPayment[]>()
    
    // Group payments by month and amount
    payments.forEach(payment => {
      const paymentDate = payment.dueDate ? new Date(payment.dueDate) : new Date(0)
      const key = `${paymentDate.getMonth()}-${paymentDate.getFullYear()}-${payment.amount}`
      
      if (!duplicates.has(key)) {
        duplicates.set(key, [])
      }
      duplicates.get(key)!.push(payment)
    })
    
    // Remove duplicates, keeping the paid one if available, otherwise the oldest
    for (const [key, paymentGroup] of duplicates) {
      if (paymentGroup.length > 1) {
        console.log(`Found ${paymentGroup.length} duplicate payments for key: ${key}`)
        
        // First, try to find a paid payment
        const paidPayment = paymentGroup.find(p => p.status === "paid")
        
        if (paidPayment) {
          console.log(`Keeping paid payment for ${key}`)
          // Remove all other payments except the paid one
          const paymentsToRemove = paymentGroup.filter(p => p.id !== paidPayment.id)
          for (const payment of paymentsToRemove) {
            const docRef = doc(db, "payments", payment.id)
            await deleteDoc(docRef)
            console.log(`Removed duplicate payment: ${payment.id}`)
          }
        } else {
          // Sort by creation date to keep the oldest
          paymentGroup.sort((a, b) => {
            const aDate = a.createdAt ? new Date(a.createdAt) : new Date(0)
            const bDate = b.createdAt ? new Date(b.createdAt) : new Date(0)
            return aDate.getTime() - bDate.getTime()
          })
          
          // Remove all but the first payment
          const paymentsToRemove = paymentGroup.slice(1)
          for (const payment of paymentsToRemove) {
            const docRef = doc(db, "payments", payment.id)
            await deleteDoc(docRef)
            console.log(`Removed duplicate payment: ${payment.id}`)
          }
        }
      }
    }
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