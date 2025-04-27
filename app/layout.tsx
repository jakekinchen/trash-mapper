import type React from "react"
import "./globals.css"
import "./custom.css"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { Navbar } from "@/components/navbar"
import { FloatingButtons } from "@/components/floating-buttons"
import { DrawerProvider } from '@/lib/drawer-context'

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Trash Mapper ATX",
  description: "Track and report trash in your community",
  generator: 'v0.dev'
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#8FBC8F" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      </head>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} forcedTheme="light">
          <DrawerProvider>
            <Navbar />
            <main className="page-transition h-[calc(100vh-4.5rem)]">
              {children}
            </main>
            <FloatingButtons />
          </DrawerProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
