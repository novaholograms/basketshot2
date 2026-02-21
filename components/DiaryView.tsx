import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  fetchRecentDiaryEntries,
  createDiaryEntry,
  updateDiaryEntry,
  deleteDiaryEntry,
} from "../services/diaryService";
import { fetchCoachTip } from "../services/diaryCoachTip";
import type { GameResult, DiaryEntryRow } from "../types";

type DiaryEntry = DiaryEntryRow;

const BEST_WORST_OPTIONS = [
  "3PT",
  "Mid-range",
  "Layups",
  "Defense",
  "Passing",
  "Rebounds",
  "Mindset",
  "Conditioning",
  "Teamwork",
  "Free throws",
] as const;

const RESULT_PRIORITY: Record<GameResult, number> = {
  win: 3,
  draw: 2,
  not_finished: 2,
  loss: 1,
};

function formatMonthYear(d: Date) {
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function isoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function daysInMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

function mondayFirstWeekdayIndex(date: Date) {
  const js = date.getDay();
  return (js + 6) % 7;
}

function clampInt(v: string): number | null {
  const t = v.trim();
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.floor(n));
}

function badgeForResult(result?: GameResult | null) {
  if (result === "win") return { label: "WIN", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" };
  if (result === "loss") return { label: "LOSS", cls: "bg-red-500/15 text-red-400 border-red-500/20" };
  if (result === "draw") return { label: "DRAW", cls: "bg-orange-500/15 text-orange-400 border-orange-500/20" };
  if (result === "not_finished") return { label: "DNF", cls: "bg-white/10 text-white/70 border-white/10" };
  return { label: "—", cls: "bg-white/10 text-white/60 border-white/10" };
}

function dayBgForResult(result?: GameResult | null) {
  if (result === "win") return "bg-emerald-500/20 border-emerald-500/40 text-white";
  if (result === "loss") return "bg-red-500/20 border-red-500/40 text-white";
  if (result === "draw" || result === "not_finished") return "bg-orange-500/20 border-orange-500/40 text-white";
  return "bg-white/0 border-white/10 text-white/80";
}

function computeBestResultForDay(dayEntries: DiaryEntry[]): DiaryEntry | null {
  if (dayEntries.length === 0) return null;
  let best = dayEntries[0];
  for (const e of dayEntries.slice(1)) {
    const a = e.result ? RESULT_PRIORITY[e.result] : 0;
    const b = best.result ? RESULT_PRIORITY[best.result] : 0;
    if (a > b) best = e;
  }
  return best;
}

function mean(nums: Array<number | null | undefined>) {
  const vals = nums.filter((n): n is number => typeof n === "number" && Number.isFinite(n));
  if (!vals.length) return 0;
  return vals.reduce((acc, n) => acc + n, 0) / vals.length;
}

export const DiaryView: React.FC = () => {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [rangeFilter, setRangeFilter] = useState<"all" | "7d" | "30d">("all");

  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const [showWizard, setShowWizard] = useState(false);
  const [wizardMode, setWizardMode] = useState<"create" | "edit">("create");
  const [editingEntry, setEditingEntry] = useState<DiaryEntry | null>(null);

  const [showDetail, setShowDetail] = useState(false);
  const [detailEntry, setDetailEntry] = useState<DiaryEntry | null>(null);

  const [showDayPreview, setShowDayPreview] = useState(false);
  const [dayPreviewDate, setDayPreviewDate] = useState<string | null>(null);

  const [coachTip, setCoachTip] = useState<string | null>(null);
  const [coachTipLoading, setCoachTipLoading] = useState(false);

  const filteredEntries = useMemo(() => {
    let list = [...entries];

    if (rangeFilter !== "all") {
      const days = rangeFilter === "7d" ? 7 : 30;
      const now = new Date();
      const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1));
      const cutoffIso = isoDate(cutoff);
      list = list.filter((e) => (e.entry_date || "") >= cutoffIso);
    }

    if (selectedDate) {
      list = list.filter((e) => e.entry_date === selectedDate);
    }

    list.sort((a, b) => (b.entry_date || "").localeCompare(a.entry_date || ""));
    return list;
  }, [entries, rangeFilter, selectedDate]);

  const stats = useMemo(() => ({
    avgPoints: Math.round(mean(entries.map((e) => e.points))),
    avgReb: Math.round(mean(entries.map((e) => e.rebounds))),
    avgAst: Math.round(mean(entries.map((e) => e.assists))),
  }), [entries]);

  const entriesByDate = useMemo(() => {
    const map = new Map<string, DiaryEntry[]>();
    for (const e of entries) {
      const key = e.entry_date;
      if (!key) continue;
      const arr = map.get(key) ?? [];
      arr.push(e);
      map.set(key, arr);
    }
    return map;
  }, [entries]);

  const monthDays = useMemo(() => {
    const monthStart = startOfMonth(monthCursor);
    const total = daysInMonth(monthCursor);
    const offset = mondayFirstWeekdayIndex(monthStart);
    const cells: Array<{ day: number | null; iso: string | null }> = [];

    for (let i = 0; i < offset; i++) cells.push({ day: null, iso: null });
    for (let d = 1; d <= total; d++) {
      const date = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), d);
      cells.push({ day: d, iso: isoDate(date) });
    }
    while (cells.length % 7 !== 0) cells.push({ day: null, iso: null });

    return cells;
  }, [monthCursor]);

  const dayPreviewEntries = useMemo(() => {
    if (!dayPreviewDate) return [];
    return (entriesByDate.get(dayPreviewDate) ?? [])
      .slice()
      .sort((a, b) => (b.entry_date || "").localeCompare(a.entry_date || ""));
  }, [dayPreviewDate, entriesByDate]);

  async function load() {
    if (!userId) return;
    setLoading(true);
    try {
      const data = await fetchRecentDiaryEntries(userId);
      setEntries((data ?? []) as DiaryEntry[]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!userId) return;
      setCoachTipLoading(true);
      try {
        const tip = await fetchCoachTip(userId, entries.slice(0, 20));
        if (!cancelled) setCoachTip(tip);
      } finally {
        if (!cancelled) setCoachTipLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [userId, entries]);

  function openCreateWizard() {
    setWizardMode("create");
    setEditingEntry(null);
    setShowWizard(true);
  }

  function openEditWizard(entry: DiaryEntry) {
    setWizardMode("edit");
    setEditingEntry(entry);
    setShowDetail(false);
    setDetailEntry(null);
    setShowWizard(true);
  }

  function openDetail(entry: DiaryEntry) {
    setDetailEntry(entry);
    setShowDetail(true);
  }

  function openDayPreview(dateIso: string) {
    setSelectedDate(dateIso);
    setDayPreviewDate(dateIso);
    setShowDayPreview(true);
  }

  async function handleDelete(entry: DiaryEntry) {
    await deleteDiaryEntry(entry.id);
    setShowDetail(false);
    setDetailEntry(null);
    await load();
  }

  return (
    <div className="space-y-6">
     <div className="relative flex items-center justify-center">
  <div className="text-center">
    <div className="text-xs font-extrabold uppercase tracking-[0.2em] text-muted">
      BECOME A BEAST.
    </div>
    <h1 className="mt-1 text-2xl font-extrabold text-white">Your Diary</h1>
  </div>
</div>

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 rounded-3xl bg-surface p-8 border border-white/5 flex flex-col items-center justify-center text-center">
          <div className="text-xs font-extrabold uppercase tracking-[0.2em] text-muted">AVG POINTS</div>
          <div className="mt-3 text-7xl font-extrabold text-white leading-none">{stats.avgPoints}</div>
        </div>
        <div className="rounded-3xl bg-surface p-6 border border-white/5 flex flex-col items-center justify-center text-center">
          <div className="text-xs font-extrabold uppercase tracking-[0.2em] text-muted">REBOUNDS</div>
          <div className="mt-3 text-4xl font-extrabold text-white leading-none">{stats.avgReb}</div>
        </div>
        <div className="rounded-3xl bg-surface p-6 border border-white/5 flex flex-col items-center justify-center text-center">
          <div className="text-xs font-extrabold uppercase tracking-[0.2em] text-muted">ASSISTS</div>
          <div className="mt-3 text-4xl font-extrabold text-white leading-none">{stats.avgAst}</div>
        </div>
      </div>

      <button
        type="button"
        onClick={openCreateWizard}
        className="w-full rounded-3xl bg-primary px-6 py-5 text-base font-extrabold text-black shadow-[0_10px_30px_rgba(0,0,0,0.25)] active:scale-[0.99] transition-transform"
      >
        Log a game
      </button>

      <div className="rounded-3xl bg-surface border border-white/5 p-5">
        <div className="text-xs font-extrabold  tracking-[0.2em] text-muted">Coach's Advice</div>
        {coachTipLoading ? (
          <div className="mt-3 h-14 rounded-2xl bg-white/5 animate-pulse" />
        ) : (
          <div className="mt-3 rounded-2xl bg-white/5 border border-white/10 p-4 text-white/80 font-semibold text-sm leading-relaxed">
            {coachTip ?? "Log a game to see advice"}
          </div>
        )}
      </div>

      <div className="rounded-3xl bg-surface border border-white/5 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-extrabold text-white">{formatMonthYear(monthCursor)}</div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMonthCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
              className="h-9 w-9 rounded-2xl bg-white/5 border border-white/10 text-white/80 flex items-center justify-center text-lg font-bold"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => setMonthCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
              className="h-9 w-9 rounded-2xl bg-white/5 border border-white/10 text-white/80 flex items-center justify-center text-lg font-bold"
            >
              ›
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((h) => (
            <div key={h} className="text-center text-[10px] font-extrabold uppercase tracking-[0.15em] text-white/30 pb-2">
              {h}
            </div>
          ))}
          {monthDays.map((cell, idx) => {
            if (!cell.day || !cell.iso) {
              return <div key={idx} className="h-10 rounded-xl" />;
            }

            const dayEntries = entriesByDate.get(cell.iso) ?? [];
            const best = computeBestResultForDay(dayEntries);
            const isSelected = selectedDate === cell.iso;
            const colorCls = dayBgForResult(best?.result);

            return (
              <button
                key={idx}
                type="button"
                onClick={() => openDayPreview(cell.iso!)}
                className={[
                  "h-10 rounded-2xl border text-sm font-extrabold flex items-center justify-center transition-colors",
                  colorCls,
                  isSelected ? "ring-2 ring-primary" : "",
                ].join(" ")}
              >
                {cell.day}
              </button>
            );
          })}
        </div>
      </div>

      <div className="text-base font-extrabold text-white/80 tracking-wide">Match history</div>

      <div className="flex items-center gap-2 flex-wrap">
        {(["all", "7d", "30d"] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setRangeFilter(id)}
            className={[
              "rounded-2xl px-4 py-2 text-sm font-extrabold border transition-colors",
              rangeFilter === id
                ? "bg-primary/10 border-primary/30 text-white"
                : "bg-white/0 border-white/10 text-white/70",
            ].join(" ")}
          >
            {id === "all" ? "All" : id === "7d" ? "Last 7d" : "Last 30d"}
          </button>
        ))}
        {selectedDate && (
          <button
            type="button"
            onClick={() => setSelectedDate(null)}
            className="ml-auto text-xs font-extrabold uppercase tracking-[0.2em] text-white/40"
          >
            {selectedDate} ✕
          </button>
        )}
      </div>

      <div className="space-y-3 pb-4">
        {loading && (
          <div className="rounded-3xl bg-surface border border-white/5 p-6 text-white/50 text-sm font-extrabold">
            Loading…
          </div>
        )}

        {!loading && filteredEntries.length === 0 && (
          <div className="rounded-3xl bg-surface border border-white/5 p-8 text-center">
            <div className="text-white/40 text-sm font-extrabold uppercase tracking-[0.15em]">No games yet</div>
            <div className="mt-2 text-white/25 text-xs">Tap "Log a game" to add your first entry</div>
          </div>
        )}

        {filteredEntries.map((e) => {
          const b = badgeForResult(e.result ?? null);
          return (
            <button
              key={e.id}
              type="button"
              onClick={() => openDetail(e)}
              className="w-full text-left rounded-3xl bg-surface border border-white/5 p-5 active:scale-[0.99] transition-transform"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-3 py-1 rounded-2xl text-xs font-extrabold border ${b.cls}`}>{b.label}</span>
                  <span className="text-sm font-extrabold text-white">{e.entry_date}</span>
                  {e.score_manual ? <span className="text-sm text-white/50">{e.score_manual}</span> : null}
                </div>
                <span className="text-white/30 text-lg">›</span>
              </div>
              <div className="mt-3 flex items-center gap-5 text-sm text-white/60">
                <span><span className="font-extrabold text-white">{e.points ?? 0}</span> PTS</span>
                <span><span className="font-extrabold text-white">{e.rebounds ?? 0}</span> REB</span>
                <span><span className="font-extrabold text-white">{e.assists ?? 0}</span> AST</span>
              </div>
            </button>
          );
        })}
      </div>

      {showDayPreview && dayPreviewDate && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end" onClick={() => setShowDayPreview(false)}>
          <div
            className="w-full max-w-md mx-auto rounded-t-[28px] bg-background border-t border-white/10 p-6 pb-8"
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-5">
              <div>
                <div className="text-xs font-extrabold uppercase tracking-[0.2em] text-muted">Day preview</div>
                <div className="mt-1 text-lg font-extrabold text-white">{dayPreviewDate}</div>
              </div>
              <button
                type="button"
                onClick={() => setShowDayPreview(false)}
                className="h-10 w-10 rounded-2xl bg-white/5 border border-white/10 text-white/80 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {dayPreviewEntries.length === 0 && (
                <div className="rounded-3xl bg-surface border border-white/5 p-5 text-white/70 text-sm font-extrabold text-center">
                  No games for this day.
                </div>
              )}

              {dayPreviewEntries.map((e) => {
                const b = badgeForResult(e.result ?? null);
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => {
                      setShowDayPreview(false);
                      openDetail(e);
                    }}
                    className="w-full text-left rounded-3xl bg-surface border border-white/5 p-5 active:scale-[0.99] transition-transform"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-2xl text-xs font-extrabold border ${b.cls}`}>{b.label}</span>
                        {e.score_manual ? <span className="text-sm text-white/50">{e.score_manual}</span> : null}
                      </div>
                      <span className="text-white/30">›</span>
                    </div>
                    <div className="mt-3 flex items-center gap-4 text-sm text-white/60">
                      <span><span className="font-extrabold text-white">{e.points ?? 0}</span> PTS</span>
                      <span><span className="font-extrabold text-white">{e.rebounds ?? 0}</span> REB</span>
                      <span><span className="font-extrabold text-white">{e.assists ?? 0}</span> AST</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {showDetail && detailEntry && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end" onClick={() => setShowDetail(false)}>
          <div
            className="w-full max-w-md mx-auto rounded-t-[28px] bg-background border-t border-white/10 p-6 pb-10 max-h-[85vh] overflow-y-auto"
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-5">
              <div>
                <div className="text-xs font-extrabold uppercase tracking-[0.2em] text-muted">Game</div>
                <div className="mt-1 text-lg font-extrabold text-white">{detailEntry.entry_date}</div>
              </div>
              <button
                type="button"
                onClick={() => setShowDetail(false)}
                className="h-10 w-10 rounded-2xl bg-white/5 border border-white/10 text-white/80 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="rounded-3xl bg-surface border border-white/5 p-5 space-y-5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-3 py-1 rounded-2xl text-xs font-extrabold border ${badgeForResult(detailEntry.result ?? null).cls}`}>
                  {badgeForResult(detailEntry.result ?? null).label}
                </span>
                {detailEntry.score_manual ? <span className="text-white/60 text-sm">{detailEntry.score_manual}</span> : null}
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "PTS", val: detailEntry.points },
                  { label: "REB", val: detailEntry.rebounds },
                  { label: "AST", val: detailEntry.assists },
                ].map((s) => (
                  <div key={s.label} className="rounded-2xl bg-white/5 border border-white/10 p-4 text-center">
                    <div className="text-xs font-extrabold uppercase tracking-[0.2em] text-white/40">{s.label}</div>
                    <div className="mt-1 text-2xl font-extrabold text-white">{s.val ?? 0}</div>
                  </div>
                ))}
              </div>

              <div>
                <div className="text-xs font-extrabold uppercase tracking-[0.2em] text-white/40 mb-2">Best</div>
                <div className="flex flex-wrap gap-2">
                  {(detailEntry.best_aspects ?? []).length ? (
                    (detailEntry.best_aspects ?? []).map((t) => (
                      <span key={t} className="px-3 py-1 rounded-2xl bg-primary/10 border border-primary/20 text-sm text-white">{t}</span>
                    ))
                  ) : (
                    <span className="text-white/40 text-sm">—</span>
                  )}
                </div>
              </div>

              <div>
                <div className="text-xs font-extrabold uppercase tracking-[0.2em] text-white/40 mb-2">Worst</div>
                <div className="flex flex-wrap gap-2">
                  {(detailEntry.worst_aspects ?? []).length ? (
                    (detailEntry.worst_aspects ?? []).map((t) => (
                      <span key={t} className="px-3 py-1 rounded-2xl bg-white/5 border border-white/10 text-sm text-white/80">{t}</span>
                    ))
                  ) : (
                    <span className="text-white/40 text-sm">—</span>
                  )}
                </div>
              </div>

              <div>
                <div className="text-xs font-extrabold uppercase tracking-[0.2em] text-white/40 mb-2">How did you feel?</div>
                <div className="rounded-2xl bg-white/5 border border-white/10 p-4 text-white/80 text-sm">
                  {detailEntry.notes?.trim() ? detailEntry.notes : "—"}
                </div>
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => openEditWizard(detailEntry)}
                className="flex-1 rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-sm font-extrabold text-white active:scale-95 transition-transform"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => handleDelete(detailEntry)}
                className="flex-1 rounded-2xl bg-red-500/15 border border-red-500/20 px-4 py-3 text-sm font-extrabold text-red-300 active:scale-95 transition-transform"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showWizard && (
        <DiaryWizard
          userId={userId}
          mode={wizardMode}
          initial={editingEntry}
          onClose={() => setShowWizard(false)}
          onSaved={async () => {
            setShowWizard(false);
            await load();
          }}
        />
      )}
    </div>
  );
};

function DiaryWizard({
  userId,
  mode,
  initial,
  onClose,
  onSaved,
}: {
  userId: string | null;
  mode: "create" | "edit";
  initial: DiaryEntry | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = mode === "edit";
  const totalSteps = 6;

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const [date, setDate] = useState<string>(() => initial?.entry_date ?? isoDate(new Date()));
  const [result, setResult] = useState<GameResult | null>(() => initial?.result ?? null);
  const [scoreManual, setScoreManual] = useState<string>(() => initial?.score_manual ?? "");

  const [points, setPoints] = useState<string>(() =>
    typeof initial?.points === "number" ? String(initial.points) : ""
  );
  const [rebounds, setRebounds] = useState<string>(() =>
    typeof initial?.rebounds === "number" ? String(initial.rebounds) : ""
  );
  const [assists, setAssists] = useState<string>(() =>
    typeof initial?.assists === "number" ? String(initial.assists) : ""
  );

  const [best, setBest] = useState<string[]>(() => initial?.best_aspects ?? []);
  const [worst, setWorst] = useState<string[]>(() => initial?.worst_aspects ?? []);
  const [notes, setNotes] = useState<string>(() => initial?.notes ?? "");

  const canNext = useMemo(() => {
    if (step === 1) return !!date;
    if (step === 2) return !!result;
    return true;
  }, [step, date, result]);

  function toggle(list: string[], val: string) {
    return list.includes(val) ? list.filter((x) => x !== val) : [...list, val];
  }

  async function save() {
    if (!userId || !result) return;
    setSaving(true);
    try {
      const payload = {
        entry_date: date,
        title: "Game",
        notes: notes.trim() || "",
        result,
        score_manual: scoreManual.trim() || null,
        points: clampInt(points),
        rebounds: clampInt(rebounds),
        assists: clampInt(assists),
        best_aspects: best,
        worst_aspects: worst,
      };

      if (isEdit && initial?.id) {
        await updateDiaryEntry(initial.id, payload);
      } else {
        await createDiaryEntry({ user_id: userId, ...payload });
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[110] bg-background flex flex-col">
      <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-white/5">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="h-10 w-10 rounded-2xl bg-white/5 border border-white/10 text-white/80 flex items-center justify-center"
          >
            ✕
          </button>
          <div className="text-sm font-extrabold text-white">{step} / {totalSteps}</div>
          <div className="w-10" />
        </div>
        <div className="mt-4 h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pt-6 pb-32">
        <div key={step} className="animate-in fade-in slide-in-from-right-4 duration-200">
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <div className="text-xs font-extrabold uppercase tracking-[0.2em] text-muted">Step 1</div>
                <div className="text-2xl font-extrabold text-white mt-1">When was the game?</div>
              </div>
              <div className="rounded-3xl bg-surface border border-white/5 p-6">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-4 text-lg font-extrabold text-white focus:outline-none focus:border-primary/40"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <div className="text-xs font-extrabold uppercase tracking-[0.2em] text-muted">Step 2</div>
                <div className="text-2xl font-extrabold text-white mt-1">What was the result?</div>
              </div>
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => setResult("win")}
                  className={[
                    "rounded-3xl border p-6 text-left transition-colors",
                    result === "win"
                      ? "bg-emerald-500/20 border-emerald-500/40 text-white"
                      : "bg-surface border-white/10 text-white/80",
                  ].join(" ")}
                >
                  <div className="text-lg font-extrabold">Win</div>
                </button>
                <button
                  type="button"
                  onClick={() => setResult("draw")}
                  className={[
                    "rounded-3xl border p-6 text-left transition-colors",
                    result === "draw" || result === "not_finished"
                      ? "bg-orange-500/20 border-orange-500/40 text-white"
                      : "bg-surface border-white/10 text-white/80",
                  ].join(" ")}
                >
                  <div className="text-lg font-extrabold">Draw / Not finished</div>
                </button>
                <button
                  type="button"
                  onClick={() => setResult("loss")}
                  className={[
                    "rounded-3xl border p-6 text-left transition-colors",
                    result === "loss"
                      ? "bg-red-500/20 border-red-500/40 text-white"
                      : "bg-surface border-white/10 text-white/80",
                  ].join(" ")}
                >
                  <div className="text-lg font-extrabold">Loss</div>
                </button>
              </div>
              <div className="rounded-3xl bg-surface border border-white/5 p-6">
                <div className="text-xs font-extrabold uppercase tracking-[0.2em] text-white/40">Score (optional)</div>
                <input
                  value={scoreManual}
                  onChange={(e) => setScoreManual(e.target.value)}
                  placeholder='e.g. "92–88"'
                  className="mt-3 w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-4 text-base font-extrabold text-white placeholder:text-white/25 focus:outline-none focus:border-primary/40"
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div>
                <div className="text-xs font-extrabold uppercase tracking-[0.2em] text-muted">Step 3</div>
                <div className="text-2xl font-extrabold text-white mt-1">Your stats</div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Points", v: points, set: setPoints },
                  { label: "Rebounds", v: rebounds, set: setRebounds },
                  { label: "Assists", v: assists, set: setAssists },
                ].map((f) => (
                  <div key={f.label} className="rounded-3xl bg-surface border border-white/5 p-4">
                    <div className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-white/40">{f.label}</div>
                    <input
                      inputMode="numeric"
                      value={f.v}
                      onChange={(e) => f.set(e.target.value.replace(/[^\d]/g, ""))}
                      className="mt-3 w-full rounded-2xl bg-white/5 border border-white/10 px-2 py-4 text-center text-2xl font-extrabold text-white focus:outline-none focus:border-primary/40"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <div>
                <div className="text-xs font-extrabold uppercase tracking-[0.2em] text-muted">Step 4</div>
                <div className="text-2xl font-extrabold text-white mt-1">What went best?</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {BEST_WORST_OPTIONS.map((t) => {
                  const selected = best.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setBest((v) => toggle(v, t))}
                      className={[
                        "rounded-2xl border px-4 py-4 text-sm font-extrabold transition-colors",
                        selected
                          ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-200"
                          : "bg-white/0 border-white/10 text-white/70",
                      ].join(" ")}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-5">
              <div>
                <div className="text-xs font-extrabold uppercase tracking-[0.2em] text-muted">Step 5</div>
                <div className="text-2xl font-extrabold text-white mt-1">What went worst?</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {BEST_WORST_OPTIONS.map((t) => {
                  const selected = worst.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setWorst((v) => toggle(v, t))}
                      className={[
                        "rounded-2xl border px-4 py-4 text-sm font-extrabold transition-colors",
                        selected
                          ? "bg-red-500/15 border-red-500/30 text-red-200"
                          : "bg-white/0 border-white/10 text-white/70",
                      ].join(" ")}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-5">
              <div>
                <div className="text-xs font-extrabold uppercase tracking-[0.2em] text-muted">Step 6</div>
                <div className="text-2xl font-extrabold text-white mt-1">Review</div>
              </div>

              <div className="rounded-3xl bg-surface border border-white/5 p-5 space-y-5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-3 py-1 rounded-2xl text-xs font-extrabold border ${badgeForResult(result).cls}`}>
                    {badgeForResult(result).label}
                  </span>
                  <span className="text-white font-extrabold text-sm">{date}</span>
                  {scoreManual.trim() ? <span className="text-white/60 text-sm">{scoreManual.trim()}</span> : null}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "PTS", val: clampInt(points) ?? 0 },
                    { label: "REB", val: clampInt(rebounds) ?? 0 },
                    { label: "AST", val: clampInt(assists) ?? 0 },
                  ].map((s) => (
                    <div key={s.label} className="rounded-2xl bg-white/5 border border-white/10 p-4 text-center">
                      <div className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-white/40">{s.label}</div>
                      <div className="mt-1 text-2xl font-extrabold text-white">{s.val}</div>
                    </div>
                  ))}
                </div>

                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-white/40 mb-2">Best</div>
                  <div className="flex flex-wrap gap-2">
                    {best.length ? best.map((t) => (
                      <span key={t} className="px-3 py-1 rounded-2xl bg-primary/10 border border-primary/20 text-sm text-white">{t}</span>
                    )) : <span className="text-white/40 text-sm">—</span>}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-white/40 mb-2">Worst</div>
                  <div className="flex flex-wrap gap-2">
                    {worst.length ? worst.map((t) => (
                      <span key={t} className="px-3 py-1 rounded-2xl bg-white/5 border border-white/10 text-sm text-white/80">{t}</span>
                    )) : <span className="text-white/40 text-sm">—</span>}
                  </div>
                </div>
              </div>

              <div className="rounded-3xl bg-surface border border-white/5 p-5">
                <div className="text-xs font-extrabold uppercase tracking-[0.2em] text-white/40">How did you feel?</div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={5}
                  placeholder="Write your thoughts about the game…"
                  className="mt-3 w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-4 text-sm font-semibold text-white placeholder:text-white/25 resize-none focus:outline-none focus:border-primary/40"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-shrink-0 absolute bottom-0 left-0 right-0 max-w-md mx-auto px-6 pb-8 pt-4 border-t border-white/5 bg-background">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
            className={[
              "flex-1 rounded-2xl px-4 py-4 text-sm font-extrabold border transition-colors",
              step === 1
                ? "bg-white/0 border-white/5 text-white/25 cursor-not-allowed"
                : "bg-white/5 border-white/10 text-white active:scale-95",
            ].join(" ")}
          >
            Back
          </button>

          {step < totalSteps ? (
            <button
              type="button"
              onClick={() => canNext && setStep((s) => Math.min(totalSteps, s + 1))}
              disabled={!canNext}
              className={[
                "flex-1 rounded-2xl px-4 py-4 text-sm font-extrabold transition-colors",
                canNext
                  ? "bg-primary text-black active:scale-95"
                  : "bg-white/10 text-white/25 cursor-not-allowed",
              ].join(" ")}
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={save}
              disabled={!userId || !result || saving}
              className={[
                "flex-1 rounded-2xl px-4 py-4 text-sm font-extrabold transition-colors",
                userId && result && !saving
                  ? "bg-primary text-black active:scale-95"
                  : "bg-white/10 text-white/25 cursor-not-allowed",
              ].join(" ")}
            >
              {saving ? "Saving…" : isEdit ? "Save changes" : "Save"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
