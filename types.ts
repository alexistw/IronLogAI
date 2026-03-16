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
  // Keep the original form input so edit mode can restore user-entered values.
  plateWeightInput?: number;
  plateWeightUnitInput?: WeightUnit;
  plateCalculationMode?: WeightMode;
  unloadedBarWeight?: number;
  unloadedBarWeightUnit?: WeightUnit;
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

export interface UserProfile {
  heightUnit: 'cm' | 'ft_in';
  heightCm: number | null;
  heightFt: number | null;
  heightIn: number | null;
  weightUnit: 'kg' | 'lb';
  weightValue: number | null;
}

export enum Tab {
  LOG = 'LOG',
  STATS = 'STATS',
  SETTINGS = 'SETTINGS'
}
