import { Exercise, UserProfile } from '../types';
import { normalizeWeightMode, normalizeWeightUnit } from '../utils';

const STORAGE_KEY = 'ironlog_exercises';
const USER_PROFILE_KEY = 'ironlog_user_profile';

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

export const getUserProfile = (): UserProfile => {
  const stored = localStorage.getItem(USER_PROFILE_KEY);
  if (!stored) {
    return { heightCm: null, weightKg: null };
  }

  try {
    const parsed = JSON.parse(stored);
    const heightCm = typeof parsed?.heightCm === 'number' && Number.isFinite(parsed.heightCm) && parsed.heightCm > 0
      ? parsed.heightCm
      : null;
    const weightKg = typeof parsed?.weightKg === 'number' && Number.isFinite(parsed.weightKg) && parsed.weightKg > 0
      ? parsed.weightKg
      : null;

    return { heightCm, weightKg };
  } catch (e) {
    console.error("Failed to parse user profile", e);
    return { heightCm: null, weightKg: null };
  }
};

export const saveUserProfile = (profile: UserProfile): void => {
  const normalized: UserProfile = {
    heightCm: typeof profile.heightCm === 'number' && Number.isFinite(profile.heightCm) && profile.heightCm > 0
      ? profile.heightCm
      : null,
    weightKg: typeof profile.weightKg === 'number' && Number.isFinite(profile.weightKg) && profile.weightKg > 0
      ? profile.weightKg
      : null,
  };

  localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(normalized));
};
