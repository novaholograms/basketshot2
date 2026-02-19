import { supabase } from "../lib/supabaseClient";

export type GeminiExplainPayload = {
  shotType: string;
  score: number;
  metrics: Record<string, number>;
  context?: {
    framesProcessed?: number;
    framesValid?: number;
    trackingQuality?: number;
    duration?: number;
  };
};

export type GeminiExplainResult = {
  strengths: string[];
  improvements: string[];
  aiCoachTip?: {
    title: string;
    mainIssueTitle: string;
    body: string;
    targetScore: number;
  };
};

export type GenerateWorkoutPayload = {
  prompt: string;
  duration: number;
  intensity: string;
};

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    p.then((v) => {
      clearTimeout(t);
      resolve(v);
    }).catch((e) => {
      clearTimeout(t);
      reject(e);
    });
  });
}

export async function fetchGeminiExplanation(
  payload: GeminiExplainPayload,
  timeoutMs = 5000,
): Promise<GeminiExplainResult | null> {
  try {
    const invokePromise = supabase.functions.invoke("explain-shot-analysis", {
      body: payload,
    });

    const { data, error } = await withTimeout(invokePromise, timeoutMs);

    if (error) return null;
    if (!data) return null;

    const d = data as Record<string, unknown>;
    if (!Array.isArray(d.strengths) || !Array.isArray(d.improvements)) return null;

    return data as GeminiExplainResult;
  } catch {
    return null;
  }
}

export async function generateWorkoutWithAI(
  payload: GenerateWorkoutPayload,
  timeoutMs = 8000,
): Promise<string | null> {
  try {
    const invokePromise = supabase.functions.invoke("generate-workout", {
      body: payload,
    });

    const { data, error } = await withTimeout(invokePromise, timeoutMs);

    if (error) return null;
    if (!data) return null;

    const d = data as Record<string, unknown>;
    if (typeof d.text !== "string") return null;

    return d.text;
  } catch {
    return null;
  }
}
