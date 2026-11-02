// src/services/sheetSyncService.ts
import { WORKOUT_PROGRAM } from '../domain/programData';
import { storageManager, CompletedWorkoutSession } from '../storage/storageManager';
import { MobilityEntry } from '../domain/mobility';
import { SetLogRecord } from '../components/ExerciseCard';
import { getIdToken } from './firebaseAuth';
import { collectAppBackup, type AppBackup } from './appBackupService';

export const STORAGE_KEY_LAST_SYNC = 'workout_app_last_sheets_sync_v1';
export const STORAGE_KEY_LAST_SCANNED_WORKOUT = 'workout_app_last_scanned_workout_v1';

export interface ScannedWorkoutDetails {
  date: string;
  sessionTitle: string;
  sessionId?: string;
  exercises: string[];
  completedSets: number;
  totalVolumeLbs: number;
  maxKneePain?: number;
  notes?: string;
}

export interface LastWorkoutScanResult {
  lastWorkout: ScannedWorkoutDetails | null;
  suggestedNextSession: {
    id: string;
    title: string;
  };
  source: 'google_sheets' | 'local_storage' | 'default';
  daysAgo?: number | null;
}

export const SESSION_ROTATION_MAP: Record<string, { id: string; title: string }> = {
  lower_a: { id: 'upper_a', title: 'Upper A (Horizontal Push/Pull & Shoulder Health)' },
  upper_a: { id: 'lower_b', title: 'Lower B (Posterior Chain & Hamstring Restoration)' },
  lower_b: { id: 'upper_b', title: 'Upper B (Vertical Push/Pull & Functional Calisthenics)' },
  upper_b: { id: 'lower_a', title: 'Lower A (Quad & Knee Bulletproofing)' },
};

/**
 * Bearer header carrying the Firebase ID token; /api/sync rejects requests without one.
 */
async function authHeaders(): Promise<Record<string, string>> {
  const token = await getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Resolves session ID from session title string
 */
export function resolveSessionIdFromTitle(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('lower a')) return 'lower_a';
  if (t.includes('upper a')) return 'upper_a';
  if (t.includes('lower b')) return 'lower_b';
  if (t.includes('upper b')) return 'upper_b';
  if (t.includes('daily abs') || t.includes('abs')) return 'daily_abs';
  if (t.includes('run')) return 'run_conditioning';
  if (t.includes('bjj')) return 'post_bjj_recovery';
  return 'lower_a';
}

/**
 * Scans the last recorded workout prior to suggesting which one to do today.
 * First queries Google Sheets via /api/sync?action=last-workout.
 * If offline or during unit tests, falls back seamlessly to client storage.
 */
export async function scanLastWorkout(
  _rawWorkoutLogs?: Record<string, SetLogRecord[]>,
  _activeSessionId?: string
): Promise<LastWorkoutScanResult> {
  const defaultSuggestion = { id: 'lower_a', title: 'Lower A (Quad & Knee Bulletproofing)' };

  // 1. Try fetching latest recorded workout from remote Google Sheets sync API
  try {
    const res = await fetch('/api/sync?action=last-workout', { headers: await authHeaders() });
    if (res.ok) {
      const data = await res.json();
      if (data && data.lastWorkout) {
        const last = data.lastWorkout;
        const resolvedId = resolveSessionIdFromTitle(last.sessionTitle || '');
        const rotation = SESSION_ROTATION_MAP[resolvedId] || defaultSuggestion;

        let daysAgo: number | null = null;
        if (last.date) {
          const workoutDate = new Date(last.date);
          const now = new Date();
          const diffMs = now.getTime() - workoutDate.getTime();
          daysAgo = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
        }

        const scanResult: LastWorkoutScanResult = {
          lastWorkout: {
            date: last.date,
            sessionTitle: last.sessionTitle,
            sessionId: resolvedId,
            exercises: Array.isArray(last.exercises) ? last.exercises : [],
            completedSets: last.completedSets || 0,
            totalVolumeLbs: last.totalVolumeLbs || 0,
            maxKneePain: last.maxKneePain || 0,
            notes: last.notes || '',
          },
          suggestedNextSession: data.suggestedNextSession || rotation,
          source: 'google_sheets',
          daysAgo,
        };

        // If remote response contains full history, auto-seed any missing sessions into local storage
        if (Array.isArray(data.allWorkouts) && data.allWorkouts.length > 0) {
          const currentCompleted = storageManager.getCompletedWorkouts();
          data.allWorkouts.forEach((w: any) => {
            const key = w.id || `sheet_${w.date}_${w.sessionId}`;
            if (!currentCompleted[key]) {
              storageManager.saveCompletedWorkout({
                id: key,
                date: w.date || new Date().toISOString(),
                sessionId: w.sessionId || resolveSessionIdFromTitle(w.sessionTitle || ''),
                sessionTitle: w.sessionTitle,
                logs: w.logs || {},
                totalVolumeLbs: w.totalVolumeLbs || 0,
                adherencePercentage: w.adherencePercentage ?? 100,
                completedExercisesCount: w.completedExercisesCount || (w.exercises ? w.exercises.length : 0),
                totalExercisesCount: w.totalExercisesCount || (w.exercises ? w.exercises.length : 0),
                notes: w.notes || '',
              });
            }
          });
        }

        try {
          localStorage.setItem(STORAGE_KEY_LAST_SCANNED_WORKOUT, JSON.stringify(scanResult));
        } catch {
          // safe fallback
        }

        return scanResult;
      }
    }
  } catch {
    // network or endpoint unavailable, proceed to local storage fallback
  }

  // 2. Local fallback: scan cached result or storageManager
  try {
    const cached = localStorage.getItem(STORAGE_KEY_LAST_SCANNED_WORKOUT);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.lastWorkout) {
        return {
          ...parsed,
          source: 'local_storage',
        };
      }
    }
  } catch {
    // ignore parse error
  }

  // 3. Fallback: inspect completed workouts or current logs in storageManager
  const storageData = storageManager.load();
  const completedList = Object.values(storageData.completedWorkouts || {}).sort((a, b) =>
    (b.date || '').localeCompare(a.date || '')
  );

  if (completedList.length > 0) {
    const lastSession = completedList[0];
    const sessId = lastSession.sessionId || 'lower_a';
    const rotation = SESSION_ROTATION_MAP[sessId] || defaultSuggestion;

    let daysAgo: number | null = null;
    if (lastSession.date) {
      const workoutDate = new Date(lastSession.date);
      const now = new Date();
      const diffMs = now.getTime() - workoutDate.getTime();
      daysAgo = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    }

    const sessionData = WORKOUT_PROGRAM[sessId];
    return {
      lastWorkout: {
        date: lastSession.date ? lastSession.date.split('T')[0] : 'Recent',
        sessionTitle: sessionData ? sessionData.title : sessId,
        sessionId: sessId,
        exercises: sessionData ? sessionData.exercises.map((e) => e.name) : [],
        completedSets: Object.keys(lastSession.logs || {}).length,
        totalVolumeLbs: 0,
      },
      suggestedNextSession: rotation,
      source: 'local_storage',
      daysAgo,
    };
  }

  // 4. Default: If no history exists, default to Lower A
  return {
    lastWorkout: null,
    suggestedNextSession: defaultSuggestion,
    source: 'default',
    daysAgo: null,
  };
}

export interface FetchHistoryResult {
  success: boolean;
  importedCount: number;
  totalAvailable: number;
  workouts: CompletedWorkoutSession[];
  message: string;
}

/**
 * Fetches all recorded workout history from Google Sheets and imports
 * any missing sessions into client storage.
 */
export async function fetchWorkoutHistoryFromSheets(): Promise<FetchHistoryResult> {
  try {
    const res = await fetch('/api/sync?action=history', { headers: await authHeaders() });
    if (!res.ok) {
      if (res.status === 401) {
        return {
          success: false,
          importedCount: 0,
          totalAvailable: 0,
          workouts: [],
          message: 'Sign-in required: Please authenticate with your Google account to access your workout history from Google Sheets.',
        };
      }
      return {
        success: false,
        importedCount: 0,
        totalAvailable: 0,
        workouts: [],
        message: `Google Sheets sync returned HTTP ${res.status}`,
      };
    }

    const data = await res.json();
    const workouts: any[] = Array.isArray(data.allWorkouts) ? data.allWorkouts : [];

    if (workouts.length === 0) {
      return {
        success: true,
        importedCount: 0,
        totalAvailable: 0,
        workouts: [],
        message: 'No previous workout logs found in Google Sheets.',
      };
    }

    const existingWorkouts = storageManager.getCompletedWorkouts();
    let importedCount = 0;

    workouts.forEach((w) => {
      const recordId = w.id || `sheet_${w.date}_${w.sessionId}`;
      storageManager.saveCompletedWorkout({
        id: recordId,
        date: w.date || new Date().toISOString(),
        sessionId: w.sessionId || resolveSessionIdFromTitle(w.sessionTitle || ''),
        sessionTitle: w.sessionTitle,
        logs: w.logs || {},
        totalVolumeLbs: w.totalVolumeLbs || 0,
        adherencePercentage: w.adherencePercentage ?? 100,
        completedExercisesCount: w.completedExercisesCount || (w.exercises ? w.exercises.length : 0),
        totalExercisesCount: w.totalExercisesCount || (w.exercises ? w.exercises.length : 0),
        notes: w.notes || '',
      });
      if (!existingWorkouts[recordId]) {
        importedCount += 1;
      }
    });

    return {
      success: true,
      importedCount,
      totalAvailable: workouts.length,
      workouts: Object.values(storageManager.getCompletedWorkouts()),
      message: `Successfully synchronized ${workouts.length} workout session(s) from Google Sheets (${importedCount} new).`,
    };
  } catch (err: any) {
    return {
      success: false,
      importedCount: 0,
      totalAvailable: 0,
      workouts: [],
      message: `Failed to fetch history: ${err.message || 'Network error'}`,
    };
  }
}

export interface SyncedWorkoutItem {
  date: string;
  session: string;
  exerciseName: string;
  tier: string;
  setNumber: number;
  targetReps: string;
  weight: number;
  reps: number;
  isAmrap: boolean;
  kneePain: number;
  rpe: number;
  notes: string;
}

export interface SyncedMobilityItem {
  date: string;
  testId: string;
  testName: string;
  side?: 'left' | 'right' | 'bilateral';
  value: number;
  notes?: string;
}

export interface SyncPayload {
  activeSessionId: string;
  workoutLogs: SyncedWorkoutItem[];
  mobilityEntries: SyncedMobilityItem[];
  /** profile, weigh-ins and quarterly assessments (device-only data) */
  appBackup?: AppBackup;
}

export interface SyncResult {
  success: boolean;
  message: string;
  syncedWorkouts?: number;
  syncedMobility?: number;
  timestamp?: string;
}

/**
 * YYYY-MM-DD in the device's local time zone (toISOString would roll evening workouts into tomorrow).
 */
export function toLocalDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Extracts RPE and knee pain from quick-chip notes such as "@RPE 8" and "Knee Pain 2/10".
 */
export function parseSetRatings(notes: string): { rpe: number; kneePain: number } {
  const text = notes || '';
  const rpeMatch = /RPE\s*(\d+(?:\.\d+)?)/i.exec(text);
  // Highest pain rating wins if several chips were tapped
  const painValues = Array.from(text.matchAll(/Pain(?:-Free)?\s*(\d+(?:\.\d+)?)\s*\/\s*10/gi), (m) =>
    parseFloat(m[1])
  );
  return {
    rpe: rpeMatch ? parseFloat(rpeMatch[1]) : 0,
    kneePain: painValues.length > 0 ? Math.max(...painValues) : 0,
  };
}

/**
 * Gathers all active session workout logs and mobility measurements
 * from client LocalStorage and formats them for Google Sheets.
 */
export function buildSyncPayload(
  activeSessionId: string,
  rawWorkoutLogs: Record<string, SetLogRecord[]>,
  rawMobilityHistory?: MobilityEntry[]
): SyncPayload {
  const todayStr = toLocalDateStr(new Date());
  const workoutLogs: SyncedWorkoutItem[] = [];

  // Iterate across all exercises across all sessions to catch any logged data
  Object.values(WORKOUT_PROGRAM).forEach((sessData) => {
    sessData.exercises.forEach((ex) => {
      const exerciseKeys = [ex.id, `${ex.id}__side_left`, `${ex.id}__side_right`];
      exerciseKeys.forEach((key) => {
        const logs = rawWorkoutLogs[key];
        if (Array.isArray(logs)) {
          const isLeft = key.endsWith('__side_left');
          const isRight = key.endsWith('__side_right');
          const sideSuffix = isLeft ? ' (Left Side)' : isRight ? ' (Right Side)' : '';
          const resolvedName = `${ex.name}${sideSuffix}`;

          logs.forEach((log) => {
            // Include if marked completed OR has positive reps/weight
            const hasWeight = typeof log.weightLbs === 'number' && log.weightLbs > 0;
            const hasReps = typeof log.repsAchieved === 'number' && log.repsAchieved > 0;
            if (log.isCompleted || hasWeight || hasReps) {
              const { rpe, kneePain } = parseSetRatings(log.notes || '');
              workoutLogs.push({
                date: log.loggedAt ? toLocalDateStr(new Date(log.loggedAt)) : todayStr,
                session: sessData.title,
                exerciseName: resolvedName,
                tier: ex.tier,
                setNumber: log.setNumber,
                targetReps: log.targetReps || ex.targetReps,
                weight: log.weightLbs || 0,
                reps: log.repsAchieved || 0,
                isAmrap: ex.tier === 'T1' && log.setNumber === 3,
                kneePain,
                rpe,
                notes: log.notes || '',
              });
            }
          });
        }
      });
    });
  });

  // Mobility history
  const mobilityHistory = rawMobilityHistory || storageManager.load().mobilityHistory || [];
  const mobilityEntries: SyncedMobilityItem[] = mobilityHistory.map((m) => ({
    date: m.date || todayStr,
    testId: m.testId,
    testName: m.testId,
    side: m.side,
    value: m.value,
    notes: m.notes,
  }));

  return {
    activeSessionId,
    workoutLogs,
    mobilityEntries,
    appBackup: collectAppBackup(),
  };
}

/**
 * Dispatches sync payload to /api/sync serverless endpoint
 */
export async function syncToGoogleSheets(payload: SyncPayload): Promise<SyncResult> {
  try {
    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(await authHeaders()),
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const errorMsg = errData.error || `Server responded with HTTP ${res.status}`;
      return {
        success: false,
        message: errorMsg,
      };
    }

    const data = await res.json();
    const timestamp = data.timestamp || new Date().toISOString();

    // Persist last successful sync timestamp
    try {
      localStorage.setItem(STORAGE_KEY_LAST_SYNC, timestamp);
    } catch {
      // safe fallback
    }

    return {
      success: true,
      message: `Successfully synchronized ${data.syncedWorkouts || 0} workout sets and ${
        data.syncedMobility || 0
      } mobility tests to Google Sheets${data.backedUpProfile ? ', plus your profile and assessments' : ''}!`,
      syncedWorkouts: data.syncedWorkouts,
      syncedMobility: data.syncedMobility,
      timestamp,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Network error occurred while connecting to Google Sheets sync.',
    };
  }
}
