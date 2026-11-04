import { describe, it, expect } from 'vitest';
import {
  EXERCISE_VARIATIONS,
  getExerciseVariations,
  getCycleVariation,
  variationToWorkoutExercise,
} from '../../src/domain/exerciseVariations';
import { WORKOUT_PROGRAM } from '../../src/domain/programData';

describe('Exercise Variations Domain & Science Validation', () => {
  it('every kettlebell variation adheres strictly to official Bowflex SelectTech 840 dial notches', () => {
    const validNotches = new Set([8, 12, 20, 25, 35, 40]);

    Object.values(EXERCISE_VARIATIONS).forEach((variations) => {
      variations.forEach((v) => {
        if (v.equipment === 'kettlebell' && v.defaultWeightLbs !== undefined) {
          expect(
            validNotches.has(v.defaultWeightLbs),
            `Kettlebell variation "${v.name}" (${v.id}) has invalid weight ${v.defaultWeightLbs} lbs; must be in [8, 12, 20, 25, 35, 40]`
          ).toBe(true);
        }
      });
    });
  });

  it('provides verified Cycle A and Cycle B variations for key Tier 1, 2, and 3 exercises across all 4 sessions', () => {
    const primarySlots = [
      't1_bb_squat',
      't2_atg_split_squat',
      't3_tibialis_wall_raise',
      't3_patrick_step_down',
      't1_bb_bench_press',
      't2_kb_single_arm_row',
      't3_athlean_face_pull',
      't1_bb_rdl',
      't2_kb_good_morning',
      't3_biering_sorensen',
      't1_bb_ohp',
      't2_pullup_ladders',
      't3_filly_kb_z_press',
    ];

    primarySlots.forEach((slotId) => {
      const vars = getExerciseVariations(slotId);
      expect(vars.length).toBeGreaterThanOrEqual(2);

      const cycleA = vars.find((v) => v.cycleAffiliation === 'A' || v.cycleAffiliation === 'Both');
      const cycleB = vars.find((v) => v.cycleAffiliation === 'B' || v.cycleAffiliation === 'Both');

      expect(cycleA, `Slot ${slotId} must have a Cycle A variation`).toBeDefined();
      expect(cycleB, `Slot ${slotId} must have a Cycle B variation`).toBeDefined();
      expect(cycleA?.scientificRationale.length).toBeGreaterThan(20);
      expect(cycleB?.scientificRationale.length).toBeGreaterThan(20);
    });
  });

  it('Tier 1 variations preserve GZCL compound specificity and high-tension pause/deficit mechanics', () => {
    const squatVars = getExerciseVariations('t1_bb_squat');
    const pauseSquat = squatVars.find((v) => v.id === 't1_bb_pause_squat');
    expect(pauseSquat).toBeDefined();
    expect(pauseSquat?.tempo).toBe('32X1');
    expect(pauseSquat?.targetSets).toBe(5);
    expect(pauseSquat?.equipment).toBe('barbell');

    const benchVars = getExerciseVariations('t1_bb_bench_press');
    const closeGrip = benchVars.find((v) => v.id === 't1_bb_close_grip_bench');
    expect(closeGrip).toBeDefined();
    expect(closeGrip?.targetSets).toBe(5);

    const rdlVars = getExerciseVariations('t1_bb_rdl');
    const deficitRdl = rdlVars.find((v) => v.id === 't1_bb_deficit_rdl');
    expect(deficitRdl).toBeDefined();
    expect(deficitRdl?.targetSets).toBe(5);

    const ohpVars = getExerciseVariations('t1_bb_ohp');
    const pinPress = ohpVars.find((v) => v.id === 't1_bb_overhead_pin_press');
    expect(pinPress).toBeDefined();
    expect(pinPress?.targetSets).toBe(5);
  });

  it('transforms base WorkoutExercise cleanly with variationToWorkoutExercise', () => {
    const baseEx = WORKOUT_PROGRAM.lower_a.exercises[0]; // t1_bb_squat
    const pauseSquatVar = getCycleVariation('t1_bb_squat', 'B')!;
    const adapted = variationToWorkoutExercise(pauseSquatVar, baseEx);

    expect(adapted.id).toBe(baseEx.id);
    expect(adapted.name).toBe('Barbell 2-Second Pause Squat');
    expect(adapted.tempo).toBe('32X1');
    expect(adapted.defaultWeightLbs).toBe(175);
    expect(adapted.tier).toBe('T1');
  });
});
