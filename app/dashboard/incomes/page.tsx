"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { leaseService } from "@/lib/services/lease-service";
import { paymentService } from "@/lib/services/payment-service";
import { securityDepositService } from "@/lib/services/security-deposit-service";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function IncomesPage() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<any[]>([]);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [leases, setLeases] = useState<any[]>([]);
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [totalPending, setTotalPending] = useState(0);

  useEffect(() => {
    async function fetchIncomes() {
      if (!user?.id) return;
      const leases = await leaseService.getLandlordLeases(user.id);
      setLeases(leases);
      let allPayments: any[] = [];
      let allDeposits: any[] = [];
      let allPending: any[] = [];
      let pendingSum = 0;
      for (const lease of leases) {
        const payments = await paymentService.getLeasePayments(lease.id);
        const deposits = await securityDepositService.getDepositsByLease(lease.id);
        allPayments = allPayments.concat(payments.filter((p: any) => p.status === "paid"));
        allDeposits = allDeposits.concat(deposits);
        // Collect pending payments
        const pending = payments.filter((p: any) => p.status === "pending");
        allPending = allPending.concat(pending);
        if (pending.length > 0) {
          pendingSum += pending.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
        } else {
          // Check initial payment for this lease
          const depositPaid = deposits.some((d: any) => d.amount >= lease.securityDeposit);
          const firstRentPaid = payments.some((p: any) => p.status === "paid" && p.amount >= lease.monthlyRent);
          if (!depositPaid || !firstRentPaid) {
            if (!depositPaid) pendingSum += lease.securityDeposit;
            if (!firstRentPaid) pendingSum += lease.monthlyRent;
          }
        }
      }
      setPayments(allPayments);
      setDeposits(allDeposits);
      setPendingPayments(allPending);
      setTotalPending(pendingSum);
    }
    fetchIncomes();
  }, [user?.id]);

  const totalRent = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalDeposits = deposits.reduce((sum, d) => sum + (d.amount || 0), 0);
  const totalIncome = totalRent + totalDeposits;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold text-primary mb-2">Income Overview</h1>
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">${totalIncome.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Rent Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRent.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Security Deposits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalDeposits.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pending Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">${totalPending.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Renters still have to pay</div>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Income Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left">Type</th>
                  <th className="px-4 py-2 text-left">Amount</th>
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-left">Method</th>
                </tr>
              </thead>
              <tbody>
                {deposits.map((d) => (
                  <tr key={"deposit-" + d.id} className="bg-blue-50">
                    <td className="px-4 py-2">Security Deposit</td>
                    <td className="px-4 py-2">${d.amount?.toLocaleString()}</td>
                    <td className="px-4 py-2">{d.paidDate ? new Date(d.paidDate).toLocaleDateString() : "-"}</td>
                    <td className="px-4 py-2">{d.paymentMethod || "-"}</td>
                  </tr>
                ))}
                {payments.map((p) => (
                  <tr key={"payment-" + p.id}>
                    <td className="px-4 py-2">Rent Payment</td>
                    <td className="px-4 py-2">${p.amount?.toLocaleString()}</td>
                    <td className="px-4 py-2">{p.paidDate ? new Date(p.paidDate).toLocaleDateString() : "-"}</td>
                    <td className="px-4 py-2">{p.paymentMethod || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 