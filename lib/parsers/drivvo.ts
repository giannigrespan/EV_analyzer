import { parseTripCsv, type TripRow } from "./trip-common";
import {
  fixMalformedQuotedHeader,
  stripLeadingCommentLines,
  type ParseOutcome,
} from "./types";

// Matches the real Drivvo "##Refuelling" CSV export (Italian headers,
// comma-delimited, a leading "##Refuelling" section marker line before the
// real header row). "Volume" is the kWh charged for an electric fuel-up;
// "Consumo" (its own km/kWh string) is intentionally not used - efficiency
// is derived from Volume/Distanza instead, for a consistent unit across
// all sources.
//
// Wallbox is the ground truth for charging energy/cost; Drivvo's own
// "Costo totale" is a manual, often-approximate entry, so it's deliberately
// not mapped here - the cost is instead estimated downstream from the
// user's real average Wallbox cost/kWh. Drivvo is only trusted for the
// distance travelled between charges.
const DRIVVO_ALIASES = {
  date: ["data", "date"],
  distanceKm: ["distanza", "distance (km)", "distance", "km"],
  energyKwh: ["volume", "energy (kwh)", "amount", "kwh"],
  odometerKm: ["contachilometri (km)", "odometer", "odometer (km)", "mileage"],
  cost: [],
  batteryStartPct: ["batteria iniziale (%)", "battery start (%)"],
  batteryEndPct: ["batteria finale (%)", "battery end (%)"],
} as const;

export function parseDrivvoCsv(
  csvText: string,
  userId: string,
  vehicleId: string | null
): ParseOutcome<TripRow> {
  const cleaned = fixMalformedQuotedHeader(stripLeadingCommentLines(csvText));
  return parseTripCsv(cleaned, userId, vehicleId, "drivvo", DRIVVO_ALIASES);
}
