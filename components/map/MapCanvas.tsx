// Placeholder for MapCanvas.tsx
// This component will contain the actual map rendering logic 
// using either MapLibre GL JS or Deck.gl integrated with React.

import React, { useState, useEffect } from 'react';
import { Map, Marker, Point, ZoomControl, Overlay } from 'pigeon-maps';
import { maptiler, osm } from 'pigeon-maps/providers';
import type { PollutionReport, TrashBin } from './types';

// Remove MapLibre CSS import and maplibre-gl imports
// import maplibregl, { LngLatBoundsLike } from 'maplibre-gl';
// import 'maplibre-gl/dist/maplibre-gl.css';

const INITIAL_CENTER: Point = [30.2672, -97.7431]; // Default to Austin [lat, lng]
const INITIAL_ZOOM = 12;

const MAP_TILER_KEY = process.env.NEXT_PUBLIC_MAP_TILER_KEY as string | undefined;
const tileProvider = MAP_TILER_KEY ? maptiler(MAP_TILER_KEY, 'streets') : osm;

// Define bounds (optional, Pigeon Maps doesn't enforce maxBounds directly like MapLibre)
// const AUSTIN_BOUNDS: LngLatBoundsLike = [
//   [-98.2, 29.9], // Southwest coordinates
//   [-97.2, 30.7]  // Northeast coordinates
// ];

interface MapCanvasProps {
  bins: TrashBin[];
  reports: PollutionReport[];
  userLocation: Point | null; // Use Pigeon Maps Point type [lat, lng]
  loading: boolean; // whether geolocation is still loading
  // Removed unused props that were MapLibre specific or placeholders
  // show311: boolean;
  // userId: string | null;
  // onDelete: (id: string) => void;
  // onClean: (id: string) => void;
}

// --- Custom Marker Components ---

// const UserLocationMarker = ({ anchor }: { anchor: Point }) => {
//   console.log('[UserLocationMarker] Anchor:', anchor);
//   return (
//     <div> 
//       <div className="pulse-marker"></div>
//     </div>
//   );
// };

// const TrashBinMarker = ({ anchor, onClick }: { anchor: Point, onClick: () => void }) => {
//   console.log('[TrashBinMarker] Anchor:', anchor);
//   return (
//     <div 
//       style={{ 
//         width: '12px', 
//         height: '12px',
//         backgroundColor: '#2563eb', // blue-600
//         borderRadius: '50%',
//         cursor: 'pointer'
//       }}
//       onClick={onClick}
//     />
//   );
// }

// const PollutionReportMarker = ({ anchor, onClick }: { anchor: Point, onClick: () => void }) => {
//   console.log('[PollutionReportMarker] Anchor:', anchor);
//   return (
//     <div 
//       style={{ 
//         width: '12px',
//         height: '12px',
//         backgroundColor: '#dc2626', // red-600
//         borderRadius: '50%',
//         cursor: 'pointer'
//       }}
//       onClick={onClick}
//     />
//   );
// }

// --- Main Map Canvas Component ---

export default function MapCanvas({
  bins,
  reports,
  userLocation, // Receive userLocation from props
  loading,
}: MapCanvasProps) {

  const [center, setCenter] = useState<Point>(userLocation || INITIAL_CENTER);
  const [zoom, setZoom] = useState(INITIAL_ZOOM);
  const [activeOverlay, setActiveOverlay] = useState<{ anchor: Point, report: PollutionReport } | null>(null);
  const [initialLocationSet, setInitialLocationSet] = useState(false); // Flag for initial centering

  // Effect to center map ONCE when userLocation is first available
  useEffect(() => {
    if (userLocation && !initialLocationSet) {
      console.log('[MapCanvas] Setting initial center/zoom based on userLocation');
      setCenter(userLocation);
      setZoom(14); 
      setInitialLocationSet(true); // Mark as set
    }
  }, [userLocation, initialLocationSet]); // Depend only on these

  if (loading && !userLocation && !initialLocationSet) { // Adjust loading condition slightly
    return (
      <div className="w-full h-full flex items-center justify-center">
        Locating…
      </div>
    );
  }

  // Render map once location ready or loading finished
  return (
    <div className="w-full h-full relative">
      {/* Pulse animation style (keep for UserLocationMarker) */}
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
        provider={tileProvider}
        center={center} // Control center via state
        zoom={zoom} // Control zoom via state
        dprs={[1, 2]} // For retina displays
      >
        <ZoomControl /> {/* Basic zoom control */}
        
        {/* Render trash bins */}
        {bins.map((bin) => (
          <Marker
            key={`bin-${bin.id}`}
            anchor={[bin.location[1], bin.location[0]]} 
            width={24}
            color="#2563eb"
          />
        ))}

        {/* Render pollution reports */}
        {reports.map((report) => (
          <Marker
            key={`report-${report.id}`}
            anchor={[report.location[1], report.location[0]]}
            width={24}
            color="#dc2626"
          />
        ))}

        {/* Render user location if available with pulsing blue circle */}
        {userLocation && (
          <Marker
            key="user-location"
            anchor={userLocation} 
          >
            {/* <UserLocationMarker anchor={userLocation} /> */}
          </Marker>
        )}

        {/* Render the active overlay */} 
        {activeOverlay && (
          <Overlay anchor={activeOverlay.anchor} offset={[0, 0]}> 
             {/* We will put the Popups component here later */}
             <div style={{ background: 'white', padding: '10px', borderRadius: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
               Report ID: {activeOverlay.report.id}
               <button onClick={() => setActiveOverlay(null)} style={{ marginLeft: '10px', border: 'none', background:'lightgray', cursor:'pointer' }}>X</button>
             </div>
          </Overlay>
        )}
      </Map>
    </div>
  );
} 