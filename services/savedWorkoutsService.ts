import { supabase } from "../lib/supabaseClient";

const TABLE = "saved_workouts";

export async function getSavedWorkoutIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("workout_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[savedWorkouts] getSavedWorkoutIds error:", error);
    return [];
  }

  return (data ?? []).map((r: any) => r.workout_id as string);
}

export async function saveWorkout(
  userId: string,
  workoutId: string
): Promise<boolean> {
  const { error } = await supabase
    .from(TABLE)
    .insert({ user_id: userId, workout_id: workoutId });

  if (error) {
    // Idempotente si ya existe (unique constraint)
    const code = (error as any)?.code ?? "";
    const msg = ((error as any)?.message ?? "").toLowerCase();
    if (code === "23505" || msg.includes("duplicate")) return true;

    console.error("[savedWorkouts] saveWorkout error:", error);
    return false;
  }

  return true;
}

export async function unsaveWorkout(
  userId: string,
  workoutId: string
): Promise<boolean> {
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq("user_id", userId)
    .eq("workout_id", workoutId);

  if (error) {
    console.error("[savedWorkouts] unsaveWorkout error:", error);
    return false;
  }

  return true;
}
