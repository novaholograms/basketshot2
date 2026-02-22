import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";
import { clearAnalysesCache } from "../utils/analysisCache";
import { clearDiaryCache } from "../utils/diaryCache";
import { Capacitor } from "@capacitor/core";
import { SignInWithApple } from "@capacitor-community/apple-sign-in";

export type ProfileRow = {
  id: string;
  created_at: string;
  onboarding_completed: boolean;
  onboarding_data: Record<string, any>;
  is_premium: boolean;
  premium_source: string | null;
  premium_expires_at: string | null;
  email?: string | null;
  full_name?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  wingspan_cm?: number | null;
  avatar_url?: string | null;
};

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  profile: ProfileRow | null;
  loading: boolean;

  signUp: (email: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  signIn: (email: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  signInWithApple: () => Promise<{ ok: true } | { ok: false; error: string }>;
  signOut: () => Promise<void>;

  refreshProfile: () => Promise<void>;
  updateProfile: (
    patch: Partial<
      Pick<
        ProfileRow,
        | "onboarding_completed"
        | "onboarding_data"
        | "is_premium"
        | "premium_source"
        | "premium_expires_at"
        | "email"
        | "full_name"
        | "height_cm"
        | "weight_kg"
        | "wingspan_cm"
        | "avatar_url"
      >
    >
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const base64UrlEncode = (bytes: Uint8Array) => {
  let str = "";
  bytes.forEach((b) => (str += String.fromCharCode(b)));
  const b64 = btoa(str);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const generateNonce = (length = 32) => {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
};

const sha256Hex = async (input: string) => {
  const enc = new TextEncoder().encode(input);
  const hashBuf = await crypto.subtle.digest("SHA-256", enc);
  const hashArr = Array.from(new Uint8Array(hashBuf));
  return hashArr.map((b) => b.toString(16).padStart(2, "0")).join("");
};

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

    if (!data) {
      console.log("[AUTH] profile not found, creating...", { uid });

      const { data: created, error: createError } = await supabase
        .from("profiles")
        .insert({
          id: uid,
          onboarding_completed: false,
          is_premium: false,
        })
        .select("*")
        .single();

      if (createError) {
        console.warn("[AUTH] createProfile error:", createError.message);
        setProfile(null);
        return;
      }

      setProfile(created as ProfileRow);
      return;
    }

    setProfile(data as ProfileRow);
  };

  const refreshProfile = async () => {
    if (!user?.id) return;
    await fetchProfile(user.id);
  };

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

  const signInWithApple = async () => {
    if (Capacitor.getPlatform() !== "ios") {
      return { ok: false as const, error: "Apple Sign-In solo disponible en iOS" };
    }

    try {
      const nonceRaw = generateNonce(32);
      const nonceHash = await sha256Hex(nonceRaw);

      const result = await SignInWithApple.authorize({
        scopes: ["email", "name"],
        state: generateNonce(16),
        nonce: nonceHash,
      } as any);

      const token =
        (result as any)?.response?.identityToken ||
        (result as any)?.identityToken ||
        (result as any)?.response?.id_token;

      if (!token) {
        return { ok: false as const, error: "No se obtuvo identityToken de Apple" };
      }

      const { error } = await supabase.auth.signInWithIdToken({
        provider: "apple",
        token,
        nonce: nonceRaw,
      });

      if (error) {
        return { ok: false as const, error: error.message ?? "Error Supabase Apple" };
      }

      const givenName =
        (result as any)?.response?.givenName ||
        (result as any)?.response?.fullName?.givenName;

      const familyName =
        (result as any)?.response?.familyName ||
        (result as any)?.response?.fullName?.familyName;

      const fullName = [givenName, familyName].filter(Boolean).join(" ").trim();
      if (fullName) {
        await supabase.auth.updateUser({ data: { full_name: fullName } });
      }

      return { ok: true as const };
    } catch (e: any) {
      if (e?.code === "1001" || e?.code === 1001 || String(e?.message || "").includes("1001")) {
        return { ok: false as const, error: "Inicio de sesión cancelado" };
      }
      return { ok: false as const, error: e?.message || "Error al iniciar sesión con Apple" };
    }
  };

  const signOut = async () => {
    if (user?.id) {
      clearAnalysesCache(user.id);
      clearDiaryCache(user.id);
    }
    await supabase.auth.signOut();
  };

  const updateProfile = async (
    patch: Partial<
      Pick<
        ProfileRow,
        | "onboarding_completed"
        | "onboarding_data"
        | "is_premium"
        | "premium_source"
        | "premium_expires_at"
        | "email"
        | "full_name"
        | "height_cm"
        | "weight_kg"
        | "wingspan_cm"
        | "avatar_url"
      >
    >
  ) => {
    if (!user?.id) return { ok: false as const, error: "No user logged in" };

    const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);

    if (error) return { ok: false as const, error: error.message };

    await refreshProfile();
    return { ok: true as const };
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      profile,
      loading,
      signUp,
      signIn,
      signInWithApple,
      signOut,
      refreshProfile,
      updateProfile,
    }),
    [user, session, profile, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
