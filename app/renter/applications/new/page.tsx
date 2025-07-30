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
import { Plus, X, Copy, Link, ExternalLink, CheckCircle, RefreshCw } from "lucide-react"
import { storage, db } from "@/lib/firebase"
import { applicationService } from "@/lib/services/application-service"
import { ref as storageRef, uploadString, uploadBytes, getDownloadURL } from "firebase/storage"
import { doc, getDoc } from "firebase/firestore"

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
  const [visibleResidences, setVisibleResidences] = useState([0, 1]); // Track which residence fields are visible
  const signaturePadRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const [signatureLinks, setSignatureLinks] = useState<string[]>([]); // Store signing links for sharing
  const [signatureStatuses, setSignatureStatuses] = useState<{ [key: number]: 'pending' | 'completed' }>({}); // Track signature status
  const [saving, setSaving] = useState(false); // Track save status
  const [lastSaved, setLastSaved] = useState<Date | null>(null); // Track last save time
  const [checkingSignatures, setCheckingSignatures] = useState(false); // Track signature check status

  // Handlers for dynamic sections
  const handleApplicantChange = (i: number, field: string, value: string) => {
    setApplicants(prev => prev.map((a, idx) => idx === i ? { ...a, [field]: value } : a));
  };
  const addApplicant = () => {
    setApplicants(prev => [...prev, { name: "", dob: "", sin: "", dl: "", occupation: "" }]);
    setSignatureLinks(prev => [...prev, ""]); // Add empty link for new applicant
  };

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
    };
    canvas.addEventListener("pointerdown", startDraw);
    canvas.addEventListener("pointermove", draw);
    canvas.addEventListener("pointerup", endDraw);
    canvas.addEventListener("pointerleave", endDraw);
  }

  const copySignatureLink = async (url: string, index: number) => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      // You could add a toast notification here
      console.log('Signature link copied to clipboard');
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const checkSignatureStatus = async (index?: number) => {
    if (!invitationId) return;
    
    setCheckingSignatures(true);
    
    try {
      // Check if application exists and get signature statuses
      const applicationDoc = await getDoc(doc(db, "applications", invitationId));
      if (applicationDoc.exists()) {
        const data = applicationDoc.data();
        
        // Update signature statuses
        if (data.signatureStatuses) {
          setSignatureStatuses(data.signatureStatuses);
        }
        
        // Check for saved signatures and display them
        let signaturesFound = false;
        
        // Check for signatures as object (signatures[0])
        if (data.signatures && typeof data.signatures === 'object') {
          Object.keys(data.signatures).forEach((idx) => {
            const signatureIndex = parseInt(idx);
            const signatureData = data.signatures[signatureIndex];
            
            if (signatureData) {
              signaturesFound = true;
              setSignatureStatuses(prev => ({
                ...prev,
                [signatureIndex]: 'completed'
              }));
              setSavedSignatures(prev => ({
                ...prev,
                [signatureIndex]: signatureData
              }));
            }
          });
        }
        
        // Check for signatures as dot notation fields (signatures.0)
        if (!signaturesFound) {
          const allFields = Object.keys(data);
          const signatureFields = allFields.filter(field => field.startsWith('signatures.'));
          
          signatureFields.forEach((field) => {
            const signatureIndex = field.split('.')[1];
            const signatureData = data[field];
            
            if (signatureData) {
              signaturesFound = true;
              const signatureIndexNum = parseInt(signatureIndex);
              setSignatureStatuses(prev => ({
                ...prev,
                [signatureIndexNum]: 'completed'
              }));
              setSavedSignatures(prev => ({
                ...prev,
                [signatureIndexNum]: signatureData
              }));
            }
          });
        }
        
        // If checking specific signature, show feedback
        if (index !== undefined) {
          const isCompleted = data.signatureStatuses?.[index] === 'completed';
          const hasSignature = data.signatures?.[index];
          
          if (isCompleted && hasSignature) {
            alert(`Signature ${index + 1} has been completed!`);
          } else if (hasSignature) {
            alert(`Signature ${index + 1} has been signed but status not updated.`);
          } else {
            alert(`Signature ${index + 1} is still pending.`);
          }
        }
      }
    } catch (error) {
      console.error("Error checking signature status:", error);
      alert("Failed to check signature status. Please try again.");
    } finally {
      setCheckingSignatures(false);
    }
  };

  // Generate signing link for external users
  const generateSigningLink = async (index: number) => {
    if (!invitationId) return;
    
    // Create a unique signing token
    const signingToken = `${invitationId}_${index}_${Date.now()}`;
    const signingUrl = `${window.location.origin}/sign?token=${signingToken}&applicant=${index}`;
    
    setSignatureLinks(prev => {
      const newLinks = [...prev];
      newLinks[index] = signingUrl;
      return newLinks;
    });
    
    // Set status to pending
    setSignatureStatuses(prev => ({
      ...prev,
      [index]: 'pending'
    }));
    
    // TODO: Store the signing token in database for verification
    console.log('Generated signing link:', signingUrl);
  };

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      if (!user || !invitationId) return
      // Fetch invitation
      const invs = await invitationService.getInvitationsForEmail(user.email)
      const inv = invs.find((i: any) => i.id === invitationId)
      setInvitation(inv)
      // Fetch property
      if (inv && (inv as any)?.propertyId) {
        const prop = await propertyService.getProperty((inv as any).propertyId)
        setProperty(prop)
      }
      
      // Try to load saved application data
      try {
        const applicationDoc = await getDoc(doc(db, "applications", invitationId))
        if (applicationDoc.exists()) {
          const savedData = applicationDoc.data()
          if (savedData.status === "incomplete") {
            // Load saved form data
            setForm({
              fullName: savedData.fullName || user?.name || "",
              email: savedData.email || user?.email || "",
              phone: savedData.phone || (user as any)?.phone || "",
              employmentCompany: savedData.employmentCompany || "",
              employmentJobTitle: savedData.employmentJobTitle || "",
              employmentMonthlyIncome: savedData.employmentMonthlyIncome || "",
              currentAddress: savedData.currentAddress?.street || "",
              currentCity: savedData.currentAddress?.city || "",
              currentProvince: savedData.currentAddress?.province || "",
              currentPostalCode: savedData.currentAddress?.postalCode || "",
              ...savedData.residences?.reduce((acc: any, residence: any, index: number) => ({
                ...acc,
                [`residence${index}_address`]: residence.address || "",
                [`residence${index}_from`]: residence.from || "",
                [`residence${index}_to`]: residence.to || "",
                [`residence${index}_landlord`]: residence.landlord || "",
                [`residence${index}_phone`]: residence.phone || "",
              }), {})
            })
            
            // Load saved sections
            if (savedData.applicants) setApplicants(savedData.applicants)
            if (savedData.occupants) setOccupants(savedData.occupants)
            if (savedData.employments) setEmployments(savedData.employments)
            if (savedData.references) setReferences(savedData.references)
            if (savedData.autos) setAutos(savedData.autos)
            if (savedData.residences) setVisibleResidences(savedData.residences.map((_: any, index: number) => index))
            if (savedData.signatureLinks) setSignatureLinks(savedData.signatureLinks)
            if (savedData.signatureStatuses) setSignatureStatuses(savedData.signatureStatuses)
            if (savedData.lastSaved) setLastSaved(savedData.lastSaved.toDate())
          }
        }
      } catch (error) {
        console.error("Error loading saved data:", error)
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
      
      // Set default form if no saved data
      if (!form.fullName) {
        setForm({
          fullName: user?.name || "",
          email: user?.email || "",
          phone: (user as any)?.phone || "",
          employmentCompany: "",
          employmentJobTitle: "",
          employmentMonthlyIncome: "",
        })
      }
      
      // Load existing signatures if application exists
      if (invitationId) {
        try {
          const applicationDoc = await getDoc(doc(db, "applications", invitationId));
          if (applicationDoc.exists()) {
            const data = applicationDoc.data();
            console.log("Loading existing application data:", data);
            
            if (data.signatures) {
              console.log("Found existing signatures:", Object.keys(data.signatures));
              Object.keys(data.signatures).forEach((idx) => {
                const signatureIndex = parseInt(idx);
                const signatureData = data.signatures[signatureIndex];
                if (signatureData) {
                  console.log(`Loading signature ${signatureIndex}`);
                  setSavedSignatures(prev => ({
                    ...prev,
                    [signatureIndex]: signatureData
                  }));
                  setSignatureStatuses(prev => ({
                    ...prev,
                    [signatureIndex]: 'completed'
                  }));
                }
              });
            }
            
            if (data.signatureStatuses) {
              console.log("Loading existing signature statuses:", data.signatureStatuses);
              setSignatureStatuses(data.signatureStatuses);
            }
          }
        } catch (error) {
          console.error("Error loading existing signatures:", error);
        }
      }
      
      setLoading(false)
    }
    fetchData()
  }, [user, invitationId])

  useEffect(() => {
    // Initialize signatureLinks array when applicants change
    setSignatureLinks(prev => {
      const newLinks = [...prev];
      while (newLinks.length < applicants.length) {
        newLinks.push("");
      }
      return newLinks;
    });

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
        if (ctx) {
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        }
      };
      const draw = (e: MouseEvent | TouchEvent) => {
        if (!drawing) return;
        e.preventDefault();
        const [x, y] = getXY(e);
        if (ctx) {
        ctx.lineTo(x, y);
        ctx.stroke();
        }
        [lastX, lastY] = [x, y];
      };
      const endDraw = (e: MouseEvent | TouchEvent) => {
        e.preventDefault();
        drawing = false;
      };
      canvas.addEventListener("mousedown", startDraw);
      canvas.addEventListener("mousemove", draw);
      canvas.addEventListener("mouseup", endDraw);
      canvas.addEventListener("mouseleave", endDraw);
      canvas.addEventListener("touchstart", startDraw);
      canvas.addEventListener("touchmove", draw);
      canvas.addEventListener("touchend", endDraw);
    });
  }, [applicants]);

    // State to store actual signature images
  const [savedSignatures, setSavedSignatures] = useState<{ [key: number]: string }>({});

  // Load signatures on component mount
  useEffect(() => {
    if (!invitationId) return;
    
    const loadExistingSignatures = async () => {
      try {
        const applicationDoc = await getDoc(doc(db, "applications", invitationId));
        if (applicationDoc.exists()) {
          const data = applicationDoc.data();
          
          if (data.signatures) {
            Object.keys(data.signatures).forEach((idx) => {
              const signatureIndex = parseInt(idx);
              const signatureData = data.signatures[signatureIndex];
              if (signatureData) {
                setSavedSignatures(prev => ({
                  ...prev,
                  [signatureIndex]: signatureData
                }));
                setSignatureStatuses(prev => ({
                  ...prev,
                  [signatureIndex]: 'completed'
                }));
              }
            });
          }
          
          if (data.signatureStatuses) {
            setSignatureStatuses(data.signatureStatuses);
          }
        }
      } catch (error) {
        console.error("Error loading signatures on mount:", error);
      }
    };
    
    loadExistingSignatures();
  }, [invitationId]);



  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSaveChanges = async () => {
    setSaving(true);
    try {
      // Create application data with incomplete status
      const applicationData = {
        invitationId: invitationId || "",
        propertyId: property?.id || "",
        landlordId: invitation?.landlordId || "",
        renterEmail: user?.email || "",
        fullName: form.fullName || user?.name || "",
        phone: form.phone || (user as any)?.phone || "",
        employmentCompany: form.employmentCompany || "",
        employmentJobTitle: form.employmentJobTitle || "",
        employmentMonthlyIncome: form.employmentMonthlyIncome || "",
        // Form sections data
        applicants: applicants,
        occupants: occupants,
        employments: employments,
        references: references,
        autos: autos,
        residences: visibleResidences.map(i => ({
          address: form[`residence${i}_address`] || "",
          from: form[`residence${i}_from`] || "",
          to: form[`residence${i}_to`] || "",
          landlord: form[`residence${i}_landlord`] || "",
          phone: form[`residence${i}_phone`] || "",
        })),
        currentAddress: {
          street: form.currentAddress || "",
          city: form.currentCity || "",
          province: form.currentProvince || "",
          postalCode: form.currentPostalCode || "",
        },
        // Signature data
        signatureLinks: signatureLinks,
        signatureStatuses: signatureStatuses,
        // Status
        status: "incomplete",
        lastSaved: new Date(),
        submittedAt: null, // Not submitted yet
      };

      // Save to Firestore with invitationId as document ID
      if (invitationId) {
        await applicationService.saveIncompleteApplication(invitationId, applicationData);
        setLastSaved(new Date());
        alert("Changes saved successfully! You can continue filling the form and submit when all signatures are complete.");
      }
    } catch (error) {
      console.error("Error saving changes:", error);
      alert("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Upload attachments
      const attachmentUrls = [];
      for (const file of attachments) {
      const fileRef = storageRef(storage, `applications/attachments/${Date.now()}_${file.name}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      attachmentUrls.push(url);
    }

      // Get signatures from canvas (for local signatures) and check for external signatures
      const signatures = [];
      for (let i = 0; i < signaturePadRefs.current.length; i++) {
        const canvas = signaturePadRefs.current[i];
        if (canvas) {
          // Check if there's an external signature for this applicant
          if (invitationId) {
            const applicationDoc = await getDoc(doc(db, "applications", invitationId));
            if (applicationDoc.exists()) {
              const data = applicationDoc.data();
              if (data.signatures && data.signatures[i]) {
                // Use external signature if available
                signatures.push(data.signatures[i]);
              } else {
                // Use local signature if drawn
                const dataUrl = canvas.toDataURL("image/png");
                // Check if canvas has any drawing (not just blank)
                const ctx = canvas.getContext("2d");
                const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
                const hasDrawing = imageData && imageData.data.some(pixel => pixel !== 0);
                
                if (hasDrawing) {
                  signatures.push(dataUrl);
                } else {
                  // No signature drawn for this applicant
                  signatures.push(null);
                }
              }
            } else {
              // Use local signature if drawn
              const dataUrl = canvas.toDataURL("image/png");
              const ctx = canvas.getContext("2d");
              const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
              const hasDrawing = imageData && imageData.data.some(pixel => pixel !== 0);
              
              if (hasDrawing) {
                signatures.push(dataUrl);
              } else {
                signatures.push(null);
              }
            }
          } else {
            // Use local signature if drawn
            const dataUrl = canvas.toDataURL("image/png");
            const ctx = canvas.getContext("2d");
            const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
            const hasDrawing = imageData && imageData.data.some(pixel => pixel !== 0);
            
            if (hasDrawing) {
              signatures.push(dataUrl);
            } else {
              signatures.push(null);
            }
          }
        } else {
          signatures.push(null);
        }
      }

      // Check if all required signatures are provided
      const missingSignatures = signatures.filter((sig, index) => !sig).length;
      if (missingSignatures > 0) {
        alert(`Please provide signatures for all ${applicants.length} applicants before submitting.`);
        setSubmitting(false);
        return;
      }

      // Create application data
      const applicationData = {
        invitationId: invitationId || "",
        propertyId: property?.id || "",
        landlordId: invitation?.landlordId || "",
        renterEmail: user?.email || "",
        fullName: form.fullName || user?.name || "",
        phone: form.phone || (user as any)?.phone || "",
        employmentCompany: form.employmentCompany || "",
        employmentJobTitle: form.employmentJobTitle || "",
        employmentMonthlyIncome: form.employmentMonthlyIncome || "",
        // Form sections data
        applicants: applicants,
        occupants: occupants,
        employments: employments,
        references: references,
        autos: autos,
        residences: visibleResidences.map(i => ({
          address: form[`residence${i}_address`] || "",
          from: form[`residence${i}_from`] || "",
          to: form[`residence${i}_to`] || "",
          landlord: form[`residence${i}_landlord`] || "",
          phone: form[`residence${i}_phone`] || "",
        })),
        currentAddress: {
          street: form.currentAddress || "",
          city: form.currentCity || "",
          province: form.currentProvince || "",
          postalCode: form.currentPostalCode || "",
        },
        // Signature data
        signatures: signatures,
        signatureLinks: signatureLinks,
        signatureStatuses: signatureStatuses,
        // Attachments
        attachments: attachmentUrls,
        // Status
        status: "submitted",
        submittedAt: new Date(),
      };

      await applicationService.createApplication(applicationData);
      router.push("/renter/applications");
    } catch (error) {
      console.error("Error submitting application:", error);
    } finally {
      setSubmitting(false);
    }
  };

  function formatAddress(address: any) {
    if (!address) return "";
    return `${address.street || ""} ${address.city || ""} ${address.state || ""} ${address.zipCode || ""}`.trim();
  }

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center">Invalid invitation</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Rental Application</CardTitle>
          <div className="text-sm text-muted-foreground">
            Property: {property?.address ? formatAddress(property.address) : "Loading..."}
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
        <h4 className="font-bold mt-6 mb-2 flex items-center gap-2">Applicants <Button type="button" size="icon" variant="outline" onClick={addApplicant}><Plus className="h-4 w-4" /></Button></h4>
        {applicants.map((a, i) => (
          <div key={i} className="mb-4 p-2 border rounded">
                <Label>Full Name</Label>
            <Input value={a.name} onChange={e => handleApplicantChange(i, "name", e.target.value)} />
            <Label>Date of Birth</Label>
            <Input type="date" value={a.dob} onChange={e => handleApplicantChange(i, "dob", e.target.value)} />
                <Label>SIN</Label>
            <Input value={a.sin} onChange={e => handleApplicantChange(i, "sin", e.target.value)} />
                <Label>Driver's License</Label>
            <Input value={a.dl} onChange={e => handleApplicantChange(i, "dl", e.target.value)} />
            <Label>Occupation</Label>
            <Input value={a.occupation} onChange={e => handleApplicantChange(i, "occupation", e.target.value)} />
          </div>
        ))}
            <h4 className="font-bold mt-6 mb-2 flex items-center gap-2">Occupants <Button type="button" size="icon" variant="outline" onClick={addOccupant}><Plus className="h-4 w-4" /></Button></h4>
        {occupants.map((a, i) => (
              <div key={i} className="mb-4 p-2 border rounded">
                <Label>Name</Label>
                <Input value={a.name} onChange={e => handleOccupantChange(i, "name", e.target.value)} />
                <Label>Relationship</Label>
                <Input value={a.relationship} onChange={e => handleOccupantChange(i, "relationship", e.target.value)} />
                <Label>Age</Label>
                <Input type="number" value={a.age} onChange={e => handleOccupantChange(i, "age", e.target.value)} />
          </div>
        ))}
            <h4 className="font-bold mt-6 mb-2">Personal Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Full Name</Label>
                <Input name="fullName" value={form.fullName || ""} onChange={handleChange} />
              </div>
              <div>
                <Label>Email</Label>
                <Input name="email" type="email" value={form.email || ""} onChange={handleChange} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input name="phone" value={form.phone || ""} onChange={handleChange} />
              </div>
              <div>
                <Label>Employment Company</Label>
                <Input name="employmentCompany" value={form.employmentCompany || ""} onChange={handleChange} />
              </div>
              <div>
                <Label>Job Title</Label>
                <Input name="employmentJobTitle" value={form.employmentJobTitle || ""} onChange={handleChange} />
              </div>
              <div>
                <Label>Monthly Income</Label>
                <Input name="employmentMonthlyIncome" value={form.employmentMonthlyIncome || ""} onChange={handleChange} />
              </div>
            </div>
            <h4 className="font-bold mt-6 mb-2">Current Address</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Street Address</Label>
                <Input name="currentAddress" value={form.currentAddress || ""} onChange={handleChange} />
              </div>
              <div>
                <Label>City</Label>
                <Input name="currentCity" value={form.currentCity || ""} onChange={handleChange} />
              </div>
              <div>
                <Label>Province</Label>
                <Input name="currentProvince" value={form.currentProvince || ""} onChange={handleChange} />
              </div>
              <div>
                <Label>Postal Code</Label>
                <Input name="currentPostalCode" value={form.currentPostalCode || ""} onChange={handleChange} />
        </div>
        </div>
            <h4 className="font-bold mt-6 mb-2 flex items-center gap-2">Last Two Places of Residence <Button type="button" size="icon" variant="outline" onClick={() => setVisibleResidences(prev => [...prev, Math.max(...prev) + 1])} disabled={visibleResidences.length >= 2}><Plus className="h-4 w-4" /></Button></h4>
            {visibleResidences.length === 0 ? (
              <div className="text-sm text-muted-foreground mb-4">No previous residences to add</div>
            ) : (
              visibleResidences.map((i) => (
          <div key={i} className="mb-4 p-2 border rounded">
                  <div className="flex justify-between items-center mb-2">
            <Label>Address</Label>
                    <Button type="button" size="icon" variant="outline" onClick={() => setVisibleResidences(prev => prev.filter(idx => idx !== i))}><X className="h-4 w-4" /></Button>
                  </div>
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
              ))
            )}
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
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-bold mt-8">Applicant Signatures</h4>
            <Button 
              type="button" 
              size="sm" 
              variant="outline" 
              onClick={() => checkSignatureStatus()}
              disabled={checkingSignatures}
              className="flex items-center gap-1"
            >
              <RefreshCw className={`h-4 w-4 ${checkingSignatures ? 'animate-spin' : ''}`} />
              {checkingSignatures ? "Checking..." : "Refresh All Signatures"}
            </Button>
          </div>

                      {applicants.map((a, i) => {
              const isCompleted = signatureStatuses[i] === 'completed';
              return (
              <div key={i} className="mb-4">
                <Label>{a.name ? `${a.name}'s Signature` : `Applicant ${i + 1} Signature`}</Label>
                
                {/* Show completed signature or canvas */}
                {isCompleted ? (
                  <div className="border rounded p-2 bg-green-50">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-800">Signature Completed (External)</span>
                    </div>
                    {savedSignatures[i] && (
                      <img 
                        src={savedSignatures[i]}
                        alt="Completed signature"
                        className="border rounded bg-white p-2"
                        style={{ maxWidth: '300px', maxHeight: '80px' }}
                      />
                    )}
                  </div>
                ) : (
                  <div>
                    <canvas
                      ref={el => {
                        signaturePadRefs.current[i] = el;
                        if (el) setupSignaturePad(el);
                      }}
                      width={300}
                      height={80}
                      style={{ border: '1px solid #ccc', background: '#fff', display: 'block' }}
                    />
                    <div className="text-xs text-muted-foreground mt-1">
                      Draw your signature above, or use the signing link below
                    </div>
                  </div>
                )}
                
                <div className="flex gap-2 mt-2">
                  {!isCompleted && (
                    <>
                      <Button type="button" size="sm" onClick={() => {
                        const canvas = signaturePadRefs.current[i];
                        if (canvas) {
                          const ctx = canvas.getContext("2d");
                          if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
                        }
                      }}>Clear</Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => generateSigningLink(i)}>
                        <Link className="h-4 w-4 mr-1" />
                        Generate Signing Link
                      </Button>
                    </>
                  )}
                  <Button 
                    type="button" 
                    size="sm" 
                    variant="outline" 
                    onClick={() => checkSignatureStatus(i)}
                    disabled={checkingSignatures}
                    className="flex items-center gap-1"
                  >
                    <RefreshCw className={`h-3 w-3 ${checkingSignatures ? 'animate-spin' : ''}`} />
                    {checkingSignatures ? "Checking..." : "Check Status"}
                  </Button>
                </div>
                
                {signatureLinks[i] && !isCompleted && (
                  <div className="mt-2 p-2 border rounded bg-muted/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Signing Link:</span>
                        {signatureStatuses[i] && (
                          <span className={`text-xs px-2 py-1 rounded ${
                            signatureStatuses[i] === 'completed' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {signatureStatuses[i] === 'completed' ? 'Completed' : 'Pending'}
                          </span>
                        )}
                      </div>
                      <Button 
                        type="button" 
                        size="sm" 
                        variant="outline" 
                        onClick={() => copySignatureLink(signatureLinks[i], i)}
                        className="flex items-center gap-1"
                      >
                        <Copy className="h-3 w-3" />
                        Copy
                      </Button>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground break-all">
                      {signatureLinks[i]}
                    </div>
                  </div>
                )}
                
                <div className="text-xs text-muted-foreground mb-2">
                  {isCompleted 
                    ? "Signature has been completed via external link"
                    : "You can either draw your signature directly above, or generate a signing link to share with others"
                  }
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex gap-4 mt-6">
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleSaveChanges} 
            disabled={saving}
            className="flex-1"
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
          <Button type="submit" className="flex-1" disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Application"}
          </Button>
        </div>
        {lastSaved && (
          <p className="text-sm text-muted-foreground text-center mt-2">
            Last saved: {lastSaved.toLocaleString()}
          </p>
        )}
      </form>
        </CardContent>
      </Card>
    </div>
  )
} 