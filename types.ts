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