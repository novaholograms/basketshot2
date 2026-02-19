import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization") || "";

    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      return json(401, { error: "missing_authorization", message: "Authorization Bearer token is required" });
    }

    const { userId } = await req.json().catch(() => ({}));

    if (!userId || typeof userId !== "string") {
      return json(400, { error: "bad_request", message: "Missing userId" });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return json(500, { error: "missing_env", message: "SUPABASE_URL / SUPABASE_ANON_KEY missing" });
    }
    if (!SERVICE_ROLE_KEY) {
      return json(500, { error: "missing_env", message: "SUPABASE_SERVICE_ROLE_KEY missing" });
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return json(401, { error: "invalid_jwt", message: userErr?.message || "Invalid JWT" });
    }

    if (userData.user.id !== userId) {
      return json(403, { error: "forbidden", message: "You can only delete your own account" });
    }

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    await adminClient.from("shot_analyses").delete().eq("user_id", userId).throwOnError();
    await adminClient.from("profiles").delete().eq("id", userId).throwOnError();

    const { error: delErr } = await adminClient.auth.admin.deleteUser(userId);
    if (delErr) {
      return json(500, { error: "delete_user_failed", message: delErr.message });
    }

    return json(200, { success: true });
  } catch (e) {
    return json(500, {
      error: "internal_error",
      message: e instanceof Error ? e.message : String(e),
    });
  }
});
