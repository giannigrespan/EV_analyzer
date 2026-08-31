import { createClient } from "@/lib/supabase/server";
import { ImportUploadForm } from "@/components/imports/upload-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const SOURCE_LABELS: Record<string, string> = {
  octopus_bill: "Bolletta Octopus",
  wallbox_export: "Wallbox",
  drivvo_export: "Drivvo",
  abrp_export: "ABRP",
};

const STATUS_LABELS: Record<string, string> = {
  success: "Completato",
  partial_error: "Completato con errori",
  error: "Errore",
  pending: "In attesa",
  processing: "In corso",
};

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  success: "default",
  partial_error: "secondary",
  error: "destructive",
  pending: "outline",
  processing: "outline",
};

type ImportErrorEntry = { row: number; message: string };

export default async function ImportsPage() {
  const supabase = await createClient();
  const { data: imports } = await supabase
    .from("raw_imports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Import</h1>

      <Card>
        <CardHeader>
          <CardTitle>Carica un nuovo file</CardTitle>
        </CardHeader>
        <CardContent>
          <ImportUploadForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Storico import</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead>Righe</TableHead>
                <TableHead>Errori</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(imports ?? []).map((imp) => {
                const errorEntries = Array.isArray(imp.error_summary)
                  ? (imp.error_summary as ImportErrorEntry[])
                  : [];
                return (
                  <TableRow key={imp.id}>
                    <TableCell className="whitespace-nowrap">
                      {new Date(imp.created_at).toLocaleString("it-IT")}
                    </TableCell>
                    <TableCell>
                      {SOURCE_LABELS[imp.source_type] ?? imp.source_type}
                    </TableCell>
                    <TableCell className="max-w-40 truncate">
                      {imp.original_filename}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[imp.status] ?? "outline"}>
                        {STATUS_LABELS[imp.status] ?? imp.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {imp.rows_imported ?? "-"} / {imp.rows_total ?? "-"}
                    </TableCell>
                    <TableCell className="max-w-xs text-xs text-muted-foreground">
                      {errorEntries.slice(0, 3).map((e, i) => (
                        <div key={i}>{e.message}</div>
                      ))}
                      {errorEntries.length > 3 && (
                        <div>+{errorEntries.length - 3} altri errori</div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {(imports ?? []).length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground"
                  >
                    Nessun import ancora.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
