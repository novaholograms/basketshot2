export type ViewType = 'home' | 'form' | 'workout' | 'profile' | 'add' | 'onboarding';

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