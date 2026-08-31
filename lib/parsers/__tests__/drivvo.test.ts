import { describe, expect, it } from "vitest";
import { parseDrivvoCsv } from "../drivvo";

// Excerpt from a real Drivvo "##Refuelling" export: a leading section
// marker line, Italian headers, comma-delimited, and duplicate
// "Prezzo / kWh" / "Costo totale" / "Volume" columns for the (unused)
// second/third fuel slots.
const REAL_EXCERPT = [
  "##Refuelling",
  '"Contachilometri (km)","Data","Carburante","Prezzo / kWh","Costo totale","Volume","Pieno","Secondo carburante","Prezzo / kWh","Costo totale","Volume","Pieno" 2,"Terzo carburante","Prezzo / kWh","Costo totale","Volume","Pieno" 3,"Consumo","Distanza","Tipo di ricarica","Batteria iniziale (%)","Batteria finale (%)","Durata (min)","Distributore di benzina","Guidatore","Motivo","Metodo di pagamento","Note"',
  '"69587.0","2026-07-25 08:15:02","Elettrico","0.2","7.8","39","Sì","","0","0","0","No","","0","0","0","No","5,641 km/kWh","","AC","20","100","","Casa","Gianni Grespan","","",""',
  '"69367.0","2026-07-24 09:26:49","Elettrico","0","0","9.6","Sì","","0","0","0","No","","0","0","0","No","4,297 km/kWh","220.0","AC","20","100","","Ciasa Merisana","Gianni Grespan","","",""',
].join("\n");

describe("parseDrivvoCsv", () => {
  it("skips the leading ##Refuelling marker line and parses the real header", () => {
    const { rows, errors, rowsTotal } = parseDrivvoCsv(
      REAL_EXCERPT,
      "user-1",
      "vehicle-1"
    );

    expect(rowsTotal).toBe(2);
    // The first row has no "Distanza" (nothing to compute distance since
    // there's no earlier charge in this excerpt) and is reported, not
    // silently dropped.
    expect(errors).toHaveLength(1);
    expect(rows).toHaveLength(1);
  });

  it("reads Volume/Distanza from the first (electric) fuel block, ignoring Drivvo's own cost", () => {
    const { rows } = parseDrivvoCsv(REAL_EXCERPT, "user-1", "vehicle-1");

    expect(rows[0]).toMatchObject({
      source: "drivvo",
      distance_km: 220,
      energy_used_kwh: 9.6,
    });
    // Cost is deliberately not read from Drivvo (often approximate);
    // it's estimated downstream from real Wallbox charging costs instead.
    expect(rows[0].cost).toBeUndefined();
  });

  it("interprets the Drivvo timestamp as Europe/Rome local time", () => {
    const { rows } = parseDrivvoCsv(REAL_EXCERPT, "user-1", null);
    // 2026-07-24 09:26:49 in Rome (CEST, UTC+2) is 07:26:49 UTC.
    expect(rows[0].started_at).toBe("2026-07-24T07:26:49.000Z");
  });

  it("reports an error when required columns are missing", () => {
    const csv = ["Foo,Bar", "1,2"].join("\n");
    const { rows, errors } = parseDrivvoCsv(csv, "user-1", null);
    expect(rows).toHaveLength(0);
    expect(errors.length).toBeGreaterThan(0);
  });
});
