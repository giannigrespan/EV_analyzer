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
import { EfficiencyChart } from "@/components/trips/efficiency-chart";

const SOURCE_LABELS: Record<string, string> = {
  drivvo: "Drivvo",
  abrp: "ABRP",
  manual: "Manuale",
};

export default async function TripsPage() {
  const supabase = await createClient();
  const { data: trips } = await supabase
    .from("trips")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(200);

  const chartData = (trips ?? [])
    .filter((t) => t.started_at && t.efficiency_wh_per_km !== null)
    .slice()
    .reverse()
    .map((t) => ({
      date: new Date(t.started_at!).toLocaleDateString("it-IT", {
        day: "2-digit",
        month: "2-digit",
      }),
      efficiency: t.efficiency_wh_per_km as number,
    }));

  const totalDistance = (trips ?? []).reduce((sum, t) => sum + t.distance_km, 0);
  const totalCost = (trips ?? []).reduce((sum, t) => sum + (t.cost ?? 0), 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Viaggi</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Viaggi registrati
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {(trips ?? []).length}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Km totali
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {totalDistance.toFixed(0)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Costo stimato
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {totalCost.toFixed(2)}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Efficienza nel tempo (Wh/km)</CardTitle>
        </CardHeader>
        <CardContent>
          <EfficiencyChart data={chartData} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Elenco viaggi</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Fonte</TableHead>
                <TableHead>Km</TableHead>
                <TableHead>kWh</TableHead>
                <TableHead>Wh/km</TableHead>
                <TableHead>Costo stimato</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(trips ?? []).map((trip) => (
                <TableRow key={trip.id}>
                  <TableCell className="whitespace-nowrap">
                    {trip.started_at
                      ? new Date(trip.started_at).toLocaleString("it-IT")
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {SOURCE_LABELS[trip.source] ?? trip.source}
                    </Badge>
                  </TableCell>
                  <TableCell>{trip.distance_km.toFixed(1)}</TableCell>
                  <TableCell>
                    {trip.energy_used_kwh?.toFixed(2) ?? "-"}
                  </TableCell>
                  <TableCell>
                    {trip.efficiency_wh_per_km?.toFixed(0) ?? "-"}
                  </TableCell>
                  <TableCell>{trip.cost?.toFixed(2) ?? "-"}</TableCell>
                </TableRow>
              ))}
              {(trips ?? []).length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground"
                  >
                    Nessun viaggio ancora. Carica un export Drivvo o ABRP nella
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
