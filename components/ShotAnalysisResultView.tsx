import { useEffect, useState } from "react";
import type { ShotAnalysisRow } from "../types";
import { fetchShotAnalysisById } from "../services/analysisStorage";

type Props = {
  userId: string;
  analysisId: string;
  onBack: () => void;
};

export default function ShotAnalysisResultView({ userId, analysisId, onBack }: Props) {
  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<ShotAnalysisRow | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      try {
        const data = await fetchShotAnalysisById(userId, analysisId);
        if (!cancelled) setRow(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (userId && analysisId) run();
    return () => {
      cancelled = true;
    };
  }, [userId, analysisId]);

  if (loading || !row) {
    return (
      <div className="min-h-screen bg-background text-white max-w-md mx-auto px-6 py-8">
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-extrabold tracking-[0.2em] text-white/70"
        >
          BACK
        </button>
        <div className="mt-10 text-sm text-muted font-bold">Loading analysis...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-white max-w-md mx-auto px-6 py-8 pb-28">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-extrabold tracking-[0.2em] text-white/70 hover:text-white transition-colors"
        >
          BACK
        </button>

        <div className="text-[10px] font-extrabold tracking-[0.2em] text-white/50">
          {row.shot_type === "ft" ? "FREE THROW" : row.shot_type === "3pt" ? "JUMPSHOT" : "ANALYSIS"}
        </div>
      </div>

      <div className="mt-6 rounded-3xl bg-surface border border-white/5 p-6">
        <div className="text-xs font-extrabold uppercase tracking-[0.2em] text-muted">SCORE</div>
        <div className="mt-3 text-7xl font-extrabold text-white leading-none">
          {row.score ?? "—"}
        </div>
        <div className="mt-3 text-xs text-white/50 font-semibold">
          {new Date(row.created_at).toLocaleString()}
        </div>
      </div>

      <div className="mt-4 rounded-3xl bg-surface border border-white/5 p-5">
        <div className="text-xs font-extrabold uppercase tracking-[0.2em] text-muted">STRENGTHS</div>
        <ul className="mt-3 space-y-2">
          {(row.strengths ?? []).slice(0, 10).map((s, i) => (
            <li key={i} className="text-white/80 font-semibold text-sm leading-relaxed">
              • {s}
            </li>
          ))}
          {(!row.strengths || row.strengths.length === 0) && (
            <li className="text-white/50 text-sm font-semibold">—</li>
          )}
        </ul>
      </div>

      <div className="mt-4 rounded-3xl bg-surface border border-white/5 p-5">
        <div className="text-xs font-extrabold uppercase tracking-[0.2em] text-muted">
          IMPROVEMENTS
        </div>
        <ul className="mt-3 space-y-2">
          {(row.improvements ?? []).slice(0, 10).map((s, i) => (
            <li key={i} className="text-white/80 font-semibold text-sm leading-relaxed">
              • {s}
            </li>
          ))}
          {(!row.improvements || row.improvements.length === 0) && (
            <li className="text-white/50 text-sm font-semibold">—</li>
          )}
        </ul>
      </div>

      {row.ai_coach_tip && (
        <div className="mt-4 rounded-3xl bg-surface border border-white/5 p-5">
          <div className="text-xs font-extrabold uppercase tracking-[0.2em] text-muted">
            AI COACH
          </div>
          <div className="mt-3 rounded-2xl bg-white/5 border border-white/10 p-4 text-white/80 font-semibold text-sm leading-relaxed">
            {typeof row.ai_coach_tip === "string" ? row.ai_coach_tip : JSON.stringify(row.ai_coach_tip)}
          </div>
        </div>
      )}
    </div>
  );
}
