// src/hooks/useCloudSync.ts
import { Dispatch, SetStateAction, useEffect, useRef } from 'react';
import { WORKOUT_PROGRAM } from '../domain/programData';
import { SetLogRecord } from '../components/ExerciseCard';
import { MobilityEntry } from '../domain/mobility';
import { storageManager } from '../storage/storageManager';
import { firestoreSyncService } from '../services/firestoreSyncService';
import { isFirebaseConfigured, isTestEnvironment } from '../services/firebaseAuth';
import { STORAGE_KEY_LOGS, STORAGE_KEY_SPLIT_SIDES, STORAGE_KEY_WARMUPS } from '../storage/appStorageKeys';

export interface CloudSyncState {
  userId: string | undefined;
  activeSessionId: string;
  workoutLogs: Record<string, SetLogRecord[]>;
  completedWarmups: Record<string, boolean>;
  splitSidesExercises: Record<string, boolean>;
  setActiveSessionId: Dispatch<SetStateAction<string>>;
  setWorkoutLogs: Dispatch<SetStateAction<Record<string, SetLogRecord[]>>>;
  setCompletedWarmups: Dispatch<SetStateAction<Record<string, boolean>>>;
  setSplitSidesExercises: Dispatch<SetStateAction<Record<string, boolean>>>;
  setMobilityHistory: Dispatch<SetStateAction<MobilityEntry[]>>;
}

/**
 * Cloud Firestore real-time bi-directional multi-device sync of workout state and mobility history.
 */
export function useCloudSync({
  userId,
  activeSessionId,
  workoutLogs,
  completedWarmups,
  splitSidesExercises,
  setActiveSessionId,
  setWorkoutLogs,
  setCompletedWarmups,
  setSplitSidesExercises,
  setMobilityHistory,
}: CloudSyncState): void {
  // Set while applying a remote snapshot so it isn't echoed straight back to Firestore
  const isRemoteSyncUpdateRef = useRef<boolean>(false);

  useEffect(() => {
    if (!userId || isTestEnvironment() || !isFirebaseConfigured()) return;

    // Real-time workout state subscription (bidirectional multi-device sync)
    const unsubscribeWorkout = firestoreSyncService.subscribeToWorkoutState(userId, (remoteState) => {
      isRemoteSyncUpdateRef.current = true;
      if (remoteState.activeSessionId && remoteState.activeSessionId in WORKOUT_PROGRAM) {
        setActiveSessionId(remoteState.activeSessionId);
      }
      if (remoteState.workoutLogs) {
        setWorkoutLogs((prev) => ({ ...prev, ...remoteState.workoutLogs }));
        try {
          localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(remoteState.workoutLogs));
        } catch {
          // safe fallback
        }
      }
      if (remoteState.completedWarmupDrills) {
        setCompletedWarmups((prev) => ({ ...prev, ...remoteState.completedWarmupDrills }));
        try {
          localStorage.setItem(STORAGE_KEY_WARMUPS, JSON.stringify(remoteState.completedWarmupDrills));
        } catch {
          // safe fallback
        }
      }
      if (remoteState.splitSidesExercises) {
        setSplitSidesExercises((prev) => ({ ...prev, ...remoteState.splitSidesExercises }));
        try {
          localStorage.setItem(STORAGE_KEY_SPLIT_SIDES, JSON.stringify(remoteState.splitSidesExercises));
        } catch {
          // safe fallback
        }
      }
      setTimeout(() => {
        isRemoteSyncUpdateRef.current = false;
      }, 100);
    });

    // Real-time mobility history subscription
    const unsubscribeMobility = firestoreSyncService.subscribeToMobilityHistory(userId, (remoteEntries) => {
      isRemoteSyncUpdateRef.current = true;
      setMobilityHistory(remoteEntries);
      storageManager.saveImmediate({ mobilityHistory: remoteEntries });
      setTimeout(() => {
        isRemoteSyncUpdateRef.current = false;
      }, 100);
    });

    return () => {
      unsubscribeWorkout();
      unsubscribeMobility();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Debounced push of local workout state changes to Cloud Firestore
  useEffect(() => {
    if (!userId || isTestEnvironment() || !isFirebaseConfigured()) return;

    if (isRemoteSyncUpdateRef.current) {
      return;
    }

    firestoreSyncService.syncWorkoutState(userId, {
      activeSessionId,
      workoutLogs,
      completedWarmupDrills: completedWarmups,
      splitSidesExercises,
    });
  }, [userId, activeSessionId, workoutLogs, completedWarmups, splitSidesExercises]);

  // Sync mobility additions/deletions/updates via storageManager to Cloud Firestore
  useEffect(() => {
    if (!userId || isTestEnvironment() || !isFirebaseConfigured()) return;

    const unsubscribeStorage = storageManager.subscribe((storageData) => {
      if (isRemoteSyncUpdateRef.current) return;
      if (storageData.mobilityHistory) {
        setMobilityHistory(storageData.mobilityHistory);
        firestoreSyncService.syncMobilityHistory(userId, storageData.mobilityHistory);
      }
    });

    return () => {
      unsubscribeStorage();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);
}
