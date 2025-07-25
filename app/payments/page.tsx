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
import type { RentPayment } from "@/types"
import { leaseService } from "@/lib/services/lease-service"
import { paymentService } from "@/lib/services/payment-service"
import { loadStripe } from "@stripe/stripe-js"
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js"
import { saveAs } from "file-saver"
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

function getNextPaymentDue(lease, payments) {
  if (!lease) return { amount: 0, label: "No lease" };
  const initialDue = lease.securityDeposit + lease.monthlyRent;
  const initialPaid = payments.some(p => p.status === "paid" && p.amount >= initialDue);
  if (!initialPaid) {
    return { amount: initialDue, label: `Initial Payment: $${lease.securityDeposit} + $${lease.monthlyRent}` };
  }
  const now = new Date();
  const nextUnpaid = payments.find(p => p.status !== "paid" && new Date(p.dueDate) <= now);
  if (nextUnpaid) {
    return { amount: lease.monthlyRent, label: `Monthly Rent: $${lease.monthlyRent}` };
  }
  return { amount: 0, label: "All payments up to date" };
}

function StripeCardForm({ amount, onSuccess, onCancel }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
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
  const [payments, setPayments] = useState<RentPayment[]>([]);
  const [leases, setLeases] = useState<any[]>([]);
  const [currentLease, setCurrentLease] = useState<any>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [nextPayment, setNextPayment] = useState({ amount: 0, label: "" });
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    async function fetchPayments() {
      if (!user?.email) return;
      const leases = await leaseService.getRenterLeases(user.email);
      setLeases(leases);
      let allPayments: RentPayment[] = [];
      for (const lease of leases) {
        const payments = await paymentService.getLeasePayments(lease.id);
        allPayments = allPayments.concat(payments);
      }
      allPayments.sort((a, b) => (b.dueDate?.getTime?.() || 0) - (a.dueDate?.getTime?.() || 0));
      setPayments(allPayments);
      // Pick the most recent/active lease
      const lease = leases[0] || null;
      setCurrentLease(lease);
      setNextPayment(getNextPaymentDue(lease, allPayments));
    }
    fetchPayments();
  }, [user?.email]);

  const handlePaymentSuccess = async (paymentData: any) => {
    // Try to find a pending payment
    const pending = payments.find(p => p.status === "pending");
    if (pending) {
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
        createdAt: new Date(),
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
      for (const lease of leases) {
        const payments = await paymentService.getLeasePayments(lease.id);
        allPayments = allPayments.concat(payments);
      }
      allPayments.sort((a, b) => (b.dueDate?.getTime?.() || 0) - (a.dueDate?.getTime?.() || 0));
      setPayments(allPayments);
      setNextPayment(getNextPaymentDue(currentLease, allPayments));
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

  const totalPaid = payments.filter((p) => p.status === "paid").reduce((sum, p) => sum + p.amount, 0);
  const totalPending = payments.filter((p) => p.status === "pending").reduce((sum, p) => sum + p.amount, 0);

  const handleExportAllPaymentsPDF = () => {
    // Use properties, not leases, for property lookup
    const doc = generateAllPaymentsPDF(payments, leases, user?.landlord, user?.renter);
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
            <Button className="flex items-center gap-2" onClick={() => setIsPaymentDialogOpen(true)}>
              <CreditCard className="h-4 w-4" />
              Make Payment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Make Rent Payment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Amount Due</Label>
                <div className="text-2xl font-bold">${nextPayment.amount.toLocaleString()}</div>
                <div className="text-muted-foreground text-sm">{nextPayment.label}</div>
              </div>
              <Elements stripe={stripePromise}>
                <StripeCardForm amount={nextPayment.amount} onSuccess={handlePaymentSuccess} onCancel={() => setIsPaymentDialogOpen(false)} />
              </Elements>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Payment Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">${totalPaid.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">${totalPending.toLocaleString()}</div>
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
                Due {new Date(payments.find((p) => p.status === "pending")?.dueDate).toLocaleDateString()}
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
                      Due: {new Date(payment.dueDate).toLocaleDateString()}
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
