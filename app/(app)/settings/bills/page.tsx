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
import { createBillManually, deleteBill } from "@/lib/actions/bills";

export default async function BillsSettingsPage() {
  const supabase = await createClient();
  const { data: bills } = await supabase
    .from("electricity_bills")
    .select("*")
    .order("billing_period_start", { ascending: false });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Bollette</h1>

      <Card>
        <CardHeader>
          <CardTitle>Aggiungi bolletta manualmente</CardTitle>
          <CardDescription>
            Usa questo form se la bolletta Octopus non è disponibile come CSV;
            in alternativa puoi caricarla nella sezione Import.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={createBillManually}
            className="grid gap-4 sm:grid-cols-5 sm:items-end"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="billing_period_start">Periodo dal</Label>
              <Input
                id="billing_period_start"
                name="billing_period_start"
                type="date"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="billing_period_end">Periodo al</Label>
              <Input
                id="billing_period_end"
                name="billing_period_end"
                type="date"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="total_kwh">kWh totali</Label>
              <Input
                id="total_kwh"
                name="total_kwh"
                type="number"
                step="0.01"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="total_cost">Costo totale</Label>
              <Input
                id="total_cost"
                name="total_cost"
                type="number"
                step="0.01"
                required
              />
            </div>
            <Button type="submit">Aggiungi</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Storico bollette</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Periodo</TableHead>
                <TableHead>kWh</TableHead>
                <TableHead>Costo</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(bills ?? []).map((bill) => (
                <TableRow key={bill.id}>
                  <TableCell>
                    {bill.billing_period_start} → {bill.billing_period_end}
                  </TableCell>
                  <TableCell>{bill.total_kwh}</TableCell>
                  <TableCell>{bill.total_cost}</TableCell>
                  <TableCell>
                    <form action={deleteBill}>
                      <input type="hidden" name="id" value={bill.id} />
                      <Button type="submit" variant="ghost" size="sm">
                        Elimina
                      </Button>
                    </form>
                  </TableCell>
                </TableRow>
              ))}
              {(bills ?? []).length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-muted-foreground"
                  >
                    Nessuna bolletta ancora.
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
