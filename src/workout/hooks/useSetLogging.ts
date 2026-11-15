// Extracted from src/App.tsx (WorkoutAppMain). Same hooks in the same order; inputs come in as args.
import { type Dispatch, type RefObject, type SetStateAction, useCallback, useMemo } from 'react';
import { SetLogRecord } from '../../components/ExerciseCard';
import { RestTargetContext } from '../../components/RestTimerWidget';
import { WorkoutExercise, type WorkoutSession } from '../../domain/programData';
import { storageManager } from '../../storage/storageManager';
import { type NextSetInfo, resolveSetTarget } from '../../timer/watchCommands';
import { createDefaultExerciseLogs } from '../shared';

export interface UseSetLoggingArgs {
  activeRestContext: RestTargetContext | null;
  activeSession: WorkoutSession;
  defaultLogsByExerciseId: Record<string, SetLogRecord[]>;
  getExerciseLogs: (exercise: WorkoutExercise) => SetLogRecord[];
  nextSetInfo: (exerciseId: string | undefined, setNumber: number | undefined) => NextSetInfo | null;
  pendingRestContextRef: RefObject<RestTargetContext | null>;
  recordTaskCompletionStartTime: (sessionId?: string) => void;
  sessionExercises: WorkoutExercise[];
  setActiveCueCardId: Dispatch<SetStateAction<string | null>>;
  setActiveRestContext: Dispatch<SetStateAction<RestTargetContext | null>>;
  setActiveRestSeconds: Dispatch<SetStateAction<number | null>>;
  setWorkoutLogs: Dispatch<SetStateAction<Record<string, SetLogRecord[]>>>;
}

export function useSetLogging({ activeRestContext, activeSession, defaultLogsByExerciseId, getExerciseLogs, nextSetInfo, pendingRestContextRef, recordTaskCompletionStartTime, sessionExercises, setActiveCueCardId, setActiveRestContext, setActiveRestSeconds, setWorkoutLogs }: UseSetLoggingArgs) {
  // Update a single set log record (stable across workoutLogs updates so memoized ExerciseCards do not re-render)
  const handleUpdateSetLog = useCallback(
    (exerciseId: string, setIndex: number, updated: Partial<SetLogRecord>) => {
      if (updated.isCompleted === true) {
        recordTaskCompletionStartTime();
      }
      const targetExercise = sessionExercises.find((e) => e.id === exerciseId) ||
                             activeSession.dailyCoreFinisher?.find((e) => e.id === exerciseId);

      const isCoreDrill =
        exerciseId.startsWith('t3_sp_') ||
        Boolean(activeSession.dailyCoreFinisher?.some((e) => e.id === exerciseId));

      if (updated.isCompleted === true && targetExercise) {
        if (isCoreDrill) {
          pendingRestContextRef.current = null;
        } else {
          const currentLogs = getExerciseLogs(targetExercise);
          const completedSetNumber = setIndex + 1;
          const totalSets = currentLogs.length;
          const isLastSet = completedSetNumber >= totalSets;

          let nextSetNumber: number | undefined;
          let nextExerciseName: string | undefined;
          let nextExerciseId: string | undefined;

          if (!isLastSet) {
            nextSetNumber = completedSetNumber + 1;
            nextExerciseName = undefined;
            nextExerciseId = undefined;
          } else {
            const currentIdx = sessionExercises.findIndex((e) => e.id === exerciseId);
            if (currentIdx >= 0 && currentIdx < sessionExercises.length - 1) {
              nextExerciseName = sessionExercises[currentIdx + 1].name;
              nextExerciseId = sessionExercises[currentIdx + 1].id;
              nextSetNumber = 1;
            } else if (activeSession.dailyCoreFinisher && activeSession.dailyCoreFinisher.length > 0) {
              const finisherIdx = activeSession.dailyCoreFinisher.findIndex((e) => e.id === exerciseId);
              if (finisherIdx >= 0 && finisherIdx < activeSession.dailyCoreFinisher.length - 1) {
                nextExerciseName = activeSession.dailyCoreFinisher[finisherIdx + 1].name;
                nextExerciseId = activeSession.dailyCoreFinisher[finisherIdx + 1].id;
                nextSetNumber = 1;
              } else if (finisherIdx === -1) {
                nextExerciseName = activeSession.dailyCoreFinisher[0].name;
                nextExerciseId = activeSession.dailyCoreFinisher[0].id;
                nextSetNumber = 1;
              }
            }
          }

          pendingRestContextRef.current = {
            exerciseId,
            exerciseName: targetExercise.name,
            completedSetNumber,
            totalSets,
            nextSetNumber,
            nextExerciseName,
            nextExerciseId,
            isLastSet,
            nextSet: nextSetInfo(nextExerciseId || exerciseId, nextSetNumber),
          };
        }
      }

      setWorkoutLogs((prev) => {
        const exercise = targetExercise;
        const existing =
          prev[exerciseId] ||
          defaultLogsByExerciseId[exerciseId] ||
          (exercise ? createDefaultExerciseLogs(exercise) : []);
        const nextLogs = [...existing];
        const prevSet = nextLogs[setIndex];
        const parsedTargetReps = parseInt(prevSet?.targetReps || exercise?.targetReps || '0', 10);
        const shouldAutoFillReps =
          updated.isCompleted === true &&
          (prevSet?.repsAchieved ?? 0) === 0 &&
          updated.repsAchieved === undefined &&
          !Number.isNaN(parsedTargetReps) &&
          parsedTargetReps > 0;
        nextLogs[setIndex] = {
          ...prevSet,
          ...updated,
          ...(shouldAutoFillReps ? { repsAchieved: parsedTargetReps } : {}),
          // First-touch timestamp so Sheets sync files the set under the day it was performed
          loggedAt: prevSet?.loggedAt ?? new Date().toISOString(),
        };

        try {
          const allCompleted = nextLogs.length > 0 && nextLogs.every((l) => l.isCompleted);
          const currentSet = nextLogs[setIndex];
          storageManager.updateWorkoutLog(exerciseId, {
            completed: allCompleted,
            weight: currentSet?.weightLbs ?? 0,
            reps: currentSet?.repsAchieved ?? 0,
            notes: currentSet?.notes ?? '',
          });
        } catch {
          // non-blocking fallback
        }

        return { ...prev, [exerciseId]: nextLogs };
      });
    },
    [sessionExercises, activeSession.dailyCoreFinisher, defaultLogsByExerciseId, getExerciseLogs, recordTaskCompletionStartTime, nextSetInfo]
  );

  // Stable callbacks for memoized ExerciseCard, Header, and widget components
  const handleOpenCueCard = useCallback((exId: string) => {
    setActiveCueCardId(exId);
  }, []);

  const handleQuickStartRest = useCallback((sec: number, explicitContext?: RestTargetContext) => {
    const resolvedContext = explicitContext || pendingRestContextRef.current || null;
    setActiveRestContext(resolvedContext);
    setActiveRestSeconds(sec);
  }, []);

  const handleStartNextSet = useCallback(() => {
    const targetId =
      activeRestContext?.isLastSet && activeRestContext?.nextExerciseId
        ? activeRestContext.nextExerciseId
        : activeRestContext?.exerciseId;

    if (targetId) {
      const el = document.getElementById(`exercise-card-${targetId}`);
      if (el && typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeRestContext]);

  const handleQuickStartRestForExercise = useCallback(
    (sec: number, exercise: WorkoutExercise) => {
      const isCore =
        exercise.id.startsWith('t3_sp_') ||
        Boolean(activeSession.dailyCoreFinisher?.some((e) => e.id === exercise.id));
      if (isCore) return;

      if (pendingRestContextRef.current && pendingRestContextRef.current.exerciseId === exercise.id) {
        handleQuickStartRest(sec, pendingRestContextRef.current);
        return;
      }

      const logs = getExerciseLogs(exercise);
      const firstUnfinishedIdx = logs.findIndex((l) => !l.isCompleted);
      const completedCount = logs.filter((l) => l.isCompleted).length;
      const isAllDone = logs.length > 0 && logs.every((l) => l.isCompleted);

      let nextSetNumber: number | undefined;
      let nextExerciseName: string | undefined;
      let nextExerciseId: string | undefined;

      if (!isAllDone && firstUnfinishedIdx >= 0) {
        nextSetNumber = firstUnfinishedIdx + 1;
        nextExerciseName = undefined;
        nextExerciseId = undefined;
      } else {
        const currentIdx = sessionExercises.findIndex((e) => e.id === exercise.id);
        if (currentIdx >= 0 && currentIdx < sessionExercises.length - 1) {
          nextExerciseName = sessionExercises[currentIdx + 1].name;
          nextExerciseId = sessionExercises[currentIdx + 1].id;
          nextSetNumber = 1;
        } else if (activeSession.dailyCoreFinisher && activeSession.dailyCoreFinisher.length > 0) {
          nextExerciseName = activeSession.dailyCoreFinisher[0].name;
          nextExerciseId = activeSession.dailyCoreFinisher[0].id;
          nextSetNumber = 1;
        }
      }

      const fallbackContext: RestTargetContext = {
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        completedSetNumber: completedCount > 0 ? completedCount : undefined,
        totalSets: logs.length,
        nextSetNumber,
        nextExerciseName,
        nextExerciseId,
        isLastSet: isAllDone,
        nextSet: nextSetInfo(nextExerciseId || exercise.id, nextSetNumber),
      };

      handleQuickStartRest(sec, fallbackContext);
    },
    [getExerciseLogs, handleQuickStartRest, sessionExercises, activeSession.dailyCoreFinisher, nextSetInfo]
  );

  // First unfinished set in session order, for the "Next" jump button
  const nextOpenSet = useMemo(
    () => resolveSetTarget(null, [...sessionExercises, ...(activeSession.dailyCoreFinisher || [])], getExerciseLogs),
    [sessionExercises, activeSession.dailyCoreFinisher, getExerciseLogs]
  );
  const handleJumpToNextSet = useCallback(() => {
    if (!nextOpenSet) return;
    const el = document.getElementById(`exercise-card-${nextOpenSet.exercise.id}`);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 76; // clear the sticky header
    window.scrollTo({ top, behavior: 'smooth' });
  }, [nextOpenSet]);

  return { handleJumpToNextSet, handleOpenCueCard, handleQuickStartRest, handleQuickStartRestForExercise, handleStartNextSet, handleUpdateSetLog, nextOpenSet };
}
