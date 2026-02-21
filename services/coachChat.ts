import { supabase } from "../lib/supabaseClient";

export type ChatMsg = { role: "user" | "model"; text: string };

export async function sendCoachChat(messages: ChatMsg[], context: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke("coach-chat", {
    body: { messages: messages.slice(-12), context },
  });

  if (error) throw error;

  const reply = ((data?.reply ?? "") as string).trim();
  return reply || "I had trouble responding. Please try again.";
}
