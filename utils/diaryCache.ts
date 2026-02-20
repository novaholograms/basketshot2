import type { DiaryEntryRow } from "../types";

const MAX_CACHE_SIZE = 20;

const getCacheKey = (userId: string) => `basketshot_diary_${userId}`;

export function getCachedDiaryEntries(userId: string): DiaryEntryRow[] {
  try {
    const raw = localStorage.getItem(getCacheKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as DiaryEntryRow[]) : [];
  } catch (e) {
    console.warn("Failed to read diary cache", e);
    return [];
  }
}

export function setCachedDiaryEntries(userId: string, items: DiaryEntryRow[]) {
  try {
    const trimmed = items.slice(0, MAX_CACHE_SIZE);
    localStorage.setItem(getCacheKey(userId), JSON.stringify(trimmed));
  } catch (e) {
    console.warn("Failed to write diary cache", e);
  }
}

export function addToDiaryCache(userId: string, item: DiaryEntryRow) {
  const current = getCachedDiaryEntries(userId);
  const deduped = current.filter((x) => x.id !== item.id);
  const next = [item, ...deduped].slice(0, MAX_CACHE_SIZE);
  setCachedDiaryEntries(userId, next);
}

export function clearDiaryCache(userId: string) {
  try {
    localStorage.removeItem(getCacheKey(userId));
  } catch (e) {
    console.warn("Failed to clear diary cache", e);
  }
}
