"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { CreditCard, FileText, Home, Bell, DollarSign, Calendar, AlertTriangle, Eye } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { PaymentDialog } from "@/components/renter/payment-dialog"
import { NoticeViewer } from "@/components/renter/notice-viewer"
import { useAuth } from "@/lib/auth"
import type { Lease, RentPayment, RenterProfile, Notice } from "@/types"
import { noticeService } from "@/lib/services/notice-service"
import { invitationService } from "@/lib/services/invitation-service"
import { leaseService } from "@/lib/services/lease-service"
import { paymentService } from "@/lib/services/payment-service"
import { securityDepositService } from "@/lib/services/security-deposit-service"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

// Helper to calculate profile completion percentage
function getProfileCompletion(profile: any) {
  if (!profile) return 0;
  const requiredFields = [
    profile.fullName,
    profile.phone,
    profile.email,
    profile.taxNumber,
    profile.employment?.company,
    profile.employment?.jobTitle,
    profile.employment?.monthlyIncome,
    profile.employment?.employmentType,
    profile.emergencyContact?.name,
    profile.emergencyContact?.relationship,
    profile.emergencyContact?.phone,
    profile.emergencyContact?.email,
  ];
  const filled = requiredFields.filter(Boolean).length;
  return Math.round((filled / requiredFields.length) * 100);
}

export default function RenterDashboardPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [currentLease, setCurrentLease] = useState<Lease | null>(null)
  const [recentPayments, setRecentPayments] = useState<RentPayment[]>([])
  const [notices, setNotices] = useState<Notice[]>([])
  const [profile, setProfile] = useState<RenterProfile | null>(null)
  const [profileCompletion, setProfileCompletion] = useState(0)
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null)
  const [isClient, setIsClient] = useState(false)
  const [invitations, setInvitations] = useState<any[]>([])
  const [landlordName, setLandlordName] = useState<string>("");
  const [propertyAddress, setPropertyAddress] = useState<string>("");
  const [securityDeposits, setSecurityDeposits] = useState<any[]>([]);

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!isClient || !user || !user.email) return;
    async function fetchData() {
      if (!user || !user.email) return;
      // Fetch all leases for this renter
      const leases = await leaseService.getRenterLeases(user.email);
      // Sort leases by acceptance date (renterSignedAt) or createdAt descending
      const sortedLeases = leases.sort((a, b) => {
        const aDate = a.signatureStatus?.renterSignedAt ? new Date(a.signatureStatus.renterSignedAt).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const bDate = b.signatureStatus?.renterSignedAt ? new Date(b.signatureStatus.renterSignedAt).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return bDate - aDate;
      });
      // Pick the most recently accepted lease, or the most recent lease if none accepted
      const lease = sortedLeases.find(l => l.signatureStatus?.renterSigned) || sortedLeases[0] || null;
      setCurrentLease(lease);
      // Fetch payments and security deposits for this lease
      if (lease) {
        const payments = await paymentService.getLeasePayments(lease.id);
        setRecentPayments(payments);
        const deposits = await securityDepositService.getDepositsByLease(lease.id);
        setSecurityDeposits(deposits);
      } else {
        setRecentPayments([]);
        setSecurityDeposits([]);
      }
      // Fetch notices and invitations as before
      const [realNotices, realInvitations] = await Promise.all([
        noticeService.getRenterNotices(user.email),
        invitationService.getInvitationsForEmail(user.email),
      ])
      setNotices(realNotices)
      setInvitations(realInvitations)
      // Optionally, fetch profile completion from Firestore
    }
    fetchData();
  }, [user?.email, isClient]);

  useEffect(() => {
    async function fetchLandlord() {
      if (currentLease?.landlordId) {
        // Try landlordProfiles first
        const profileRef = doc(db, "landlordProfiles", currentLease.landlordId);
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists()) {
          setLandlordName(profileSnap.data().fullName || "Landlord");
          return;
        }
        // Fallback to users
        const userRef = doc(db, "users", currentLease.landlordId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setLandlordName(userSnap.data().name || "Landlord");
        } else {
          setLandlordName("Landlord");
        }
      }
    }
    fetchLandlord();
  }, [currentLease?.landlordId]);

  useEffect(() => {
    async function fetchProperty() {
      if (currentLease?.propertyId) {
        const propRef = doc(db, "properties", currentLease.propertyId);
        const propSnap = await getDoc(propRef);
        if (propSnap.exists()) {
          const addr = propSnap.data().address;
          setPropertyAddress(`${addr.street}${addr.unit ? ", Unit " + addr.unit : ""}, ${addr.city}, ${addr.state}`);
        } else {
          setPropertyAddress(currentLease.propertyId);
        }
      }
    }
    fetchProperty();
  }, [currentLease?.propertyId]);

  // Add useEffect to fetch renter profile and set completion
  useEffect(() => {
    if (!user || !user.id) return;
    async function fetchProfile() {
      if (!user || !user.id) return;
      const ref = doc(db, "renterProfiles", user.id);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setProfile(snap.data() as RenterProfile);
        setProfileCompletion(getProfileCompletion(snap.data()));
      } else {
        setProfileCompletion(0);
      }
    }
    fetchProfile();
  }, [user?.id]);

  // Helper to calculate next payment due with proper billing cycle
  function getNextPaymentDue(lease: Lease | null, payments: RentPayment[], securityDeposits: any[]): { amount: number, label: string, daysUntilDue: number } {
    if (!lease) return { amount: 0, label: "No lease", daysUntilDue: 0 };
    
    // Check if security deposit is paid
    const depositPaid = securityDeposits.some((d: any) => d.amount >= lease.securityDeposit);
    // Check if first month rent is paid
    const firstRentPaid = payments.some((p: RentPayment) => p.status === "paid" && p.amount >= lease.monthlyRent);
    
    if (!depositPaid || !firstRentPaid) {
      let due = 0;
      let labelParts = [];
      if (!depositPaid) {
        due += lease.securityDeposit;
        labelParts.push(`Security Deposit: $${lease.securityDeposit}`);
      }
      if (!firstRentPaid) {
        due += lease.monthlyRent;
        labelParts.push(`First Month Rent: $${lease.monthlyRent}`);
      }
      // For initial payments, due immediately (0 days)
      return { amount: due, label: labelParts.join(" + "), daysUntilDue: 0 };
    }
    
    // Find the last paid payment to calculate next billing cycle
    const paidPayments = payments.filter(p => p.status === "paid").sort((a, b) => 
      new Date(b.paidDate || b.dueDate).getTime() - new Date(a.paidDate || a.dueDate).getTime()
    );
    
    if (paidPayments.length === 0) {
      // No paid payments, use lease start date
      const leaseStartDate = new Date(lease.startDate);
      const now = new Date();
      const daysUntilDue = Math.ceil((leaseStartDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return { 
        amount: lease.monthlyRent, 
        label: `Monthly Rent: $${lease.monthlyRent}`, 
        daysUntilDue: Math.max(0, daysUntilDue) 
      };
    }
    
    // Get the last paid payment date
    const lastPaidDate = new Date(paidPayments[0].paidDate || paidPayments[0].dueDate);
    const now = new Date();
    
    // Calculate next billing cycle: last payment date + 30 days - days spent in paid month
    const daysSpentInPaidMonth = Math.ceil((now.getTime() - lastPaidDate.getTime()) / (1000 * 60 * 60 * 24));
    const nextBillingDate = new Date(lastPaidDate);
    nextBillingDate.setDate(nextBillingDate.getDate() + 30 - daysSpentInPaidMonth);
    
    // If next billing date is in the past, it means we're overdue
    if (nextBillingDate <= now) {
      return { 
        amount: lease.monthlyRent, 
        label: `Monthly Rent: $${lease.monthlyRent} (Overdue)`, 
        daysUntilDue: 0 
      };
    }
    
    const daysUntilDue = Math.ceil((nextBillingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    return { 
      amount: lease.monthlyRent, 
      label: `Monthly Rent: $${lease.monthlyRent}`, 
      daysUntilDue: Math.max(0, daysUntilDue) 
    };
  }

  const nextPaymentDue = recentPayments.find((p) => p.status === "pending")
  const unreadNotices = notices.filter((n) => !n.readAt)
  const totalPaid = recentPayments.filter((p) => p.status === "paid").reduce((sum, p) => sum + p.amount, 0)
    + securityDeposits.reduce((sum, d) => sum + (d.amount || 0), 0);

  const handlePaymentSuccess = (paymentData: any) => {
    console.log("Payment processed:", paymentData)
    // Update the payment status
    setRecentPayments((prev) =>
      prev.map((payment) =>
        payment.status === "pending"
          ? {
              ...payment,
              status: "paid",
              paidDate: new Date(),
              paymentMethod: paymentData.method,
              transactionId: `TXN${Date.now()}`,
            }
          : payment,
      ),
    )
    setIsPaymentDialogOpen(false)
  }

  const markNoticeAsRead = (noticeId: string) => {
    setNotices((prev) => prev.map((notice) => (notice.id === noticeId ? { ...notice, readAt: new Date() } : notice)))
  }

  const navigateToProfile = () => router.push("/renter/profile")
  const navigateToNotices = () => router.push("/renter/notices")
  const navigateToPayments = () => router.push("/payments")

  const handleAcceptLease = async () => {
    if (!currentLease) return;
    await leaseService.updateLease(currentLease.id, {
      signatureStatus: {
        ...currentLease.signatureStatus,
        renterSigned: true,
        renterSignedAt: new Date(),
      },
      status: "active",
    });
    window.location.reload();
  };

  if (!isClient) {
    return null // Prevent hydration issues by not rendering anything on server
  }

  if (!user || user.role !== "renter") {
    return <div>Access denied. Renter access required.</div>
  }

  const nextPayment = getNextPaymentDue(currentLease, recentPayments, securityDeposits);

  // Helper to generate next payment schedule
  const generateNextPaymentSchedule = () => {
    if (!currentLease) return [];
    
    const paidPayments = recentPayments.filter(p => p.status === "paid").sort((a, b) => 
      new Date(b.paidDate || b.dueDate).getTime() - new Date(a.paidDate || a.dueDate).getTime()
    );
    
    if (paidPayments.length === 0) {
      // No paid payments, start from lease start date
      const schedule = [];
      let currentDate = new Date(currentLease.startDate);
      const now = new Date();
      
      for (let i = 0; i < 6; i++) { // Show next 6 payments
        if (currentDate > now) {
          schedule.push({
            date: new Date(currentDate),
            amount: currentLease.monthlyRent,
            label: `Monthly Rent ${i + 1}`
          });
        }
        currentDate.setDate(currentDate.getDate() + 30);
      }
      return schedule;
    }
    
    // Calculate from last paid payment
    const lastPaidDate = new Date(paidPayments[0].paidDate || paidPayments[0].dueDate);
    const now = new Date();
    const daysSpentInPaidMonth = Math.ceil((now.getTime() - lastPaidDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const schedule = [];
    let nextBillingDate = new Date(lastPaidDate);
    nextBillingDate.setDate(nextBillingDate.getDate() + 30 - daysSpentInPaidMonth);
    
    for (let i = 0; i < 6; i++) { // Show next 6 payments
      if (nextBillingDate > now) {
        schedule.push({
          date: new Date(nextBillingDate),
          amount: currentLease.monthlyRent,
          label: `Monthly Rent ${i + 1}`
        });
      }
      nextBillingDate.setDate(nextBillingDate.getDate() + 30);
    }
    
    return schedule;
  };

  const nextPaymentSchedule = generateNextPaymentSchedule();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary">Renter Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {user.name}. Manage your rental information and payments.</p>
      </div>

      {/* Alerts Section */}
      <div className="space-y-4">
        {/* Profile Completion Alert */}
        {profileCompletion < 100 && (
          <Card className="border-warning/50 bg-warning/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-warning">
                <Bell className="h-5 w-5" />
                Complete Your Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Profile Completion</span>
                  <span className="text-sm font-medium">{profileCompletion}%</span>
                </div>
                <Progress value={profileCompletion} className="w-full" />
                <p className="text-sm text-muted-foreground">
                  Complete your profile to access all features and improve your rental applications.
                </p>
                <Button size="sm" onClick={navigateToProfile}>
                  Complete Profile
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Unread Notices Alert */}
        {unreadNotices.length > 0 && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                {unreadNotices.length} Unread Notice{unreadNotices.length > 1 ? "s" : ""}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                You have important notices from your landlord that require your attention.
              </p>
              <Button size="sm" variant="destructive" onClick={navigateToNotices}>
                View Notices
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Main Dashboard Content */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Current Lease */}
        {currentLease && (
          <Card className="md:col-span-2 lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                Current Lease
                {currentLease.signatureStatus.renterSigned && (
                  <Badge variant="default" className="ml-2">Accepted</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Property</p>
                  <p className="font-medium">{propertyAddress}</p>
                  <p className="text-sm text-muted-foreground">Unit A</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Monthly Rent</p>
                  <p className="font-medium text-lg">${currentLease.monthlyRent.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Lease Period</p>
                  <p className="font-medium">
                    {new Date(currentLease.startDate).toLocaleDateString()} -{" "}
                    {new Date(currentLease.endDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className="status-active">{currentLease.signatureStatus.renterSigned ? "Active" : "Pending Acceptance"}</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Landlord</p>
                  <p className="font-medium">{landlordName}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4">
                <Button variant="outline" size="sm">
                  <FileText className="h-4 w-4 mr-2" />
                  View Lease
                </Button>
                <Button variant="outline" size="sm">
                  Contact Landlord
                </Button>
                {!currentLease.signatureStatus.renterSigned && (
                  <Button onClick={handleAcceptLease} variant="default" className="col-span-2">
                    Accept Lease
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Next Payment Due Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl text-center">Next Payment Due</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8">
              <p className="text-5xl font-extrabold text-primary mb-2">${nextPayment.amount.toLocaleString()}</p>
              <p className="text-lg text-muted-foreground mb-2">{nextPayment.label}</p>
              
              {/* Show Pay Now only when due today or overdue, otherwise show status */}
              {nextPayment.amount > 0 ? (
                nextPayment.daysUntilDue === 0 || nextPayment.label.includes('Overdue') ? (
                  <Button size="lg" className="text-lg px-8 py-4" onClick={navigateToPayments}>
                    Pay Now
                  </Button>
                ) : (
                  <Badge variant="outline" className="text-lg px-6 py-2">
                    Due in {nextPayment.daysUntilDue} days
                  </Badge>
                )
              ) : (
                <Badge variant="default" className="text-lg px-6 py-2">All Paid</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Next Payment */}
        {nextPaymentDue && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Next Payment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-2xl font-bold">${nextPaymentDue.amount.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">
                  Due {new Date(nextPaymentDue.dueDate).toLocaleDateString()}
                </p>
                <div className="mt-2">
                  {new Date(nextPaymentDue.dueDate) < new Date() ? (
                    <Badge className="status-overdue">Overdue</Badge>
                  ) : (
                    <Badge className="status-badge bg-warning/10 text-warning border-warning/20">Pending</Badge>
                  )}
                </div>
              </div>
              <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Pay Rent
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Pay Rent</DialogTitle>
                  </DialogHeader>
                  <PaymentDialog
                    amount={nextPaymentDue.amount}
                    onSuccess={handlePaymentSuccess}
                    onCancel={() => setIsPaymentDialogOpen(false)}
                  />
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paid This Year</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">${totalPaid.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {recentPayments.filter((p) => p.status === "paid").length} payments made
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Days Until Next Payment</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              nextPayment.daysUntilDue === 0 ? 'text-destructive' :
              nextPayment.daysUntilDue <= 7 ? 'text-destructive' :
              nextPayment.daysUntilDue <= 14 ? 'text-warning' :
              'text-primary'
            }`}>
              {nextPayment.amount > 0 ? nextPayment.daysUntilDue : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {nextPayment.amount > 0 ? 
                (nextPayment.daysUntilDue === 0 ? 'Due today!' :
                 nextPayment.daysUntilDue === 1 ? 'Due tomorrow' :
                 `Due in ${nextPayment.daysUntilDue} days`) : 
                'No payments due'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lease Days Remaining</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentLease
                ? Math.ceil((new Date(currentLease.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                : 0}
            </div>
            <p className="text-xs text-muted-foreground">Until lease expires</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unread Notices</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{unreadNotices.length}</div>
            <p className="text-xs text-muted-foreground">Require your attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Payment History */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentPayments.slice(0, 3).map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">${payment.amount.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">
                      Due: {new Date(payment.dueDate).toLocaleDateString()}
                      {payment.paidDate && ` • Paid: ${new Date(payment.paidDate).toLocaleDateString()}`}
                    </p>
                    {payment.paymentMethod && (
                      <p className="text-xs text-muted-foreground">
                        {payment.paymentMethod}
                        {payment.transactionId && ` • ${payment.transactionId}`}
                      </p>
                    )}
                  </div>
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
                </div>
              ))}
              <Button variant="outline" className="w-full" onClick={navigateToPayments}>
                View All Payments
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Payment Schedule */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Payment Schedule</CardTitle>
            <p className="text-sm text-muted-foreground">Based on billing cycle: Last payment + 30 days - days spent</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {nextPaymentSchedule.length > 0 ? (
                nextPaymentSchedule.slice(0, 4).map((payment, index) => {
                  const daysUntil = Math.ceil((payment.date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                  return (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">${payment.amount.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">
                          Due: {payment.date.toLocaleDateString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {daysUntil === 0 ? 'Due today' : 
                           daysUntil === 1 ? 'Due tomorrow' : 
                           `Due in ${daysUntil} days`}
                        </p>
                      </div>
                      <Badge
                        variant={
                          daysUntil === 0 ? "destructive" :
                          daysUntil <= 7 ? "destructive" :
                          daysUntil <= 14 ? "secondary" :
                          "outline"
                        }
                      >
                        {daysUntil === 0 ? 'Due Today' : 
                         daysUntil <= 7 ? 'Due Soon' : 
                         daysUntil <= 14 ? 'Due Soon' : 
                         'Upcoming'}
                      </Badge>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  No upcoming payments scheduled
                </div>
              )}
              <Button variant="outline" className="w-full" onClick={navigateToPayments}>
                View Payment Details
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Notices */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Notices & Invitations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...notices, ...invitations].slice(0, 3).map((item) => {
                const isInvitation = !!item.status && !!item.invitedAt;
                return (
                  <div
                    key={item.id}
                    className="p-3 border rounded-lg cursor-pointer hover:bg-muted/30"
                    onClick={() => router.push("/renter/notices")}
                  >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm">{item.subject || item.message || "Invitation"}</h4>
                        {!item.readAt && (
                          <Badge variant="destructive" className="text-xs">
                            New
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {item.message || item.customMessage || "You are invited to take a look at the property."}
                      </p>
                      {item.propertyAddress && (
                        <p className="text-xs text-muted-foreground mt-1">
                          <span className="font-medium">Property:</span> {typeof item.propertyAddress === "string" ? item.propertyAddress : `${item.propertyAddress.street}${item.propertyAddress.unit ? ", Unit " + item.propertyAddress.unit : ""}, ${item.propertyAddress.city}, ${item.propertyAddress.state}`}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        {item.sentAt ? new Date(item.sentAt).toLocaleDateString() : item.invitedAt ? new Date(item.invitedAt).toLocaleDateString() : ""}
                      </p>
                    </div>
                  </div>
                </div>
                );
              })}
              <Button variant="outline" className="w-full" onClick={navigateToNotices}>
                View All Notices
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notice Viewer Dialog */}
      {selectedNotice && (
        <NoticeViewer notice={selectedNotice} isOpen={!!selectedNotice} onClose={() => setSelectedNotice(null)} />
      )}
    </div>
  )
}
