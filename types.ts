export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weight: number;
  date: string; // ISO string
  timestamp: number;
}

export interface WeeklySummary {
  weekStart: string;
  totalWorkouts: number;
  totalVolume: number; // sets * reps * weight
  topExercise: string;
  aiAnalysis?: string;
}

export enum Tab {
  LOG = 'LOG',
  STATS = 'STATS',
  SETTINGS = 'SETTINGS'
}
