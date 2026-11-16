// tests/domain/exerciseMeta.test.ts
import { describe, it, expect } from 'vitest';
import {
  EXERCISE_META,
  getExerciseMeta,
  sideFactor,
  muscleWeightsOf,
  muscleIdForLabel,
} from '../../src/domain/exerciseMeta';
import { MUSCLE_GROUPS } from '../../src/domain/muscleHeatmap';

describe('exerciseMeta domain logic', () => {
  it('every muscle id in EXERCISE_META exists in MUSCLE_GROUPS and has no role duplication', () => {
    const validIds = new Set(MUSCLE_GROUPS.map((m) => m.id));

    Object.entries(EXERCISE_META).forEach(([exId, meta]) => {
      const allRoles = [...meta.primary, ...meta.secondary, ...meta.tertiary];
      
      // All muscle ids must exist in MUSCLE_GROUPS
      allRoles.forEach((mId) => {
        expect(validIds.has(mId), `Exercise ${exId} has invalid muscle id: ${mId}`).toBe(true);
      });

      // No exercise lists the same muscle in two roles
      const uniqueRoles = new Set(allRoles);
      expect(uniqueRoles.size, `Exercise ${exId} lists duplicate muscles across roles`).toBe(allRoles.length);
    });
  });

  it('getExerciseMeta ignores __side_left and __side_right suffixes', () => {
    const base = getExerciseMeta('t3_bulgarian_split_squat');
    const left = getExerciseMeta('t3_bulgarian_split_squat__side_left');
    const right = getExerciseMeta('t3_bulgarian_split_squat__side_right');
    expect(base).toBeDefined();
    expect(left).toEqual(base);
    expect(right).toEqual(base);
  });

  it('sideFactor returns 0.5 for split sides and 1 for normal exercises', () => {
    expect(sideFactor('t3_bulgarian_split_squat__side_left')).toBe(0.5);
    expect(sideFactor('t3_bulgarian_split_squat__side_right')).toBe(0.5);
    expect(sideFactor('t3_bulgarian_split_squat')).toBe(1);
  });

  it('muscleWeightsOf calculates correct fractional weights for deadlift', () => {
    const weights = muscleWeightsOf(EXERCISE_META.t1_deadlift);
    expect(weights).toEqual({
      hamstrings: 1,
      glutes: 1,
      lower_back: 0.5,
      lats: 0.25,
    });
  });

  it('muscleIdForLabel maps free-text labels to canonical muscle ids correctly', () => {
    expect(muscleIdForLabel('Lateral Deltoid')).toBe('shoulders');
    expect(muscleIdForLabel('Biceps Femoris')).toBe('hamstrings');
    expect(muscleIdForLabel('Lower Back')).toBe('lower_back');
    expect(muscleIdForLabel('Upper Back')).toBe('lats');
    expect(muscleIdForLabel('Calves')).toBe('calves');
    expect(muscleIdForLabel('Abs')).toBe('core');
    expect(muscleIdForLabel('Hip Stabilizers')).toBeNull();
  });
});
