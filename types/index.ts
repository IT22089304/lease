export interface User {
  id: string
  email: string
  name: string
  role: "landlord" | "renter" | "admin"
  createdAt: Date
  updatedAt: Date
}

export interface LandlordProfile {
  id: string
  userId: string
  fullName: string
  contactEmail: string
  phone: string
  mailingAddress: string
  businessName?: string
  bankDetails?: BankDetails
  preferredJurisdiction: string
  createdAt: Date
  updatedAt: Date
}

export interface RenterProfile {
  id: string
  userId: string
  fullName: string
  dateOfBirth: Date
  phone: string
  email: string
  currentAddress: Address
  employment: EmploymentInfo
  rentHistory: RentHistory[]
  references: Reference[]
  emergencyContact: EmergencyContact
  paymentMethod?: PaymentMethod
  createdAt: Date
  updatedAt: Date
}

export interface Address {
  street: string
  unit?: string
  city: string
  state: string
  country: string
  postalCode: string
}

export interface Property {
  id: string
  landlordId: string
  address: Address
  type: "apartment" | "house" | "condo" | "townhouse" | "other"
  bedrooms: number
  bathrooms: number
  squareFeet?: number
  description?: string
  images?: string[]
  amenities?: string[]
  createdAt: Date
  updatedAt: Date
}

export interface LeaseInvitation {
  id: string
  landlordId: string
  propertyId: string
  renterEmail: string
  status: "pending" | "accepted" | "declined" | "expired"
  invitedAt: Date
  respondedAt?: Date
  expiresAt: Date
  message?: string
}

export interface LeaseApplication {
  id: string
  invitationId: string
  propertyId: string
  landlordId: string
  renterEmail: string
  applicationData: any
  status: "draft" | "submitted" | "under_review" | "approved" | "rejected"
  submittedAt?: Date
  reviewedAt?: Date
  signature?: DigitalSignature
  createdAt: Date
  updatedAt: Date
}

export interface DigitalSignature {
  signedBy: string
  signedAt: Date
  ipAddress: string
  signatureData: string
}

export interface Lease {
  id: string
  propertyId: string
  landlordId: string
  renterId: string
  applicationId?: string
  startDate: Date
  endDate: Date
  monthlyRent: number
  securityDeposit: number
  status: "draft" | "pending_signature" | "active" | "expired" | "terminated"
  leaseTerms: LeaseTerms
  signatureStatus: SignatureStatus
  createdAt: Date
  updatedAt: Date
}

export interface RentPayment {
  id: string
  leaseId: string
  amount: number
  dueDate: Date
  paidDate?: Date
  status: "pending" | "paid" | "overdue" | "partial"
  paymentMethod?: string
  transactionId?: string
  createdAt: Date
}

export interface Notice {
  id: string
  landlordId: string
  propertyId: string
  renterId: string
  type:
    | "late_rent"
    | "noise_complaint"
    | "inspection"
    | "lease_violation"
    | "eviction"
    | "rent_increase"
    | "maintenance"
    | "parking_violation"
    | "pet_violation"
    | "utility_shutdown"
    | "cleanliness"
    | "custom"
  subject: string
  message: string
  attachments?: string[]
  sentAt: Date
  readAt?: Date
}

export interface LeaseTemplate {
  id: string
  region: string
  country: string
  state: string
  fields: LeaseField[]
  createdBy: string
  version: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface LeaseField {
  id: string
  name: string
  label: string
  type: "text" | "number" | "date" | "boolean" | "select" | "textarea" | "address" | "signature"
  required: boolean
  options?: string[]
  defaultValue?: any
  conditionalLogic?: ConditionalLogic
  order: number
  section: string
  helpText?: string
}

// Supporting interfaces
export interface BankDetails {
  accountNumber: string
  routingNumber: string
  bankName: string
}

export interface EmploymentInfo {
  company: string
  jobTitle: string
  monthlyIncome: number
  employmentType: "full_time" | "part_time" | "contract" | "self_employed"
  startDate: Date
  workAddress: Address
  supervisorName?: string
  supervisorPhone?: string
}

export interface RentHistory {
  address: Address
  landlordName: string
  landlordContact: string
  startDate: Date
  endDate: Date
  monthlyRent: number
  reasonForLeaving?: string
}

export interface Reference {
  name: string
  relationship: string
  phone: string
  email: string
  address?: Address
}

export interface EmergencyContact {
  name: string
  relationship: string
  phone: string
  email: string
  address?: Address
}

export interface PaymentMethod {
  type: "card" | "bank"
  last4: string
  brand?: string
  isDefault: boolean
}

export interface LeaseTerms {
  petPolicy: boolean
  petDeposit?: number
  smokingAllowed: boolean
  utilitiesIncluded: string[]
  parkingIncluded: boolean
  customClauses: string[]
}

export interface SignatureStatus {
  renterSigned: boolean
  renterSignedAt?: Date
  coSignerRequired: boolean
  coSignerSigned?: boolean
  coSignerSignedAt?: Date
  landlordSigned: boolean
  landlordSignedAt?: Date
  completedAt?: Date
}

export interface ConditionalLogic {
  dependsOn: string
  condition: "equals" | "not_equals" | "contains"
  value: any
}

export interface DashboardStats {
  totalProperties: number
  activeLeases: number
  monthlyRevenue: number
  overduePayments: number
  pendingSignatures: number
  pendingApplications?: number
  activeInvitations?: number
}
