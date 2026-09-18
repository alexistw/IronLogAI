import { Exercise, UserProfile } from '../types';
import {
  StoredStatsReportEntry,
  StoredStatsReportState,
  getExercises,
  getStatsReportState,
  getUserProfile,
  replaceAllExercises,
  saveStatsReportState,
  saveUserProfile,
} from './storageService';
import { generateId, normalizeWeightMode, normalizeWeightUnit } from '../utils';

// Serialization layer for backup/restore.
//
// Everything above `applySnapshot` is pure: snapshots go in, snapshots come out,
// no storage and no platform APIs. That is deliberate — a future iCloud/CloudKit
// sync needs exactly the same envelope and the same conflict resolution, and can
// reuse mergeSnapshots() directly against a remote snapshot.

export const BACKUP_FORMAT = 'ironlog.backup';
export const BACKUP_VERSION = 1;

export interface BackupSnapshot {
  exercises: Exercise[];
  userProfile: UserProfile;
  statsReportState: StoredStatsReportState;
}

export interface BackupPayload {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string; // ISO string
  appVersion: string;
  data: BackupSnapshot;
}

export type ImportMode = 'merge' | 'replace';

export interface ImportSummary {
  mode: ImportMode;
  exercisesBefore: number;
  exercisesAfter: number;
  exercisesAdded: number;
  exercisesUpdated: number;
  aiReportsAfter: number;
  profileReplaced: boolean;
}

export class BackupParseError extends Error {}

const APP_VERSION = '1.1.0';

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const optionalNumber = (value: unknown): number | undefined =>
  isFiniteNumber(value) ? value : undefined;

const optionalUnit = (value: unknown) =>
  typeof value === 'string' ? normalizeWeightUnit(value) : undefined;

const optionalMode = (value: unknown) =>
  typeof value === 'string' ? normalizeWeightMode(value) : undefined;

// Drops entries that cannot be rendered rather than letting a malformed file
// corrupt the log. Anything salvageable is coerced into a valid Exercise.
const sanitizeExercise = (raw: any): Exercise | null => {
  if (!raw || typeof raw !== 'object') return null;
  if (typeof raw.name !== 'string' || raw.name.trim() === '') return null;
  if (!isFiniteNumber(raw.sets) || !isFiniteNumber(raw.reps) || !isFiniteNumber(raw.weight)) return null;

  const date = typeof raw.date === 'string' && !Number.isNaN(Date.parse(raw.date))
    ? raw.date
    : null;
  if (!date) return null;

  const timestamp = isFiniteNumber(raw.timestamp) ? raw.timestamp : Date.parse(date);

  const bodyweightMode = raw.bodyweightMode === 'bw_plus' || raw.bodyweightMode === 'bw_minus'
    ? raw.bodyweightMode
    : undefined;

  return {
    id: typeof raw.id === 'string' && raw.id !== '' ? raw.id : generateId(),
    name: raw.name,
    sets: raw.sets,
    reps: raw.reps,
    weight: raw.weight,
    weightUnit: normalizeWeightUnit(raw.weightUnit),
    weightMode: normalizeWeightMode(raw.weightMode),
    plateWeightInput: optionalNumber(raw.plateWeightInput),
    plateWeightUnitInput: optionalUnit(raw.plateWeightUnitInput),
    plateCalculationMode: optionalMode(raw.plateCalculationMode),
    unloadedBarWeight: optionalNumber(raw.unloadedBarWeight),
    unloadedBarWeightUnit: optionalUnit(raw.unloadedBarWeightUnit),
    date,
    timestamp,
    assisted: typeof raw.assisted === 'boolean' ? raw.assisted : undefined,
    bodyweightMode,
    assistanceWeight: optionalNumber(raw.assistanceWeight),
    assistanceWeightInput: optionalNumber(raw.assistanceWeightInput),
    assistanceWeightUnitInput: optionalUnit(raw.assistanceWeightUnitInput),
  };
};

const sanitizeProfile = (raw: any): UserProfile => {
  const positive = (value: unknown): number | null =>
    isFiniteNumber(value) && value > 0 ? value : null;
  const nonNegative = (value: unknown): number | null =>
    isFiniteNumber(value) && value >= 0 ? value : null;

  const heightIn = nonNegative(raw?.heightIn);

  return {
    heightUnit: raw?.heightUnit === 'ft_in' ? 'ft_in' : 'cm',
    heightCm: positive(raw?.heightCm),
    heightFt: positive(raw?.heightFt),
    heightIn: heightIn !== null ? Math.min(heightIn, 11) : null,
    weightUnit: raw?.weightUnit === 'lb' ? 'lb' : 'kg',
    weightValue: positive(raw?.weightValue),
  };
};

const sanitizeStatsReportState = (raw: any): StoredStatsReportState => ({
  selectedWeekStart: typeof raw?.selectedWeekStart === 'string' ? raw.selectedWeekStart : null,
  reportPage: raw?.reportPage === 'ai' ? 'ai' : 'weekly',
  aiReports: Array.isArray(raw?.aiReports)
    ? raw.aiReports
        .filter((entry: any) => typeof entry?.weekId === 'string' && typeof entry?.report === 'string')
        .map((entry: any): StoredStatsReportEntry => ({
          weekId: entry.weekId,
          report: entry.report,
          updatedAt: typeof entry.updatedAt === 'string' ? entry.updatedAt : new Date(0).toISOString(),
        }))
    : [],
});

const isProfileEmpty = (profile: UserProfile): boolean =>
  profile.heightCm === null &&
  profile.heightFt === null &&
  profile.heightIn === null &&
  profile.weightValue === null;

/** Reads everything worth preserving out of local storage. */
export const createSnapshot = (): BackupSnapshot => ({
  exercises: getExercises(),
  userProfile: getUserProfile(),
  statsReportState: getStatsReportState(),
});

export const buildBackupPayload = (now: Date = new Date()): BackupPayload => ({
  format: BACKUP_FORMAT,
  version: BACKUP_VERSION,
  exportedAt: now.toISOString(),
  appVersion: APP_VERSION,
  data: createSnapshot(),
});

export const serializeBackup = (payload: BackupPayload): string =>
  JSON.stringify(payload, null, 2);

export const backupFileName = (now: Date = new Date()): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
  return `ironlog-backup-${stamp}.json`;
};

/**
 * Validates an untrusted string into a payload. Throws BackupParseError with a
 * message meant to be shown to the user.
 */
export const parseBackup = (raw: string): BackupPayload => {
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new BackupParseError('這不是有效的 JSON 檔案。');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new BackupParseError('備份檔內容格式不正確。');
  }
  if (parsed.format !== BACKUP_FORMAT) {
    throw new BackupParseError('這不是 IronLog 的備份檔。');
  }
  if (!isFiniteNumber(parsed.version) || parsed.version > BACKUP_VERSION) {
    throw new BackupParseError('這個備份檔來自較新版本的 IronLog，請先更新 App。');
  }
  if (!parsed.data || !Array.isArray(parsed.data.exercises)) {
    throw new BackupParseError('備份檔缺少訓練紀錄。');
  }

  const exercises = parsed.data.exercises
    .map(sanitizeExercise)
    .filter((ex: Exercise | null): ex is Exercise => ex !== null);

  return {
    format: BACKUP_FORMAT,
    version: parsed.version,
    exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : new Date(0).toISOString(),
    appVersion: typeof parsed.appVersion === 'string' ? parsed.appVersion : 'unknown',
    data: {
      exercises,
      userProfile: sanitizeProfile(parsed.data.userProfile),
      statsReportState: sanitizeStatsReportState(parsed.data.statsReportState),
    },
  };
};

/**
 * Pure conflict resolution — no storage access, so CloudKit sync can call this
 * with a remote snapshot later.
 *
 * merge:   union by exercise id, incoming wins on collision (it is the explicit
 *          restore intent); the local profile is kept unless it is still empty.
 * replace: incoming snapshot wins outright.
 */
export const mergeSnapshots = (
  local: BackupSnapshot,
  incoming: BackupSnapshot,
  mode: ImportMode
): { snapshot: BackupSnapshot; summary: ImportSummary } => {
  const exercisesBefore = local.exercises.length;

  if (mode === 'replace') {
    return {
      snapshot: incoming,
      summary: {
        mode,
        exercisesBefore,
        exercisesAfter: incoming.exercises.length,
        exercisesAdded: incoming.exercises.length,
        exercisesUpdated: 0,
        aiReportsAfter: incoming.statsReportState.aiReports.length,
        profileReplaced: true,
      },
    };
  }

  const byId = new Map<string, Exercise>();
  local.exercises.forEach(ex => byId.set(ex.id, ex));

  let added = 0;
  let updated = 0;
  incoming.exercises.forEach(ex => {
    if (byId.has(ex.id)) updated += 1;
    else added += 1;
    byId.set(ex.id, ex);
  });

  const exercises = Array.from(byId.values()).sort((a, b) => a.timestamp - b.timestamp);

  // AI reports: union by week, most recently generated wins.
  const reportsByWeek = new Map<string, StoredStatsReportEntry>();
  [...local.statsReportState.aiReports, ...incoming.statsReportState.aiReports].forEach(entry => {
    const existing = reportsByWeek.get(entry.weekId);
    if (!existing || Date.parse(entry.updatedAt) >= Date.parse(existing.updatedAt)) {
      reportsByWeek.set(entry.weekId, entry);
    }
  });

  const takeIncomingProfile = isProfileEmpty(local.userProfile);

  return {
    snapshot: {
      exercises,
      userProfile: takeIncomingProfile ? incoming.userProfile : local.userProfile,
      statsReportState: {
        ...local.statsReportState,
        aiReports: Array.from(reportsByWeek.values()),
      },
    },
    summary: {
      mode,
      exercisesBefore,
      exercisesAfter: exercises.length,
      exercisesAdded: added,
      exercisesUpdated: updated,
      aiReportsAfter: reportsByWeek.size,
      profileReplaced: takeIncomingProfile,
    },
  };
};

export const applySnapshot = (snapshot: BackupSnapshot): void => {
  replaceAllExercises(snapshot.exercises);
  saveUserProfile(snapshot.userProfile);
  saveStatsReportState(snapshot.statsReportState);
};

export const importBackup = (payload: BackupPayload, mode: ImportMode): ImportSummary => {
  const { snapshot, summary } = mergeSnapshots(createSnapshot(), payload.data, mode);
  applySnapshot(snapshot);
  return summary;
};

const LAST_BACKUP_KEY = 'ironlog_last_backup_at';

export const getLastBackupAt = (): string | null => {
  const stored = localStorage.getItem(LAST_BACKUP_KEY);
  return stored && !Number.isNaN(Date.parse(stored)) ? stored : null;
};

export const markBackupExported = (now: Date = new Date()): void => {
  localStorage.setItem(LAST_BACKUP_KEY, now.toISOString());
};
