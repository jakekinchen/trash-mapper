'use client'

import Map from "@/components/map"
import { Toaster } from "@/components/ui/toaster"
import { MobileOptimizations } from "@/components/mobile-optimizations"
import { useEffect, useState, useRef } from "react"
import { supabase } from "@/lib/supabaseClient"

export default function Home() {
  const [loading, setLoading] = useState(true)
  const hasCheckedSession = useRef(false)

  useEffect(() => {
    if (hasCheckedSession.current) {
      setLoading(false)
      return
    }
    supabase.auth.getSession().then(() => {
      setLoading(false)
      hasCheckedSession.current = true
    })
  }, [])

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>

  return (
    <main className="w-full relative">
      <Map />
      <Toaster />
      <MobileOptimizations />
    </main>
  )
}
