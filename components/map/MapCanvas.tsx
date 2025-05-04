// Placeholder for MapCanvas.tsx
// This component will contain the actual map rendering logic 
// using either MapLibre GL JS or Deck.gl integrated with React.

import React, { useEffect } from 'react';
import { Map, NavigationControl, Marker, useMap } from '@vis.gl/react-maplibre';
import maplibregl, { LngLatBoundsLike } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { PollutionReport, TrashBin } from './types';

const INITIAL_VIEW_STATE = {
  longitude: -97.7431, // Default to Austin
  latitude: 30.2672,
  zoom: 12
};

const MAP_TILER_KEY = process.env.NEXT_PUBLIC_MAP_TILER_KEY;

// Define bounds for the Austin area
const AUSTIN_BOUNDS: LngLatBoundsLike = [
  [-98.2, 29.9], // Southwest coordinates
  [-97.2, 30.7]  // Northeast coordinates
];

interface MapCanvasProps {
  bins: TrashBin[];
  reports: PollutionReport[];
  show311: boolean;
  userId: string | null;
  onDelete: (id: string) => void;
  onClean: (id: string) => void;
  userLocation: [number, number] | null; // Add userLocation prop
  loading: boolean; // whether geolocation is still loading
}

export default function MapCanvas({
  bins,
  reports,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  show311: _show311,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  userId: _userId,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onDelete: _onDelete,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onClean: _onClean,
  userLocation, // Receive userLocation from props
  loading,
}: MapCanvasProps) {
  // Get the MapRef using the hook
  const mapRef = useMap();

  // Log received props
  console.log('[MapCanvas] Received props:', { userLocation, loading });

  const initialViewState = userLocation
    ? { longitude: userLocation[0], latitude: userLocation[1], zoom: 14 }
    : INITIAL_VIEW_STATE;

  // When userLocation updates, recenter the map 
  useEffect(() => {
    // Access the default map instance via mapRef.default?.getMap()
    const mapInstance = mapRef?.default?.getMap(); 
    console.log('[MapCanvas Centering Effect] Running. Map Instance:', mapInstance ? 'Exists' : 'null', 'UserLocation:', userLocation);

    if (mapInstance && userLocation) {
      const center = mapInstance.getCenter();
      const condition = Math.abs(center.lng - userLocation[0]) > 0.0001 || Math.abs(center.lat - userLocation[1]) > 0.0001;
      console.log('[MapCanvas Centering Effect] Center:', center, 'Condition:', condition);
      if (condition) {
        console.log('[MapCanvas Centering Effect] Calling flyTo...');
        mapInstance.flyTo({ center: userLocation, zoom: 14 });
      }
    }
    // Depend on the mapRef object provided by the hook and userLocation
  }, [mapRef, userLocation]);

  if (loading && !userLocation) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        Locating…
      </div>
    );
  }

  // Render map once location ready or loading finished
  return (
    <div className="w-full h-full relative">
      {/* Add CSS for pulsing animation - typically in a global CSS file or styled components */}
      <style>{`
        @keyframes pulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        }
        .pulse-marker {
          background-color: #3B82F6; /* blue-500 */
          width: 16px;
          height: 16px;
          border-radius: 50%;
          box-shadow: 0 0 0 0 rgba(59, 130, 246, 1);
          transform: scale(1);
          animation: pulse 2s infinite;
        }
      `}</style>
      <Map
        // No ref prop needed when using useMap()
        mapLib={maplibregl}
        initialViewState={initialViewState}
        style={{ width: '100%', height: '100%' }}
        mapStyle={`https://api.maptiler.com/maps/streets/style.json?key=${MAP_TILER_KEY}`} // Use style URL again
        maxBounds={AUSTIN_BOUNDS}
        renderWorldCopies={false}
        validateStyle={false} // Add validateStyle={false} to suppress warnings
      >
        <NavigationControl position="top-right" />
        
        {/* Render trash bins */}
        {bins.map((bin) => (
          <Marker
            key={`bin-${bin.id}`}
            longitude={bin.location[0]}
            latitude={bin.location[1]}
            color="#2563eb"  // blue-600
            onClick={() => {
              // TODO: Handle bin click
            }}
          />
        ))}

        {/* Render pollution reports */}
        {reports.map((report) => (
          <Marker
            key={`report-${report.id}`}
            longitude={report.location[0]}
            latitude={report.location[1]}
            color="#dc2626"  // red-600
            onClick={() => {
              // TODO: Handle report click
            }}
          />
        ))}

        {/* Render user location if available with pulsing blue circle */}
        {console.log('[MapCanvas Render] Checking userLocation for marker:', userLocation)}
        {userLocation && (
          <Marker
            key="user-location"
            longitude={userLocation[0]}
            latitude={userLocation[1]}
            // Removed offsetLeft/offsetTop props
            anchor="center" // Ensure the marker anchor is the center
          >
            {/* Apply centering styles via CSS transform */}
            <div style={{ transform: 'translate(-50%, -50%)' }}> 
              <div className="pulse-marker"></div>
            </div>
          </Marker>
        )}
      </Map>
    </div>
  );
} 