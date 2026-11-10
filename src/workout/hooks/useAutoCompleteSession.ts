// Extracted from src/App.tsx (WorkoutAppMain). Same hooks in the same order; inputs come in as args.
import { type Dispatch, type RefObject, type SetStateAction, useEffect, useState } from 'react';
import { type SetLogRecord } from '../../components/ExerciseCard';
import { RECOVERY_SESSIONS, WORKOUT_SESSIONS, type WorkoutExercise, type WorkoutSession } from '../../domain/programData';
import { clearSessionMarks, finishedToday, isLeftoverFromEarlierDay, pickSessionLogs, sessionLogKeys } from '../../domain/sessionReset';
import { autoLogWorkoutToGoogleCalendar } from '../../services/calendarSyncService';
import { isTestEnvironment } from '../../services/firebaseAuth';
import { STORAGE_KEY_LOGS, STORAGE_KEY_PHASE_TASKS, STORAGE_KEY_WARMUPS } from '../../storage/appStorageKeys';
import { CompletedWorkoutSession, storageManager } from '../../storage/storageManager';

export interface UseAutoCompleteSessionArgs {
  activeSession: WorkoutSession;
  activeSessionId: string;
  completedWarmups: Record<string, boolean>;
  completedWorkouts: Record<string, CompletedWorkoutSession>;
  currentSessionCompletion: number;
  deloadRef: RefObject<boolean>;
  handleSyncFinishedWorkout: (record: CompletedWorkoutSession) => Promise<void>;
  isSyncing: boolean;
  lastAutoSyncedSessionRef: RefObject<string | null>;
  pendingLogsRef: RefObject<Record<string, SetLogRecord[]> | null>;
  phaseTasks: Record<string, boolean>;
  sessionExercises: WorkoutExercise[];
  sessionStartTimes: Record<string, string>;
  sessionTelemetry: { totalTonnageLbs: number; prCount: number; topE1RM: number; };
  setCompletedWarmups: Dispatch<SetStateAction<Record<string, boolean>>>;
  setPhaseTasks: Dispatch<SetStateAction<Record<string, boolean>>>;
  setWorkoutLogs: Dispatch<SetStateAction<Record<string, SetLogRecord[]>>>;
  workoutLogs: Record<string, SetLogRecord[]>;
}

export function useAutoCompleteSession({ activeSession, activeSessionId, completedWarmups, completedWorkouts, currentSessionCompletion, deloadRef, handleSyncFinishedWorkout, isSyncing, lastAutoSyncedSessionRef, pendingLogsRef, phaseTasks, sessionExercises, sessionStartTimes, sessionTelemetry, setCompletedWarmups, setPhaseTasks, setWorkoutLogs, workoutLogs }: UseAutoCompleteSessionArgs) {
  // Auto-record to Workout History & Auto-sync to Google Sheets whenever workout session reaches 100% completion
  useEffect(() => {
    if (currentSessionCompletion === 100) {
      // leftover 100% from a workout finished on an earlier day: it is about to be cleared, not a new workout
      if (
        isLeftoverFromEarlierDay(
          activeSession,
          { logs: workoutLogs, warmups: completedWarmups, phases: phaseTasks },
          Object.values(storageManager.getCompletedWorkouts()),
          sessionStartTimes[activeSessionId],
          new Date(new Date().toDateString()).getTime()
        )
      ) {
        return;
      }
      const today = new Date().toISOString().split('T')[0];
      const completedId = activeSessionId;
      const completedTitle = activeSession.title;
      // compare local calendar days (an evening workout is already "tomorrow" in UTC)
      const alreadySaved = finishedToday(Object.values(storageManager.getCompletedWorkouts()), completedId);
      if (!alreadySaved) {
        const completedAt = new Date().toISOString();
        const startedAt = sessionStartTimes[completedId] || completedAt;
        const durationMs = Math.max(0, new Date(completedAt).getTime() - new Date(startedAt).getTime());
        const totalDurationSeconds = Math.round(durationMs / 1000);

        const completedRecord: CompletedWorkoutSession = {
          ...(deloadRef.current ? { deload: true } : {}),
          id: `completed_${completedId}_${Date.now()}`,
          date: completedAt,
          startedAt,
          completedAt,
          totalDurationSeconds,
          sessionId: completedId,
          sessionTitle: completedTitle,
          logs: pickSessionLogs(activeSession, workoutLogs),
          adherencePercentage: 100,
          completedExercisesCount: sessionExercises.length,
          totalExercisesCount: sessionExercises.length,
          totalVolumeLbs: sessionTelemetry.totalTonnageLbs,
          skippedExercises: [],
          autoSaved: true,
        };
        storageManager.saveCompletedWorkout(completedRecord);
        autoLogWorkoutToGoogleCalendar(completedRecord);
      }

      if (!isTestEnvironment()) {
        const syncKey = `${activeSessionId}_${today}_100`;
        if (lastAutoSyncedSessionRef.current !== syncKey && !isSyncing) {
          lastAutoSyncedSessionRef.current = syncKey;
          // write this finished workout (not the live logs of every session) to the sheet
          const finished = Object.values(storageManager.getCompletedWorkouts())
            .filter((w) => w.sessionId === activeSessionId)
            .sort((a, b) => +new Date(b.completedAt || b.date) - +new Date(a.completedAt || a.date))[0];
          if (finished) void handleSyncFinishedWorkout(finished);
        }
      }
    }
  }, [
    currentSessionCompletion,
    activeSessionId,
    activeSession,
    workoutLogs,
    sessionExercises,
    sessionTelemetry,
    sessionStartTimes,
    isSyncing,
    handleSyncFinishedWorkout,
  ]);

  // Every workout starts unmarked: a session finished on an earlier day has its set, warmup and phase
  // check-offs cleared (weights kept). Today's finished workout stays visible until the day is over.
  const [todayKey, setTodayKey] = useState(() => new Date().toDateString());
  useEffect(() => {
    const refresh = () => setTodayKey(new Date().toDateString());
    const timer = setInterval(refresh, 5 * 60 * 1000);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  useEffect(() => {
    const startOfToday = new Date(todayKey).getTime();
    // read history straight from storage: it is updated before React state when a workout is finished
    const history = Object.values(storageManager.getCompletedWorkouts());
    let marks = { logs: workoutLogs, warmups: completedWarmups, phases: phaseTasks };
    let changed = false;
    for (const session of [...WORKOUT_SESSIONS, ...RECOVERY_SESSIONS]) {
      if (!isLeftoverFromEarlierDay(session, marks, history, sessionStartTimes[session.id], startOfToday)) continue;
      marks = clearSessionMarks(session, marks);
      changed = true;
    }
    if (!changed) return;
    setWorkoutLogs(marks.logs);
    setCompletedWarmups(marks.warmups);
    setPhaseTasks(marks.phases);
    for (const session of [...WORKOUT_SESSIONS, ...RECOVERY_SESSIONS]) {
      sessionLogKeys(session).forEach((k) => {
        if (workoutLogs[k] && marks.logs[k] !== workoutLogs[k]) {
          try {
            storageManager.updateWorkoutLog(k, { completed: false, reps: 0, notes: '' });
          } catch {
            // non-blocking fallback
          }
        }
      });
    }
    pendingLogsRef.current = marks.logs;
    try {
      localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(marks.logs));
      localStorage.setItem(STORAGE_KEY_WARMUPS, JSON.stringify(marks.warmups));
      localStorage.setItem(STORAGE_KEY_PHASE_TASKS, JSON.stringify(marks.phases));
    } catch {
      // safe fallback
    }
    // Runs on load and whenever history changes; reading the latest marks is intentional
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completedWorkouts, todayKey]);

  return {  };
}
