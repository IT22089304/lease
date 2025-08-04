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
import type { Invoice, RentPayment } from "@/types"

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
  },

  // Create separate payment records from invoice breakdown
  async createPaymentRecordsFromInvoice(invoice: Invoice, transactionId: string): Promise<void> {
    const { paymentService } = await import("./payment-service")
    const { securityDepositService } = await import("./security-deposit-service")

    // Create security deposit record if applicable
    if (invoice.securityDeposit > 0) {
      await securityDepositService.createDeposit({
        leaseId: invoice.propertyId,
        renterId: invoice.renterId,
        landlordId: invoice.landlordId,
        amount: invoice.securityDeposit,
        paidDate: new Date(),
        paymentMethod: "Stripe Card",
        transactionId: transactionId,
        invoiceId: invoice.id, // Link to invoice
      })
    }

    // Create monthly rent payment record
    if (invoice.monthlyRent > 0) {
      await paymentService.createPayment({
        leaseId: invoice.propertyId,
        amount: invoice.monthlyRent,
        dueDate: new Date(),
        paidDate: new Date(),
        status: "paid",
        paymentMethod: "Stripe Card",
        transactionId: transactionId,
        renterId: invoice.renterId,
        landlordId: invoice.landlordId,
        paymentType: "monthly_rent",
        invoiceId: invoice.id, // Link to invoice
      })
    }

    // Create application fee payment record
    if (invoice.applicationFee > 0) {
      await paymentService.createPayment({
        leaseId: invoice.propertyId,
        amount: invoice.applicationFee,
        dueDate: new Date(),
        paidDate: new Date(),
        status: "paid",
        paymentMethod: "Stripe Card",
        transactionId: transactionId,
        renterId: invoice.renterId,
        landlordId: invoice.landlordId,
        paymentType: "application_fee",
        invoiceId: invoice.id, // Link to invoice
      })
    }

    // Create pet fee payment record
    if (invoice.petFee > 0) {
      await paymentService.createPayment({
        leaseId: invoice.propertyId,
        amount: invoice.petFee,
        dueDate: new Date(),
        paidDate: new Date(),
        status: "paid",
        paymentMethod: "Stripe Card",
        transactionId: transactionId,
        renterId: invoice.renterId,
        landlordId: invoice.landlordId,
        paymentType: "pet_fee",
        invoiceId: invoice.id, // Link to invoice
      })
    }
  },

  // Generate monthly payment schedule for a lease
  async generateMonthlyPaymentSchedule(
    leaseId: string, 
    startDate: Date, 
    endDate: Date, 
    monthlyRent: number
  ): Promise<void> {
    const { paymentService } = await import("./payment-service")
    
    const schedule = []
    let currentDate = new Date(startDate)
    
    while (currentDate <= endDate) {
      schedule.push({
        leaseId,
        amount: monthlyRent,
        dueDate: new Date(currentDate),
        status: "pending" as const,
        paymentType: "monthly_rent" as const,
        createdAt: new Date(),
      })
      
      // Move to next month
      currentDate.setMonth(currentDate.getMonth() + 1)
    }

    // Create all payment records
    for (const payment of schedule) {
      await paymentService.createPayment(payment)
    }
  }
} 