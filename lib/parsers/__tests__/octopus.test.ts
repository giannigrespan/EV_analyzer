import { describe, expect, it } from "vitest";
import { parseOctopusBillCsv } from "../octopus";

describe("parseOctopusBillCsv", () => {
  it("parses a well-formed monthly bill summary", () => {
    const csv = [
      "Period start,Period end,Total kWh,Total cost",
      "2026-07-01,2026-07-31,210.5,63.15",
    ].join("\n");

    const { rows, errors } = parseOctopusBillCsv(csv, "user-1", "tariff-1");

    expect(errors).toHaveLength(0);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      user_id: "user-1",
      tariff_id: "tariff-1",
      billing_period_start: "2026-07-01",
      billing_period_end: "2026-07-31",
      total_kwh: 210.5,
      total_cost: 63.15,
    });
  });

  it("reports an error and no rows when columns are not recognized", () => {
    const csv = ["Foo,Bar", "1,2"].join("\n");
    const { rows, errors } = parseOctopusBillCsv(csv, "user-1", null);

    expect(rows).toHaveLength(0);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("skips an individual malformed row but keeps the valid ones", () => {
    const csv = [
      "Period start,Period end,Total kWh,Total cost",
      "2026-07-01,2026-07-31,210.5,63.15",
      "not-a-date,2026-08-31,190,58",
    ].join("\n");

    const { rows, errors, rowsTotal } = parseOctopusBillCsv(csv, "user-1", null);

    expect(rowsTotal).toBe(2);
    expect(rows).toHaveLength(1);
    expect(errors).toHaveLength(1);
  });
});
