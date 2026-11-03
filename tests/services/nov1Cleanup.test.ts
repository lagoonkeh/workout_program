// tests/services/nov1Cleanup.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { storageManager } from '../../src/storage/storageManager';
import { removeNov1PhantomsOnce } from '../../src/services/historyRepair';
import { ownWorkoutLogs } from '../../src/domain/historyEdit';

const at = (d: number, h: number) => new Date(2026, 10, d, h, 0, 0).toISOString();
const sets = (n: number) => Array.from({ length: n }, () => ({ isCompleted: true, weightLbs: 100, repsAchieved: 5 }));
const save = (id: string, sessionId: string, when: string, n: number) =>
  storageManager.saveCompletedWorkout({ id, sessionId, date: when, completedAt: when, logs: { t1_bb_bench: sets(n) } } as any);

describe('Nov 1 phantom clean-up', () => {
  beforeEach(() => {
    localStorage.clear();
    storageManager.clear();
  });

  it('keeps only the most complete Upper A on Nov 1 and leaves other days alone', () => {
    save('lb', 'lower_b', at(1, 18), 20);
    save('la', 'lower_a', at(1, 19), 20);
    save('ua1', 'upper_a', at(1, 20), 10);
    save('ua2', 'upper_a', at(1, 23), 18);
    save('oct', 'lower_a', at(0, 18), 20); // Oct 31: untouched
    save('nov2', 'lower_b', at(2, 18), 20); // Nov 2: untouched

    expect(removeNov1PhantomsOnce().sort()).toEqual(['la', 'lb', 'ua1']);
    expect(Object.keys(storageManager.getCompletedWorkouts()).sort()).toEqual(['nov2', 'oct', 'ua2']);
    // runs once only
    save('again', 'lower_a', at(1, 21), 5);
    expect(removeNov1PhantomsOnce()).toEqual([]);
  });

  it('shows the retired Meadows Row only under Upper A', () => {
    const logs = { t2_landmine_meadows_row: sets(3), t1_bb_rdl: sets(5) };
    expect(Object.keys(ownWorkoutLogs({ sessionId: 'lower_b', logs }))).toEqual(['t1_bb_rdl']);
    expect(Object.keys(ownWorkoutLogs({ sessionId: 'upper_a', logs }))).toContain('t2_landmine_meadows_row');
  });
});

describe('Meadows Row ? Single-Arm Kettlebell Row', () => {
  beforeEach(() => {
    localStorage.clear();
    storageManager.clear();
  });

  it('turns Meadows Row sets into Kettlebell Row sets and clears them from the current workout', async () => {
    const { migrateMeadowsRowOnce } = await import('../../src/services/historyRepair');
    storageManager.saveCompletedWorkout({ id: 'a', sessionId: 'upper_a', date: at(1, 20), logs: { t2_landmine_meadows_row: sets(3), t1_bb_bench: sets(5) } } as any);
    storageManager.saveCompletedWorkout({ id: 'b', sessionId: 'upper_a', date: at(1, 23), logs: { t2_landmine_meadows_row: sets(3), t2_kb_single_arm_row: sets(2) } } as any);
    localStorage.setItem('workout_app_set_logs_v1', JSON.stringify({ t2_landmine_meadows_row__side_left: sets(1), t1_bb_bench: sets(1) }));

    expect(migrateMeadowsRowOnce()).toBe(2);
    const all = storageManager.getCompletedWorkouts() as any;
    expect(Object.keys(all.a.logs).sort()).toEqual(['t1_bb_bench', 't2_kb_single_arm_row']);
    expect(all.a.logs.t2_kb_single_arm_row).toHaveLength(3);
    expect(Object.keys(all.b.logs)).toEqual(['t2_kb_single_arm_row']);
    expect(all.b.logs.t2_kb_single_arm_row).toHaveLength(2); // existing KB row sets kept
    expect(Object.keys(JSON.parse(localStorage.getItem('workout_app_set_logs_v1')!))).toEqual(['t1_bb_bench']);
  });
});
