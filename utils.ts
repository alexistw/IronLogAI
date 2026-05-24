import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Exercise, WeightMode, WeightUnit } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const DAYS_OF_WEEK = ['Mon 週一', 'Tue 週二', 'Wed 週三', 'Thu 週四', 'Fri 週五', 'Sat 週六', 'Sun 週日'];

// Get the Monday of the current week (or the week containing the date)
export const getMonday = (d: Date): Date => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
};

export const formatDate = (dateString: string): string => {
  const options: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9);
};

export const getWeekId = (date: Date): string => {
  const monday = getMonday(date);
  return monday.toISOString().split('T')[0]; // YYYY-MM-DD of the Monday
};

export const isSameDay = (d1: Date, d2: Date): boolean => {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

export const LB_TO_KG = 0.45359237;

export const normalizeWeightUnit = (unit?: string): WeightUnit =>
  unit === 'lb' ? 'lb' : 'kg';

export const normalizeWeightMode = (mode?: string): WeightMode =>
  mode === 'single_hand' ? 'single_hand' : 'double_hand';

export const getExerciseEffectiveWeightKg = (exercise: Pick<Exercise, 'weight' | 'weightUnit' | 'weightMode'>): number => {
  const unitMultiplier = exercise.weightUnit === 'lb' ? LB_TO_KG : 1;
  const handMultiplier = exercise.weightMode === 'single_hand' ? 2 : 1;
  return exercise.weight * unitMultiplier * handMultiplier;
};

export const getExerciseVolumeKg = (exercise: Pick<Exercise, 'weight' | 'weightUnit' | 'weightMode' | 'sets' | 'reps'>): number => {
  return getExerciseEffectiveWeightKg(exercise) * exercise.sets * exercise.reps;
};

// Builds a map of exercise name → { weightKg, date } for the heaviest lift
// from the most recent session before currentDay. O(n log n) once; O(1) per lookup.
export const buildPreviousBestMap = (
  exercises: Exercise[],
  currentDay: string // YYYY-MM-DD
): Map<string, { weightKg: number; date: string }> => {
  const map = new Map<string, { weightKg: number; date: string }>();

  // Sort descending by date so the first entry per name we encounter is the most recent.
  const sorted = exercises
    .filter(ex => ex.date.split('T')[0] < currentDay)
    .sort((a, b) => b.date.localeCompare(a.date));

  for (const ex of sorted) {
    const name = ex.name.trim().toLowerCase();
    const day = ex.date.split('T')[0];
    const existing = map.get(name);

    if (!existing) {
      map.set(name, { weightKg: Math.round(getExerciseEffectiveWeightKg(ex) * 100) / 100, date: day });
    } else if (existing.date === day) {
      // Same most-recent day — keep the heaviest weight.
      const w = Math.round(getExerciseEffectiveWeightKg(ex) * 100) / 100;
      if (w > existing.weightKg) map.set(name, { weightKg: w, date: day });
    }
    // Earlier day for a name already in the map — skip.
  }

  return map;
};
