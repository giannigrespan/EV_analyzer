import { fromZonedTime, toZonedTime } from "date-fns-tz";
import type { Database } from "@/lib/supabase/database.types";

export type TariffRatePeriod =
  Database["public"]["Tables"]["tariff_rate_periods"]["Row"];

export const DEFAULT_TIME_ZONE = "Europe/Rome";

function timeStringToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m ?? 0);
}

function isWithinWindow(
  minutesOfDay: number,
  startMinutes: number,
  endMinutes: number
): boolean {
  if (startMinutes === endMinutes) return true; // 24h window
  if (startMinutes < endMinutes) {
    return minutesOfDay >= startMinutes && minutesOfDay < endMinutes;
  }
  // Window wraps midnight, e.g. 23:30 -> 05:30.
  return minutesOfDay >= startMinutes || minutesOfDay < endMinutes;
}

export function periodsActiveOnDate(
  periods: TariffRatePeriod[],
  dateStr: string
): TariffRatePeriod[] {
  return periods.filter(
    (p) => p.effective_from <= dateStr && (!p.effective_to || p.effective_to >= dateStr)
  );
}

function zonedDateParts(instant: Date, timeZone: string) {
  const zoned = toZonedTime(instant, timeZone);
  const dateStr = `${zoned.getFullYear()}-${String(zoned.getMonth() + 1).padStart(2, "0")}-${String(
    zoned.getDate()
  ).padStart(2, "0")}`;
  const minutesOfDay = zoned.getHours() * 60 + zoned.getMinutes();
  return { dateStr, minutesOfDay };
}

function zonedTimeOnDate(dateStr: string, timeStr: string, timeZone: string): Date {
  return fromZonedTime(`${dateStr}T${timeStr}`, timeZone);
}

/**
 * Resolves which rate period applies at a given instant, preferring a period
 * whose time window matches; falling back to the 'standard' period active
 * that day if no window matches (e.g. a standard period with no explicit
 * window covering the rest of the day).
 */
export function resolveRateAtInstant(
  periods: TariffRatePeriod[],
  instant: Date,
  timeZone: string = DEFAULT_TIME_ZONE
): TariffRatePeriod | null {
  const { dateStr, minutesOfDay } = zonedDateParts(instant, timeZone);
  const active = periodsActiveOnDate(periods, dateStr);

  const match = active.find((p) =>
    isWithinWindow(
      minutesOfDay,
      timeStringToMinutes(p.time_start),
      timeStringToMinutes(p.time_end)
    )
  );
  if (match) return match;

  return active.find((p) => p.rate_name === "standard") ?? null;
}

export type RateSegment = {
  start: Date;
  end: Date;
  period: TariffRatePeriod | null;
};

/**
 * Splits [start, end) into segments that each fall within a single rate
 * window, by collecting every rate-window boundary crossed in the range.
 * Intended for charging sessions spanning minutes to a few hours, not
 * multi-day ranges.
 */
export function splitByRateWindows(
  periods: TariffRatePeriod[],
  start: Date,
  end: Date,
  timeZone: string = DEFAULT_TIME_ZONE
): RateSegment[] {
  if (end <= start) return [];

  const boundaries = new Set<number>([start.getTime(), end.getTime()]);
  const dayMs = 24 * 60 * 60 * 1000;

  for (let dayTime = start.getTime(); dayTime <= end.getTime(); dayTime += dayMs) {
    const { dateStr } = zonedDateParts(new Date(dayTime), timeZone);
    const active = periodsActiveOnDate(periods, dateStr);
    for (const p of active) {
      for (const timeStr of [p.time_start, p.time_end]) {
        const instant = zonedTimeOnDate(dateStr, timeStr, timeZone);
        if (instant.getTime() > start.getTime() && instant.getTime() < end.getTime()) {
          boundaries.add(instant.getTime());
        }
      }
    }
  }

  const sorted = Array.from(boundaries).sort((a, b) => a - b);
  const segments: RateSegment[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const segStart = new Date(sorted[i]);
    const segEnd = new Date(sorted[i + 1]);
    const midpoint = new Date((segStart.getTime() + segEnd.getTime()) / 2);
    segments.push({
      start: segStart,
      end: segEnd,
      period: resolveRateAtInstant(periods, midpoint, timeZone),
    });
  }
  return segments;
}
