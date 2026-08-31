import { extractText, getDocumentProxy } from "unpdf";
import type { TablesInsert } from "@/lib/supabase/database.types";
import type { ParseOutcome, ParsedRowError } from "./types";

export type OctopusBillRow = TablesInsert<"electricity_bills">;

// Patterns matched against a real Octopus Energy Italia "Bolletta luce" PDF
// (e.g. "PERIODO DI RIFERIMENTO: dal 01/07/2026 al 31/07/2026",
// "CONSUMO FATTURATO: 719 kWh", "TOTALE DA PAGARE 193,56 €"). Kept as an
// ordered list of alternatives so minor wording differences across bills
// (e.g. "periodo di fatturazione") still match.
const PERIOD_PATTERNS = [
  /periodo\s+di\s+riferimento[:\s]*dal\s+(\d{2}\/\d{2}\/\d{4})\s+al\s+(\d{2}\/\d{2}\/\d{4})/i,
  /periodo\s+di\s+fatturazione[:\s]*dal\s+(\d{2}\/\d{2}\/\d{4})\s+al\s+(\d{2}\/\d{2}\/\d{4})/i,
  /dal\s+(\d{2}\/\d{2}\/\d{4})\s+al\s+(\d{2}\/\d{2}\/\d{4})/i,
  /periodo[:\s]*(\d{2}\/\d{2}\/\d{4})\s*[-–]\s*(\d{2}\/\d{2}\/\d{4})/i,
];

const TOTAL_KWH_PATTERNS = [
  /consumo\s+fatturato[:\s]*([\d.,]+)\s*kwh/i,
  /consumo\s+totale[:\s]*([\d.,]+)\s*kwh/i,
  /totale\s+consumo[:\s]*([\d.,]+)\s*kwh/i,
  /consumo[:\s]*([\d.,]+)\s*kwh/i,
];

const TOTAL_COST_PATTERNS = [
  /totale\s+da\s+pagare[:\s]*€?\s*([\d.,]+)\s*€?/i,
  /importo\s+totale[:\s]*€?\s*([\d.,]+)\s*€?/i,
  /totale\s+bolletta[:\s]*€?\s*([\d.,]+)\s*€?/i,
];

// "Quota fissa" is followed by both a per-month unit price ("9,92 €/mese")
// and the line total ("9,92 €"); only the total (an amount not immediately
// followed by "/...") is the standing charge we want.
const STANDING_CHARGE_PATTERNS = [
  /quota\s+fissa[\s\S]{0,80}?([\d]+(?:[.,]\d+)?)\s*€(?!\s*\/)/i,
  /costo\s+fisso[:\s]*€?\s*([\d.,]+)\s*€?/i,
];

// The "Altre partite" section breaks out Octopus Go's own energy commodity
// spend ("Spesa per la materia energia") from network charges, system costs,
// and taxes - the only cost line directly comparable to a €/kWh charging
// rate, so it's extracted separately from the bill's grand total.
const ENERGY_COMMODITY_COST_PATTERNS = [
  /altre\s+partite\s*-\s*octopus\s+go\s*-\s*spesa\s+per\s+la\s+materia\s+energia[\s\S]{0,20}?([\d]+(?:[.,]\d+)?)\s*€/i,
  /spesa\s+per\s+la\s+materia\s+energia[\s\S]{0,20}?([\d]+(?:[.,]\d+)?)\s*€/i,
];

function matchFirst(text: string, patterns: RegExp[]): RegExpMatchArray | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match;
  }
  return null;
}

function parseItalianNumber(value: string): number | null {
  const cleaned = value.trim().replace(/\./g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function parseItalianDate(value: string): string | null {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

/**
 * Extracts the billing period, total kWh, and total cost from the plain text
 * of an Octopus bill PDF. Split out from parseOctopusBillPdf so the field
 * extraction logic is testable without a real PDF file.
 */
export function parseOctopusBillText(
  text: string,
  userId: string,
  tariffId: string | null
): ParseOutcome<OctopusBillRow> {
  const errors: ParsedRowError[] = [];
  const normalized = text.replace(/\s+/g, " ").trim();

  const periodMatch = matchFirst(normalized, PERIOD_PATTERNS);
  const kwhMatch = matchFirst(normalized, TOTAL_KWH_PATTERNS);
  const costMatch = matchFirst(normalized, TOTAL_COST_PATTERNS);
  const standingMatch = matchFirst(normalized, STANDING_CHARGE_PATTERNS);
  const energyCommodityMatch = matchFirst(normalized, ENERGY_COMMODITY_COST_PATTERNS);

  const periodStart = periodMatch ? parseItalianDate(periodMatch[1]) : null;
  const periodEnd = periodMatch ? parseItalianDate(periodMatch[2]) : null;
  const totalKwh = kwhMatch ? parseItalianNumber(kwhMatch[1]) : null;
  const totalCost = costMatch ? parseItalianNumber(costMatch[1]) : null;
  const standingCharge = standingMatch ? parseItalianNumber(standingMatch[1]) : null;
  const energyCommodityCost = energyCommodityMatch
    ? parseItalianNumber(energyCommodityMatch[1])
    : null;

  if (!periodStart || !periodEnd || totalKwh === null || totalCost === null) {
    errors.push({
      row: 0,
      message:
        "Impossibile leggere la bolletta PDF: periodo di fatturazione, kWh totali o costo totale non trovati nel testo estratto.",
    });
    return { rows: [], errors, rowsTotal: 1 };
  }

  const row: OctopusBillRow = {
    user_id: userId,
    tariff_id: tariffId,
    billing_period_start: periodStart,
    billing_period_end: periodEnd,
    total_kwh: totalKwh,
    total_cost: totalCost,
    standing_charge_total: standingCharge ?? undefined,
    energy_commodity_cost: energyCommodityCost ?? undefined,
  };

  return { rows: [row], errors, rowsTotal: 1 };
}

export async function parseOctopusBillPdf(
  pdfBytes: ArrayBuffer | Uint8Array,
  userId: string,
  tariffId: string | null
): Promise<ParseOutcome<OctopusBillRow>> {
  try {
    const data = pdfBytes instanceof Uint8Array ? pdfBytes : new Uint8Array(pdfBytes);
    const pdf = await getDocumentProxy(data);
    const { text } = await extractText(pdf, { mergePages: true });
    return parseOctopusBillText(text, userId, tariffId);
  } catch (err) {
    return {
      rows: [],
      errors: [
        {
          row: 0,
          message: `Impossibile leggere il file PDF: ${
            err instanceof Error ? err.message : String(err)
          }`,
        },
      ],
      rowsTotal: 0,
    };
  }
}
