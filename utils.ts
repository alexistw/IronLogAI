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

// Returns the heaviest effective weight (kg) from the most recent previous session
// with the same exercise name, along with that session's date.
export const getPreviousBestWeightKg = (
  exerciseName: string,
  currentDate: string,
  allExercises: Exercise[]
): { weightKg: number; date: string } | null => {
  const normalizedName = exerciseName.trim().toLowerCase();
  const currentDay = currentDate.split('T')[0];

  const previousSessions = allExercises.filter(
    ex => ex.name.trim().toLowerCase() === normalizedName && ex.date.split('T')[0] < currentDay
  );

  if (previousSessions.length === 0) return null;

  // Find most recent day
  const mostRecentDay = previousSessions.reduce(
    (latest, ex) => (ex.date.split('T')[0] > latest ? ex.date.split('T')[0] : latest),
    previousSessions[0].date.split('T')[0]
  );

  // Among that day's entries, find the heaviest
  const heaviestWeightKg = previousSessions
    .filter(ex => ex.date.split('T')[0] === mostRecentDay)
    .reduce((max, ex) => Math.max(max, getExerciseEffectiveWeightKg(ex)), 0);

  if (heaviestWeightKg === 0) return null;

  return { weightKg: Math.round(heaviestWeightKg * 100) / 100, date: mostRecentDay };
};
