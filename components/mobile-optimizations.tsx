"use client"

import { useEffect } from "react"

export function MobileOptimizations() {
  useEffect(() => {
    try {
      // Prevent pinch zoom on mobile devices
      const preventZoom = (e: TouchEvent) => {
        if (e.touches && e.touches.length > 1) {
          e.preventDefault()
        }
      }

      // Prevent double-tap zoom on mobile
      let lastTouchEnd = 0
      const preventDoubleTapZoom = (e: TouchEvent) => {
        if (!e) return

        const now = Date.now()
        if (now - lastTouchEnd < 300) {
          e.preventDefault()
        }
        lastTouchEnd = now
      }

      // Add event listeners safely
      document.addEventListener("touchmove", preventZoom, { passive: false })
      document.addEventListener("touchend", preventDoubleTapZoom, { passive: false })

      // Clean up
      return () => {
        document.removeEventListener("touchmove", preventZoom)
        document.removeEventListener("touchend", preventDoubleTapZoom)
      }
    } catch (error) {
      console.error("Error setting up mobile optimizations:", error)
    }
  }, [])

  return null
}
