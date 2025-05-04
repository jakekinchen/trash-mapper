"use client"

import { useState, useEffect } from "react"; // Added useEffect
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
  /* layer toggles */
  const [trashOn , setTrashOn ] = useState(false);
  const [pollOn  , setPollOn  ] = useState(true);
  const [show311 , setShow311 ] = useState(true);

  /* UI state */
  const [reportOpen , setReportOpen ] = useState(false);
  const [cleanOpen  , setCleanOpen  ] = useState(false);
  const [cleanId    , setCleanId    ] = useState<string | null>(null);

  /* data hooks */
  const { bins }                       = useTrashBins();
  const { reports , addReport , mutateReport } = usePollutionData();
  const { location , loading }         = useUserLocation();
  const { userId }                     = useCurrentUser();

  /* actions hook */
  const actions = useReportActions({
    addReport,
    mutateReport,
    userId,
    openClean: (id: string) => { setCleanId(id); setCleanOpen(true); }
  });

  // Log location updates received from the hook
  console.log('[Map Index] Received from useUserLocation:', { location, loading });

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

  // Function to open the report modal (potentially triggered by FloatingButtons)
  const handleOpenReportModal = () => {
    // Could add checks here (e.g., user logged in) before opening
    setReportOpen(true);
  };

  // Add event listener for custom openReportModal event (e.g., from FloatingButtons)
  useEffect(() => {
    // Use a more specific target if possible, otherwise window
    window.addEventListener('openReportModal', handleOpenReportModal);
    return () => {
      window.removeEventListener('openReportModal', handleOpenReportModal);
    };
  }, []); // Empty dependency array, listener setup once

  return (
    <div className="relative w-full h-[calc(100vh-4.5rem)]" id="map-component">
      <MapCanvas
        bins    ={trashOn ? bins : []}
        reports ={pollOn  ? reports.filter(r => show311 || r.type !== '311') : []} // Filter 311 based on toggle
        show311 ={show311} // Prop might not be needed if filtering here
        userId  ={userId}
        onDelete={actions.del}
        onClean ={actions.openClean} // Pass the function to open clean modal
        userLocation={location} // Pass location down
        loading={loading}
      />

      <FiltersPanel
        showTrashBins={trashOn}
        toggleTrashBins={setTrashOn}
        showPollution={pollOn}
        togglePollution={setPollOn}
        show311={show311}
        toggle311={setShow311}
        // Pass currentZoom if MapCanvas provides it via callback
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
      
      {/* FloatingButtons can now dispatchEvent('openReportModal') */}

      {/* Removed Leaflet script tags - map lib loaded by MapCanvas */}
    </div>
  );
} 