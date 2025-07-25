"use client"

import { useState } from "react"
import { Plus, Edit, Trash2, Copy, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LocationSelector } from "@/components/ui/location-selector"
import { LOCATIONS } from "@/types/locations"
import type { LeaseTemplate } from "@/types"

// Mock templates data
const INITIAL_TEMPLATES: LeaseTemplate[] = [
  {
    id: "1",
    region: "california",
    country: "US",
    state: "CA",
    fields: [
      {
        id: "1",
        name: "tenant_name",
        label: "Tenant Full Name",
        type: "text",
        required: true,
        order: 1,
        section: "personal",
      },
      {
        id: "2",
        name: "monthly_rent",
        label: "Monthly Rent Amount",
        type: "number",
        required: true,
        order: 2,
        section: "financial",
      },
      {
        id: "3",
        name: "security_deposit",
        label: "Security Deposit",
        type: "number",
        required: true,
        order: 3,
        section: "financial",
        helpText: "Maximum 2 months rent in California",
      },
    ],
    createdBy: "admin",
    version: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "2",
    region: "texas",
    country: "US",
    state: "TX",
    fields: [
      {
        id: "1",
        name: "tenant_name",
        label: "Tenant Full Name",
        type: "text",
        required: true,
        order: 1,
        section: "personal",
      },
      {
        id: "2",
        name: "monthly_rent",
        label: "Monthly Rent Amount",
        type: "number",
        required: true,
        order: 2,
        section: "financial",
      },
    ],
    createdBy: "admin",
    version: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

export function RegionalTemplates() {
  const [templates, setTemplates] = useState<LeaseTemplate[]>(INITIAL_TEMPLATES)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newTemplate, setNewTemplate] = useState({
    country: "",
    state: "",
    baseTemplate: "",
  })

  const handleCreateTemplate = () => {
    const selectedCountry = LOCATIONS.find((c) => c.code === newTemplate.country)
    const selectedState = selectedCountry?.states.find((s) => s.code === newTemplate.state)

    if (!selectedCountry || !selectedState) return

    const template: LeaseTemplate = {
      id: Date.now().toString(),
      region: `${selectedState.name.toLowerCase().replace(/\s+/g, "_")}_${selectedCountry.code.toLowerCase()}`,
      country: newTemplate.country,
      state: newTemplate.state,
      fields: [],
      createdBy: "admin",
      version: 1,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    setTemplates((prev) => [...prev, template])
    setIsCreateDialogOpen(false)
    setNewTemplate({ country: "", state: "", baseTemplate: "" })
  }

  const toggleTemplateStatus = (templateId: string) => {
    setTemplates((prev) => prev.map((t) => (t.id === templateId ? { ...t, isActive: !t.isActive } : t)))
  }

  const deleteTemplate = (templateId: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== templateId))
  }

  const getRegionLabel = (template: LeaseTemplate) => {
    const country = LOCATIONS.find((c) => c.code === template.country)
    const state = country?.states.find((s) => s.code === template.state)
    return `${state?.name || template.state}, ${country?.name || template.country}`
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold">Regional Lease Templates</h2>
          <p className="text-lg text-muted-foreground">Manage lease templates for different states and provinces</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Regional Template</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <LocationSelector
                country={newTemplate.country}
                state={newTemplate.state}
                onCountryChange={(country) => setNewTemplate((prev) => ({ ...prev, country }))}
                onStateChange={(state) => setNewTemplate((prev) => ({ ...prev, state }))}
                required
              />
              <div>
                <Label htmlFor="base-template">Base Template (Optional)</Label>
                <Select
                  value={newTemplate.baseTemplate}
                  onValueChange={(value) => setNewTemplate((prev) => ({ ...prev, baseTemplate: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Start from scratch or copy existing template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Start from scratch</SelectItem>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {getRegionLabel(template)} Template
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleCreateTemplate}
                className="w-full"
                size="lg"
                disabled={!newTemplate.country || !newTemplate.state}
              >
                Create Template
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <Card key={template.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <CardTitle className="text-xl">{getRegionLabel(template)}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant={template.isActive ? "default" : "secondary"}>
                      {template.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <Badge variant="outline">v{template.version}</Badge>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Fields:</span>
                  <p className="font-medium">{template.fields.length}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Sections:</span>
                  <p className="font-medium">{new Set(template.fields.map((f) => f.section)).size}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Last Updated:</span>
                  <p className="font-medium">{template.updatedAt.toLocaleDateString()}</p>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Fields
                </Button>
                <Button variant="outline" size="sm">
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => toggleTemplateStatus(template.id)}>
                  {template.isActive ? "Disable" : "Enable"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteTemplate(template.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {templates.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No templates created yet</h3>
            <p className="text-muted-foreground mb-6">
              Create region-specific lease templates to ensure compliance with local laws
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Template
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
