// src/services/appBackupService.ts
/**
 * Backs up device-only data (profile, weigh-ins, quarterly assessments) to the Google Sheet in
 * Google Drive through /api/sync, and restores it on a new device or after browser data is cleared.
 */
import {
  ATHLETE_PROFILE_EVENT,
  STORAGE_KEY_ATHLETE_PROFILE,
  loadProfile,
  sanitizeProfile,
  type AthleteProfile,
} from '../domain/athleteProfile';
import {
  DEFAULT_BASELINE_ASSESSMENT,
  QUARTERLY_ASSESSMENTS_EVENT,
  STORAGE_KEY_ASSESSMENTS,
  loadQuarterlyAssessments,
  type QuarterlyAssessmentRecord,
} from '../domain/fitnessAssessment';
import { APP_DATA_MODIFIED_EVENT, getAppDataModifiedAt, setAppDataModifiedAt } from '../storage/appDataClock';
import { getIdToken } from './firebaseAuth';

export const APP_BACKUP_VERSION = 1;
export const BACKUP_DEBOUNCE_MS = 4000;

export interface AppBackup {
  version: number;
  savedAt: string;
  profile: AthleteProfile;
  assessments: QuarterlyAssessmentRecord[];
}

export function collectAppBackup(now: Date = new Date()): AppBackup {
  return {
    version: APP_BACKUP_VERSION,
    savedAt: getAppDataModifiedAt() || now.toISOString(),
    profile: loadProfile(),
    assessments: loadQuarterlyAssessments(),
  };
}

/** True when this device holds nothing the user entered (fresh install or cleared data). */
export function isLocalDataPristine(): boolean {
  if (getAppDataModifiedAt()) return false;
  const profile = loadProfile();
  const assessments = loadQuarterlyAssessments();
  const onlyBaseline = assessments.every((a) => a.id === DEFAULT_BASELINE_ASSESSMENT.id);
  return profile.weighIns.length === 0 && onlyBaseline;
}

function isBackup(x: unknown): x is AppBackup {
  const b = x as AppBackup;
  return !!b && typeof b === 'object' && typeof b.savedAt === 'string' && !!b.profile && Array.isArray(b.assessments);
}

/** Write a backup into local storage and tell the widgets to refresh. */
export function applyAppBackup(backup: AppBackup): void {
  const profile = sanitizeProfile(backup.profile);
  const assessments = backup.assessments.filter((a) => a && typeof a.id === 'string' && typeof a.date === 'string');
  try {
    window.localStorage.setItem(STORAGE_KEY_ATHLETE_PROFILE, JSON.stringify(profile));
    window.localStorage.setItem(STORAGE_KEY_ASSESSMENTS, JSON.stringify(assessments));
  } catch {
    return;
  }
  setAppDataModifiedAt(backup.savedAt);
  try {
    window.dispatchEvent(new Event(ATHLETE_PROFILE_EVENT));
    window.dispatchEvent(new Event(QUARTERLY_ASSESSMENTS_EVENT));
  } catch {
    // non-browser
  }
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export type RestoreOutcome = 'restored' | 'backed-up' | 'in-sync' | 'no-backup' | 'unavailable';

/**
 * On app start: adopt the Drive backup if it is newer than this device's data (or this device is
 * empty); if this device is newer (or has data that was never backed up), push it instead.
 */
export async function restoreAppBackupIfNewer(push: () => Promise<boolean> = pushAppBackup): Promise<RestoreOutcome> {
  try {
    const headers = await authHeaders();
    if (!headers.Authorization) return 'unavailable';
    const res = await fetch('/api/sync?action=backup', { headers });
    if (!res.ok) return 'unavailable';
    const body = await res.json();
    const remote = isBackup(body?.backup) ? (body.backup as AppBackup) : null;
    const pristine = isLocalDataPristine();
    const local = getAppDataModifiedAt();

    if (remote && (pristine || (local !== null && remote.savedAt > local))) {
      applyAppBackup(remote);
      return 'restored';
    }
    if (pristine) return remote ? 'in-sync' : 'no-backup';
    if (!remote || local === null || remote.savedAt < local) {
      // data entered before backups existed, or edits made while offline
      if (local === null) setAppDataModifiedAt(new Date().toISOString());
      return (await push()) ? 'backed-up' : 'unavailable';
    }
    return 'in-sync';
  } catch {
    return 'unavailable';
  }
}

/** Push just the app backup (no workout rows). */
export async function pushAppBackup(): Promise<boolean> {
  try {
    const headers = await authHeaders();
    if (!headers.Authorization) return false;
    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ workoutLogs: [], mobilityEntries: [], appBackup: collectAppBackup() }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Back up a few seconds after any profile / weigh-in / assessment change. Returns a cleanup. */
export function startAppBackupAutoSync(push: () => Promise<boolean> = pushAppBackup): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const onChange = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      void push();
    }, BACKUP_DEBOUNCE_MS);
  };
  window.addEventListener(APP_DATA_MODIFIED_EVENT, onChange);
  return () => {
    window.removeEventListener(APP_DATA_MODIFIED_EVENT, onChange);
    if (timer) clearTimeout(timer);
  };
}
