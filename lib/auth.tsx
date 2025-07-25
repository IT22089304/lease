"use client"

import React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User as FirebaseUser 
} from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { auth, db } from "./firebase"
import type { User } from "../types"
import { useRouter } from "next/navigation"

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // Get additional user data from Firestore
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid))
          const userData = userDoc.data()

          if (userData) {
            setUser({
              id: firebaseUser.uid,
              email: firebaseUser.email || "",
              name: userData.name || "",
              role: userData.role || "renter",
              createdAt: userData.createdAt?.toDate() || new Date(),
              updatedAt: userData.updatedAt?.toDate() || new Date(),
            })
          }
        } else {
          setUser(null)
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [])

  const login = async (email: string, password: string) => {
    try {
      setLoading(true)
      const { user: firebaseUser } = await signInWithEmailAndPassword(auth, email, password)
      
      // Get additional user data from Firestore
      const userDoc = await getDoc(doc(db, "users", firebaseUser.uid))
      const userData = userDoc.data()

      if (!userData) {
        throw new Error("User data not found")
      }

      // Redirect based on role
      const path = userData.role === "landlord" ? "/dashboard" :
                   userData.role === "renter" ? "/renter/dashboard" :
                   userData.role === "admin" ? "/admin" : "/dashboard"
      
      router.push(path)
    } catch (error) {
      console.error("Login failed:", error)
      throw new Error("Login failed")
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      await signOut(auth)
      router.push("/login")
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }

  return <AuthContext.Provider value={{ user, login, logout, loading }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
