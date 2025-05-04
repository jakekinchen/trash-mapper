import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import type { TrashBin, GeoJSONData, GeoJSONFeature } from "../types";

// Simple in-memory cache to prevent refetching on every mount
let cachedBins: TrashBin[] | null = null;

export default function useTrashBins() {
  const { toast } = useToast();
  const [bins, setBins] = useState<TrashBin[]>(cachedBins ?? []);
  const [loading, setLoading] = useState(cachedBins === null);

  useEffect(() => {
    if (cachedBins) return; // Already have bins

    const fetchTrashBins = async () => {
      try {
        setLoading(true);
        const response = await fetch('/austin_trash_bins.geojson');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: GeoJSONData = await response.json();

        // Transform GeoJSON features into TrashBin objects
        const trashBins: TrashBin[] = data.features.map((feature: GeoJSONFeature) => {
          const id = feature.properties?.osmid?.toString() || Math.random().toString(); // Use random ID if properties or osmid is missing
          return {
             id: id,
             location: feature.geometry.coordinates,
             properties: feature.properties ?? {}
           };
        });

        cachedBins = trashBins;
        setBins(trashBins);
      } catch (error) {
        console.error("Error fetching trash bins:", error);
        toast({
          title: "Error",
          description: "Failed to load trash bin data",
          variant: "destructive",
        });
      }
      setLoading(false);
    };

    fetchTrashBins();
  }, [toast]); // Dependency on toast

  return { bins, loading };
} 