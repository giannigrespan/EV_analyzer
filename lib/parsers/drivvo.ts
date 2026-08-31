import { parseTripCsv, type TripRow } from "./trip-common";
import type { ParseOutcome } from "./types";

// Drivvo's CSV export format is not confirmed yet; these aliases target the
// most likely headers for an EV logbook entry (date, distance/odometer,
// energy charged, cost) and should be refined with a real sample export.
const DRIVVO_ALIASES = {
  date: ["date", "data"],
  distanceKm: ["distance (km)", "distance", "km", "trip distance (km)"],
  energyKwh: ["energy (kwh)", "amount", "kwh", "consumption (kwh)"],
  odometerKm: ["odometer", "odometer (km)", "mileage"],
  cost: ["total price", "total cost", "cost", "price"],
  batteryStartPct: [],
  batteryEndPct: [],
} as const;

export function parseDrivvoCsv(
  csvText: string,
  userId: string,
  vehicleId: string | null
): ParseOutcome<TripRow> {
  return parseTripCsv(csvText, userId, vehicleId, "drivvo", DRIVVO_ALIASES);
}
