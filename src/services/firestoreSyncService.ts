// src/services/firestoreSyncService.ts
// The Firestore SDK (~560 KB with its deps) is loaded on demand via import() so it stays off the
// initial page load; only type imports are static.
import type { Firestore, Unsubscribe } from 'firebase/firestore';
import { loadFirebaseAuth, isFirebaseConfigured, isTestEnvironment } from './firebaseAuth';
import { SetLogRecord } from '../components/ExerciseCard';
import { MobilityEntry } from '../domain/mobility';

export interface WorkoutStateSyncPayload {
  activeSessionId: string;
  workoutLogs: Record<string, SetLogRecord[]>;
  completedWarmupDrills: Record<string, boolean>;
  splitSidesExercises: Record<string, boolean>;
  updatedAt: number;
  device?: string;
}

export interface MobilityHistorySyncPayload {
  entries: MobilityEntry[];
  updatedAt: number;
}

export type CloudSyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';

export const STORAGE_KEY_LAST_CLOUD_SYNC = 'workout_app_last_cloud_sync_v1';
export const STORAGE_KEY_LOCAL_STATE_TIMESTAMP = 'workout_app_local_state_timestamp_v1';
export const STORAGE_KEY_LOCAL_MOBILITY_TIMESTAMP = 'workout_app_local_mobility_timestamp_v1';

type FirestoreModule = typeof import('firebase/firestore');

let firestoreModulePromise: Promise<FirestoreModule> | null = null;
let dbSetup: Promise<Firestore> | null = null;
let persistenceEnabled = false;

export const loadFirestoreModule = (): Promise<FirestoreModule> => {
  if (!firestoreModulePromise) {
    firestoreModulePromise = import('firebase/firestore');
  }
  return firestoreModulePromise;
};

export const getFirebaseDb = async (): Promise<Firestore | null> => {
  if (isTestEnvironment() || !isFirebaseConfigured()) return null;
  try {
    // The app can open before Firebase has restored the session: wait for it, or writes go out unauthenticated
    const auth = await loadFirebaseAuth();
    if (!auth || !auth.app) return null;
    await auth.authStateReady().catch(() => {});
    if (!auth.currentUser) return null;
    // Callers often ask at the same moment on startup: share one setup, so offline persistence is
    // enabled exactly once, before anything uses the database (enabling it later throws)
    if (!dbSetup) {
      const app = auth.app;
      dbSetup = loadFirestoreModule().then(({ getFirestore, enableIndexedDbPersistence }) => {
        const instance = getFirestore(app);
        if (typeof window !== 'undefined' && !persistenceEnabled) {
          enableIndexedDbPersistence(instance)
            .then(() => {
              persistenceEnabled = true;
            })
            .catch(() => {
              // failed-precondition: another tab has persistence; unimplemented: no IndexedDB. Sync still works online.
            });
        }
        return instance;
      });
      dbSetup.catch(() => {
        dbSetup = null; // let the next call try again
      });
    }
    return await dbSetup;
  } catch (err) {
    console.error('[FirestoreSync] Failed to initialize Firestore:', err);
    return null;
  }
};

class FirestoreSyncService {
  private workoutDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private mobilityDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private statusListeners: Set<(status: CloudSyncStatus, lastSyncedTime: number | null) => void> = new Set();
  private currentStatus: CloudSyncStatus = 'idle';
  private lastSyncedTime: number | null = null;

  constructor() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_LAST_CLOUD_SYNC);
      if (stored) {
        this.lastSyncedTime = parseInt(stored, 10) || null;
      }
    } catch {
      // ignore storage access errors
    }
  }

  public getStatus(): CloudSyncStatus {
    return this.currentStatus;
  }

  public getLastSyncedTime(): number | null {
    return this.lastSyncedTime;
  }

  public onStatusChange(callback: (status: CloudSyncStatus, lastSyncedTime: number | null) => void): () => void {
    this.statusListeners.add(callback);
    callback(this.currentStatus, this.lastSyncedTime);
    return () => {
      this.statusListeners.delete(callback);
    };
  }

  private setStatus(status: CloudSyncStatus): void {
    this.currentStatus = status;
    if (status === 'synced') {
      this.lastSyncedTime = Date.now();
      try {
        localStorage.setItem(STORAGE_KEY_LAST_CLOUD_SYNC, String(this.lastSyncedTime));
      } catch {
        // ignore
      }
    }
    this.statusListeners.forEach((cb) => cb(this.currentStatus, this.lastSyncedTime));
  }

  /**
   * Starts a snapshot listener once the Firestore SDK has loaded. Returns an unsubscribe function
   * immediately; calling it before the SDK loads cancels the pending subscription.
   */
  private subscribeWhenReady(
    userId: string,
    start: (fs: FirestoreModule, firestore: Firestore) => Unsubscribe
  ): Unsubscribe {
    if (!userId || isTestEnvironment() || !isFirebaseConfigured()) {
      return () => {};
    }

    let unsubscribe: Unsubscribe | null = null;
    let cancelled = false;

    void (async () => {
      const firestore = await getFirebaseDb();
      if (!firestore || cancelled) return;
      const fs = await loadFirestoreModule();
      if (cancelled) return;
      unsubscribe = start(fs, firestore);
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }

  /**
   * Subscribes to real-time changes to the user's workout state in Firestore.
   */
  public subscribeToWorkoutState(
    userId: string,
    onRemoteUpdate: (payload: WorkoutStateSyncPayload) => void
  ): Unsubscribe {
    return this.subscribeWhenReady(userId, ({ doc, onSnapshot }, firestore) => {
      const stateDocRef = doc(firestore, 'users', userId, 'state', 'current_workout');

      return onSnapshot(
        stateDocRef,
        (snapshot) => {
          if (!snapshot.exists()) return;
          const data = snapshot.data() as WorkoutStateSyncPayload;
          if (!data || !data.updatedAt) return;

          // Check if remote data is newer than our local timestamp
          const localTimestamp = this.getLocalTimestamp(STORAGE_KEY_LOCAL_STATE_TIMESTAMP);
          if (data.updatedAt > localTimestamp) {
            this.setLocalTimestamp(STORAGE_KEY_LOCAL_STATE_TIMESTAMP, data.updatedAt);
            onRemoteUpdate(data);
            this.setStatus('synced');
          }
        },
        (error) => {
          console.warn('[FirestoreSync] Real-time workout listener error:', error);
          this.setStatus('offline');
        }
      );
    });
  }

  /**
   * Debounced push of workout state to Cloud Firestore (500ms debounce).
   */
  public syncWorkoutState(userId: string, state: Omit<WorkoutStateSyncPayload, 'updatedAt'>): void {
    if (!userId || isTestEnvironment() || !isFirebaseConfigured()) return;

    if (this.workoutDebounceTimer) {
      clearTimeout(this.workoutDebounceTimer);
    }

    this.setStatus('syncing');

    this.workoutDebounceTimer = setTimeout(async () => {
      await this.pushWorkoutStateImmediate(userId, state);
    }, 500);
  }

  /**
   * Immediate write of workout state to Cloud Firestore.
   */
  public async pushWorkoutStateImmediate(
    userId: string,
    state: Omit<WorkoutStateSyncPayload, 'updatedAt'>
  ): Promise<void> {
    const firestore = await getFirebaseDb();
    if (!firestore || !userId || isTestEnvironment()) {
      this.setStatus('idle');
      return;
    }

    try {
      this.setStatus('syncing');
      const { doc, setDoc } = await loadFirestoreModule();
      const now = Date.now();
      const payload: WorkoutStateSyncPayload = {
        ...state,
        updatedAt: now,
        device: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 40) : 'web',
      };

      const stateDocRef = doc(firestore, 'users', userId, 'state', 'current_workout');
      await setDoc(stateDocRef, payload, { merge: true });
      this.setLocalTimestamp(STORAGE_KEY_LOCAL_STATE_TIMESTAMP, now);
      this.setStatus('synced');
    } catch (err) {
      console.error('[FirestoreSync] Failed to push workout state to cloud:', err);
      this.setStatus('error');
    }
  }

  /**
   * Subscribes to real-time changes to the user's mobility history in Firestore.
   */
  public subscribeToMobilityHistory(
    userId: string,
    onRemoteUpdate: (entries: MobilityEntry[]) => void
  ): Unsubscribe {
    return this.subscribeWhenReady(userId, ({ doc, onSnapshot }, firestore) => {
      const mobilityDocRef = doc(firestore, 'users', userId, 'mobility', 'history');

      return onSnapshot(
        mobilityDocRef,
        (snapshot) => {
          if (!snapshot.exists()) return;
          const data = snapshot.data() as MobilityHistorySyncPayload;
          if (!data || !data.updatedAt || !Array.isArray(data.entries)) return;

          const localTimestamp = this.getLocalTimestamp(STORAGE_KEY_LOCAL_MOBILITY_TIMESTAMP);
          if (data.updatedAt > localTimestamp) {
            this.setLocalTimestamp(STORAGE_KEY_LOCAL_MOBILITY_TIMESTAMP, data.updatedAt);
            onRemoteUpdate(data.entries);
            this.setStatus('synced');
          }
        },
        (error) => {
          console.warn('[FirestoreSync] Real-time mobility listener error:', error);
          this.setStatus('offline');
        }
      );
    });
  }

  /**
   * Debounced push of mobility history to Cloud Firestore.
   */
  public syncMobilityHistory(userId: string, entries: MobilityEntry[]): void {
    if (!userId || isTestEnvironment() || !isFirebaseConfigured()) return;

    if (this.mobilityDebounceTimer) {
      clearTimeout(this.mobilityDebounceTimer);
    }

    this.setStatus('syncing');

    this.mobilityDebounceTimer = setTimeout(async () => {
      await this.pushMobilityHistoryImmediate(userId, entries);
    }, 500);
  }

  /**
   * Immediate write of mobility history to Cloud Firestore.
   */
  public async pushMobilityHistoryImmediate(userId: string, entries: MobilityEntry[]): Promise<void> {
    const firestore = await getFirebaseDb();
    if (!firestore || !userId || isTestEnvironment()) {
      this.setStatus('idle');
      return;
    }

    try {
      this.setStatus('syncing');
      const { doc, setDoc } = await loadFirestoreModule();
      const now = Date.now();
      const payload: MobilityHistorySyncPayload = {
        entries,
        updatedAt: now,
      };

      const mobilityDocRef = doc(firestore, 'users', userId, 'mobility', 'history');
      await setDoc(mobilityDocRef, payload, { merge: true });
      this.setLocalTimestamp(STORAGE_KEY_LOCAL_MOBILITY_TIMESTAMP, now);
      this.setStatus('synced');
    } catch (err) {
      console.error('[FirestoreSync] Failed to push mobility history to cloud:', err);
      this.setStatus('error');
    }
  }

  private getLocalTimestamp(key: string): number {
    try {
      const stored = localStorage.getItem(key);
      return stored ? parseInt(stored, 10) || 0 : 0;
    } catch {
      return 0;
    }
  }

  private setLocalTimestamp(key: string, timestamp: number): void {
    try {
      localStorage.setItem(key, String(timestamp));
    } catch {
      // ignore
    }
  }
}

export const firestoreSyncService = new FirestoreSyncService();
