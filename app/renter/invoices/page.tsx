"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Eye, DollarSign, Calendar, FileText, CreditCard, Filter } from "lucide-react"
import { useAuth } from "@/lib/auth"
import { invoiceService } from "@/lib/services/invoice-service"
import { paymentService } from "@/lib/services/payment-service"
import type { Invoice, RentPayment } from "@/types"
import { toast } from "sonner"

export default function RenterInvoicesPage() {
  const { user } = useAuth()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [payments, setPayments] = useState<RentPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [selectedPayment, setSelectedPayment] = useState<RentPayment | null>(null)
  const [activeTab, setActiveTab] = useState("invoices")

  useEffect(() => {
    async function fetchData() {
      if (!user?.email) return
      setLoading(true)
      try {
        const [renterInvoices, renterPayments] = await Promise.all([
          invoiceService.getRenterInvoices(user.email),
          paymentService.getRenterPayments(user.email)
        ])
        setInvoices(renterInvoices)
        setPayments(renterPayments)
      } catch (error) {
        console.error("Error fetching data:", error)
        toast.error("Failed to load invoices and payments")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [user?.email])

  const getStatusBadge = (status: Invoice["status"] | RentPayment["status"]) => {
    const variants = {
      sent: "default",
      paid: "default",
      pending: "secondary",
      overdue: "destructive",
      cancelled: "secondary",
      partial: "outline",
    }
    return variants[status] || "outline"
  }

  const getStatusLabel = (status: Invoice["status"] | RentPayment["status"]) => {
    const labels = {
      sent: "Sent",
      paid: "Paid",
      pending: "Pending",
      overdue: "Overdue",
      cancelled: "Cancelled",
      partial: "Partial",
    }
    return labels[status] || status
  }

  const getPaymentTypeLabel = (type: RentPayment["paymentType"]) => {
    const labels: Record<string, string> = {
      monthly_rent: "Monthly Rent",
      application_fee: "Application Fee",
      pet_fee: "Pet Fee",
      security_deposit: "Security Deposit",
    }
    return labels[type || ""] || type || "Unknown"
  }

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
  }

  const handleViewPayment = (payment: RentPayment) => {
    setSelectedPayment(payment)
  }

  if (!user || user.role !== "renter") {
    return <div>Access denied. Renter access required.</div>
  }

  if (loading) {
    return <div className="container mx-auto p-6">Loading invoices and payments...</div>
  }

  const totalInvoices = invoices.length
  const totalPayments = payments.length
  const totalAmount = invoices.reduce((sum, invoice) => sum + invoice.amount, 0)
  const totalPaid = payments.filter(p => p.status === "paid").reduce((sum, p) => sum + p.amount, 0)
  const pendingInvoices = invoices.filter(invoice => invoice.status === "sent").length
  const pendingPayments = payments.filter(payment => payment.status === "pending").length

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary">My Invoices & Payments</h1>
        <p className="text-muted-foreground">View and manage your rental invoices and payment history</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Total Invoices</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{totalInvoices}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        <Card className="p-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Total Payments</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{totalPayments}</div>
            <p className="text-xs text-muted-foreground">Individual records</p>
          </CardContent>
        </Card>
        <Card className="p-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Total Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">${totalAmount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">All invoices</p>
          </CardContent>
        </Card>
        <Card className="p-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Total Paid</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-success">${totalPaid.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Completed payments</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Invoices and Payments */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="invoices" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Invoices ({totalInvoices})
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Payments ({totalPayments})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-4">
          {/* Invoices List */}
          <div className="space-y-4">
            {invoices.map((invoice) => (
              <Card key={invoice.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">Invoice #{invoice.id.slice(-6)}</CardTitle>
                        <Badge variant={getStatusBadge(invoice.status) as any}>
                          {getStatusLabel(invoice.status)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Amount: ${invoice.amount.toLocaleString()}</span>
                        <span>Property: {invoice.propertyDetails?.address?.street || "N/A"}</span>
                        <span>Sent: {new Date(invoice.createdAt).toLocaleDateString()}</span>
                      </div>
                      {/* Show breakdown for paid invoices */}
                      {invoice.status === "paid" && (
                        <div className="text-xs text-muted-foreground mt-1">
                          <span>Breakdown: </span>
                          {invoice.monthlyRent > 0 && <span className="mr-2">Rent: ${invoice.monthlyRent.toLocaleString()}</span>}
                          {invoice.securityDeposit > 0 && <span className="mr-2">Deposit: ${invoice.securityDeposit.toLocaleString()}</span>}
                          {invoice.applicationFee > 0 && <span className="mr-2">Application: ${invoice.applicationFee.toLocaleString()}</span>}
                          {invoice.petFee > 0 && <span className="mr-2">Pet Fee: ${invoice.petFee.toLocaleString()}</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {invoice.status === "sent" && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => window.location.href = `/payments?invoiceId=${invoice.id}`}
                        >
                          <DollarSign className="h-4 w-4 mr-2" />
                          Pay Now
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewInvoice(invoice)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {invoice.notes && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {invoice.notes}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}

            {invoices.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No invoices found.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          {/* Payments List */}
          <div className="space-y-4">
            {payments.map((payment) => (
              <Card key={payment.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">
                          {getPaymentTypeLabel(payment.paymentType)} Payment
                        </CardTitle>
                        <Badge variant={getStatusBadge(payment.status) as any}>
                          {getStatusLabel(payment.status)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Amount: ${payment.amount.toLocaleString()}</span>
                        <span>Due: {new Date(payment.dueDate).toLocaleDateString()}</span>
                        {payment.paidDate && (
                          <span>Paid: {new Date(payment.paidDate).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewPayment(payment)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {payment.paymentMethod && (
                    <p className="text-sm text-muted-foreground">
                      Payment Method: {payment.paymentMethod}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}

            {payments.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No payment records found.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Invoice Details Dialog */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold">Invoice #{selectedInvoice.id.slice(-6)}</h1>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant={getStatusBadge(selectedInvoice.status) as any}>
                    {getStatusLabel(selectedInvoice.status)}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Sent on {new Date(selectedInvoice.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedInvoice(null)}
              >
                ×
              </Button>
            </div>

            <div className="space-y-6">
              {/* Property Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Property Information</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedInvoice.propertyDetails ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-medium mb-2">Property Address</h4>
                          <p className="text-sm text-muted-foreground">
                            {selectedInvoice.propertyDetails.address?.street}
                            {selectedInvoice.propertyDetails.address?.unit && `, Unit ${selectedInvoice.propertyDetails.address.unit}`}
                            <br />
                            {selectedInvoice.propertyDetails.address?.city}, {selectedInvoice.propertyDetails.address?.state} {selectedInvoice.propertyDetails.address?.postalCode}
                          </p>
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">Property Type</h4>
                          <p className="text-sm text-muted-foreground capitalize">
                            {selectedInvoice.propertyDetails.type}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Property details not available</p>
                  )}
                </CardContent>
              </Card>

              {/* Invoice Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Invoice Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span>Monthly Rent:</span>
                      <span>${selectedInvoice.monthlyRent?.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Security Deposit:</span>
                      <span>${selectedInvoice.securityDeposit?.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Application Fee:</span>
                      <span>${selectedInvoice.applicationFee?.toLocaleString() || 0}</span>
                    </div>
                    {selectedInvoice.petFee > 0 && (
                      <div className="flex justify-between items-center">
                        <span>Pet Fee:</span>
                        <span>${selectedInvoice.petFee?.toLocaleString() || 0}</span>
                      </div>
                    )}
                    <div className="border-t pt-3">
                      <div className="flex justify-between items-center text-lg font-semibold">
                        <span>Total Amount:</span>
                        <span className="text-primary">${selectedInvoice.amount.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Additional Notes */}
              {selectedInvoice.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle>Additional Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{selectedInvoice.notes}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment Details Dialog */}
      {selectedPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold">
                  {getPaymentTypeLabel(selectedPayment.paymentType)} Payment
                </h1>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant={getStatusBadge(selectedPayment.status) as any}>
                    {getStatusLabel(selectedPayment.status)}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Created on {new Date(selectedPayment.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedPayment(null)}
              >
                ×
              </Button>
            </div>

            <div className="space-y-6">
              {/* Payment Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Payment Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Amount:</span>
                      <span className="text-lg font-semibold">${selectedPayment.amount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Payment Type:</span>
                      <span>{getPaymentTypeLabel(selectedPayment.paymentType)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Due Date:</span>
                      <span>{new Date(selectedPayment.dueDate).toLocaleDateString()}</span>
                    </div>
                    {selectedPayment.paidDate && (
                      <div className="flex justify-between items-center">
                        <span>Paid Date:</span>
                        <span>{new Date(selectedPayment.paidDate).toLocaleDateString()}</span>
                      </div>
                    )}
                    {selectedPayment.paymentMethod && (
                      <div className="flex justify-between items-center">
                        <span>Payment Method:</span>
                        <span>{selectedPayment.paymentMethod}</span>
                      </div>
                    )}
                    {selectedPayment.transactionId && (
                      <div className="flex justify-between items-center">
                        <span>Transaction ID:</span>
                        <span className="text-sm font-mono">{selectedPayment.transactionId}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 