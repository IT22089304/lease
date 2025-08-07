"use client"

import { useState } from "react"
// import { PDFFiller } from "@/components/pdf/pdf-filler"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, Upload, Download, Save } from "lucide-react"

export default function DocumentsPage() {
  const [savedForms, setSavedForms] = useState<any[]>([])

  const handleSaveForm = (formData: any) => {
    const newForm = {
      id: Date.now(),
      name: `Form ${savedForms.length + 1}`,
      data: formData,
      savedAt: new Date().toISOString()
    }
    setSavedForms(prev => [...prev, newForm])
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Documents</h1>
        <p className="text-muted-foreground">
          Upload and fill PDF forms for your properties
        </p>
      </div>

      <Tabs defaultValue="fill" className="space-y-6">
        <TabsList>
          <TabsTrigger value="fill" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Fill PDF
          </TabsTrigger>
          <TabsTrigger value="saved" className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            Saved Forms
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fill" className="space-y-6">
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>PDF Filler temporarily disabled for deployment</p>
            <p className="text-sm mt-2">This feature will be available after deployment</p>
          </div>
        </TabsContent>

        <TabsContent value="saved" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {savedForms.map((form) => (
              <Card key={form.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {form.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    Saved: {new Date(form.savedAt).toLocaleDateString()}
                  </div>
                  <div className="text-sm">
                    Fields: {Object.keys(form.data).length}
                  </div>
                  <div className="flex gap-2">
                    <button className="text-sm text-primary hover:underline">
                      View Data
                    </button>
                    <button className="text-sm text-primary hover:underline">
                      Download
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {savedForms.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                <Save className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No saved forms yet</p>
                <p className="text-sm mt-2">Fill and save a PDF form to see it here</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Lease Agreement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Standard lease agreement template
                </p>
                <button className="text-sm text-primary hover:underline">
                  Download Template
                </button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Property Inspection
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Property inspection checklist
                </p>
                <button className="text-sm text-primary hover:underline">
                  Download Template
                </button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Notice to Quit
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Legal notice template
                </p>
                <button className="text-sm text-primary hover:underline">
                  Download Template
                </button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
} 