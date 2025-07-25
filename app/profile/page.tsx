"use client"

import { useAuth } from "@/lib/auth"
import { useEffect, useState } from "react"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default function ProfilePage() {
  const { user, logout } = useAuth()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [form, setForm] = useState({ name: "", avatar: "" })

  useEffect(() => {
    if (!user) return
    const fetchProfile = async () => {
      const docRef = doc(db, "users", user.id)
      const docSnap = await getDoc(docRef)
      if (docSnap.exists()) {
        setProfile(docSnap.data())
        setForm({ name: docSnap.data().name || "", avatar: docSnap.data().avatar || "" })
      } else {
        setProfile(user)
        setForm({ name: user.name || "", avatar: "" })
      }
      setLoading(false)
    }
    fetchProfile()
  }, [user])

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSave = async () => {
    if (!user) return
    const docRef = doc(db, "users", user.id)
    await setDoc(docRef, { name: form.name, avatar: form.avatar }, { merge: true })
    setProfile((prev: any) => ({ ...prev, name: form.name, avatar: form.avatar }))
    setEditMode(false)
  }

  if (!user) {
    return <div className="container mx-auto p-6">You must be logged in to view your profile.</div>
  }

  if (loading) {
    return <div className="container mx-auto p-6">Loading...</div>
  }

  return (
    <div className="container mx-auto p-6 max-w-xl">
      <h1 className="text-2xl font-bold mb-6">Profile</h1>
      <div className="bg-card rounded-lg shadow p-6 flex flex-col items-center space-y-6">
        <Avatar className="h-20 w-20">
          <AvatarImage src={form.avatar || "/placeholder.svg?height=80&width=80"} alt={form.name} />
          <AvatarFallback>{form.name.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="w-full space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium">Name:</span>
            {editMode ? (
              <input name="name" value={form.name} onChange={handleChange} className="input w-40" />
            ) : (
              <span>{profile.name}</span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium">Email:</span>
            <span>{user.email}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium">Role:</span>
            <span className="capitalize">{user.role}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium">Avatar URL:</span>
            {editMode ? (
              <input name="avatar" value={form.avatar} onChange={handleChange} className="input w-40" />
            ) : (
              <span className="truncate max-w-xs">{profile.avatar || "-"}</span>
            )}
          </div>
        </div>
        {editMode ? (
          <div className="flex gap-2 w-full">
            <Button variant="default" className="flex-1" onClick={handleSave}>Save</Button>
            <Button variant="outline" className="flex-1" onClick={() => setEditMode(false)}>Cancel</Button>
          </div>
        ) : (
          <Button variant="outline" className="mt-4 w-full" onClick={() => setEditMode(true)}>
            Edit Profile
          </Button>
        )}
        <Button variant="outline" className="mt-4 w-full" onClick={logout}>
          Log Out
        </Button>
      </div>
    </div>
  )
} 