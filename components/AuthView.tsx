import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

export function AuthView() {
  const { signIn, signUp, loading } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
