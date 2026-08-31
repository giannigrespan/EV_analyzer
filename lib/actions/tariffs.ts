"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireSupabase() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return supabase;
}

export async function updateTariff(formData: FormData) {
  const supabase = await requireSupabase();
  const tariffId = String(formData.get("tariff_id"));
  const name = String(formData.get("name"));
  const currency = String(formData.get("currency"));
  const standingCharge = formData.get("standing_charge_per_day");

  const { error } = await supabase
    .from("energy_tariffs")
    .update({
      name,
      currency,
      standing_charge_per_day: standingCharge ? Number(standingCharge) : null,
    })
    .eq("id", tariffId);

  if (error) throw error;
  revalidatePath("/settings/tariffs");
}

export async function addRatePeriod(formData: FormData) {
  const supabase = await requireSupabase();
  const tariffId = String(formData.get("tariff_id"));
  const rateName = String(formData.get("rate_name"));
  const pricePerKwh = Number(formData.get("price_per_kwh"));
  const timeStart = String(formData.get("time_start"));
  const timeEnd = String(formData.get("time_end"));
  const effectiveFrom = String(formData.get("effective_from"));

  const { error } = await supabase.from("tariff_rate_periods").insert({
    tariff_id: tariffId,
    rate_name: rateName,
    price_per_kwh: pricePerKwh,
    time_start: timeStart,
    time_end: timeEnd,
    effective_from: effectiveFrom,
  });

  if (error) throw error;
  revalidatePath("/settings/tariffs");
}

export async function deleteRatePeriod(formData: FormData) {
  const supabase = await requireSupabase();
  const id = String(formData.get("id"));

  const { error } = await supabase
    .from("tariff_rate_periods")
    .delete()
    .eq("id", id);

  if (error) throw error;
  revalidatePath("/settings/tariffs");
}
