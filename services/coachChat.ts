import { supabase } from "../lib/supabaseClient";

export type ChatMsg = { role: "user" | "model"; text: string };

export async function sendCoachChat(messages: ChatMsg[], context: string): Promise<string> {
  const { data: sessionRes, error: sessionErr } = await supabase.auth.getSession();

  // Mantengo el check de sesión para no hacer llamadas cuando no hay login.
  if (sessionErr || !sessionRes?.session) {
    return "Please sign in to use AI Coach.";
  }

  // IMPORTANTE: NO pasar headers manuales. El SDK inyecta apikey + Authorization automáticamente.
  const { data, error } = await supabase.functions.invoke("coach-chat", {
    body: { messages: messages.slice(-12), context },
  });

  if (error) {
    throw error;
  }

  const reply = (data?.reply ?? "") as string;
  return reply.trim() || "I had trouble responding. Please try again.";
}