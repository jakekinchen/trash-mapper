import { useEffect, useState, useCallback, useRef } from "react"
import { useToast } from "@/components/ui/use-toast"
import { Point } from 'pigeon-maps'; // Import Point type
import haversine from 'haversine-distance'; // Import haversine

// Austin, TX coordinates [lat, lng] for Pigeon Maps
const DEFAULT_LOCATION: Point = [30.2672, -97.7431];

// Geolocation options based on suggestions
const GEO_OPTIONS = {
  enableHighAccuracy: true,   // Force high accuracy
  timeout: 60000,           // Increased timeout to 60 seconds
  maximumAge: 300000        // Accept positions up to 5 minutes old
};

// Constants for location update logic
const THRESHOLD_M = 5; // Minimum distance change (meters) to accept update
const MIN_INTERVAL_MS = 2000; // Minimum time interval (milliseconds) between updates

export default function useUserLocation() {
  const { toast } = useToast();
  // Use Point type for state
  const [location, setLocation] = useState<Point | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasShownError, setHasShownError] = useState(false);

  // Use refs to store last accepted location and timestamp without causing re-renders
  const lastAcceptedLocationRef = useRef<Point | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);
  const throttleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSuccess = useCallback((position: GeolocationPosition) => {
    const { longitude, latitude, accuracy } = position.coords;
    const now = Date.now();
    const currentLocation: Point = [latitude, longitude];

    console.log('[useUserLocation] watchPosition fired:', { lat: latitude, lon: longitude, acc: accuracy, time: now });

    // Clear any existing throttle timeout
    if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
    }

    // Set a new timeout to process the location after the interval
    throttleTimeoutRef.current = setTimeout(() => {
        const timeSinceLastUpdate = now - lastUpdateTimeRef.current;
        const lastAcceptedLocation = lastAcceptedLocationRef.current;

        // Check if enough time has passed
        if (timeSinceLastUpdate < MIN_INTERVAL_MS) {
          console.log(`[useUserLocation] Throttled: ${timeSinceLastUpdate}ms < ${MIN_INTERVAL_MS}ms`);
          return;
        }

        // Check if location changed significantly (or if it's the first location)
        const distanceMoved = lastAcceptedLocation ? haversine(lastAcceptedLocation, currentLocation) : Infinity;

        if (distanceMoved >= THRESHOLD_M) {
          console.log(`[useUserLocation] Accepted: Moved ${distanceMoved.toFixed(1)}m >= ${THRESHOLD_M}m`);
          lastAcceptedLocationRef.current = currentLocation;
          lastUpdateTimeRef.current = now;
          setLocation(currentLocation);
          setLoading(false); // Considered loaded once we have a valid location
          setError(null);
          setHasShownError(false); // Reset error display on new valid location
        } else {
            console.log(`[useUserLocation] Ignored: Moved ${distanceMoved.toFixed(1)}m < ${THRESHOLD_M}m`);
            // If loading is still true because we haven't accepted a location yet, set it false now
            if (loading) setLoading(false);
        }
    }, 500); // Throttle check interval (process latest update every 500ms)

  }, [loading]); // Dependency array for useCallback - only loading needed here

  const handleError = useCallback((geoError: GeolocationPositionError) => {
    console.error("Geolocation error:", geoError);
    // Clear any pending throttle timeout on error
    if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
        throttleTimeoutRef.current = null;
    }

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
          errorMessage = "Could not determine location. Using default location.";
          toastVariant = "warning";
          break;
        case 3: // TIMEOUT
          errorTitle = "Location Timeout";
          errorMessage += " Location request timed out. Using default location.";
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
    if (!lastAcceptedLocationRef.current) { 
        setLocation(DEFAULT_LOCATION);
        lastAcceptedLocationRef.current = DEFAULT_LOCATION;
        lastUpdateTimeRef.current = Date.now();
    }
    setLoading(false);
    setError(geoError.message || "Could not get location.");
  }, [toast, hasShownError]); // Removed location dependency

  useEffect(() => {
    // Check for geolocation support first
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser.");
      setLocation(DEFAULT_LOCATION);
      lastAcceptedLocationRef.current = DEFAULT_LOCATION;
      lastUpdateTimeRef.current = Date.now();
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
    console.log('[useUserLocation] Started watchPosition with ID:', watchId);

    // Cleanup function to clear the watch
    return () => {
      console.log('[useUserLocation] Clearing watchPosition with ID:', watchId);
      navigator.geolocation.clearWatch(watchId);
      // Clear any pending throttle timeout on unmount
      if (throttleTimeoutRef.current) {
          clearTimeout(throttleTimeoutRef.current);
      }
    };

  }, [handleSuccess, handleError]); // Dependencies

  return { location, loading, error };
} 