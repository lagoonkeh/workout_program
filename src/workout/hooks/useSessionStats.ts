// Extracted from src/App.tsx (WorkoutAppMain). Same hooks in the same order; inputs come in as args.
import { useMemo } from 'react';
import { type SetLogRecord } from '../../components/ExerciseCard';
import { SessionProgressStats } from '../../components/SessionNav';
import { createUnilateralSideExercises, WORKOUT_SESSIONS, type WorkoutExercise, type WorkoutSession } from '../../domain/programData';

export interface UseSessionStatsArgs {
  activeSessionId: string;
  adaptedSessions: Record<string, WorkoutSession>;
  sessionExercises: WorkoutExercise[];
  splitSidesExercises: Record<string, boolean>;
  workoutLogs: Record<string, SetLogRecord[]>;
}

export function useSessionStats({ activeSessionId, adaptedSessions, sessionExercises, splitSidesExercises, workoutLogs }: UseSessionStatsArgs) {
  // Compute session stats for SessionNav
  const sessionStats = useMemo(() => {
    const stats: Record<string, SessionProgressStats> = {};

    WORKOUT_SESSIONS.forEach((session) => {
      let totalSets = 0;
      let completedSets = 0;
      let completedExercises = 0;

      // this week's plan: deload set counts, Cycle B / custom variations and adaptations
      const planned = adaptedSessions[session.id]?.exercises || session.exercises;
      const exercises = planned.flatMap((ex) => {
        if (splitSidesExercises[ex.id]) {
          const { left, right } = createUnilateralSideExercises(ex);
          return [left, right];
        }
        return [ex];
      });

      exercises.forEach((ex) => {
        totalSets += ex.targetSets;
        const exLogs = workoutLogs[ex.id] || [];
        const finishedInExercise = exLogs.filter((l) => l.isCompleted || l.notes?.includes('[NOT DONE]')).length;
        completedSets += finishedInExercise;
        if (finishedInExercise >= ex.targetSets && ex.targetSets > 0) {
          completedExercises++;
        }
      });

      stats[session.id] = {
        completedSets,
        totalSets,
        completedExercises,
        totalExercises: exercises.length,
        isComplete: completedExercises === exercises.length && exercises.length > 0,
      };
    });

    return stats;
  }, [workoutLogs, splitSidesExercises, adaptedSessions]);

  // Overall active session completion percentage
  const currentSessionCompletion = useMemo(() => {
    const stat = sessionStats[activeSessionId];
    if (!stat || stat.totalSets === 0) return 0;
    return Math.round((stat.completedSets / stat.totalSets) * 100);
  }, [sessionStats, activeSessionId]);

  // Live Session Telemetry (Tonnage, PR Count, Top e1RM) inspired by Hevy & Boostcamp
  const sessionTelemetry = useMemo(() => {
    let totalTonnageLbs = 0;
    let prCount = 0;
    let topE1RM = 0;

    sessionExercises.forEach((ex) => {
      const logs = workoutLogs[ex.id] || [];
      const baseW = ex.defaultWeightLbs || ex.defaultWeight || 0;
      const matches = String(ex.targetReps).match(/\d+/g);
      const targetMax = matches && matches.length > 0 ? Math.max(...matches.map(Number)) : 8;
      const baselineE1RM = baseW > 0 ? Math.round(baseW * (1 + targetMax / 30)) : 0;

      let exHitPR = false;
      logs.forEach((log) => {
        if (log.isCompleted) {
          const w = Number(log.weightLbs) || 0;
          const r = Number(log.repsAchieved) || 0;
          if (w > 0 && r > 0) {
            totalTonnageLbs += w * r;
            const e1rm = r === 1 ? w : Math.round(w * (1 + r / 30));
            if (e1rm > topE1RM) topE1RM = e1rm;
            if (baselineE1RM > 0 && e1rm > baselineE1RM) {
              exHitPR = true;
            }
          } else if (r > targetMax) {
            exHitPR = true;
          }
        }
      });
      if (exHitPR) prCount++;
    });

    return { totalTonnageLbs: Math.round(totalTonnageLbs), prCount, topE1RM };
  }, [sessionExercises, workoutLogs]);

  return { currentSessionCompletion, sessionStats, sessionTelemetry };
}
