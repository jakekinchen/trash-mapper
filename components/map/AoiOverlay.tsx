import type { Bounds } from "pigeon-maps";
import type { AoiHotspotZone } from "./aoiInsights";

interface AoiOverlayProps {
  bounds: Bounds;
  zones: AoiHotspotZone[];
}

function latLonToPixel(lat: number, lon: number, bounds: Bounds, width: number, height: number): [number, number] {
  const { ne, sw } = bounds;
  const lonRange = ne[1] - sw[1];
  const latRange = ne[0] - sw[0];

  if (lonRange === 0 || latRange === 0) return [-1, -1];

  return [
    ((lon - sw[1]) / lonRange) * width,
    ((ne[0] - lat) / latRange) * height,
  ];
}

export default function AoiOverlay({ bounds, zones }: AoiOverlayProps) {
  return (
    <svg
      data-testid="aoi-overlay"
      className="absolute inset-0 z-20 h-full w-full pointer-events-none"
      viewBox="0 0 1000 1000"
      preserveAspectRatio="none"
    >
      {zones.map((zone, index) => {
        const nw = latLonToPixel(zone.bbox.north, zone.bbox.west, bounds, 1000, 1000);
        const ne = latLonToPixel(zone.bbox.north, zone.bbox.east, bounds, 1000, 1000);
        const se = latLonToPixel(zone.bbox.south, zone.bbox.east, bounds, 1000, 1000);
        const sw = latLonToPixel(zone.bbox.south, zone.bbox.west, bounds, 1000, 1000);
        const label = latLonToPixel(zone.center[0], zone.center[1], bounds, 1000, 1000);
        const points = [nw, ne, se, sw].map(([x, y]) => `${x},${y}`).join(" ");

        return (
          <g key={zone.id}>
            <polygon
              points={points}
              fill={index === 0 ? "rgba(15, 23, 42, 0.14)" : "rgba(37, 99, 235, 0.10)"}
              stroke={index === 0 ? "#0f172a" : "#2563eb"}
              strokeWidth={index === 0 ? 3 : 2}
              strokeDasharray="10 7"
            />
            <g transform={`translate(${label[0]} ${label[1]})`}>
              <rect x="-30" y="-13" width="60" height="26" rx="5" fill="#0f172a" />
              <text
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#fff"
                fontSize="13"
                fontWeight="700"
              >
                {zone.label}
              </text>
            </g>
          </g>
        );
      })}
    </svg>
  );
}
