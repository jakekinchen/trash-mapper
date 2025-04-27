"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useToast } from "@/components/ui/use-toast"
import ReportModal, { type ReportSubmitData } from "./report-modal"
import Script from "next/script"
import L, { Map as LeafletMap, Marker, LatLngTuple, Layer } from 'leaflet'
import { getAllPollutionReports } from '@/lib/reports'
import wkx from 'wkx'

// Types for our data
interface TrashBin {
  id: string
  location: [number, number] // [longitude, latitude]
  name?: string
  capacity?: string
  lastEmptied?: string
  properties?: {
    element_type?: string
    osmid?: number
    amenity?: string
    check_date?: string
    waste?: string
    bus?: string
    information?: string
    colour?: string
    covered?: string
    material?: string
    vending?: string
    operator?: string
    backrest?: string
    'source:feature'?: string
    'survey:date'?: string
    indoor?: string
    image?: string
  }
}

interface SupabaseReport {
  id: string;
  user_id: string;
  geom: string; // WKB format
  severity: number;
  created_at: string;
  image_url: string;
}

interface PollutionReport {
  id: string
  location: [number, number]
  type: "user" | "311" | "historical"
  severity: number // 1-5
  description?: string
  imageUrl?: string
  timestamp: string
}

interface GeoJSONFeature {
  type: string
  properties: {
    element_type?: string
    osmid?: number
    amenity?: string
    check_date?: string
    waste?: string
    bus?: string
    information?: string
    colour?: string
    covered?: string
    material?: string
    vending?: string
    operator?: string
    backrest?: string
    'source:feature'?: string
    'survey:date'?: string
    indoor?: string
    image?: string
  }
  geometry: {
    type: string
    coordinates: [number, number]
  }
}

interface GeoJSONData {
  type: string
  features: GeoJSONFeature[]
}

// Define a simple interface for the options used by leaflet.heat
interface SimpleHeatOptions {
  radius?: number;
  blur?: number;
  maxZoom?: number;
  gradient?: { [key: number]: string };
  minOpacity?: number; // Added based on potential usage elsewhere or defaults
}

interface LeafletWithHeat extends L.Map {
  heatLayer: (data: LatLngTuple[], options: SimpleHeatOptions) => L.Layer;
}

export default function MapComponent() {
  const { toast } = useToast()
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [trashBins, setTrashBins] = useState<TrashBin[]>([])
  const [pollutionData, setPollutionData] = useState<PollutionReport[]>([])
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [isSubmittingReport, setIsSubmittingReport] = useState(false)
  const [isSubmissionSuccess, setIsSubmissionSuccess] = useState(false)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [showTrashBins, setShowTrashBins] = useState(true)
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<LeafletMap | null>(null)
  const markersRef = useRef<Marker[]>([])
  const heatLayerRef = useRef<Layer | null>(null)

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
    const fetchTrashBins = async () => {
      try {
        const response = await fetch('/austin_trash_bins.geojson')
        const data: GeoJSONData = await response.json()
        
        // Transform GeoJSON features into TrashBin objects
        const trashBins: TrashBin[] = data.features.map((feature: GeoJSONFeature) => ({
          id: feature.properties.osmid?.toString() || Math.random().toString(),
          location: feature.geometry.coordinates,
          properties: feature.properties
        }))
        
        setTrashBins(trashBins)
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
    const fetchPollutionData = async () => {
      try {
        const reports = await getAllPollutionReports();
        
        // Transform Supabase reports into PollutionReport format
        const pollutionData: PollutionReport[] = reports.map((report: SupabaseReport) => {
          // Extract coordinates from the geom field
          let coordinates: [number, number] = [0, 0];
          if (report.geom) {
            try {
              // Parse the WKB data
              const geometry = wkx.Geometry.parse(Buffer.from(report.geom, 'hex')) as wkx.Point;
              
              if (geometry instanceof wkx.Point) {
                coordinates = [geometry.x, geometry.y];
              }
            } catch (e) {
              console.error('Error parsing geom:', e);
            }
          }
          
          return {
            id: report.id,
            location: coordinates,
            type: "user",
            severity: report.severity,
            description: "", // Add description field if needed
            imageUrl: report.image_url,
            timestamp: report.created_at,
          };
        });
        
        setPollutionData(pollutionData);
      } catch (error) {
        console.error("Error fetching pollution data:", error);
        toast({
          title: "Error",
          description: "Failed to load pollution data",
          variant: "destructive",
        });
      }
    };

    fetchPollutionData();
  }, [toast]);

  // Ensure mapLoaded is true if window.L is already available (for client navigation)
  useEffect(() => {
    if (typeof window !== "undefined" && window.L && !mapLoaded) {
      setMapLoaded(true)
    }
  }, [mapLoaded])

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

  // Helper function to handle location fallback
  const handleLocationFallback = useCallback((map: LeafletMap | null, defaultLocation: { latitude: number; longitude: number }) => {
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
  }, [toast])

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
  }, [mapLoaded, toast, handleLocationFallback])

  // Add trash bin markers
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current || !window.L || !trashBins || trashBins.length === 0) return

    try {
      const map = mapInstanceRef.current

      // Clear existing markers
      if (markersRef.current && markersRef.current.length > 0) {
        markersRef.current.forEach((marker: Marker) => {
          if (marker && marker.remove) marker.remove()
        })
      }
      markersRef.current = []

      // Only add markers if showTrashBins is true
      if (showTrashBins) {
        // Add trash bin markers
        trashBins.forEach((bin: TrashBin) => {
          if (!bin || !bin.location || bin.location.length !== 2) return

          try {
            const [longitude, latitude] = bin.location

            const trashIcon = window.L.divIcon({
              html: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" class="h-6 w-6 text-green-600"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" x2="10" y1="11" y2="17"></line><line x1="14" x2="14" y1="11" y2="17"></line></svg>`,
              className: "trash-bin-marker",
              iconSize: [24, 24],
            })

            const marker = window.L.marker([latitude, longitude], { icon: trashIcon }).addTo(map)

            marker.bindPopup(() => {
              const popupElement = document.createElement("div")
              popupElement.innerHTML = `
                <div class="p-1">
                  <h3 class="font-semibold text-base">Trash Bin</h3>
                  <div class="grid grid-cols-2 gap-x-2 text-sm mt-1">
                    ${bin.properties?.check_date ? `
                      <span class="text-muted-foreground">Last checked:</span>
                      <span>${new Date(bin.properties.check_date).toLocaleDateString()}</span>
                    ` : ''}
                    ${bin.properties?.waste ? `
                      <span class="text-muted-foreground">Type:</span>
                      <span>${bin.properties.waste}</span>
                    ` : ''}
                    ${bin.properties?.material ? `
                      <span class="text-muted-foreground">Material:</span>
                      <span>${bin.properties.material}</span>
                    ` : ''}
                    ${bin.properties?.covered ? `
                      <span class="text-muted-foreground">Covered:</span>
                      <span>${bin.properties.covered}</span>
                    ` : ''}
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
      }
    } catch (error) {
      console.error("Error adding trash bin markers:", error)
    }
  }, [mapLoaded, trashBins, showTrashBins])

  // Add pollution data
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current || !window.L || !pollutionData || pollutionData.length === 0) {
      return;
    }

    try {
      const map = mapInstanceRef.current!;

      // Add pollution markers (only showing user reports with images)
      const validReports = pollutionData.filter(
        (report: PollutionReport) =>
          report && report.type === "user" && report.imageUrl && report.location && report.location.length === 2,
      );

      validReports.forEach((report: PollutionReport) => {
        try {
          const [longitude, latitude] = report.location;

          const pollutionIcon = window.L.divIcon({
            html: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" class="h-6 w-6 text-red-500"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg>`,
            className: "pollution-marker",
            iconSize: [24, 24],
          });

          const marker = window.L.marker([latitude, longitude], { icon: pollutionIcon }).addTo(map);

          marker.bindPopup(() => {
            const popupElement = document.createElement("div");

            const getSeverityColor = (severity: number) => {
              if (severity >= 5) return "text-red-600";
              if (severity >= 3) return "text-orange-500";
              return "text-yellow-500";
            };

            const getTypeLabel = (type: string) => {
              switch (type) {
                case "user":
                  return "User Report";
                case "311":
                  return "311 Call";
                case "historical":
                  return "Historical Data";
                default:
                  return type;
              }
            };

            popupElement.innerHTML = `
              <div class="p-1 max-w-xs">
                <div class="flex justify-between items-start">
                  <h3 class="font-semibold text-base">Pollution Report</h3>
                  <span class="font-bold ${getSeverityColor(report.severity)}">${report.severity}/5</span>
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
            `;
            return popupElement;
          });

          markersRef.current.push(marker);
        } catch (error) {
          console.error("Error adding pollution marker:", error);
        }
      });

      // Create heat map data
      try {
        // Remove existing heat layer if it exists
        if (heatLayerRef.current) {
          map?.removeLayer(heatLayerRef.current);
        }

        const leafletWithHeat = window.L as unknown as LeafletWithHeat;
        if (leafletWithHeat.heatLayer) {
          // Make sure each report has valid location data
          const validReports = pollutionData.filter(
            (report: PollutionReport) => report && report.location && report.location.length === 2,
          );

          const heatData: LatLngTuple[] = validReports.map((report: PollutionReport) => {
            const [longitude, latitude] = report.location;
            return [latitude, longitude, report.severity / 5] as LatLngTuple;
          });

          if (heatData.length > 0) {
            const heatLayerOptions: SimpleHeatOptions = {
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
              minOpacity: 0.5,
            };
            const heatLayer = leafletWithHeat.heatLayer(heatData, heatLayerOptions) as L.Layer;

            heatLayer.addTo(map);
            heatLayerRef.current = heatLayer;
          }
        }
      } catch (error) {
        console.error("Error creating heat map:", error);
      }
    } catch (error) {
      console.error("Error adding pollution data:", error);
    }
  }, [mapLoaded, pollutionData]);

  const handleReportSubmit = async (data: ReportSubmitData) => {
    const reportLocation = userLocation || [-97.7431, 30.2672]; 
    const [longitude, latitude] = reportLocation;

    const formData = new FormData();
    formData.append('latitude', latitude.toString());
    formData.append('longitude', longitude.toString());
    formData.append('severity', data.severity.toString());
    
    if (data.imageFile) {
      formData.append('image', data.imageFile);
    } else {
      toast({ title: "Error", description: "No image selected.", variant: "destructive" });
      return;
    }

    setIsSubmittingReport(true);
    setIsSubmissionSuccess(false); // Reset success state initially
    try {
      const response = await fetch('/api/reports/create', {
        method: 'POST',
        body: formData, 
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit report');
      }

      // --- Success Path --- 
      setIsSubmissionSuccess(true); // Set success state immediately after successful upload

      const newReport: PollutionReport = {
        id: result.reportId,
        location: reportLocation,
        type: "user",
        severity: data.severity, // Use user's severity initially
        description: data.description, 
        imageUrl: result.imageUrl,
        timestamp: new Date().toISOString(), 
      };
      setPollutionData((prev: PollutionReport[]) => [...prev, newReport]);

      toast({
        title: "Report Submitted Successfully",
        description: "Thank you for your report! We'll analyze the severity and update it shortly.", 
      });

      // Delay closing the modal to show success state
      setTimeout(() => {
          setIsReportModalOpen(false);
          setIsSubmissionSuccess(false); // Reset success state after closing
      }, 1500); // Close after 1.5 seconds

    } catch (error) {
      console.error("Error submitting report:", error);
      setIsSubmissionSuccess(false); // Ensure success state is false on error
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit report. Please try again.",
        variant: "destructive",
      });
    } finally {
      // Reset submitting state slightly earlier than modal close for smoother transition
      setTimeout(() => setIsSubmittingReport(false), 1000);
    }
  };

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
      
      {/* Trash bin visibility toggle */}
      <div className="absolute top-4 right-4 z-10 bg-white p-2 rounded-md shadow-md">
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showTrashBins}
            onChange={(e) => setShowTrashBins(e.target.checked)}
            className="form-checkbox h-4 w-4 text-green-600"
          />
          <span className="text-sm font-medium">Show Trash Bins</span>
        </label>
      </div>
      
      {/* Report modal */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onSubmit={handleReportSubmit}
        userLocation={userLocation}
        isSubmitting={isSubmittingReport}
        isSuccess={isSubmissionSuccess}
      />

      {/* Leaflet scripts */}
      <Script
        src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
        integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
        crossOrigin=""
        onLoad={() => {
          setMapLoaded(true);
          // Load heat map script after Leaflet is loaded
          const script = document.createElement('script');
          script.src = "https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js";
          script.async = true;
          document.body.appendChild(script);
        }}
      />
    </div>
  )
}
