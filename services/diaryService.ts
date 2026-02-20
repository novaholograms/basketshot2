import { supabase } from "../lib/supabaseClient";
import type { DiaryEntryInsert, DiaryEntryRow, DiaryEntryUpdate } from "../types";

export async function fetchRecentDiaryEntries(userId: string, limit = 50): Promise<DiaryEntryRow[]> {
  const { data, error } = await supabase
    .from("diary_entries")
    .select("*")
    .eq("user_id", userId)
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as DiaryEntryRow[];
}

export async function createDiaryEntry(payload: DiaryEntryInsert): Promise<DiaryEntryRow> {
  const { data, error } = await supabase
    .from("diary_entries")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
  return data as DiaryEntryRow;
}

export async function updateDiaryEntry(id: string, patch: DiaryEntryUpdate): Promise<DiaryEntryRow> {
  const { data, error } = await supabase
    .from("diary_entries")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data as DiaryEntryRow;
}

export async function deleteDiaryEntry(id: string): Promise<void> {
  const { error } = await supabase
    .from("diary_entries")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
