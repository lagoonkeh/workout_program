import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/services/firebaseAuth', () => ({
  getIdToken: vi.fn(async () => 'token-123'),
}));

import {
  applyAppBackup,
  collectAppBackup,
  isLocalDataPristine,
  restoreAppBackupIfNewer,
  startAppBackupAutoSync,
  BACKUP_DEBOUNCE_MS,
  type AppBackup,
} from '../../src/services/appBackupService';
import { getIdToken } from '../../src/services/firebaseAuth';
import { loadProfile, saveProfile, addWeighIn, DEFAULT_PROFILE } from '../../src/domain/athleteProfile';
import { loadQuarterlyAssessments } from '../../src/domain/fitnessAssessment';
import { getAppDataModifiedAt, setAppDataModifiedAt, touchAppData } from '../../src/storage/appDataClock';

const remoteBackup = (savedAt: string, lbs = 181): AppBackup => ({
  version: 1,
  savedAt,
  profile: { ...DEFAULT_PROFILE, weighIns: [{ id: 'w1', date: '2026-10-01', lbs }] },
  assessments: [],
});

const mockFetch = (backup: AppBackup | null, ok = true) => {
  const fn = vi.fn(async () => ({ ok, json: async () => ({ status: 'success', backup }) }));
  vi.stubGlobal('fetch', fn);
  return fn;
};

describe('appBackupService', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
    vi.mocked(getIdToken).mockResolvedValue('token-123');
  });

  it('a fresh device is pristine; a weigh-in makes it not', () => {
    expect(isLocalDataPristine()).toBe(true);
    saveProfile(addWeighIn(loadProfile(), 175, '2026-10-20')!);
    expect(isLocalDataPristine()).toBe(false);
    expect(getAppDataModifiedAt()).not.toBeNull();
  });

  it('restores the Drive copy onto a fresh device', async () => {
    mockFetch(remoteBackup('2026-10-25T10:00:00.000Z'));
    const push = vi.fn(async () => true);
    expect(await restoreAppBackupIfNewer(push)).toBe('restored');
    expect(loadProfile().weighIns).toHaveLength(1);
    expect(loadProfile().weighIns[0].lbs).toBe(181);
    expect(getAppDataModifiedAt()).toBe('2026-10-25T10:00:00.000Z');
    expect(push).not.toHaveBeenCalled();
  });

  it('restores when the Drive copy is newer than local edits', async () => {
    saveProfile(addWeighIn(loadProfile(), 170, '2026-09-01')!);
    setAppDataModifiedAt('2026-09-01T00:00:00.000Z');
    mockFetch(remoteBackup('2026-10-25T10:00:00.000Z'));
    expect(await restoreAppBackupIfNewer(vi.fn(async () => true))).toBe('restored');
    expect(loadProfile().weighIns.map((w) => w.lbs)).toEqual([181]);
  });

  it('pushes instead when this device is newer, and never overwrites it', async () => {
    saveProfile(addWeighIn(loadProfile(), 170, '2026-10-29')!);
    setAppDataModifiedAt('2026-10-29T00:00:00.000Z');
    mockFetch(remoteBackup('2026-10-01T00:00:00.000Z'));
    const push = vi.fn(async () => true);
    expect(await restoreAppBackupIfNewer(push)).toBe('backed-up');
    expect(push).toHaveBeenCalledTimes(1);
    expect(loadProfile().weighIns.map((w) => w.lbs)).toEqual([170]);
  });

  it('backs up local data when Drive has no backup yet', async () => {
    saveProfile(addWeighIn(loadProfile(), 170, '2026-10-29')!);
    mockFetch(null);
    const push = vi.fn(async () => true);
    expect(await restoreAppBackupIfNewer(push)).toBe('backed-up');
  });

  it('does nothing when signed out or the server is unreachable', async () => {
    vi.mocked(getIdToken).mockResolvedValueOnce(null as unknown as string);
    const f = mockFetch(remoteBackup('2026-10-25T10:00:00.000Z'));
    expect(await restoreAppBackupIfNewer(vi.fn())).toBe('unavailable');
    expect(f).not.toHaveBeenCalled();
    mockFetch(null, false);
    expect(await restoreAppBackupIfNewer(vi.fn())).toBe('unavailable');
  });

  it('applyAppBackup writes both stores and the timestamp', () => {
    const b = remoteBackup('2026-10-25T10:00:00.000Z');
    b.assessments = [{ ...loadQuarterlyAssessments()[0], id: 'q_test', date: '2026-10-02' }];
    applyAppBackup(b);
    expect(loadQuarterlyAssessments().some((a) => a.id === 'q_test')).toBe(true);
    expect(collectAppBackup().savedAt).toBe('2026-10-25T10:00:00.000Z');
  });

  it('auto-sync pushes once, a few seconds after a burst of edits', () => {
    vi.useFakeTimers();
    const push = vi.fn(async () => true);
    const stop = startAppBackupAutoSync(push);
    touchAppData();
    touchAppData();
    vi.advanceTimersByTime(BACKUP_DEBOUNCE_MS - 1);
    expect(push).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(push).toHaveBeenCalledTimes(1);
    stop();
    touchAppData();
    vi.advanceTimersByTime(BACKUP_DEBOUNCE_MS * 2);
    expect(push).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
