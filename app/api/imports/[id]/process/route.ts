import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { parseOctopusBillPdf } from "@/lib/parsers/octopus";
import { parseWallboxCsv } from "@/lib/parsers/wallbox";
import { parseDrivvoCsv } from "@/lib/parsers/drivvo";
import { parseAbrpCsv } from "@/lib/parsers/abrp";
import type { TripRow } from "@/lib/parsers/trip-common";
import type { ParsedRowError } from "@/lib/parsers/types";
import { calculateSessionCost } from "@/lib/cost/calculate-session-cost";
import { getAverageCostPerKwh } from "@/lib/cost/average-charging-cost";
import type { Database } from "@/lib/supabase/database.types";

async function finalizeImport(
  supabase: SupabaseClient<Database>,
  importId: string,
  rowsTotal: number,
  inserted: number,
  errors: ParsedRowError[]
) {
  const status =
    errors.length === 0 ? "success" : inserted > 0 ? "partial_error" : "error";

  await supabase
    .from("raw_imports")
    .update({
      status,
      rows_total: rowsTotal,
      rows_imported: inserted,
      rows_failed: rowsTotal - inserted,
      error_summary: errors.length > 0 ? errors : null,
      processed_at: new Date().toISOString(),
    })
    .eq("id", importId);

  return status;
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: importRow, error: fetchError } = await supabase
    .from("raw_imports")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !importRow) {
    return NextResponse.json({ error: "Import not found" }, { status: 404 });
  }

  await supabase
    .from("raw_imports")
    .update({ status: "processing" })
    .eq("id", id);

  const { data: fileData, error: downloadError } = await supabase.storage
    .from("raw-imports")
    .download(importRow.storage_path);

  if (downloadError || !fileData) {
    await finalizeImport(supabase, id, 0, 0, [
      { row: 0, message: "Impossibile scaricare il file caricato." },
    ]);
    return NextResponse.json({ error: "Download failed" }, { status: 500 });
  }

  if (importRow.source_type === "octopus_bill") {
    const { data: tariff } = await supabase
      .from("energy_tariffs")
      .select("id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    const pdfBytes = await fileData.arrayBuffer();
    const { rows, errors, rowsTotal } = await parseOctopusBillPdf(
      pdfBytes,
      user.id,
      tariff?.id ?? null
    );

    let inserted = 0;
    if (rows.length > 0) {
      const withImport = rows.map((r) => ({ ...r, source_import_id: id }));
      const { error: insertError } = await supabase
        .from("electricity_bills")
        .insert(withImport);

      if (insertError) {
        errors.push({ row: 0, message: `Errore inserimento: ${insertError.message}` });
      } else {
        inserted = withImport.length;
      }
    }

    const status = await finalizeImport(supabase, id, rowsTotal, inserted, errors);
    return NextResponse.json({ status, inserted, errors });
  }

  const csvText = await fileData.text();

  if (importRow.source_type === "wallbox_export") {
    const { data: vehicle } = await supabase
      .from("vehicles")
      .select("id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    const { rows, errors, rowsTotal } = parseWallboxCsv(
      csvText,
      user.id,
      vehicle?.id ?? null
    );

    let inserted = 0;
    if (rows.length > 0) {
      const { data: tariff } = await supabase
        .from("energy_tariffs")
        .select("id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      const { data: periods } = tariff
        ? await supabase
            .from("tariff_rate_periods")
            .select("*")
            .eq("tariff_id", tariff.id)
        : { data: [] };

      const withCost = rows.map((r) => {
        const { cost, breakdown } = calculateSessionCost(
          periods ?? [],
          new Date(r.started_at),
          new Date(r.ended_at),
          r.energy_kwh
        );
        return {
          ...r,
          cost,
          cost_breakdown: breakdown,
          source_import_id: id,
        };
      });

      const { error: insertError } = await supabase
        .from("charging_sessions")
        .insert(withCost);

      if (insertError) {
        errors.push({ row: 0, message: `Errore inserimento: ${insertError.message}` });
      } else {
        inserted = withCost.length;
      }
    }

    const status = await finalizeImport(supabase, id, rowsTotal, inserted, errors);
    return NextResponse.json({ status, inserted, errors });
  }

  if (importRow.source_type === "drivvo_export" || importRow.source_type === "abrp_export") {
    const { data: vehicle } = await supabase
      .from("vehicles")
      .select("id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    const { rows, errors, rowsTotal } =
      importRow.source_type === "drivvo_export"
        ? parseDrivvoCsv(csvText, user.id, vehicle?.id ?? null)
        : parseAbrpCsv(csvText, user.id, vehicle?.id ?? null);

    let inserted = 0;
    if (rows.length > 0) {
      const avgCostPerKwh = await getAverageCostPerKwh(supabase, user.id);

      const withCost: TripRow[] = rows.map((r) => {
        const hasExplicitCost = r.cost !== null && r.cost !== undefined;
        const canEstimate =
          !hasExplicitCost && r.energy_used_kwh != null && avgCostPerKwh !== null;

        return {
          ...r,
          cost: hasExplicitCost
            ? r.cost
            : canEstimate
              ? r.energy_used_kwh! * avgCostPerKwh!
              : r.cost,
          source_import_id: id,
        };
      });

      const { error: insertError } = await supabase.from("trips").insert(withCost);

      if (insertError) {
        errors.push({ row: 0, message: `Errore inserimento: ${insertError.message}` });
      } else {
        inserted = withCost.length;
      }
    }

    const status = await finalizeImport(supabase, id, rowsTotal, inserted, errors);
    return NextResponse.json({ status, inserted, errors });
  }

  const notYetSupported: ParsedRowError[] = [
    {
      row: 0,
      message: `Il parser per "${importRow.source_type}" non è ancora disponibile.`,
    },
  ];

  await finalizeImport(supabase, id, 0, 0, notYetSupported);
  return NextResponse.json(
    { status: "error", errors: notYetSupported },
    { status: 400 }
  );
}
