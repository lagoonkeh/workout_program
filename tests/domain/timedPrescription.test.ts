import { describe, it, expect } from 'vitest';
import { WORKOUT_PROGRAM, getEffectiveExerciseTempo, isTimedPrescription } from '../../src/domain/programData';

const timed = (id: string) => {
  for (const s of Object.values(WORKOUT_PROGRAM)) {
    const e = [...s.exercises, ...(s.dailyCoreFinisher || [])].find((x) => x.id === id);
    if (e) return isTimedPrescription(e.targetReps, getEffectiveExerciseTempo(e.tempo, e.targetReps));
  }
  throw new Error(id);
};

describe('which exercises get a timer', () => {
  it('barbell and other rep-based lifts get none', () => {
    for (const id of ['t1_bb_squat', 't1_bb_bench_press', 't1_bb_rdl', 't1_bb_ohp', 't2_kb_single_arm_row', 't3_kb_floor_press_er']) {
      expect(timed(id), id).toBe(false);
    }
  });

  it('holds, planks, hangs and timed sets keep theirs', () => {
    for (const id of ['t3_mcgill_big_3', 't3_biering_sorensen', 't3_athlean_serratus_plank', 't3_dead_hang_club_mills', 't3_loaded_horse_stance', 't1_run_zone2']) {
      expect(timed(id), id).toBe(true);
    }
  });

  it('a hold inside each rep is a cue, not a timed set', () => {
    expect(isTimedPrescription('10 reps (5s hold)', '1015')).toBe(false);
    expect(isTimedPrescription('8–10 pulses (30–45s)', '3112')).toBe(true);
    expect(isTimedPrescription('3', 'HOLD-30')).toBe(true);
  });
});
