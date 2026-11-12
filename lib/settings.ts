import "server-only";
import { numberOrNull } from "./numbers";
import { createClient } from "./supabase/server";
import { NO_TARGETS, type Targets } from "./targets";

/**
 * Your daily targets. Until you first save them there's no row at all,
 * which means no targets (all null), not an error.
 *
 * Row Level Security means this only ever finds your own row.
 */
export async function getTargets(): Promise<Targets> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_settings")
    .select("daily_kcal, daily_protein_g, daily_carbs_g, daily_fat_g, daily_water_ml")
    .maybeSingle();

  if (error) throw new Error(`Couldn't load your targets: ${error.message}`);
  if (!data) return NO_TARGETS;
  // numberOrNull, because Number(null) is 0 and blank must stay "no target".
  return {
    daily_kcal: numberOrNull(data.daily_kcal),
    daily_protein_g: numberOrNull(data.daily_protein_g),
    daily_carbs_g: numberOrNull(data.daily_carbs_g),
    daily_fat_g: numberOrNull(data.daily_fat_g),
    daily_water_ml: numberOrNull(data.daily_water_ml),
  };
}
