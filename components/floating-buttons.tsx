'use client'

import React from 'react'
import { Camera, Calendar } from 'lucide-react'
import { useToast } from "@/components/ui/use-toast"

export function FloatingButtons() {
  const { toast } = useToast()
  
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
  
  return (
    <div className="fixed bottom-6 right-6 flex flex-col gap-4 z-40 floating-buttons">
      <button 
        className="w-14 h-14 rounded-full bg-[#8FBC8F] flex items-center justify-center shadow-lg hover:bg-[#6B8E6B] transition-all floating-button"
        aria-label="Take photo"
        onClick={openReportModal}
      >
        <Camera className="h-6 w-6 text-white" />
      </button>
      
      <button 
        className="w-14 h-14 rounded-full bg-[#5B7CDE] flex items-center justify-center shadow-lg hover:bg-[#4A6ABD] transition-all floating-button"
        aria-label="Schedule"
        onClick={() => {
          toast({
            title: "Coming Soon",
            description: "Cleanup events feature is under development",
          })
        }}
      >
        <Calendar className="h-6 w-6 text-white" />
      </button>
    </div>
  )
} 