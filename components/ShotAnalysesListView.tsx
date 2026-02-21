import React, { useEffect, useMemo, useState } from "react";
import type { ShotAnalysisRow } from "../types";
import { fetchShotAnalysesByShotType } from "../services/analysisStorage";

type ShotType = "3pt" | "ft";

type Props = {
  userId: string | null;
  shotType: ShotType;
  onBack: () => void;
};

function formatShotTitle(shotType: ShotType) {
  return shotType === "3pt" ? "Jumpshot (3PT)" : "Free Throw";
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

export default function ShotAnalysesListView({ userId, shotType, onBack }: Props) {
  const [rows, setRows] = useState<ShotAnalysisRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
        const data = await fetchShotAnalysesByShotType(userId, shotType, 20);
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
            <div className="mt-4 rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_14px_40px_rgba(0,0,0,0.20)]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[12px] text-white/60">Latest</div>
                  <div className="mt-1 text-sm font-semibold text-white">{formatDate(latest.created_at)}</div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-black text-white leading-none">{latest.score ?? "-"}</div>
                  <div className="mt-1 text-[11px] text-white/60">Score</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setExpandedId((v) => (v === latest.id ? null : latest.id))}
                className="mt-4 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm font-semibold text-white active:scale-[0.99]"
              >
                {expandedId === latest.id ? "Hide details" : "View details"}
              </button>

              {expandedId === latest.id ? (
                <div className="mt-4 space-y-3">
                  <div>
                    <div className="text-[12px] font-semibold text-white">Strengths</div>
                    <ul className="mt-2 space-y-1 text-[12px] text-white/70">
                      {(latest.strengths ?? []).slice(0, 6).map((s, i) => (
                        <li key={i}>• {s}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <div className="text-[12px] font-semibold text-white">Improvements</div>
                    <ul className="mt-2 space-y-1 text-[12px] text-white/70">
                      {(latest.improvements ?? []).slice(0, 6).map((s, i) => (
                        <li key={i}>• {s}</li>
                      ))}
                    </ul>
                  </div>

                  {latest.ai_coach_tip ? (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="text-[12px] font-semibold text-white">{latest.ai_coach_tip.title}</div>
                      <div className="mt-1 text-[12px] text-white/70">{latest.ai_coach_tip.body}</div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Rest (normales) */}
          <div className="mt-4 space-y-3">
            {rest.map((r) => {
              const isOpen = expandedId === r.id;
              return (
                <div key={r.id} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <button
                    type="button"
                    onClick={() => setExpandedId((v) => (v === r.id ? null : r.id))}
                    className="w-full text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white">{formatDate(r.created_at)}</div>
                        <div className="mt-1 text-[12px] text-white/60">{isOpen ? "Tap to collapse" : "Tap to expand"}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-black text-white leading-none">{r.score ?? "-"}</div>
                        <div className="mt-1 text-[11px] text-white/60">Score</div>
                      </div>
                    </div>
                  </button>

                  {isOpen ? (
                    <div className="mt-4 space-y-3">
                      <div>
                        <div className="text-[12px] font-semibold text-white">Strengths</div>
                        <ul className="mt-2 space-y-1 text-[12px] text-white/70">
                          {(r.strengths ?? []).slice(0, 6).map((s, i) => (
                            <li key={i}>• {s}</li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <div className="text-[12px] font-semibold text-white">Improvements</div>
                        <ul className="mt-2 space-y-1 text-[12px] text-white/70">
                          {(r.improvements ?? []).slice(0, 6).map((s, i) => (
                            <li key={i}>• {s}</li>
                          ))}
                        </ul>
                      </div>

                      {r.ai_coach_tip ? (
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                          <div className="text-[12px] font-semibold text-white">{r.ai_coach_tip.title}</div>
                          <div className="mt-1 text-[12px] text-white/70">{r.ai_coach_tip.body}</div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
