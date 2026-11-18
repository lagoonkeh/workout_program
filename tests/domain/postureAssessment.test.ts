import { beforeEach, describe, expect, it } from 'vitest';
import {
  POSTURE_TESTS,
  STORAGE_KEY_POSTURE,
  compareRecords,
  dayType,
  failedTests,
  isRecordComplete,
  loadPostureState,
  passCount,
  planDayNumber,
  replacePostureState,
  routineForDay,
  sanitizePostureState,
  saveAssessment,
  toggleDayComplete,
  type PostureTestResults,
} from '../../src/domain/postureAssessment';
import { collectAppBackup, applyAppBackup, isLocalDataPristine } from '../../src/services/appBackupService';
import { STORAGE_KEY_APP_DATA_MODIFIED } from '../../src/storage/appDataClock';

function allPass(): PostureTestResults {
  const r: PostureTestResults = {};
  for (const t of POSTURE_TESTS) r[t.id] = t.perSide ? { left: 'pass', right: 'pass' } : { both: 'pass' };
  return r;
}

describe('postureAssessment', () => {
  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY_POSTURE);
    localStorage.removeItem(STORAGE_KEY_APP_DATA_MODIFIED);
  });

  it('has the six areas from the video', () => {
    expect(POSTURE_TESTS.map((t) => t.id)).toEqual(['thoracic', 'hamstrings', 'calves', 'abs', 'hipFlexors', 'hipRotation']);
  });

  it('lays out day 1 test, alternating stretch/strength days, day 22 retest', () => {
    expect(dayType(1)).toBe('test');
    expect(dayType(2)).toBe('stretch');
    expect(dayType(3)).toBe('strength');
    expect(dayType(21)).toBe('strength');
    expect(dayType(22)).toBe('retest');
    const types = Array.from({ length: 20 }, (_, i) => dayType(i + 2));
    expect(types.filter((t) => t === 'stretch')).toHaveLength(10);
    expect(types.filter((t) => t === 'strength')).toHaveLength(10);
  });

  it('counts plan days from the local start date', () => {
    expect(planDayNumber('2026-11-17', new Date(2026, 10, 17, 23, 30))).toBe(1);
    expect(planDayNumber('2026-11-17', new Date(2026, 11, 8, 6))).toBe(22);
  });

  it('needs every side marked before a test is complete', () => {
    const r = allPass();
    expect(isRecordComplete(r)).toBe(true);
    delete r.calves!.left;
    expect(isRecordComplete(r)).toBe(false);
  });

  it('only prescribes corrections for failed tests, on the failed side', () => {
    const r = allPass();
    r.hipFlexors = { left: 'fail', right: 'pass' };
    r.thoracic = { both: 'fail' };
    expect(failedTests(r)).toEqual(['thoracic', 'hipFlexors']);
    expect(passCount(r)).toBe(4);

    const stretch = routineForDay(r, 2);
    expect(stretch.map((i) => i.prescription.name)).toEqual(['Kneeling T-spine stretch', 'Lunge and reach stretch']);
    expect(stretch[1].sides).toEqual(['left']);

    const strength = routineForDay(r, 3);
    expect(strength.map((i) => i.prescription.name)).toEqual(['Face pulls (band or bodyweight)', 'Glute bridge heel taps']);
    expect(routineForDay(r, 1)).toEqual([]);
    expect(routineForDay(r, 22)).toEqual([]);
  });

  it('does banded toe pulls only every other strengthening day', () => {
    const r = allPass();
    r.calves = { left: 'fail', right: 'fail' };
    const has = (day: number) => routineForDay(r, day).some((i) => i.prescription.name === 'Banded toe pulls');
    expect([3, 5, 7, 9].map(has)).toEqual([true, false, true, false]);
  });

  it('compares baseline and retest', () => {
    const before = allPass();
    before.abs = { both: 'fail' };
    before.calves = { left: 'fail', right: 'pass' };
    const after = allPass();
    after.calves = { left: 'fail', right: 'pass' };
    const byId = Object.fromEntries(compareRecords(before, after).map((c) => [c.testId, c.change]));
    expect(byId.abs).toBe('fixed');
    expect(byId.calves).toBe('still-failing');
    expect(byId.thoracic).toBe('held');
  });

  it('saves a baseline, starts the plan, tracks days and persists', () => {
    const r = allPass();
    r.abs = { both: 'fail' };
    let s = saveAssessment(loadPostureState(), r, 'baseline', new Date(2026, 10, 17));
    expect(s.plan).toEqual({ startDate: '2026-11-17', baselineId: s.records[0].id, completedDays: [1] });
    s = toggleDayComplete(s, 2);
    expect(loadPostureState().plan?.completedDays).toEqual([1, 2]);
    s = saveAssessment(s, allPass(), 'retest', new Date(2026, 11, 8));
    expect(s.records).toHaveLength(2);
    expect(s.plan?.completedDays).toContain(22);
  });

  it('drops junk when sanitizing', () => {
    const s = sanitizePostureState({
      records: [{ id: 'a', date: '2026-01-01', kind: 'x', results: { abs: { both: 'maybe' }, bogus: { both: 'pass' }, calves: { left: 'fail' } } }, null],
      plan: { startDate: '2026-01-01', baselineId: 'a', completedDays: [1, 1, 40, 2.5, 3] },
    });
    expect(s.records[0].kind).toBe('baseline');
    expect(s.records[0].results).toEqual({ abs: {}, calves: { left: 'fail' } });
    expect(s.plan?.completedDays).toEqual([1, 3]);
  });

  it('is backed up to Drive and restored', () => {
    expect(isLocalDataPristine()).toBe(true);
    saveAssessment(loadPostureState(), allPass(), 'baseline', new Date(2026, 10, 17));
    expect(isLocalDataPristine()).toBe(false);
    const backup = collectAppBackup();
    expect(backup.posture?.records).toHaveLength(1);

    replacePostureState({ records: [], plan: null });
    expect(loadPostureState().records).toHaveLength(0);
    applyAppBackup(backup);
    expect(loadPostureState().records).toHaveLength(1);
    expect(loadPostureState().plan?.startDate).toBe('2026-11-17');
  });
});
