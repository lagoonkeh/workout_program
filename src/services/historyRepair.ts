// src/services/historyRepair.ts
/**
 * One-time repair of workout history (Nov 2026).
 *
 * The old Google Sheets sync wrote every session's live set logs to the sheet, stamping any set without
 * a timestamp with that day's date, and every app load copied the sheet back into history. That created
 * workouts that never happened. The fix:
 *  1. on this device, drop the history entries that were copied in from the sheet (ids "sheet_…");
 *  2. rewrite the sheet's workout log from the workouts the app recorded itself. The first device to
 *     get there clears the whole log (shared marker on the sheet); each device then adds its own.
 * Until step 2 succeeds, this device neither imports from the sheet nor trusts its "last workout".
 */
import { storageManager } from '../storage/storageManager';
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
