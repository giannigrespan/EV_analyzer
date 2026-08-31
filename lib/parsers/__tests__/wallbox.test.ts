import { describe, expect, it } from "vitest";
import { parseWallboxCsv } from "../wallbox";

describe("parseWallboxCsv", () => {
  it("parses a session with explicit start and end", () => {
    const csv = [
      "Start,End,Energy (kWh)",
      "2026-07-15 01:00,2026-07-15 03:30,12.4",
    ].join("\n");

    const { rows, errors } = parseWallboxCsv(csv, "user-1", "vehicle-1");

    expect(errors).toHaveLength(0);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      user_id: "user-1",
      vehicle_id: "vehicle-1",
      energy_kwh: 12.4,
      location_type: "home",
    });
  });

  it("derives the end time from a duration column when no end column exists", () => {
    const csv = ["Start,Duration,Energy (kWh)", "2026-07-15 01:00,02:30,12.4"].join(
      "\n"
    );

    const { rows, errors } = parseWallboxCsv(csv, "user-1", null);

    expect(errors).toHaveLength(0);
    expect(rows).toHaveLength(1);
    const started = new Date(rows[0].started_at);
    const ended = new Date(rows[0].ended_at);
    expect(ended.getTime() - started.getTime()).toBe(2.5 * 60 * 60 * 1000);
  });

  it("reports an error when required columns are missing", () => {
    const csv = ["Foo,Bar", "1,2"].join("\n");
    const { rows, errors } = parseWallboxCsv(csv, "user-1", null);

    expect(rows).toHaveLength(0);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("skips a row where the end is not after the start", () => {
    const csv = [
      "Start,End,Energy (kWh)",
      "2026-07-15 03:00,2026-07-15 01:00,5",
    ].join("\n");

    const { rows, errors } = parseWallboxCsv(csv, "user-1", null);
    expect(rows).toHaveLength(0);
    expect(errors).toHaveLength(1);
  });
});
