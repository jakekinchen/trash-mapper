import { useState, useEffect, useCallback, useRef } from "react";
import { useToast } from "@/components/ui/use-toast";
import { getAllPollutionReports } from "@/lib/reports"; // Assuming this exists and fetches SupabaseReports
import wkx from 'wkx';
import { Buffer } from 'buffer';
import type { PollutionReport, SupabaseReport } from "../types";

// Simple cache to retain fetched reports during the session
let cachedPollution: import("../types").PollutionReport[] | null = null;

interface Austin311Response {
  reports: PollutionReport[];
  sourceCount: number;
  skippedCount: number;
  fetchedAt: string;
  lookbackDays: number;
}

interface PollutionDataStatus {
  loading: boolean;
  userReportError?: string;
  austin311Error?: string;
  austin311FetchedAt?: string;
  austin311LookbackDays?: number;
  austin311SkippedCount?: number;
}

async function fetchUserReports(): Promise<PollutionReport[]> {
  const reports: SupabaseReport[] = await getAllPollutionReports();

  const validReports = Array.isArray(reports)
    ? reports.filter((report) => report.is_valid_environment !== false)
    : [];

  return validReports.map((report) => {
    let coordinates: [number, number] = [0, 0];
    if (report.geom) {
      try {
        const geometry = wkx.Geometry.parse(Buffer.from(report.geom, 'hex')) as wkx.Point;
        if (geometry instanceof wkx.Point) {
          coordinates = [geometry.y, geometry.x];
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
}

async function fetchAustin311Reports(): Promise<Austin311Response> {
  const response = await fetch('/api/reports/311');
  if (!response.ok) {
    throw new Error(`Austin 311 request failed with ${response.status}`);
  }
  return response.json();
}

export default function usePollutionData() {
  const { toast } = useToast();
  const [pollutionData, setPollutionData] = useState<PollutionReport[]>(cachedPollution ?? []);
  const [status, setStatus] = useState<PollutionDataStatus>({
    loading: cachedPollution === null,
  });
  const fetchedRef = useRef<boolean>(cachedPollution !== null);

  useEffect(() => {
    if (fetchedRef.current) return; // Already fetched

    const fetchAllPollutionData = async () => {
      setStatus({ loading: true });

      const [userResult, austin311Result] = await Promise.allSettled([
        fetchUserReports(),
        fetchAustin311Reports(),
      ]);

      const userReports = userResult.status === 'fulfilled' ? userResult.value : [];
      const austin311Data = austin311Result.status === 'fulfilled' ? austin311Result.value : null;
      const austin311Reports = austin311Data?.reports ?? [];

      const nextStatus: PollutionDataStatus = {
        loading: false,
        austin311FetchedAt: austin311Data?.fetchedAt,
        austin311LookbackDays: austin311Data?.lookbackDays,
        austin311SkippedCount: austin311Data?.skippedCount,
      };

      if (userResult.status === 'rejected') {
        console.error("Error fetching user pollution reports:", userResult.reason);
        nextStatus.userReportError = "User reports unavailable";
      }

      if (austin311Result.status === 'rejected') {
        console.error("Error fetching Austin 311 pollution data:", austin311Result.reason);
        nextStatus.austin311Error = "311 hotspots unavailable";
        toast({
          title: "Error",
          description: "Failed to load Austin 311 hotspots",
          variant: "destructive",
        });
      }

      const combined = [...userReports, ...austin311Reports];
      cachedPollution = combined;
      setPollutionData(combined);
      setStatus(nextStatus);

      fetchedRef.current = true;
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

  return { reports: pollutionData, addReport, mutateReport, status };
}
