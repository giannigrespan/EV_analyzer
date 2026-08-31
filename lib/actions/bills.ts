"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createBillManually(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: tariff } = await supabase
    .from("energy_tariffs")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  const billingPeriodStart = String(formData.get("billing_period_start"));
  const billingPeriodEnd = String(formData.get("billing_period_end"));
  const totalKwh = Number(formData.get("total_kwh"));
  const totalCost = Number(formData.get("total_cost"));
  const standingChargeTotal = formData.get("standing_charge_total");

  const { error } = await supabase.from("electricity_bills").insert({
    user_id: user.id,
    tariff_id: tariff?.id ?? null,
    billing_period_start: billingPeriodStart,
    billing_period_end: billingPeriodEnd,
    total_kwh: totalKwh,
    total_cost: totalCost,
    standing_charge_total: standingChargeTotal
      ? Number(standingChargeTotal)
      : null,
  });

  if (error) throw error;
  revalidatePath("/settings/bills");
}

export async function deleteBill(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const id = String(formData.get("id"));
  const { error } = await supabase.from("electricity_bills").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/settings/bills");
}
