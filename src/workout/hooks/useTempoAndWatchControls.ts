// Extracted from src/App.tsx (WorkoutAppMain). Same hooks in the same order; inputs come in as args.
import { type Dispatch, type SetStateAction, useCallback, useEffect, useRef } from 'react';
import { type SetLogRecord } from '../../components/ExerciseCard';
import { type RestTargetContext } from '../../components/RestTimerWidget';
import { extractTargetReps, type WorkoutExercise, type WorkoutSession } from '../../domain/programData';
import { commandFromMessage, parseWatchCommand, resolveSetTarget, type WatchCommand } from '../../timer/watchCommands';

export interface UseTempoAndWatchControlsArgs {
  activeSession: WorkoutSession;
  activeTempoExerciseId: string | null;
  adaptedSessions: Record<string, WorkoutSession>;
  getExerciseLogs: (exercise: WorkoutExercise) => SetLogRecord[];
  handleQuickStartRest: (sec: number, explicitContext?: RestTargetContext) => void;
  handleQuickStartRestForExercise: (sec: number, exercise: WorkoutExercise) => void;
  handleUpdateSetLog: (exerciseId: string, setIndex: number, updated: Partial<SetLogRecord>) => void;
  sessionExercises: WorkoutExercise[];
  setActiveRestSeconds: Dispatch<SetStateAction<number | null>>;
  setActiveTempo: Dispatch<SetStateAction<string | null>>;
  setActiveTempoExerciseId: Dispatch<SetStateAction<string | null>>;
  setActiveTempoTargetReps: Dispatch<SetStateAction<number | undefined>>;
  setIsWeeklyModalOpen: Dispatch<SetStateAction<boolean>>;
}

export function useTempoAndWatchControls({ activeSession, activeTempoExerciseId, adaptedSessions, getExerciseLogs, handleQuickStartRest, handleQuickStartRestForExercise, handleUpdateSetLog, sessionExercises, setActiveRestSeconds, setActiveTempo, setActiveTempoExerciseId, setActiveTempoTargetReps, setIsWeeklyModalOpen }: UseTempoAndWatchControlsArgs) {
  // Watch / Tasker controls: notification buttons (forwarded by the service worker) and ?cmd= URLs
  const watchCommandRef = useRef<(c: WatchCommand) => void>(() => {});
  watchCommandRef.current = (c: WatchCommand) => {
    if (c.cmd === 'rest') {
      handleQuickStartRest(c.sec);
      return;
    }
    const exercises = [...sessionExercises, ...(activeSession.dailyCoreFinisher || [])];
    const hit = resolveSetTarget(c.target, exercises, getExerciseLogs);
    if (!hit) return;
    handleUpdateSetLog(hit.exercise.id, hit.setIndex, { isCompleted: true });
    if (hit.exercise.restSeconds > 0) handleQuickStartRestForExercise(hit.exercise.restSeconds, hit.exercise);
  };
  useEffect(() => {
    const fromUrl = parseWatchCommand(window.location.search);
    if (fromUrl) {
      try {
        const url = new URL(window.location.href);
        ['cmd', 'sec', 'ex', 'set'].forEach((k) => url.searchParams.delete(k));
        window.history.replaceState(null, '', url.pathname + url.search + url.hash);
      } catch {
        // leave the URL as is
      }
      // after the first render has the session's logs
      setTimeout(() => watchCommandRef.current(fromUrl), 0);
    }
    const sw = typeof navigator !== 'undefined' ? navigator.serviceWorker : undefined;
    if (!sw) return;
    const onMessage = (e: MessageEvent) => {
      const c = commandFromMessage(e.data);
      if (c) watchCommandRef.current(c);
    };
    sw.addEventListener('message', onMessage);
    return () => sw.removeEventListener('message', onMessage);
  }, []);

  const handleQuickStartTempo = useCallback(
    (tempo: string, exId?: string, targetReps?: number) => {
      setActiveTempo(tempo);
      const resolvedId = exId || sessionExercises.find((e) => e.tempo === tempo)?.id || null;
      setActiveTempoExerciseId(resolvedId);
      setActiveTempoTargetReps(targetReps);
    },
    [sessionExercises]
  );

  const handleTempoSetComplete = useCallback(
    (completedReps: number) => {
      if (!activeTempoExerciseId) return;

      const allExercises = [
        ...Object.values(adaptedSessions).flatMap((s) => [
          ...s.exercises,
          ...(s.dailyCoreFinisher || []),
        ]),
        ...sessionExercises,
        ...(activeSession.dailyCoreFinisher || []),
      ];
      const ex = allExercises.find((e) => e.id === activeTempoExerciseId);
      if (!ex) return;

      const currentLogs = getExerciseLogs(ex);
      const uncompletedIndex = currentLogs.findIndex((s) => !s.isCompleted);
      if (uncompletedIndex === -1) return;

      const targetSet = currentLogs[uncompletedIndex];
      const isNoWeight =
        ex.equipment === 'bodyweight' ||
        targetSet.weightLbs === 0 ||
        (!ex.defaultWeightLbs && !ex.defaultWeight);

      const parsedTarget = extractTargetReps(targetSet.targetReps || ex.targetReps, 10);
      const repsAchieved =
        completedReps > 0
          ? completedReps
          : parsedTarget;

      if (isNoWeight) {
        handleUpdateSetLog(ex.id, uncompletedIndex, {
          isCompleted: true,
          repsAchieved,
          notes: targetSet.notes ? `${targetSet.notes} · Tempo Cadence` : 'Tempo Cadence',
        });
      } else {
        const workingWeight =
          targetSet.weightLbs > 0
            ? targetSet.weightLbs
            : ex.defaultWeightLbs || ex.defaultWeight || 0;
        handleUpdateSetLog(ex.id, uncompletedIndex, {
          isCompleted: true,
          repsAchieved,
          weightLbs: workingWeight,
          notes: targetSet.notes ? `${targetSet.notes} · Tempo Cadence` : 'Tempo Cadence',
        });
      }

      if (ex.restSeconds > 0) {
        handleQuickStartRest(ex.restSeconds);
      }
    },
    [activeTempoExerciseId, adaptedSessions, sessionExercises, activeSession.dailyCoreFinisher, getExerciseLogs, handleUpdateSetLog, handleQuickStartRest]
  );

  const handleOpenWeeklyEvaluation = useCallback(() => {
    setIsWeeklyModalOpen(true);
  }, []);

  const handleClearActivePreset = useCallback(() => {
    setActiveRestSeconds(null);
  }, []);

  return { handleClearActivePreset, handleOpenWeeklyEvaluation, handleQuickStartTempo, handleTempoSetComplete };
}
