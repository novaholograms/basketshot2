import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trophy,
  TrendingDown,
  Minus,
  Trash2,
  X,
} from "lucide-react";
import { createPortal } from "react-dom";
import { useAuth } from "../contexts/AuthContext";
import type { DiaryEntryRow } from "../types";
import {
  addToDiaryCache,
  getCachedDiaryEntries,
  setCachedDiaryEntries,
} from "../utils/diaryCache";
import {
  createDiaryEntry,
  deleteDiaryEntry,
  getEntriesByMonth,
  getRecentEntries,
  getStatsByPeriod,
  type DiaryStatPeriod,
  type DiaryStats,
} from "../services/diaryService";

type ResultTier = "good" | "bad" | "neutral";

const TIER_PRIORITY: Record<ResultTier, number> = { good: 0, neutral: 1, bad: 2 };

function toTier(rating: number | null): ResultTier {
  if (rating == null) return "neutral";
  if (rating >= 8) return "good";
  if (rating >= 4) return "neutral";
  return "bad";
}

function bestTier(entries: DiaryEntryRow[]): ResultTier {
  return entries
    .slice()
    .sort((a, b) => TIER_PRIORITY[toTier(a.rating)] - TIER_PRIORITY[toTier(b.rating)])[0]
    ? toTier(entries.slice().sort((a, b) => TIER_PRIORITY[toTier(a.rating)] - TIER_PRIORITY[toTier(b.rating)])[0].rating)
    : "neutral";
}

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

function formatDateES(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

const MONTH_ES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];
const DOW_ES = ["L","M","X","J","V","S","D"];

function Calendar({
  year,
  month1to12,
  entriesByDate,
  onDayClick,
  onPrev,
  onNext,
}: {
  year: number;
  month1to12: number;
  entriesByDate: Record<string, DiaryEntryRow[]>;
  onDayClick: (dateISO: string) => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const firstDay = new Date(year, month1to12 - 1, 1);
  let startDow = firstDay.getDay();
  startDow = startDow === 0 ? 6 : startDow - 1;

  const daysInMonth = new Date(year, month1to12, 0).getDate();
  const today = isoToday();

  const cells: (number | null)[] = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="bg-surface rounded-3xl border border-white/5 p-4">
      <div className="flex items-center justify-between mb-4">
        <span className="text-lg font-bold">
          {MONTH_ES[month1to12 - 1]} {year}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onPrev}
            className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-white/5 transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-muted" />
          </button>
          <button
            type="button"
            onClick={onNext}
            className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-white/5 transition-colors"
          >
            <ChevronRight className="h-5 w-5 text-muted" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {DOW_ES.map((d) => (
          <div
            key={d}
            className="text-center text-xs font-semibold text-muted py-1 uppercase tracking-wide"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, idx) => {
          if (!day) return <div key={`e-${idx}`} className="aspect-square" />;

          const dateISO = `${year}-${String(month1to12).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayEntries = entriesByDate[dateISO] ?? [];
          const has = dayEntries.length > 0;
          const tier = has ? bestTier(dayEntries) : null;
          const isToday = dateISO === today;
          const isFuture = dateISO > today;

          const circle =
            tier === "good" ? "bg-emerald-500 text-white" :
            tier === "bad" ? "bg-red-500 text-white" :
            tier === "neutral" ? "bg-amber-500 text-white" :
            "bg-transparent text-white";

          return (
            <button
              key={dateISO}
              type="button"
              disabled={isFuture}
              onClick={() => !isFuture && onDayClick(dateISO)}
              className={[
                "relative flex flex-col items-center justify-center aspect-square transition-all rounded-xl",
                isFuture ? "opacity-30 cursor-default" : "cursor-pointer active:scale-90",
              ].join(" ")}
            >
              {has && !isToday ? (
                <span className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shadow-sm ${circle}`}>
                  {day}
                </span>
              ) : isToday ? (
                <span
                  className={[
                    "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shadow-sm",
                    has ? circle : "bg-white/10 text-white",
                  ].join(" ")}
                >
                  {day}
                </span>
              ) : (
                <span className={`text-sm font-medium ${isFuture ? "text-white/30" : "text-white/80"}`}>
                  {day}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TierBadge({ tier }: { tier: ResultTier }) {
  const bg =
    tier === "good" ? "bg-emerald-500" : tier === "bad" ? "bg-red-500" : "bg-amber-500";
  return (
    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
      {tier === "good" && <Trophy className="h-4 w-4 text-white" />}
      {tier === "bad" && <TrendingDown className="h-4 w-4 text-white" />}
      {tier === "neutral" && <Minus className="h-4 w-4 text-white" />}
    </div>
  );
}

function EntryListItem({
  entry,
  onClick,
}: {
  entry: DiaryEntryRow;
  onClick: () => void;
}) {
  const tier = toTier(entry.rating);
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full text-left rounded-2xl bg-surface border border-white/5 shadow-sm px-4 py-3.5 flex items-center gap-3 hover:bg-white/5 transition-colors"
    >
      <TierBadge tier={tier} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-bold">
            {entry.title?.trim() ? entry.title : "Entrada"}
          </span>
          <span className="text-xs text-muted font-medium shrink-0">
            {formatDateES(entry.entry_date)}
          </span>
        </div>
        {entry.notes?.trim() ? (
          <p className="text-xs text-muted mt-0.5 truncate">{entry.notes}</p>
        ) : (
          <p className="text-xs text-muted mt-0.5">
            Rating: {entry.rating ?? "—"}
          </p>
        )}
      </div>

      <ChevronRight className="h-4 w-4 text-muted shrink-0" />
    </motion.button>
  );
}

function DayDetailSheet({
  entry,
  onClose,
  onDelete,
}: {
  entry: DiaryEntryRow | null;
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  if (!entry) return null;

  const tier = toTier(entry.rating);

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-end justify-center sm:items-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="absolute inset-0 bg-black/50"
          onClick={onClose}
        />
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 40 }}
          className="relative w-full max-w-md rounded-t-[32px] sm:rounded-[32px] bg-surface border border-white/5 shadow-2xl overflow-hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="px-6 pt-6 pb-5 border-b border-white/5 bg-white/5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <TierBadge tier={tier} />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                    Diario
                  </p>
                  <p className="text-sm text-muted font-medium mt-0.5 flex items-center gap-1">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {formatDateES(entry.entry_date)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-white/10 text-muted hover:bg-white/15 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3">
              <div className="text-base font-bold">
                {entry.title?.trim() ? entry.title : "Entrada"}
              </div>
              <div className="text-xs text-muted font-medium mt-0.5">
                Rating: {entry.rating ?? "—"}
              </div>
            </div>
          </div>

          <div className="px-6 py-5 space-y-4">
            <div className="rounded-2xl bg-white/5 border border-white/5 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-1.5">
                Notas
              </p>
              <p className="text-sm text-white/90 leading-relaxed whitespace-pre-wrap">
                {entry.notes?.trim() ? entry.notes : "Sin notas."}
              </p>
            </div>

            <button
              type="button"
              onClick={() => onDelete(entry.id)}
              className="flex items-center justify-center gap-2 w-full rounded-2xl border border-red-500/30 px-4 py-3 text-sm font-semibold text-red-300 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Borrar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}

function EmptyDaySheet({
  dateISO,
  onClose,
  onRegister,
}: {
  dateISO: string | null;
  onClose: () => void;
  onRegister: (dateISO: string) => void;
}) {
  if (!dateISO) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-end justify-center sm:items-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="absolute inset-0 bg-black/50"
          onClick={onClose}
        />
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 40 }}
          className="relative w-full max-w-md rounded-t-[32px] sm:rounded-[32px] bg-surface border border-white/5 shadow-2xl px-6 pt-6 pb-8"
          style={{ paddingBottom: "calc(32px + env(safe-area-inset-bottom))" }}
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted">
                Día vacío
              </p>
              <p className="text-lg font-black mt-0.5">
                {formatDateES(dateISO)}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-white/10 text-muted hover:bg-white/15 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="text-sm text-muted mb-5 leading-relaxed">
            No hay entradas ese día. ¿Quieres registrar una?
          </p>

          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              onClose();
              onRegister(dateISO);
            }}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary text-black py-4 text-sm font-bold shadow-primary/20 hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" />
            Registrar
          </motion.button>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}

function EditorSheet({
  isOpen,
  initial,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  initial: { dateISO: string; title: string; notes: string; rating: string };
  onClose: () => void;
  onSave: (draft: { dateISO: string; title: string; notes: string; rating: string }) => void;
}) {
  const [dateISO, setDateISO] = useState(initial.dateISO);
  const [title, setTitle] = useState(initial.title);
  const [notes, setNotes] = useState(initial.notes);
  const [rating, setRating] = useState(initial.rating);

  useEffect(() => {
    if (!isOpen) return;
    setDateISO(initial.dateISO);
    setTitle(initial.title);
    setNotes(initial.notes);
    setRating(initial.rating);
  }, [isOpen, initial.dateISO, initial.title, initial.notes, initial.rating]);

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-end justify-center sm:items-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="absolute inset-0 bg-black/50"
          onClick={onClose}
        />
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 40 }}
          className="relative w-full max-w-md rounded-t-[32px] sm:rounded-[32px] bg-surface border border-white/5 shadow-2xl overflow-hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="px-6 pt-6 pb-5 border-b border-white/5 bg-white/5">
            <div className="flex items-start justify-between">
              <div className="text-base font-bold">Registrar entrada</div>
              <button
                type="button"
                onClick={onClose}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-white/10 text-muted hover:bg-white/15 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="px-6 py-5 space-y-3">
            <label className="text-xs text-muted font-semibold">
              Fecha
              <input
                type="date"
                value={dateISO}
                onChange={(e) => setDateISO(e.target.value)}
                className="mt-1 w-full rounded-2xl bg-white/5 border border-white/5 px-3 py-2 text-sm"
              />
            </label>

            <label className="text-xs text-muted font-semibold">
              Título
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Free throws"
                className="mt-1 w-full rounded-2xl bg-white/5 border border-white/5 px-3 py-2 text-sm"
              />
            </label>

            <label className="text-xs text-muted font-semibold">
              Rating (0-10)
              <input
                value={rating}
                onChange={(e) => setRating(e.target.value)}
                placeholder="Ej: 8"
                inputMode="numeric"
                className="mt-1 w-full rounded-2xl bg-white/5 border border-white/5 px-3 py-2 text-sm"
              />
            </label>

            <label className="text-xs text-muted font-semibold">
              Notas
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Qué salió bien, qué mejorar…"
                rows={5}
                className="mt-1 w-full rounded-2xl bg-white/5 border border-white/5 px-3 py-2 text-sm"
              />
            </label>

            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => onSave({ dateISO, title, notes, rating })}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary text-black py-4 text-sm font-bold shadow-primary/20 hover:opacity-90 transition-opacity"
            >
              Guardar
            </motion.button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}

export function DiaryView() {
  const { user } = useAuth();
  const userId = user?.id;

  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth() + 1);

  const [monthEntries, setMonthEntries] = useState<DiaryEntryRow[]>([]);
  const [stats, setStats] = useState<DiaryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [period, setPeriod] = useState<DiaryStatPeriod>("mes");

  const [recent, setRecent] = useState<DiaryEntryRow[]>([]);
  const [showAll, setShowAll] = useState(false);
  const INITIAL_LIMIT = 5;

  const [detailEntry, setDetailEntry] = useState<DiaryEntryRow | null>(null);
  const [emptyDayISO, setEmptyDayISO] = useState<string | null>(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorDateISO, setEditorDateISO] = useState<string>(isoToday());

  const entriesByDate = useMemo(() => {
    const map: Record<string, DiaryEntryRow[]> = {};
    for (const e of monthEntries) {
      if (!map[e.entry_date]) map[e.entry_date] = [];
      map[e.entry_date].push(e);
    }
    return map;
  }, [monthEntries]);

  const loadMonth = useCallback(async () => {
    if (!userId) return;
    const data = await getEntriesByMonth(userId, calYear, calMonth);
    setMonthEntries(data);
  }, [userId, calYear, calMonth]);

  const loadStats = useCallback(async () => {
    if (!userId) return;
    const s = await getStatsByPeriod(userId, period);
    setStats(s);
  }, [userId, period]);

  const loadRecent = useCallback(async () => {
    if (!userId) return;
    const data = await getRecentEntries(userId, 50);
    setRecent(data);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    // cache optimistic
    const cached = getCachedDiaryEntries(userId);
    if (cached.length > 0) setRecent(cached);

    setLoading(true);
    Promise.all([loadMonth(), loadStats(), loadRecent()])
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId, loadMonth]); // intencional: misma lógica que patrón existente (optimiza renders)

  useEffect(() => {
    if (!userId || loading) return;
    setStatsLoading(true);
    loadStats().finally(() => setStatsLoading(false));
  }, [period, userId, loading, loadStats]);

  useEffect(() => {
    if (!userId) return;
    // cachea "recent" (para abrir instantáneo como FormView)
    setCachedDiaryEntries(userId, recent);
  }, [recent, userId]);

  const handlePrevMonth = () => {
    if (calMonth === 1) {
      setCalYear((y) => y - 1);
      setCalMonth(12);
    } else {
      setCalMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    const now2 = new Date();
    const maxY = now2.getFullYear();
    const maxM = now2.getMonth() + 1;
    if (calYear > maxY || (calYear === maxY && calMonth >= maxM)) return;

    if (calMonth === 12) {
      setCalYear((y) => y + 1);
      setCalMonth(1);
    } else {
      setCalMonth((m) => m + 1);
    }
  };

  const handleDayClick = (dateISO: string) => {
    const dayEntries = entriesByDate[dateISO] ?? [];
    if (dayEntries.length > 0) setDetailEntry(dayEntries[0]);
    else setEmptyDayISO(dateISO);
  };

  async function handleCreateFromEditor(draft: { dateISO: string; title: string; notes: string; rating: string }) {
    if (!userId) return;

    const ratingNum = draft.rating.trim() === "" ? null : Number(draft.rating.trim());
    const safeRating = ratingNum == null || Number.isNaN(ratingNum) ? null : ratingNum;

    try {
      const created = await createDiaryEntry({
        user_id: userId,
        entry_date: draft.dateISO,
        title: draft.title.trim(),
        notes: draft.notes.trim(),
        rating: safeRating,
        meta: null,
      });

      // UI refresh mínimo
      setRecent((prev) => [created, ...prev]);
      addToDiaryCache(userId, created);

      // si cae en el mes visible, refrescar mes
      const ym = `${calYear}-${String(calMonth).padStart(2, "0")}`;
      if (created.entry_date.startsWith(ym)) {
        setMonthEntries((prev) => [created, ...prev]);
      } else {
        await loadMonth();
      }

      await loadStats();
      setEditorOpen(false);
    } catch (e) {
      console.warn("Failed to create diary entry", e);
    }
  }

  async function handleDelete(id: string) {
    if (!userId) return;
    try {
      await deleteDiaryEntry(id);

      const nextRecent = recent.filter((x) => x.id !== id);
      setRecent(nextRecent);
      setCachedDiaryEntries(userId, nextRecent);

      setMonthEntries((prev) => prev.filter((x) => x.id !== id));
      await loadStats();

      setDetailEntry(null);
    } catch (e) {
      console.warn("Failed to delete diary entry", e);
    }
  }

  const avg = stats?.avgRating ?? 0;
  const total = stats?.totalEntries ?? 0;

  return (
    <div className="pb-24 animate-in fade-in duration-500 px-5 pt-5 space-y-5">
      {/* Header */}
      <div className="pt-1">
        <h1 className="text-2xl font-black leading-tight">Diary</h1>
        <p className="text-sm text-muted mt-0.5">
          Registra cómo te fue en tus sesiones.
        </p>
      </div>

      {/* Stats header + segmented */}
      <div className="flex items-center justify-between pt-2">
        <h2 className="text-lg font-bold">Tus estadísticas</h2>
        <div className="flex items-center bg-white/5 rounded-xl p-0.5 gap-0.5 border border-white/5">
          {(["sem", "mes", "año"] as DiaryStatPeriod[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={[
                "px-3 py-1.5 rounded-[10px] text-xs font-semibold transition-all",
                period === p ? "bg-white/10 text-white shadow-sm" : "text-muted hover:text-white/80",
              ].join(" ")}
            >
              {p === "sem" ? "SEM" : p === "mes" ? "MES" : "AÑO"}
            </button>
          ))}
        </div>
      </div>

      {/* Stats cards */}
      {loading || statsLoading ? (
        <div className="space-y-3">
          <div className="h-[140px] rounded-3xl bg-white/5 animate-pulse" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-28 rounded-3xl bg-white/5 animate-pulse" />
            <div className="h-28 rounded-3xl bg-white/5 animate-pulse" />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Big performance */}
          <div className="rounded-3xl bg-surface border border-white/5 shadow-[0_4px_24px_rgba(0,0,0,0.20)] p-6 flex flex-col items-center justify-center gap-1 min-h-[140px]">
            <span className="text-[10px] font-semibold text-muted uppercase tracking-[0.15em] mb-1">
              RENDIMIENTO
            </span>
            <div className="flex items-end leading-none">
              <span className="text-[72px] font-black leading-none tracking-tight">
                {avg}
              </span>
              <span className="text-[22px] font-black text-primary leading-none mb-2">
                /10
              </span>
            </div>
            <div className="text-xs text-muted font-medium mt-2">
              Entradas: {total}
            </div>
          </div>

          {/* Split cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-3xl bg-surface border border-white/5 shadow-[0_4px_24px_rgba(0,0,0,0.20)] p-5 flex flex-col items-center justify-center gap-2">
              <span className="text-[10px] font-semibold text-muted uppercase tracking-[0.15em]">
                BUENAS
              </span>
              <div className="text-[38px] font-black leading-none">
                {stats?.good ?? 0}
              </div>
            </div>
            <div className="rounded-3xl bg-surface border border-white/5 shadow-[0_4px_24px_rgba(0,0,0,0.20)] p-5 flex flex-col items-center justify-center gap-2">
              <span className="text-[10px] font-semibold text-muted uppercase tracking-[0.15em]">
                A MEJORAR
              </span>
              <div className="text-[38px] font-black leading-none">
                {stats?.bad ?? 0}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Register button */}
      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        onClick={() => {
          setEditorDateISO(isoToday());
          setEditorOpen(true);
        }}
        className="w-full flex items-center justify-center gap-2 rounded-full bg-primary text-black py-4 text-sm font-semibold shadow-primary/20 hover:opacity-90 transition-opacity"
      >
        <Plus className="h-4 w-4" />
        Registrar una entrada
      </motion.button>

      {/* Calendar */}
      <Calendar
        year={calYear}
        month1to12={calMonth}
        entriesByDate={entriesByDate}
        onDayClick={handleDayClick}
        onPrev={handlePrevMonth}
        onNext={handleNextMonth}
      />

      {/* Recent list */}
      <div className="pt-2 space-y-3">
        <h2 className="text-lg font-bold">Diario</h2>

        {loading ? (
          <div className="space-y-2.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <div className="rounded-2xl bg-white/5 border border-white/5 px-5 py-8 text-center">
            <p className="text-sm font-semibold text-muted">No hay entradas todavía</p>
            <p className="text-xs text-muted mt-1">Registra una para empezar.</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {(showAll ? recent : recent.slice(0, INITIAL_LIMIT)).map((e) => (
                <EntryListItem key={e.id} entry={e} onClick={() => setDetailEntry(e)} />
              ))}
            </div>

            {recent.length > INITIAL_LIMIT && (
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="w-full text-center text-sm font-semibold text-primary py-2 hover:opacity-90 transition-opacity"
              >
                {showAll ? "Ver menos" : `Ver todos (${recent.length})`}
              </button>
            )}
          </>
        )}
      </div>

      {/* Sheets */}
      <DayDetailSheet entry={detailEntry} onClose={() => setDetailEntry(null)} onDelete={handleDelete} />

      <EmptyDaySheet
        dateISO={emptyDayISO}
        onClose={() => setEmptyDayISO(null)}
        onRegister={(dateISO) => {
          setEditorDateISO(dateISO);
          setEditorOpen(true);
        }}
      />

      <EditorSheet
        isOpen={editorOpen}
        initial={{ dateISO: editorDateISO, title: "", notes: "", rating: "" }}
        onClose={() => setEditorOpen(false)}
        onSave={handleCreateFromEditor}
      />
    </div>
  );
}