'use client'

import Map from "@/components/map"
import { Toaster } from "@/components/ui/toaster"
import { MobileOptimizations } from "@/components/mobile-optimizations"
import { useEffect, useState, useRef } from "react"
import { supabase } from "@/lib/supabaseClient"
import { isSupabaseConfigured } from "@/lib/supabaseClient"

export default function Home() {
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const hasCheckedSession = useRef(false)

  useEffect(() => {
    let cancelled = false;
    const finishLoading = () => {
      if (cancelled) return;
      setLoading(false);
      hasCheckedSession.current = true;
    };

    if (hasCheckedSession.current) {
      finishLoading()
      return
    }
    if (!isSupabaseConfigured) {
      finishLoading()
      return
    }

    const timeout = new Promise((resolve) => {
      window.setTimeout(resolve, 2500);
    });

    Promise.race([supabase.auth.getSession(), timeout])
      .then(finishLoading)
      .catch(finishLoading);

    return () => {
      cancelled = true;
    };
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
