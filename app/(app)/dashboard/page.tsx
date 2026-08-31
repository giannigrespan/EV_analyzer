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
import { MonthlyCostChart } from "@/components/dashboard/monthly-cost-chart";
import { MonthlyEnergyChart } from "@/components/dashboard/monthly-energy-chart";
import {
  monthlySummary,
  reconcileBills,
  tripEfficiencySummary,
} from "@/lib/dashboard/aggregate";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: tariff }, { data: sessions }, { data: bills }, { data: trips }] =
    await Promise.all([
      supabase
        .from("energy_tariffs")
        .select("currency")
        .eq("user_id", user!.id)
        .limit(1)
        .maybeSingle(),
      supabase.from("charging_sessions").select("*"),
      supabase
        .from("electricity_bills")
        .select("*")
        .order("billing_period_start", { ascending: false }),
      supabase.from("trips").select("*"),
    ]);

  const currency = tariff?.currency ?? "";
  const allSessions = sessions ?? [];
  const allBills = bills ?? [];
  const allTrips = trips ?? [];

  const totalCost = allSessions.reduce((sum, s) => sum + (s.cost ?? 0), 0);
  const totalKwh = allSessions.reduce((sum, s) => sum + s.energy_kwh, 0);
  const avgCostPerKwh = totalKwh > 0 ? totalCost / totalKwh : null;

  const { avgEfficiencyWhPerKm, costPer100Km } = tripEfficiencySummary(allTrips);

  const monthly = monthlySummary(allSessions);
  const reconciliation = reconcileBills(allBills, allSessions);

  const hasNoData = allSessions.length === 0 && allBills.length === 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      {hasNoData && (
        <Card>
          <CardHeader>
            <CardTitle>Benvenuto</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Carica le tue bollette Octopus, le ricariche Wallbox e i viaggi da
            Drivvo/ABRP nella sezione Import per iniziare a vedere le
            statistiche di consumo e costo.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Spesa totale ricariche
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {totalCost.toFixed(2)} {currency}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              kWh caricati
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {totalKwh.toFixed(1)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Costo medio/kWh
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {avgCostPerKwh !== null ? avgCostPerKwh.toFixed(3) : "-"} {currency}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Efficienza media
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {avgEfficiencyWhPerKm !== null
              ? `${avgEfficiencyWhPerKm.toFixed(0)} Wh/km`
              : "-"}
          </CardContent>
        </Card>
      </div>

      {costPer100Km !== null && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Costo stimato per 100 km
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {costPer100Km.toFixed(2)} {currency}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Costo ricariche per mese</CardTitle>
          </CardHeader>
          <CardContent>
            <MonthlyCostChart data={monthly.map((m) => ({ month: m.month, cost: m.cost }))} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>kWh per fascia oraria</CardTitle>
          </CardHeader>
          <CardContent>
            <MonthlyEnergyChart
              data={monthly.map((m) => ({
                month: m.month,
                offPeakKwh: m.offPeakKwh,
                standardKwh: m.standardKwh,
              }))}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Riscontro bollette</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-xs text-muted-foreground">
            Confronto tra il costo bollettato e la somma dei costi di ricarica
            calcolati nello stesso periodo. La differenza include anche gli
            altri consumi domestici non legati all&apos;auto.
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Periodo</TableHead>
                <TableHead>Bolletta</TableHead>
                <TableHead>€/kWh bolletta</TableHead>
                <TableHead>Ricariche calcolate</TableHead>
                <TableHead>Differenza</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reconciliation.map((r) => (
                <TableRow key={r.billId}>
                  <TableCell>
                    {r.periodStart} → {r.periodEnd}
                  </TableCell>
                  <TableCell>
                    {r.billTotalCost.toFixed(2)} {currency}
                  </TableCell>
                  <TableCell>
                    {r.billRatePerKwh != null
                      ? `${r.billRatePerKwh.toFixed(3)} ${currency}/kWh`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {r.chargingCost.toFixed(2)} {currency}
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.costDelta >= 0 ? "outline" : "destructive"}>
                      {r.costDelta >= 0 ? "+" : ""}
                      {r.costDelta.toFixed(2)} {currency}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {reconciliation.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground"
                  >
                    Nessuna bolletta ancora caricata.
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
