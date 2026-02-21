import React from "react";

type Variant = "score" | "trend";

type Props = {
  variant: Variant;
  label: string;
  lastScore: number | null;
  sparklineScores: number[];
  onClick: () => void;
};

function buildSparkPath(values: number[], w: number, h: number, pad: number) {
  const v = values.filter((n) => Number.isFinite(n)) as number[];
  if (v.length === 0) return { line: "", area: "" };

  const min = 0;
  const max = 100;

  const innerW = w - pad * 2;
  const innerH = h - pad * 2;

  const pts = v.map((val, i) => {
    const x = pad + (innerW * (v.length === 1 ? 0 : i / (v.length - 1)));
    const t = (val - min) / (max - min);
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
  const scores = (sparklineScores ?? [])
    .filter((n) => typeof n === "number" && Number.isFinite(n))
    .slice(0, 5);

  const trendValues = scores.slice().reverse();

  const w = 220;
  const h = 56;
  const pad = 6;
  const { line, area } = buildSparkPath(trendValues, w, h, pad);

  if (variant === "score") {
    return (
      <button
        type="button"
        onClick={onClick}
        className="w-full rounded-3xl border border-white/10 bg-white/5 p-5 text-center shadow-[0_10px_30px_rgba(0,0,0,0.18)] active:scale-[0.99]"
      >
        <div className="text-4xl font-black text-white leading-none">
          {typeof lastScore === "number" ? lastScore : "-"}
        </div>
        <div className="mt-2 text-[11px] font-black tracking-[0.22em] text-white/70">
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
        {scores.length > 0 ? (
          <svg
            width="100%"
            viewBox={`0 0 ${w} ${h}`}
            className="block w-full"
            aria-label="Score trend"
            role="img"
          >
            <path d={area} fill="currentColor" className="text-white/10" />
            <path
              d={line}
              fill="none"
              stroke="currentColor"
              className="text-white/70"
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
