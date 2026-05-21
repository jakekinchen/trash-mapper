import type { PollutionReport } from "./types";

export interface SkyFiHotspotZone {
  id: string;
  label: string;
  center: [number, number];
  bbox: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  reportCount: number;
  openCount: number;
  latestTimestamp: string;
  topCategory: string;
  priorityScore: number;
  areaKm2: number;
  recommendation: string;
}

export interface SkyFiInsightSummary {
  total311Reports: number;
  open311Reports: number;
  topCategory: string;
  latestTimestamp?: string;
  zones: SkyFiHotspotZone[];
}

const GRID_SIZE_DEGREES = 0.018;
const AOI_PADDING_DEGREES = 0.006;

function getCategory(report: PollutionReport) {
  return report.description?.replace(/\s*\([^)]*\)\s*$/, "") || "Austin 311 pollution report";
}

function formatZoneLabel(index: number) {
  return `AOI-${String(index + 1).padStart(2, "0")}`;
}

function getGridKey([lat, lon]: [number, number]) {
  const latKey = Math.floor(lat / GRID_SIZE_DEGREES);
  const lonKey = Math.floor(lon / GRID_SIZE_DEGREES);
  return `${latKey}:${lonKey}`;
}

function getAreaKm2(zone: SkyFiHotspotZone["bbox"]) {
  const centerLat = (zone.north + zone.south) / 2;
  const latKm = Math.abs(zone.north - zone.south) * 110.574;
  const lonKm = Math.abs(zone.east - zone.west) * 111.32 * Math.cos(centerLat * Math.PI / 180);
  return Math.max(0.25, latKm * lonKm);
}

function getRecommendation(reportCount: number, openCount: number, areaKm2: number) {
  if (openCount >= 10) return "Task fresh optical imagery; compare against archive before cleanup dispatch.";
  if (areaKm2 <= 10) return "Search archive first; task a narrow follow-up capture if debris persists.";
  if (reportCount >= 20) return "Use recurring monitoring to confirm cleanup and detect re-accumulation.";
  return "Archive search is likely enough for baseline verification.";
}

export function buildSkyFiInsights(reports: PollutionReport[], maxZones = 4): SkyFiInsightSummary {
  const reports311 = reports.filter((report) => report.type === "311");
  const groups = new Map<string, PollutionReport[]>();

  for (const report of reports311) {
    const key = getGridKey(report.location);
    groups.set(key, [...(groups.get(key) ?? []), report]);
  }

  const zones = Array.from(groups.values())
    .filter((group) => group.length > 0)
    .map((group) => {
      const lats = group.map((report) => report.location[0]);
      const lons = group.map((report) => report.location[1]);
      const latestTimestamp = group
        .map((report) => report.timestamp)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
      const categories = group.reduce<Record<string, number>>((acc, report) => {
        const category = getCategory(report);
        acc[category] = (acc[category] ?? 0) + 1;
        return acc;
      }, {});
      const topCategory = Object.entries(categories).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Austin 311 pollution report";
      const openCount = group.filter((report) => !report.cleaned_up).length;
      const bbox = {
        north: Math.max(...lats) + AOI_PADDING_DEGREES,
        south: Math.min(...lats) - AOI_PADDING_DEGREES,
        east: Math.max(...lons) + AOI_PADDING_DEGREES,
        west: Math.min(...lons) - AOI_PADDING_DEGREES,
      };
      const areaKm2 = getAreaKm2(bbox);

      return {
        id: "",
        label: "",
        center: [
          lats.reduce((sum, lat) => sum + lat, 0) / lats.length,
          lons.reduce((sum, lon) => sum + lon, 0) / lons.length,
        ] as [number, number],
        bbox,
        reportCount: group.length,
        openCount,
        latestTimestamp,
        topCategory,
        priorityScore: group.length * 2 + openCount * 3 + Math.max(0, 12 - areaKm2),
        areaKm2,
        recommendation: getRecommendation(group.length, openCount, areaKm2),
      };
    })
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, maxZones)
    .map((zone, index) => ({
      ...zone,
      id: `skyfi-aoi-${index + 1}`,
      label: formatZoneLabel(index),
    }));

  const categories = reports311.reduce<Record<string, number>>((acc, report) => {
    const category = getCategory(report);
    acc[category] = (acc[category] ?? 0) + 1;
    return acc;
  }, {});

  return {
    total311Reports: reports311.length,
    open311Reports: reports311.filter((report) => !report.cleaned_up).length,
    topCategory: Object.entries(categories).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "No 311 reports loaded",
    latestTimestamp: reports311
      .map((report) => report.timestamp)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0],
    zones,
  };
}

export function createSkyFiAoiGeoJson(zones: SkyFiHotspotZone[]) {
  return {
    type: "FeatureCollection",
    name: "trashmapatx-skyfi-aois",
    features: zones.map((zone) => ({
      type: "Feature",
      properties: {
        id: zone.id,
        name: zone.label,
        reportCount: zone.reportCount,
        openCount: zone.openCount,
        latestTimestamp: zone.latestTimestamp,
        topCategory: zone.topCategory,
        priorityScore: Math.round(zone.priorityScore),
        areaKm2: Number(zone.areaKm2.toFixed(2)),
        recommendation: zone.recommendation,
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [zone.bbox.west, zone.bbox.south],
          [zone.bbox.east, zone.bbox.south],
          [zone.bbox.east, zone.bbox.north],
          [zone.bbox.west, zone.bbox.north],
          [zone.bbox.west, zone.bbox.south],
        ]],
      },
    })),
  };
}
