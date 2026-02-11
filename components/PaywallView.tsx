import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

export function PaywallView() {
  const { updateProfile, signOut } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activateDemoPremium = async () => {
    setError(null);
    setBusy(true);
    const res = await updateProfile({ is_premium: true, premium_source: "demo" });
    setBusy(false);
    if (res.ok === false) {
      setError(res.error);
    }
  };

  return (
    <div className="min-h-screen bg-background text-white max-w-md mx-auto px-6 py-10">
      <h2 className="text-3xl font-extrabold tracking-tight mb-3">Premium requerido</h2>
      <p className="text-muted text-sm mb-8">
        Para usar la app necesitas Premium. (Pagos reales se integrarán con RevenueCat.)
      </p>

      {error && <div className="text-red-400 text-sm font-medium mb-4">{error}</div>}

      <button
        type="button"
        onClick={activateDemoPremium}
        disabled={busy}
        className="w-full rounded-2xl bg-primary text-black py-3 font-extrabold disabled:opacity-60"
      >
        {busy ? "Activando..." : "Activar Premium (demo)"}
      </button>

      <button
        type="button"
        onClick={() => void signOut()}
        className="w-full mt-3 rounded-2xl border border-white/10 py-3 font-bold text-sm"
      >
        Cerrar sesión
      </button>
    </div>
  );
}
