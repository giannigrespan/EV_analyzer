import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureDefaultVehicle } from "@/lib/vehicles/ensure-default-vehicle";
import { ensureDefaultTariff } from "@/lib/tariff/ensure-default-tariff";
import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  await ensureDefaultVehicle(supabase, user.id);
  await ensureDefaultTariff(supabase, user.id);

  return (
    <SidebarProvider>
      <AppSidebar userEmail={user.email} />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <span className="text-sm font-medium text-muted-foreground">
            MG4 XPower
          </span>
        </header>
        <main className="flex-1 bg-muted/30 px-6 py-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
