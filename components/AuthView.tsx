import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Capacitor } from "@capacitor/core";

export function AuthView() {
  const { signIn, signUp, signInWithApple, loading } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [appleBusy, setAppleBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showApple = Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);

    const res =
      mode === "login"
        ? await signIn(email.trim(), password)
        : await signUp(email.trim(), password);

    setBusy(false);
    if (res.ok === false) {
      setError(res.error);
    }
  };

  return (
    <div className="min-h-screen bg-background text-white max-w-md mx-auto px-6 py-10">
      <h1 className="text-3xl font-extrabold tracking-tight mb-2">BasketShot AI</h1>
      <p className="text-muted text-sm mb-8">
        {mode === "login" ? "Inicia sesión" : "Crea tu cuenta"} para continuar.
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="bg-surface rounded-2xl p-4 border border-white/5">
          <label className="text-xs font-bold uppercase tracking-wider text-muted">Email</label>
          <input
            className="mt-2 w-full bg-transparent outline-none text-white"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
          />
        </div>

        <div className="bg-surface rounded-2xl p-4 border border-white/5">
          <label className="text-xs font-bold uppercase tracking-wider text-muted">Password</label>
          <input
            className="mt-2 w-full bg-transparent outline-none text-white"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="mínimo 6 caracteres"
          />
        </div>

        {error && <div className="text-red-400 text-sm font-medium">{error}</div>}

        <button
          type="submit"
          disabled={busy || loading}
          className="w-full rounded-2xl bg-primary text-black py-3 font-extrabold disabled:opacity-60"
        >
          {busy ? "Procesando..." : mode === "login" ? "Entrar" : "Crear cuenta"}
        </button>

        {showApple && (
          <button
            type="button"
            disabled={busy || loading || appleBusy}
            onClick={async () => {
              setError(null);
              setAppleBusy(true);
              const res = await signInWithApple();
              setAppleBusy(false);
              if (res.ok === false) setError(res.error);
            }}
            className="w-full rounded-2xl bg-black py-3 font-extrabold text-white disabled:opacity-60 flex items-center justify-center gap-2"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
            {appleBusy ? "Conectando..." : "Continuar con Apple"}
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setError(null);
          }}
          className="w-full text-sm text-muted hover:text-white transition-colors"
        >
          {mode === "login" ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Inicia sesión"}
        </button>
      </form>
    </div>
  );
}
