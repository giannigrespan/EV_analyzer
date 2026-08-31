import { fromZonedTime } from "date-fns-tz";

export type ParsedRowError = {
  row: number;
  message: string;
};

export type ParseOutcome<T> = {
  rows: T[];
  errors: ParsedRowError[];
  rowsTotal: number;
};

const DEFAULT_TIME_ZONE = "Europe/Rome";

export function normalizeHeader(header: string): string {
  return header.trim().toLowerCase();
}

export function findColumn(
  headers: string[],
  aliases: readonly string[]
): string | null {
  const normalized = headers.map(normalizeHeader);
  for (const alias of aliases) {
    const idx = normalized.indexOf(alias);
    if (idx !== -1) return headers[idx];
  }
  return null;
}

export function parseNumber(value: string | undefined | null): number | null {
  if (value === undefined || value === null || value.trim() === "") return null;
  const cleaned = value.replace(/[^\d.,-]/g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function parseDateOnly(value: string | undefined | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function zonedLocalToUtc(isoLocal: string, timeZone: string): Date | null {
  const d = fromZonedTime(isoLocal, timeZone);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Export files from Wallbox ("DD/MM/YYYY, HH:MM:SS") and Drivvo
 * ("YYYY-MM-DD HH:MM:SS") both write local wall-clock time with no
 * timezone info. Parsing them with the native Date constructor would
 * interpret them in the server's timezone (UTC on Vercel), silently
 * shifting timestamps and corrupting which tariff rate window a session
 * falls into. Both known formats are parsed explicitly as Europe/Rome
 * local time; anything else falls back to native parsing (already-ISO
 * timestamps with an explicit offset/Z are unambiguous).
 */
export function parseDateTime(
  value: string | undefined | null,
  timeZone: string = DEFAULT_TIME_ZONE
): Date | null {
  if (!value) return null;
  const trimmed = value.trim();

  const dmy = trimmed.match(
    /^(\d{2})\/(\d{2})\/(\d{4}),?\s+(\d{2}):(\d{2}):(\d{2})$/
  );
  if (dmy) {
    const [, day, month, year, hour, minute, second] = dmy;
    return zonedLocalToUtc(
      `${year}-${month}-${day}T${hour}:${minute}:${second}`,
      timeZone
    );
  }

  const ymdSpace = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/
  );
  if (ymdSpace) {
    const [, year, month, day, hour, minute, second] = ymdSpace;
    return zonedLocalToUtc(
      `${year}-${month}-${day}T${hour}:${minute}:${second}`,
      timeZone
    );
  }

  const d = new Date(trimmed);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Strips leading "##Section" marker lines some exports (Drivvo) prepend
 * before the real CSV header row.
 */
export function stripLeadingCommentLines(csvText: string): string {
  const lines = csvText.split(/\r\n|\r|\n/);
  let start = 0;
  while (start < lines.length && lines[start].trim().startsWith("##")) {
    start++;
  }
  return lines.slice(start).join("\n");
}

/**
 * Drivvo's own export has a quoting bug on duplicate column names: instead
 * of a valid `"Pieno 2"`, it writes `"Pieno" 2` - the closing quote before
 * the disambiguating number breaks CSV escaping and shifts every column
 * after it. This repairs that specific pattern on the header line only.
 */
export function fixMalformedQuotedHeader(csvText: string): string {
  const lines = csvText.split(/\r\n|\r|\n/);
  if (lines.length === 0) return csvText;
  lines[0] = lines[0].replace(
    /"([^"]+)"\s+(\d+)(?=,|$)/g,
    (_match, label, suffix) => `"${label} ${suffix}"`
  );
  return lines.join("\n");
}
