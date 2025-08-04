import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth"
import { propertyService } from "@/lib/services/property-service"
import { leaseService } from "@/lib/services/lease-service"
import { paymentService } from "@/lib/services/payment-service"
import type { Property, DashboardStats, Lease } from "@/types"

export function useLandlordDashboard() {
  const { user } = useAuth()
  const [properties, setProperties] = useState<Property[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    totalProperties: 0,
    activeLeases: 0,
    monthlyRevenue: 0,
    overduePayments: 0,
    pendingSignatures: 0,
    pendingApplications: 0,
    activeInvitations: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadDashboardData() {
      if (!user?.id) return

      try {
        setLoading(true)
        setError(null)

        // Load properties
        const propertiesData = await propertyService.getLandlordProperties(user.id)
        setProperties(propertiesData)

        // Load all leases for the landlord (not per property)
        const allLeases = await leaseService.getLandlordLeases(user.id)

        // Calculate stats
        const activeLeases = allLeases.filter(lease => lease.status === "active")
        const monthlyRevenue = activeLeases.reduce((sum, lease) => sum + (lease.monthlyRent || 0), 0)
        
        // Calculate overdue payments (simplified for now)
        let overduePayments = 0
        try {
          for (const lease of activeLeases) {
            const overdue = await paymentService.getOverduePayments(lease.id)
            overduePayments += overdue.length
          }
        } catch (paymentError) {
          console.warn("Error fetching overdue payments:", paymentError)
          // Continue without overdue payments data
        }

        setStats({
          totalProperties: propertiesData.length,
          activeLeases: activeLeases.length,
          monthlyRevenue,
          overduePayments,
          pendingSignatures: allLeases.filter(lease => lease.status === "pending_signature").length,
          pendingApplications: 0, // TODO: Add applications service
          activeInvitations: 0, // TODO: Add invitations service
        })

      } catch (err) {
        console.error("Error loading dashboard data:", err)
        setError("Failed to load dashboard data. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [user?.id])

  return {
    properties,
    stats,
    loading,
    error
  }
} 