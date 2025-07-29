"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, Download, Eye } from "lucide-react"
import { templateService, TemplateMeta } from "@/lib/services/template-service"

interface PDFTemplateSelectorProps {
  onTemplateSelect: (template: TemplateMeta | null) => void
  selectedTemplate?: TemplateMeta | null
}

export function PDFTemplateSelector({ onTemplateSelect, selectedTemplate }: PDFTemplateSelectorProps) {
  const [templates, setTemplates] = useState<TemplateMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")

  useEffect(() => {
    fetchTemplates()
  }, [])

  async function fetchTemplates() {
    setLoading(true)
    try {
      const allTemplates = await templateService.getTemplates()
      setTemplates(allTemplates)
    } catch (error) {
      console.error("Error fetching templates:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredTemplates = templates.filter(template => {
    if (filter === "all") return true
    if (filter === "lease") return template.type.toLowerCase().includes("lease")
    if (filter === "notice") return template.type.toLowerCase().includes("notice")
    return template.type.toLowerCase().includes(filter.toLowerCase())
  })

  const handleTemplateSelect = (template: TemplateMeta) => {
    onTemplateSelect(template)
  }

  const handleClearSelection = () => {
    onTemplateSelect(null)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          <span className="font-medium">Select PDF Template</span>
        </div>
        <div className="text-sm text-muted-foreground">Loading templates...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          <span className="font-medium">Select PDF Template</span>
        </div>
        {selectedTemplate && (
          <Button variant="outline" size="sm" onClick={handleClearSelection}>
            Clear Selection
          </Button>
        )}
      </div>

      {selectedTemplate && (
        <Card className="border-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Selected Template</span>
              <Button variant="outline" size="sm" onClick={handleClearSelection}>
                Change
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-3">
              {selectedTemplate.thumbnailUrl && (
                <img 
                  src={selectedTemplate.thumbnailUrl} 
                  alt="Template thumbnail" 
                  className="w-12 h-12 object-cover rounded"
                />
              )}
              <div className="flex-1">
                <div className="font-medium text-sm">{selectedTemplate.name}</div>
                <div className="text-xs text-muted-foreground">
                  Type: {selectedTemplate.type} | Region: {selectedTemplate.region}
                </div>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" asChild>
                  <a href={selectedTemplate.url} target="_blank" rel="noopener noreferrer">
                    <Eye className="h-3 w-3" />
                  </a>
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <a href={selectedTemplate.url} download>
                    <Download className="h-3 w-3" />
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!selectedTemplate && (
        <>
          <div className="flex gap-2">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("all")}
            >
              All
            </Button>
            <Button
              variant={filter === "lease" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("lease")}
            >
              Lease
            </Button>
            <Button
              variant={filter === "notice" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("notice")}
            >
              Notice
            </Button>
          </div>

          {filteredTemplates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No templates available</p>
              <p className="text-xs">Contact an administrator to upload templates</p>
            </div>
          ) : (
            <div className="grid gap-3 max-h-64 overflow-y-auto">
              {filteredTemplates.map((template) => (
                <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      {template.thumbnailUrl && (
                        <img 
                          src={template.thumbnailUrl} 
                          alt="Template thumbnail" 
                          className="w-10 h-10 object-cover rounded"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{template.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Type: {template.type} | Region: {template.region}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" asChild>
                          <a href={template.url} target="_blank" rel="noopener noreferrer">
                            <Eye className="h-3 w-3" />
                          </a>
                        </Button>
                        <Button size="sm" variant="outline" asChild>
                          <a href={template.url} download>
                            <Download className="h-3 w-3" />
                          </a>
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={() => handleTemplateSelect(template)}
                        >
                          Select
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}