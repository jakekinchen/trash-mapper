import { useState, useEffect, useCallback, useRef } from "react";
import { useToast } from "@/components/ui/use-toast";
import { getAllPollutionReports } from "@/lib/reports"; // Assuming this exists and fetches SupabaseReports
import wkx from 'wkx';
import { Buffer } from 'buffer';
import type { PollutionReport, SupabaseReport, Austin311Report } from "../types";

// Simple cache to retain fetched reports during the session
let cachedPollution: import("../types").PollutionReport[] | null = null;

export default function usePollutionData() {
  const { toast } = useToast();
  const [pollutionData, setPollutionData] = useState<PollutionReport[]>(cachedPollution ?? []);
  const fetchedRef = useRef<boolean>(cachedPollution !== null);

  useEffect(() => {
    if (fetchedRef.current) return; // Already fetched

    const fetchAllPollutionData = async () => {
      try {
        // Fetch user reports from Supabase
        const reports: SupabaseReport[] = await getAllPollutionReports();

        // Filter out reports with is_valid_environment === false (defensive)
        const validReports = Array.isArray(reports)
          ? reports.filter((report) => report.is_valid_environment !== false)
          : [];

        // Transform Supabase reports
        const userReports: PollutionReport[] = validReports.map((report) => {
          let coordinates: [number, number] = [0, 0]; // Default
          if (report.geom) {
            try {
              const geometry = wkx.Geometry.parse(Buffer.from(report.geom, 'hex')) as wkx.Point;
              if (geometry instanceof wkx.Point) {
                coordinates = [geometry.y, geometry.x]; // Swap x and y to get [longitude, latitude]
              }
            } catch (e) {
              console.error('Error parsing geom for report', report.id, e);
            }
          }
          return {
            id: report.id,
            location: coordinates,
            type: "user",
            severity: report.severity,
            description: report.description || undefined,
            imageUrl: report.image_url,
            timestamp: report.created_at,
            cleaned_up: report.cleaned_up || false,
            user_id: report.user_id,
            cleaned_at: report.cleaned_at,
            cleaned_image_url: report.cleaned_image_url,
          };
        });

        // Fetch 311 data (logic moved from map.tsx)
        const now = new Date();
        const oneMonthAgo = new Date(now);
        oneMonthAgo.setMonth(now.getMonth() - 1);
        const isoOneMonthAgo = oneMonthAgo.toISOString().split(".")[0];
        const isoNow = now.toISOString().split(".")[0];
        const query = `SELECT sr_type_desc, sr_created_date, sr_closed_date, sr_location_lat, sr_location_long, sr_location_lat_long WHERE caseless_one_of(sr_type_desc, "ARR - Street Sweeping", "ARR Street Sweeping", "ZZZ ARR Street Sweeping", "Debris in Street", "Zz_ARR - Storm Debris Collection", "TPW - Debris in Street", "SBO - Debris in Street", "Town Lake Debris Issues", "ZZ ARR - Storm Debris Collection", "ARR - Storm Debris Collection", "ARR - Collection Truck Spillage", "ARR - Spillage Trash/Fluids", "Roadway Spillage", "SBO - Roadway Spillage", "TPW - Roadway Spillage") AND sr_closed_date IS NULL AND (sr_created_date > '${isoOneMonthAgo}' :: floating_timestamp AND sr_created_date < '${isoNow}' :: floating_timestamp)`
        const url = `https://data.austintexas.gov/resource/xwdj-i9he.json?$query=${encodeURIComponent(query)}`
        const response = await fetch(url);
        const data311: Austin311Report[] = await response.json();

        const new311Reports: PollutionReport[] = data311
          .filter(report => {
            const lat = parseFloat(report.sr_location_lat);
            const lon = parseFloat(report.sr_location_long);
            console.log('311 Report coordinates:', {
              raw: { lat: report.sr_location_lat, lon: report.sr_location_long },
              parsed: { lat, lon }
            });
            return !isNaN(lat) && !isNaN(lon) && lat !== 0 && lon !== 0;
          })
          .map((report) => {
            const lat = parseFloat(report.sr_location_lat);
            const lon = parseFloat(report.sr_location_long);
            const location: [number, number] = [lat, lon];
            console.log('311 Report mapped location:', location);
            return {
              id: `311-${report.sr_created_date}-${report.sr_location_lat}-${report.sr_location_long}`,
              location,
              type: "311",
              severity: 3, // Default severity
              timestamp: report.sr_created_date,
              cleaned_up: false, // 311 reports are initially not cleaned
              description: report.sr_type_desc
            };
          });

        // Combine both data sources
        const combined = [...userReports, ...new311Reports];
        cachedPollution = combined;
        setPollutionData(combined);

        fetchedRef.current = true;

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

  }, [toast]); // Add other dependencies if needed, e.g., user session changes

  const addReport = useCallback((newReport: PollutionReport) => {
    setPollutionData(prev => [...prev, newReport]);
  }, []);

  const mutateReport = useCallback((id: string, data: Partial<PollutionReport>) => {
    // If data is empty object, filter (delete). Otherwise, update.
    if (Object.keys(data).length === 0) {
      console.log('Mutating (delete) report:', id);
      setPollutionData(prev => prev.filter(r => r.id !== id));
    } else {
      console.log('Mutating (update) report:', id, data);
      setPollutionData(prev => prev.map(r => r.id === id ? { ...r, ...data } : r));
    }
  }, []);

  return { reports: pollutionData, addReport, mutateReport };
} 