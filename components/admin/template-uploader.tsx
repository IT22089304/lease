"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, FileText, Download, Trash2 } from "lucide-react"
import { db } from "@/lib/firebase"
import { collection, addDoc, getDocs, serverTimestamp, query, orderBy, deleteDoc, doc } from "firebase/firestore"
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"
import { Document, Page, pdfjs } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface TemplateMeta {
  id?: string
  name: string
  type: string
  region: string
  url: string
  thumbnailUrl?: string
  uploadedAt: any
}

export function TemplateUploader() {
  const [file, setFile] = useState<File | null>(null)
  const [thumbnail, setThumbnail] = useState<File | null>(null)
  const [name, setName] = useState("")
  const [type, setType] = useState("")
  const [region, setRegion] = useState("")
  const [uploading, setUploading] = useState(false)
  const [templates, setTemplates] = useState<TemplateMeta[]>([])
  const [showForm, setShowForm] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const thumbnailInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchTemplates()
  }, [])

  async function fetchTemplates() {
    const q = query(collection(db, "pdfTemplates"), orderBy("uploadedAt", "desc"))
    const snap = await getDocs(q)
    setTemplates(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TemplateMeta)))
  }

  async function handleUpload() {
    if (!file || !name || !type || !region) return
    setUploading(true)
    try {
      const storage = getStorage()
      const storageRef = ref(storage, `pdfTemplates/${Date.now()}_${file.name}`)
      await uploadBytes(storageRef, file)
      const url = await getDownloadURL(storageRef)
      let thumbnailUrl = ""
      if (thumbnail) {
        const thumbRef = ref(storage, `pdfTemplates/thumbnails/${Date.now()}_${thumbnail.name}`)
        await uploadBytes(thumbRef, thumbnail)
        thumbnailUrl = await getDownloadURL(thumbRef)
      }
      await addDoc(collection(db, "pdfTemplates"), {
        name,
        type,
        region,
        url,
        thumbnailUrl,
        uploadedAt: serverTimestamp(),
      })
      setFile(null)
      setThumbnail(null)
      setName("")
      setType("")
      setRegion("")
      if (fileInputRef.current) fileInputRef.current.value = ""
      if (thumbnailInputRef.current) thumbnailInputRef.current.value = ""
      setShowForm(false)
      fetchTemplates()
    } catch (err) {
      alert("Upload failed: " + err)
    } finally {
      setUploading(false)
    }
  }

  function getStoragePathFromUrl(urlString: string) {
    try {
      const url = new URL(urlString);
      // Firebase Storage URLs are like: .../o/pdfTemplates%2Ffilename?alt=media&token=...
      const match = url.pathname.match(/\/o\/(.*)$/);
      if (match && match[1]) {
        return decodeURIComponent(match[1].split('?')[0]);
      }
    } catch {}
    return null;
  }

  async function handleDelete(template: TemplateMeta) {
    if (!window.confirm(`Delete template "${template.name}"?`)) return;
    try {
      const storage = getStorage();
      const storagePath = getStoragePathFromUrl(template.url);
      if (storagePath) {
        const fileRef = ref(storage, storagePath);
        await deleteObject(fileRef);
      }
      if (template.thumbnailUrl) {
        const thumbPath = getStoragePathFromUrl(template.thumbnailUrl);
        if (thumbPath) {
          const thumbRef = ref(storage, thumbPath);
          await deleteObject(thumbRef);
        }
      }
      if (template.id) {
        await deleteDoc(doc(db, "pdfTemplates", template.id));
      }
      fetchTemplates();
    } catch (err) {
      alert("Delete failed: " + err);
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload PDF Template
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="mb-4">Create Template</Button>
        )}
        {showForm && (
          <div className="grid md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Name</Label>
              <Input id="template-name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Lease Agreement" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-type">Type</Label>
              <Input id="template-type" value={type} onChange={e => setType(e.target.value)} placeholder="e.g. Lease, Notice" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-region">Region</Label>
              <Input id="template-region" value={region} onChange={e => setRegion(e.target.value)} placeholder="e.g. California" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-file">PDF File</Label>
              <Input id="template-file" type="file" accept=".pdf" ref={fileInputRef} onChange={e => setFile(e.target.files?.[0] || null)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-thumbnail">Thumbnail Image</Label>
              <Input id="template-thumbnail" type="file" accept="image/*" ref={thumbnailInputRef} onChange={e => setThumbnail(e.target.files?.[0] || null)} />
            </div>
          </div>
        )}
        {showForm && (
          <Button onClick={handleUpload} disabled={uploading || !file || !name || !type || !region} className="mt-2">
            {uploading ? "Uploading..." : "Upload"}
          </Button>
        )}
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><FileText className="h-4 w-4" /> Uploaded Templates</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map(t => (
              <Card key={t.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {t.name}
                  </CardTitle>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => handleDelete(t)}
                    title="Delete template"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  {t.thumbnailUrl && (
                    <img src={t.thumbnailUrl} alt="Thumbnail" style={{ width: 120, height: 80, objectFit: 'cover', marginBottom: 8, borderRadius: 4 }} />
                  )}
                  {/* Removed PDF preview and error message. Only image is shown. */}
                  <div className="text-sm text-muted-foreground">Type: {t.type} | Region: {t.region}</div>
                  <div className="text-xs text-muted-foreground">Uploaded: {t.uploadedAt?.toDate ? t.uploadedAt.toDate().toLocaleString() : "-"}</div>
                  <a href={t.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline text-sm">
                    <Download className="h-4 w-4" /> Download/View
                  </a>
                </CardContent>
              </Card>
            ))}
            {templates.length === 0 && (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No templates uploaded yet</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}