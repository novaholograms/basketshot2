import React, { useEffect, useMemo, useState } from "react";
import type { ShotAnalysisRow } from "../types";
import { fetchShotAnalysesAll, fetchShotAnalysesByShotType } from "../services/analysisStorage";

type ShotType = "3pt" | "ft" | "all";

type Props = {
  userId: string | null;
  shotType: ShotType;
  onBack: () => void;
  onOpenAnalysis: (row: ShotAnalysisRow) => void;
};

function formatShotTitle(shotType: ShotType) {
  if (shotType === "all") return "All Analyses";
  return shotType === "3pt" ? "Jumpshot (3PT)" : "Free Throw";
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function ShotAnalysesListView({
  userId,
  shotType,
  onBack,
  onOpenAnalysis,
}: Props) {
  const [rows, setRows] = useState<ShotAnalysisRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!userId) {
        setRows([]);
        return;
      }

      setLoading(true);
      setErrorMsg(null);

      try {
        const data =
          shotType === "all"
            ? await fetchShotAnalysesAll(userId, 50)
            : await fetchShotAnalysesByShotType(userId, shotType, 20);
        if (!cancelled) setRows(data ?? []);
      } catch (e: any) {
        if (!cancelled) setErrorMsg(e?.message ?? "Failed to load analyses");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [userId, shotType]);

  const latest = rows[0] ?? null;
  const rest = useMemo(() => rows.slice(1), [rows]);

  return (
    <div className="px-6 pb-28">
      <div className="sticky top-0 z-10 -mx-6 px-6 pt-6 pb-4 bg-black/30 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white active:scale-[0.99]"
          >
            Back
          </button>
          <div className="text-sm font-semibold text-white">{formatShotTitle(shotType)} History</div>
          <div className="w-[64px]" />
        </div>
      </div>

      {loading ? (
        <div className="mt-6 text-sm text-white/70">Loading…</div>
      ) : errorMsg ? (
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
          {errorMsg}
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="text-3xl font-black text-white">-</div>
          <div className="mt-1 text-sm font-semibold text-white">Not analyzed yet</div>
          <div className="mt-2 text-[12px] text-white/60">Analyze this shot to see your progress here.</div>
        </div>
      ) : (
        <>
          {/* Latest (destacada) */}
          {latest ? (
            <button
              type="button"
              onClick={() => onOpenAnalysis(latest)}
              className="mt-4 w-full rounded-3xl border border-white/10 bg-white/5 p-5 text-left shadow-[0_14px_40px_rgba(0,0,0,0.20)] active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[12px] text-white/60">Latest</div>
                  <div className="mt-1 text-sm font-semibold text-white">
                    {formatDate(latest.created_at)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-black text-white leading-none">
                    {latest.score ?? "-"}
                  </div>
                  <div className="mt-1 text-[11px] text-white/60">Score</div>
                </div>
              </div>

              <div className="mt-4 text-[12px] text-white/60">
                Tap to open results
              </div>
            </button>
          ) : null}

          {/* Rest (normales) */}
          <div className="mt-4 space-y-3">
            {rest.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => onOpenAnalysis(r)}
                className="w-full rounded-3xl border border-white/10 bg-white/5 p-4 text-left active:scale-[0.99]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white">
                      {formatDate(r.created_at)}
                    </div>
                    <div className="mt-1 text-[12px] text-white/60">
                      Tap to open results
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-white leading-none">
                      {r.score ?? "-"}
                    </div>
                    <div className="mt-1 text-[11px] text-white/60">Score</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
