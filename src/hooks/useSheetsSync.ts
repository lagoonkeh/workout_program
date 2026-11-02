// src/hooks/useSheetsSync.ts
import { useCallback, useState } from 'react';
import { SetLogRecord } from '../components/ExerciseCard';
import { buildSyncPayload, pushWorkoutsToSheets, syncToGoogleSheets, STORAGE_KEY_LAST_SYNC } from '../services/sheetSyncService';
import { storageManager, type CompletedWorkoutSession } from '../storage/storageManager';

export interface SheetsSyncToast {
  type: 'success' | 'error';
  message: string;
}

/**
 * Google Sheets export state: manual/auto sync handler, in-flight flag, success flash and toast.
 */
export function useSheetsSync(activeSessionId: string, workoutLogs: Record<string, SetLogRecord[]>) {
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncSuccessFlash, setSyncSuccessFlash] = useState<boolean>(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_LAST_SYNC);
      if (stored) {
        return new Date(stored).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
    } catch {
      // safe fallback
    }
    return null;
  });
  const [syncToast, setSyncToast] = useState<SheetsSyncToast | null>(null);

  const handleSyncToSheets = useCallback(
    async (targetSessionId?: string, targetLogs?: Record<string, SetLogRecord[]>, isAutoSync: boolean = false) => {
      if (isSyncing) return;
      setIsSyncing(true);
      setSyncToast(null);

      try {
        const sessId = targetSessionId || activeSessionId;
        const logs = targetLogs || workoutLogs;
        const payload = buildSyncPayload(sessId, logs);
        const base = await syncToGoogleSheets(payload);
        // Workout rows come from finished workouts (with their real dates), never from live set logs
        const pushed = base.success
          ? await pushWorkoutsToSheets(Object.values(storageManager.getCompletedWorkouts()))
          : { success: false, message: base.message };
        const result = { ...base, success: base.success && pushed.success, message: pushed.success ? base.message : pushed.message };

        if (result.success) {
          setSyncSuccessFlash(true);
          const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          setLastSyncedTime(timeStr);
          setSyncToast({
            type: 'success',
            message: isAutoSync
              ? `🎉 Workout Complete — Auto-synced ${result.syncedWorkouts || 0} sets to Google Sheets!`
              : result.message || 'Successfully synced with Google Sheets!',
          });
          setTimeout(() => setSyncSuccessFlash(false), 4000);
          setTimeout(() => setSyncToast(null), 5000);
        } else {
          setSyncToast({
            type: 'error',
            message: result.message || 'Failed to sync with Google Sheets.',
          });
          setTimeout(() => setSyncToast(null), 7000);
        }
      } catch (err: any) {
        setSyncToast({
          type: 'error',
          message: err.message || 'Unexpected sync error occurred.',
        });
        setTimeout(() => setSyncToast(null), 7000);
      } finally {
        setIsSyncing(false);
      }
    },
    [activeSessionId, workoutLogs, isSyncing]
  );

  /** After a workout is finished: write just that workout's sets to the sheet */
  const handleSyncFinishedWorkout = useCallback(async (record: CompletedWorkoutSession) => {
    const r = await pushWorkoutsToSheets([record]);
    if (r.success) {
      setSyncSuccessFlash(true);
      setLastSyncedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      try {
        localStorage.setItem(STORAGE_KEY_LAST_SYNC, new Date().toISOString());
      } catch {
        // safe fallback
      }
      setSyncToast({ type: 'success', message: 'Workout saved to Google Sheets.' });
      setTimeout(() => setSyncSuccessFlash(false), 4000);
      setTimeout(() => setSyncToast(null), 5000);
    } else {
      setSyncToast({ type: 'error', message: `Workout saved on this device, but Google Sheets wasn't updated: ${r.message}` });
      setTimeout(() => setSyncToast(null), 7000);
    }
  }, []);

  const handleManualSyncToSheets = useCallback(() => {
    handleSyncToSheets();
  }, [handleSyncToSheets]);

  return {
    isSyncing,
    syncSuccessFlash,
    lastSyncedTime,
    syncToast,
    setSyncToast,
    handleSyncToSheets,
    handleSyncFinishedWorkout,
    handleManualSyncToSheets,
  };
}
