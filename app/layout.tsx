import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { AuthProvider } from "@/lib/auth"
import { Header } from "@/components/layout/header"
import { ThemeProvider } from "@/components/theme-provider"
import { ClientProvider } from "@/components/client-provider"

export const metadata: Metadata = {
  title: "PropertyManager - Simplify Property Management",
  description: "A comprehensive property management platform for landlords and renters",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <ClientProvider>
          <AuthProvider>
            <div className="min-h-screen bg-background">
              <Header />
              <main>{children}</main>
            </div>
          </AuthProvider>
          </ClientProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
