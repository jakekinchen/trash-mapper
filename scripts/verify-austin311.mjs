const endpoint = "https://data.austintexas.gov/resource/xwdj-i9he.json";
const maxAttempts = 3;
const timeoutMs = 20_000;

const serviceTypes = [
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

const quote = (value) => `'${value.replaceAll("'", "''")}'`;
const now = new Date();
const since = new Date(now);
since.setDate(now.getDate() - 90);

const query = [
  "SELECT sr_number, sr_type_desc, sr_status_desc, sr_created_date, sr_closed_date, sr_location_lat, sr_location_long, sr_location_lat_long",
  `WHERE sr_type_desc in (${serviceTypes.map(quote).join(",")})`,
  `AND sr_created_date >= ${quote(since.toISOString().split(".")[0])} :: floating_timestamp`,
  `AND sr_created_date <= ${quote(now.toISOString().split(".")[0])} :: floating_timestamp`,
  "ORDER BY sr_created_date DESC",
  "LIMIT 1000",
].join(" ");

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchReportsWithRetry() {
  const url = `${endpoint}?$query=${encodeURIComponent(query)}`;
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });

      if (response.ok) {
        return response.json();
      }

      lastError = new Error(`Austin 311 verification failed: ${response.status} ${await response.text()}`);
      if (response.status < 500 || attempt === maxAttempts) {
        throw lastError;
      }
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts) {
        throw error;
      }
    } finally {
      clearTimeout(timeout);
    }

    await wait(400 * attempt);
  }

  throw lastError;
}

const reports = await fetchReportsWithRetry();
if (!Array.isArray(reports) || reports.length === 0) {
  throw new Error("Austin 311 verification returned no pollution reports");
}

const withCoordinates = reports.filter((report) => {
  const lat = Number.parseFloat(report.sr_location_lat ?? "");
  const lon = Number.parseFloat(report.sr_location_long ?? "");
  const point = report.sr_location_lat_long;
  return (
    Number.isFinite(lat) && Number.isFinite(lon)
  ) || (
    point &&
    Array.isArray(point.coordinates) &&
    Number.isFinite(point.coordinates[0]) &&
    Number.isFinite(point.coordinates[1])
  );
});

if (withCoordinates.length === 0) {
  throw new Error("Austin 311 verification returned reports without usable coordinates");
}

console.log(`Austin 311 verification passed: ${reports.length} recent pollution reports, ${withCoordinates.length} with coordinates.`);
