import { supabase } from "../lib/supabaseClient";

export async function deleteUserAccount(userId: string): Promise<void> {
  const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
  if (sessionErr) {
    console.error("[deleteAccount] getSession error:", sessionErr);
    throw new Error("Not signed in. Please log in again.");
  }

  const token = sessionData.session?.access_token;
  if (!token) {
    console.error("[deleteAccount] missing access_token");
    throw new Error("Not signed in. Please log in again.");
  }

  const { data, error } = await supabase.functions.invoke("delete-account", {
    body: { userId },
    headers: {
      Authorization: `Bearer ${token}`,
    },
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
