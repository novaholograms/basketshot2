import { supabase } from "../lib/supabaseClient";
import { fetchRecentDiaryEntries } from "./diaryService";

function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function readTodayMinutes(): number {
  try {
    const raw = localStorage.getItem("bs_today_minutes_v1");
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as { date: string; minutes: number };
    if (parsed.date !== todayKey()) return 0;
    return typeof parsed.minutes === "number" ? parsed.minutes : 0;
  } catch {
    return 0;
  }
}

function readWeekMinutes(): number {
  try {
    const raw = localStorage.getItem("bs_week_minutes_v1");
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as Record<string, number>;
    if (typeof parsed !== "object") return 0;
    return Object.values(parsed).reduce((acc, v) => acc + (typeof v === "number" ? v : 0), 0);
  } catch {
    return 0;
  }
}

export async function buildUserContext(userId: string): Promise<string> {
  const [profResult, diary] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, onboarding_data")
      .eq("id", userId)
      .maybeSingle(),
    fetchRecentDiaryEntries(userId).catch(() => []),
  ]);

  const prof = profResult.data;
  const od = (prof?.onboarding_data ?? {}) as Record<string, unknown>;

  const name = (prof?.full_name ?? (od.name as string) ?? "Unknown").slice(0, 40);
  const level = ((od.level as string) ?? "n/a").slice(0, 20);
  const position = ((od.position as string) ?? "n/a").slice(0, 20);
  const attributes = Array.isArray(od.attributes) ? (od.attributes as string[]).slice(0, 3).join(", ") : "n/a";
  const improvements = Array.isArray(od.improvements) ? (od.improvements as string[]).slice(0, 3).join(", ") : "n/a";

  let lastShot: Record<string, unknown> | null = null;
  try {
    const raw = localStorage.getItem(`basketshot_analyses_${userId}`);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length) lastShot = arr[0] as Record<string, unknown>;
    }
  } catch {}

  const todayMin = readTodayMinutes();
  const weekMin = readWeekMinutes();

  const recentDiary = (diary ?? []).slice(0, 10);
  const wins = recentDiary.filter((e) => e.result === "win").length;
  const losses = recentDiary.filter((e) => e.result === "loss").length;
  const diarySummary = recentDiary.length
    ? `${recentDiary.length} games: ${wins}W-${losses}L. ` +
      recentDiary
        .slice(0, 5)
        .map((e) => `${e.entry_date}: ${e.result ?? "n/a"} P${e.points ?? 0}/R${e.rebounds ?? 0}/A${e.assists ?? 0}`)
        .join(" | ")
    : "none";

  const shotSummary = lastShot
    ? `Last shot analysis: ${lastShot.shot_type ?? "n/a"}, score ${lastShot.score ?? "n/a"}. ` +
      `Strengths: ${((lastShot.strengths as string[]) ?? []).slice(0, 2).join(", ") || "n/a"}. ` +
      `Improvements: ${((lastShot.improvements as string[]) ?? []).slice(0, 2).join(", ") || "n/a"}.`
    : "Last shot analysis: none.";

  return [
    `Player: ${name}. Level: ${level}. Position: ${position}.`,
    `Strong at: ${attributes}. Wants to improve: ${improvements}.`,
    `Workouts: today ${todayMin} min, week ${weekMin} min.`,
    shotSummary,
    `Recent games: ${diarySummary}.`,
  ]
    .join("\n")
    .slice(0, 1200);
}
