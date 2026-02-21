import { supabase } from "../lib/supabaseClient";
import type { GameResult } from "../types";

export type DiaryCoachEntry = {
  id: string;
  entry_date: string;
  result?: GameResult | null;
  score_manual?: string | null;
  points?: number | null;
  rebounds?: number | null;
  assists?: number | null;
  best_aspects?: string[] | null;
  worst_aspects?: string[] | null;
  notes?: string | null;
};

function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function fetchCoachTip(userId: string, entries: DiaryCoachEntry[]): Promise<string> {
  if (!entries || entries.length === 0) return "Log a game to see advice";

  const key = `coach_tip_${userId}_${todayKey()}`;

  const cached = localStorage.getItem(key);
  if (cached !== null && !cached.trim()) {
    localStorage.removeItem(key);
  }
  const cached2 = localStorage.getItem(key);
  if (cached2 && cached2.trim()) return cached2.trim();

  try {
    const { data, error } = await supabase.functions.invoke("diary-coach-tip", {
      body: { userId, entries: entries.slice(0, 20) },
    });

    if (error) return "Coach unavailable, try again later.";

    const tip = (data?.tip ?? null) as string | null;
    if (tip && tip.trim()) {
      localStorage.setItem(key, tip.trim());
      return tip.trim();
    }

    return "Coach unavailable, try again later.";
  } catch {
    return "Coach unavailable, try again later.";
  }
}
