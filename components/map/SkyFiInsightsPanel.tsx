"use client";

import { Download, Radar, Satellite, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createSkyFiAoiGeoJson, type SkyFiInsightSummary } from "./skyfiInsights";

interface SkyFiInsightsPanelProps {
  summary: SkyFiInsightSummary;
  loading?: boolean;
  error?: string;
}

function formatDate(value?: string) {
  if (!value) return "No recent reports";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatCoordinate([lat, lon]: [number, number]) {
  return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
}

export default function SkyFiInsightsPanel({ summary, loading = false, error }: SkyFiInsightsPanelProps) {
  const handleDownload = () => {
    const geoJson = createSkyFiAoiGeoJson(summary.zones);
    const blob = new Blob([JSON.stringify(geoJson, null, 2)], { type: "application/geo+json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "trashmapatx-skyfi-aois.geojson";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section
      data-testid="skyfi-panel"
      className="absolute bottom-4 right-4 z-30 w-[min(24rem,calc(100vw-2rem))] rounded-md border border-slate-200 bg-white/95 shadow-lg backdrop-blur"
    >
      <div className="border-b border-slate-200 p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-900 text-white">
              <Satellite className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-950">SkyFi Intelligence</h2>
              <p className="text-xs text-slate-500">Satellite-ready 311 AOIs</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1 px-2 text-xs"
            disabled={summary.zones.length === 0}
            onClick={handleDownload}
          >
            <Download className="h-3.5 w-3.5" />
            Export AOIs
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 border-b border-slate-200 text-center">
        <div className="p-3">
          <div className="text-lg font-semibold text-slate-950">{loading ? "..." : summary.total311Reports}</div>
          <div className="text-[11px] uppercase tracking-wide text-slate-500">Reports</div>
        </div>
        <div className="border-x border-slate-200 p-3">
          <div className="text-lg font-semibold text-slate-950">{loading ? "..." : summary.open311Reports}</div>
          <div className="text-[11px] uppercase tracking-wide text-slate-500">Open</div>
        </div>
        <div className="p-3">
          <div className="text-lg font-semibold text-slate-950">{loading ? "..." : summary.zones.length}</div>
          <div className="text-[11px] uppercase tracking-wide text-slate-500">AOIs</div>
        </div>
      </div>

      <div className="space-y-3 p-3">
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-[auto,1fr] gap-2 rounded-md bg-slate-50 p-2 text-xs text-slate-700">
          <Radar className="mt-0.5 h-4 w-4 text-slate-500" />
          <div>
            <div className="font-medium text-slate-900">{summary.topCategory}</div>
            <div>Latest signal: {formatDate(summary.latestTimestamp)}</div>
          </div>
        </div>

        <div className="space-y-2">
          {summary.zones.map((zone) => (
            <article key={zone.id} className="rounded-md border border-slate-200 p-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-950">{zone.label}</div>
                  <div className="text-xs text-slate-500">{formatCoordinate(zone.center)}</div>
                </div>
                <div className="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                  {zone.reportCount} reports
                </div>
              </div>
              <div className="mt-2 flex items-start gap-2 text-xs text-slate-700">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-600" />
                <span>{zone.recommendation}</span>
              </div>
              <div className="mt-2 text-[11px] text-slate-500">
                {zone.topCategory} · {zone.areaKm2.toFixed(1)} km²
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
