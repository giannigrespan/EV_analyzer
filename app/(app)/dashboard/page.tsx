import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <Card>
        <CardHeader>
          <CardTitle>Benvenuto</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Carica le tue bollette Octopus, le ricariche Wallbox e i viaggi da Drivvo/ABRP
          nella sezione Import per iniziare a vedere le statistiche di consumo e costo.
        </CardContent>
      </Card>
    </div>
  );
}
