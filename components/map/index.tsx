"use client"

import { useState, useEffect, useRef } from "react"; // Added useRef
import MapCanvas   from "./MapCanvas";
import FiltersPanel from "./FiltersPanel";
import ReportModal, { type ReportSubmitData } from "@/components/report-modal";
import CleanModal   from "@/components/clean-modal";
import useTrashBins      from "./hooks/useTrashBins";
import usePollutionData  from "./hooks/usePollutionData";
import useUserLocation   from "./hooks/useUserLocation";
import useCurrentUser    from "./hooks/useCurrentUser";
import useReportActions  from "./hooks/useReportActions";

export default function Map() {
  const mapContainerRef = useRef<HTMLDivElement>(null); // Ref for the container div

  /* layer toggles */
  const [trashOn, setTrashOn] = useState(false);
  const [showUserMarkers, setShowUserMarkers] = useState(false);
  const [show311, setShow311] = useState(false);
  const [showUserHeatmap, setShowUserHeatmap] = useState(true);
  const [show311Heatmap, setShow311Heatmap] = useState(true);

  /* UI state */
  const [reportOpen, setReportOpen] = useState(false);
  const [cleanOpen, setCleanOpen] = useState(false);
  const [cleanId, setCleanId] = useState<string | null>(null);

  /* data hooks */
  const { bins } = useTrashBins();
  const { reports, addReport, mutateReport } = usePollutionData();
  const { location, loading } = useUserLocation();
  const { userId } = useCurrentUser();

  // Filter reports for markers
  const visibleReports = reports.filter(r => {
    if (r.type === '311') {
      return show311; // Only show 311 reports if show311 is true
    } else {
      return showUserMarkers; // Only show user submitted reports if showUserMarkers is true
    }
  });

  // Separate filtered datasets for heatmaps
  const userHeatmapReports = reports.filter(r => r.type !== '311');
  const heatmap311Reports = reports.filter(r => r.type === '311');

  /* actions hook */
  const actions = useReportActions({
    addReport,
    mutateReport,
    userId,
    openClean: (id: string) => { setCleanId(id); setCleanOpen(true); }
  });

  // Effect to close ReportModal when submission is successful
  // The hook resets its internal `success` state after 1.5s
  // We use a separate effect to avoid putting `setReportOpen` in hook dependencies
  useEffect(() => {
    if (actions.success) {
      const timer = setTimeout(() => {
        setReportOpen(false);
      }, 1500); // Match delay in hook
      return () => clearTimeout(timer);
    }
  }, [actions.success]);

  // Function to open the report modal
  const handleOpenReportModal = () => {
    setReportOpen(true);
  };

  // Add event listener for custom openReportModal event ON THE MAP CONTAINER
  useEffect(() => {
    const currentMapContainer = mapContainerRef.current;
    if (currentMapContainer) {
      currentMapContainer.addEventListener('openReportModal', handleOpenReportModal);
      return () => {
        currentMapContainer.removeEventListener('openReportModal', handleOpenReportModal);
      };
    }
    // If the ref isn't available yet, this effect will re-run when it is.
  }, []); // Run once on mount

  return (
    <div ref={mapContainerRef} className="relative w-full h-[calc(100vh-6rem)]" id="map-component">
      <MapCanvas
        bins={trashOn ? bins : []}
        reports={visibleReports}
        userLocation={location}
        loading={loading}
        showUserHeatmap={showUserHeatmap}
        show311Heatmap={show311Heatmap}
        userHeatmapReports={userHeatmapReports}
        heatmap311Reports={heatmap311Reports}
        userId={userId}
        onClean={(id) => { setCleanId(id); setCleanOpen(true); }}
        onDelete={actions.del}
      />

      <FiltersPanel
        showTrashBins={trashOn}
        toggleTrashBins={setTrashOn}
        showPollution={showUserMarkers}
        togglePollution={setShowUserMarkers}
        show311={show311}
        toggle311={setShow311}
        showUserHeatmap={showUserHeatmap}
        toggleUserHeatmap={setShowUserHeatmap}
        show311Heatmap={show311Heatmap}
        toggle311Heatmap={setShow311Heatmap}
      />

      <ReportModal
        isOpen={reportOpen}
        onClose={()=>setReportOpen(false)}
        onSubmit={(d: ReportSubmitData)=>actions.submit(d,location)} // <-- Add type to d
        userLocation={location} 
        isSubmitting={actions.submitting}
        isSuccess={actions.success}
        validationError={actions.validationError}
        onClearValidationError={actions.clearValidationError}
      />

      <CleanModal
        isOpen={cleanOpen}
        reportId={cleanId}
        onClose={() => { setCleanOpen(false); setCleanId(null); }}
        onConfirm={actions.clean} // Pass the clean action
      />
      
      {/* FloatingButtons component should be rendered somewhere, likely in the main layout or here */}
      {/* Make sure FloatingButtons is actually included in your component tree */}

      {/* Removed Leaflet script tags - map lib loaded by MapCanvas */}
    </div>
  );
} 