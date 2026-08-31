import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseOctopusBillCsv } from "@/lib/parsers/octopus";
import type { ParsedRowError } from "@/lib/parsers/types";

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
    await supabase
      .from("raw_imports")
      .update({
        status: "error",
        error_summary: [
          { row: 0, message: "Impossibile scaricare il file caricato." },
        ],
        processed_at: new Date().toISOString(),
      })
      .eq("id", id);
    return NextResponse.json({ error: "Download failed" }, { status: 500 });
  }

  const csvText = await fileData.text();

  if (importRow.source_type === "octopus_bill") {
    const { data: tariff } = await supabase
      .from("energy_tariffs")
      .select("id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    const { rows, errors, rowsTotal } = parseOctopusBillCsv(
      csvText,
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
      .eq("id", id);

    return NextResponse.json({ status, inserted, errors });
  }

  const notYetSupported: ParsedRowError[] = [
    {
      row: 0,
      message: `Il parser per "${importRow.source_type}" non è ancora disponibile.`,
    },
  ];

  await supabase
    .from("raw_imports")
    .update({
      status: "error",
      error_summary: notYetSupported,
      processed_at: new Date().toISOString(),
    })
    .eq("id", id);

  return NextResponse.json({ status: "error", errors: notYetSupported }, { status: 400 });
}
