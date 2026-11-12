import "server-only";
import { numberOrNull } from "./numbers";
import { createClient } from "./supabase/server";
import { DEFAULT_TARGETS, DEFAULT_WATER_ML, type Targets } from "./targets";

/**
 * Your daily targets. Until you first save them there's no row at all,
 * which means the defaults (no calorie or macro targets, 2,000 ml of
 * water with the ring on), not an error.
 *
 * Row Level Security means this only ever finds your own row.
 */
export async function getTargets(): Promise<Targets> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_settings")
    .select("daily_kcal, daily_protein_g, daily_carbs_g, daily_fat_g, daily_water_ml, show_water")
    .maybeSingle();

  if (error) throw new Error(`Couldn't load your targets: ${error.message}`);
  if (!data) return DEFAULT_TARGETS;
  // numberOrNull, because Number(null) is 0 and blank must stay "no target".
  return {
    daily_kcal: numberOrNull(data.daily_kcal),
    daily_protein_g: numberOrNull(data.daily_protein_g),
    daily_carbs_g: numberOrNull(data.daily_carbs_g),
    daily_fat_g: numberOrNull(data.daily_fat_g),
    // Never blank in the database since 010; ?? only guards a missing value.
    daily_water_ml: numberOrNull(data.daily_water_ml) ?? DEFAULT_WATER_ML,
    show_water: data.show_water !== false,
  };
}
