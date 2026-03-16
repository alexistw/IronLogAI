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
    return {
      heightUnit: 'cm',
      heightCm: null,
      heightFt: null,
      heightIn: null,
      weightUnit: 'kg',
      weightValue: null,
    };
  }

  try {
    const parsed = JSON.parse(stored);

    const normalizePositiveNumber = (value: unknown): number | null =>
      typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
    const normalizeNonNegativeNumber = (value: unknown): number | null =>
      typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;

    const heightUnit: UserProfile['heightUnit'] = parsed?.heightUnit === 'ft_in' ? 'ft_in' : 'cm';
    const weightUnit: UserProfile['weightUnit'] = parsed?.weightUnit === 'lb' ? 'lb' : 'kg';

    const legacyHeightCm = normalizePositiveNumber(parsed?.heightCm);
    const legacyWeightKg = normalizePositiveNumber(parsed?.weightKg);

    const heightCm = normalizePositiveNumber(parsed?.heightCm);
    const heightFt = normalizePositiveNumber(parsed?.heightFt);
    const heightInRaw = normalizeNonNegativeNumber(parsed?.heightIn);
    const heightIn = heightInRaw !== null ? Math.min(heightInRaw, 11) : null;
    const weightValue = normalizePositiveNumber(parsed?.weightValue);

    return {
      heightUnit,
      heightCm: heightCm ?? legacyHeightCm,
      heightFt,
      heightIn,
      weightUnit,
      weightValue: weightValue ?? legacyWeightKg,
    };
  } catch (e) {
    console.error("Failed to parse user profile", e);
    return {
      heightUnit: 'cm',
      heightCm: null,
      heightFt: null,
      heightIn: null,
      weightUnit: 'kg',
      weightValue: null,
    };
  }
};

export const saveUserProfile = (profile: UserProfile): void => {
  const normalizePositiveNumber = (value: unknown): number | null =>
    typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
  const normalizeNonNegativeNumber = (value: unknown): number | null =>
    typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;

  const normalized: UserProfile = {
    heightUnit: profile.heightUnit === 'ft_in' ? 'ft_in' : 'cm',
    heightCm: normalizePositiveNumber(profile.heightCm),
    heightFt: normalizePositiveNumber(profile.heightFt),
    heightIn: (() => {
      const inches = normalizeNonNegativeNumber(profile.heightIn);
      return inches !== null ? Math.min(inches, 11) : null;
    })(),
    weightUnit: profile.weightUnit === 'lb' ? 'lb' : 'kg',
    weightValue: normalizePositiveNumber(profile.weightValue),
  };

  localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(normalized));
};
