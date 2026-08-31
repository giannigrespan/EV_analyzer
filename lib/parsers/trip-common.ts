import Papa from "papaparse";
import type { TablesInsert } from "@/lib/supabase/database.types";
import {
  findColumn,
  parseDateTime,
  parseNumber,
  type ParseOutcome,
  type ParsedRowError,
} from "./types";

export type TripRow = TablesInsert<"trips">;

export type TripColumnAliases = {
  date: readonly string[];
  distanceKm: readonly string[];
  energyKwh: readonly string[];
  odometerKm: readonly string[];
  cost: readonly string[];
  batteryStartPct: readonly string[];
  batteryEndPct: readonly string[];
};

/**
 * Shared parser for trip-log style CSV exports (Drivvo, ABRP). Both apps
 * export broadly the same shape - a date, a distance, and some subset of
 * energy used/odometer/cost/battery % - just under different header names,
 * which is configured per source via `aliases`.
 */
export function parseTripCsv(
  csvText: string,
  userId: string,
  vehicleId: string | null,
  source: "drivvo" | "abrp",
  aliases: TripColumnAliases
): ParseOutcome<TripRow> {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  const headers = parsed.meta.fields ?? [];
  const col = {
    date: findColumn(headers, aliases.date),
    distanceKm: findColumn(headers, aliases.distanceKm),
    energyKwh: findColumn(headers, aliases.energyKwh),
    odometerKm: findColumn(headers, aliases.odometerKm),
    cost: findColumn(headers, aliases.cost),
    batteryStartPct: findColumn(headers, aliases.batteryStartPct),
    batteryEndPct: findColumn(headers, aliases.batteryEndPct),
  };

  const errors: ParsedRowError[] = [];
  const rows: TripRow[] = [];

  if (!col.date || !col.distanceKm) {
    errors.push({
      row: 0,
      message: `Colonne non riconosciute nel file. Intestazioni trovate: ${
        headers.join(", ") || "nessuna"
      }. Attese almeno: data, distanza (km).`,
    });
    return { rows, errors, rowsTotal: parsed.data.length };
  }

  parsed.data.forEach((raw, index) => {
    const rowNumber = index + 2;
    const startedAt = parseDateTime(raw[col.date!]);
    const distanceKm = parseNumber(raw[col.distanceKm!]);

    if (!startedAt || distanceKm === null || distanceKm <= 0) {
      errors.push({
        row: rowNumber,
        message: `Riga non valida (data o distanza mancante/illeggibile): ${JSON.stringify(
          raw
        )}`,
      });
      return;
    }

    const energyKwh = col.energyKwh ? parseNumber(raw[col.energyKwh]) : null;
    const odometerKm = col.odometerKm ? parseNumber(raw[col.odometerKm]) : null;
    const cost = col.cost ? parseNumber(raw[col.cost]) : null;
    const batteryStartPct = col.batteryStartPct
      ? parseNumber(raw[col.batteryStartPct])
      : null;
    const batteryEndPct = col.batteryEndPct
      ? parseNumber(raw[col.batteryEndPct])
      : null;

    rows.push({
      user_id: userId,
      vehicle_id: vehicleId,
      source,
      started_at: startedAt.toISOString(),
      distance_km: distanceKm,
      energy_used_kwh: energyKwh ?? undefined,
      efficiency_wh_per_km:
        energyKwh && distanceKm ? (energyKwh * 1000) / distanceKm : undefined,
      odometer_km: odometerKm ?? undefined,
      cost: cost ?? undefined,
      battery_start_pct: batteryStartPct ?? undefined,
      battery_end_pct: batteryEndPct ?? undefined,
    });
  });

  return { rows, errors, rowsTotal: parsed.data.length };
}
