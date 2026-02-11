import type { ShotAnalysisRow } from "../types";

const MAX_CACHE_SIZE = 20;
const getCacheKey = (userId: string) => `basketshot_analyses_${userId}`;

export function getCachedAnalyses(userId: string): ShotAnalysisRow[] {
  try {
    const raw = localStorage.getItem(getCacheKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as ShotAnalysisRow[];
  } catch (error) {
    console.warn("[CACHE] Failed to read cached analyses:", error);
    return [];
  }
}

export function setCachedAnalyses(userId: string, items: ShotAnalysisRow[]): void {
  try {
    const limited = items.slice(0, MAX_CACHE_SIZE);
    localStorage.setItem(getCacheKey(userId), JSON.stringify(limited));
  } catch (error) {
    console.warn("[CACHE] Failed to cache analyses:", error);
  }
}

export function addToCache(userId: string, item: ShotAnalysisRow): ShotAnalysisRow[] {
  const current = getCachedAnalyses(userId);
  const filtered = current.filter((x) => x.id !== item.id);
  const updated = [item, ...filtered].slice(0, MAX_CACHE_SIZE);
  setCachedAnalyses(userId, updated);
  return updated;
}

export function clearAnalysesCache(userId: string): void {
  try {
    localStorage.removeItem(getCacheKey(userId));
  } catch (error) {
    console.warn("[CACHE] Failed to clear cache:", error);
  }
}
