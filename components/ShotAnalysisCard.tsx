import React from "react";

type Variant = "score" | "trend";

type Props = {
  variant: Variant;
  label: string;
  lastScore: number | null;
  sparklineScores: number[];
  onClick: () => void;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function getProgressColor(score: number) {
  if (score <= 29) return "text-red-400";
  if (score <= 49) return "text-yellow-300";
  if (score <= 59) return "text-orange-400";
  if (score <= 69) return "text-green-400";
  if (score <= 79) return "text-green-700";
  return "text-purple-400";
}

function getTrendColor(delta: number) {
  if (delta > 0) return "text-green-400";
  if (delta < 0) return "text-red-400";
  return "text-white/60";
}

function buildSparkPath(values: number[], w: number, h: number, pad: number) {
  const v = values.filter((n) => Number.isFinite(n)) as number[];
  if (v.length === 0) return { line: "", area: "" };

  const min = 1;
  const max = 100;

  const innerW = w - pad * 2;
  const innerH = h - pad * 2;

  const pts = v.map((val, i) => {
    const x = pad + (innerW * (v.length === 1 ? 0 : i / (v.length - 1)));
    const t = (clamp(val, min, max) - min) / (max - min);
    const y = pad + (1 - t) * innerH;
    return { x, y };
  });

  const line = pts
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ");
  const area = `${line} L ${pts[pts.length - 1].x.toFixed(2)} ${(h - pad).toFixed(
    2
  )} L ${pts[0].x.toFixed(2)} ${(h - pad).toFixed(2)} Z`;

  return { line, area };
}

export default function ShotAnalysisCard({
  variant,
  label,
  lastScore,
  sparklineScores,
  onClick,
}: Props) {
  const scoresDesc = (sparklineScores ?? [])
    .filter((n) => typeof n === "number" && Number.isFinite(n))
    .slice(0, 5);

  const scoresOldToNewRaw = scoresDesc.slice().reverse();
  const last = scoresDesc[0];
  const prev = scoresDesc[1];

  const lastClampedForTrend = typeof last === "number" ? clamp(last, 1, 100) : null;

  const scoresOldToNew =
    scoresOldToNewRaw.length === 1 && lastClampedForTrend !== null
      ? [1, lastClampedForTrend]
      : scoresOldToNewRaw.map((v) => clamp(v, 1, 100));

  const w = 220;
  const h = 56;
  const pad = 6;

  const { line, area } = buildSparkPath(scoresOldToNew, w, h, pad);

  const delta =
    typeof last === "number" && typeof prev === "number" ? last - prev : 0;

  const trendColorClass = getTrendColor(delta);

  if (variant === "score") {
    const pct = typeof lastScore === "number" ? clamp(lastScore, 0, 100) : 0;
    const barColorClass =
      typeof lastScore === "number" ? getProgressColor(lastScore) : "text-white/20";

    return (
      <button
        type="button"
        onClick={onClick}
        className="w-full rounded-3xl border border-white/10 bg-white/5 p-5 text-center shadow-[0_10px_30px_rgba(0,0,0,0.18)] active:scale-[0.99]"
      >
        <div className="text-4xl font-black text-white leading-none">
          {typeof lastScore === "number" ? lastScore : "-"}
        </div>

        <div className="mt-3">
          <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
            <div
              className={`h-full rounded-full ${barColorClass}`}
              style={{ width: `${pct}%`, backgroundColor: "currentColor" }}
            />
          </div>
        </div>

        <div className="mt-3 text-[11px] font-black tracking-[0.22em] text-white/70">
          {label}
        </div>

        {typeof lastScore !== "number" ? (
          <div className="mt-2 text-[11px] text-white/60">Not analyzed yet</div>
        ) : null}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-3xl border border-white/10 bg-white/5 p-4 text-left shadow-[0_10px_30px_rgba(0,0,0,0.18)] active:scale-[0.99]"
    >
      <div className="text-[11px] font-black tracking-[0.22em] text-white/70">
        TREND
      </div>

      <div className="mt-3">
        {scoresDesc.length > 0 ? (
          <svg
            width="100%"
            viewBox={`0 0 ${w} ${h}`}
            className={`block w-full ${trendColorClass}`}
            aria-label="Score trend"
            role="img"
          >
            <path d={area} fill="currentColor" opacity="0.18" />
            <path
              d={line}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <div className="h-[56px] rounded-2xl bg-white/5" />
        )}
      </div>
    </button>
  );
}
