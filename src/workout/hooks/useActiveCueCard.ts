// Extracted from src/App.tsx (WorkoutAppMain). Same hooks in the same order; inputs come in as args.
import { useMemo } from 'react';
import { type CueCardLookup } from '../../domain/cueCardStore';
import { type CueCard } from '../../domain/cueCardTypes';
import { getEffectiveExerciseTempo, isTimedPrescription, WORKOUT_PROGRAM, type WorkoutExercise, type WorkoutSession } from '../../domain/programData';

export interface UseActiveCueCardArgs {
  activeCueCardId: string | null;
  activeSession: WorkoutSession;
  CUE_CARD_MAP: CueCardLookup;
  sessionExercises: WorkoutExercise[];
}

export function useActiveCueCard({ activeCueCardId, activeSession, CUE_CARD_MAP, sessionExercises }: UseActiveCueCardArgs) {
  // Selected cue card lookup with O(1) map & fallback
  const activeCueCard = useMemo((): CueCard | null => {
    if (!activeCueCardId) return null;
    const direct =
      CUE_CARD_MAP.get(activeCueCardId) ||
      CUE_CARD_MAP.get(activeCueCardId.toLowerCase());
    if (direct) return direct;

    const baseId = activeCueCardId.replace(/__side_(left|right)$/, '');
    const baseDirect = CUE_CARD_MAP.get(baseId) || CUE_CARD_MAP.get(baseId.toLowerCase());
    if (baseDirect) return baseDirect;

    // Fallback dynamically if not in predefined CUE_CARDS
    const ex = sessionExercises.find((e) => e.id === activeCueCardId) ||
               activeSession.exercises.find((e) => e.id === activeCueCardId) ||
               activeSession.dailyCoreFinisher?.find((e) => e.id === activeCueCardId);
    if (ex) {
      if (ex.baseExerciseId) {
        const baseExDirect = CUE_CARD_MAP.get(ex.baseExerciseId) || CUE_CARD_MAP.get(ex.baseExerciseId.toLowerCase());
        if (baseExDirect) return baseExDirect;
      }
      const matchByName = CUE_CARD_MAP.get(ex.name.toLowerCase());
      if (matchByName) return matchByName;

      return {
        id: `cue_dyn_${ex.id}`,
        exerciseId: ex.id,
        exerciseName: ex.name,
        title: ex.name,
        tier: ex.tier,
        tempo: ex.tempo,
        prescribedTempo: ex.tempo,
        primaryMuscles: ex.muscleGroups,
        equipment: ex.equipment.replaceAll('_', ' '),
        setup: `Standard ${ex.equipment.replaceAll('_', ' ')} setup for ${ex.name}.`,
        setupInstructions: [
          `Setup with ${ex.equipment.replaceAll('_', ' ')}. Maintain neutral posture, joint centration, and core brace.`,
        ],
        creatorCues: [
          {
            creator: 'Program Biomechanics',
            quote: ex.biomechanicalRationale,
            biomechanicalRationale: ex.progressionRule,
          },
        ],
        commonFaults: ['Rushing eccentric tempo', 'Sacrificing form under fatigue'],
        rehabRegressions: ex.regression
          ? [`${ex.regression.name}: ${ex.regression.instructions} (Tempo: ${ex.regression.tempo})`]
          : [],
      };
    }

    // Check warmup sequence drills
    const drill = activeSession.warmupSequence?.find((w) => w.id === activeCueCardId);
    if (drill) {
      const matchByName = CUE_CARD_MAP.get(drill.name.toLowerCase());
      if (matchByName) return matchByName;

      return {
        id: `cue_dyn_${drill.id}`,
        exerciseId: drill.id,
        exerciseName: drill.name,
        title: drill.name,
        tier: 'Warmup',
        tempo: drill.tempo || '2020',
        prescribedTempo: drill.tempo || '2020',
        primaryMuscles: ['Warmup / Stabilizers'],
        equipment: drill.equipment.replaceAll('_', ' '),
        setup: `Standard ${drill.equipment.replaceAll('_', ' ')} setup for ${drill.name}.`,
        setupInstructions: [drill.coachingNotes],
        creatorCues: [
          {
            creator: drill.creatorAttribution,
            quote: drill.biomechanicalPurpose,
            biomechanicalRationale: drill.coachingNotes,
          },
        ],
        commonFaults: ['Rushing through warm-up', 'Holding breath instead of diaphragmatic cadence'],
        rehabRegressions: [],
      };
    }
    return null;
  }, [activeCueCardId, activeSession, CUE_CARD_MAP]);

  // Whether the open cue card's exercise is prescribed by time (only those get the metronome / hold button)
  const activeCueCardTimed = useMemo(() => {
    if (!activeCueCard) return false;
    const id = activeCueCard.exerciseId.replace(/__side_(left|right)$/, '');
    const sessions = [activeSession, ...Object.values(WORKOUT_PROGRAM)];
    for (const s of sessions) {
      const ex = [...s.exercises, ...(s.dailyCoreFinisher || [])].find((e) => e.id === id || e.baseExerciseId === id);
      if (ex) return isTimedPrescription(ex.targetReps, getEffectiveExerciseTempo(ex.tempo, ex.targetReps));
      const drill = [...(s.warmupSequence || []), ...(s.warmup || [])].find((w) => w.id === id);
      if (drill) return isTimedPrescription(drill.targetDurationOrReps, drill.tempo);
    }
    return isTimedPrescription('', activeCueCard.tempo);
  }, [activeCueCard, activeSession]);

  return { activeCueCard, activeCueCardTimed };
}
