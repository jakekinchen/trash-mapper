import { useState, useEffect, useCallback, useRef } from "react";
import { useToast } from "@/components/ui/use-toast";
import { getAllPollutionReports } from "@/lib/reports"; // Assuming this exists and fetches SupabaseReports
import wkx from 'wkx';
import { Buffer } from 'buffer';
import type { PollutionReport, SupabaseReport } from "../types";

// Retain fetched reports during the session, but only skip a network refresh
// after the Austin 311 feed has successfully returned report data.
let cachedPollution: PollutionReport[] | null = null;
let cachedStatus: PollutionDataStatus | null = null;
let cachedHasAustin311Reports = false;
let inFlightPollutionFetch: Promise<PollutionDataSnapshot> | null = null;

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

interface PollutionDataSnapshot {
  reports: PollutionReport[];
  status: PollutionDataStatus;
  hasAustin311Reports: boolean;
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

async function loadPollutionData(): Promise<PollutionDataSnapshot> {
  const [userResult, austin311Result] = await Promise.allSettled([
    fetchUserReports(),
    fetchAustin311Reports(),
  ]);

  const userReports = userResult.status === 'fulfilled' ? userResult.value : [];
  const austin311Data = austin311Result.status === 'fulfilled' ? austin311Result.value : null;
  const austin311Reports = austin311Data?.reports ?? [];
  const hasAustin311Reports = austin311Reports.length > 0;

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
  }

  if (!hasAustin311Reports && cachedHasAustin311Reports && cachedPollution && cachedStatus) {
    return {
      reports: cachedPollution,
      status: { ...cachedStatus, loading: false },
      hasAustin311Reports: true,
    };
  }

  return {
    reports: [...userReports, ...austin311Reports],
    status: nextStatus,
    hasAustin311Reports,
  };
}

function getPollutionDataSnapshot() {
  if (!inFlightPollutionFetch) {
    inFlightPollutionFetch = loadPollutionData().finally(() => {
      inFlightPollutionFetch = null;
    });
  }
  return inFlightPollutionFetch;
}

export default function usePollutionData() {
  const { toast } = useToast();
  const [pollutionData, setPollutionData] = useState<PollutionReport[]>(cachedPollution ?? []);
  const [status, setStatus] = useState<PollutionDataStatus>(
    cachedStatus ?? { loading: true },
  );
  const fetchedRef = useRef<boolean>(cachedHasAustin311Reports);

  useEffect(() => {
    if (fetchedRef.current) return; // Already fetched

    let active = true;

    const fetchAllPollutionData = async () => {
      setStatus({ loading: true });

      const snapshot = await getPollutionDataSnapshot();

      cachedPollution = snapshot.reports;
      cachedStatus = snapshot.status;
      cachedHasAustin311Reports = snapshot.hasAustin311Reports;

      if (!active) return;

      setPollutionData(snapshot.reports);
      setStatus(snapshot.status);
      fetchedRef.current = snapshot.hasAustin311Reports;

      if (snapshot.status.austin311Error && !snapshot.hasAustin311Reports) {
        toast({
          title: "Error",
          description: "Failed to load Austin 311 hotspots",
          variant: "destructive",
        });
      }
    };

    fetchAllPollutionData();

    return () => {
      active = false;
    };
  }, [toast]); // Add other dependencies if needed, e.g., user session changes

  const addReport = useCallback((newReport: PollutionReport) => {
    setPollutionData(prev => {
      const next = [...prev, newReport];
      cachedPollution = next;
      return next;
    });
  }, []);

  const mutateReport = useCallback((id: string, data: Partial<PollutionReport>) => {
    // If data is empty object, filter (delete). Otherwise, update.
    if (Object.keys(data).length === 0) {
      console.log('Mutating (delete) report:', id);
      setPollutionData(prev => {
        const next = prev.filter(r => r.id !== id);
        cachedPollution = next;
        cachedHasAustin311Reports = next.some(report => report.type === "311");
        return next;
      });
    } else {
      console.log('Mutating (update) report:', id, data);
      setPollutionData(prev => {
        const next = prev.map(r => r.id === id ? { ...r, ...data } : r);
        cachedPollution = next;
        return next;
      });
    }
  }, []);

  return { reports: pollutionData, addReport, mutateReport, status };
}
