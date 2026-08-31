import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { updateTariff, addRatePeriod, deleteRatePeriod } from "@/lib/actions/tariffs";

const RATE_LABELS: Record<string, string> = {
  off_peak: "Economica",
  standard: "Standard",
};

export default async function TariffsSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: tariff } = await supabase
    .from("energy_tariffs")
    .select("*")
    .eq("user_id", user!.id)
    .limit(1)
    .single();

  const { data: periods } = await supabase
    .from("tariff_rate_periods")
    .select("*")
    .eq("tariff_id", tariff!.id)
    .order("effective_from", { ascending: false });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Tariffe</h1>

      <Card>
        <CardHeader>
          <CardTitle>Tariffa attuale</CardTitle>
          <CardDescription>Es. Octopus Go</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateTariff} className="grid gap-4 sm:grid-cols-3">
            <input type="hidden" name="tariff_id" value={tariff!.id} />
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" name="name" defaultValue={tariff!.name} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="currency">Valuta</Label>
              <Input id="currency" name="currency" defaultValue={tariff!.currency} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="standing_charge_per_day">Costo fisso giornaliero</Label>
              <Input
                id="standing_charge_per_day"
                name="standing_charge_per_day"
                type="number"
                step="0.0001"
                defaultValue={tariff!.standing_charge_per_day ?? ""}
              />
            </div>
            <div className="sm:col-span-3">
              <Button type="submit">Salva</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fasce orarie</CardTitle>
          <CardDescription>
            Configura le fasce economica/standard della tua tariffa. Quando il
            prezzo cambia, aggiungi un nuovo periodo invece di modificare quello
            esistente: la cronologia serve per calcolare correttamente i costi
            passati.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fascia</TableHead>
                <TableHead>Dalle</TableHead>
                <TableHead>Alle</TableHead>
                <TableHead>Prezzo/kWh</TableHead>
                <TableHead>Valido da</TableHead>
                <TableHead>Valido fino a</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(periods ?? []).map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{RATE_LABELS[p.rate_name] ?? p.rate_name}</TableCell>
                  <TableCell>{p.time_start}</TableCell>
                  <TableCell>{p.time_end}</TableCell>
                  <TableCell>{p.price_per_kwh}</TableCell>
                  <TableCell>{p.effective_from}</TableCell>
                  <TableCell>{p.effective_to ?? "in corso"}</TableCell>
                  <TableCell>
                    <form action={deleteRatePeriod}>
                      <input type="hidden" name="id" value={p.id} />
                      <Button type="submit" variant="ghost" size="sm">
                        Elimina
                      </Button>
                    </form>
                  </TableCell>
                </TableRow>
              ))}
              {(periods ?? []).length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-muted-foreground"
                  >
                    Nessuna fascia configurata.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <form
            action={addRatePeriod}
            className="grid gap-4 sm:grid-cols-6 sm:items-end"
          >
            <input type="hidden" name="tariff_id" value={tariff!.id} />
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rate_name">Fascia</Label>
              <select
                id="rate_name"
                name="rate_name"
                defaultValue="off_peak"
                className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="off_peak">Economica</option>
                <option value="standard">Standard</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="time_start">Dalle</Label>
              <Input id="time_start" name="time_start" type="time" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="time_end">Alle</Label>
              <Input id="time_end" name="time_end" type="time" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="price_per_kwh">Prezzo/kWh</Label>
              <Input
                id="price_per_kwh"
                name="price_per_kwh"
                type="number"
                step="0.0001"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="effective_from">Valido da</Label>
              <Input
                id="effective_from"
                name="effective_from"
                type="date"
                required
              />
            </div>
            <Button type="submit">Aggiungi fascia</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
