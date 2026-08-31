export type ParsedRowError = {
  row: number;
  message: string;
};

export type ParseOutcome<T> = {
  rows: T[];
  errors: ParsedRowError[];
  rowsTotal: number;
};

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

export function parseDateTime(value: string | undefined | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}
