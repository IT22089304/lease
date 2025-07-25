"use client"

import { useState } from "react"
import { Plus, Edit, Trash2, GripVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import type { LeaseField } from "@/types"

const INITIAL_FIELDS: LeaseField[] = [
  {
    id: "1",
    name: "tenant_name",
    label: "Tenant Name",
    type: "text",
    required: true,
    order: 1,
    section: "personal",
  },
  {
    id: "2",
    name: "monthly_rent",
    label: "Monthly Rent",
    type: "number",
    required: true,
    order: 2,
    section: "financial",
  },
]

export function FieldBuilder() {
  const [fields, setFields] = useState<LeaseField[]>(INITIAL_FIELDS)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingField, setEditingField] = useState<LeaseField | null>(null)
  const [newField, setNewField] = useState<Partial<LeaseField>>({
    name: "",
    label: "",
    type: "text",
    required: false,
    options: [],
    section: "personal",
  })

  const fieldTypes = [
    { value: "text", label: "Text" },
    { value: "number", label: "Number" },
    { value: "date", label: "Date" },
    { value: "boolean", label: "Yes/No" },
    { value: "select", label: "Dropdown" },
    { value: "textarea", label: "Text Area" },
  ]

  const resetForm = () => {
    setNewField({
      name: "",
      label: "",
      type: "text",
      required: false,
      options: [],
      section: "personal",
    })
    setEditingField(null)
  }

  const handleCreateField = () => {
    if (!newField.name || !newField.label) return

    const field: LeaseField = {
      ...(newField as LeaseField),
      id: Date.now().toString(),
      order: fields.length + 1,
    }
    setFields((prev) => [...prev, field])
    setIsCreateDialogOpen(false)
    resetForm()
  }

  const handleEditField = (field: LeaseField) => {
    setEditingField(field)
    setNewField({ ...field })
    setIsCreateDialogOpen(true)
  }

  const handleUpdateField = () => {
    if (!editingField || !newField.name || !newField.label) return

    setFields((prev) => prev.map((f) => (f.id === editingField.id ? { ...(newField as LeaseField) } : f)))
    setIsCreateDialogOpen(false)
    resetForm()
  }

  const deleteField = (fieldId: string) => {
    setFields((prev) => prev.filter((f) => f.id !== fieldId))
  }

  const handleDialogClose = (open: boolean) => {
    setIsCreateDialogOpen(open)
    if (!open) {
      resetForm()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Field Builder</h2>
          <p className="text-muted-foreground">Customize form fields for lease templates</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={handleDialogClose}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Field
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingField ? "Edit Field" : "Add New Field"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="field-name">Field Name</Label>
                <Input
                  id="field-name"
                  value={newField.name || ""}
                  onChange={(e) => setNewField((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="field_name"
                />
              </div>
              <div>
                <Label htmlFor="field-label">Field Label</Label>
                <Input
                  id="field-label"
                  value={newField.label || ""}
                  onChange={(e) => setNewField((prev) => ({ ...prev, label: e.target.value }))}
                  placeholder="Field Label"
                />
              </div>
              <div>
                <Label htmlFor="field-type">Field Type</Label>
                <Select
                  value={newField.type || "text"}
                  onValueChange={(value) => setNewField((prev) => ({ ...prev, type: value as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fieldTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="required"
                  checked={newField.required || false}
                  onCheckedChange={(checked) => setNewField((prev) => ({ ...prev, required: checked as boolean }))}
                />
                <Label htmlFor="required">Required field</Label>
              </div>
              {newField.type === "select" && (
                <div>
                  <Label htmlFor="options">Options (comma-separated)</Label>
                  <Input
                    id="options"
                    value={newField.options?.join(", ") || ""}
                    onChange={(e) =>
                      setNewField((prev) => ({
                        ...prev,
                        options: e.target.value
                          .split(",")
                          .map((opt) => opt.trim())
                          .filter(Boolean),
                      }))
                    }
                    placeholder="Option 1, Option 2, Option 3"
                  />
                </div>
              )}
              <Button onClick={editingField ? handleUpdateField : handleCreateField} className="w-full">
                {editingField ? "Update Field" : "Add Field"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {fields.map((field) => (
          <Card key={field.id}>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{field.label}</h4>
                    {field.required && (
                      <span className="text-xs bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded">
                        Required
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {field.name} • {fieldTypes.find((t) => t.value === field.type)?.label}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEditField(field)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteField(field.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
