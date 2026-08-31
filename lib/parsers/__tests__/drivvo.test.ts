import { describe, expect, it } from "vitest";
import { parseDrivvoCsv } from "../drivvo";

describe("parseDrivvoCsv", () => {
  it("parses a fill-up style row and computes efficiency", () => {
    const csv = [
      "Date,Distance (km),Energy (kWh),Total price",
      "2026-07-15,120,18,5.40",
    ].join("\n");

    const { rows, errors } = parseDrivvoCsv(csv, "user-1", "vehicle-1");

    expect(errors).toHaveLength(0);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      source: "drivvo",
      distance_km: 120,
      energy_used_kwh: 18,
      cost: 5.4,
    });
    expect(rows[0].efficiency_wh_per_km).toBeCloseTo(150, 5);
  });

  it("reports an error when required columns are missing", () => {
    const csv = ["Foo,Bar", "1,2"].join("\n");
    const { rows, errors } = parseDrivvoCsv(csv, "user-1", null);
    expect(rows).toHaveLength(0);
    expect(errors.length).toBeGreaterThan(0);
  });
});
