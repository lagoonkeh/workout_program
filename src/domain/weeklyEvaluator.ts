// src/domain/weeklyEvaluator.ts
import { WorkoutExercise, WorkoutSession } from './programData';
import { SetLogRecord } from '../components/ExerciseCard';
import { MobilityEntry } from './mobility';

export type CommentSentiment =
  | 'pain'
  | 'positive'
  | 'fatigued'
  | 'form_issue'
  | 'time_constraint'
  | 'equipment_unavailable'
  | 'neutral';

export interface ParsedCommentInsight {
  exerciseId: string;
  exerciseName: string;
  rawNote: string;
  sentiment: CommentSentiment;
  keywordsDetected: string[];
  biomechanicalFinding: string;
  recommendation: string;
}

export type AdaptationAction =
  | 'increase_weight'
  | 'decrease_weight'
  | 'activate_regression'
  | 'adjust_tempo'
  | 'increase_rest'
  | 'adjust_volume'
  | 'maintain';

export interface WorkoutAdaptation {
  id: string; // unique adaptation ID
  exerciseId: string;
  exerciseName: string;
  action: AdaptationAction;
  parameter: 'weightLbs' | 'regression' | 'tempo' | 'restSeconds' | 'targetReps' | 'targetSets';
  currentValue: string | number | boolean;
  proposedValue: string | number | boolean;
  proposedLabel: string;
  rationale: string;
  creatorInfluence: string;
  applied: boolean;
}

export interface WeeklyEvaluationResult {
  evaluatedAt: string; // ISO 8601
  weekNumber: number;
  overallStatus: 'progressing' | 'adapting_for_recovery' | 'deload_recommended' | 'maintaining';
  stats: {
    totalSetsPrescribed: number;
    totalSetsCompleted: number;
    adherenceRate: number; // 0 - 100
    totalTonnageLbs: number;
    notesAnalyzedCount: number;
    exercisesCompletedCount: number;
  };
  commentInsights: ParsedCommentInsight[];
  adaptations: WorkoutAdaptation[];
  coachVerdict: string;
  nextWeekFocus: string;
}

// Keyword detection dictionaries for athlete comments
const FORM_KEYWORDS = [
  'form breakdown', 'knee cave', 'valgus', 'wobbly', 'unstable',
  'loss of balance', 'shaky', 'shifted', 'asymmetry', 'poor depth'
];

const PAIN_KEYWORDS = [
  'knee pain', 'knee ache', 'knee discomfort', 'knee', 'patellar', 'tendon', 'tendinitis', 'tendinopathy',
  'pain', 'ache', 'hurts', 'hurt', 'sharp', 'tweak', 'discomfort',
  'pinching', 'click', 'clicking', 'swollen', 'inflamed', 'sore joint',
  '3/10', '4/10', '5/10', '6/10', '7/10', '8/10', 'back pain', 'shoulder pain'
];

const POSITIVE_KEYWORDS = [
  'easy', 'light', 'flew up', 'fast', 'smooth', 'strong',
  'felt great', 'clean', 'pr', 'explosive', 'rpe 6', 'rpe 7', 'rpe 6.5',
  'could do more', 'effortless', 'breezed'
];

const FATIGUE_KEYWORDS = [
  'fail', 'failed', 'missed', 'heavy', 'grind', 'stuck',
  'burned out', 'exhausted', 'slow', 'struggled', 'barely',
  'rpe 9.5', 'rpe 10', 'rpe 9', 'fatigued', 'gassed', 'no energy'
];

const TIME_KEYWORDS = [
  'time', 'busy', 'rushed', 'hurry', 'hurried', 'schedule', 'late', 'work',
  'ran out of time', 'short on time', 'lunch crunch', 'crunch', 'quick session', 'in a rush'
];

const EQUIPMENT_KEYWORDS = [
  'equipment', 'machine', 'occupied', 'taken', 'gym busy', 'broken', 'unavailable',
  'crowded', 'waiting', 'no barbell', 'no dumbbells', 'no rack', 'in use', 'gym was packed'
];

/**
 * Parses athlete notes for an exercise and categorizes sentiment and biomechanical implications.
 */
export function parseAthleteComment(note: string, exercise: WorkoutExercise): ParsedCommentInsight {
  const lower = note.toLowerCase().trim();

  // Check form breakdown first (e.g. knee cave vs acute pain)
  const formHits = FORM_KEYWORDS.filter((k) => lower.includes(k));
  if (formHits.length > 0) {
    return {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      rawNote: note,
      sentiment: 'form_issue',
      keywordsDetected: formHits,
      biomechanicalFinding: `Kinematic deviation or stability loss detected (${formHits.join(', ')}).`,
      recommendation: 'Slow down cadence with Marcus Filly 31X1 tempo and prioritize tripod foot rooting or scapular depression.',
    };
  }

  // Check pain next (highest clinical priority)
  const painHits = PAIN_KEYWORDS.filter((k) => lower.includes(k));
  if (painHits.length > 0) {
    return {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      rawNote: note,
      sentiment: 'pain',
      keywordsDetected: painHits,
      biomechanicalFinding: `Joint/tendon stress detected (${painHits.join(', ')}). Bypassing heavy loading to protect collagen matrix and patellar tendon integrity.`,
      recommendation: exercise.regression
        ? `Switch to pain-free regression: ${exercise.regression.name} and enforce 4010 eccentric tempo.`
        : 'Reduce load by 15-20% and emphasize slow 4-second eccentric tempo to stimulate tenocyte collagen remodeling without joint shear.',
    };
  }

  // Check fatigue / failure
  const fatigueHits = FATIGUE_KEYWORDS.filter((k) => lower.includes(k));
  if (fatigueHits.length > 0) {
    return {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      rawNote: note,
      sentiment: 'fatigued',
      keywordsDetected: fatigueHits,
      biomechanicalFinding: `High neuromuscular fatigue or technical failure noted (${fatigueHits.join(', ')}). Central Nervous System (CNS) recovery needed.`,
      recommendation: 'Maintain current load or take a 10% micro-deload, and increase inter-set rest intervals by 30-60s.',
    };
  }

  // Check ease / progressive overload readiness
  const positiveHits = POSITIVE_KEYWORDS.filter((k) => lower.includes(k));
  if (positiveHits.length > 0) {
    return {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      rawNote: note,
      sentiment: 'positive',
      keywordsDetected: positiveHits,
      biomechanicalFinding: `High mechanical readiness and low RPE observed (${positiveHits.join(', ')}).`,
      recommendation: 'Prime candidate for progressive overload: increase working weight for next week.',
    };
  }

  // Check time constraints / schedule crunches
  const timeHits = TIME_KEYWORDS.filter((k) => lower.includes(k));
  if (timeHits.length > 0) {
    return {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      rawNote: note,
      sentiment: 'time_constraint',
      keywordsDetected: timeHits,
      biomechanicalFinding: `Athlete time constraint identified (${timeHits.join(', ')}). Session density protocol indicated.`,
      recommendation: 'Auto-regulate set count or utilize antagonist supersets / rest-pause clusters to fit training volume into tighter time constraints.',
    };
  }

  // Check gym equipment bottlenecks
  const equipmentHits = EQUIPMENT_KEYWORDS.filter((k) => lower.includes(k));
  if (equipmentHits.length > 0) {
    return {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      rawNote: note,
      sentiment: 'equipment_unavailable',
      keywordsDetected: equipmentHits,
      biomechanicalFinding: `Gym equipment barrier identified (${equipmentHits.join(', ')}).`,
      recommendation: exercise.regression
        ? `Substitute with accessible alternative or regression: ${exercise.regression.name}.`
        : 'Substitute with dumbbell, cable, or bodyweight variation that trains the same primary motor pattern.',
    };
  }

  return {
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    rawNote: note,
    sentiment: 'neutral',
    keywordsDetected: [],
    biomechanicalFinding: 'Standard training effort logged without critical biomechanical anomalies.',
    recommendation: 'Continue with standard GZCL progression protocols.',
  };
}

/**
 * Core Weekly Evaluation Engine.
 * Analyzes performance data and athlete comments across all sessions and synthesizes tailored adaptations.
 */
export function evaluateWeeklyPerformance(
  workoutLogs: Record<string, SetLogRecord[]>,
  sessions: WorkoutSession[],
  mobilityHistory: MobilityEntry[] = [],
  currentWeek: number = 1
): WeeklyEvaluationResult {
  let totalSetsPrescribed = 0;
  let totalSetsCompleted = 0;
  let totalTonnageLbs = 0;
  let notesAnalyzedCount = 0;
  let exercisesCompletedCount = 0;

  const commentInsights: ParsedCommentInsight[] = [];
  const adaptations: WorkoutAdaptation[] = [];

  let painCount = 0;
  let fatigueCount = 0;
  let progressionCount = 0;

  sessions.forEach((session) => {
    session.exercises.forEach((ex) => {
      totalSetsPrescribed += ex.targetSets;
      const logs = workoutLogs[ex.id] || [];

      let completedForExercise = 0;
      let totalRepsForExercise = 0;
      let maxWeightForExercise = ex.defaultWeightLbs || ex.defaultWeight || 0;
      let amrapOverperformed = false;
      let failedSets = false;

      // Extract all non-empty notes
      const notes = logs.map((l) => l.notes?.trim()).filter(Boolean);

      logs.forEach((set, idx) => {
        if (set.isCompleted) {
          completedForExercise++;
          totalSetsCompleted++;
          const weight = set.weightLbs || maxWeightForExercise;
          const reps = set.repsAchieved || 0;
          totalTonnageLbs += weight * reps;
          totalRepsForExercise += reps;
          if (weight > maxWeightForExercise) maxWeightForExercise = weight;

          // Check AMRAP set performance
          if (idx === logs.length - 1 && ex.isAmrapLastSet) {
            const targetNum = parseInt(ex.targetReps, 10) || 3;
            if (reps >= targetNum + 2) {
              amrapOverperformed = true;
            } else if (reps < targetNum) {
              failedSets = true;
            }
          }
        } else if (set.repsAchieved > 0 && set.repsAchieved < (parseInt(ex.targetReps, 10) || 1)) {
          failedSets = true;
        }
      });

      if (completedForExercise >= ex.targetSets && ex.targetSets > 0) {
        exercisesCompletedCount++;
      }

      // Analyze comments for this exercise
      notes.forEach((note) => {
        notesAnalyzedCount++;
        const insight = parseAthleteComment(note, ex);
        commentInsights.push(insight);

        if (insight.sentiment === 'pain') painCount++;
        else if (insight.sentiment === 'fatigued') fatigueCount++;
        else if (insight.sentiment === 'positive') progressionCount++;
      });

      // Aggregate sentiment for this specific exercise
      const exerciseInsights = commentInsights.filter((i) => i.exerciseId === ex.id);
      const hasPainNote = exerciseInsights.some((i) => i.sentiment === 'pain');
      const hasPositiveNote = exerciseInsights.some((i) => i.sentiment === 'positive');
      const hasFatigueNote = exerciseInsights.some((i) => i.sentiment === 'fatigued');

      // GENERATE ADAPTATIONS:
      // Case 1: Pain detected in notes or tendinitis trigger -> Activate Regression / Eccentric Protocol
      if (hasPainNote) {
        if (ex.regression) {
          adaptations.push({
            id: `adapt_${ex.id}_regression`,
            exerciseId: ex.id,
            exerciseName: ex.name,
            action: 'activate_regression',
            parameter: 'regression',
            currentValue: false,
            proposedValue: true,
            proposedLabel: `Swap to ${ex.regression.name}`,
            rationale: `Athlete comment noted knee/joint discomfort. Per Ben Patrick & Yellow Dude protocols, deload joint shear and shift to ${ex.regression.name} with slow eccentrics.`,
            creatorInfluence: 'Ben Patrick (ATG) & Yellow Dude',
            applied: false,
          });
        } else {
          // Increase eccentric tempo for collagen remodeling
          adaptations.push({
            id: `adapt_${ex.id}_tempo`,
            exerciseId: ex.id,
            exerciseName: ex.name,
            action: 'adjust_tempo',
            parameter: 'tempo',
            currentValue: ex.tempo,
            proposedValue: '4010',
            proposedLabel: 'Increase eccentric to 4010 (4s slow descent)',
            rationale: 'Slow 4-second eccentric descent increases tendon load capacity and tenocyte collagen synthesis without ballistic shock.',
            creatorInfluence: 'Yellow Dude & Marcus Filly',
            applied: false,
          });
        }
      }
      // Case 2: Positive performance + AMRAP crushed OR note says easy -> Progressive Overload
      else if ((amrapOverperformed || hasPositiveNote) && !failedSets && (completedForExercise >= Math.min(3, ex.targetSets) || amrapOverperformed)) {
        // Upper body: +5 lbs; Lower body: +10 lbs (or +5 for kettlebell)
        const isLower = session.id.includes('lower');
        const increment = ex.equipment === 'kettlebell' ? 4 : isLower ? 10 : 5;
        const newWeight = maxWeightForExercise + increment;

        adaptations.push({
          id: `adapt_${ex.id}_weight_up`,
          exerciseId: ex.id,
          exerciseName: ex.name,
          action: 'increase_weight',
          parameter: 'weightLbs',
          currentValue: maxWeightForExercise,
          proposedValue: newWeight,
          proposedLabel: `+${increment} lbs (${maxWeightForExercise} → ${newWeight} lbs)`,
          rationale: amrapOverperformed
            ? `AMRAP set exceeded target (+${(logs[logs.length - 1]?.repsAchieved || 0) - (parseInt(ex.targetReps, 10) || 3)} reps). GZCL linear progression applies.`
            : 'Smooth execution and positive comment log indicate mechanical readiness for load progression.',
          creatorInfluence: 'GZCL & Jeff Nippard',
          applied: false,
        });
      }
      // Case 3: Failed sets or severe fatigue noted -> Rest Interval Increase or Load Hold
      else if (failedSets || hasFatigueNote) {
        if (ex.tier === 'T1' && ex.restSeconds < 300) {
          const newRest = Math.min(300, ex.restSeconds + 60);
          adaptations.push({
            id: `adapt_${ex.id}_rest`,
            exerciseId: ex.id,
            exerciseName: ex.name,
            action: 'increase_rest',
            parameter: 'restSeconds',
            currentValue: ex.restSeconds,
            proposedValue: newRest,
            proposedLabel: `+60s Rest (${ex.restSeconds}s → ${newRest}s)`,
            rationale: 'Fatigue/failure noted on compound strength work. Increasing rest period restores ATP-CP stores to preserve high-threshold motor unit recruitment.',
            creatorInfluence: 'ATHLEAN-X & Jeff Nippard',
            applied: false,
          });
        } else if (maxWeightForExercise > 0) {
          adaptations.push({
            id: `adapt_${ex.id}_hold`,
            exerciseId: ex.id,
            exerciseName: ex.name,
            action: 'maintain',
            parameter: 'weightLbs',
            currentValue: maxWeightForExercise,
            proposedValue: maxWeightForExercise,
            proposedLabel: `Hold at ${maxWeightForExercise} lbs (Consolidate volume)`,
            rationale: 'Target reps missed or high RPE reported. Consolidate current load before progressing weight.',
            creatorInfluence: 'GZCL Method',
            applied: false,
          });
        }
      }
      // Case 4: Exercise was skipped / marked [NOT DONE] -> Auto-regulate volume down & hold weight
      else if (logs.length > 0 && logs.some((l) => l.notes?.includes('[NOT DONE]'))) {
        const skippedNote = logs.find((l) => l.notes?.includes('[NOT DONE]'))?.notes || '';
        const lowerNote = skippedNote.toLowerCase();
        const isTime = TIME_KEYWORDS.some((k) => lowerNote.includes(k));
        const isEquip = EQUIPMENT_KEYWORDS.some((k) => lowerNote.includes(k));
        const proposedSets = Math.max(2, ex.targetSets - 1);

        let rationale = `Exercise was marked not done during ${session.title}. Volume auto-regulated to ${proposedSets} sets to restore consistency and avoid fatigue spikes.`;
        let creatorInfluence = 'GZCL Auto-Regulation & Dr. Stuart McGill';
        let proposedLabel = `Auto-regulate to ${proposedSets} sets (Skipped)`;

        if (isTime) {
          rationale = `Exercise skipped due to athlete time constraint. Target auto-regulated to ${proposedSets} sets with superset pairing to maximize density without missing key volume.`;
          creatorInfluence = 'Jeff Nippard Minimalist Training & GZCL Auto-Regulation';
          proposedLabel = `Auto-regulate to ${proposedSets} sets (Time Saver)`;
        } else if (isEquip) {
          rationale = `Exercise skipped due to equipment unavailability. Volume consolidated to ${proposedSets} sets; consider dumbbell or bodyweight equivalent when stations are occupied.`;
          creatorInfluence = 'Eugene Teo & GZCL Auto-Regulation';
          proposedLabel = `Auto-regulate to ${proposedSets} sets (Equip Sub)`;
        }

        adaptations.push({
          id: `adapt_${ex.id}_skipped_volume`,
          exerciseId: ex.id,
          exerciseName: ex.name,
          action: 'adjust_volume',
          parameter: 'targetSets',
          currentValue: ex.targetSets,
          proposedValue: proposedSets,
          proposedLabel,
          rationale,
          creatorInfluence,
          applied: false,
        });
      }
    });
  });

  // Cross-reference Mobility Data (if available)
  if (mobilityHistory.length > 0) {
    const recentKneeToWall = mobilityHistory.filter((m) => m.testId === 'knee-to-wall');
    if (recentKneeToWall.length > 0) {
      const latest = recentKneeToWall[0];
      if (latest.value < 4.0) {
        // Ankle restriction detected -> recommend calf / dorsiflexion warm-up focus
        const squatEx = sessions[0]?.exercises.find((e) => e.id === 't1_bb_squat');
        if (squatEx && !adaptations.some((a) => a.exerciseId === squatEx.id && a.parameter === 'tempo')) {
          adaptations.push({
            id: `adapt_mobility_ankle_dorsiflexion`,
            exerciseId: squatEx.id,
            exerciseName: squatEx.name,
            action: 'adjust_tempo',
            parameter: 'tempo',
            currentValue: squatEx.tempo,
            proposedValue: '31X1',
            proposedLabel: 'Add 1s pause in the hole (31X1 tempo)',
            rationale: `Latest Knee-to-Wall ankle dorsiflexion was ${latest.value}" (below 5" benchmark). Adding a 1-second pause improves bottom-position ankle stability and reduces patellar shear.`,
            creatorInfluence: 'Dr. Aaron Horschig (Squat University)',
            applied: false,
          });
        }
      }
    }
  }

  const adherenceRate = totalSetsPrescribed > 0 ? Math.round((totalSetsCompleted / totalSetsPrescribed) * 100) : 0;

  // Synthesize overall status and coach verdict
  let overallStatus: WeeklyEvaluationResult['overallStatus'] = 'progressing';
  let coachVerdict = '';
  let nextWeekFocus = '';

  if (painCount > 0) {
    overallStatus = 'adapting_for_recovery';
    coachVerdict = `Athlete logged ${painCount} pain/discomfort flag(s). Priority is joint bulletproofing: pain-free regressions and extended 4-second eccentric cadences have been queued to promote tendon collagen remodeling.`;
    nextWeekFocus = 'Adhere to pain ≤ 2/10 threshold, focus on Eugene Teo hamstring pre-fatigue, and slow down eccentrics.';
  } else if (adaptations.some((a) => a.action === 'increase_weight') || progressionCount >= 2) {
    overallStatus = 'progressing';
    coachVerdict = `Outstanding training execution! Adherence is strong at ${adherenceRate}%, with positive readiness notes and clean AMRAP set completions. Progressive overload weights are queued for next week.`;
    nextWeekFocus = 'Emphasize explosive concentric drive while maintaining strict 3-second eccentric control on new working weights.';
  } else if (fatigueCount >= 3) {
    overallStatus = 'deload_recommended';
    coachVerdict = `Cumulative fatigue markers detected across multiple sessions (${fatigueCount} fatigue notes). Rest intervals increased and loads held to facilitate systemic recovery.`;
    nextWeekFocus = 'Prioritize sleep, hydration, and restorative mobility resets before adding more loading.';
  } else {
    overallStatus = 'maintaining';
    coachVerdict = `Solid training consistency with ${adherenceRate}% volume adherence. Maintaining current baseline parameters with focused technique execution.`;
    nextWeekFocus = 'Drive consistency on last-set AMRAPs and log detailed RPE notes on compound lifts.';
  }

  return {
    evaluatedAt: new Date().toISOString(),
    weekNumber: currentWeek,
    overallStatus,
    stats: {
      totalSetsPrescribed,
      totalSetsCompleted,
      adherenceRate,
      totalTonnageLbs,
      notesAnalyzedCount,
      exercisesCompletedCount,
    },
    commentInsights,
    adaptations,
    coachVerdict,
    nextWeekFocus,
  };
}
