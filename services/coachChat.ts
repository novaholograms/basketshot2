import { supabase } from "../lib/supabaseClient";

export type ChatMsg = { role: "user" | "model"; text: string };

export async function sendCoachChat(messages: ChatMsg[], context: string): Promise<string> {
  const { data: sessionRes, error: sessionErr } = await supabase.auth.getSession();

  const token = sessionRes?.session?.access_token;
  if (sessionErr || !token) {
    return "Please sign in to use AI Coach.";
  }

  const { data, error } = await supabase.functions.invoke("coach-chat", {
    body: { messages: messages.slice(-12), context },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (error) {
    // Si sigue dando 401, el token no está llegando o la función está mal configurada
    throw error;
  }

  const reply = (data?.reply ?? "") as string;
  return reply.trim() || "I had trouble responding. Please try again.";
}