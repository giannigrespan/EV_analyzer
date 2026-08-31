import { describe, expect, it } from "vitest";
import { calculateSessionCost } from "../calculate-session-cost";
import type { TariffRatePeriod } from "@/lib/tariff/rate-lookup";

const TIME_ZONE = "Europe/Rome";

function makePeriod(overrides: Partial<TariffRatePeriod>): TariffRatePeriod {
  return {
    id: "period",
    tariff_id: "tariff-1",
    rate_name: "standard",
    price_per_kwh: 0.2627,
    time_start: "05:30",
    time_end: "00:30",
    effective_from: "2026-01-01",
    effective_to: null,
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

const periods: TariffRatePeriod[] = [
  makePeriod({
    id: "off-peak",
    rate_name: "off_peak",
    price_per_kwh: 0.1,
    time_start: "00:30",
    time_end: "05:30",
  }),
  makePeriod({
    id: "standard",
    rate_name: "standard",
    price_per_kwh: 0.2,
    time_start: "05:30",
    time_end: "00:30",
  }),
];

describe("calculateSessionCost", () => {
  it("charges the off-peak rate for a session entirely in the cheap window", () => {
    const start = new Date("2026-07-15T01:00:00+02:00");
    const end = new Date("2026-07-15T03:00:00+02:00");
    const { cost, breakdown } = calculateSessionCost(periods, start, end, 10, TIME_ZONE);

    expect(breakdown.off_peak_kwh).toBeCloseTo(10, 5);
    expect(breakdown.standard_kwh).toBeCloseTo(0, 5);
    expect(cost).toBeCloseTo(1, 5); // 10 kWh * 0.10
  });

  it("splits cost proportionally when a session crosses the rate boundary", () => {
    // 1h in off-peak (00:30-05:30) + 1h in standard, uniform power draw.
    const start = new Date("2026-07-15T05:00:00+02:00");
    const end = new Date("2026-07-15T06:00:00+02:00");
    const { cost, breakdown } = calculateSessionCost(periods, start, end, 8, TIME_ZONE);

    expect(breakdown.off_peak_kwh).toBeCloseTo(4, 5);
    expect(breakdown.standard_kwh).toBeCloseTo(4, 5);
    expect(cost).toBeCloseTo(4 * 0.1 + 4 * 0.2, 5);
  });

  it("returns zero cost for a non-positive duration or energy", () => {
    const start = new Date("2026-07-15T01:00:00+02:00");
    const { cost, breakdown } = calculateSessionCost(periods, start, start, 5, TIME_ZONE);
    expect(cost).toBe(0);
    expect(breakdown.off_peak_kwh).toBe(0);
    expect(breakdown.standard_kwh).toBe(0);
  });
});
