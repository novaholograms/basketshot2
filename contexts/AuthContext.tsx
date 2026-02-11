import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";

export type ProfileRow = {
  id: string;
  created_at: string;
  onboarding_completed: boolean;
  onboarding_data: Record<string, any>;
  is_premium: boolean;
  premium_source: string | null;
  premium_expires_at: string | null;
};

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  profile: ProfileRow | null;
  loading: boolean;

  signUp: (email: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  signIn: (email: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  signOut: () => Promise<void>;

  refreshProfile: () => Promise<void>;
  updateProfile: (
    patch: Partial<
      Pick<
        ProfileRow,
        "onboarding_completed" | "onboarding_data" | "is_premium" | "premium_source" | "premium_expires_at"
      >
    >
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (uid: string) => {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
    if (error) {
      console.warn("[AUTH] fetchProfile error:", error.message);
      setProfile(null);
      return;
    }
    setProfile(data as ProfileRow);
  };

  const refreshProfile = useCallback(async () => {
    if (!user?.id) return;
    await fetchProfile(user.id);
  }, [user?.id]);

  useEffect(() => {
    let alive = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!alive) return;

      setSession(data.session);
      setUser(data.session?.user ?? null);

      if (data.session?.user) {
        await fetchProfile(data.session.user.id);
      }

      setLoading(false);
    })();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      (async () => {
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          await fetchProfile(newSession.user.id);
        } else {
          setProfile(null);
        }
      })();
    });

    return () => {
      alive = false;
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const updateProfile = useCallback(
    async (
      patch: Partial<
        Pick<
          ProfileRow,
          "onboarding_completed" | "onboarding_data" | "is_premium" | "premium_source" | "premium_expires_at"
        >
      >
    ) => {
      if (!user?.id) return { ok: false as const, error: "No user logged in" };

      const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);

      if (error) return { ok: false as const, error: error.message };

      await fetchProfile(user.id);
      return { ok: true as const };
    },
    [user?.id]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      profile,
      loading,
      signUp,
      signIn,
      signOut,
      refreshProfile,
      updateProfile,
    }),
    [user, session, profile, loading, refreshProfile, updateProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
