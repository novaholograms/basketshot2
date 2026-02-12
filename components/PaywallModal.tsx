import React, { useEffect, useMemo, useState } from "react";
import { X, Check, Loader2 } from "lucide-react";
import { useRevenueCat } from "../contexts/RevenueCatContext";
import type { PurchasesPackage } from "@revenuecat/purchases-capacitor";

type Props = {
  isOpen: boolean;
  onRequestClose: () => void;
  termsUrl: string;
  privacyUrl: string;
};

type PlanId = "annual" | "monthly";

export default function PaywallModal({
  isOpen,
  onRequestClose,
  termsUrl,
  privacyUrl,
}: Props) {
  const {
    offerings,
    isPremium,
    purchasePackage,
    restorePurchases,
    loading,
  } = useRevenueCat();

  const [selectedPlan, setSelectedPlan] = useState<PlanId>("annual");
  const [error, setError] = useState<string | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    if (isOpen && isPremium) {
      onRequestClose();
    }
  }, [isOpen, isPremium, onRequestClose]);

  const current = offerings?.current ?? null;

  const { annualPkg, monthlyPkg } = useMemo(() => {
    const pkgs = current?.availablePackages ?? [];
    const annual =
      pkgs.find((p: PurchasesPackage) => p.packageType === "ANNUAL") ??
      pkgs.find((p: PurchasesPackage) =>
        (p.identifier ?? "").toLowerCase().includes("annual")
      ) ??
      null;

    const monthly =
      pkgs.find((p: PurchasesPackage) => p.packageType === "MONTHLY") ??
      pkgs.find((p: PurchasesPackage) =>
        (p.identifier ?? "").toLowerCase().includes("month")
      ) ??
      null;

    return { annualPkg: annual, monthlyPkg: monthly };
  }, [current]);

  const selectedPkg = selectedPlan === "annual" ? annualPkg : monthlyPkg;

  const openExternal = (url: string) => {
    try {
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      // noop
    }
  };

  const handlePurchase = async () => {
    if (!selectedPkg) return;

    setIsPurchasing(true);
    setError(null);

    const result = await purchasePackage(selectedPkg);

    setIsPurchasing(false);

    if (!result.success) {
      setError(result.error || "Purchase failed");
    }
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    setError(null);

    const result = await restorePurchases();

    setIsRestoring(false);

    if (!result.success) {
      setError(result.error || "No active subscriptions found");
    }
  };

  if (!isOpen) return null;

  const benefits = [
    "Unlimited AI Shot Analysis",
    "Custom Pro Training Plans",
    "Advanced Performance Insights",
  ];

  const annualPrice = annualPkg?.product?.priceString ?? "$59.99";
  const monthlyPrice = monthlyPkg?.product?.priceString ?? "$8.99";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/90 backdrop-blur-sm"
        onClick={() => {
          if (isPremium) onRequestClose();
        }}
      />

      <div className="relative z-[101] w-full max-w-md mx-4 max-h-[95vh] overflow-y-auto no-scrollbar rounded-3xl bg-gradient-to-b from-black via-black to-[#0a0a0a] border border-white/10 shadow-2xl animate-in zoom-in-95 fade-in duration-300">
        {/* Close button */}
        <button
          type="button"
          onClick={() => {
            if (isPremium) onRequestClose();
          }}
          className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          aria-label="Close"
        >
          <X size={20} className="text-white/80" />
        </button>

        {/* Hero section with basketball hoop */}
        <div className="relative h-[240px] overflow-hidden rounded-t-3xl">
          <img
            src="https://images.pexels.com/photos/1752757/pexels-photo-1752757.jpeg?auto=compress&cs=tinysrgb&w=800"
            alt="Basketball court"
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/50 to-black" />

          {/* Title overlay */}
          <div className="absolute inset-0 flex items-center justify-center px-6">
            <div className="text-center">
              <h2 className="text-4xl font-black text-white leading-tight mb-1">
                Go Pro with
              </h2>
              <h2 className="text-4xl font-black leading-tight">
                <span className="text-[#f98006]">BasketShot AI</span>
              </h2>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-6">
          {/* Benefits */}
          <div className="space-y-4 mb-6">
            {benefits.map((benefit, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#f98006]/20 flex items-center justify-center flex-shrink-0">
                  <Check size={20} className="text-[#f98006]" />
                </div>
                <p className="text-base font-semibold text-white">{benefit}</p>
              </div>
            ))}
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-2xl p-3 text-sm text-red-400 font-medium">
              {error}
            </div>
          )}

          {/* Plans */}
          <div className="space-y-3 mb-6">
            {/* Annual plan */}
            <button
              type="button"
              onClick={() => setSelectedPlan("annual")}
              className={`relative w-full rounded-2xl border-2 p-4 transition-all ${
                selectedPlan === "annual"
                  ? "border-[#f98006] bg-[#f98006]/10"
                  : "border-white/10 bg-white/5"
              }`}
            >
              {/* Most popular badge */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-[#f98006] text-black text-xs font-extrabold px-4 py-1 rounded-full uppercase tracking-wider">
                  Most Popular
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-left">
                  <p className="text-sm font-bold text-white/60 uppercase tracking-widest">
                    Annual
                  </p>
                  <p className="text-3xl font-black text-white mt-1">
                    {annualPrice}
                    <span className="text-base font-semibold text-white/60">
                      {" "}
                      / year
                    </span>
                  </p>
                  <p className="text-sm font-semibold text-white/50 mt-1">
                    Save 45% compared to monthly
                  </p>
                </div>
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    selectedPlan === "annual"
                      ? "border-[#f98006] bg-[#f98006]"
                      : "border-white/30"
                  }`}
                >
                  {selectedPlan === "annual" && (
                    <div className="w-2 h-2 rounded-full bg-black" />
                  )}
                </div>
              </div>
            </button>

            {/* Monthly plan */}
            <button
              type="button"
              onClick={() => setSelectedPlan("monthly")}
              className={`relative w-full rounded-2xl border-2 p-4 transition-all ${
                selectedPlan === "monthly"
                  ? "border-[#f98006] bg-[#f98006]/10"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <p className="text-sm font-bold text-white/60 uppercase tracking-widest">
                    Monthly
                  </p>
                  <p className="text-3xl font-black text-white mt-1">
                    {monthlyPrice}
                    <span className="text-base font-semibold text-white/60">
                      {" "}
                      / month
                    </span>
                  </p>
                  <p className="text-sm font-semibold text-white/50 mt-1">
                    Cancel anytime
                  </p>
                </div>
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    selectedPlan === "monthly"
                      ? "border-[#f98006] bg-[#f98006]"
                      : "border-white/30"
                  }`}
                >
                  {selectedPlan === "monthly" && (
                    <div className="w-2 h-2 rounded-full bg-black" />
                  )}
                </div>
              </div>
            </button>
          </div>

          {/* CTA button */}
          <button
            type="button"
            onClick={handlePurchase}
            disabled={isPurchasing || !selectedPkg}
            className="w-full rounded-full bg-[#f98006] hover:bg-[#f98006]/90 text-black py-4 text-lg font-extrabold transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_0_30px_rgba(249,128,6,0.3)] mb-4"
          >
            {isPurchasing ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={20} className="animate-spin" />
                Processing...
              </span>
            ) : (
              "Unlock Pro Access"
            )}
          </button>

          {/* Footer links */}
          <div className="flex items-center justify-center gap-6 text-sm">
            <button
              type="button"
              onClick={handleRestore}
              disabled={isRestoring}
              className="font-semibold text-white/60 hover:text-white transition-colors disabled:opacity-60"
            >
              {isRestoring ? "Restoring..." : "Restore Purchase"}
            </button>
            <button
              type="button"
              onClick={() => openExternal(termsUrl)}
              className="font-semibold text-white/60 hover:text-white transition-colors"
            >
              Terms
            </button>
            <button
              type="button"
              onClick={() => openExternal(privacyUrl)}
              className="font-semibold text-white/60 hover:text-white transition-colors"
            >
              Privacy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
