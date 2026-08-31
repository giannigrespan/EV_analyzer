import { beforeEach, describe, expect, it, vi } from "vitest";
import { extractText, getDocumentProxy } from "unpdf";
import { parseOctopusBillPdf, parseOctopusBillText } from "../octopus";

vi.mock("unpdf", () => ({
  getDocumentProxy: vi.fn(),
  extractText: vi.fn(),
}));

// Modeled on the text extracted from a real Octopus Energy Italia "Bolletta
// luce" PDF (labels and layout as they appear on the bill; amounts changed,
// personal/contract identifiers omitted).
const REAL_BILL_EXCERPT = [
  "La tua bolletta di Luglio 2026",
  "Questo mese dovrai pagare",
  "193,56€",
  "Entro il 07/09/2026",
  "DATA FATTURA: 18/08/2026",
  "METODO PAGAMENTO: Addebito diretto SDD",
  "PERIODO DI RIFERIMENTO: dal 01/07/2026 al 31/07/2026",
  "SITUAZIONE PAGAMENTI: In data 18/08/2026 i pagamenti risultano regolari.",
  "CONSUMO FATTURATO: 719 kWh",
  "Consumo annuo",
  "01/11/2025 - 31/07/2026",
  "4979 kWh/anno",
  "Scontrino dell'energia",
  "Quota per consumi",
  "719 kWh x 0,09 €/kWh 62,09 €",
  "Quota fissa",
  "1 mese x 9,92 €/mese 9,92 €",
  "di cui spesa per la rete e gli oneri generali di sistema 1,92 €/mese 1,92 €",
  "Quota potenza",
  "4,5 kW x 1,98 €/kW 8,89 €",
  "TOTALE BOLLETTA 193,56 €",
  "TOTALE DA PAGARE 193,56 €",
  "Credito rimanente 0,00 €",
  "QUOTA FISSA (comp. commercializzazione): 8,00 €",
  "Trasporto quota fissa 1 1,920000 €/mese 1,92 €",
  "Altre partite - Octopus Go - Spesa per la materia energia 78,75 €",
].join("\n");

describe("parseOctopusBillText", () => {
  it("parses the real Octopus bill layout", () => {
    const { rows, errors } = parseOctopusBillText(
      REAL_BILL_EXCERPT,
      "user-1",
      "tariff-1"
    );

    expect(errors).toHaveLength(0);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      user_id: "user-1",
      tariff_id: "tariff-1",
      billing_period_start: "2026-07-01",
      billing_period_end: "2026-07-31",
      total_kwh: 719,
      total_cost: 193.56,
    });
  });

  it("picks the standing charge line total, not the per-unit price or unrelated quota fissa mentions", () => {
    const { rows } = parseOctopusBillText(REAL_BILL_EXCERPT, "user-1", null);

    expect(rows[0].standing_charge_total).toBe(9.92);
  });

  it("extracts the Octopus Go energy commodity cost from the 'Altre partite' line", () => {
    const { rows } = parseOctopusBillText(REAL_BILL_EXCERPT, "user-1", null);

    expect(rows[0].energy_commodity_cost).toBe(78.75);
  });

  it("leaves energy_commodity_cost undefined when the 'Altre partite' line is absent", () => {
    const textWithoutIt = REAL_BILL_EXCERPT.split("\n")
      .filter((line) => !line.includes("Altre partite"))
      .join("\n");

    const { rows } = parseOctopusBillText(textWithoutIt, "user-1", null);

    expect(rows[0].energy_commodity_cost).toBeUndefined();
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
      text: REAL_BILL_EXCERPT,
      totalPages: 1,
    } as never);

    const { rows, errors } = await parseOctopusBillPdf(
      new Uint8Array([1, 2, 3]),
      "user-1",
      "tariff-1"
    );

    expect(errors).toHaveLength(0);
    expect(rows).toHaveLength(1);
    expect(rows[0].total_kwh).toBe(719);
    expect(rows[0].total_cost).toBe(193.56);
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
