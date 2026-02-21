export type ViewType =
  | 'home'
  | 'form'
  | 'workout'
  | 'my-workouts'
  | 'profile'
  | 'add'
  | 'diary'
  | 'onboarding'
  | 'onboarding-shot-analysis';

export interface Session {
  id: string;
  title: string;
  timestamp: string;
  score: string;
  accuracy: number;
}

export interface Stat {
  label: string;
  value: string | number;
  unit?: string;
  total?: string;
}

export interface ShotMetrics {
  stanceWidth: number;         // 0-1, base width (feet separation)
  lateralSway: number;         // 0-1, torso lateral stability
  kneeDip: number;             // 0-1, knee flexion/loading
  verticalDrive: number;       // 0-1, vertical drive vs horizontal drift
  elbowAlignment: number;      // 0-1, shoulder-elbow-wrist angle
  elbowUnderBall: number;      // 0-1, elbow under wrist at release
  releaseHeight: number;       // 0-1, release height vs baseline
  wristFlick: number;          // 0-1, wrist snap
  followThroughHold: number;   // 0-1, maintains follow-through
  landingBalance: number;      // 0-1, landing stability
}

export interface CoachTip {
  title: string;
  targetScore: number;
  mainIssueTitle: string;
  body: string;
}

export interface AnalysisResult {
  score: number;
  metrics: ShotMetrics;
  strengths: string[];
  improvements: string[];
  isInvalid: boolean;
  messageIfInvalid?: string;
  processedFrames: number;
  totalFrames: number;
  aiCoachTip?: CoachTip;
}

export interface ShotAnalysisRow {
  id: string;
  user_id: string;
  created_at: string;
  shot_type: string | null;
  score: number | null;
  metrics: ShotMetrics;
  strengths: string[];
  improvements: string[];
  ai_coach_tip: CoachTip | null;
  engine_version: string | null;
  source: string;
  video_meta: {
    processedFrames: number;
    totalFrames: number;
  };
}

export type ShotAnalysisInsert = Omit<ShotAnalysisRow, 'id' | 'created_at'>;

export type GameResult = 'win' | 'loss' | 'draw' | 'not_finished';

export type DiaryEntryRow = {
  id: string;
  user_id: string;
  created_at: string;
  entry_date: string;
  title: string;
  notes: string;
  rating: number | null;
  meta: any | null;
  result?: GameResult | null;
  score_manual?: string | null;
  points?: number | null;
  rebounds?: number | null;
  assists?: number | null;
  best_aspects?: string[] | null;
  worst_aspects?: string[] | null;
};

export type DiaryEntryInsert = {
  user_id: string;
  entry_date?: string;
  title?: string;
  notes?: string;
  rating?: number | null;
  meta?: any | null;
  result?: GameResult | null;
  score_manual?: string | null;
  points?: number | null;
  rebounds?: number | null;
  assists?: number | null;
  best_aspects?: string[] | null;
  worst_aspects?: string[] | null;
};

export type DiaryEntryUpdate = Partial<Omit<DiaryEntryInsert, 'user_id'>>;