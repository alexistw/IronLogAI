export type WeightUnit = 'kg' | 'lb';
export type WeightMode = 'single_hand' | 'double_hand';

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weight: number;
  weightUnit: WeightUnit;
  weightMode: WeightMode;
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
