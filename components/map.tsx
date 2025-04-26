"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Camera, Calendar } from "lucide-react"
import ReportModal from "./report-modal"
import { useToast } from "@/components/ui/use-toast"
import Script from "next/script"

// Types for our data
interface TrashBin {
  id: string
  location: [number, number] // [longitude, latitude]
  name: string
  capacity: string
  lastEmptied?: string
}

interface PollutionReport {
  id: string
  location: [number, number]
  type: "user" | "311" | "historical"
  severity: number // 1-10
  description?: string
  imageUrl?: string
  timestamp: string
}

export default function MapComponent() {
  const { toast } = useToast()
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [trashBins, setTrashBins] = useState<TrashBin[]>([])
  const [pollutionData, setPollutionData] = useState<PollutionReport[]>([])
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [mapLoaded, setMapLoaded] = useState(false)
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const heatLayerRef = useRef<any>(null)

  // Check if running in a mobile device
  const isMobileDevice = () => {
    if (typeof window === "undefined") return false

    return (
      window.navigator.userAgent.match(/Android/i) ||
      window.navigator.userAgent.match(/webOS/i) ||
      window.navigator.userAgent.match(/iPhone/i) ||
      window.navigator.userAgent.match(/iPad/i) ||
      window.navigator.userAgent.match(/iPod/i) ||
      window.navigator.userAgent.match(/BlackBerry/i) ||
      window.navigator.userAgent.match(/Windows Phone/i)
    )
  }

  // Fetch trash bin data
  useEffect(() => {
    // This would be an API call in a real application
    const fetchTrashBins = async () => {
      try {
        // Simulating API response - using Austin coordinates
        const mockTrashBins: TrashBin[] = [
          { id: "1", location: [-97.7431, 30.2672], name: "Downtown Bin", capacity: "High" },
          { id: "2", location: [-97.75, 30.27], name: "Park Bin", capacity: "Medium", lastEmptied: "2023-04-15" },
          {
            id: "3",
            location: [-97.74, 30.265],
            name: "Street Corner Bin",
            capacity: "Low",
            lastEmptied: "2023-04-20",
          },
        ]
        setTrashBins(mockTrashBins)
      } catch (error) {
        console.error("Error fetching trash bins:", error)
        toast({
          title: "Error",
          description: "Failed to load trash bin data",
          variant: "destructive",
        })
      }
    }

    fetchTrashBins()
  }, [toast])

  // Fetch pollution data
  useEffect(() => {
    // This would be an API call in a real application
    const fetchPollutionData = async () => {
      try {
        // Simulating API response - using Austin coordinates
        const mockPollutionData: PollutionReport[] = [
          {
            id: "1",
            location: [-97.7431, 30.2672],
            type: "311",
            severity: 8,
            description: "Illegal dumping",
            timestamp: "2023-04-10T12:00:00Z",
          },
          {
            id: "2",
            location: [-97.75, 30.27],
            type: "historical",
            severity: 5,
            description: "Recurring litter",
            timestamp: "2023-03-15T09:30:00Z",
          },
          {
            id: "3",
            location: [-97.74, 30.265],
            type: "user",
            severity: 7,
            description: "Plastic waste",
            imageUrl: "/placeholder.svg?height=200&width=200",
            timestamp: "2023-04-18T15:45:00Z",
          },
        ]
        setPollutionData(mockPollutionData)
      } catch (error) {
        console.error("Error fetching pollution data:", error)
        toast({
          title: "Error",
          description: "Failed to load pollution data",
          variant: "destructive",
        })
      }
    }

    fetchPollutionData()
  }, [toast])

  // Initialize map after scripts are loaded
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !window.L) return

    try {
      // Initialize the map with default view (will be updated if geolocation succeeds)
      const map = window.L.map(mapRef.current, {
        attributionControl: false, // Move attribution to a less prominent place on mobile
        zoomControl: false, // We'll add zoom controls in a better position for mobile
      }).setView([30.2672, -97.7431], 13)
      mapInstanceRef.current = map

      // Add custom positioned zoom controls that work better on mobile
      window.L.control
        .zoom({
          position: "bottomright",
        })
        .addTo(map)

      // Add attribution in a better position for mobile
      window.L.control
        .attribution({
          position: "bottomleft",
        })
        .addTo(map)

      // Add tile layer (OpenStreetMap)
      window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map)

      if (isMobileDevice()) {
        // Disable map dragging on mobile when interacting with popups
        map.on("popupopen", () => {
          if (map && map.dragging) map.dragging.disable()
        })

        map.on("popupclose", () => {
          if (map && map.dragging) map.dragging.enable()
        })
      }
    } catch (error) {
      console.error("Error initializing map:", error)
      toast({
        title: "Map Error",
        description: "Failed to initialize the map. Please try refreshing the page.",
        variant: "destructive",
      })
    }

    // Cleanup function
    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove()
        } catch (error) {
          console.error("Error cleaning up map:", error)
        }
      }
    }
  }, [mapLoaded, toast])

  // Get user's location with better error handling
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current || !window.L) return

    try {
      const map = mapInstanceRef.current

      // Default location (Austin, Texas) as fallback
      const defaultLocation = { latitude: 30.2672, longitude: -97.7431 }

      // Try to get user location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            try {
              const { longitude, latitude } = position.coords
              setUserLocation([longitude, latitude])

              if (map && map.setView) {
                map.setView([latitude, longitude], 15)

                // Add user location marker
                const userIcon = window.L.divIcon({
                  html: `<div class="relative flex h-8 w-8 items-center justify-center">
                          <div class="absolute h-4 w-4 rounded-full bg-blue-500 animate-ping"></div>
                          <div class="absolute h-4 w-4 rounded-full bg-blue-500"></div>
                        </div>`,
                  className: "user-location-marker",
                })

                window.L.marker([latitude, longitude], { icon: userIcon }).addTo(map)
              }

              toast({
                title: "Location Found",
                description: "Using your current location",
              })
            } catch (error) {
              console.error("Error setting user location:", error)
              // Fall back to default location
              handleLocationFallback(map, defaultLocation)
            }
          },
          (error) => {
            console.error("Error getting location:", error)
            // Use default location instead
            handleLocationFallback(map, defaultLocation)
          },
          { timeout: 10000, enableHighAccuracy: true },
        )
      } else {
        // Browser doesn't support geolocation
        handleLocationFallback(map, defaultLocation)
      }
    } catch (error) {
      console.error("Error in geolocation effect:", error)
    }
  }, [mapLoaded, toast])

  // Helper function to handle location fallback
  const handleLocationFallback = (map: any, defaultLocation: { latitude: number; longitude: number }) => {
    try {
      setUserLocation([defaultLocation.longitude, defaultLocation.latitude])

      if (map && map.setView) {
        map.setView([defaultLocation.latitude, defaultLocation.longitude], 12)
      }

      toast({
        title: "Using Default Location",
        description: "Using Austin, Texas as the default location.",
        variant: "warning",
      })
    } catch (error) {
      console.error("Error in location fallback:", error)
    }
  }

  // Add trash bin markers
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current || !window.L || !trashBins || trashBins.length === 0) return

    try {
      const map = mapInstanceRef.current

      // Clear existing markers
      if (markersRef.current && markersRef.current.length > 0) {
        markersRef.current.forEach((marker) => {
          if (marker && marker.remove) marker.remove()
        })
      }
      markersRef.current = []

      // Add trash bin markers
      trashBins.forEach((bin) => {
        if (!bin || !bin.location || bin.location.length !== 2) return

        try {
          const [longitude, latitude] = bin.location

          const trashIcon = window.L.divIcon({
            html: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" class="h-6 w-6 text-green-600"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" x2="10" y1="11" y2="17"></line><line x1="14" x2="14" y1="11" y2="17"></line></svg>`,
            className: "trash-bin-marker",
          })

          const marker = window.L.marker([latitude, longitude], { icon: trashIcon }).addTo(map)

          marker.bindPopup(() => {
            const popupElement = document.createElement("div")
            popupElement.innerHTML = `
              <div class="p-1">
                <h3 class="font-semibold text-base">${bin.name || "Trash Bin"}</h3>
                <div class="grid grid-cols-2 gap-x-2 text-sm mt-1">
                  <span class="text-muted-foreground">Capacity:</span>
                  <span>${bin.capacity || "Unknown"}</span>
                  ${
                    bin.lastEmptied
                      ? `
                    <span class="text-muted-foreground">Last emptied:</span>
                    <span>${new Date(bin.lastEmptied).toLocaleDateString()}</span>
                  `
                      : ""
                  }
                  <span class="text-muted-foreground">Coordinates:</span>
                  <span class="text-xs">${latitude.toFixed(6)}, ${longitude.toFixed(6)}</span>
                </div>
              </div>
            `
            return popupElement
          })

          markersRef.current.push(marker)
        } catch (error) {
          console.error("Error adding trash bin marker:", error)
        }
      })
    } catch (error) {
      console.error("Error adding trash bin markers:", error)
    }
  }, [mapLoaded, trashBins])

  // Add pollution data
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current || !window.L || !pollutionData || pollutionData.length === 0) return

    try {
      const map = mapInstanceRef.current

      // Add pollution markers (only showing user reports with images)
      pollutionData
        .filter(
          (report) =>
            report && report.type === "user" && report.imageUrl && report.location && report.location.length === 2,
        )
        .forEach((report) => {
          try {
            const [longitude, latitude] = report.location

            const pollutionIcon = window.L.divIcon({
              html: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" class="h-6 w-6 text-red-500"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg>`,
              className: "pollution-marker",
            })

            const marker = window.L.marker([latitude, longitude], { icon: pollutionIcon }).addTo(map)

            marker.bindPopup(() => {
              const popupElement = document.createElement("div")

              const getSeverityColor = (severity: number) => {
                if (severity >= 8) return "text-red-600"
                if (severity >= 5) return "text-orange-500"
                return "text-yellow-500"
              }

              const getTypeLabel = (type: string) => {
                switch (type) {
                  case "user":
                    return "User Report"
                  case "311":
                    return "311 Call"
                  case "historical":
                    return "Historical Data"
                  default:
                    return type
                }
              }

              popupElement.innerHTML = `
                <div class="p-1 max-w-xs">
                  <div class="flex justify-between items-start">
                    <h3 class="font-semibold text-base">Pollution Report</h3>
                    <span class="font-bold ${getSeverityColor(report.severity)}">${report.severity}/10</span>
                  </div>
                  ${
                    report.imageUrl
                      ? `
                    <img src="${report.imageUrl}" alt="Pollution" class="w-full h-32 object-cover rounded-md my-2" />
                  `
                      : ""
                  }
                  <div class="grid gap-1 text-sm mt-1">
                    ${report.description ? `<p>${report.description}</p>` : ""}
                    <div class="grid grid-cols-2 gap-x-2 mt-1">
                      <span class="text-muted-foreground">Source:</span>
                      <span>${getTypeLabel(report.type)}</span>
                      <span class="text-muted-foreground">Reported:</span>
                      <span>${new Date(report.timestamp).toLocaleDateString()}</span>
                      <span class="text-muted-foreground">Coordinates:</span>
                      <span class="text-xs">${latitude.toFixed(6)}, ${longitude.toFixed(6)}</span>
                    </div>
                  </div>
                </div>
              `
              return popupElement
            })

            markersRef.current.push(marker)
          } catch (error) {
            console.error("Error adding pollution marker:", error)
          }
        })

      // Create heat map data
      try {
        // Remove existing heat layer if it exists
        if (heatLayerRef.current) {
          map.removeLayer(heatLayerRef.current)
        }

        if (window.L.heatLayer) {
          // Make sure each report has valid location data
          const validReports = pollutionData.filter(
            (report) => report && report.location && report.location.length === 2,
          )

          const heatData = validReports.map((report) => {
            const [longitude, latitude] = report.location
            return [latitude, longitude, report.severity / 10]
          })

          if (heatData.length > 0) {
            const heatLayer = window.L.heatLayer(heatData, {
              radius: 25,
              blur: 15,
              maxZoom: 17,
              gradient: {
                0.4: "blue",
                0.6: "cyan",
                0.7: "lime",
                0.8: "yellow",
                1.0: "red",
              },
            })

            heatLayer.addTo(map)
            heatLayerRef.current = heatLayer
          }
        }
      } catch (error) {
        console.error("Error creating heat map:", error)
      }
    } catch (error) {
      console.error("Error adding pollution data:", error)
    }
  }, [mapLoaded, pollutionData])

  const handleReportSubmit = (data: any) => {
    try {
      // In a real app, this would send data to your backend
      console.log("Report submitted:", data)

      // Add the new report to our local state
      const reportLocation = userLocation || [-97.7431, 30.2672] // Use default Austin coordinates if no location

      const newReport: PollutionReport = {
        id: `user-${Date.now()}`,
        location: reportLocation,
        type: "user",
        severity: data.severity,
        description: data.description,
        imageUrl: data.imageUrl,
        timestamp: new Date().toISOString(),
      }

      setPollutionData((prev) => [...prev, newReport])

      toast({
        title: "Report Submitted",
        description: "Thank you for helping keep our community clean!",
      })

      setIsReportModalOpen(false)
    } catch (error) {
      console.error("Error submitting report:", error)
      toast({
        title: "Error",
        description: "Failed to submit report. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Add event listener for custom openReportModal event
  useEffect(() => {
    const mapComponent = document.getElementById('map-component')
    
    const handleOpenReportModal = () => {
      setIsReportModalOpen(true)
    }
    
    if (mapComponent) {
      mapComponent.addEventListener('openReportModal', handleOpenReportModal)
    }
    
    return () => {
      if (mapComponent) {
        mapComponent.removeEventListener('openReportModal', handleOpenReportModal)
      }
    }
  }, [])

  return (
    <div className="relative w-full h-full" id="map-component">
      <div ref={mapRef} className="w-full h-full z-0" />
      
      {/* Report modal */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onSubmit={handleReportSubmit}
        userLocation={userLocation}
      />

      {/* Leaflet scripts */}
      <Script
        src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
        integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
        crossOrigin=""
        onLoad={() => setMapLoaded(true)}
      />
      <Script src="https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js" onLoad={() => {}} />
    </div>
  )
}
