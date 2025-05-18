// TODO: Review if Buffer import is truly needed here after refactor

export interface TrashBin {
  id: string;
  location: [number, number]; // [latitude, longitude]
  name?: string;
  capacity?: string;
  lastEmptied?: string;
  properties?: {
    element_type?: string;
    osmid?: number;
    amenity?: string;
    check_date?: string;
    waste?: string;
    bus?: string;
    information?: string;
    colour?: string;
    covered?: string;
    material?: string;
    vending?: string;
    operator?: string;
    backrest?: string;
    'source:feature'?: string;
    'survey:date'?: string;
    indoor?: string;
    image?: string;
  };
}

// Represents the raw report data from Supabase (used in fetching)
export interface SupabaseReport {
  id: string;
  user_id: string;
  geom: string; // WKB format
  severity: number;
  created_at: string;
  image_url: string;
  // These might be added by API or fetched, ensure they align with DB schema
  is_valid_environment?: boolean;
  cleaned_up?: boolean;
  cleaned_at?: string | null;
  cleaned_image_url?: string | null;
  description?: string | null; // Assuming description might be in DB
}

// Represents the processed pollution report used in the frontend map state
export interface PollutionReport {
  id: string;
  location: [number, number]; // [latitude, longitude]
  type: "user" | "311" | "historical"; // Added historical based on old map.tsx
  severity: number; // 1-5
  description?: string;
  imageUrl?: string;
  timestamp: string;
  cleaned_up: boolean;
  user_id?: string;
  cleaned_at?: string | null; // Added from clean feature
  cleaned_image_url?: string | null; // Added from clean feature
}

// From austin_trash_bins.geojson
export interface GeoJSONFeature {
  type: string;
  properties: TrashBin['properties']; // Reuse properties from TrashBin
  geometry: {
    type: string;
    coordinates: [number, number];
  };
}

export interface GeoJSONData {
  type: string;
  features: GeoJSONFeature[];
}

// From Austin 311 API
export interface Austin311Report {
  sr_type_desc: string;
  sr_created_date: string;
  sr_closed_date: string | null;
  sr_location_lat: string;
  sr_location_long: string;
  sr_location_lat_long: string; // May contain "POINT (lon lat)"
} 