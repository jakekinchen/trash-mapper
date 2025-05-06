// Placeholder for MapCanvas.tsx
// This component will contain the actual map rendering logic 
// using either MapLibre GL JS or Deck.gl integrated with React.

import React, { useState, useEffect } from 'react';
import { Map, Marker, Point, Overlay } from 'pigeon-maps';
import { maptiler, osm } from 'pigeon-maps/providers';
import type { Bounds } from 'pigeon-maps';
import type { PollutionReport, TrashBin } from './types';
import HeatmapOverlay from './HeatmapOverlay';
import PollutionInfo from '@/components/pollution-info';
import { Button } from '@/components/ui/button';
import { Sparkles, Trash2 } from 'lucide-react';

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
  userId?: string | null;
  onClean?: (id: string) => void;
  onDelete?: (id: string) => Promise<void>;
}

export default function MapCanvas({
  bins,
  reports,
  userLocation,
  loading,
  showHeatmap = false,
  userId,
  onClean,
  onDelete
}: MapCanvasProps) {
  const [center, setCenter] = useState<Point>(userLocation || INITIAL_CENTER);
  const [zoom, setZoom] = useState(INITIAL_ZOOM);
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [initialLocationSet, setInitialLocationSet] = useState(false);
  const [selectedReport, setSelectedReport] = useState<PollutionReport | null>(null);
  const [selectedMarkerCoords, setSelectedMarkerCoords] = useState<Point | null>(null);

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

  const handleClosePopup = () => {
    setSelectedReport(null);
    setSelectedMarkerCoords(null);
  };

  const handleMarkerClick = (report: PollutionReport) => {
    setSelectedReport(report);
    setSelectedMarkerCoords([report.location[1], report.location[0]]);
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
        zoomSnap={false} 
        onBoundsChanged={handleBoundsChange}
        dprs={[1, 2]}
        onClick={handleClosePopup}
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
            onClick={() => handleMarkerClick(report)}
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

        {selectedReport && selectedMarkerCoords && (
          (() => {
            const markerLat = selectedMarkerCoords[0];
            const centerLat = center[0];
            // If marker is in top half, show info box below (positive offset)
            // If marker is in bottom half, show info box above (negative offset)
            // Add extra offset to account for marker height (24px) and some padding
            const yOffset = markerLat > centerLat ? 0 : 0;

            return (
              <Overlay anchor={selectedMarkerCoords} offset={[0, yOffset]}>
                <div className="bg-white rounded-lg shadow-lg p-4 min-w-[240px] transform -translate-x-1/2">
                  <PollutionInfo report={selectedReport} />
                  <div className="flex gap-2 mt-4">
                    {/* Show Clean only for reports not owned by the current user and not already cleaned */}
                    {userId && !selectedReport.cleaned_up && selectedReport.user_id !== userId && onClean && (
                      <Button
                        variant="outline"
                        className="flex-1 text-white border-0 bg-sage-light hover:bg-sage-light/75 hover:text-white"
                        onClick={() => {
                          onClean(selectedReport.id);
                          handleClosePopup();
                        }}
                      >
                        <Sparkles className="w-4 h-4 mr-2 text-white hover:text-sage-light" />
                        Clean
                      </Button>
                    )}
                    {/* Show Delete only for owner's report */}
                    {selectedReport.user_id === userId && onDelete && (
                      <Button
                        variant="destructive"
                        className="flex-1"
                        onClick={async () => {
                          await onDelete(selectedReport.id);
                          handleClosePopup();
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              </Overlay>
            );
          })()
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