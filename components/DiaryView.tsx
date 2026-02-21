import React, { useEffect, useMemo, useState } from "react";
import { ChevronRight, Plus, Trash2, Pencil } from "lucide-react";
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
  fetchRecentDiaryEntries,
  updateDiaryEntry,
} from "../services/diaryService";

type Filter = "all" | "7d" | "30d";

function toISODate(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function isWithinDays(entryDateISO: string, days: number) {
  const entry = new Date(entryDateISO + "T00:00:00");
  const now = new Date();
  const diffMs = now.getTime() - entry.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays <= days;
}

export function DiaryView() {
  const { user } = useAuth();

  const [items, setItems] = useState<DiaryEntryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");

  const [selected, setSelected] = useState<DiaryEntryRow | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const [draftDate, setDraftDate] = useState<string>(toISODate(new Date()));
  const [draftTitle, setDraftTitle] = useState<string>("");
  const [draftNotes, setDraftNotes] = useState<string>("");
  const [draftRating, setDraftRating] = useState<string>("");

  const userId = user?.id;

  async function refresh() {
    if (!userId) return;
    setLoading(true);
    try {
      const fresh = await fetchRecentDiaryEntries(userId);
      setItems(fresh);
      setCachedDiaryEntries(userId, fresh);
    } catch (e) {
      console.warn("Failed to fetch diary entries", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!userId) return;
    const cached = getCachedDiaryEntries(userId);
    setItems(cached);
    refresh();
  }, [userId]);

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    if (filter === "7d") return items.filter((x) => isWithinDays(x.entry_date, 7));
    return items.filter((x) => isWithinDays(x.entry_date, 30));
  }, [items, filter]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const ratedItems = filtered.filter((x) => x.rating != null);
    const avg =
      ratedItems.length === 0
        ? null
        : Math.round((ratedItems.reduce((acc, x) => acc + (x.rating ?? 0), 0) / ratedItems.length) * 10) / 10;
    return { total, avg };
  }, [filtered]);

  function openCreate() {
    setSelected(null);
    setDraftDate(toISODate(new Date()));
    setDraftTitle("");
    setDraftNotes("");
    setDraftRating("");
    setIsEditorOpen(true);
  }

  function openEdit(item: DiaryEntryRow) {
    setSelected(item);
    setDraftDate(item.entry_date);
    setDraftTitle(item.title ?? "");
    setDraftNotes(item.notes ?? "");
    setDraftRating(item.rating == null ? "" : String(item.rating));
    setIsEditorOpen(true);
  }

  async function handleSave() {
    if (!userId) return;

    const ratingParsed = draftRating.trim() === "" ? null : Number(draftRating.trim());
    const safeRating = ratingParsed == null || Number.isNaN(ratingParsed) ? null : ratingParsed;

    try {
      if (!selected) {
        const created = await createDiaryEntry({
          user_id: userId,
          entry_date: draftDate,
          title: draftTitle.trim(),
          notes: draftNotes.trim(),
          rating: safeRating,
          meta: null,
        });
        setItems((prev) => [created, ...prev]);
        addToDiaryCache(userId, created);
      } else {
        const updated = await updateDiaryEntry(selected.id, {
          entry_date: draftDate,
          title: draftTitle.trim(),
          notes: draftNotes.trim(),
          rating: safeRating,
          meta: selected.meta ?? null,
        });
        setItems((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
        const next = items.map((x) => (x.id === updated.id ? updated : x));
        setCachedDiaryEntries(userId, next);
        setSelected(updated);
      }
      setIsEditorOpen(false);
    } catch (e) {
      console.warn("Failed to save diary entry", e);
    }
  }

  async function handleDelete(id: string) {
    if (!userId) return;
    try {
      await deleteDiaryEntry(id);
      const next = items.filter((x) => x.id !== id);
      setItems(next);
      setCachedDiaryEntries(userId, next);
      if (selected?.id === id) setSelected(null);
    } catch (e) {
      console.warn("Failed to delete diary entry", e);
    }
  }

  return (
    <div className="pb-24 animate-in fade-in duration-500">
      <div className="px-5 pt-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-bold">Diary</div>
            <div className="text-xs text-muted font-medium">Log your sessions and notes.</div>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-black"
          >
            <Plus size={16} />
            New
          </button>
        </div>

        <div className="mt-4 flex items-center gap-2">
          {(["all", "7d", "30d"] as Filter[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setFilter(k)}
              className={[
                "rounded-2xl px-3 py-1.5 text-xs font-semibold border",
                k === filter
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "bg-white/5 text-muted border-white/5 hover:bg-white/10",
              ].join(" ")}
            >
              {k === "all" ? "All" : k === "7d" ? "Last 7d" : "Last 30d"}
            </button>
          ))}
          <div className="ml-auto text-xs text-muted font-medium">
            {loading
              ? "Refreshing…"
              : `${stats.total} entries${stats.avg == null ? "" : ` · Avg ${stats.avg}`}`}
          </div>
        </div>
      </div>

      <div className="px-5 mt-5">
        <div className="bg-white/5 rounded-3xl border border-white/5 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-5 text-sm text-muted font-medium">No diary entries yet.</div>
          ) : (
            filtered.map((x, idx) => (
              <div
                key={x.id}
                className={[
                  "p-4 flex items-center justify-between hover:bg-white/5 transition-colors",
                  idx === filtered.length - 1 ? "" : "border-b border-white/5",
                ].join(" ")}
              >
                <button
                  type="button"
                  className="flex-1 text-left"
                  onClick={() => setSelected(x)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                      {x.rating == null ? "—" : x.rating}
                    </div>
                    <div>
                      <div className="font-bold text-sm">
                        {x.title?.trim() ? x.title : "Untitled"}
                      </div>
                      <div className="text-xs text-muted font-medium">{x.entry_date}</div>
                    </div>
                  </div>
                </button>
                <ChevronRight size={16} className="text-muted ml-3 shrink-0" />
              </div>
            ))
          )}
        </div>
      </div>

      {selected && !isEditorOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end">
          <div className="w-full max-w-md mx-auto rounded-t-3xl bg-[#1a1a1a] border-t border-white/5 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-base font-bold">
                  {selected.title?.trim() ? selected.title : "Untitled"}
                </div>
                <div className="text-xs text-muted font-medium">
                  {selected.entry_date} · Rating: {selected.rating ?? "—"}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-2xl px-3 py-1.5 text-xs font-semibold border border-white/5 bg-white/5"
              >
                Close
              </button>
            </div>

            <div className="mt-4 text-sm text-white/90 whitespace-pre-wrap leading-relaxed">
              {selected.notes?.trim() ? selected.notes : "No notes."}
            </div>

            <div className="mt-5 flex items-center gap-2">
              <button
                type="button"
                onClick={() => openEdit(selected)}
                className="inline-flex items-center gap-2 rounded-2xl bg-white/5 border border-white/5 px-4 py-2 text-sm font-semibold"
              >
                <Pencil size={16} />
                Edit
              </button>
              <button
                type="button"
                onClick={() => handleDelete(selected.id)}
                className="ml-auto inline-flex items-center gap-2 rounded-2xl bg-white/5 border border-white/5 px-4 py-2 text-sm font-semibold text-red-400"
              >
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {isEditorOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end">
          <div className="w-full max-w-md mx-auto rounded-t-3xl bg-[#1a1a1a] border-t border-white/5 p-5">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="text-base font-bold">
                {selected ? "Edit entry" : "New entry"}
              </div>
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="rounded-2xl px-3 py-1.5 text-xs font-semibold border border-white/5 bg-white/5"
              >
                Close
              </button>
            </div>

            <div className="grid gap-3">
              <label className="text-xs text-muted font-semibold">
                Date
                <input
                  type="date"
                  value={draftDate}
                  onChange={(e) => setDraftDate(e.target.value)}
                  className="mt-1 w-full rounded-2xl bg-white/5 border border-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
                />
              </label>

              <label className="text-xs text-muted font-semibold">
                Title
                <input
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  placeholder="e.g. Free throw session"
                  className="mt-1 w-full rounded-2xl bg-white/5 border border-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50"
                />
              </label>

              <label className="text-xs text-muted font-semibold">
                Rating (optional, 0–10)
                <input
                  value={draftRating}
                  onChange={(e) => setDraftRating(e.target.value)}
                  placeholder="e.g. 8"
                  inputMode="numeric"
                  className="mt-1 w-full rounded-2xl bg-white/5 border border-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50"
                />
              </label>

              <label className="text-xs text-muted font-semibold">
                Notes
                <textarea
                  value={draftNotes}
                  onChange={(e) => setDraftNotes(e.target.value)}
                  placeholder="What went well? What to improve?"
                  rows={5}
                  className="mt-1 w-full rounded-2xl bg-white/5 border border-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 resize-none"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={handleSave}
              className="mt-5 w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-black"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
