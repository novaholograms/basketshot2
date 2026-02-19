import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.21.0";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

type Payload = {
  prompt: string;
  duration: number;
  intensity: "low" | "medium" | "high" | string;
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

function validatePayload(p: unknown): Payload | null {
  if (!p || typeof p !== "object") return null;
  const obj = p as Record<string, unknown>;
  if (typeof obj.prompt !== "string" || !obj.prompt.trim()) return null;
  if (typeof obj.duration !== "number" || !Number.isFinite(obj.duration) || obj.duration <= 0) return null;
  if (typeof obj.intensity !== "string" || !obj.intensity) return null;

  return {
    prompt: (obj.prompt as string).slice(0, 500),
    duration: Math.min(Math.max(Math.round(obj.duration as number), 5), 120),
    intensity: obj.intensity as string,
  };
}

async function checkRateLimit(supabaseAdmin: ReturnType<typeof createClient>, userId: string) {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await supabaseAdmin
    .from("gemini_usage_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);

  if (error) return { allowed: true };
  if ((count ?? 0) >= 10) return { allowed: false };
  return { allowed: true };
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
    await logUsage(supabaseAdmin, userId, "workout_rate_limited");
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
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 800,
      },
    });

    const prompt = `Create a ${payload.intensity} intensity basketball workout plan for exactly ${payload.duration} minutes focusing on: ${payload.prompt}.
Format as a structured markdown list:
- **Objective**
- **Warm-up** (Time)
- **Workout Phase 1** (Time & Details)
- **Workout Phase 2** (Time & Details)
- **Cool Down**
Keep it concise and actionable.`;

    const res = await model.generateContent(prompt);
    const text = res.response.text();

    const usageMeta = (res.response as unknown as { usageMetadata?: { totalTokenCount?: number } }).usageMetadata;
    await logUsage(supabaseAdmin, userId, "workout_ok", usageMeta?.totalTokenCount);

    return jsonResponse({ text }, 200);
  } catch {
    await logUsage(supabaseAdmin, userId, "workout_error");
    return jsonResponse({ error: "Gemini request failed" }, 502);
  }
});
