"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/lib/auth"
import { invitationService } from "@/lib/services/invitation-service"
import { propertyService } from "@/lib/services/property-service"
import { Plus } from "lucide-react"
import { storage } from "@/lib/firebase"
import { applicationService } from "@/lib/services/application-service"
import { ref as storageRef, uploadString, uploadBytes, getDownloadURL } from "firebase/storage"

export default function NewApplicationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const invitationId = searchParams.get("invitationId")
  const { user } = useAuth()
  const [invitation, setInvitation] = useState<any>(null)
  const [property, setProperty] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState<any>({})
  const [applicants, setApplicants] = useState([{ name: "", dob: "", sin: "", dl: "", occupation: "" }]);
  const [occupants, setOccupants] = useState([{ name: "", relationship: "", age: "" }]);
  const [employments, setEmployments] = useState([{ employer: "", address: "", phone: "", position: "", length: "", supervisor: "", salary: "" }]);
  const [references, setReferences] = useState([{ name: "", address: "", phone: "", length: "", occupation: "" }]);
  const [autos, setAutos] = useState([{ make: "", model: "", year: "", licence: "" }]);
  const [attachments, setAttachments] = useState<File[]>([]);
  const signaturePadRefs = useRef<(HTMLCanvasElement | null)[]>([]);

  // Handlers for dynamic sections
  const handleApplicantChange = (i: number, field: string, value: string) => {
    setApplicants(prev => prev.map((a, idx) => idx === i ? { ...a, [field]: value } : a));
  };
  const addApplicant = () => setApplicants(prev => [...prev, { name: "", dob: "", sin: "", dl: "", occupation: "" }]);

  const handleOccupantChange = (i: number, field: string, value: string) => {
    setOccupants(prev => prev.map((a, idx) => idx === i ? { ...a, [field]: value } : a));
  };
  const addOccupant = () => setOccupants(prev => [...prev, { name: "", relationship: "", age: "" }]);

  const handleEmploymentChange = (i: number, field: string, value: string) => {
    setEmployments(prev => prev.map((a, idx) => idx === i ? { ...a, [field]: value } : a));
  };
  const addEmployment = () => setEmployments(prev => [...prev, { employer: "", address: "", phone: "", position: "", length: "", supervisor: "", salary: "" }]);

  const handleReferenceChange = (i: number, field: string, value: string) => {
    setReferences(prev => prev.map((a, idx) => idx === i ? { ...a, [field]: value } : a));
  };
  const addReference = () => setReferences(prev => [...prev, { name: "", address: "", phone: "", length: "", occupation: "" }]);

  const handleAutoChange = (i: number, field: string, value: string) => {
    setAutos(prev => prev.map((a, idx) => idx === i ? { ...a, [field]: value } : a));
  };
  const addAuto = () => setAutos(prev => [...prev, { make: "", model: "", year: "", licence: "" }]);

  // File attachment handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(Array.from(e.target.files));
    }
  };

  // Robust pointer event signature pad setup
  function setupSignaturePad(canvas: HTMLCanvasElement | null) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let drawing = false;
    let lastX = 0;
    let lastY = 0;
    const getXY = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return [e.clientX - rect.left, e.clientY - rect.top];
    };
    const startDraw = (e: PointerEvent) => {
      e.preventDefault();
      drawing = true;
      [lastX, lastY] = getXY(e);
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
    };
    const draw = (e: PointerEvent) => {
      if (!drawing) return;
      e.preventDefault();
      const [x, y] = getXY(e);
      ctx.lineTo(x, y);
      ctx.stroke();
      [lastX, lastY] = [x, y];
    };
    const endDraw = (e: PointerEvent) => {
      e.preventDefault();
      drawing = false;
      ctx.closePath();
    };
    canvas.addEventListener("pointerdown", startDraw);
    canvas.addEventListener("pointermove", draw);
    canvas.addEventListener("pointerup", endDraw);
    canvas.addEventListener("pointerleave", endDraw);
    // Clean up on unmount
    return () => {
      canvas.removeEventListener("pointerdown", startDraw);
      canvas.removeEventListener("pointermove", draw);
      canvas.removeEventListener("pointerup", endDraw);
      canvas.removeEventListener("pointerleave", endDraw);
    };
  }

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      if (!user || !invitationId) return
      // Fetch invitation
      const invs = await invitationService.getInvitationsForEmail(user.email)
      const inv = invs.find((i: any) => i.id === invitationId)
      setInvitation(inv)
      // Fetch property
      if (inv?.propertyId) {
        const prop = await propertyService.getProperty(inv.propertyId)
        setProperty(prop)
      }
      // Fetch profile (mock: use user info)
      setProfile({
        fullName: user?.name || "",
        email: user?.email || "",
        phone: (user as any)?.phone || "",
        employment: {
          company: "",
          jobTitle: "",
          monthlyIncome: "",
        },
      })
      setForm({
        fullName: user?.name || "",
        email: user?.email || "",
        phone: (user as any)?.phone || "",
        employmentCompany: "",
        employmentJobTitle: "",
        employmentMonthlyIncome: "",
      })
      setLoading(false)
    }
    fetchData()
  }, [user, invitationId])

  useEffect(() => {
    applicants.forEach((_, i) => {
      const canvas = signaturePadRefs.current[i];
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      let drawing = false;
      let lastX = 0;
      let lastY = 0;
      const getXY = (e: MouseEvent | TouchEvent) => {
        const rect = canvas.getBoundingClientRect();
        if ('touches' in e && e.touches.length > 0) {
          return [e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top];
        }
        // @ts-ignore
        return [e.clientX - rect.left, e.clientY - rect.top];
      };
      const startDraw = (e: MouseEvent | TouchEvent) => {
        e.preventDefault();
        drawing = true;
        [lastX, lastY] = getXY(e);
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
      };
      const draw = (e: MouseEvent | TouchEvent) => {
        if (!drawing) return;
        e.preventDefault();
        const [x, y] = getXY(e);
        ctx.lineTo(x, y);
        ctx.stroke();
        [lastX, lastY] = [x, y];
      };
      const endDraw = (e: MouseEvent | TouchEvent) => {
        e.preventDefault();
        drawing = false;
        ctx.closePath();
      };
      // Mouse events
      canvas.addEventListener("mousedown", startDraw);
      canvas.addEventListener("mousemove", draw);
      canvas.addEventListener("mouseup", endDraw);
      canvas.addEventListener("mouseleave", endDraw);
      // Touch events
      canvas.addEventListener("touchstart", startDraw);
      canvas.addEventListener("touchmove", draw);
      canvas.addEventListener("touchend", endDraw);
      canvas.addEventListener("touchcancel", endDraw);
      // Clean up
      return () => {
        canvas.removeEventListener("mousedown", startDraw);
        canvas.removeEventListener("mousemove", draw);
        canvas.removeEventListener("mouseup", endDraw);
        canvas.removeEventListener("mouseleave", endDraw);
        canvas.removeEventListener("touchstart", startDraw);
        canvas.removeEventListener("touchmove", draw);
        canvas.removeEventListener("touchend", endDraw);
        canvas.removeEventListener("touchcancel", endDraw);
      };
    });
  }, [applicants]);

  const handleChange = (e: any) => {
    setForm((prev: any) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    setSubmitting(true)

    // 1. Upload signatures as PNGs to Storage
    const signatureUrls: string[] = [];
    for (let i = 0; i < signaturePadRefs.current.length; i++) {
      const canvas = signaturePadRefs.current[i];
      if (canvas) {
        const dataUrl = canvas.toDataURL("image/png");
        const sigRef = storageRef(storage, `applications/signatures/${Date.now()}_${i}.png`);
        await uploadString(sigRef, dataUrl, 'data_url');
        const url = await getDownloadURL(sigRef);
        signatureUrls.push(url);
      } else {
        signatureUrls.push("");
      }
    }

    // 2. Upload attachments to Storage
    const attachmentUrls: string[] = [];
    for (let i = 0; i < attachments.length; i++) {
      const file = attachments[i];
      const fileRef = storageRef(storage, `applications/attachments/${Date.now()}_${file.name}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      attachmentUrls.push(url);
    }

    // 3. Save application data to Firestore
    await applicationService.createApplication({
      ...form,
      applicants,
      occupants,
      employments,
      references,
      autos,
      invitationId,
      propertyId: invitation?.propertyId || property?.id,
      landlordId: invitation?.landlordId,
      renterEmail: user?.email,
      signatures: signatureUrls,
      attachments: attachmentUrls,
    });

    setSubmitting(false)
    router.push("/renter/dashboard")
  }

  // Helper to format address
  function formatAddress(address: any) {
    if (!address) return "";
    return [
      address.street,
      address.unit ? `Unit ${address.unit}` : null,
      address.city,
      address.state,
      address.country,
      address.postalCode
    ].filter(Boolean).join(", ");
  }

  if (loading) return <div className="p-8">Loading...</div>
  if (!invitation || !property) return <div className="p-8 text-destructive">Invalid invitation or property.</div>

  return (
    <div className="container mx-auto py-10 max-w-5xl px-4">
      <h1 className="text-3xl font-bold text-primary mb-6">Rental Application</h1>
      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-12 rounded-xl shadow-lg border">
        <h3 className="font-bold mb-2">We hereby make application to rent</h3>
        <div className="mb-4">
          <Label>Property to Rent</Label>
          <Input name="propertyToRent" value={formatAddress(property?.address)} readOnly className="bg-gray-100 cursor-not-allowed" />
        </div>
        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <Label>Start Date</Label>
            <Input name="startDate" type="date" value={form.startDate || ""} onChange={handleChange} required />
          </div>
          <div className="flex-1">
            <Label>Monthly Rental ($)</Label>
            <Input name="monthlyRental" type="number" value={form.monthlyRental || ""} onChange={handleChange} required />
          </div>
        </div>
        <div className="mb-4">
          <Label>Rent Due Day Each Month</Label>
          <Input name="rentDueDay" type="number" value={form.rentDueDay || ""} onChange={handleChange} placeholder="e.g. 1 for 1st of each month" required />
        </div>
        <h4 className="font-bold mt-6 mb-2 flex items-center gap-2">Applicants <Button type="button" size="icon" variant="outline" onClick={addApplicant}><Plus className="h-4 w-4" /></Button></h4>
        {applicants.map((a, i) => (
          <div key={i} className="mb-4 p-2 border rounded">
            <Label>Name</Label>
            <Input value={a.name} onChange={e => handleApplicantChange(i, "name", e.target.value)} />
            <Label>Date of Birth</Label>
            <Input type="date" value={a.dob} onChange={e => handleApplicantChange(i, "dob", e.target.value)} />
            <Label>SIN No. (Optional)</Label>
            <Input value={a.sin} onChange={e => handleApplicantChange(i, "sin", e.target.value)} />
            <Label>Drivers License No.</Label>
            <Input value={a.dl} onChange={e => handleApplicantChange(i, "dl", e.target.value)} />
            <Label>Occupation</Label>
            <Input value={a.occupation} onChange={e => handleApplicantChange(i, "occupation", e.target.value)} />
          </div>
        ))}
        <h4 className="font-bold mt-6 mb-2 flex items-center gap-2">Other Occupants <Button type="button" size="icon" variant="outline" onClick={addOccupant}><Plus className="h-4 w-4" /></Button></h4>
        {occupants.map((a, i) => (
          <div key={i} className="mb-2 flex gap-2">
            <Input placeholder="Name" value={a.name} onChange={e => handleOccupantChange(i, "name", e.target.value)} />
            <Input placeholder="Relationship" value={a.relationship} onChange={e => handleOccupantChange(i, "relationship", e.target.value)} />
            <Input placeholder="Age" value={a.age} onChange={e => handleOccupantChange(i, "age", e.target.value)} />
          </div>
        ))}
        <div className="mb-4">
          <Label>Do you have any pets?</Label>
          <Input name="hasPets" value={form.hasPets || ""} onChange={handleChange} placeholder="Yes/No" />
          <Label>If so, describe</Label>
          <Input name="petDescription" value={form.petDescription || ""} onChange={handleChange} />
        </div>
        <div className="mb-4">
          <Label>Why are you vacating your present place of residence?</Label>
          <Input name="vacateReason" value={form.vacateReason || ""} onChange={handleChange} />
        </div>
        <h4 className="font-bold mt-6 mb-2">Last Two Places of Residence</h4>
        {[0, 1].map((i) => (
          <div key={i} className="mb-4 p-2 border rounded">
            <Label>Address</Label>
            <Input name={`residence${i}_address`} value={form[`residence${i}_address`] || ""} onChange={handleChange} />
            <Label>From</Label>
            <Input name={`residence${i}_from`} type="date" value={form[`residence${i}_from`] || ""} onChange={handleChange} />
            <Label>To</Label>
            <Input name={`residence${i}_to`} type="date" value={form[`residence${i}_to`] || ""} onChange={handleChange} />
            <Label>Name of Landlord</Label>
            <Input name={`residence${i}_landlord`} value={form[`residence${i}_landlord`] || ""} onChange={handleChange} />
            <Label>Telephone</Label>
            <Input name={`residence${i}_phone`} value={form[`residence${i}_phone`] || ""} onChange={handleChange} />
          </div>
        ))}
        <h4 className="font-bold mt-6 mb-2 flex items-center gap-2">Employment History <Button type="button" size="icon" variant="outline" onClick={addEmployment}><Plus className="h-4 w-4" /></Button></h4>
        {employments.map((a, i) => (
          <div key={i} className="mb-4 p-2 border rounded">
            <Label>Employer</Label>
            <Input value={a.employer} onChange={e => handleEmploymentChange(i, "employer", e.target.value)} />
            <Label>Business Address</Label>
            <Input value={a.address} onChange={e => handleEmploymentChange(i, "address", e.target.value)} />
            <Label>Business Telephone</Label>
            <Input value={a.phone} onChange={e => handleEmploymentChange(i, "phone", e.target.value)} />
            <Label>Position Held</Label>
            <Input value={a.position} onChange={e => handleEmploymentChange(i, "position", e.target.value)} />
            <Label>Length of Employment</Label>
            <Input value={a.length} onChange={e => handleEmploymentChange(i, "length", e.target.value)} />
            <Label>Name of Supervisor</Label>
            <Input value={a.supervisor} onChange={e => handleEmploymentChange(i, "supervisor", e.target.value)} />
            <Label>Current Salary Range: Monthly $</Label>
            <Input value={a.salary} onChange={e => handleEmploymentChange(i, "salary", e.target.value)} />
          </div>
        ))}
        <h4 className="font-bold mt-6 mb-2 flex items-center gap-2">Personal References <Button type="button" size="icon" variant="outline" onClick={addReference}><Plus className="h-4 w-4" /></Button></h4>
        {references.map((a, i) => (
          <div key={i} className="mb-4 p-2 border rounded">
            <Label>Name</Label>
            <Input value={a.name} onChange={e => handleReferenceChange(i, "name", e.target.value)} />
            <Label>Address</Label>
            <Input value={a.address} onChange={e => handleReferenceChange(i, "address", e.target.value)} />
            <Label>Telephone</Label>
            <Input value={a.phone} onChange={e => handleReferenceChange(i, "phone", e.target.value)} />
            <Label>Length of Acquaintance</Label>
            <Input value={a.length} onChange={e => handleReferenceChange(i, "length", e.target.value)} />
            <Label>Occupation</Label>
            <Input value={a.occupation} onChange={e => handleReferenceChange(i, "occupation", e.target.value)} />
          </div>
        ))}
        <h4 className="font-bold mt-6 mb-2 flex items-center gap-2">Automobile(s) <Button type="button" size="icon" variant="outline" onClick={addAuto}><Plus className="h-4 w-4" /></Button></h4>
        {autos.map((a, i) => (
          <div key={i} className="mb-2 flex gap-2">
            <Input placeholder="Make" value={a.make} onChange={e => handleAutoChange(i, "make", e.target.value)} />
            <Input placeholder="Model" value={a.model} onChange={e => handleAutoChange(i, "model", e.target.value)} />
            <Input placeholder="Year" value={a.year} onChange={e => handleAutoChange(i, "year", e.target.value)} />
            <Input placeholder="Licence No" value={a.licence} onChange={e => handleAutoChange(i, "licence", e.target.value)} />
          </div>
        ))}
        <div className="mb-4">
          <Label>Attach Files (optional)</Label>
          <Input type="file" multiple onChange={handleFileChange} />
          {attachments.length > 0 && (
            <ul className="mt-2 text-xs text-muted-foreground">
              {attachments.map((file, idx) => (
                <li key={idx}>{file.name}</li>
              ))}
            </ul>
          )}
        </div>
        {/* Signature section at the end of the form */}
        <div className="mb-8">
          <h4 className="font-bold mt-8 mb-2">Applicant Signatures</h4>
          {applicants.map((a, i) => (
            <div key={i} className="mb-4">
              <Label>{a.name ? `${a.name}'s Signature` : `Applicant ${i + 1} Signature`}</Label>
              <canvas
                ref={el => {
                  signaturePadRefs.current[i] = el;
                  if (el) setupSignaturePad(el);
                }}
                width={300}
                height={80}
                style={{ border: '1px solid #ccc', background: '#fff', display: 'block' }}
              />
              <Button type="button" size="sm" className="mt-2" onClick={() => {
                const canvas = signaturePadRefs.current[i];
                if (canvas) {
                  const ctx = canvas.getContext("2d");
                  if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
                }
              }}>Clear</Button>
              <div className="text-xs text-muted-foreground mb-2">Draw your signature above</div>
            </div>
          ))}
        </div>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Submitting..." : "Submit Application"}
        </Button>
      </form>
    </div>
  )
} 