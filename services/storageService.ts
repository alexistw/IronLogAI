import { Exercise } from '../types';

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
    return JSON.parse(stored);
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