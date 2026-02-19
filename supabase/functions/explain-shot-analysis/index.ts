import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.21.0";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

type ShotType = "3pt" | "ft" | string;

type Payload = {
  shotType: ShotType;
  score: number;
  metrics: Record<string, number>;
  context?: {
    framesProcessed?: number;
    framesValid?: number;
    trackingQuality?: number;
    duration?: number;
  };
};

type GeminiOut = {
  strengths: string[];
  improvements: string[];
  aiCoachTip?: {
    title: string;
    mainIssueTitle: string;
    body: string;
    targetScore: number;
  };
};

const ALLOWED_METRICS = ["elbowAlignment", "releaseHeight", "wristFlick", "lateralSway"] as const;
type AllowedMetricKey = typeof ALLOWED_METRICS[number];

function pickAllowedMetrics(metrics: Record<string, number>): Record<AllowedMetricKey, number> {
  const out: Record<AllowedMetricKey, number> = {
    elbowAlignment: 0,
    releaseHeight: 0,
    wristFlick: 0,
    lateralSway: 0,
  };
  for (const k of ALLOWED_METRICS) {
    const v = metrics?.[k];
    if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
  }
  return out;
}

const SYSTEM_PROMPT = `
You are a professional basketball shooting coach analyzing biomechanical metrics.

IMPORTANT RULES:
- NEVER modify or return a different score. The score is immutable and provided by the local engine.
- NEVER invent metrics or values. Only reference the provided values.
- You MUST ONLY talk about these four visible metrics and NOTHING else:
  1) Alignment (elbowAlignment)
  2) Release (releaseHeight)
  3) Flick (wristFlick)
  4) Stability (lateralSway)
- Do NOT mention any other metric names (stance width, knee loading, landing balance, vertical drive, etc.).
- Do NOT mention any percentages outside these 4 metrics.
- Focus on 1-2 weakest of the 4 metrics (<0.65) for improvements.
- Highlight 1-2 strongest of the 4 metrics (>0.80) as strengths.
- Be specific, actionable, encouraging. Use basketball coaching terminology.
- Output ONLY valid JSON matching the schema below. No markdown, no extra text.

OUTPUT JSON SCHEMA:
{
  "strengths": ["..."],
  "improvements": ["..."],
  "aiCoachTip": {
    "title": "Coach Tip",
    "mainIssueTitle": "...",
    "body": "...",
    "targetScore": 84
  }
}
`;

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

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function validatePayload(p: unknown): Payload | null {
  if (!p || typeof p !== "object") return null;
  const obj = p as Record<string, unknown>;
  if (typeof obj.shotType !== "string" || !obj.shotType) return null;
  if (typeof obj.score !== "number" || !Number.isFinite(obj.score)) return null;
  if (!obj.metrics || typeof obj.metrics !== "object") return null;

  const keys = Object.keys(obj.metrics as object);
  if (keys.length === 0 || keys.length > 50) return null;

  for (const k of keys) {
    const v = (obj.metrics as Record<string, unknown>)[k];
    if (typeof v !== "number" || !Number.isFinite(v)) return null;
  }

  return {
    shotType: obj.shotType as string,
    score: clamp(obj.score as number, 0, 100),
    metrics: obj.metrics as Record<string, number>,
    context: obj.context && typeof obj.context === "object" ? obj.context as Payload["context"] : undefined,
  };
}

function validateGeminiOut(o: unknown): GeminiOut | null {
  if (!o || typeof o !== "object") return null;
  const obj = o as Record<string, unknown>;
  if (!Array.isArray(obj.strengths) || !Array.isArray(obj.improvements)) return null;
  if (obj.strengths.some((s: unknown) => typeof s !== "string")) return null;
  if (obj.improvements.some((s: unknown) => typeof s !== "string")) return null;

  const out: GeminiOut = {
    strengths: (obj.strengths as string[]).slice(0, 5).map((s) => s.slice(0, 220)),
    improvements: (obj.improvements as string[]).slice(0, 7).map((s) => s.slice(0, 340)),
  };

  if (obj.aiCoachTip && typeof obj.aiCoachTip === "object") {
    const t = obj.aiCoachTip as Record<string, unknown>;
    if (
      typeof t.title === "string" &&
      typeof t.mainIssueTitle === "string" &&
      typeof t.body === "string" &&
      typeof t.targetScore === "number" &&
      Number.isFinite(t.targetScore)
    ) {
      out.aiCoachTip = {
        title: (t.title as string).slice(0, 60),
        mainIssueTitle: (t.mainIssueTitle as string).slice(0, 80),
        body: (t.body as string).slice(0, 420),
        targetScore: clamp(Math.round(t.targetScore as number), 0, 100),
      };
    }
  }

  return out;
}

async function checkRateLimit(supabaseAdmin: ReturnType<typeof createClient>, userId: string) {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await supabaseAdmin
    .from("gemini_usage_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);

  if (error) return { allowed: true, reason: "no_table" as const };
  if ((count ?? 0) >= 10) return { allowed: false, reason: "limit" as const };
  return { allowed: true, reason: "ok" as const };
}

async function logUsage(supabaseAdmin: ReturnType<typeof createClient>, userId: string, status: string, tokens?: number) {
  try {
    await supabaseAdmin.from("gemini_usage_log").insert({
      user_id: userId,
      status,
      tokens_used: tokens ?? null,
    });
  } catch {
    // ignore
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const geminiKey = Deno.env.get("GEMINI_API_KEY");

  if (!supabaseUrl || !serviceKey) return jsonResponse({ error: "Server misconfigured (supabase)" }, 500);
  if (!geminiKey) return jsonResponse({ error: "Server misconfigured (gemini)" }, 500);

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return jsonResponse({ error: "Unauthorized" }, 401);

  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: userRes, error: userErr } = await supabaseAdmin.auth.getUser(token);
  if (userErr || !userRes?.user) return jsonResponse({ error: "Unauthorized" }, 401);
  const userId = userRes.user.id;

  const rl = await checkRateLimit(supabaseAdmin, userId);
  if (!rl.allowed) {
    await logUsage(supabaseAdmin, userId, "rate_limited");
    return jsonResponse({ error: "Rate limit exceeded" }, 429);
  }

  const rawText = await req.text();
  if (rawText.length > 10_000) return jsonResponse({ error: "Payload too large" }, 413);

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const payload = validatePayload(parsed);
  if (!payload) return jsonResponse({ error: "Invalid payload" }, 400);

  try {
    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: 600,
        responseMimeType: "application/json",
      },
    });

    const visibleMetrics = pickAllowedMetrics(payload.metrics);
    const prompt = JSON.stringify({
      shotType: payload.shotType,
      score: payload.score,
      metrics: visibleMetrics,
      context: payload.context ?? {},
    });

    const res = await model.generateContent(prompt);
    const text = res.response.text();

    let outJson: unknown;
    try {
      outJson = JSON.parse(text);
    } catch {
      await logUsage(supabaseAdmin, userId, "bad_json");
      return jsonResponse({ error: "Model returned invalid JSON" }, 502);
    }

    const out = validateGeminiOut(outJson);
    if (!out) {
      await logUsage(supabaseAdmin, userId, "bad_schema");
      return jsonResponse({ error: "Model returned invalid schema" }, 502);
    }

    const usageMeta = (res.response as unknown as { usageMetadata?: { totalTokenCount?: number } }).usageMetadata;
    await logUsage(supabaseAdmin, userId, "ok", usageMeta?.totalTokenCount);

    return jsonResponse(out, 200);
  } catch {
    await logUsage(supabaseAdmin, userId, "error");
    return jsonResponse({ error: "Gemini request failed" }, 502);
  }
});
