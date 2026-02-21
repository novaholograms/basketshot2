import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.21.0";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

type ChatMsg = { role: "user" | "model"; text: string };

type RequestBody = {
  messages?: ChatMsg[];
  context?: string;
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") return jsonResponse({ reply: null, error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const geminiKey = Deno.env.get("GEMINI_API_KEY");

    if (!supabaseUrl || !serviceKey) return jsonResponse({ reply: null, error: "Server misconfigured (supabase)" }, 500);
    if (!geminiKey) return jsonResponse({ reply: null, error: "Server misconfigured (gemini)" }, 500);

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return jsonResponse({ reply: null, error: "Unauthorized" }, 401);

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const { data: userRes, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userRes?.user) return jsonResponse({ reply: null, error: "Unauthorized" }, 401);

    const rawText = await req.text();
    if (rawText.length > 20_000) return jsonResponse({ reply: null, error: "Payload too large" }, 413);

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      return jsonResponse({ reply: null, error: "Invalid JSON" }, 400);
    }

    const body = parsed as RequestBody;
    const messages = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
    const context = typeof body.context === "string" ? body.context.slice(0, 1200) : "";

    if (messages.length === 0) {
      return jsonResponse({ reply: "What would you like to work on today?" }, 200);
    }

    const systemPrompt = [
      "You are a personal basketball coach. Be concise, specific, and actionable.",
      "Max 3 short paragraphs. No emojis. Focus on practical advice the player can apply immediately.",
      "If the player has no data yet, encourage them to log games and analyze their shot.",
      "",
      "Player context:",
      context || "No context available yet.",
    ].join("\n");

    const history = messages.slice(0, -1).map((m) => ({
      role: m.role === "user" ? ("user" as const) : ("model" as const),
      parts: [{ text: m.text }],
    }));

    const lastMessage = messages[messages.length - 1];

    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: systemPrompt,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 400,
      },
    });

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(lastMessage.text);
    const reply = result.response.text().trim();

    return jsonResponse({ reply: reply || "I had trouble responding. Please try again." }, 200);
  } catch {
    return jsonResponse({ reply: null, error: "Internal error" }, 500);
  }
});
