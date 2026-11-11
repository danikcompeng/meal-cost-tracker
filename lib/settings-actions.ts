"use server";
// Runs on the server; the settings form calls it like a normal function.

import { revalidatePath } from "next/cache";
import { guarded, logDbError, requireUserId } from "./server-helpers";
import { validateTargets, type Targets } from "./targets";
import type { FormState } from "./types";

/** Also sends back what was saved (decimals rounded), so the form can show it. */
export type TargetsFormState = FormState & { saved?: Targets };

export async function saveTargets(
  _prev: TargetsFormState,
  formData: FormData,
): Promise<TargetsFormState> {
  return guarded("saveTargets", "Couldn't save. Please try again.", async () => {
    const { supabase, userId } = await requireUserId();

    const result = validateTargets({
      kcal: formData.get("kcal"),
      protein: formData.get("protein"),
      carbs: formData.get("carbs"),
      fat: formData.get("fat"),
    });
    if (!result.ok) return { ok: false, fieldErrors: result.fieldErrors };

    // "Upsert": add your row the first time, change it after that. The
    // database tells the two apart by user_id, the primary key. All four
    // targets are always sent, so clearing a box clears that target.
    const { error } = await supabase
      .from("user_settings")
      .upsert(
        { user_id: userId, ...result.value, updated_at: new Date().toISOString() },
        { onConflict: "user_id" },
      );
    if (error) {
      logDbError("saveTargets", error);
      return { ok: false, message: "Couldn't save. Please try again." };
    }

    revalidatePath("/settings");
    revalidatePath("/");
    return { ok: true, saved: result.value };
  });
}
