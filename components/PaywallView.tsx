import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useRevenueCat } from "../contexts/RevenueCatContext";
import { RevenueCatUI } from "@revenuecat/purchases-capacitor-ui";
import { Loader2, X } from "lucide-react";

export function PaywallView() {
  const { signOut } = useAuth();
  const { isPremium, refreshCustomerInfo, restorePurchases, error: rcError } = useRevenueCat();
  const [showingPaywall, setShowingPaywall] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isPremium) {
      refreshCustomerInfo();
    }
  }, [isPremium]);

  const handleShowPaywall = async () => {
    try {
      setShowingPaywall(true);
      setError(null);

      await RevenueCatUI.presentPaywall();

      await refreshCustomerInfo();
    } catch (err: any) {
      console.error("Paywall presentation error:", err);
      if (err.code !== "USER_CANCELLED") {
        setError(err.message || "Failed to show paywall");
      }
    } finally {
      setShowingPaywall(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    setError(null);
    const result = await restorePurchases();
    setRestoring(false);

    if (!result.success) {
      setError(result.error || "Failed to restore purchases");
    } else if (!isPremium) {
      setError("No active subscriptions found");
    }
  };

  useEffect(() => {
    handleShowPaywall();
  }, []);

  return (
    <div className="min-h-screen bg-background text-white max-w-md mx-auto px-6 py-10 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <span className="text-4xl">🏀</span>
        </div>

        <h2 className="text-3xl font-extrabold tracking-tight mb-3 text-center">
          Unlock BasketShot Pro
        </h2>
        <p className="text-muted text-sm mb-8 text-center max-w-sm">
          Get unlimited shot analysis, personalized coaching, and advanced performance tracking
        </p>

        {(error || rcError) && (
          <div className="w-full bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-4 flex items-start gap-3">
            <X size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-red-400 text-sm font-medium">{error || rcError}</p>
          </div>
        )}

        <button
          type="button"
          onClick={handleShowPaywall}
          disabled={showingPaywall}
          className="w-full rounded-2xl bg-primary text-black py-4 font-extrabold text-lg disabled:opacity-60 hover:bg-primary/90 transition-all active:scale-[0.98] shadow-[0_0_30px_rgba(249,128,6,0.3)] mb-4"
        >
          {showingPaywall ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 size={20} className="animate-spin" />
              Loading...
            </span>
          ) : (
            "View Subscription Plans"
          )}
        </button>

        <button
          type="button"
          onClick={handleRestore}
          disabled={restoring}
          className="text-primary text-sm font-bold hover:underline underline-offset-4 mb-8 disabled:opacity-60"
        >
          {restoring ? "Restoring..." : "Restore Purchases"}
        </button>

        <div className="space-y-4 mb-8">
          <FeatureItem icon="📊" text="Advanced shot analysis with AI coaching" />
          <FeatureItem icon="📈" text="Track your progress over time" />
          <FeatureItem icon="🎯" text="Personalized drill recommendations" />
          <FeatureItem icon="🔒" text="Unlimited video storage" />
        </div>
      </div>

      <button
        type="button"
        onClick={() => void signOut()}
        className="w-full rounded-2xl border border-white/10 py-3 font-bold text-sm hover:bg-white/5 transition-colors"
      >
        Sign Out
      </button>
    </div>
  );
}

function FeatureItem({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center text-xl flex-shrink-0">
        {icon}
      </div>
      <p className="text-sm font-medium text-white/80">{text}</p>
    </div>
  );
}
