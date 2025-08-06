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
import { notificationService } from "./notification-service"

export const invoiceService = {
  // Create a new invoice
  async createInvoice(invoice: Omit<Invoice, "id" | "createdAt" | "updatedAt">): Promise<string> {
    const docRef = await addDoc(collection(db, "invoices"), {
      ...invoice,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    
    // Send notification to renter about the new invoice
    try {
      await notificationService.createNotification({
        renterId: invoice.renterEmail, // Using email as renterId for now
        type: "invoice_sent",
        title: "New Invoice Received",
        message: `You have received a new invoice for $${invoice.amount.toLocaleString()} for ${invoice.propertyDetails?.address?.street || "your property"}.`,
        data: {
          invoiceId: docRef.id,
          propertyId: invoice.propertyId,
          renterEmail: invoice.renterEmail,
          amount: invoice.amount,
          propertyAddress: invoice.propertyDetails?.address?.street,
        },
        navigation: {
          type: "page",
          path: "/payments",
          params: { invoiceId: docRef.id },
          action: "pay_invoice"
        }
      })
    } catch (error) {
      console.error("Error sending invoice notification:", error)
      // Don't fail the invoice creation if notification fails
    }
    
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

  // Check if an invoice has been sent for a specific lease
  async hasInvoiceBeenSent(renterEmail: string, propertyId: string): Promise<boolean> {
    const q = query(
      collection(db, "invoices"),
      where("renterEmail", "==", renterEmail),
      where("propertyId", "==", propertyId)
    )
    const querySnapshot = await getDocs(q)
    return !querySnapshot.empty
  },

  // Update invoice status
  async updateInvoiceStatus(invoiceId: string, status: Invoice["status"]): Promise<void> {
    const docRef = doc(db, "invoices", invoiceId)
    await updateDoc(docRef, {
      status,
      updatedAt: serverTimestamp(),
    })
    
    // If status is changed to "paid", send notification to landlord
    if (status === "paid") {
      try {
        const invoice = await this.getInvoice(invoiceId)
        if (invoice && invoice.landlordId) {
          await notificationService.createNotification({
            landlordId: invoice.landlordId,
            type: "payment_received",
            title: "Payment Received",
            message: `Payment of $${invoice.amount.toLocaleString()} has been received for invoice #${invoiceId.slice(-6)}.`,
            data: {
              invoiceId,
              propertyId: invoice.propertyId,
              renterEmail: invoice.renterEmail,
              amount: invoice.amount,
            },
            navigation: {
              type: "page",
              path: "/dashboard/incomes",
              action: "view_income"
            }
          })
        }
      } catch (error) {
        console.error("Error sending payment notification:", error)
        // Don't fail the invoice update if notification fails
      }
    }
  },

  // Create separate payment records from invoice breakdown
  async createPaymentRecordsFromInvoice(invoice: Invoice, transactionId: string): Promise<void> {
    const { paymentService } = await import("./payment-service")
    const { securityDepositService } = await import("./security-deposit-service")

    // Check for existing payments to avoid duplicates
    const existingPayments = await paymentService.getLeasePayments(invoice.propertyId)
    const existingDeposits = await securityDepositService.getDepositsByLease(invoice.propertyId)
    
    // Get current month and year for comparison
    const currentDate = new Date()
    const currentMonth = currentDate.getMonth()
    const currentYear = currentDate.getFullYear()

    // Create security deposit record if applicable and not already paid
    if (invoice.securityDeposit > 0) {
      const depositAlreadyPaid = existingDeposits.some(deposit => 
        deposit.amount >= invoice.securityDeposit && 
        deposit.paidDate && 
        new Date(deposit.paidDate).getMonth() === currentMonth &&
        new Date(deposit.paidDate).getFullYear() === currentYear
      )
      
      if (!depositAlreadyPaid) {
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
        
        // Send notification for security deposit
        try {
          const { notificationService } = await import("./notification-service")
          const { propertyService } = await import("./property-service")
          
          const property = await propertyService.getProperty(invoice.propertyId)
          const propertyName = property?.title || property?.address?.street || `Property ${invoice.propertyId.slice(-6)}`
          
          await notificationService.notifyPaymentReceived(
            invoice.landlordId,
            invoice.propertyId,
            invoice.renterId,
            invoice.securityDeposit,
            propertyName,
            "Security Deposit"
          )
          console.log(`Security deposit notification sent to landlord ${invoice.landlordId}`)
        } catch (error) {
          console.error("Error sending security deposit notification:", error)
        }
      }
    }

    // Handle monthly rent payment - update existing pending payment or create new one
    if (invoice.monthlyRent > 0) {
      // Find existing pending payment for this month
      const existingPendingPayment = existingPayments.find(payment => 
        payment.status === "pending" &&
        payment.amount === invoice.monthlyRent &&
        payment.dueDate && 
        new Date(payment.dueDate).getMonth() === currentMonth &&
        new Date(payment.dueDate).getFullYear() === currentYear
      )
      
      // Check if already paid
      const rentAlreadyPaid = existingPayments.some(payment => 
        payment.amount >= invoice.monthlyRent && 
        payment.status === "paid" &&
        payment.dueDate && 
        new Date(payment.dueDate).getMonth() === currentMonth &&
        new Date(payment.dueDate).getFullYear() === currentYear
      )
      
      if (rentAlreadyPaid) {
        console.log("Rent already paid for this month")
        return
      }
      
      if (existingPendingPayment) {
        // Update the existing pending payment to paid
        console.log(`Updating existing pending payment ${existingPendingPayment.id} to paid`)
        await paymentService.updatePayment(existingPendingPayment.id, {
          status: "paid",
          paidDate: new Date(),
          paymentMethod: "Stripe Card",
          transactionId: transactionId,
          invoiceId: invoice.id, // Link to invoice
        })
      } else {
        // Create new payment record if no existing pending payment found
        console.log("Creating new payment record for rent")
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
      
      // Send notification to landlord about payment received
      try {
        const { notificationService } = await import("./notification-service")
        const { propertyService } = await import("./property-service")
        
        // Get property details for the notification
        const property = await propertyService.getProperty(invoice.propertyId)
        const propertyName = property?.title || property?.address?.street || `Property ${invoice.propertyId.slice(-6)}`
        
        // Get current month name
        const currentDate = new Date()
        const monthName = currentDate.toLocaleString('default', { month: 'long' })
        const year = currentDate.getFullYear()
        const monthYear = `${monthName} ${year}`
        
        await notificationService.notifyPaymentReceived(
          invoice.landlordId,
          invoice.propertyId,
          invoice.renterId,
          invoice.monthlyRent,
          propertyName,
          monthYear
        )
        console.log(`Payment notification sent to landlord ${invoice.landlordId}`)
      } catch (error) {
        console.error("Error sending payment notification:", error)
        // Don't fail the payment if notification fails
      }
    }

    // Create application fee payment record (usually one-time, so no duplicate check needed)
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
      
      // Send notification for application fee
      try {
        const { notificationService } = await import("./notification-service")
        const { propertyService } = await import("./property-service")
        
        const property = await propertyService.getProperty(invoice.propertyId)
        const propertyName = property?.title || property?.address?.street || `Property ${invoice.propertyId.slice(-6)}`
        
        await notificationService.notifyPaymentReceived(
          invoice.landlordId,
          invoice.propertyId,
          invoice.renterId,
          invoice.applicationFee,
          propertyName,
          "Application Fee"
        )
        console.log(`Application fee notification sent to landlord ${invoice.landlordId}`)
      } catch (error) {
        console.error("Error sending application fee notification:", error)
      }
    }

    // Create pet fee payment record (usually one-time, so no duplicate check needed)
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
      
      // Send notification for pet fee
      try {
        const { notificationService } = await import("./notification-service")
        const { propertyService } = await import("./property-service")
        
        const property = await propertyService.getProperty(invoice.propertyId)
        const propertyName = property?.title || property?.address?.street || `Property ${invoice.propertyId.slice(-6)}`
        
        await notificationService.notifyPaymentReceived(
          invoice.landlordId,
          invoice.propertyId,
          invoice.renterId,
          invoice.petFee,
          propertyName,
          "Pet Fee"
        )
        console.log(`Pet fee notification sent to landlord ${invoice.landlordId}`)
      } catch (error) {
        console.error("Error sending pet fee notification:", error)
      }
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
    
    // Check for existing payments to avoid duplicates
    const existingPayments = await paymentService.getLeasePayments(leaseId)
    
    const schedule = []
    let currentDate = new Date(startDate)
    
    while (currentDate <= endDate) {
      // Check if a payment already exists for this month
      const currentMonth = currentDate.getMonth()
      const currentYear = currentDate.getFullYear()
      
      const paymentExists = existingPayments.some(payment => {
        const paymentDate = payment.dueDate ? new Date(payment.dueDate) : new Date(0)
        return paymentDate.getMonth() === currentMonth && 
               paymentDate.getFullYear() === currentYear &&
               payment.amount === monthlyRent
      })
      
      // Only add to schedule if payment doesn't already exist
      if (!paymentExists) {
        schedule.push({
          leaseId,
          amount: monthlyRent,
          dueDate: new Date(currentDate),
          status: "pending" as const,
          paymentType: "monthly_rent" as const,
          createdAt: new Date(),
        })
      }
      
      // Move to next month
      currentDate.setMonth(currentDate.getMonth() + 1)
    }

    // Create payment records only for months that don't already have payments
    for (const payment of schedule) {
      await paymentService.createPayment(payment)
    }
  }
} 