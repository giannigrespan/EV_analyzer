import Papa from "papaparse";
import type { TablesInsert } from "@/lib/supabase/database.types";
import {
  findColumn,
  parseDateTime,
  parseNumber,
  type ParseOutcome,
  type ParsedRowError,
} from "./types";

// Matches the real "sessions_<id>_<from>_to_<to>.csv" export from the
// Wallbox app (semicolon-delimited, Italian decimal commas, DD/MM/YYYY
// timestamps). Falls back to a couple of alternate header spellings in
// case other Wallbox models/exports differ slightly.
const COLUMN_ALIASES = {
  start: ["started at", "start", "start time", "charging start"],
  end: ["ended at", "end", "end time", "charging end"],
  totalEnergy: ["total energy (kwh)", "energy (kwh)", "kwh"],
  gridEnergy: ["grid energy (kwh)"],
} as const;

export type WallboxSessionRow = TablesInsert<"charging_sessions">;

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
    totalEnergy: findColumn(headers, COLUMN_ALIASES.totalEnergy),
    gridEnergy: findColumn(headers, COLUMN_ALIASES.gridEnergy),
  };

  const errors: ParsedRowError[] = [];
  const rows: WallboxSessionRow[] = [];

  if (!col.start || !col.end || !col.totalEnergy) {
    errors.push({
      row: 0,
      message: `Colonne non riconosciute nel file. Intestazioni trovate: ${
        headers.join(", ") || "nessuna"
      }. Attese: inizio ricarica, fine ricarica, energia totale (kWh).`,
    });
    return { rows, errors, rowsTotal: parsed.data.length };
  }

  parsed.data.forEach((raw, index) => {
    const rowNumber = index + 2;
    const endRaw = raw[col.end!]?.trim();

    // Sessions still in progress ("In corso") have no final energy total yet.
    if (endRaw && /^in corso$/i.test(endRaw)) {
      return;
    }

    const startedAt = parseDateTime(raw[col.start!]);
    const endedAt = parseDateTime(endRaw);
    const totalEnergyKwh = parseNumber(raw[col.totalEnergy!]);
    const gridEnergyKwh = col.gridEnergy
      ? parseNumber(raw[col.gridEnergy])
      : null;

    // A session with no energy delivered (a brief plug touch, or a session
    // that never actually charged) isn't worth surfacing as an import error.
    if (totalEnergyKwh === null || totalEnergyKwh <= 0) {
      return;
    }

    if (!startedAt || !endedAt) {
      errors.push({
        row: rowNumber,
        message: `Riga non valida (data di inizio o fine non leggibile): ${JSON.stringify(
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
      energy_kwh: totalEnergyKwh,
      grid_energy_kwh: gridEnergyKwh ?? undefined,
      location_type: "home",
    });
  });

  return { rows, errors, rowsTotal: parsed.data.length };
}
