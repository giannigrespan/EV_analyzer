import { describe, expect, it } from "vitest";
import { monthlySummary, reconcileBills, tripEfficiencySummary } from "../aggregate";
import type { Database } from "@/lib/supabase/database.types";

type ChargingSession = Database["public"]["Tables"]["charging_sessions"]["Row"];
type ElectricityBill = Database["public"]["Tables"]["electricity_bills"]["Row"];
type Trip = Database["public"]["Tables"]["trips"]["Row"];

function makeSession(overrides: Partial<ChargingSession>): ChargingSession {
  return {
    id: "session",
    user_id: "user-1",
    vehicle_id: null,
    started_at: "2026-07-15T01:00:00Z",
    ended_at: "2026-07-15T03:00:00Z",
    energy_kwh: 10,
    grid_energy_kwh: null,
    location_type: "home",
    cost: 1,
    cost_breakdown: { off_peak_kwh: 10, off_peak_cost: 1, standard_kwh: 0, standard_cost: 0 },
    source_import_id: null,
    created_at: "2026-07-15T03:00:00Z",
    ...overrides,
  };
}

function makeBill(overrides: Partial<ElectricityBill>): ElectricityBill {
  return {
    id: "bill",
    user_id: "user-1",
    tariff_id: null,
    billing_period_start: "2026-07-01",
    billing_period_end: "2026-07-31",
    total_kwh: 200,
    total_cost: 60,
    standing_charge_total: null,
    source_import_id: null,
    created_at: "2026-08-01T00:00:00Z",
    ...overrides,
  };
}

function makeTrip(overrides: Partial<Trip>): Trip {
  return {
    id: "trip",
    user_id: "user-1",
    vehicle_id: null,
    source: "drivvo",
    started_at: "2026-07-15T10:00:00Z",
    ended_at: null,
    distance_km: 100,
    energy_used_kwh: 15,
    efficiency_wh_per_km: 150,
    odometer_km: null,
    cost: 3,
    battery_start_pct: null,
    battery_end_pct: null,
    notes: null,
    source_import_id: null,
    created_at: "2026-07-15T10:00:00Z",
    ...overrides,
  };
}

describe("monthlySummary", () => {
  it("groups sessions by month and sums cost/kwh/breakdown", () => {
    const sessions = [
      makeSession({
        started_at: "2026-07-01T01:00:00Z",
        energy_kwh: 10,
        cost: 1,
        cost_breakdown: { off_peak_kwh: 10, off_peak_cost: 1, standard_kwh: 0, standard_cost: 0 },
      }),
      makeSession({
        started_at: "2026-07-20T01:00:00Z",
        energy_kwh: 5,
        cost: 0.5,
        cost_breakdown: { off_peak_kwh: 5, off_peak_cost: 0.5, standard_kwh: 0, standard_cost: 0 },
      }),
      makeSession({
        started_at: "2026-08-01T01:00:00Z",
        energy_kwh: 8,
        cost: 0.8,
        cost_breakdown: { off_peak_kwh: 8, off_peak_cost: 0.8, standard_kwh: 0, standard_cost: 0 },
      }),
    ];

    const result = monthlySummary(sessions);

    expect(result).toEqual([
      { month: "2026-07", cost: 1.5, kwh: 15, offPeakKwh: 15, standardKwh: 0 },
      { month: "2026-08", cost: 0.8, kwh: 8, offPeakKwh: 8, standardKwh: 0 },
    ]);
  });
});

describe("reconcileBills", () => {
  it("sums charging session cost within the bill period", () => {
    const bills = [makeBill({})];
    const sessions = [
      makeSession({ started_at: "2026-07-10T01:00:00Z", cost: 10 }),
      makeSession({ started_at: "2026-07-20T01:00:00Z", cost: 15 }),
      makeSession({ started_at: "2026-08-05T01:00:00Z", cost: 99 }), // outside period
    ];

    const [reconciled] = reconcileBills(bills, sessions);

    expect(reconciled.chargingCost).toBe(25);
    expect(reconciled.costDelta).toBe(60 - 25);
  });

  it("derives the real €/kWh from the bill's energy cost net of the standing charge", () => {
    const bills = [
      makeBill({ total_cost: 60, total_kwh: 200, standing_charge_total: 10 }),
    ];

    const [reconciled] = reconcileBills(bills, []);

    // (60 - 10) / 200
    expect(reconciled.billRatePerKwh).toBeCloseTo(0.25, 5);
  });

  it("falls back to the full bill total when there is no standing charge", () => {
    const bills = [
      makeBill({ total_cost: 60, total_kwh: 200, standing_charge_total: null }),
    ];

    const [reconciled] = reconcileBills(bills, []);

    expect(reconciled.billRatePerKwh).toBeCloseTo(0.3, 5);
  });

  it("returns null billRatePerKwh when the bill has no kWh to divide by", () => {
    const bills = [makeBill({ total_kwh: 0 })];

    const [reconciled] = reconcileBills(bills, []);

    expect(reconciled.billRatePerKwh).toBeNull();
  });
});

describe("tripEfficiencySummary", () => {
  it("computes distance-weighted average efficiency and cost per 100km", () => {
    const trips = [
      makeTrip({ distance_km: 100, energy_used_kwh: 15, cost: 3 }),
      makeTrip({ distance_km: 50, energy_used_kwh: 10, cost: 2 }),
    ];

    const { avgEfficiencyWhPerKm, costPer100Km } = tripEfficiencySummary(trips);

    // (15+10) kWh * 1000 / (100+50) km
    expect(avgEfficiencyWhPerKm).toBeCloseTo((25 * 1000) / 150, 5);
    // (3+2) / (100+50) * 100
    expect(costPer100Km).toBeCloseTo((5 / 150) * 100, 5);
  });

  it("returns null when there is no usable data", () => {
    const { avgEfficiencyWhPerKm, costPer100Km } = tripEfficiencySummary([]);
    expect(avgEfficiencyWhPerKm).toBeNull();
    expect(costPer100Km).toBeNull();
  });
});
