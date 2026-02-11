import { supabase } from "../lib/supabaseClient";
import type { ShotAnalysisInsert, ShotAnalysisRow } from "../types";

export async function saveShotAnalysis(payload: ShotAnalysisInsert): Promise<ShotAnalysisRow> {
  const { data, error } = await supabase
    .from("shot_analyses")
    .insert(payload)
    .select("*")
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Failed to save analysis");

  return data as ShotAnalysisRow;
}

export async function fetchRecentShotAnalyses(userId: string, limit = 20): Promise<ShotAnalysisRow[]> {
  const { data, error } = await supabase
    .from("shot_analyses")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as ShotAnalysisRow[];
}

export async function deleteShotAnalysis(userId: string, id: string): Promise<void> {
  const { error } = await supabase
    .from("shot_analyses")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw error;
}

export async function fetchShotAnalysesByShotType(
  userId: string,
  shotType: string,
  limit = 20
): Promise<ShotAnalysisRow[]> {
  const { data, error } = await supabase
    .from("shot_analyses")
    .select("*")
    .eq("user_id", userId)
    .eq("shot_type", shotType)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as ShotAnalysisRow[];
}
