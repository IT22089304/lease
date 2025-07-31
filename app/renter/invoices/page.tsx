"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Eye, DollarSign, Calendar, FileText } from "lucide-react"
import { useAuth } from "@/lib/auth"
import { invoiceService } from "@/lib/services/invoice-service"
import type { Invoice } from "@/types"
import { toast } from "sonner"

export default function RenterInvoicesPage() {
  const { user } = useAuth()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)

  useEffect(() => {
    async function fetchInvoices() {
      if (!user?.email) return
      setLoading(true)
      try {
        const renterInvoices = await invoiceService.getRenterInvoices(user.email)
        setInvoices(renterInvoices)
      } catch (error) {
        console.error("Error fetching invoices:", error)
        toast.error("Failed to load invoices")
      } finally {
        setLoading(false)
      }
    }
    fetchInvoices()
  }, [user?.email])

  const getStatusBadge = (status: Invoice["status"]) => {
    const variants = {
      sent: "default",
      paid: "default",
      overdue: "destructive",
      cancelled: "secondary",
    }
    return variants[status] || "outline"
  }

  const getStatusLabel = (status: Invoice["status"]) => {
    const labels = {
      sent: "Sent",
      paid: "Paid",
      overdue: "Overdue",
      cancelled: "Cancelled",
    }
    return labels[status] || status
  }

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
  }

  if (!user || user.role !== "renter") {
    return <div>Access denied. Renter access required.</div>
  }

  if (loading) {
    return <div className="container mx-auto p-6">Loading invoices...</div>
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary">My Invoices</h1>
        <p className="text-muted-foreground">View and manage your rental invoices</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Total Invoices</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{invoices.length}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        <Card className="p-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Total Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              ${invoices.reduce((sum, invoice) => sum + invoice.amount, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">All invoices</p>
          </CardContent>
        </Card>
        <Card className="p-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Pending</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-destructive">
              {invoices.filter(invoice => invoice.status === "sent").length}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting payment</p>
          </CardContent>
        </Card>
        <Card className="p-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Paid</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-success">
              {invoices.filter(invoice => invoice.status === "paid").length}
            </div>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
      </div>

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
                </div>
                <div className="flex gap-2">
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
    </div>
  )
} 