import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.21.0";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

type GameResult = "win" | "loss" | "draw" | "not_finished";

type DiaryEntryRow = {
  id: string;
  entry_date: string;
  notes?: string | null;
  result?: GameResult | null;
  score_manual?: string | null;
  points?: number | null;
  rebounds?: number | null;
  assists?: number | null;
  best_aspects?: string[] | null;
  worst_aspects?: string[] | null;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function summarize(entries: DiaryEntryRow[]) {
  const counts = { win: 0, loss: 0, draw: 0, not_finished: 0 };
  const bestFreq = new Map<string, number>();
  const worstFreq = new Map<string, number>();

  for (const e of entries) {
    if (e.result && counts[e.result] !== undefined) counts[e.result]++;
    for (const t of e.best_aspects ?? []) bestFreq.set(t, (bestFreq.get(t) ?? 0) + 1);
    for (const t of e.worst_aspects ?? []) worstFreq.set(t, (worstFreq.get(t) ?? 0) + 1);
  }

  const topN = (m: Map<string, number>, n = 5) =>
    [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k);

  return {
    counts,
    topBest: topN(bestFreq, 5),
    topWorst: topN(worstFreq, 5),
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") return jsonResponse({ tip: null, error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const geminiKey = Deno.env.get("GEMINI_API_KEY");

    if (!supabaseUrl || !serviceKey) return jsonResponse({ tip: null }, 200);
    if (!geminiKey) return jsonResponse({ tip: null }, 200);

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return jsonResponse({ tip: null }, 200);

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: userRes, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userRes?.user) return jsonResponse({ tip: null }, 200);

    const rawText = await req.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      return jsonResponse({ tip: null }, 200);
    }

    const body = parsed as { userId?: string; entries?: DiaryEntryRow[] };
    const safeEntries = Array.isArray(body.entries) ? body.entries.slice(0, 20) : [];

    if (safeEntries.length === 0) {
      return jsonResponse({ tip: null }, 200);
    }

    // Build rich context (latest entry + recent matches)
    const today = safeEntries[0];
    const recent = safeEntries.slice(0, 5);

    const todayNotes = (today?.notes ?? "").trim();
    const todayTitle = (today?.title ?? "").trim();
    const todayResult = today?.result ?? null;
    const todayScore = today?.score_manual ?? null;

    function fmtEntry(e: DiaryEntryRow) {
      const line1 = `- ${e.entry_date} | result: ${e.result ?? "n/a"} | score: ${e.score_manual ?? "n/a"} | P/R/A: ${e.points ?? "n/a"}/${e.rebounds ?? "n/a"}/${e.assists ?? "n/a"}`;
      const best = Array.isArray(e.best_aspects) ? e.best_aspects.filter(Boolean).slice(0, 3) : [];
      const worst = Array.isArray(e.worst_aspects) ? e.worst_aspects.filter(Boolean).slice(0, 3) : [];
      const line2 = `  strengths: ${best.join(", ") || "n/a"} | weaknesses: ${worst.join(", ") || "n/a"}`;
      const notes = (e.notes ?? "").trim();
      const line3 = notes ? `  how they felt: "${notes.slice(0, 400)}"` : `  how they felt: n/a`;
      return [line1, line2, line3].join("\n");
    }

    const recentBlock = recent.map(fmtEntry).join("\n\n");

    // High-level counts
    const { counts } = summarize(safeEntries);

    const prompt = [
      "You are a personal basketball coach.",
      "Write today's coaching advice in ENGLISH.",
      "Output: 1–2 short paragraphs. No emojis. No labels. No bullets unless absolutely necessary.",
      "Be specific and actionable: give 1–2 concrete things the player should do in their next training session.",
      "Use the diary context heavily, especially 'how they felt' (notes).",
      "If there is no meaningful diary info, return an encouraging but practical suggestion to log games.",
      "",
      "Today's entry (most recent):",
      `date: ${today?.entry_date ?? "n/a"}`,
      `title: ${todayTitle || "n/a"}`,
      `result: ${todayResult ?? "n/a"}`,
      `score: ${todayScore ?? "n/a"}`,
      `points/rebounds/assists: ${today?.points ?? "n/a"}/${today?.rebounds ?? "n/a"}/${today?.assists ?? "n/a"}`,
      `how they felt: "${todayNotes ? todayNotes.slice(0, 700) : "n/a"}"`,
      "",
      "Recent matches (latest first):",
      recentBlock || "n/a",
      "",
      "High-level summary:",
      `Wins: ${counts.win}, Draw/Not finished: ${counts.draw + counts.not_finished}, Losses: ${counts.loss}`,
    ].join("\n");

    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: 240,
      },
    });

    const res = await model.generateContent(prompt);
    const tip = res.response.text().trim();

    return jsonResponse({ tip: tip || null }, 200);
  } catch {
    return jsonResponse({ tip: null }, 200);
  }
});
