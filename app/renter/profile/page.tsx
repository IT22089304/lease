"use client"

import { useState, useEffect } from "react"
import { Save, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/lib/auth"
import type { RenterProfile, RentHistory, Reference } from "@/types"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"

// Address template for default values
const emptyAddress = {
  street: "",
  city: "",
  state: "",
  country: "",
  postalCode: "",
  unit: ""
};

function getDateInputValue(date: any) {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  return isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
}

// Helper to detect Firestore Timestamp
function isFirestoreTimestamp(val: any): boolean {
  return val && typeof val === "object" && typeof val.toDate === "function" && typeof val.seconds === "number";
}
// Improved helper to recursively convert all Date objects to Firestore Timestamps, skip invalid dates, and not double-convert Firestore Timestamps
function convertDatesToTimestamps(obj: any): any {
  if (obj instanceof Date) {
    if (isNaN(obj.getTime())) return null; // skip invalid dates
    return Timestamp.fromDate(obj);
  }
  if (isFirestoreTimestamp(obj)) {
    return obj; // already a Firestore Timestamp
  }
  if (Array.isArray(obj)) {
    return obj.map(convertDatesToTimestamps);
  }
  if (obj && typeof obj === "object") {
    const out: any = {};
    for (const key in obj) {
      out[key] = convertDatesToTimestamps(obj[key]);
    }
    return out;
  }
  return obj;
}

export default function RenterProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Partial<RenterProfile> & { photoUrl?: string, taxNumber?: string }>({
    fullName: user?.name || "",
    phone: "",
    email: user?.email || "",
    taxNumber: "",
    currentAddress: { ...emptyAddress },
    employment: {
      company: "",
      jobTitle: "",
      monthlyIncome: 0,
      employmentType: "full_time",
      startDate: new Date(),
      workAddress: { ...emptyAddress }
    },
    rentHistory: [],
    references: [],
    emergencyContact: {
      name: "",
      relationship: "",
      phone: "",
      email: "",
      address: { ...emptyAddress }
    },
    photoUrl: ""
  });
  const [editMode, setEditMode] = useState(false);
  const [photo, setPhoto] = useState<string>("");
  // Remove debugInfo and error state
  // Remove all setDebugInfo and setError calls
  // Remove the debug info box from the UI (the <pre> block after Save/Cancel buttons)

  // Load profile from Firestore on mount
  useEffect(() => {
    if (!user?.id) return;
    async function fetchProfile() {
      try {
        const ref = doc(db, "renterProfiles", user.id);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setProfile({
            ...profile,
            ...data,
            taxNumber: data.taxNumber || "",
            // Add similar conversions for other date fields if needed
          });
        }
      } catch (err) {
        console.error("[Profile] Load error:", err);
      }
    }
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader()
      reader.onload = (ev) => {
        setPhoto(ev.target?.result as string)
        setProfile((prev) => ({ ...prev, photoUrl: ev.target?.result as string }))
      }
      reader.readAsDataURL(e.target.files[0])
    }
  }

  // Save profile to Firestore
  const handleSave = async () => {
    setEditMode(false);
    if (!user?.id) return;
    try {
      await setDoc(doc(db, "renterProfiles", user.id), {
        ...convertDatesToTimestamps(profile),
        userId: user.id, // Always set userId for Firestore rules
        email: user.email,
      }, { merge: true });
      console.log("[Profile] Saved:", { ...profile, userId: user.id, email: user.email });
    } catch (err) {
      console.error("[Profile] Save error:", err);
    }
  }

  // When adding new rent history, use Address object
  const addRentHistory = () => {
    const newHistory: RentHistory = {
      address: { ...emptyAddress },
      landlordName: "",
      landlordContact: "",
      startDate: new Date(),
      endDate: new Date(),
      monthlyRent: 0,
    }
    setProfile((prev) => ({
      ...prev,
      rentHistory: [...(prev.rentHistory || []), newHistory],
    }))
  }

  // Update rent history address fields
  const updateRentHistoryAddress = (index: number, field: keyof typeof emptyAddress, value: string) => {
    setProfile((prev) => ({
      ...prev,
      rentHistory: prev.rentHistory?.map((history, i) =>
        i === index ? { ...history, address: { ...history.address, [field]: value } } : history
      ),
    }))
  }

  const removeRentHistory = (index: number) => {
    setProfile((prev) => ({
      ...prev,
      rentHistory: prev.rentHistory?.filter((_, i) => i !== index),
    }))
  }

  const updateRentHistory = (index: number, field: keyof RentHistory, value: any) => {
    setProfile((prev) => ({
      ...prev,
      rentHistory: prev.rentHistory?.map((history, i) => (i === index ? { ...history, [field]: value } : history)),
    }))
  }

  const addReference = () => {
    const newReference: Reference = {
      name: "",
      relationship: "",
      phone: "",
      email: "",
    }
    setProfile((prev) => ({
      ...prev,
      references: [...(prev.references || []), newReference],
    }))
  }

  const removeReference = (index: number) => {
    setProfile((prev) => ({
      ...prev,
      references: prev.references?.filter((_, i) => i !== index),
    }))
  }

  const updateReference = (index: number, field: keyof Reference, value: string) => {
    setProfile((prev) => ({
      ...prev,
      references: prev.references?.map((reference, i) => (i === index ? { ...reference, [field]: value } : reference)),
    }))
  }

  if (!user || user.role !== "renter") {
    return <div>Access denied. Renter access required.</div>;
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      {/* Profile Summary Card */}
      <Card className="mb-6">
        <CardContent className="flex flex-col items-center py-8">
          <div className="relative mb-4">
            <Avatar className="h-24 w-24">
              <AvatarImage src={photo || profile.photoUrl || undefined} alt={profile.fullName || user.name} />
              <AvatarFallback>{(profile.fullName || user.name || "").slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            {editMode && (
              <label className="absolute bottom-0 right-0 bg-white rounded-full p-1 shadow cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                <Plus className="h-5 w-5 text-primary" />
              </label>
            )}
          </div>
          <h2 className="text-2xl font-bold mb-1">{profile.fullName || user.name}</h2>
          <p className="text-muted-foreground mb-1">{profile.email || user.email}</p>
          <Badge variant="secondary">Renter</Badge>
          <div className="mt-4 flex gap-2">
            {editMode ? (
              <Button size="sm" variant="outline" onClick={() => setEditMode(false)}>
                Cancel
              </Button>
            ) : (
              <Button size="sm" onClick={() => setEditMode(true)}>
                Edit Profile
              </Button>
            )}
            {editMode && (
              <Button size="sm" onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />Save
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="full-name">Full Name *</Label>
              <Input
                id="full-name"
                value={profile.fullName}
                onChange={(e) => setProfile((prev) => ({ ...prev, fullName: e.target.value }))}
                placeholder="John Doe"
                disabled={!editMode}
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                value={profile.phone}
                onChange={(e) => setProfile((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="(555) 123-4567"
                disabled={!editMode}
              />
            </div>
            <div>
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={profile.email}
                onChange={(e) => setProfile((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="john@example.com"
                disabled={!editMode}
              />
            </div>
            <div>
              <Label htmlFor="tax-number">Tax Number *</Label>
              <Input
                id="tax-number"
                value={profile.taxNumber}
                onChange={e => setProfile(prev => ({ ...prev, taxNumber: e.target.value }))}
                placeholder="123-45-6789"
                disabled={!editMode}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Employment Information */}
      <Card>
        <CardHeader>
          <CardTitle>Employment Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="company">Company *</Label>
              <Input
                id="company"
                value={profile.employment?.company}
                onChange={(e) =>
                  setProfile((prev) => ({
                    ...prev,
                    employment: { ...prev.employment!, company: e.target.value },
                  }))
                }
                placeholder="Acme Corp"
                disabled={!editMode}
              />
            </div>
            <div>
              <Label htmlFor="job-title">Job Title *</Label>
              <Input
                id="job-title"
                value={profile.employment?.jobTitle}
                onChange={(e) =>
                  setProfile((prev) => ({
                    ...prev,
                    employment: { ...prev.employment!, jobTitle: e.target.value },
                  }))
                }
                placeholder="Software Engineer"
                disabled={!editMode}
              />
            </div>
            <div>
              <Label htmlFor="monthly-income">Monthly Income *</Label>
              <Input
                id="monthly-income"
                type="number"
                value={profile.employment?.monthlyIncome}
                onChange={(e) =>
                  setProfile((prev) => ({
                    ...prev,
                    employment: { ...prev.employment!, monthlyIncome: Number.parseInt(e.target.value) },
                  }))
                }
                placeholder="5000"
                disabled={!editMode}
              />
            </div>
            <div>
              <Label htmlFor="employment-type">Employment Type *</Label>
              <Select
                value={profile.employment?.employmentType}
                onValueChange={(value) =>
                  setProfile((prev) => ({
                    ...prev,
                    employment: { ...prev.employment!, employmentType: value as any },
                  }))
                }
                disabled={!editMode}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_time">Full Time</SelectItem>
                  <SelectItem value="part_time">Part Time</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="self_employed">Self Employed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Rental History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Rental History</CardTitle>
            {editMode && (
              <Button onClick={addRentHistory} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add History
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {profile.rentHistory?.map((history, index) => (
            <div key={index} className="p-4 border rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Rental #{index + 1}</h4>
                {editMode && (
                  <Button onClick={() => removeRentHistory(index)} size="sm" variant="ghost">
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label>Address</Label>
                  <Input
                    value={history.address.street}
                    onChange={(e) => updateRentHistoryAddress(index, "street", e.target.value)}
                    placeholder="123 Main St"
                    disabled={!editMode}
                  />
                  <Input
                    value={history.address.city}
                    onChange={(e) => updateRentHistoryAddress(index, "city", e.target.value)}
                    placeholder="City"
                    disabled={!editMode}
                  />
                  <Input
                    value={history.address.state}
                    onChange={(e) => updateRentHistoryAddress(index, "state", e.target.value)}
                    placeholder="State"
                    disabled={!editMode}
                  />
                  <Input
                    value={history.address.country}
                    onChange={(e) => updateRentHistoryAddress(index, "country", e.target.value)}
                    placeholder="Country"
                    disabled={!editMode}
                  />
                  <Input
                    value={history.address.postalCode}
                    onChange={(e) => updateRentHistoryAddress(index, "postalCode", e.target.value)}
                    placeholder="Postal Code"
                    disabled={!editMode}
                  />
                  <Input
                    value={history.address.unit}
                    onChange={(e) => updateRentHistoryAddress(index, "unit", e.target.value)}
                    placeholder="Unit"
                    disabled={!editMode}
                  />
                </div>
                <div>
                  <Label>Landlord Name</Label>
                  <Input
                    value={history.landlordName}
                    onChange={(e) => updateRentHistory(index, "landlordName", e.target.value)}
                    placeholder="Jane Smith"
                    disabled={!editMode}
                  />
                </div>
                <div>
                  <Label>Landlord Contact</Label>
                  <Input
                    value={history.landlordContact}
                    onChange={(e) => updateRentHistory(index, "landlordContact", e.target.value)}
                    placeholder="jane@example.com"
                    disabled={!editMode}
                  />
                </div>
                <div>
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={history.startDate.toISOString().split("T")[0]}
                    onChange={(e) => updateRentHistory(index, "startDate", new Date(e.target.value))}
                    disabled={!editMode}
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={history.endDate.toISOString().split("T")[0]}
                    onChange={(e) => updateRentHistory(index, "endDate", new Date(e.target.value))}
                    disabled={!editMode}
                  />
                </div>
              </div>
            </div>
          ))}
          {!profile.rentHistory?.length && (
            <p className="text-center text-muted-foreground py-4">
              No rental history added yet. {editMode ? 'Click "Add History" to get started.' : ''}
            </p>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* References */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>References</CardTitle>
            {editMode && (
              <Button onClick={addReference} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Reference
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {profile.references?.map((reference, index) => (
            <div key={index} className="p-4 border rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Reference #{index + 1}</h4>
                {editMode && (
                  <Button onClick={() => removeReference(index)} size="sm" variant="ghost">
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Name</Label>
                  <Input
                    value={reference.name}
                    onChange={(e) => updateReference(index, "name", e.target.value)}
                    placeholder="John Doe"
                    disabled={!editMode}
                  />
                </div>
                <div>
                  <Label>Relationship</Label>
                  <Input
                    value={reference.relationship}
                    onChange={(e) => updateReference(index, "relationship", e.target.value)}
                    placeholder="Former Landlord"
                    disabled={!editMode}
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={reference.phone}
                    onChange={(e) => updateReference(index, "phone", e.target.value)}
                    placeholder="(555) 123-4567"
                    disabled={!editMode}
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    value={reference.email}
                    onChange={(e) => updateReference(index, "email", e.target.value)}
                    placeholder="john@example.com"
                    disabled={!editMode}
                  />
                </div>
              </div>
            </div>
          ))}
          {!profile.references?.length && (
            <p className="text-center text-muted-foreground py-4">
              No references added yet. {editMode ? 'Click "Add Reference" to get started.' : ''}
            </p>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Emergency Contact */}
      <Card>
        <CardHeader>
          <CardTitle>Emergency Contact</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="emergency-name">Name *</Label>
              <Input
                id="emergency-name"
                value={profile.emergencyContact?.name}
                onChange={(e) =>
                  setProfile((prev) => ({
                    ...prev,
                    emergencyContact: { ...prev.emergencyContact!, name: e.target.value },
                  }))
                }
                placeholder="Jane Doe"
                disabled={!editMode}
              />
            </div>
            <div>
              <Label htmlFor="emergency-relationship">Relationship *</Label>
              <Input
                id="emergency-relationship"
                value={profile.emergencyContact?.relationship}
                onChange={(e) =>
                  setProfile((prev) => ({
                    ...prev,
                    emergencyContact: { ...prev.emergencyContact!, relationship: e.target.value },
                  }))
                }
                placeholder="Mother"
                disabled={!editMode}
              />
            </div>
            <div>
              <Label htmlFor="emergency-phone">Phone *</Label>
              <Input
                id="emergency-phone"
                value={profile.emergencyContact?.phone}
                onChange={(e) =>
                  setProfile((prev) => ({
                    ...prev,
                    emergencyContact: { ...prev.emergencyContact!, phone: e.target.value },
                  }))
                }
                placeholder="(555) 123-4567"
                disabled={!editMode}
              />
            </div>
            <div>
              <Label htmlFor="emergency-email">Email *</Label>
              <Input
                id="emergency-email"
                type="email"
                value={profile.emergencyContact?.email}
                onChange={(e) =>
                  setProfile((prev) => ({
                    ...prev,
                    emergencyContact: { ...prev.emergencyContact!, email: e.target.value },
                  }))
                }
                placeholder="jane@example.com"
                disabled={!editMode}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
