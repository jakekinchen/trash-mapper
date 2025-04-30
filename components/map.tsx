"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useToast } from "@/components/ui/use-toast"
import ReportModal, { type ReportSubmitData } from "./report-modal"
import Script from "next/script"
import L, { Map as LeafletMap, Marker, LatLngTuple, Layer } from 'leaflet'
import { getAllPollutionReports } from '@/lib/reports'
import wkx from 'wkx'
import { Filter } from 'lucide-react'
import { ALT_HEATMAP_GRADIENT } from './heatmap-palettes'

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
  is_valid_environment: boolean;
}

interface PollutionReport {
  id: string
  location: [number, number]
  type: "user" | "311" | "historical"
  severity: number // 1-5
  description?: string
  imageUrl?: string
  timestamp: string
  cleaned_up: boolean
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

// Add new interface for 311 API response
interface Austin311Report {
  sr_type_desc: string;
  sr_created_date: string;
  sr_closed_date: string | null;
  sr_location_lat: string;
  sr_location_long: string;
  sr_location_lat_long: string;
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
  const [showTrashBins, setShowTrashBins] = useState(false)
  const [showPollutionMarkers, setShowPollutionMarkers] = useState(true)
  const [show311Data, setShow311Data] = useState(true)
  const [currentZoom, setCurrentZoom] = useState(13)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [useAltHeatmapPalette] = useState(true)
  const [validationError, setValidationError] = useState<string | null>(null)
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<LeafletMap | null>(null)
  const trashBinMarkersRef = useRef<Marker[]>([])
  const pollutionMarkersRef = useRef<Marker[]>([])
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

  // Fetch pollution data and 311 data
  useEffect(() => {
    const fetchAllPollutionData = async () => {
      try {
        // Fetch user reports from Supabase
        const reports = await getAllPollutionReports();
        
        // Filter out reports with is_valid_environment === false (defensive, in case API changes)
        const validReports = Array.isArray(reports)
          ? reports.filter((report: SupabaseReport) => report.is_valid_environment !== false)
          : [];
        
        // Transform Supabase reports into PollutionReport format
        const userReports: PollutionReport[] = validReports.map((report: SupabaseReport) => {
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
            cleaned_up: false,
          };
        });

        // Fetch 311 data
        // Calculate 1 month ago from now in ISO string
        const now = new Date();
        const oneMonthAgo = new Date(now);
        oneMonthAgo.setMonth(now.getMonth() - 1);
        const isoOneMonthAgo = oneMonthAgo.toISOString().split(".")[0]; // Remove milliseconds for query
        const isoNow = now.toISOString().split(".")[0];
        
        const query =
          'SELECT%0A%20%20%60sr_type_desc%60%2C%0A%20%20%60sr_created_date%60%2C%0A%20%20%60sr_closed_date%60%2C%0A%20%20%60sr_location_lat%60%2C%0A%20%20%60sr_location_long%60%2C%0A%20%20%60sr_location_lat_long%60%0AWHERE%0A%20%20caseless_one_of(%0A%20%20%20%20%60sr_type_desc%60%2C%0A%20%20%20%20%22ARR%20-%20Street%20Sweeping%22%2C%0A%20%20%20%20%22ARR%20Street%20Sweeping%22%2C%0A%20%20%20%20%22ZZZ%20ARR%20Street%20Sweeping%22%2C%0A%20%20%20%20%22Debris%20in%20Street%22%2C%0A%20%20%20%20%22Zz_ARR%20-%20Storm%20Debris%20Collection%22%2C%0A%20%20%20%20%22TPW%20-%20Debris%20in%20Street%22%2C%0A%20%20%20%20%22SBO%20-%20Debris%20in%20Street%22%2C%0A%20%20%20%20%22Town%20Lake%20Debris%20Issues%22%2C%0A%20%20%20%20%22ZZ%20ARR%20-%20Storm%20Debris%20Collection%22%2C%0A%20%20%20%20%22ARR%20-%20Storm%20Debris%20Collection%22%2C%0A%20%20%20%20%22ARR%20-%20Collection%20Truck%20Spillage%22%2C%0A%20%20%20%20%22ARR%20-%20Spillage%20Trash%2FFluids%22%2C%0A%20%20%20%20%22Roadway%20Spillage%22%2C%0A%20%20%20%20%22SBO%20-%20Roadway%20Spillage%22%2C%0A%20%20%20%20%22TPW%20-%20Roadway%20Spillage%22%0A%20%20)%0A%20%20AND%20%60sr_closed_date%60%20IS%20NULL%0A%20%20AND%20(%60sr_created_date%60%20%3E%20%22' +
          encodeURIComponent(isoOneMonthAgo) +
          '%22%20%3A%3A%20floating_timestamp%20AND%20%60sr_created_date%60%20%3C%20%22' +
          encodeURIComponent(isoNow) + '%22%20%3A%3A%20floating_timestamp)';
        const url = `https://data.austintexas.gov/resource/xwdj-i9he.json?$query=${query}`;
        const response = await fetch(url);
        const data: Austin311Report[] = await response.json();
        
        const new311Reports: PollutionReport[] = data
          .filter(report => {
            const lat = parseFloat(report.sr_location_lat);
            const lon = parseFloat(report.sr_location_long);
            return !isNaN(lat) && !isNaN(lon) && lat !== 0 && lon !== 0;
          })
          .map((report) => ({
            id: `311-${report.sr_created_date}-${report.sr_location_lat}-${report.sr_location_long}`,
            location: [parseFloat(report.sr_location_long), parseFloat(report.sr_location_lat)],
            type: "311" as const,
            severity: 3, // Default severity for 311 reports
            timestamp: report.sr_created_date,
            cleaned_up: false,
            description: report.sr_type_desc
          }));
        
        // Combine both data sources
        setPollutionData([...userReports, ...new311Reports]);
      } catch (error) {
        console.error("Error fetching pollution data:", error);
        toast({
          title: "Error",
          description: "Failed to load pollution data",
          variant: "destructive",
        });
      }
    };

    fetchAllPollutionData();
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

      // Add zoom level change listener
      map.on('zoomend', () => {
        setCurrentZoom(map.getZoom())
      })

      // Add custom positioned zoom controls that work better on mobile
      window.L.control
        .zoom({
          position: "bottomleft",
        })
        .addTo(map)

      // Add attribution in a better position for mobile
      window.L.control
        .attribution({
          position: "bottomright",
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

      // Clear existing trash bin markers
      if (trashBinMarkersRef.current && trashBinMarkersRef.current.length > 0) {
        trashBinMarkersRef.current.forEach((marker: Marker) => {
          if (marker && marker.remove) marker.remove()
        })
      }
      trashBinMarkersRef.current = []

      // Only add markers if showTrashBins is true and zoom level is appropriate
      if (showTrashBins && currentZoom >= 14) {
        // Add trash bin markers
        trashBins.forEach((bin: TrashBin) => {
          if (!bin || !bin.location || bin.location.length !== 2) return

          try {
            const [longitude, latitude] = bin.location

            const trashIcon = window.L.divIcon({
              html: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" x2="10" y1="11" y2="17"></line><line x1="14" x2="14" y1="11" y2="17"></line></svg>`,
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

            trashBinMarkersRef.current.push(marker)
          } catch (error) {
            console.error("Error adding trash bin marker:", error)
          }
        })
      }
    } catch (error) {
      console.error("Error adding trash bin markers:", error)
    }
  }, [mapLoaded, trashBins, showTrashBins, currentZoom])

  // Add pollution data
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current || !window.L || !pollutionData || pollutionData.length === 0) {
      return;
    }

    try {
      const map = mapInstanceRef.current!;

      // Clear existing pollution markers
      if (pollutionMarkersRef.current && pollutionMarkersRef.current.length > 0) {
        pollutionMarkersRef.current.forEach((marker: Marker) => {
          if (marker && marker.remove) marker.remove()
        })
      }
      pollutionMarkersRef.current = []

      // Only add markers if showPollutionMarkers is true and zoom level is appropriate
      if (showPollutionMarkers && currentZoom >= 13) {
        // Add pollution markers (showing user reports with images and 311 reports)
        const validReports = pollutionData.filter(
          (report: PollutionReport) =>
            report && 
            report.location && 
            report.location.length === 2 &&
            ((report.type === "user" && report.imageUrl) || (report.type === "311" && show311Data))
        );

        validReports.forEach((report: PollutionReport) => {
          try {
            const [longitude, latitude] = report.location;

            const pollutionIcon = window.L.divIcon({
              html: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${report.type === "311" ? "#10B981" : (report.type === "user" ? "#BF5700" : "#3b82f6")}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6 ${report.type === "311" ? "text-emerald-500" : (report.type === "user" ? "text-[#BF5700]" : "text-blue-500")}""><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg>`,
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
                <div class="p-2 max-w-xs">
                  <div class="flex justify-between items-start mb-2">
                    <h3 class="font-semibold text-base">Pollution Report</h3>
                    <div class="flex items-center gap-2">
                      ${report.cleaned_up ? `
                        <span class="text-green-600 text-sm font-medium">Cleaned Up</span>
                      ` : ''}
                      <span class="font-bold ${getSeverityColor(report.severity)}">${report.severity}/5</span>
                    </div>
                  </div>
                  ${
                    report.imageUrl
                      ? `
                    <div class="mb-2">
                      <img src="${report.imageUrl}" alt="Pollution" class="w-full h-32 object-cover rounded-md" />
                    </div>
                  `
                      : ""
                  }
                  <div class="space-y-1.5">
                    ${report.description ? `
                      <div class="text-sm">
                        <p>${report.description}</p>
                      </div>
                    ` : ""}
                    <div class="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                      <span class="text-muted-foreground">Source:</span>
                      <span>${getTypeLabel(report.type)}</span>
                      <span class="text-muted-foreground">Reported:</span>
                      <span>${new Date(report.timestamp).toLocaleDateString()}</span>
                      <span class="text-muted-foreground">Coords:</span>
                      <span class="text-xs">${latitude.toFixed(6)}, ${longitude.toFixed(6)}</span>
                    </div>
                  </div>
                  ${report.type === "user" ? `
                    <button class="delete-report-btn mt-3 w-full bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded transition" data-report-id="${report.id}">Delete Report</button>
                  ` : ''}
                </div>
              `;

              // Add event listener for delete button (after popup is opened)
              setTimeout(() => {
                const btn = popupElement.querySelector('.delete-report-btn') as HTMLButtonElement | null;
                if (btn) {
                  btn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    btn.textContent = 'Deleting...';
                    btn.disabled = true;
                    try {
                      const res = await fetch('/api/reports/delete', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ reportId: report.id })
                      });
                      const result = await res.json();
                      if (!res.ok) throw new Error(result.error || 'Failed to delete');
                      // Remove marker from map and update state
                      marker.remove();
                      setPollutionData((prev: PollutionReport[]) => prev.filter(r => r.id !== report.id));
                      toast({ title: 'Report deleted', description: 'Your report was removed.', variant: 'default' });
                    } catch (err) {
                      btn.textContent = 'Delete Report';
                      btn.disabled = false;
                      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to delete', variant: 'destructive' });
                    }
                  });
                }
              }, 0);
              return popupElement;
            });

            pollutionMarkersRef.current.push(marker);
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
              (report: PollutionReport) => 
                report && 
                report.location && 
                report.location.length === 2 &&
                !isNaN(report.location[0]) && 
                !isNaN(report.location[1]) &&
                report.location[0] !== 0 && 
                report.location[1] !== 0
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
                gradient: useAltHeatmapPalette ? ALT_HEATMAP_GRADIENT : {
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
      }
    } catch (error) {
      console.error("Error adding pollution data:", error);
    }
  }, [mapLoaded, pollutionData, showPollutionMarkers, show311Data, currentZoom, useAltHeatmapPalette]);

  const handleReportSubmit = async (data: ReportSubmitData) => {
    setValidationError(null);
    const reportLocation = userLocation || [-97.7431, 30.2672]; 
    const [longitude, latitude] = reportLocation;

    const formData = new FormData();
    formData.append('latitude', latitude.toString());
    formData.append('longitude', longitude.toString());
    formData.append('severity', data.severity.toString());
    
    if (data.imageFile) {
      formData.append('image', data.imageFile);
    } else {
      // This validation remains client-side
      toast({ title: "Error", description: "No image selected.", variant: "destructive" });
      return;
    }

    setIsSubmittingReport(true);
    setIsSubmissionSuccess(false);

    try {
      const response = await fetch('/api/reports/create', {
        method: 'POST',
        body: formData, 
      });

      const result = await response.json();
      console.log('[MapComponent] handleReportSubmit - fetch result:', result);

      if (!response.ok) {
        if (result && result.isValidationError) {
          const reason = result.reason || "Image rejected by validation.";
          console.log('[MapComponent] handleReportSubmit - Setting validationError:', reason);
          setValidationError(reason);
          setIsSubmittingReport(false);
        } else {
          throw new Error(result.error || `HTTP error! status: ${response.status}`);
        }
      } else {
        // --- Success Path --- 
        setIsSubmissionSuccess(true);

        const newReport: PollutionReport = {
          id: result.reportId,
          location: reportLocation,
          type: "user",
          severity: data.severity, // Use user's severity initially (backend might adjust later)
          description: data.description, // TODO: Add description field to form/modal?
          imageUrl: result.imageUrl,
          timestamp: new Date().toISOString(), 
          cleaned_up: false,
        };
        setPollutionData((prev: PollutionReport[]) => [...prev, newReport]);

        toast({
          title: "Report Submitted Successfully",
          description: "Thank you! Your report is being processed.", 
        });

        // Delay closing the modal to show success state
        setTimeout(() => {
            setIsReportModalOpen(false);
            setIsSubmissionSuccess(false); // Reset success state after closing
        }, 1500); // Close after 1.5 seconds
      }

    } catch (error) {
      // Catch block now primarily handles network errors or non-validation server errors
      console.error("Error submitting report:", error);
      setIsSubmissionSuccess(false); // Ensure success state is false on error
      // Only show generic toast if it wasn't a validation error (already handled above)
      if (!validationError) { // Check if validationError was set in the try block
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to submit report. Please try again.",
          variant: "destructive",
        });
        // Set submitting false here ONLY for non-validation errors caught here
        setIsSubmittingReport(false); 
      } // If it WAS a validation error, isSubmittingReport is set within the try block's check
      
    } finally {
       // The finally block might be too simple now. 
       // We only need to potentially reset state if the modal closes unexpectedly
       // or if the success timeout hasn't run.
       // Let's remove the complex finally logic for now as state resets are handled
       // within the try/catch blocks or on modal close.
       /* PREVIOUS LOGIC:
        if (!validationError) {
           setTimeout(() => setIsSubmittingReport(false), 1000);
        } else {
            setIsSubmittingReport(false);
        }
       */
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

  // *** DEBUG LOG 3 ***
  console.log('[MapComponent] Rendering with validationError state:', validationError);

  return (
    <div className="relative w-full h-[calc(100vh-4.5rem)]" id="map-component">
      <div ref={mapRef} className="w-full h-full z-0" />
      
      {/* Layer visibility toggles as dropdown */}
      <div className="absolute left-4 z-30 bg-white rounded-md shadow-md" style={{ top: `calc(1.5rem + env(safe-area-inset-top, 0px))`, paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <button
          className="flex items-center gap-2 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-100 rounded-t-md focus:outline-none focus:ring-2 focus:ring-blue-400"
          onClick={() => setFiltersOpen((open) => !open)}
          aria-expanded={filtersOpen}
        >
          <Filter className="w-5 h-5" />
          Filters
        </button>
        {filtersOpen && (
          <div className="p-2 space-y-2">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showPollutionMarkers}
                onChange={(e) => setShowPollutionMarkers(e.target.checked)}
                className="form-checkbox h-4 w-4 text-red-600"
              />
              <span className="text-sm font-medium">User Submitted Litter {currentZoom < 13 && "(zoom in to view)"}</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={show311Data}
                onChange={(e) => setShow311Data(e.target.checked)}
                className="form-checkbox h-4 w-4 text-blue-600"
              />
              <span className="text-sm font-medium">311 Sourced Litter {currentZoom < 13 && "(zoom in to view)"}</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showTrashBins}
                onChange={(e) => setShowTrashBins(e.target.checked)}
                className="form-checkbox h-4 w-4 text-green-600"
              />
              <span className="text-sm font-medium">Trash Bins {currentZoom < 14 && "(zoom in to view)"}</span>
            </label>
          </div>
        )}
      </div>
      
      {/* Report modal */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => {
             setIsReportModalOpen(false);
        }}
        onSubmit={handleReportSubmit}
        userLocation={userLocation}
        isSubmitting={isSubmittingReport}
        isSuccess={isSubmissionSuccess}
        validationError={validationError}
        onClearValidationError={() => setValidationError(null)}
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
