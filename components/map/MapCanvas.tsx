// Placeholder for MapCanvas.tsx
// This component will contain the actual map rendering logic 
// using either MapLibre GL JS or Deck.gl integrated with React.

import React, { useState, useEffect } from 'react';
import { Map, Marker, Point } from 'pigeon-maps';
import { maptiler, osm } from 'pigeon-maps/providers';
import type { Bounds } from 'pigeon-maps';
import type { PollutionReport, TrashBin } from './types';
import HeatmapOverlay from './HeatmapOverlay';

const INITIAL_CENTER: Point = [30.2672, -97.7431];
const INITIAL_ZOOM = 12;

const MAP_TILER_KEY = process.env.NEXT_PUBLIC_MAP_TILER_KEY as string | undefined;
const tileProvider = MAP_TILER_KEY ? maptiler(MAP_TILER_KEY, 'streets') : osm;

interface MapCanvasProps {
  bins: TrashBin[];
  reports: PollutionReport[];
  userLocation: Point | null;
  loading: boolean;
  showHeatmap?: boolean;
}

export default function MapCanvas({
  bins,
  reports,
  userLocation,
  loading,
  showHeatmap = false,
}: MapCanvasProps) {
  const [center, setCenter] = useState<Point>(userLocation || INITIAL_CENTER);
  const [zoom, setZoom] = useState(INITIAL_ZOOM);
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [initialLocationSet, setInitialLocationSet] = useState(false);

  useEffect(() => {
    if (userLocation && !initialLocationSet) {
      setCenter(userLocation);
      setZoom(14);
      setInitialLocationSet(true);
    }
  }, [userLocation, initialLocationSet]);

  if (loading && !userLocation && !initialLocationSet) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        Locating…
      </div>
    );
  }

  const handleBoundsChange = ({ center, zoom, bounds: newBounds }: {
    center: Point;
    zoom: number;
    bounds: Bounds;
    initial: boolean;
  }) => {
    console.log('[MapCanvas] onBoundsChanged', { center, zoom, newBounds });
    setCenter(center);
    setZoom(zoom);
    setBounds(newBounds);
  };

  return (
    <div className="w-full h-full relative">
      <style>{`
        @keyframes pulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        }
        .pulse-marker {
          background-color: #3B82F6;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          box-shadow: 0 0 0 0 rgba(59, 130, 246, 1);
          transform: scale(1);
          animation: pulse 2s infinite;
        }
        .heatmap-canvas-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 10;
        }
      `}</style>
      <Map
        provider={tileProvider}
        center={center}
        zoom={zoom}
        onBoundsChanged={handleBoundsChange}
        dprs={[1, 2]}
      >
        {!showHeatmap && bins.map((bin) => (
          <Marker
            key={`bin-${bin.id}`}
            anchor={[bin.location[1], bin.location[0]]}
            width={24}
            color="#2563eb"
          />
        ))}

        {!showHeatmap && reports.map((report) => (
          <Marker
            key={`report-${report.id}`}
            anchor={[report.location[1], report.location[0]]}
            width={24}
            color="#dc2626"
          />
        ))}

        {userLocation && (
          <Marker
            key="user-location"
            anchor={userLocation}
            width={16}
            height={16}
          >
            <div className="pulse-marker"></div>
          </Marker>
        )}
      </Map>

      {showHeatmap && bounds && (
        <div className="heatmap-canvas-overlay">
          <HeatmapOverlay 
            reports={reports} 
            zoom={zoom} 
            bounds={bounds}
          />
        </div>
      )}
    </div>
  );
} 