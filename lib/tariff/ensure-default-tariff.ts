import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/**
 * MVP supports a single tariff (Octopus Go) per user. Seed it with
 * placeholder rates on first access; the user edits the real prices and
 * windows in Settings > Tariffe.
 */
export async function ensureDefaultTariff(
  supabase: SupabaseClient<Database>,
  userId: string
) {
  const { data: existing } = await supabase
    .from("energy_tariffs")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("energy_tariffs")
    .insert({
      user_id: userId,
      provider: "octopus",
      name: "Octopus Go",
      currency: "GBP",
    })
    .select("id")
    .single();

  if (error) throw error;

  const today = new Date().toISOString().slice(0, 10);
  await supabase.from("tariff_rate_periods").insert([
    {
      tariff_id: created.id,
      rate_name: "off_peak",
      price_per_kwh: 0,
      time_start: "00:30",
      time_end: "05:30",
      effective_from: today,
    },
    {
      tariff_id: created.id,
      rate_name: "standard",
      price_per_kwh: 0,
      time_start: "05:30",
      time_end: "00:30",
      effective_from: today,
    },
  ]);

  return created.id;
}
