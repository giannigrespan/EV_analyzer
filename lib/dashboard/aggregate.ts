import type { Database } from "@/lib/supabase/database.types";

type ChargingSession = Database["public"]["Tables"]["charging_sessions"]["Row"];
type ElectricityBill = Database["public"]["Tables"]["electricity_bills"]["Row"];
type Trip = Database["public"]["Tables"]["trips"]["Row"];

type CostBreakdown = {
  off_peak_kwh: number;
  off_peak_cost: number;
  standard_kwh: number;
  standard_cost: number;
};

export type MonthlyPoint = {
  month: string; // "YYYY-MM"
  cost: number;
  kwh: number;
  offPeakKwh: number;
  standardKwh: number;
};

export function monthlySummary(sessions: ChargingSession[]): MonthlyPoint[] {
  const byMonth = new Map<string, MonthlyPoint>();

  for (const s of sessions) {
    const month = s.started_at.slice(0, 7);
    const breakdown = (s.cost_breakdown as CostBreakdown | null) ?? null;
    const existing = byMonth.get(month) ?? {
      month,
      cost: 0,
      kwh: 0,
      offPeakKwh: 0,
      standardKwh: 0,
    };
    existing.cost += s.cost ?? 0;
    existing.kwh += s.energy_kwh;
    existing.offPeakKwh += breakdown?.off_peak_kwh ?? 0;
    existing.standardKwh += breakdown?.standard_kwh ?? 0;
    byMonth.set(month, existing);
  }

  return Array.from(byMonth.values()).sort((a, b) => a.month.localeCompare(b.month));
}

export type BillReconciliation = {
  billId: string;
  periodStart: string;
  periodEnd: string;
  billTotalCost: number;
  billTotalKwh: number;
  chargingCost: number;
  chargingKwh: number;
  costDelta: number;
};

/**
 * Compares each bill's billed total against the calculated cost of home
 * charging sessions in the same period. This is a sanity check, not an exact
 * reconciliation - the bill also covers non-EV household consumption.
 */
export function reconcileBills(
  bills: ElectricityBill[],
  sessions: ChargingSession[]
): BillReconciliation[] {
  return bills.map((bill) => {
    const inPeriod = sessions.filter(
      (s) =>
        s.started_at.slice(0, 10) >= bill.billing_period_start &&
        s.started_at.slice(0, 10) <= bill.billing_period_end
    );
    const chargingCost = inPeriod.reduce((sum, s) => sum + (s.cost ?? 0), 0);
    const chargingKwh = inPeriod.reduce((sum, s) => sum + s.energy_kwh, 0);

    return {
      billId: bill.id,
      periodStart: bill.billing_period_start,
      periodEnd: bill.billing_period_end,
      billTotalCost: bill.total_cost,
      billTotalKwh: bill.total_kwh,
      chargingCost,
      chargingKwh,
      costDelta: bill.total_cost - chargingCost,
    };
  });
}

export type TripEfficiencySummary = {
  avgEfficiencyWhPerKm: number | null;
  costPer100Km: number | null;
};

export function tripEfficiencySummary(trips: Trip[]): TripEfficiencySummary {
  const withBoth = trips.filter(
    (t) => t.energy_used_kwh != null && t.distance_km > 0
  );
  const totalEnergy = withBoth.reduce((sum, t) => sum + (t.energy_used_kwh ?? 0), 0);
  const totalDistance = withBoth.reduce((sum, t) => sum + t.distance_km, 0);
  const avgEfficiencyWhPerKm =
    totalDistance > 0 ? (totalEnergy * 1000) / totalDistance : null;

  const withCost = trips.filter((t) => t.cost != null && t.distance_km > 0);
  const totalCost = withCost.reduce((sum, t) => sum + (t.cost ?? 0), 0);
  const totalCostDistance = withCost.reduce((sum, t) => sum + t.distance_km, 0);
  const costPer100Km =
    totalCostDistance > 0 ? (totalCost / totalCostDistance) * 100 : null;

  return { avgEfficiencyWhPerKm, costPer100Km };
}
