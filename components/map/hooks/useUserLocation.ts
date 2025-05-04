import { useEffect, useState, useCallback } from "react"
import { useToast } from "@/components/ui/use-toast"

// Austin, TX coordinates
const DEFAULT_LOCATION: [number, number] = [-97.7431, 30.2672];

// Geolocation options based on suggestions
const GEO_OPTIONS = {
  enableHighAccuracy: false,   // Fall back to coarse IP/Wi-Fi first
  timeout: 60000,           // Increased timeout to 60 seconds
  maximumAge: 300000        // Accept positions up to 5 minutes old
};

export default function useUserLocation() {
  const { toast } = useToast();
  const [location, setLocation] = useState<[number, number]>(DEFAULT_LOCATION);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasShownError, setHasShownError] = useState(false);

  const handleSuccess = useCallback((position: GeolocationPosition) => {
    const { longitude, latitude, accuracy } = position.coords;
    console.log('Geolocation Success:', { longitude, latitude, accuracy }); // Log success
    setLocation([longitude, latitude]);
    setLoading(false);
    setError(null);
    // Reset error shown flag on success, so errors show again if they recur
    setHasShownError(false);
  }, []);

  const handleError = useCallback((geoError: GeolocationPositionError) => {
    console.error("Geolocation error:", geoError);

    // Only show error toast once per distinct error occurrence
    if (!hasShownError) {
      let errorMessage = "Using default location (Austin, TX).";
      let errorTitle = "Location Unavailable";
      let toastVariant: "warning" | "default" = "warning";

      switch (geoError.code) {
        case 1: // PERMISSION_DENIED
          errorTitle = "Location Permission Denied";
          errorMessage += " Please enable location services in your browser/OS settings.";
          break;
        case 2: // POSITION_UNAVAILABLE
          errorTitle = "Location Unavailable";
          errorMessage = "Could not determine location yet. Using last known position.";
          toastVariant = "default";
          break;
        case 3: // TIMEOUT
          errorTitle = "Location Timeout";
          errorMessage += " Location request timed out. Map functionality may be limited.";
          break;
        default:
            errorMessage += " An unknown error occurred.";
            break;
      }

      // Handle insecure context specifically
      if (geoError.message === 'Insecure context') {
        errorTitle = "Insecure Context";
        errorMessage = "Location services require a secure (HTTPS) connection. Using default location.";
      }

      toast({
        title: errorTitle,
        description: errorMessage,
        variant: toastVariant,
      });
      setHasShownError(true);
    }

    // Fall back to default location only if permission denied (code 1)
    if (geoError.code === 1) {
      setLocation(DEFAULT_LOCATION);
    }
    setLoading(false);
    setError(geoError.message || "Could not get location.");
  }, [toast, hasShownError]);

  useEffect(() => {
    // Check for geolocation support first
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser.");
      setLocation(DEFAULT_LOCATION);
      setLoading(false);
      return;
    }

    // Bail out early on insecure context (as suggested)
    if (typeof window !== 'undefined' && !window.isSecureContext) {
        const insecureError = {
          code: 1,
          message: 'Insecure context',
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        } as GeolocationPositionError;
        handleError(insecureError);
        return;
    }

    // First attempt a single-shot position to get quick result on browsers that deny watchPosition initially
    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, GEO_OPTIONS);

    // Then start watchPosition for continuous updates
    setLoading(true); // Set loading true when starting watch
    const watchId = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      GEO_OPTIONS
    );

    // Cleanup function to clear the watch
    return () => navigator.geolocation.clearWatch(watchId);

  }, [handleSuccess, handleError]); // Dependencies

  return { location, loading, error };
} 