import { describe, expect, it } from "vitest";
import { parseAbrpCsv } from "../abrp";

describe("parseAbrpCsv", () => {
  it("parses a trip row with battery percentages", () => {
    const csv = [
      "Date,Distance (km),Energy used (kWh),SOC start (%),SOC end (%)",
      "2026-07-15,80,12,90,68",
    ].join("\n");

    const { rows, errors } = parseAbrpCsv(csv, "user-1", "vehicle-1");

    expect(errors).toHaveLength(0);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      source: "abrp",
      distance_km: 80,
      energy_used_kwh: 12,
      battery_start_pct: 90,
      battery_end_pct: 68,
    });
    expect(rows[0].cost).toBeUndefined();
  });

  it("reports an error when required columns are missing", () => {
    const csv = ["Foo,Bar", "1,2"].join("\n");
    const { rows, errors } = parseAbrpCsv(csv, "user-1", null);
    expect(rows).toHaveLength(0);
    expect(errors.length).toBeGreaterThan(0);
  });
});
