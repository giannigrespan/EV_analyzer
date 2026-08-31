import { beforeEach, describe, expect, it, vi } from "vitest";
import { extractText, getDocumentProxy } from "unpdf";
import { parseOctopusBillPdf, parseOctopusBillText } from "../octopus";

vi.mock("unpdf", () => ({
  getDocumentProxy: vi.fn(),
  extractText: vi.fn(),
}));

describe("parseOctopusBillText", () => {
  it("parses a well-formed monthly bill summary", () => {
    const text = [
      "Bolletta luce",
      "Periodo di fatturazione: dal 01/07/2026 al 31/07/2026",
      "Consumo totale: 210,5 kWh",
      "Totale da pagare: € 63,15",
    ].join("\n");

    const { rows, errors } = parseOctopusBillText(text, "user-1", "tariff-1");

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

  it("extracts an optional standing charge when present", () => {
    const text = [
      "Dal 01/07/2026 al 31/07/2026",
      "Consumo totale: 210,5 kWh",
      "Quota fissa: € 10,00",
      "Totale da pagare: € 63,15",
    ].join("\n");

    const { rows } = parseOctopusBillText(text, "user-1", null);

    expect(rows[0].standing_charge_total).toBe(10);
  });

  it("reports an error when the expected fields are not found in the text", () => {
    const { rows, errors } = parseOctopusBillText(
      "Documento non riconosciuto",
      "user-1",
      null
    );

    expect(rows).toHaveLength(0);
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe("parseOctopusBillPdf", () => {
  beforeEach(() => {
    vi.mocked(getDocumentProxy).mockReset();
    vi.mocked(extractText).mockReset();
  });

  it("extracts text from the PDF bytes and delegates to parseOctopusBillText", async () => {
    vi.mocked(getDocumentProxy).mockResolvedValue({} as never);
    vi.mocked(extractText).mockResolvedValue({
      text: "Dal 01/07/2026 al 31/07/2026 Consumo totale: 210,5 kWh Totale da pagare: € 63,15",
      totalPages: 1,
    } as never);

    const { rows, errors } = await parseOctopusBillPdf(
      new Uint8Array([1, 2, 3]),
      "user-1",
      "tariff-1"
    );

    expect(errors).toHaveLength(0);
    expect(rows).toHaveLength(1);
    expect(rows[0].total_kwh).toBe(210.5);
    expect(rows[0].total_cost).toBe(63.15);
  });

  it("reports an error when the PDF cannot be read", async () => {
    vi.mocked(getDocumentProxy).mockRejectedValue(new Error("invalid pdf"));

    const { rows, errors } = await parseOctopusBillPdf(
      new Uint8Array([1, 2, 3]),
      "user-1",
      null
    );

    expect(rows).toHaveLength(0);
    expect(errors[0].message).toContain("invalid pdf");
  });
});
