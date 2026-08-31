import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type CostBreakdown = {
  off_peak_kwh: number;
  off_peak_cost: number;
  standard_kwh: number;
  standard_cost: number;
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("it-IT", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatDuration(startedAt: string, endedAt: string) {
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.round((ms % 3_600_000) / 60_000);
  return `${hours}h ${minutes}m`;
}

export default async function ChargingPage() {
  const supabase = await createClient();
  const { data: sessions } = await supabase
    .from("charging_sessions")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(100);

  const totalKwh = (sessions ?? []).reduce((sum, s) => sum + s.energy_kwh, 0);
  const totalCost = (sessions ?? []).reduce((sum, s) => sum + (s.cost ?? 0), 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Ricariche</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Sessioni
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {(sessions ?? []).length}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              kWh totali
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {totalKwh.toFixed(1)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Costo totale
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {totalCost.toFixed(2)}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sessioni di ricarica</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Inizio</TableHead>
                <TableHead>Durata</TableHead>
                <TableHead>Luogo</TableHead>
                <TableHead>kWh</TableHead>
                <TableHead>Economica</TableHead>
                <TableHead>Standard</TableHead>
                <TableHead>Costo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(sessions ?? []).map((session) => {
                const breakdown = session.cost_breakdown as CostBreakdown | null;
                return (
                  <TableRow key={session.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDateTime(session.started_at)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatDuration(session.started_at, session.ended_at)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {session.location_type === "home" ? "Casa" : "Pubblica"}
                      </Badge>
                    </TableCell>
                    <TableCell>{session.energy_kwh.toFixed(1)}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {breakdown ? `${breakdown.off_peak_kwh.toFixed(1)} kWh` : "-"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {breakdown ? `${breakdown.standard_kwh.toFixed(1)} kWh` : "-"}
                    </TableCell>
                    <TableCell>
                      {session.cost !== null ? session.cost.toFixed(2) : "-"}
                    </TableCell>
                  </TableRow>
                );
              })}
              {(sessions ?? []).length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-muted-foreground"
                  >
                    Nessuna ricarica ancora. Carica un export Wallbox nella
                    sezione Import.
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
