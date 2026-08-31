import { splitByRateWindows, type TariffRatePeriod } from "@/lib/tariff/rate-lookup";

export type CostBreakdown = {
  off_peak_kwh: number;
  off_peak_cost: number;
  standard_kwh: number;
  standard_cost: number;
};

/**
 * Allocates a charging session's energy across the tariff's rate windows,
 * assuming a uniform power draw over the session duration (the Wallbox CSV
 * export gives start/end + total kWh, not a per-minute power curve).
 */
export function calculateSessionCost(
  periods: TariffRatePeriod[],
  startedAt: Date,
  endedAt: Date,
  energyKwh: number,
  timeZone?: string
): { cost: number; breakdown: CostBreakdown } {
  const totalMs = endedAt.getTime() - startedAt.getTime();
  const breakdown: CostBreakdown = {
    off_peak_kwh: 0,
    off_peak_cost: 0,
    standard_kwh: 0,
    standard_cost: 0,
  };

  if (totalMs <= 0 || energyKwh <= 0) {
    return { cost: 0, breakdown };
  }

  const segments = splitByRateWindows(periods, startedAt, endedAt, timeZone);

  for (const seg of segments) {
    const segMs = seg.end.getTime() - seg.start.getTime();
    const segKwh = (segMs / totalMs) * energyKwh;
    const rateName = seg.period?.rate_name ?? "standard";
    const price = seg.period?.price_per_kwh ?? 0;

    if (rateName === "off_peak") {
      breakdown.off_peak_kwh += segKwh;
      breakdown.off_peak_cost += segKwh * price;
    } else {
      breakdown.standard_kwh += segKwh;
      breakdown.standard_cost += segKwh * price;
    }
  }

  return {
    cost: breakdown.off_peak_cost + breakdown.standard_cost,
    breakdown,
  };
}
