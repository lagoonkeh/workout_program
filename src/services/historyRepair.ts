// src/services/historyRepair.ts
/**
 * One-time repair of workout history (Nov 2026).
 *
 * The old Google Sheets sync wrote every session's live set logs to the sheet, stamping any set without
 * a timestamp with that day's date, and every app load copied the sheet back into history. That created
 * workouts that never happened. The fix:
 *  1. on this device, drop the history entries that were copied in from the sheet (ids "sheet_â€¦");
 *  2. rewrite the sheet's workout log from the workouts the app recorded itself. The first device to
 *     get there clears the whole log (shared marker on the sheet); each device then adds its own.
 * Until step 2 succeeds, this device neither imports from the sheet nor trusts its "last workout".
 */
import { storageManager, type CompletedWorkoutSession } from '../storage/storageManager';
import { localDateStr, parseWorkoutDate } from '../domain/historyEdit';
import {
  pushWorkoutsToSheets,
  SHEET_REPAIR_MARKER,
  STORAGE_KEY_HISTORY_REPAIR,
  STORAGE_KEY_LAST_SCANNED_WORKOUT,
  isHistoryRepaired,
} from './sheetSyncService';

const STORAGE_KEY_LOCAL_REPAIR = 'workout_history_local_repair_v1';

/** Step 1 (synchronous, safe to call before the app reads history). Returns how many entries were removed. */
export function removeSheetCopiesOnce(): number {
  try {
    if (localStorage.getItem(STORAGE_KEY_LOCAL_REPAIR) === 'done') return 0;
    let removed = 0;
    for (const w of Object.values(storageManager.getCompletedWorkouts())) {
      if (w.id && w.id.startsWith('sheet_')) {
        storageManager.deleteCompletedWorkout(w.id);
        removed += 1;
      }
    }
    localStorage.removeItem(STORAGE_KEY_LAST_SCANNED_WORKOUT);
    localStorage.setItem(STORAGE_KEY_LOCAL_REPAIR, 'done');
    return removed;
  } catch {
    return 0;
  }
}

const STORAGE_KEY_NOV1_CLEANUP = 'workout_history_nov1_cleanup_v1';
/** The only workout actually done on Nov 1, 2026 (confirmed by the user) */
const NOV1 = '2026-11-01';
const NOV1_REAL_SESSION = 'upper_a';

const doneSets = (w: CompletedWorkoutSession) =>
  Object.values(w.logs || {}).reduce(
    (n, v) => n + (Array.isArray(v) ? v : [v]).filter((s: any) => s && (s.isCompleted || s.completed)).length,
    0
  );

/**
 * One-time clean-up of Nov 1, 2026. Stale 100% marks and the old double save recorded workouts that
 * day that never happened. Only Upper A was done: every other session dated that day is removed, and
 * of the Upper A copies the one with the most completed sets (latest on a tie) is kept.
 * Returns the ids removed.
 */
export function removeNov1PhantomsOnce(): string[] {
  try {
    if (localStorage.getItem(STORAGE_KEY_NOV1_CLEANUP) === 'done') return [];
    const day = Object.values(storageManager.getCompletedWorkouts()).filter(
      (w) => localDateStr(parseWorkoutDate(w.completedAt || w.date)) === NOV1
    );
    const real = day
      .filter((w) => w.sessionId === NOV1_REAL_SESSION)
      .sort(
        (a, b) =>
          doneSets(b) - doneSets(a) ||
          parseWorkoutDate(b.completedAt || b.date).getTime() - parseWorkoutDate(a.completedAt || a.date).getTime()
      );
    const keep = real[0]?.id;
    const removed: string[] = [];
    for (const w of day) {
      if (w.id && w.id !== keep) {
        storageManager.deleteCompletedWorkout(w.id);
        removed.push(w.id);
      }
    }
    localStorage.setItem(STORAGE_KEY_NOV1_CLEANUP, 'done');
    return removed;
  } catch {
    return [];
  }
}

let pending: Promise<boolean> | null = null;

/** Step 2 (needs sign-in): rebuild the sheet's workout log from this device's own workouts. */
export function repairSheetHistory(): Promise<boolean> {
  if (isHistoryRepaired()) return Promise.resolve(true);
  if (!pending) {
    const own = Object.values(storageManager.getCompletedWorkouts()).filter((w) => !(w.id || '').startsWith('sheet_'));
    pending = pushWorkoutsToSheets(own, { resetMarker: SHEET_REPAIR_MARKER })
      .then((r) => {
        if (r.success) {
          try {
            localStorage.setItem(STORAGE_KEY_HISTORY_REPAIR, 'done');
          } catch {
            // safe fallback
          }
        }
        return r.success;
      })
      .finally(() => {
        pending = null;
      });
  }
  return pending;
}

const STORAGE_KEY_MEADOWS_MIGRATION = 'workout_meadows_to_kb_row_v1';
const KB_ROW = 't2_kb_single_arm_row';
const isMeadowsKey = (k: string) => /landmine_meadows_row/.test(k);

/**
 * One-time switch from the retired Landmine Meadows Row to the Single-Arm Kettlebell Row.
 * In every past workout, Meadows Row sets become Kettlebell Row sets (dropped if that workout already
 * has Kettlebell Row sets); leftover Meadows Row sets in the current workout are removed.
 * Returns how many past workouts changed.
 */
export function migrateMeadowsRowOnce(): number {
  try {
    if (localStorage.getItem(STORAGE_KEY_MEADOWS_MIGRATION) === 'done') return 0;
    let changed = 0;
    for (const w of Object.values(storageManager.getCompletedWorkouts())) {
      const keys = Object.keys(w.logs || {}).filter(isMeadowsKey);
      if (!w.id || keys.length === 0) continue;
      const logs: Record<string, any> = { ...(w.logs || {}) };
      for (const k of keys) {
        const target = k.replace(/(t2_)?landmine_meadows_row/, KB_ROW);
        if (!logs[target]) logs[target] = logs[k];
        delete logs[k];
      }
      storageManager.updateCompletedWorkout(w.id, { logs });
      changed += 1;
    }
    // current set logs (both stores the app reads from)
    try {
      const raw = localStorage.getItem('workout_app_set_logs_v1');
      if (raw) {
        const cur = JSON.parse(raw);
        Object.keys(cur).filter(isMeadowsKey).forEach((k) => delete cur[k]);
        localStorage.setItem('workout_app_set_logs_v1', JSON.stringify(cur));
      }
      const current = { ...(storageManager.load().currentLogs || {}) } as Record<string, unknown>;
      if (Object.keys(current).some(isMeadowsKey)) {
        Object.keys(current).filter(isMeadowsKey).forEach((k) => delete current[k]);
        storageManager.saveImmediate({ currentLogs: current as any });
      }
    } catch {
      // safe fallback
    }
    localStorage.setItem(STORAGE_KEY_MEADOWS_MIGRATION, 'done');
    return changed;
  } catch {
    return 0;
  }
}
