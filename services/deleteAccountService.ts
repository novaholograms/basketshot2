import { supabase } from "../lib/supabaseClient";

export async function deleteUserAccount(userId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    await supabase.auth.refreshSession();
  }

  const { data, error } = await supabase.functions.invoke("delete-account", {
    body: { userId },
  });

  if (error) {
    console.error("[deleteAccount] invoke error:", error);
    throw new Error("Could not delete account. Please try again.");
  }

  if (!data?.success) {
    console.error("[deleteAccount] unexpected response:", data);
    throw new Error("Could not delete account. Please try again.");
  }
}
