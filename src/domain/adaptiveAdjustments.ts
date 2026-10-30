// src/domain/adaptiveAdjustments.ts
import { WorkoutExercise, WorkoutSession } from './programData';
import { SetLogRecord } from '../components/ExerciseCard';

export interface SkippedExerciseAdjustment {
  exerciseId: string;
  exerciseName: string;
  sessionId: string;
  sessionTitle: string;
  tier: string;
  originalSets: number;
  completedSets: number;
  skippedSets: number;
  proposedSets: number;
  proposedWeightLbs?: number;
  priorityBadge: string;
  reason: string;
  biomechanicalRationale: string;
}

export interface SessionCompletionAudit {
  sessionId: string;
  sessionTitle: string;
  totalExercises: number;
  completedExercises: {
    id: string;
    name: string;
    targetSets: number;
    completedSets: number;
    tier: string;
  }[];
  skippedExercises: {
    id: string;
    name: string;
    targetSets: number;
    completedSets: number;
    skippedSets: number;
    tier: string;
    targetReps?: string;
    reason?: string;
  }[];
  isFullyCompleted: boolean;
  proposedAdjustments: SkippedExerciseAdjustment[];
}

export interface SkippedExerciseRecord {
  id: string;
  exerciseId: string;
  exerciseName: string;
  sessionId: string;
  sessionTitle: string;
  skippedAt: string; // ISO 8601
  originalSets: number;
  completedSets: number;
  proposedSets: number;
  autoAdjusted: boolean;
  reason?: string;
}

/**
 * Audits a workout session to determine which exercises were completed and which were NOT done.
 * Generates tailored future adjustments (volume auto-regulation, load consolidation, priority flagging).
 */
export function auditSessionCompletion(
  session: WorkoutSession,
  workoutLogs: Record<string, SetLogRecord[]> = {},
  programAdaptations: Record<string, Partial<WorkoutExercise>> = {}
): SessionCompletionAudit {
  const completedExercises: SessionCompletionAudit['completedExercises'] = [];
  const skippedExercises: SessionCompletionAudit['skippedExercises'] = [];
  const proposedAdjustments: SkippedExerciseAdjustment[] = [];

  session.exercises.forEach((ex) => {
    const adaptedEx = {
      ...ex,
      ...(programAdaptations[ex.id] || {}),
    };

    const targetSets = adaptedEx.targetSets;
    const logs = workoutLogs[ex.id] || [];
    const completedSets = logs.filter((s) => s.isCompleted).length;
    const skippedSets = Math.max(0, targetSets - completedSets);

    if (completedSets >= targetSets && targetSets > 0) {
      completedExercises.push({
        id: ex.id,
        name: ex.name,
        targetSets,
        completedSets,
        tier: ex.tier,
      });
    } else {
      const skippedReasonMatch = logs.find((l) => l.notes?.includes('[NOT DONE]'))?.notes?.match(/\[NOT DONE\](?:\s*Skipped:\s*([^·\n]+))?/i);
      const existingReason = skippedReasonMatch?.[1]?.trim() || undefined;

      skippedExercises.push({
        id: ex.id,
        name: ex.name,
        targetSets,
        completedSets,
        skippedSets,
        tier: ex.tier,
        targetReps: ex.targetReps,
        reason: existingReason,
      });

      // Calculate future auto-regulation adjustments
      let proposedSets = targetSets;
      let rationale = '';

      if (ex.tier === 'T1') {
        // T1 Strength: consolidate volume to 3 clean sets or maintain current weight
        proposedSets = Math.max(3, targetSets - 1);
        rationale = `Compound primary lift was incomplete (${completedSets}/${targetSets} sets). Volume consolidated to ${proposedSets} sets with working load held to preserve CNS recovery and technical mastery.`;
      } else if (ex.tier === 'T2') {
        // T2 Hypertrophy: auto-regulate from 3 to 2 sets
        proposedSets = Math.max(2, targetSets - 1);
        rationale = `Tier 2 hypertrophy work missed. Future target reduced from ${targetSets} to ${proposedSets} sets to prevent session over-fatigue and ensure high movement quality.`;
      } else {
        // T3 Bulletproofing/Accessory: reduce to 2 sets
        proposedSets = Math.max(2, targetSets - 1);
        rationale = `Accessory/bulletproofing drill was skipped (${completedSets}/${targetSets} sets). Target adjusted to ${proposedSets} sets and marked for priority catch-up next session.`;
      }

      // Contextualize rationale if a specific skipped reason was provided
      if (existingReason) {
        const lowerReason = existingReason.toLowerCase();
        if (/time|rushed|busy|schedule|quick|late/.test(lowerReason)) {
          rationale = `Skipped due to time constraint (${existingReason}). Target auto-regulated to ${proposedSets} sets so the workout can be completed within available training windows.`;
        } else if (/equipment|taken|occupied|machine|rack|busy/.test(lowerReason)) {
          rationale = `Skipped due to equipment unavailability (${existingReason}). Volume auto-regulated to ${proposedSets} sets; consider dumbbell or bodyweight equivalent if stations are full.`;
        } else if (/knee|pain|ache|hurt|discomfort|tweak|joint|tendon/.test(lowerReason)) {
          rationale = `Skipped due to reported discomfort (${existingReason}). Target reduced to ${proposedSets} sets with high-eccentric control and joint-friendly loading.`;
        } else if (/fatigue|exhausted|tired|drained|energy/.test(lowerReason)) {
          rationale = `Skipped due to high fatigue (${existingReason}). Sets reduced to ${proposedSets} to permit neuromuscular recovery.`;
        }
      }

      const existingWeight = logs.find((l) => (l.weightLbs || 0) > 0)?.weightLbs || ex.defaultWeightLbs || ex.defaultWeight || 0;
      const baseReason = completedSets === 0
        ? `Not done during ${session.title}`
        : `Incomplete (${completedSets}/${targetSets} sets logged)`;

      proposedAdjustments.push({
        exerciseId: ex.id,
        exerciseName: ex.name,
        sessionId: session.id,
        sessionTitle: session.title,
        tier: ex.tier,
        originalSets: targetSets,
        completedSets,
        skippedSets,
        proposedSets,
        proposedWeightLbs: existingWeight,
        priorityBadge: '⚡ High Priority (Missed in Last Session)',
        reason: existingReason ? `${baseReason} · Reason: ${existingReason}` : baseReason,
        biomechanicalRationale: rationale,
      });
    }
  });

  return {
    sessionId: session.id,
    sessionTitle: session.title,
    totalExercises: session.exercises.length,
    completedExercises,
    skippedExercises,
    isFullyCompleted: skippedExercises.length === 0,
    proposedAdjustments,
  };
}

/**
 * Merges proposed skipped-exercise adjustments into the athlete's program adaptations for future sessions.
 */
export function applySkippedExerciseAdjustments(
  adjustments: SkippedExerciseAdjustment[],
  currentAdaptations: Record<string, Partial<WorkoutExercise>> = {}
): Record<string, Partial<WorkoutExercise>> {
  const next = { ...currentAdaptations };

  adjustments.forEach((adj) => {
    const existing = next[adj.exerciseId] || {};
    next[adj.exerciseId] = {
      ...existing,
      targetSets: adj.proposedSets,
      defaultWeightLbs: adj.proposedWeightLbs ?? existing.defaultWeightLbs,
      priorityBadge: adj.priorityBadge,
      missedLastSession: true,
      adjustedFromSets: adj.originalSets,
      coachingNotes: existing.coachingNotes
        ? `${existing.coachingNotes} · [Auto-Regulated: ${adj.proposedSets} Sets]`
        : `[Auto-Regulated for Future Session: ${adj.proposedSets} Sets]`,
    };
  });

  return next;
}

/**
 * Annotates set logs for exercises that were not done, formally noting the skipped status
 * while keeping isCompleted false.
 */
export function annotateWorkoutLogsForSkipped(
  workoutLogs: Record<string, SetLogRecord[]>,
  skippedExercises: { id: string; targetSets: number; targetReps?: string; reason?: string }[],
  sessionTitle: string
): Record<string, SetLogRecord[]> {
  const next = { ...workoutLogs };
  const todayStr = new Date().toISOString().split('T')[0];

  skippedExercises.forEach(({ id, targetSets, targetReps, reason }) => {
    const current = next[id] || [];
    const count = Math.max(targetSets, current.length);
    const updated: SetLogRecord[] = [];

    for (let i = 0; i < count; i++) {
      const existing = current[i];
      if (existing && existing.isCompleted) {
        updated.push(existing);
      } else {
        const existingReasonMatch = existing?.notes?.match(/\[NOT DONE\](?:\s*Skipped:\s*([^·\n]+))?/i);
        const resolvedReason = reason || existingReasonMatch?.[1]?.trim() || '';
        const reasonPart = resolvedReason ? ` Skipped: ${resolvedReason} ·` : '';

        updated.push({
          setNumber: i + 1,
          weightLbs: existing?.weightLbs || 0,
          repsAchieved: existing?.repsAchieved || 0,
          targetReps: existing?.targetReps || targetReps || '3',
          isCompleted: false,
          notes: existing?.notes && existing.notes.includes('[NOT DONE]')
            ? existing.notes
            : existing?.notes
            ? `${existing.notes} · [NOT DONE on ${todayStr}]${resolvedReason ? ` (Skipped: ${resolvedReason})` : ''}`
            : `[NOT DONE]${reasonPart} Skipped during ${sessionTitle} session on ${todayStr}`,
        });
      }
    }

    next[id] = updated;
  });

  return next;
}
