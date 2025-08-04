"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { leaseService } from "@/lib/services/lease-service"
import { paymentService } from "@/lib/services/payment-service"
import { useAuth } from "@/lib/auth"
import { Property, Lease, RentPayment } from "@/types"

export default function PropertyIncomePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()
  const propertyId = searchParams.get("propertyId")

  const [leases, setLeases] = useState<Lease[]>([])
  const [payments, setPayments] = useState<RentPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [property, setProperty] = useState<Property | null>(null)

  useEffect(() => {
    async function fetchData() {
      if (!user?.id || !propertyId) return
      setLoading(true)
      
      // Get all leases for this property for this landlord
      const allLeases = await leaseService.getLandlordLeases(user.id)
      const propertyLeases = allLeases.filter((l: Lease) => l.propertyId === propertyId)
      setLeases(propertyLeases)
      
      // Get all payments for this landlord and filter by property
      const allLandlordPayments = await paymentService.getLandlordPayments(user.id)
      const propertyPayments = allLandlordPayments.filter((p: RentPayment) => 
        propertyLeases.some(lease => lease.id === p.leaseId)
      )
      setPayments(propertyPayments)
      
      setLoading(false)
    }
    fetchData()
  }, [user?.id, propertyId])

  const totalIncome = payments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + (p.amount || 0), 0)

  if (!user) {
    return <div className="container mx-auto p-8">You must be logged in to view this page.</div>
  }

  return (
    <div className="container mx-auto p-8">
      <Button variant="outline" onClick={() => router.push("/dashboard")}>Back to Dashboard</Button>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Property Income</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div>Loading...</div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold">Total Paid: <span className="text-primary">${totalIncome.toLocaleString()}</span></h2>
                <p className="text-muted-foreground text-sm">(All paid rent payments for this property)</p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date Paid</TableHead>
                    <TableHead>Lease ID</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.filter((p) => p.status === "paid").map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.paidDate ? new Date(p.paidDate).toLocaleDateString() : "-"}</TableCell>
                      <TableCell>{p.leaseId}</TableCell>
                      <TableCell>${p.amount?.toLocaleString()}</TableCell>
                      <TableCell>{p.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {payments.filter((p) => p.status === "paid").length === 0 && (
                <div className="text-muted-foreground mt-4">No payments found for this property.</div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}