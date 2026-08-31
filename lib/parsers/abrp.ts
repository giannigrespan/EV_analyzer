import { parseTripCsv, type TripRow } from "./trip-common";
import type { ParseOutcome } from "./types";

// ABRP's trip history export format is not confirmed yet (its public API is
// mainly for pushing live telemetry, not pulling historical trips back out).
// These aliases target the most likely headers for a manually exported trip
// log and should be refined once a real sample export is available.
const ABRP_ALIASES = {
  date: ["date", "start time", "trip start"],
  distanceKm: ["distance (km)", "distance", "km"],
  energyKwh: [
    "energy used (kwh)",
    "energy consumption (kwh)",
    "kwh used",
    "energy",
  ],
  odometerKm: ["odometer (km)", "odometer"],
  cost: [],
  batteryStartPct: ["soc start (%)", "start soc", "battery start (%)"],
  batteryEndPct: ["soc end (%)", "end soc", "battery end (%)"],
} as const;

export function parseAbrpCsv(
  csvText: string,
  userId: string,
  vehicleId: string | null
): ParseOutcome<TripRow> {
  return parseTripCsv(csvText, userId, vehicleId, "abrp", ABRP_ALIASES);
}
