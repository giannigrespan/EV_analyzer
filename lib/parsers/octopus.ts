import Papa from "papaparse";
import type { TablesInsert } from "@/lib/supabase/database.types";
import {
  findColumn,
  parseDateOnly,
  parseNumber,
  type ParseOutcome,
  type ParsedRowError,
} from "./types";

// The exact export format from Octopus's bill/consumption download is not
// confirmed yet; these aliases cover the most likely header names for a
// monthly bill summary (period + total kWh + total cost) and should be
// extended once a real sample file is available.
const COLUMN_ALIASES = {
  periodStart: ["period start", "billing period start", "from", "start date"],
  periodEnd: ["period end", "billing period end", "to", "end date"],
  totalKwh: [
    "total kwh",
    "consumption (kwh)",
    "kwh",
    "total consumption",
    "total consumption (kwh)",
  ],
  totalCost: ["total cost", "total cost (£)", "cost", "amount", "total amount"],
  standingCharge: [
    "standing charge",
    "standing charge total",
    "standing charge (£)",
  ],
} as const;

export type OctopusBillRow = TablesInsert<"electricity_bills">;

export function parseOctopusBillCsv(
  csvText: string,
  userId: string,
  tariffId: string | null
): ParseOutcome<OctopusBillRow> {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  const headers = parsed.meta.fields ?? [];
  const col = {
    periodStart: findColumn(headers, COLUMN_ALIASES.periodStart),
    periodEnd: findColumn(headers, COLUMN_ALIASES.periodEnd),
    totalKwh: findColumn(headers, COLUMN_ALIASES.totalKwh),
    totalCost: findColumn(headers, COLUMN_ALIASES.totalCost),
    standingCharge: findColumn(headers, COLUMN_ALIASES.standingCharge),
  };

  const errors: ParsedRowError[] = [];
  const rows: OctopusBillRow[] = [];

  if (!col.periodStart || !col.periodEnd || !col.totalKwh || !col.totalCost) {
    errors.push({
      row: 0,
      message: `Colonne non riconosciute nel file. Intestazioni trovate: ${
        headers.join(", ") || "nessuna"
      }. Attese: periodo inizio/fine, kWh totali, costo totale.`,
    });
    return { rows, errors, rowsTotal: parsed.data.length };
  }

  parsed.data.forEach((raw, index) => {
    const rowNumber = index + 2; // header line + 1-based rows
    const periodStart = parseDateOnly(raw[col.periodStart!]);
    const periodEnd = parseDateOnly(raw[col.periodEnd!]);
    const totalKwh = parseNumber(raw[col.totalKwh!]);
    const totalCost = parseNumber(raw[col.totalCost!]);
    const standingCharge = col.standingCharge
      ? parseNumber(raw[col.standingCharge])
      : null;

    if (!periodStart || !periodEnd || totalKwh === null || totalCost === null) {
      errors.push({
        row: rowNumber,
        message: `Riga non valida (periodo, kWh o costo mancante/illeggibile): ${JSON.stringify(
          raw
        )}`,
      });
      return;
    }

    rows.push({
      user_id: userId,
      tariff_id: tariffId,
      billing_period_start: periodStart,
      billing_period_end: periodEnd,
      total_kwh: totalKwh,
      total_cost: totalCost,
      standing_charge_total: standingCharge ?? undefined,
    });
  });

  return { rows, errors, rowsTotal: parsed.data.length };
}
