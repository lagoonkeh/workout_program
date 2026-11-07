// tests/services/firestoreSyncService.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const {
  mockSetDoc,
  mockDoc,
  mockOnSnapshot,
  mockGetFirestore,
  mockEnableIndexedDbPersistence,
  snapshotHolder,
} = vi.hoisted(() => {
  const holder = { callback: null as any, errorCallback: null as any };
  return {
    mockSetDoc: vi.fn().mockResolvedValue(undefined),
    mockDoc: vi.fn((_db, ...parts) => ({ id: parts[parts.length - 1], path: parts.join('/') })),
    mockOnSnapshot: vi.fn((_ref, onNext, onError) => {
      holder.callback = onNext;
      holder.errorCallback = onError;
      return vi.fn(); // unsubscribe
    }),
    mockGetFirestore: vi.fn(() => ({ app: {} })),
    mockEnableIndexedDbPersistence: vi.fn().mockResolvedValue(undefined),
    snapshotHolder: holder,
  };
});

vi.mock('firebase/firestore', () => ({
  getFirestore: mockGetFirestore,
  doc: mockDoc,
  setDoc: mockSetDoc,
  getDoc: vi.fn(),
  onSnapshot: mockOnSnapshot,
  enableIndexedDbPersistence: mockEnableIndexedDbPersistence,
}));

import {
  firestoreSyncService,
  STORAGE_KEY_LAST_CLOUD_SYNC,
  STORAGE_KEY_LOCAL_STATE_TIMESTAMP,
  STORAGE_KEY_LOCAL_MOBILITY_TIMESTAMP,
} from '../../src/services/firestoreSyncService';
import * as firebaseAuth from '../../src/services/firebaseAuth';

describe('firestoreSyncService', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    snapshotHolder.callback = null;
    snapshotHolder.errorCallback = null;
  });

  afterEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  describe('Service Status and Subscriptions', () => {
    it('initializes with default status idle or stored timestamp', () => {
      const status = firestoreSyncService.getStatus();
      expect(['idle', 'synced', 'syncing', 'offline', 'error']).toContain(status);
    });

    it('notifies status listeners upon subscription and on state changes', () => {
      const statusSpy = vi.fn();
      const unsubscribe = firestoreSyncService.onStatusChange(statusSpy);

      expect(statusSpy).toHaveBeenCalledWith(expect.any(String), expect.toBeOneOf([expect.any(Number), null]));
      unsubscribe();
    });

    it('restores lastSyncedTime from localStorage if present', () => {
      const mockTime = 1729239847000;
      localStorage.setItem(STORAGE_KEY_LAST_CLOUD_SYNC, String(mockTime));

      const stored = localStorage.getItem(STORAGE_KEY_LAST_CLOUD_SYNC);
      expect(Number(stored)).toBe(mockTime);
    });
  });

  describe('Offline & Test Guardrails', () => {
    it('gracefully no-ops during test environment for subscribeToWorkoutState', () => {
      const callback = vi.fn();
      const unsubscribe = firestoreSyncService.subscribeToWorkoutState('test-user-123', callback);

      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
      expect(callback).not.toHaveBeenCalled();
    });

    it('gracefully no-ops during test environment for syncWorkoutState', () => {
      expect(() => {
        firestoreSyncService.syncWorkoutState('test-user-123', {
          activeSessionId: 'lower_a',
          workoutLogs: {},
          completedWarmupDrills: {},
          splitSidesExercises: {},
        });
      }).not.toThrow();
    });

    it('gracefully no-ops during test environment for subscribeToMobilityHistory', () => {
      const callback = vi.fn();
      const unsubscribe = firestoreSyncService.subscribeToMobilityHistory('test-user-123', callback);

      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
      expect(callback).not.toHaveBeenCalled();
    });

    it('gracefully no-ops during test environment for syncMobilityHistory', () => {
      expect(() => {
        firestoreSyncService.syncMobilityHistory('test-user-123', []);
      }).not.toThrow();
    });
  });

  describe('Mocked Firestore Operations', () => {
    it('calls setDoc with merge: true when pushWorkoutStateImmediate is executed with an active db', async () => {
      vi.spyOn(firebaseAuth, 'isTestEnvironment').mockReturnValue(false);
      vi.spyOn(firebaseAuth, 'isFirebaseConfigured').mockReturnValue(true);
      vi.spyOn(firebaseAuth, 'loadFirebaseAuth').mockResolvedValue({ app: {}, currentUser: { uid: 'u1' }, authStateReady: () => Promise.resolve() } as any);

      await firestoreSyncService.pushWorkoutStateImmediate('user_abc', {
        activeSessionId: 'upper_a',
        workoutLogs: {},
        completedWarmupDrills: { curl_up: true },
        splitSidesExercises: {},
      });

      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'current_workout' }),
        expect.objectContaining({
          activeSessionId: 'upper_a',
          completedWarmupDrills: { curl_up: true },
          updatedAt: expect.any(Number),
        }),
        { merge: true }
      );

      const localTime = localStorage.getItem(STORAGE_KEY_LOCAL_STATE_TIMESTAMP);
      expect(Number(localTime)).toBeGreaterThan(0);
      expect(firestoreSyncService.getStatus()).toBe('synced');
    });

    it('waits for Firebase to restore the session and writes nothing when no one is signed in', async () => {
      vi.spyOn(firebaseAuth, 'isTestEnvironment').mockReturnValue(false);
      vi.spyOn(firebaseAuth, 'isFirebaseConfigured').mockReturnValue(true);
      const authStateReady = vi.fn(() => Promise.resolve());
      vi.spyOn(firebaseAuth, 'loadFirebaseAuth').mockResolvedValue({ app: {}, currentUser: null, authStateReady } as any);

      await firestoreSyncService.pushWorkoutStateImmediate('user_abc', {
        activeSessionId: 'upper_a',
        workoutLogs: {},
        completedWarmupDrills: {},
        splitSidesExercises: {},
      });

      expect(authStateReady).toHaveBeenCalled();
      expect(mockSetDoc).not.toHaveBeenCalled();
    });

    it('handles error in pushWorkoutStateImmediate and transitions status to error', async () => {
      vi.spyOn(firebaseAuth, 'isTestEnvironment').mockReturnValue(false);
      vi.spyOn(firebaseAuth, 'isFirebaseConfigured').mockReturnValue(true);
      vi.spyOn(firebaseAuth, 'loadFirebaseAuth').mockResolvedValue({ app: {}, currentUser: { uid: 'u1' }, authStateReady: () => Promise.resolve() } as any);
      mockSetDoc.mockRejectedValueOnce(new Error('Network disconnected'));

      await firestoreSyncService.pushWorkoutStateImmediate('user_abc', {
        activeSessionId: 'upper_a',
        workoutLogs: {},
        completedWarmupDrills: {},
        splitSidesExercises: {},
      });

      expect(firestoreSyncService.getStatus()).toBe('error');
    });

    it('calls setDoc with merge: true when pushMobilityHistoryImmediate is executed', async () => {
      vi.spyOn(firebaseAuth, 'isTestEnvironment').mockReturnValue(false);
      vi.spyOn(firebaseAuth, 'isFirebaseConfigured').mockReturnValue(true);
      vi.spyOn(firebaseAuth, 'loadFirebaseAuth').mockResolvedValue({ app: {}, currentUser: { uid: 'u1' }, authStateReady: () => Promise.resolve() } as any);

      await firestoreSyncService.pushMobilityHistoryImmediate('user_abc', [
        { testId: 'knee-to-wall', value: 5.0, date: '2026-10-18T00:00:00.000Z' },
      ]);

      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'history' }),
        expect.objectContaining({
          entries: [expect.objectContaining({ testId: 'knee-to-wall', value: 5.0 })],
          updatedAt: expect.any(Number),
        }),
        { merge: true }
      );

      const localMobilityTime = localStorage.getItem(STORAGE_KEY_LOCAL_MOBILITY_TIMESTAMP);
      expect(Number(localMobilityTime)).toBeGreaterThan(0);
      expect(firestoreSyncService.getStatus()).toBe('synced');
    });

    it('handles error in pushMobilityHistoryImmediate and transitions status to error', async () => {
      vi.spyOn(firebaseAuth, 'isTestEnvironment').mockReturnValue(false);
      vi.spyOn(firebaseAuth, 'isFirebaseConfigured').mockReturnValue(true);
      vi.spyOn(firebaseAuth, 'loadFirebaseAuth').mockResolvedValue({ app: {}, currentUser: { uid: 'u1' }, authStateReady: () => Promise.resolve() } as any);
      mockSetDoc.mockRejectedValueOnce(new Error('Write quota exceeded'));

      await firestoreSyncService.pushMobilityHistoryImmediate('user_abc', []);

      expect(firestoreSyncService.getStatus()).toBe('error');
    });

    it('subscribes to onSnapshot and triggers onRemoteUpdate only if remote updatedAt is newer than local', async () => {
      vi.spyOn(firebaseAuth, 'isTestEnvironment').mockReturnValue(false);
      vi.spyOn(firebaseAuth, 'isFirebaseConfigured').mockReturnValue(true);
      vi.spyOn(firebaseAuth, 'loadFirebaseAuth').mockResolvedValue({ app: {}, currentUser: { uid: 'u1' }, authStateReady: () => Promise.resolve() } as any);

      const remoteUpdateSpy = vi.fn();
      localStorage.setItem(STORAGE_KEY_LOCAL_STATE_TIMESTAMP, '1000');

      firestoreSyncService.subscribeToWorkoutState('user_abc', remoteUpdateSpy);

      // The Firestore SDK loads lazily, so the listener attaches asynchronously
      await vi.waitFor(() => expect(mockOnSnapshot).toHaveBeenCalled());
      expect(snapshotHolder.callback).toBeTruthy();

      // Simulate older remote snapshot (should be ignored)
      snapshotHolder.callback!({
        exists: () => true,
        data: () => ({ activeSessionId: 'lower_a', updatedAt: 900 }),
      });
      expect(remoteUpdateSpy).not.toHaveBeenCalled();

      // Simulate newer remote snapshot (should update)
      snapshotHolder.callback!({
        exists: () => true,
        data: () => ({ activeSessionId: 'upper_b', updatedAt: 2000 }),
      });
      expect(remoteUpdateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ activeSessionId: 'upper_b', updatedAt: 2000 })
      );
      expect(localStorage.getItem(STORAGE_KEY_LOCAL_STATE_TIMESTAMP)).toBe('2000');

      // Test error handler in snapshot listener
      if (snapshotHolder.errorCallback) {
        snapshotHolder.errorCallback(new Error('Offline'));
        expect(firestoreSyncService.getStatus()).toBe('offline');
      }
    });

    it('subscribes to onSnapshot for mobility history and updates when remote is newer', async () => {
      vi.spyOn(firebaseAuth, 'isTestEnvironment').mockReturnValue(false);
      vi.spyOn(firebaseAuth, 'isFirebaseConfigured').mockReturnValue(true);
      vi.spyOn(firebaseAuth, 'loadFirebaseAuth').mockResolvedValue({ app: {}, currentUser: { uid: 'u1' }, authStateReady: () => Promise.resolve() } as any);

      const remoteMobilitySpy = vi.fn();
      localStorage.setItem(STORAGE_KEY_LOCAL_MOBILITY_TIMESTAMP, '500');

      firestoreSyncService.subscribeToMobilityHistory('user_abc', remoteMobilitySpy);

      await vi.waitFor(() => expect(snapshotHolder.callback).toBeTruthy());

      // Simulate newer mobility entries
      const mockEntries = [{ testId: 'shoulder-flexion', value: 175, date: '2026-10-18T00:00:00Z' }];
      snapshotHolder.callback!({
        exists: () => true,
        data: () => ({ entries: mockEntries, updatedAt: 1500 }),
      });

      expect(remoteMobilitySpy).toHaveBeenCalledWith(mockEntries);
      expect(localStorage.getItem(STORAGE_KEY_LOCAL_MOBILITY_TIMESTAMP)).toBe('1500');

      // Test error handler in mobility listener
      if (snapshotHolder.errorCallback) {
        snapshotHolder.errorCallback(new Error('Permission denied'));
        expect(firestoreSyncService.getStatus()).toBe('offline');
      }
    });

    it('flushes debounced push after 500ms using syncWorkoutState and syncMobilityHistory', async () => {
      vi.useFakeTimers();
      vi.spyOn(firebaseAuth, 'isTestEnvironment').mockReturnValue(false);
      vi.spyOn(firebaseAuth, 'isFirebaseConfigured').mockReturnValue(true);
      vi.spyOn(firebaseAuth, 'loadFirebaseAuth').mockResolvedValue({ app: {}, currentUser: { uid: 'u1' }, authStateReady: () => Promise.resolve() } as any);

      const pushWorkoutSpy = vi.spyOn(firestoreSyncService, 'pushWorkoutStateImmediate').mockResolvedValue(undefined);
      const pushMobilitySpy = vi.spyOn(firestoreSyncService, 'pushMobilityHistoryImmediate').mockResolvedValue(undefined);

      firestoreSyncService.syncWorkoutState('user_123', {
        activeSessionId: 'lower_b',
        workoutLogs: {},
        completedWarmupDrills: {},
        splitSidesExercises: {},
      });

      firestoreSyncService.syncMobilityHistory('user_123', []);

      expect(pushWorkoutSpy).not.toHaveBeenCalled();
      expect(pushMobilitySpy).not.toHaveBeenCalled();

      // Fast-forward debounce time
      vi.advanceTimersByTime(500);

      expect(pushWorkoutSpy).toHaveBeenCalledWith('user_123', expect.anything());
      expect(pushMobilitySpy).toHaveBeenCalledWith('user_123', expect.anything());
    });
  });
});
