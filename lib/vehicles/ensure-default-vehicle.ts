import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/**
 * MVP supports a single vehicle (MG4 XPower) per user. Create it on first
 * access instead of asking the user to set it up manually.
 */
export async function ensureDefaultVehicle(
  supabase: SupabaseClient<Database>,
  userId: string
) {
  const { data: existing } = await supabase
    .from("vehicles")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("vehicles")
    .insert({
      user_id: userId,
      name: "MG4 XPower",
      make: "MG",
      model: "MG4 XPower",
      is_default: true,
    })
    .select("id")
    .single();

  if (error) throw error;
  return created.id;
}
