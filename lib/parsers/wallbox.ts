import Papa from "papaparse";
import type { TablesInsert } from "@/lib/supabase/database.types";
import {
  findColumn,
  parseDateTime,
  parseNumber,
  type ParseOutcome,
  type ParsedRowError,
} from "./types";

// myWallbox CSV export column names are not confirmed yet; these aliases
// cover the most likely variants (a session either has an explicit end time,
// or a duration to add to the start time) and should be extended once a
// real sample export is available.
const COLUMN_ALIASES = {
  start: ["start", "start time", "charging start", "session start", "start date"],
  end: ["end", "end time", "charging end", "session end", "end date"],
  duration: ["duration", "charging time", "session duration"],
  energy: [
    "energy (kwh)",
    "energy",
    "kwh",
    "charged energy (kwh)",
    "charged energy",
  ],
} as const;

export type WallboxSessionRow = TablesInsert<"charging_sessions">;

function parseDurationToMs(value: string): number | null {
  const trimmed = value.trim();
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    return Number(trimmed) * 60_000; // plain number: assume minutes
  }
  const parts = trimmed.split(":").map(Number);
  if (parts.some((p) => Number.isNaN(p))) return null;
  if (parts.length === 3) {
    const [h, m, s] = parts;
    return (h * 3600 + m * 60 + s) * 1000;
  }
  if (parts.length === 2) {
    const [h, m] = parts;
    return (h * 3600 + m * 60) * 1000;
  }
  return null;
}

export function parseWallboxCsv(
  csvText: string,
  userId: string,
  vehicleId: string | null
): ParseOutcome<WallboxSessionRow> {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  const headers = parsed.meta.fields ?? [];
  const col = {
    start: findColumn(headers, COLUMN_ALIASES.start),
    end: findColumn(headers, COLUMN_ALIASES.end),
    duration: findColumn(headers, COLUMN_ALIASES.duration),
    energy: findColumn(headers, COLUMN_ALIASES.energy),
  };

  const errors: ParsedRowError[] = [];
  const rows: WallboxSessionRow[] = [];

  if (!col.start || !col.energy || (!col.end && !col.duration)) {
    errors.push({
      row: 0,
      message: `Colonne non riconosciute nel file. Intestazioni trovate: ${
        headers.join(", ") || "nessuna"
      }. Attese: inizio ricarica, fine (o durata), energia (kWh).`,
    });
    return { rows, errors, rowsTotal: parsed.data.length };
  }

  parsed.data.forEach((raw, index) => {
    const rowNumber = index + 2;
    const startedAt = parseDateTime(raw[col.start!]);
    const energyKwh = parseNumber(raw[col.energy!]);

    let endedAt: Date | null = null;
    if (col.end) {
      endedAt = parseDateTime(raw[col.end]);
    } else if (col.duration && startedAt) {
      const durationMs = parseDurationToMs(raw[col.duration]);
      if (durationMs !== null) {
        endedAt = new Date(startedAt.getTime() + durationMs);
      }
    }

    if (!startedAt || !endedAt || energyKwh === null || energyKwh <= 0) {
      errors.push({
        row: rowNumber,
        message: `Riga non valida (inizio, fine/durata o energia mancante/illeggibile): ${JSON.stringify(
          raw
        )}`,
      });
      return;
    }

    if (endedAt <= startedAt) {
      errors.push({
        row: rowNumber,
        message: `Fine ricarica non successiva all'inizio: ${JSON.stringify(raw)}`,
      });
      return;
    }

    rows.push({
      user_id: userId,
      vehicle_id: vehicleId,
      started_at: startedAt.toISOString(),
      ended_at: endedAt.toISOString(),
      energy_kwh: energyKwh,
      location_type: "home",
    });
  });

  return { rows, errors, rowsTotal: parsed.data.length };
}
