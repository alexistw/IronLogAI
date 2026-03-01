import { Exercise } from '../types';
import { normalizeWeightMode, normalizeWeightUnit } from '../utils';

const STORAGE_KEY = 'ironlog_exercises';

export const saveExercise = (exercise: Exercise): void => {
  const exercises = getExercises();
  exercises.push(exercise);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(exercises));
};

export const getExercises = (): Exercise[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];

    return parsed.map((ex: any) => ({
      ...ex,
      weightUnit: normalizeWeightUnit(ex?.weightUnit),
      weightMode: normalizeWeightMode(ex?.weightMode),
      plateWeightUnitInput: ex?.plateWeightUnitInput ? normalizeWeightUnit(ex.plateWeightUnitInput) : undefined,
      plateCalculationMode: ex?.plateCalculationMode ? normalizeWeightMode(ex.plateCalculationMode) : undefined,
      unloadedBarWeightUnit: ex?.unloadedBarWeightUnit ? normalizeWeightUnit(ex.unloadedBarWeightUnit) : undefined,
    }));
  } catch (e) {
    console.error("Failed to parse exercises", e);
    return [];
  }
};

export const deleteExercise = (id: string): void => {
  const exercises = getExercises().filter(ex => ex.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(exercises));
};

export const clearAllData = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};
