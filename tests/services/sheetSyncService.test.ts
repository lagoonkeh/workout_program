// tests/services/sheetSyncService.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  buildSyncPayload,
  syncToGoogleSheets,
  scanLastWorkout,
  fetchWorkoutHistoryFromSheets,
  clearRemoteWorkoutHistory,
  parseSetRatings,
  toLocalDateStr,
  STORAGE_KEY_LAST_SYNC,
  STORAGE_KEY_LAST_SCANNED_WORKOUT,
  STORAGE_KEY_HISTORY_REPAIR,
} from '../../src/services/sheetSyncService';
import { storageManager } from '../../src/storage/storageManager';
import { SetLogRecord } from '../../src/components/ExerciseCard';
import { MobilityEntry } from '../../src/domain/mobility';

describe('sheetSyncService', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('parseSetRatings', () => {
    it('extracts RPE and knee pain from quick-chip notes', () => {
      expect(parseSetRatings('@RPE 8, Knee Pain 2/10')).toEqual({ rpe: 8, kneePain: 2 });
      expect(parseSetRatings('Pain-Free 0/10')).toEqual({ rpe: 0, kneePain: 0 });
      expect(parseSetRatings('@RPE 9.5')).toEqual({ rpe: 9.5, kneePain: 0 });
      expect(parseSetRatings('')).toEqual({ rpe: 0, kneePain: 0 });
    });

    it('keeps the highest pain rating when several are present', () => {
      expect(parseSetRatings('Pain-Free 0/10 then Knee Pain 3/10')).toEqual({ rpe: 0, kneePain: 3 });
    });
  });

  describe('buildSyncPayload dates and ratings', () => {
    it('does not turn live set logs into workout rows (finished workouts are pushed separately)', () => {
      const loggedAt = new Date(2026, 9, 27, 21, 30).toISOString();
      const payload = buildSyncPayload('lower_a', {
        t1_bb_squat: [
          { setNumber: 1, targetReps: '3', weightLbs: 225, repsAchieved: 3, isCompleted: true, notes: '@RPE 8, Knee Pain 2/10', loggedAt },
        ],
      }, []);
      expect(payload.workoutLogs).toEqual([]);
    });

    it('formats dates in local time', () => {
      expect(toLocalDateStr(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    });
  });

  describe('buildSyncPayload', () => {
    it('carries mobility entries and the app backup, but no workout rows from live logs', () => {
      const mockLogs: Record<string, SetLogRecord[]> = {
        t1_bb_squat: [{ setNumber: 1, targetReps: '3', weightLbs: 225, repsAchieved: 3, isCompleted: true, notes: 'Felt light' }],
      };
      const mockMobility: MobilityEntry[] = [{ testId: 'knee-to-wall', value: 4.8, side: 'left', notes: 'Great dorsiflexion' }];
      const payload = buildSyncPayload('lower_a', mockLogs, mockMobility);
      expect(payload.activeSessionId).toBe('lower_a');
      expect(payload.workoutLogs).toEqual([]);
      expect(payload.mobilityEntries).toHaveLength(1);
      expect(payload.mobilityEntries[0].value).toBe(4.8);
    });

    it('handles empty inputs safely without throwing', () => {
      const payload = buildSyncPayload('upper_a', {}, []);
      expect(payload.workoutLogs).toEqual([]);
      expect(payload.mobilityEntries).toEqual([]);
    });
  });

  describe('syncToGoogleSheets', () => {
    it('successfully posts payload to /api/sync and records timestamp', async () => {
      const mockPayload = {
        activeSessionId: 'lower_a',
        workoutLogs: [],
        mobilityEntries: [],
      };

      const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          syncedWorkouts: 4,
          syncedMobility: 2,
          timestamp: '2026-10-14T05:50:00.000Z',
        }),
      } as Response);

      const result = await syncToGoogleSheets(mockPayload);

      expect(fetchMock).toHaveBeenCalledWith('/api/sync', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }));

      expect(result.success).toBe(true);
      expect(result.syncedWorkouts).toBe(4);
      expect(result.syncedMobility).toBe(2);
      expect(localStorage.getItem(STORAGE_KEY_LAST_SYNC)).toBe('2026-10-14T05:50:00.000Z');
    });

    it('returns structured failure when API returns error status', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 502,
        json: async () => ({ error: 'Google Sheets API quota exceeded' }),
      } as Response);

      const result = await syncToGoogleSheets({
        activeSessionId: 'lower_a',
        workoutLogs: [],
        mobilityEntries: [],
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Google Sheets API quota exceeded');
    });

    it('handles network disconnection gracefully', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Failed to fetch (offline)'));

      const result = await syncToGoogleSheets({
        activeSessionId: 'lower_a',
        workoutLogs: [],
        mobilityEntries: [],
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to fetch (offline)');
    });

    it('accurately builds and syncs a 100% completed workout session payload', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          syncedWorkouts: 5,
          syncedMobility: 0,
          timestamp: '2026-10-21T18:25:00.000Z',
        }),
      } as Response);

      const completedWorkoutLogs = {
        t1_bb_squat: [
          { setNumber: 1, targetReps: '3', weightLbs: 185, repsAchieved: 3, isCompleted: true, notes: 'Felt strong' },
          { setNumber: 2, targetReps: '3', weightLbs: 185, repsAchieved: 3, isCompleted: true, notes: '' },
        ],
      };

      const payload = buildSyncPayload('lower_a', completedWorkoutLogs, []);
      // workout rows come from finished workouts (pushWorkoutsToSheets), not from live logs
      expect(payload.workoutLogs).toEqual([]);

      const result = await syncToGoogleSheets(payload);
      expect(result.success).toBe(true);
      expect(result.syncedWorkouts).toBe(5);
    });
  });

  describe('scanLastWorkout', () => {
    it('scans last recorded workout from /api/sync and suggests the next session in 4-day rotation', async () => {
      localStorage.setItem(STORAGE_KEY_HISTORY_REPAIR, 'done');
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'ok',
          lastWorkout: {
            date: '2026-10-20',
            sessionTitle: 'Lower A - Quad & Knee Bulletproofing',
            exercises: ['Barbell Back Squat', 'ATG Split Squat'],
            completedSets: 8,
            totalVolumeLbs: 6400,
            maxKneePain: 1,
            notes: 'Felt great',
          },
          suggestedNextSession: {
            id: 'upper_a',
            title: 'Upper A (Horizontal Push/Pull & Shoulder Health)',
          },
        }),
      } as Response);

      const scanResult = await scanLastWorkout();

      expect(scanResult.lastWorkout).not.toBeNull();
      expect(scanResult.lastWorkout?.date).toBe('2026-10-20');
      expect(scanResult.lastWorkout?.sessionTitle).toContain('Lower A');
      expect(scanResult.suggestedNextSession.id).toBe('upper_a');
      expect(scanResult.source).toBe('google_sheets');
      expect(localStorage.getItem(STORAGE_KEY_LAST_SCANNED_WORKOUT)).toContain('2026-10-20');
    });

    it('falls back seamlessly to local storage when remote sync is unavailable', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'));

      localStorage.setItem(
        STORAGE_KEY_LAST_SCANNED_WORKOUT,
        JSON.stringify({
          lastWorkout: {
            date: '2026-10-19',
            sessionTitle: 'Upper A (Horizontal Push/Pull)',
            exercises: ['Barbell Bench Press'],
            completedSets: 6,
            totalVolumeLbs: 4500,
          },
          suggestedNextSession: {
            id: 'lower_b',
            title: 'Lower B (Posterior Chain & Hamstring Restoration)',
          },
          source: 'local_storage',
        })
      );

      const scanResult = await scanLastWorkout();
      expect(scanResult.lastWorkout?.date).toBe('2026-10-19');
      expect(scanResult.suggestedNextSession.id).toBe('lower_b');
      expect(scanResult.source).toBe('local_storage');
    });

    it('provides safe default (Lower A) if no prior workout history exists', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'ok',
          lastWorkout: null,
          suggestedNextSession: { id: 'lower_a', title: 'Lower A (Quad & Knee Bulletproofing)' },
        }),
      } as Response);

      const scanResult = await scanLastWorkout();
      expect(scanResult.lastWorkout).toBeNull();
      expect(scanResult.suggestedNextSession.id).toBe('lower_a');
    });

    it('auto-seeds completed workouts into storageManager when allWorkouts are in scan response', async () => {
      localStorage.setItem(STORAGE_KEY_HISTORY_REPAIR, 'done');
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'ok',
          lastWorkout: {
            date: '2026-10-22',
            sessionTitle: 'Upper B (Vertical Push/Pull & Functional Calisthenics)',
            exercises: ['Weighted Pull-Up'],
            completedSets: 4,
            totalVolumeLbs: 3200,
          },
          allWorkouts: [
            {
              id: 'sheet_2026-10-22_upper_b',
              date: '2026-10-22T12:00:00.000Z',
              sessionId: 'upper_b',
              sessionTitle: 'Upper B (Vertical Push/Pull & Functional Calisthenics)',
              totalVolumeLbs: 3200,
              completedExercisesCount: 1,
              totalExercisesCount: 1,
              adherencePercentage: 100,
              logs: {},
            },
          ],
        }),
      } as Response);

      await scanLastWorkout();
      const records = storageManager.getCompletedWorkouts();
      expect(records['sheet_2026-10-22_upper_b']).toBeDefined();
      expect(records['sheet_2026-10-22_upper_b'].sessionId).toBe('upper_b');
    });
  });

  describe('fetchWorkoutHistoryFromSheets', () => {
    it('fetches full workout history from Google Sheets and saves sessions into storageManager', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'ok',
          allWorkouts: [
            {
              id: 'sheet_2026-10-14_lower_a',
              date: '2026-10-14T10:00:00.000Z',
              sessionId: 'lower_a',
              sessionTitle: 'Lower A (Quad & Knee Bulletproofing)',
              totalVolumeLbs: 12000,
              completedExercisesCount: 5,
              totalExercisesCount: 5,
              adherencePercentage: 100,
              notes: 'Felt great',
              logs: {
                t1_bb_squat: [{ isCompleted: true, weightLbs: 225, repsAchieved: 5 }],
              },
            },
            {
              id: 'sheet_2026-10-16_upper_a',
              date: '2026-10-16T10:00:00.000Z',
              sessionId: 'upper_a',
              sessionTitle: 'Upper A (Horizontal Push/Pull)',
              totalVolumeLbs: 9500,
              completedExercisesCount: 4,
              totalExercisesCount: 4,
              adherencePercentage: 100,
              notes: '',
              logs: {},
            },
          ],
        }),
      } as Response);

      const res = await fetchWorkoutHistoryFromSheets();
      expect(res.success).toBe(true);
      expect(res.importedCount).toBe(2);
      expect(res.totalAvailable).toBe(2);

      const saved = storageManager.getCompletedWorkouts();
      expect(saved['sheet_2026-10-14_lower_a']).toBeDefined();
      expect(saved['sheet_2026-10-14_lower_a'].totalVolumeLbs).toBe(12000);
      expect(saved['sheet_2026-10-16_upper_a']).toBeDefined();
      expect(saved['sheet_2026-10-16_upper_a'].totalVolumeLbs).toBe(9500);
    });

    it('handles 401 unauthenticated with informative message', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 401,
      } as Response);

      const res = await fetchWorkoutHistoryFromSheets();
      expect(res.success).toBe(false);
      expect(res.message).toContain('Sign-in required');
    });

    it('handles empty Google Sheets history gracefully', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'ok',
          allWorkouts: [],
        }),
      } as Response);

      const res = await fetchWorkoutHistoryFromSheets();
      expect(res.success).toBe(true);
      expect(res.importedCount).toBe(0);
      expect(res.message).toContain('No previous workout logs found');
    });
  });

  describe('clearRemoteWorkoutHistory', () => {
    it('sends clear-history action to /api/sync and returns success', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'ok',
          message: 'Workout history cleared from Google Sheets.',
        }),
      } as Response);

      const res = await clearRemoteWorkoutHistory();
      expect(res.success).toBe(true);
      expect(res.message).toContain('Workout history cleared');
    });

    it('handles remote clearing failure gracefully', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

      const res = await clearRemoteWorkoutHistory();
      expect(res.success).toBe(false);
      expect(res.message).toContain('HTTP 500');
    });
  });
});
