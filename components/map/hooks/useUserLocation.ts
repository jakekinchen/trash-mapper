import { useEffect, useState, useCallback } from "react"
import { useToast } from "@/components/ui/use-toast"
import { Point } from 'pigeon-maps'; // Import Point type

// Austin, TX coordinates [lat, lng] for Pigeon Maps
const DEFAULT_LOCATION: Point = [30.2672, -97.7431];

// Geolocation options based on suggestions
const GEO_OPTIONS = {
  enableHighAccuracy: true,   // Force high accuracy
  timeout: 60000,           // Increased timeout to 60 seconds
  maximumAge: 300000        // Accept positions up to 5 minutes old
};

export default function useUserLocation() {
  const { toast } = useToast();
  // Use Point type for state
  const [location, setLocation] = useState<Point | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasShownError, setHasShownError] = useState(false);

  const handleSuccess = useCallback((position: GeolocationPosition) => {
    const { longitude, latitude, accuracy } = position.coords;
    console.log('Geolocation Success:', { longitude, latitude, accuracy }); // Log success
    // Set location state with [lat, lng]
    setLocation([latitude, longitude]); 
    setLoading(false);
    setError(null);
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

    // Fall back to default location if not already set and error occurs
    // Don't set default if already have a location from previous success
    if (!location) { 
        setLocation(DEFAULT_LOCATION);
    }
    setLoading(false);
    setError(geoError.message || "Could not get location.");
  }, [toast, hasShownError, location]); // Add location to dependency array

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

    // Start watchPosition for updates (will also provide initial position)
    // Removed initial getCurrentPosition as watchPosition handles it
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