import type { PollutionReport } from "@/components/map/types";

const AUSTIN_311_ENDPOINT = "https://data.austintexas.gov/resource/xwdj-i9he.json";
const AUSTIN_311_MAX_ATTEMPTS = 3;
const AUSTIN_311_TIMEOUT_MS = 20_000;

const AUSTIN_BOUNDS = {
  minLat: 29.95,
  maxLat: 30.6,
  minLon: -98.15,
  maxLon: -97.35,
};

const POLLUTION_SERVICE_TYPES = [
  "ARR - Street Sweeping",
  "ARR Street Sweeping",
  "ZZZ ARR Street Sweeping",
  "Debris in Street",
  "Zz_ARR - Storm Debris Collection",
  "TPW - Debris in Street",
  "SBO - Debris in Street",
  "Town Lake Debris Issues",
  "ZZ ARR - Storm Debris Collection",
  "ARR - Storm Debris Collection",
  "ARR - Collection Truck Spillage",
  "ARR - Spillage Trash/Fluids",
  "Roadway Spillage",
  "SBO - Roadway Spillage",
  "TPW - Roadway Spillage",
];

type Austin311Point = {
  type?: string;
  coordinates?: [number, number];
};

export interface Austin311ServiceRequest {
  sr_number?: string;
  sr_type_desc?: string;
  sr_created_date?: string;
  sr_closed_date?: string | null;
  sr_status_desc?: string | null;
  sr_location_lat?: string;
  sr_location_long?: string;
  sr_location_lat_long?: Austin311Point | string | null;
}

export interface Austin311FetchResult {
  reports: PollutionReport[];
  sourceCount: number;
  skippedCount: number;
  fetchedAt: string;
  lookbackDays: number;
}

function socrataString(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function buildAustin311Query(now = new Date(), lookbackDays = 90, limit = 1000) {
  const since = new Date(now);
  since.setDate(now.getDate() - lookbackDays);

  const serviceTypes = POLLUTION_SERVICE_TYPES.map(socrataString).join(",");
  const sinceIso = since.toISOString().split(".")[0];
  const nowIso = now.toISOString().split(".")[0];

  return [
    "SELECT sr_number, sr_type_desc, sr_status_desc, sr_created_date, sr_closed_date, sr_location_lat, sr_location_long, sr_location_lat_long",
    `WHERE sr_type_desc in (${serviceTypes})`,
    `AND sr_created_date >= ${socrataString(sinceIso)} :: floating_timestamp`,
    `AND sr_created_date <= ${socrataString(nowIso)} :: floating_timestamp`,
    "ORDER BY sr_created_date DESC",
    `LIMIT ${limit}`,
  ].join(" ");
}

function parseCoordinatePair(report: Austin311ServiceRequest): [number, number] | null {
  const lat = Number.parseFloat(report.sr_location_lat ?? "");
  const lon = Number.parseFloat(report.sr_location_long ?? "");

  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    return [lat, lon];
  }

  const point = report.sr_location_lat_long;
  if (point && typeof point === "object" && Array.isArray(point.coordinates)) {
    const [pointLon, pointLat] = point.coordinates;
    if (Number.isFinite(pointLat) && Number.isFinite(pointLon)) {
      return [pointLat, pointLon];
    }
  }

  return null;
}

function isAustinCoordinate([lat, lon]: [number, number]) {
  return (
    lat >= AUSTIN_BOUNDS.minLat &&
    lat <= AUSTIN_BOUNDS.maxLat &&
    lon >= AUSTIN_BOUNDS.minLon &&
    lon <= AUSTIN_BOUNDS.maxLon
  );
}

export function mapAustin311Reports(reports: Austin311ServiceRequest[], lookbackDays = 90): Austin311FetchResult {
  const mapped = reports.flatMap((report) => {
    const location = parseCoordinatePair(report);
    if (!location || !isAustinCoordinate(location) || !report.sr_created_date) {
      return [];
    }

    const status = report.sr_status_desc ? ` (${report.sr_status_desc})` : "";
    const description = `${report.sr_type_desc ?? "Austin 311 pollution report"}${status}`;
    const id = report.sr_number
      ? `311-${report.sr_number}`
      : `311-${report.sr_created_date}-${location[0]}-${location[1]}`;

    return [{
      id,
      location,
      type: "311" as const,
      severity: report.sr_closed_date ? 2 : 3,
      timestamp: report.sr_created_date,
      cleaned_up: Boolean(report.sr_closed_date),
      cleaned_at: report.sr_closed_date ?? null,
      description,
    }];
  });

  return {
    reports: mapped,
    sourceCount: reports.length,
    skippedCount: reports.length - mapped.length,
    fetchedAt: new Date().toISOString(),
    lookbackDays,
  };
}

async function fetchAustin311Json(url: string): Promise<Austin311ServiceRequest[]> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= AUSTIN_311_MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AUSTIN_311_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
        },
        next: { revalidate: 15 * 60 },
        signal: controller.signal,
      });

      if (response.ok) {
        return await response.json() as Austin311ServiceRequest[];
      }

      const body = await response.text();
      lastError = new Error(`Austin 311 request failed with ${response.status}: ${body.slice(0, 200)}`);

      if (response.status < 500 || attempt === AUSTIN_311_MAX_ATTEMPTS) {
        throw lastError;
      }
    } catch (error) {
      lastError = error;

      if (attempt === AUSTIN_311_MAX_ATTEMPTS) {
        throw error;
      }
    } finally {
      clearTimeout(timeout);
    }

    await wait(400 * attempt);
  }

  throw lastError instanceof Error ? lastError : new Error("Austin 311 request failed");
}

export async function fetchAustin311PollutionReports(): Promise<Austin311FetchResult> {
  const lookbackDays = 90;
  const query = buildAustin311Query(new Date(), lookbackDays);
  const url = `${AUSTIN_311_ENDPOINT}?$query=${encodeURIComponent(query)}`;
  const data = await fetchAustin311Json(url);
  return mapAustin311Reports(data, lookbackDays);
}
