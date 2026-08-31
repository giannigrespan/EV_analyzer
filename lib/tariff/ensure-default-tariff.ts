import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/**
 * MVP supports a single tariff (Octopus Go) per user. Seed it with
 * placeholder rates on first access; the user edits the real prices and
 * windows in Settings > Tariffe.
 *
 * Octopus Go in Italy actually bills on the ARERA F1/F2/F3 time bands
 * (F1 weekdays 8-19, F2 weekdays 7-8+19-23 and Saturday 7-23, F3 nights
 * 23-7 plus all of Sunday/holidays), which need a day-of-week dimension
 * the current schema doesn't model. Until that's built, this seeds a
 * 2-band approximation instead: 23:00-07:00 as "off_peak" (matching F3's
 * nightly portion) and 07:00-23:00 as "standard" (matching F1+F2 on
 * weekdays) - Sundays/holidays will be slightly overpriced by this
 * approximation since they're really all-day off-peak (F3).
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
      currency: "EUR",
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
      time_start: "23:00",
      time_end: "07:00",
      effective_from: today,
    },
    {
      tariff_id: created.id,
      rate_name: "standard",
      price_per_kwh: 0,
      time_start: "07:00",
      time_end: "23:00",
      effective_from: today,
    },
  ]);

  return created.id;
}
