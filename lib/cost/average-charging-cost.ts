import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Blended average cost per kWh from the user's most recent home charging
 * sessions, used to estimate the cost of a trip (a drive doesn't draw
 * directly from the grid - it draws down a battery charged earlier).
 */
export async function getAverageCostPerKwh(
  supabase: SupabaseClient<Database>,
  userId: string,
  limit = 20
): Promise<number | null> {
  const { data } = await supabase
    .from("charging_sessions")
    .select("energy_kwh, cost")
    .eq("user_id", userId)
    .not("cost", "is", null)
    .order("started_at", { ascending: false })
    .limit(limit);

  if (!data || data.length === 0) return null;

  const totalKwh = data.reduce((sum, s) => sum + s.energy_kwh, 0);
  const totalCost = data.reduce((sum, s) => sum + (s.cost ?? 0), 0);

  if (totalKwh <= 0) return null;
  return totalCost / totalKwh;
}
