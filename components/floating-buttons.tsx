'use client'

import React, { useEffect, useState } from 'react'
import { Camera, Calendar } from 'lucide-react'
import { useToast } from "@/components/ui/use-toast"
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { User } from '@supabase/supabase-js'
import { useDrawer } from '@/lib/drawer-context'
import { cn } from '@/lib/utils'

export function FloatingButtons() {
  const { toast } = useToast()
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const { isDrawerOpen } = useDrawer()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => {
      authListener?.subscription.unsubscribe()
    }
  }, [])
  
  const openReportModal = () => {
    // Dispatch a custom event that the map component can listen for
    const mapComponent = document.getElementById('map-component')
    
    if (mapComponent) {
      const event = new CustomEvent('openReportModal')
      mapComponent.dispatchEvent(event)
    } else {
      // Fallback if map component isn't found
      toast({
        title: "Report Feature",
        description: "Report trash feature is being set up",
      })
    }
  }

  // Only show on root page and when logged in
  if (pathname !== '/' || !user || loading) {
    return null
  }
  
  return (
    <div className={cn(
      "fixed bottom-6 right-6 flex flex-col gap-4 z-40 floating-buttons transition-opacity duration-300",
      isDrawerOpen ? "opacity-0 pointer-events-none" : "opacity-100"
    )}>
      <button 
        className="w-14 h-14 rounded-full bg-[#6a8c6a] flex items-center justify-center shadow-lg hover:bg-[#465c46] transition-all floating-button"
        aria-label="Take photo"
        onClick={openReportModal}
      >
        <Camera className="h-6 w-6 text-white" />
      </button>
      
      <button 
        className="w-14 h-14 rounded-full bg-[#5B7CDE] flex items-center justify-center shadow-lg hover:bg-[#4A6ABD] transition-all floating-button"
        aria-label="Schedule"
        onClick={() => {
          // Open the create event dialog modal directly (if on /)
          const event = new CustomEvent('openCreateEventDialog')
          window.dispatchEvent(event)
        }}
      >
        <Calendar className="h-6 w-6 text-white" />
      </button>
    </div>
  )
} 