import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Capacitor } from "@capacitor/core";
import { ArrowRight } from "lucide-react";

type AuthStage = "landing" | "auth" | "email";

export function AuthView() {
  const { signIn, signUp, signInWithApple, signInWithGoogle, loading } = useAuth();
  const [stage, setStage] = useState<AuthStage>("landing");
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [appleBusy, setAppleBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
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

  if (stage === "landing") {
    return (
      <div className="min-h-screen bg-black text-white max-w-md mx-auto px-6 py-8 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[600px] h-[600px] bg-primary/20 rounded-full blur-[180px]" />
        </div>

        <div className="relative z-10 flex flex-col items-center w-full">
          <div className="w-48 h-48 mb-8 relative flex items-center justify-center">
            <div className="absolute inset-0 bg-primary/10 rounded-full blur-2xl" />
            <div className="relative w-40 h-40 rounded-full border-2 border-primary/40 flex items-center justify-center">
              <svg className="w-24 h-24" viewBox="0 0 100 100" fill="none">
                <circle cx="50" cy="50" r="45" fill="#FF8A00" opacity="0.9"/>
                <path d="M30 35 L50 15 L70 35" stroke="black" strokeWidth="4" strokeLinecap="round"/>
                <path d="M30 65 L50 85 L70 65" stroke="black" strokeWidth="4" strokeLinecap="round"/>
                <path d="M35 50 L15 50" stroke="black" strokeWidth="4" strokeLinecap="round"/>
                <path d="M65 50 L85 50" stroke="black" strokeWidth="4" strokeLinecap="round"/>
                <line x1="50" y1="20" x2="50" y2="80" stroke="black" strokeWidth="4" strokeLinecap="round"/>
              </svg>
            </div>
          </div>

          <h1 className="text-5xl font-black text-center mb-2 tracking-tight">
            BasketShot<span className="text-primary">AI</span>
          </h1>

          <p className="text-center text-gray-400 text-base max-w-xs mb-16 px-4 leading-relaxed">
            Elevate your game with AI-powered coaching and real-time shot analysis.
          </p>

          <div className="flex gap-2 mb-12">
            <div className="w-8 h-1 rounded-full bg-primary" />
            <div className="w-8 h-1 rounded-full bg-gray-700" />
            <div className="w-8 h-1 rounded-full bg-gray-700" />
          </div>

          <button
            onClick={() => setStage("auth")}
            className="w-full bg-primary text-black font-black text-lg py-4 rounded-full flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors mb-8"
          >
            Get Started
            <ArrowRight size={22} strokeWidth={3} />
          </button>

          <p className="text-xs text-gray-600 font-bold tracking-widest uppercase">
            Trusted by 50,000+ athletes worldwide
          </p>
        </div>
      </div>
    );
  }

  if (stage === "auth") {
    return (
      <div className="min-h-screen bg-black text-white max-w-md mx-auto px-6 py-12 flex flex-col items-center">
        <div className="w-20 h-20 mb-8 relative flex items-center justify-center">
          <div className="w-16 h-16 rounded-full border border-primary/40 flex items-center justify-center">
            <svg className="w-10 h-10" viewBox="0 0 100 100" fill="none">
              <circle cx="50" cy="50" r="45" fill="#FF8A00" opacity="0.9"/>
              <path d="M30 35 L50 15 L70 35" stroke="black" strokeWidth="4" strokeLinecap="round"/>
              <path d="M30 65 L50 85 L70 65" stroke="black" strokeWidth="4" strokeLinecap="round"/>
              <path d="M35 50 L15 50" stroke="black" strokeWidth="4" strokeLinecap="round"/>
              <path d="M65 50 L85 50" stroke="black" strokeWidth="4" strokeLinecap="round"/>
              <line x1="50" y1="20" x2="50" y2="80" stroke="black" strokeWidth="4" strokeLinecap="round"/>
            </svg>
          </div>
        </div>

        <h2 className="text-4xl font-black mb-16 text-center">Join the Elite</h2>

        <div className="w-full space-y-4 mb-8">
          <button
            type="button"
            disabled={busy || loading || googleBusy}
            onClick={async () => {
              setError(null);
              setGoogleBusy(true);
              const res = await signInWithGoogle();
              setGoogleBusy(false);
              if (res.ok === false) setError(res.error);
            }}
            className="w-full bg-white text-black font-bold text-base py-4 rounded-full flex items-center justify-center gap-3 hover:bg-gray-100 transition-colors disabled:opacity-60"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {googleBusy ? "Connecting..." : "Continue with Google"}
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
              className="w-full bg-black border border-gray-700 text-white font-bold text-base py-4 rounded-full flex items-center justify-center gap-3 hover:border-gray-600 transition-colors disabled:opacity-60"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              {appleBusy ? "Connecting..." : "Continue with Apple"}
            </button>
          )}
        </div>

        <div className="flex items-center gap-4 w-full mb-8">
          <div className="flex-1 h-px bg-gray-800" />
          <span className="text-sm text-gray-600 font-bold uppercase tracking-wider">OR</span>
          <div className="flex-1 h-px bg-gray-800" />
        </div>

        {error && <div className="text-red-400 text-sm font-medium mb-4 text-center">{error}</div>}

        <div className="flex gap-3 w-full mb-8">
          <button
            onClick={() => {
              setMode("login");
              setStage("email");
            }}
            className="flex-1 bg-transparent border-2 border-primary text-primary font-bold text-base py-3 rounded-full hover:bg-primary/10 transition-colors"
          >
            Log In
          </button>
          <button
            onClick={() => {
              setMode("signup");
              setStage("email");
            }}
            className="flex-1 bg-transparent border-2 border-primary text-primary font-bold text-base py-3 rounded-full hover:bg-primary/10 transition-colors"
          >
            Sign Up
          </button>
        </div>

        <p className="text-xs text-gray-600 text-center max-w-xs leading-relaxed">
          BY CONTINUING, YOU AGREE TO OUR{" "}
          <span className="text-gray-400 underline">TERMS OF SERVICE</span> &{" "}
          <span className="text-gray-400 underline">PRIVACY POLICY</span>
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white max-w-md mx-auto px-6 py-10">
      <button
        onClick={() => setStage("auth")}
        className="mb-6 text-primary hover:text-primary/80 transition-colors"
      >
        ← Back
      </button>

      <h1 className="text-3xl font-extrabold tracking-tight mb-2">
        {mode === "login" ? "Log In" : "Sign Up"}
      </h1>
      <p className="text-gray-400 text-sm mb-8">
        {mode === "login" ? "Welcome back to BasketShot AI" : "Create your BasketShot AI account"}
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
            placeholder="your@email.com"
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
            placeholder="minimum 6 characters"
          />
        </div>

        {error && <div className="text-red-400 text-sm font-medium">{error}</div>}

        <button
          type="submit"
          disabled={busy || loading}
          className="w-full rounded-full bg-primary text-black py-4 font-bold text-base disabled:opacity-60"
        >
          {busy ? "Processing..." : mode === "login" ? "Log In" : "Sign Up"}
        </button>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setError(null);
          }}
          className="w-full text-sm text-gray-400 hover:text-white transition-colors pt-2"
        >
          {mode === "login" ? "Don't have an account? Sign Up" : "Already have an account? Log In"}
        </button>
      </form>
    </div>
  );
}
