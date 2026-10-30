// tests/domain/adaptiveAdjustments.test.ts
import { describe, it, expect } from 'vitest';
import {
  auditSessionCompletion,
  applySkippedExerciseAdjustments,
  annotateWorkoutLogsForSkipped,
} from '../../src/domain/adaptiveAdjustments';
import { WORKOUT_PROGRAM } from '../../src/domain/programData';
import { SetLogRecord } from '../../src/components/ExerciseCard';

describe('adaptiveAdjustments Domain Service', () => {
  const session = WORKOUT_PROGRAM.lower_a;

  it('correctly identifies when all exercises in a session are completed', () => {
    const logs: Record<string, SetLogRecord[]> = {};

    session.exercises.forEach((ex) => {
      logs[ex.id] = Array.from({ length: ex.targetSets }, (_, i) => ({
        setNumber: i + 1,
        weightLbs: 100,
        repsAchieved: 5,
        targetReps: '5',
        isCompleted: true,
        notes: '',
      }));
    });

    const audit = auditSessionCompletion(session, logs);
    expect(audit.isFullyCompleted).toBe(true);
    expect(audit.completedExercises.length).toBe(session.exercises.length);
    expect(audit.skippedExercises.length).toBe(0);
    expect(audit.proposedAdjustments.length).toBe(0);
  });

  it('detects uncompleted/skipped exercises and proposes tailored future adjustments', () => {
    const logs: Record<string, SetLogRecord[]> = {};

    // Complete only the first exercise (t1_bb_squat)
    const firstEx = session.exercises[0];
    logs[firstEx.id] = Array.from({ length: firstEx.targetSets }, (_, i) => ({
      setNumber: i + 1,
      weightLbs: 225,
      repsAchieved: 3,
      targetReps: '3',
      isCompleted: true,
      notes: '',
    }));

    const audit = auditSessionCompletion(session, logs);
    expect(audit.isFullyCompleted).toBe(false);
    expect(audit.completedExercises.length).toBe(1);
    expect(audit.completedExercises[0].id).toBe(firstEx.id);
    expect(audit.skippedExercises.length).toBe(session.exercises.length - 1);

    // Verify proposed adjustments
    expect(audit.proposedAdjustments.length).toBe(session.exercises.length - 1);
    const splitSquatAdj = audit.proposedAdjustments.find((a) => a.exerciseId === 't2_atg_split_squat');
    expect(splitSquatAdj).toBeDefined();
    expect(splitSquatAdj?.proposedSets).toBeLessThanOrEqual(splitSquatAdj?.originalSets || 3);
    expect(splitSquatAdj?.priorityBadge).toContain('High Priority');
  });

  it('applies skipped exercise adjustments into program adaptations for future sessions', () => {
    const audit = auditSessionCompletion(session, {});
    const existingAdaptations = {};
    const updated = applySkippedExerciseAdjustments(audit.proposedAdjustments, existingAdaptations);

    const squatAdapt = updated['t1_bb_squat'];
    expect(squatAdapt).toBeDefined();
    expect(squatAdapt.missedLastSession).toBe(true);
    expect(squatAdapt.priorityBadge).toContain('High Priority');

    const splitSquatAdapt = updated['t2_atg_split_squat'];
    expect(splitSquatAdapt).toBeDefined();
    expect(splitSquatAdapt.targetSets).toBeLessThanOrEqual(3);
  });

  it('annotates workout logs for skipped exercises with clear notes without falsely completing them', () => {
    const logs: Record<string, SetLogRecord[]> = {};
    const skipped = [{ id: 't2_atg_split_squat', targetSets: 3, targetReps: '8-10' }];

    const annotated = annotateWorkoutLogsForSkipped(logs, skipped, session.title);
    const sets = annotated['t2_atg_split_squat'];

    expect(sets).toBeDefined();
    expect(sets.length).toBe(3);
    expect(sets.every((s) => !s.isCompleted)).toBe(true);
    expect(sets.every((s) => s.targetReps === '8-10')).toBe(true);
    expect(sets.every((s) => s.notes.includes('[NOT DONE]'))).toBe(true);
  });
});
