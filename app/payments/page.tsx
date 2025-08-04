"use client"

import { useState, useEffect } from "react"
import { CreditCard, DollarSign, Calendar, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useAuth } from "@/lib/auth"
import { useSearchParams } from "next/navigation"
import type { RentPayment } from "@/types"
import { leaseService } from "@/lib/services/lease-service"
import { paymentService } from "@/lib/services/payment-service"
import { invoiceService } from "@/lib/services/invoice-service"
import { loadStripe } from "@stripe/stripe-js"
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js"
import { saveAs } from "file-saver"
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { securityDepositService } from "@/lib/services/security-deposit-service"
import { toast } from "sonner"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

function getNextPaymentDue(lease: any, payments: any[], securityDeposits: any[]) {
  if (!lease) return { amount: 0, label: "No lease" };
  // Check if security deposit is paid
  const depositPaid = securityDeposits.some(d => d.amount >= lease.securityDeposit);
  // Check if first month rent is paid
  const firstRentPaid = payments.some(p => p.status === "paid" && p.amount >= lease.monthlyRent);
  if (!depositPaid || !firstRentPaid) {
    return { amount: lease.securityDeposit + lease.monthlyRent, label: `Initial Payment: $${lease.securityDeposit} + $${lease.monthlyRent}` };
  }
  const now = new Date();
  const nextUnpaid = payments.find(p => p.status !== "paid" && new Date(p.dueDate) <= now);
  if (nextUnpaid) {
    return { amount: lease.monthlyRent, label: `Monthly Rent: $${lease.monthlyRent}` };
  }
  return { amount: 0, label: "All payments up to date" };
}

function StripeCardForm({ amount, onSuccess, onCancel }: { amount: number, onSuccess: (data: any) => void, onCancel: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsProcessing(true);
    setError(null);
    const res = await fetch("/api/stripe/intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    });
    const data = await res.json();
    if (!data.clientSecret) {
      setError(data.error || "Failed to create payment intent");
      setIsProcessing(false);
      return;
    }
    const cardElement = elements?.getElement(CardElement);
    if (!stripe || !cardElement) {
      setError("Stripe not loaded");
      setIsProcessing(false);
      return;
    }
    const result = await stripe.confirmCardPayment(data.clientSecret, {
      payment_method: { card: cardElement },
    });
    if (result.error) {
      setError(result.error.message || "Payment failed");
      setIsProcessing(false);
      return;
    }
    if (result.paymentIntent?.status === "succeeded") {
      onSuccess({ amount, method: "Stripe Card", stripeId: result.paymentIntent.id, timestamp: new Date() });
    }
    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <CardElement options={{ hidePostalCode: true }} className="p-2 border rounded" />
      {error && <div className="text-destructive text-sm">{error}</div>}
      <div className="flex gap-2 pt-4">
        <Button type="submit" className="flex-1" disabled={isProcessing}>
          {isProcessing ? "Processing..." : `Pay $${amount.toFixed(2)}`}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isProcessing}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function formatPropertyAddress(address: any, propertyId?: string) {
  if (!address) return propertyId || "";
  let str = address.street || "";
  if (address.unit) str += `, Unit ${address.unit}`;
  if (address.city) str += `, ${address.city}`;
  if (address.state) str += `, ${address.state}`;
  return str;
}

// Helper to generate a single payment PDF receipt
function generateSinglePaymentPDF(payment: any, property: any, landlord: any, renter: any) {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("Rent Payment Invoice", 105, 20, { align: "center" });

  // Invoice number and date
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Date: ${new Date(payment.paidAt || payment.createdAt).toLocaleDateString()}`, 160, 22);

  // Address blocks with subtle background
  doc.setFillColor(240, 240, 240);
  doc.rect(15, 30, 85, 22, "F");
  doc.rect(110, 30, 85, 22, "F");

  doc.setFont("helvetica", "bold");
  doc.text("From (Landlord):", 20, 37);
  doc.text("To (Renter):", 115, 37);

  doc.setFont("helvetica", "normal");
  doc.text(`${landlord.name || ""}`, 20, 44);
  doc.text(`${landlord.email || ""}`, 20, 50);

  doc.text(`${renter.name || ""}`, 115, 44);
  doc.text(`${renter.email || ""}`, 115, 50);

  // Property Address
  doc.setFont("helvetica", "bold");
  doc.text("Property Address:", 20, 62);
  doc.setFont("helvetica", "normal");
  doc.text(`${formatPropertyAddress(property?.address, property?.propertyId)}`, 20, 68);

  // Paid badge
  if (payment.status === "paid") {
    doc.setFillColor(76, 175, 80);
    doc.setTextColor(255, 255, 255);
    doc.roundedRect(160, 60, 30, 10, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.text("PAID", 175, 68, { align: "center" });
    doc.setTextColor(0, 0, 0);
  }

  // Calculate center margin for the table
  const pageWidth = doc.internal.pageSize.getWidth();
  const tableWidth = 150; // sum of cellWidths: 50+60+40
  const leftMargin = (pageWidth - tableWidth) / 2;

  // Invoice Table
  autoTable(doc, {
    startY: 80,
    tableWidth: 'wrap',
    margin: { left: leftMargin },
    head: [["Date", "Payment Method", "Amount"]],
    body: [
      [
        new Date(payment.paidAt || payment.createdAt).toLocaleDateString(),
        payment.method || "Card",
        `$${payment.amount?.toLocaleString() || ""}`,
      ],
    ],
    theme: "grid",
    headStyles: { fillColor: [41, 128, 185] },
    styles: { font: "helvetica", fontSize: 12 },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 60 },
      2: { cellWidth: 40, halign: "right" },
    },
  });

  // Total
  const finalY = (doc as any).lastAutoTable.finalY || 95;
  doc.setFont("helvetica", "bold");
  doc.text("Total Paid:", 120, finalY + 15);
  doc.setFont("helvetica", "normal");
  doc.text(`$${payment.amount?.toLocaleString() || ""}`, 170, finalY + 15, { align: "right" });

  // Notes section (optional)
  doc.setFont("helvetica", "bold");
  doc.text("Notes:", 20, finalY + 30);
  doc.setFont("helvetica", "normal");
  doc.text("Thank you for your prompt payment.", 20, finalY + 36);

  // Footer (optional)
  doc.setFontSize(10);
  doc.setTextColor(150, 150, 150);
  doc.text("PropertyManager Inc. | www.yourcompany.com | info@yourcompany.com", 105, 285, { align: "center" });
  doc.setTextColor(0, 0, 0);

  return doc;
}

// Helper to generate a PDF with all payments in a table
function generateAllPaymentsPDF(payments: any[], properties: any[], landlord: any, renter: any) {
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text("All Rent Payments Receipt", 20, 20);
  doc.setFontSize(12);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 30);
  const tableData = payments.map(payment => {
    const property = properties.find((p: any) => p.id === payment.propertyId);
    return [
      new Date(payment.paidAt || payment.createdAt).toLocaleDateString(),
      property?.address?.street || "",
      `$${payment.amount?.toLocaleString() || ""}`,
      payment.status,
    ];
  });
  autoTable(doc, {
    head: [["Date", "Property", "Amount", "Status"]],
    body: tableData,
    startY: 40,
  });
  doc.setFontSize(10);
  // @ts-ignore
  doc.text("Thank you for your payments!", 20, (doc as any).lastAutoTable.finalY + 20);
  return doc;
}

export default function PaymentsPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const invoiceId = searchParams.get('invoiceId');
  
  const [payments, setPayments] = useState<RentPayment[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [leases, setLeases] = useState<any[]>([]);
  const [currentLease, setCurrentLease] = useState<any>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [nextPayment, setNextPayment] = useState({ amount: 0, label: "" });
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [securityDeposits, setSecurityDeposits] = useState<any[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  useEffect(() => {
    async function fetchPayments() {
      if (!user?.email) return;
      const leases = await leaseService.getRenterLeases(user.email);
      setLeases(leases);
      let allPayments: RentPayment[] = [];
      let allDeposits: any[] = [];
      let allInvoices: any[] = [];
      
      for (const lease of leases) {
        const payments = await paymentService.getLeasePayments(lease.id);
        allPayments = allPayments.concat(payments);
        const deposits = await securityDepositService.getDepositsByLease(lease.id);
        allDeposits = allDeposits.concat(deposits);
      }
      
      // Fetch invoice payments
      const renterInvoices = await invoiceService.getRenterInvoices(user.email);
      setInvoices(renterInvoices);
      
      // Handle specific invoice payment
      if (invoiceId) {
        const invoice = renterInvoices.find(inv => inv.id === invoiceId);
        if (invoice && invoice.status === "sent") {
          setSelectedInvoice(invoice);
          setNextPayment({ amount: invoice.amount, label: `Invoice #${invoice.id.slice(-6)}` });
          setIsPaymentDialogOpen(true);
        }
      }
      
      allPayments.sort((a, b) => (b.dueDate?.getTime?.() || 0) - (a.dueDate?.getTime?.() || 0));
      setPayments(allPayments);
      setSecurityDeposits(allDeposits);
      // Pick the most recent/active lease
      const lease = leases[0] || null;
      setCurrentLease(lease);
      
      // Check for unpaid invoices first
      const unpaidInvoices = renterInvoices.filter((i) => i.status === "sent");
      if (unpaidInvoices.length > 0 && !invoiceId) {
        // If there are unpaid invoices and no specific invoice ID, show the first unpaid invoice
        const firstUnpaidInvoice = unpaidInvoices[0];
        setSelectedInvoice(firstUnpaidInvoice);
        setNextPayment({ amount: firstUnpaidInvoice.amount, label: `Invoice #${firstUnpaidInvoice.id.slice(-6)}` });
      } else if (!invoiceId) {
        // Only use lease-based payment if no invoices to pay
        setNextPayment(getNextPaymentDue(lease, allPayments, allDeposits));
      }
    }
    fetchPayments();
  }, [user?.email, invoiceId]);

  const handlePaymentSuccess = async (paymentData: any) => {
    // Handle invoice payment
    if (selectedInvoice) {
      try {
        // Update invoice status to paid
        await invoiceService.updateInvoiceStatus(selectedInvoice.id, "paid");
        
        // Create separate payment records from invoice breakdown
        await invoiceService.createPaymentRecordsFromInvoice(selectedInvoice, paymentData.stripeId);
        
        setSelectedInvoice(null);
        setIsPaymentDialogOpen(false);
        setPaymentSuccess(true);
        setTimeout(() => setPaymentSuccess(false), 4000);
        
        // Refresh data
        if (user?.email) {
          const leases = await leaseService.getRenterLeases(user.email);
          let allPayments: RentPayment[] = [];
          let allDeposits: any[] = [];
          for (const lease of leases) {
            const payments = await paymentService.getLeasePayments(lease.id);
            allPayments = allPayments.concat(payments);
            const deposits = await securityDepositService.getDepositsByLease(lease.id);
            allDeposits = allDeposits.concat(deposits);
          }
          allPayments.sort((a, b) => (b.dueDate?.getTime?.() || 0) - (a.dueDate?.getTime?.() || 0));
          setPayments(allPayments);
          setSecurityDeposits(allDeposits);
          
          // Refresh invoices
          const renterInvoices = await invoiceService.getRenterInvoices(user.email);
          setInvoices(renterInvoices);
          
          const lease = leases[0] || null;
          setCurrentLease(lease);
          setNextPayment(getNextPaymentDue(lease, allPayments, allDeposits));
        }
        return;
      } catch (error) {
        console.error("Error processing invoice payment:", error);
        toast.error("Payment processed but there was an error updating the invoice.");
      }
    }
    
    // Handle regular payment (existing logic)
    const pending = payments.find(p => p.status === "pending");
    const isInitialPayment = currentLease && paymentData.amount === (currentLease.securityDeposit + currentLease.monthlyRent);
    if (isInitialPayment && currentLease) {
      // Split and record security deposit
      await securityDepositService.createDeposit({
        leaseId: currentLease.id,
        renterId: currentLease.renterId,
        landlordId: currentLease.landlordId,
        amount: currentLease.securityDeposit,
        paidDate: new Date(),
        paymentMethod: paymentData.method,
        transactionId: paymentData.stripeId,
      });
      // Record first month rent as payment
      await paymentService.createPayment({
        leaseId: currentLease.id,
        amount: currentLease.monthlyRent,
        dueDate: new Date(),
        paidDate: new Date(),
        status: "paid",
        paymentMethod: paymentData.method,
        transactionId: paymentData.stripeId,
        renterId: currentLease.renterId,
        landlordId: currentLease.landlordId,
      });
    } else if (pending) {
      await paymentService.updatePayment(pending.id, {
        status: "paid",
        paidDate: new Date(),
        paymentMethod: paymentData.method,
        transactionId: paymentData.stripeId,
      });
    } else if (currentLease) {
      // No pending payment, create a new one
      await paymentService.createPayment({
        leaseId: currentLease.id,
        amount: paymentData.amount,
        dueDate: new Date(), // You may want to set this to the correct due date
        paidDate: new Date(),
        status: "paid",
        paymentMethod: paymentData.method,
        transactionId: paymentData.stripeId,
        renterId: currentLease.renterId,      // Ensure these fields are included
        landlordId: currentLease.landlordId,  // Ensure these fields are included
      });
    }
    setIsPaymentDialogOpen(false);
    setPaymentSuccess(true);
    setTimeout(() => setPaymentSuccess(false), 4000);
    // Refresh payments
    if (user?.email) {
      const leases = await leaseService.getRenterLeases(user.email);
      let allPayments: RentPayment[] = [];
      let allDeposits: any[] = [];
      for (const lease of leases) {
        const payments = await paymentService.getLeasePayments(lease.id);
        allPayments = allPayments.concat(payments);
        const deposits = await securityDepositService.getDepositsByLease(lease.id);
        allDeposits = allDeposits.concat(deposits);
      }
      allPayments.sort((a, b) => (b.dueDate?.getTime?.() || 0) - (a.dueDate?.getTime?.() || 0));
      setPayments(allPayments);
      setSecurityDeposits(allDeposits);
      
      // Refresh invoices
      const renterInvoices = await invoiceService.getRenterInvoices(user.email);
      setInvoices(renterInvoices);
      
      const lease = leases[0] || null;
      setCurrentLease(lease);
      setNextPayment(getNextPaymentDue(lease, allPayments, allDeposits));
    }
  };

  const handleExportReceipt = () => {
    // Generate a simple text receipt for all paid payments
    const paidPayments = payments.filter((p) => p.status === "paid");
    let receipt = `Rent Payment Receipt\n\n`;
    paidPayments.forEach((p, idx) => {
      receipt += `Payment #${idx + 1}\n`;
      receipt += `Amount: $${p.amount}\n`;
      receipt += `Paid Date: ${p.paidDate ? new Date(p.paidDate).toLocaleString() : "-"}\n`;
      receipt += `Method: ${p.paymentMethod || "-"}\n`;
      receipt += `Transaction ID: ${p.transactionId || "-"}\n`;
      receipt += `-----------------------------\n`;
    });
    const blob = new Blob([receipt], { type: "text/plain;charset=utf-8" });
    saveAs(blob, `rent-payments-receipt.txt`);
  };

  // Calculate total paid including rent payments, security deposits, and invoice payments
  const totalPaid = payments.filter((p) => p.status === "paid").reduce((sum, p) => sum + p.amount, 0)
    + securityDeposits.reduce((sum, d) => sum + (d.amount || 0), 0)
    + invoices.filter((i) => i.status === "paid").reduce((sum, i) => sum + i.amount, 0);

  // Calculate pending payments, considering both collections for initial payment
  const pendingPayments = payments.filter((p) => p.status === "pending");
  let totalPending = 0;
  if (pendingPayments.length > 0) {
    totalPending = pendingPayments.reduce((sum, p) => sum + p.amount, 0);
  } else if (currentLease) {
    // Initial payment logic: only add unpaid portions
    const depositPaid = securityDeposits.some(d => d.amount >= currentLease.securityDeposit);
    const firstRentPaid = payments.some(p => p.status === "paid" && p.amount >= currentLease.monthlyRent);
    if (!depositPaid || !firstRentPaid) {
      let due = 0;
      if (!depositPaid) due += currentLease.securityDeposit;
      if (!firstRentPaid) due += currentLease.monthlyRent;
      totalPending = due;
    } else {
      totalPending = 0;
    }
  }
  
  // Add unpaid invoice amounts to pending payments
  const unpaidInvoices = invoices.filter((i) => i.status === "sent");
  const totalUnpaidInvoices = unpaidInvoices.reduce((sum, i) => sum + i.amount, 0);
  totalPending += totalUnpaidInvoices;

  const handleExportAllPaymentsPDF = () => {
    // Use properties, not leases, for property lookup
    const doc = generateAllPaymentsPDF(payments, leases, user, user);
    doc.save("all-payments-receipt.pdf");
  };

  const handleExportSinglePaymentPDF = async (payment: any) => {
    let property = currentLease;
    // If property.address is missing, fetch from Firestore
    if (!property?.address && property?.propertyId) {
      const propRef = doc(db, "properties", property.propertyId);
      const propSnap = await getDoc(propRef);
      if (propSnap.exists()) {
        property = { ...property, address: propSnap.data().address };
      }
    }
    let landlord = { name: "", email: "" };
    if (currentLease?.landlordId) {
      const landlordRef = doc(db, "users", currentLease.landlordId);
      const landlordSnap = await getDoc(landlordRef);
      if (landlordSnap.exists()) {
        landlord = {
          name: landlordSnap.data().name || "",
          email: landlordSnap.data().email || "",
        };
      }
    }
    const renter = {
      name: user?.name || "",
      email: user?.email || "",
    };
    console.debug('PDF Export Debug:', { property, landlord, renter, payment });
    const docPDF = generateSinglePaymentPDF(payment, property, landlord, renter);
    docPDF.save(`receipt-${payment.id}.pdf`);
  };

  const handlePayInvoice = (invoice: any) => {
    setSelectedInvoice(invoice);
    setNextPayment({ amount: invoice.amount, label: `Invoice #${invoice.id.slice(-6)}` });
    setIsPaymentDialogOpen(true);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {paymentSuccess && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Payment Successful!</strong>
          <span className="block sm:inline ml-2">Your payment has been processed.</span>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Rent Payments</h1>
          <p className="text-muted-foreground">Manage your rent payments and payment history</p>
        </div>
        <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2" onClick={() => {
              // Check if there are unpaid invoices first
              const unpaidInvoices = invoices.filter((i) => i.status === "sent");
              if (unpaidInvoices.length > 0) {
                handlePayInvoice(unpaidInvoices[0]);
              } else {
                setIsPaymentDialogOpen(true);
              }
            }}>
              <CreditCard className="h-4 w-4" />
              Make Payment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedInvoice ? `Pay Invoice #${selectedInvoice.id.slice(-6)}` : "Make Rent Payment"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Amount Due</Label>
                <div className="text-2xl font-bold">${nextPayment.amount.toLocaleString()}</div>
                <div className="text-muted-foreground text-sm">{nextPayment.label}</div>
                
                {/* Show invoice breakdown if paying an invoice */}
                {selectedInvoice && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium mb-2">Invoice Breakdown</h4>
                    <div className="space-y-2 text-sm">
                      {selectedInvoice.monthlyRent > 0 && (
                        <div className="flex justify-between">
                          <span>Monthly Rent:</span>
                          <span className="font-medium">${selectedInvoice.monthlyRent.toLocaleString()}</span>
                        </div>
                      )}
                      {selectedInvoice.securityDeposit > 0 && (
                        <div className="flex justify-between">
                          <span>Security Deposit:</span>
                          <span className="font-medium">${selectedInvoice.securityDeposit.toLocaleString()}</span>
                        </div>
                      )}
                      {selectedInvoice.applicationFee > 0 && (
                        <div className="flex justify-between">
                          <span>Application Fee:</span>
                          <span className="font-medium">${selectedInvoice.applicationFee.toLocaleString()}</span>
                        </div>
                      )}
                      {selectedInvoice.petFee > 0 && (
                        <div className="flex justify-between">
                          <span>Pet Fee:</span>
                          <span className="font-medium">${selectedInvoice.petFee.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="border-t pt-2 mt-2">
                        <div className="flex justify-between font-semibold">
                          <span>Total:</span>
                          <span>${selectedInvoice.amount.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    {selectedInvoice.notes && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs text-muted-foreground">
                          <strong>Notes:</strong> {selectedInvoice.notes}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <Elements stripe={stripePromise}>
                <StripeCardForm 
                  amount={selectedInvoice ? selectedInvoice.amount : nextPayment.amount} 
                  onSuccess={handlePaymentSuccess} 
                  onCancel={() => setIsPaymentDialogOpen(false)} 
                />
              </Elements>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Payment Summary */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">${totalPaid.toLocaleString()}</div>
          </CardContent>
        </Card>

        {payments.find((p) => p.status === "pending") && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Next Payment Due</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${payments.find((p) => p.status === "pending")?.amount.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Due {(() => { const dueDate = payments.find((p) => p.status === "pending")?.dueDate; return dueDate ? new Date(dueDate).toLocaleDateString() : "-"; })()}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Payment History</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Show security deposits first, labeled */}
            {securityDeposits.map((deposit) => (
              <div key={deposit.id} className="flex items-center justify-between p-4 border rounded-lg bg-blue-50">
                <div className="flex items-center gap-4">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <div>
                    <p className="font-medium">${deposit.amount.toLocaleString()} <span className="text-xs text-blue-700">(Security Deposit)</span></p>
                    <p className="text-sm text-muted-foreground">
                      Paid: {deposit.paidDate ? new Date(deposit.paidDate).toLocaleDateString() : "-"}
                    </p>
                    {deposit.paymentMethod && (
                      <p className="text-xs text-muted-foreground">
                        Method: {deposit.paymentMethod}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="status-badge bg-blue-100 text-blue-700 border-blue-200 px-2 py-1 rounded text-xs">Deposit</span>
                </div>
              </div>
            ))}
            
            {/* Show invoice payments */}
            {invoices.map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg bg-green-50">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      invoice.status === "paid"
                        ? "bg-success"
                        : invoice.status === "overdue"
                          ? "bg-destructive"
                          : "bg-warning"
                    }`}
                  />
                  <div>
                    <p className="font-medium">${invoice.amount.toLocaleString()} <span className="text-xs text-green-700">(Invoice Payment)</span></p>
                    <p className="text-sm text-muted-foreground">
                      Invoice #{invoice.id.slice(-6)}
                      {invoice.createdAt && ` • Sent: ${new Date(invoice.createdAt).toLocaleDateString()}`}
                      {invoice.status === "paid" && ` • Paid: ${new Date(invoice.updatedAt || invoice.createdAt).toLocaleDateString()}`}
                    </p>
                    {/* Show breakdown of invoice components */}
                    {invoice.status === "paid" && (
                      <div className="text-xs text-muted-foreground mt-1">
                        <span>Breakdown: </span>
                        {invoice.monthlyRent > 0 && <span className="mr-2">Rent: ${invoice.monthlyRent.toLocaleString()}</span>}
                        {invoice.securityDeposit > 0 && <span className="mr-2">Deposit: ${invoice.securityDeposit.toLocaleString()}</span>}
                        {invoice.applicationFee > 0 && <span className="mr-2">Application: ${invoice.applicationFee.toLocaleString()}</span>}
                        {invoice.petFee > 0 && <span className="mr-2">Pet Fee: ${invoice.petFee.toLocaleString()}</span>}
                      </div>
                    )}
                    {invoice.notes && (
                      <p className="text-xs text-muted-foreground">
                        Notes: {invoice.notes}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    className={
                      invoice.status === "paid"
                        ? "status-paid"
                        : invoice.status === "overdue"
                          ? "status-overdue"
                          : "status-badge bg-warning/10 text-warning border-warning/20"
                    }
                  >
                    {invoice.status === "paid" ? "Paid" : invoice.status === "overdue" ? "Overdue" : "Sent"}
                  </Badge>
                  {invoice.status === "sent" && (
                    <Button size="sm" onClick={() => handlePayInvoice(invoice)}>
                      Pay Now
                    </Button>
                  )}
                  <Button onClick={async () => await handleExportSinglePaymentPDF(invoice)} size="sm" variant="outline">Export PDF</Button>
                </div>
              </div>
            ))}
            
            {/* Show regular payments */}
            {payments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      payment.status === "paid"
                        ? "bg-success"
                        : payment.status === "overdue"
                          ? "bg-destructive"
                          : "bg-warning"
                    }`}
                  />
                  <div>
                    <p className="font-medium">${payment.amount.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">
                      Due: {payment.dueDate ? new Date(payment.dueDate).toLocaleDateString() : "-"}
                      {payment.paidDate && ` • Paid: ${new Date(payment.paidDate).toLocaleDateString()}`}
                    </p>
                    {payment.paymentMethod && (
                      <p className="text-xs text-muted-foreground">
                        Method: {payment.paymentMethod}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    className={
                      payment.status === "paid"
                        ? "status-paid"
                        : payment.status === "overdue"
                          ? "status-overdue"
                          : "status-badge bg-warning/10 text-warning border-warning/20"
                    }
                  >
                    {payment.status === "paid" ? "Paid" : payment.status === "overdue" ? "Overdue" : "Pending"}
                  </Badge>
                  {payment.status === "pending" && (
                    <Button size="sm" onClick={() => setIsPaymentDialogOpen(true)}>
                      Pay Now
                    </Button>
                  )}
                  <Button onClick={async () => await handleExportSinglePaymentPDF(payment)} size="sm" variant="outline">Export PDF</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
