import { db } from "@/lib/firebase"
import { collection, getDocs, query, orderBy } from "firebase/firestore"

export interface TemplateMeta {
  id?: string
  name: string
  type: string
  region: string
  url: string
  thumbnailUrl?: string
  uploadedAt: any
}

export const templateService = {
  async getTemplates(): Promise<TemplateMeta[]> {
    try {
      const q = query(collection(db, "pdfTemplates"), orderBy("uploadedAt", "desc"))
      const snap = await getDocs(q)
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TemplateMeta))
    } catch (error) {
      console.error("Error fetching templates:", error)
      return []
    }
  },

  async getTemplatesByType(type: string): Promise<TemplateMeta[]> {
    try {
      const templates = await this.getTemplates()
      return templates.filter(template => template.type.toLowerCase() === type.toLowerCase())
    } catch (error) {
      console.error("Error fetching templates by type:", error)
      return []
    }
  },

  async getTemplatesByRegion(region: string): Promise<TemplateMeta[]> {
    try {
      const templates = await this.getTemplates()
      return templates.filter(template => template.region.toLowerCase() === region.toLowerCase())
    } catch (error) {
      console.error("Error fetching templates by region:", error)
      return []
    }
  }
}