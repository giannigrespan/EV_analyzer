import { describe, expect, it } from "vitest";
import { resolveRateAtInstant, splitByRateWindows } from "../rate-lookup";
import type { TariffRatePeriod } from "../rate-lookup";

const TIME_ZONE = "Europe/Rome";

function makePeriod(overrides: Partial<TariffRatePeriod>): TariffRatePeriod {
  return {
    id: "period-1",
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
    price_per_kwh: 0.085,
    time_start: "00:30",
    time_end: "05:30",
  }),
  makePeriod({
    id: "standard",
    rate_name: "standard",
    price_per_kwh: 0.2627,
    time_start: "05:30",
    time_end: "00:30",
  }),
];

describe("resolveRateAtInstant", () => {
  it("resolves the off-peak window in the middle of the night", () => {
    const instant = new Date("2026-07-15T01:00:00+02:00");
    const period = resolveRateAtInstant(periods, instant, TIME_ZONE);
    expect(period?.rate_name).toBe("off_peak");
  });

  it("resolves the standard window during the day", () => {
    const instant = new Date("2026-07-15T14:00:00+02:00");
    const period = resolveRateAtInstant(periods, instant, TIME_ZONE);
    expect(period?.rate_name).toBe("standard");
  });

  it("respects effective_from/effective_to date ranges", () => {
    const oldPeriod = makePeriod({
      id: "old-off-peak",
      rate_name: "off_peak",
      price_per_kwh: 0.05,
      time_start: "00:30",
      time_end: "05:30",
      effective_from: "2020-01-01",
      effective_to: "2025-12-31",
    });
    const instant = new Date("2026-07-15T01:00:00+02:00");
    const period = resolveRateAtInstant([oldPeriod], instant, TIME_ZONE);
    expect(period).toBeNull();
  });
});

describe("splitByRateWindows", () => {
  it("returns a single segment for a session entirely within one window", () => {
    const start = new Date("2026-07-15T01:00:00+02:00");
    const end = new Date("2026-07-15T02:00:00+02:00");
    const segments = splitByRateWindows(periods, start, end, TIME_ZONE);

    expect(segments).toHaveLength(1);
    expect(segments[0].period?.rate_name).toBe("off_peak");
  });

  it("splits a session that crosses the off-peak to standard boundary", () => {
    const start = new Date("2026-07-15T05:00:00+02:00");
    const end = new Date("2026-07-15T06:00:00+02:00");
    const segments = splitByRateWindows(periods, start, end, TIME_ZONE);

    expect(segments).toHaveLength(2);
    expect(segments[0].period?.rate_name).toBe("off_peak");
    expect(segments[1].period?.rate_name).toBe("standard");
  });
});
