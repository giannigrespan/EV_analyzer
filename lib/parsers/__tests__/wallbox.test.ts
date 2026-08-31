import { describe, expect, it } from "vitest";
import { parseWallboxCsv } from "../wallbox";

// Excerpt from a real Wallbox "sessions_<id>_<from>_to_<to>.csv" export:
// semicolon-delimited, Italian decimal commas, "DD/MM/YYYY, HH:MM:SS"
// timestamps, and a mix of an in-progress session and zero-energy plug
// events that should not surface as errors.
const REAL_EXCERPT = [
  '"Session ID";"External ID";"Serial Number";"Port";"Authorizer";"Started At";"Ended At";"Duration (minutes)";"Total Energy (kWh)";"Grid Energy (kWh)";"Solar Energy (kWh)";"Solar Percentage (%)";"Savings from Solar Energy (EUR)";"Actual Cost (EUR)"',
  '"1729458";"e66c87f7";"B07064";"1";"Autostart";"24/07/2026, 23:37:13";"25/07/2026, 08:13:13";"516";"39,60";"36,04";"3,56";"9,00";"0,46";"4,68"',
  '"1693384";"a088b338";"B07064";"1";"Autostart";"13/07/2026, 07:39:21";"13/07/2026, 07:45:30";"6";"0,00";"0,00";"0,00";"0,00";"0,00";"0,00"',
  '"1693383";"6a9f3eac";"B07064";"1";"Autostart";"02/07/2026, 15:48:14";"In corso";"";"0,00";"0,00";"0,00";"0,00";"0,00";"0,00"',
].join("\n");

describe("parseWallboxCsv", () => {
  it("parses a real session row, keeping grid vs total energy separate", () => {
    const { rows, errors, rowsTotal } = parseWallboxCsv(
      REAL_EXCERPT,
      "user-1",
      "vehicle-1"
    );

    expect(rowsTotal).toBe(3);
    expect(errors).toHaveLength(0);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      user_id: "user-1",
      vehicle_id: "vehicle-1",
      energy_kwh: 39.6,
      grid_energy_kwh: 36.04,
      location_type: "home",
    });
  });

  it("interprets the DD/MM/YYYY timestamp as Europe/Rome local time", () => {
    const { rows } = parseWallboxCsv(REAL_EXCERPT, "user-1", null);
    // 24/07/2026 23:37:13 in Rome (CEST, UTC+2) is 21:37:13 UTC.
    expect(rows[0].started_at).toBe("2026-07-24T21:37:13.000Z");
  });

  it("silently skips zero-energy plug events and in-progress sessions", () => {
    const { rows, errors, rowsTotal } = parseWallboxCsv(
      REAL_EXCERPT,
      "user-1",
      null
    );
    expect(rowsTotal).toBe(3);
    expect(rows).toHaveLength(1);
    expect(errors).toHaveLength(0);
  });

  it("reports an error when required columns are missing", () => {
    const csv = "Foo;Bar\n1;2";
    const { rows, errors } = parseWallboxCsv(csv, "user-1", null);
    expect(rows).toHaveLength(0);
    expect(errors.length).toBeGreaterThan(0);
  });
});
