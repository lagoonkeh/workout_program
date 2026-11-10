// Extracted from src/App.tsx (WorkoutAppMain). Same hooks in the same order; inputs come in as args.
import { type Dispatch, type RefObject, type SetStateAction, useCallback } from 'react';
import { audioSynthesizer } from '../../audio/audioSynthesizer';
import { SetLogRecord } from '../../components/ExerciseCard';
import { annotateWorkoutLogsForSkipped, applySkippedExerciseAdjustments, auditSessionCompletion, type SessionCompletionAudit, SkippedExerciseAdjustment, SkippedExerciseRecord } from '../../domain/adaptiveAdjustments';
import { extractTargetReps, WORKOUT_SESSIONS, type WorkoutExercise, WorkoutSession } from '../../domain/programData';
import { findAutoSavedToday, pickSessionLogs } from '../../domain/sessionReset';
import { autoLogWorkoutToGoogleCalendar } from '../../services/calendarSyncService';
import { isTestEnvironment } from '../../services/firebaseAuth';
import { clearRemoteWorkoutHistory, STORAGE_KEY_LAST_SCANNED_WORKOUT, STORAGE_KEY_LAST_SYNC } from '../../services/sheetSyncService';
import { STORAGE_KEY_LOGS, STORAGE_KEY_PHASE_TASKS, STORAGE_KEY_SESSION, STORAGE_KEY_SESSION_START_TIMES, STORAGE_KEY_WARMUPS } from '../../storage/appStorageKeys';
import { CompletedWorkoutSession, storageManager } from '../../storage/storageManager';
import { createDefaultExerciseLogs } from '../shared';

export interface UseSessionCompletionArgs {
  activeSession: WorkoutSession;
  activeSessionId: string;
  currentSessionCompletion: number;
  defaultLogsByExerciseId: Record<string, SetLogRecord[]>;
  deloadRef: RefObject<boolean>;
  handleScanLastWorkout: () => Promise<void>;
  handleSyncFinishedWorkout: (record: CompletedWorkoutSession) => Promise<void>;
  isMuted: boolean;
  lastAutoSyncedSessionRef: RefObject<string | null>;
  programAdaptations: Record<string, Partial<WorkoutExercise>>;
  sessionAuditResult: SessionCompletionAudit | null;
  sessionExercises: WorkoutExercise[];
  sessionStartTimes: Record<string, string>;
  sessionTelemetry: { totalTonnageLbs: number; prCount: number; topE1RM: number; };
  setActiveSessionId: Dispatch<SetStateAction<string>>;
  setCompletedWorkouts: Dispatch<SetStateAction<Record<string, CompletedWorkoutSession>>>;
  setIsSavingAndAdvancing: Dispatch<SetStateAction<boolean>>;
  setIsWorkoutCompletionModalOpen: Dispatch<SetStateAction<boolean>>;
  setProgramAdaptations: Dispatch<SetStateAction<Record<string, Partial<WorkoutExercise>>>>;
  setSessionAuditResult: Dispatch<SetStateAction<SessionCompletionAudit | null>>;
  setSessionCompletionToast: Dispatch<SetStateAction<{ completedTitle: string; completedId: string; nextTitle: string; nextId: string; durationSeconds?: number; calendarLogged?: boolean; calendarEventLink?: string; } | null>>;
  setSessionStartTimes: Dispatch<SetStateAction<Record<string, string>>>;
  setWorkoutLogs: Dispatch<SetStateAction<Record<string, SetLogRecord[]>>>;
  workoutLogs: Record<string, SetLogRecord[]>;
}

export function useSessionCompletion({ activeSession, activeSessionId, currentSessionCompletion, defaultLogsByExerciseId, deloadRef, handleScanLastWorkout, handleSyncFinishedWorkout, isMuted, lastAutoSyncedSessionRef, programAdaptations, sessionAuditResult, sessionExercises, sessionStartTimes, sessionTelemetry, setActiveSessionId, setCompletedWorkouts, setIsSavingAndAdvancing, setIsWorkoutCompletionModalOpen, setProgramAdaptations, setSessionAuditResult, setSessionCompletionToast, setSessionStartTimes, setWorkoutLogs, workoutLogs }: UseSessionCompletionArgs) {
  // Reset logs for active session
  const handleResetSessionLogs = useCallback(() => {
    setSessionStartTimes((prev) => {
      if (!prev[activeSessionId]) return prev;
      const nextTimes = { ...prev };
      delete nextTimes[activeSessionId];
      try {
        localStorage.setItem(STORAGE_KEY_SESSION_START_TIMES, JSON.stringify(nextTimes));
      } catch {
        // safe fallback
      }
      return nextTimes;
    });

    setWorkoutLogs((prev) => {
      const next = { ...prev };
      const allToReset = [
        ...sessionExercises,
        ...(activeSession.dailyCoreFinisher || []),
      ];
      allToReset.forEach((ex) => {
        delete next[ex.id];
        try {
          storageManager.updateWorkoutLog(ex.id, {
            completed: false,
            weight: ex.defaultWeightLbs || ex.defaultWeight || 0,
            reps: 0,
            notes: '',
          });
        } catch {
          // non-blocking fallback
        }
      });
      return next;
    });
  }, [activeSessionId, sessionExercises, activeSession.dailyCoreFinisher]);

  // Permanently delete all workout history and start completely fresh
  const handleResetAllAndStartFresh = useCallback(() => {
    storageManager.clearCompletedWorkouts();
    storageManager.saveImmediate({ currentLogs: {} });
    setWorkoutLogs({});
    setSessionStartTimes({});
    setActiveSessionId('lower_a');
    try {
      localStorage.removeItem(STORAGE_KEY_LAST_SCANNED_WORKOUT);
      localStorage.removeItem(STORAGE_KEY_LAST_SYNC);
      localStorage.removeItem(STORAGE_KEY_LOGS);
      localStorage.removeItem(STORAGE_KEY_SESSION);
      localStorage.removeItem(STORAGE_KEY_WARMUPS);
      localStorage.removeItem(STORAGE_KEY_PHASE_TASKS);
      localStorage.removeItem(STORAGE_KEY_SESSION_START_TIMES);
      localStorage.removeItem('workout_session_start_time_v1');
      localStorage.removeItem('workout_session_first_task_time_v1');
    } catch {
      // safe fallback
    }
    void clearRemoteWorkoutHistory();
    handleScanLastWorkout();
  }, [handleScanLastWorkout]);

  // Finalize workout completion, guarantee data persistence, and refresh page to next workout
  const finalizeSessionCompletionAndRefresh = useCallback(
    async (
      completedRecord: CompletedWorkoutSession,
      nextSessionId: string,
      nextSession: WorkoutSession,
      finalLogs: Record<string, SetLogRecord[]>
    ) => {
      setIsSavingAndAdvancing(true);

      // 1. Durably persist completed workout into storageManager memory and LocalStorage
      storageManager.saveCompletedWorkout(completedRecord);
      setCompletedWorkouts(storageManager.getCompletedWorkouts());

      // 2. Direct synchronous localStorage write for instant persistence across page refreshes
      try {
        localStorage.setItem(STORAGE_KEY_SESSION, nextSessionId);
        localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(finalLogs));
      } catch (e) {
        console.warn('[App] Direct storage flush warning:', e);
      }
      storageManager.saveImmediate({ activeSessionId: nextSessionId });

      // 3. Clear session start times for the completed session
      setSessionStartTimes((prev) => {
        const nextTimes = { ...prev };
        delete nextTimes[completedRecord.sessionId];
        try {
          localStorage.setItem(STORAGE_KEY_SESSION_START_TIMES, JSON.stringify(nextTimes));
        } catch {
          // safe fallback
        }
        return nextTimes;
      });

      // 4. Remote Google Sheets auto-sync with confirmed await
      if (!isTestEnvironment()) {
        const today = new Date().toISOString().split('T')[0];
        lastAutoSyncedSessionRef.current = `${completedRecord.sessionId}_${today}_100`;
        try {
          await Promise.race([
            handleSyncFinishedWorkout(completedRecord),
            new Promise((resolve) => setTimeout(resolve, 1500)),
          ]);
        } catch (err) {
          console.warn('[App] Remote sheets sync error:', err);
        }
      }

      // 5. Google Calendar auto-log
      void autoLogWorkoutToGoogleCalendar(completedRecord).then((res) => {
        if (res.success) {
          setSessionCompletionToast((prev) =>
            prev ? { ...prev, calendarLogged: true, calendarEventLink: res.eventLink } : prev
          );
        }
      });

      // 6. Close modal & audio chime
      setIsWorkoutCompletionModalOpen(false);
      setSessionAuditResult(null);
      if (!isMuted) {
        audioSynthesizer.playTone('completion');
      }

      // 7. Update activeSessionId and toast
      setActiveSessionId(nextSessionId);
      setSessionCompletionToast({
        completedTitle: completedRecord.sessionTitle || completedRecord.sessionId,
        completedId: completedRecord.sessionId,
        nextTitle: nextSession.title,
        nextId: nextSession.id,
        durationSeconds: completedRecord.totalDurationSeconds,
      });

      // 8. Re-scan last workout to update smart recommender
      handleScanLastWorkout();

      // 9. Automatically refresh to the next workout page
      if (typeof window !== 'undefined' && !isTestEnvironment()) {
        try {
          window.scrollTo({ top: 0, behavior: 'instant' });
        } catch {
          // fallback
        }
        setTimeout(() => {
          try {
            window.location.reload();
          } catch {
            setIsSavingAndAdvancing(false);
          }
        }, 500);
      } else {
        setIsSavingAndAdvancing(false);
      }
    },
    [handleSyncFinishedWorkout, handleScanLastWorkout, isMuted]
  );

  // Toggle or mark entire workout session as completed
  const handleToggleWorkoutCompleted = useCallback(() => {
    const isCurrently100 = currentSessionCompletion === 100;
    const allSessionIds: string[] = WORKOUT_SESSIONS.map((s) => s.id);
    const currentIndex = allSessionIds.indexOf(activeSessionId);
    const nextSessionId = allSessionIds[(currentIndex + 1) % allSessionIds.length];
    const nextSession = WORKOUT_SESSIONS.find((s) => s.id === nextSessionId) || WORKOUT_SESSIONS[0];
    const completedTitle = activeSession.title;
    const completedId = activeSession.id;

    // Audit active session for uncompleted or skipped exercises
    const audit = auditSessionCompletion(activeSession, workoutLogs); // activeSession already carries adaptations (and deload set counts)
    if (audit.skippedExercises.length > 0 && !isCurrently100) {
      setSessionAuditResult(audit);
      setIsWorkoutCompletionModalOpen(true);
      return;
    }

    // Prepare complete workout logs for all exercises
    const finalLogs: Record<string, SetLogRecord[]> = { ...workoutLogs };
    sessionExercises.forEach((ex) => {
      const existing = workoutLogs[ex.id] || defaultLogsByExerciseId[ex.id] || createDefaultExerciseLogs(ex);
      const parsedTarget = extractTargetReps(ex.targetReps, 10);
      const updatedLogs = existing.map((set) => ({
        ...set,
        isCompleted: true,
        repsAchieved: set.repsAchieved > 0 ? set.repsAchieved : parsedTarget,
        weightLbs: set.weightLbs > 0 ? set.weightLbs : (ex.defaultWeightLbs || ex.defaultWeight || 0),
        notes: set.notes || '',
      }));
      finalLogs[ex.id] = updatedLogs;

      try {
        storageManager.updateWorkoutLog(ex.id, {
          completed: true,
          weight: ex.defaultWeightLbs || ex.defaultWeight || 0,
          reps: parsedTarget,
          notes: '',
        });
      } catch {
        // non-blocking fallback
      }
    });
    setWorkoutLogs(finalLogs);

    // Calculate workout duration from first completed task to completion click
    const completedAt = new Date().toISOString();
    const startedAt = sessionStartTimes[completedId] || completedAt;
    const durationMs = Math.max(0, new Date(completedAt).getTime() - new Date(startedAt).getTime());
    const totalDurationSeconds = Math.round(durationMs / 1000);

    // Persist completed workout session to history
    // Update today's auto-saved record (made when the session hit 100%) instead of logging the workout twice
    const autoSaved = findAutoSavedToday(Object.values(storageManager.getCompletedWorkouts()), completedId);
    const completedRecord: CompletedWorkoutSession = {
          ...(deloadRef.current ? { deload: true } : {}),
      id: autoSaved?.id || `completed_${completedId}_${Date.now()}`,
      autoSaved: false,
      date: completedAt,
      startedAt,
      completedAt,
      totalDurationSeconds,
      sessionId: completedId,
      sessionTitle: completedTitle,
      logs: pickSessionLogs(activeSession, finalLogs),
      adherencePercentage: 100,
      completedExercisesCount: sessionExercises.length,
      totalExercisesCount: sessionExercises.length,
      totalVolumeLbs: sessionTelemetry.totalTonnageLbs,
      skippedExercises: [],
    };

    void finalizeSessionCompletionAndRefresh(completedRecord, nextSessionId, nextSession, finalLogs);
  }, [
    currentSessionCompletion,
    activeSessionId,
    activeSession,
    workoutLogs,
    programAdaptations,
    sessionExercises,
    defaultLogsByExerciseId,
    sessionStartTimes,
    sessionTelemetry.totalTonnageLbs,
    finalizeSessionCompletionAndRefresh,
  ]);

  // Save current active session directly into workout history
  const handleSaveCurrentSessionToHistory = useCallback(() => {
    const completedAt = new Date().toISOString();
    const startedAt = sessionStartTimes[activeSessionId] || completedAt;
    const durationMs = Math.max(0, new Date(completedAt).getTime() - new Date(startedAt).getTime());
    const totalDurationSeconds = Math.round(durationMs / 1000);

    const audit = auditSessionCompletion(activeSession, workoutLogs); // activeSession already carries adaptations (and deload set counts)
    const adherence = audit.totalExercises > 0
      ? Math.round((audit.completedExercises.length / audit.totalExercises) * 100)
      : 100;

    const completedRecord: CompletedWorkoutSession = {
          ...(deloadRef.current ? { deload: true } : {}),
      id: `completed_${activeSessionId}_${Date.now()}`,
      date: completedAt,
      startedAt,
      completedAt,
      totalDurationSeconds,
      sessionId: activeSessionId,
      sessionTitle: activeSession.title,
      logs: pickSessionLogs(activeSession, workoutLogs),
      adherencePercentage: adherence,
      completedExercisesCount: audit.completedExercises.length,
      totalExercisesCount: audit.totalExercises,
      totalVolumeLbs: sessionTelemetry.totalTonnageLbs,
      skippedExercises: audit.skippedExercises.map((sk) => ({
        exerciseId: sk.id,
        exerciseName: sk.name,
        reason: sk.reason,
        skippedSets: sk.skippedSets,
        targetSets: sk.targetSets,
      })),
    };
    storageManager.saveCompletedWorkout(completedRecord);
    autoLogWorkoutToGoogleCalendar(completedRecord);
    handleScanLastWorkout();
  }, [
    activeSessionId,
    activeSession,
    workoutLogs,
    programAdaptations,
    sessionStartTimes,
    sessionTelemetry.totalTonnageLbs,
    handleScanLastWorkout,
  ]);

  // Apply future adjustments for skipped exercises and complete session
  const handleApplyCompletionAdjustments = useCallback(
    (selectedAdjustments: SkippedExerciseAdjustment[]) => {
      if (!sessionAuditResult) return;

      const completedTitle = activeSession.title;
      const completedId = activeSession.id;
      const allSessionIds: string[] = WORKOUT_SESSIONS.map((s) => s.id);
      const currentIndex = allSessionIds.indexOf(activeSessionId);
      const nextSessionId = allSessionIds[(currentIndex + 1) % allSessionIds.length];
      const nextSession = WORKOUT_SESSIONS.find((s) => s.id === nextSessionId) || WORKOUT_SESSIONS[0];

      // 1. Formally annotate logs for skipped exercises with [NOT DONE]
      const annotatedLogs = annotateWorkoutLogsForSkipped(
        workoutLogs,
        sessionAuditResult.skippedExercises,
        activeSession.title
      );
      setWorkoutLogs(annotatedLogs);

      // 2. Record skipped exercises in athlete history
      const skippedRecords: SkippedExerciseRecord[] = sessionAuditResult.skippedExercises.map((sk) => {
        const matchingAdj = selectedAdjustments.find((a) => a.exerciseId === sk.id);
        return {
          id: `skip_${sk.id}_${Date.now()}`,
          exerciseId: sk.id,
          exerciseName: sk.name,
          sessionId: activeSession.id,
          sessionTitle: activeSession.title,
          skippedAt: new Date().toISOString(),
          originalSets: sk.targetSets,
          completedSets: sk.completedSets,
          proposedSets: matchingAdj?.proposedSets ?? sk.targetSets,
          autoAdjusted: !!matchingAdj,
          reason: sk.reason,
        };
      });
      storageManager.recordSkippedExercises(skippedRecords);

      // Calculate workout duration from first completed task to completion click
      const completedAt = new Date().toISOString();
      const startedAt = sessionStartTimes[completedId] || completedAt;
      const durationMs = Math.max(0, new Date(completedAt).getTime() - new Date(startedAt).getTime());
      const totalDurationSeconds = Math.round(durationMs / 1000);

      // Persist completed workout session to history
      // Update today's auto-saved record (made when the session hit 100%) instead of logging the workout twice
      const autoSaved = findAutoSavedToday(Object.values(storageManager.getCompletedWorkouts()), completedId);
      const completedRecord: CompletedWorkoutSession = {
          ...(deloadRef.current ? { deload: true } : {}),
        id: autoSaved?.id || `completed_${completedId}_${Date.now()}`,
        autoSaved: false,
        date: completedAt,
        startedAt,
        completedAt,
        totalDurationSeconds,
        sessionId: completedId,
        sessionTitle: completedTitle,
        logs: pickSessionLogs(activeSession, annotatedLogs),
        adherencePercentage: Math.round(
          (sessionAuditResult.completedExercises.length / sessionAuditResult.totalExercises) * 100
        ),
        completedExercisesCount: sessionAuditResult.completedExercises.length,
        totalExercisesCount: sessionAuditResult.totalExercises,
        totalVolumeLbs: sessionTelemetry.totalTonnageLbs,
        skippedExercises: sessionAuditResult.skippedExercises.map((sk) => ({
          exerciseId: sk.id,
          exerciseName: sk.name,
          reason: sk.reason,
          skippedSets: sk.skippedSets,
          targetSets: sk.targetSets,
        })),
      };

      // 3. Apply future adjustments into program adaptations
      const updatedAdaptations = applySkippedExerciseAdjustments(selectedAdjustments, programAdaptations);
      setProgramAdaptations(updatedAdaptations);
      storageManager.saveProgramAdaptations(updatedAdaptations);

      void finalizeSessionCompletionAndRefresh(completedRecord, nextSessionId, nextSession, annotatedLogs);
    },
    [
      sessionAuditResult,
      activeSession,
      activeSessionId,
      workoutLogs,
      programAdaptations,
      sessionStartTimes,
      sessionTelemetry.totalTonnageLbs,
      finalizeSessionCompletionAndRefresh,
    ]
  );

  // Complete workout acknowledging skipped exercises without modifying future volume
  const handleCompleteWithoutAdjustments = useCallback(() => {
    if (!sessionAuditResult) return;

    const completedTitle = activeSession.title;
    const completedId = activeSession.id;
    const allSessionIds: string[] = WORKOUT_SESSIONS.map((s) => s.id);
    const currentIndex = allSessionIds.indexOf(activeSessionId);
    const nextSessionId = allSessionIds[(currentIndex + 1) % allSessionIds.length];
    const nextSession = WORKOUT_SESSIONS.find((s) => s.id === nextSessionId) || WORKOUT_SESSIONS[0];

    // 1. Formally annotate logs for skipped exercises with [NOT DONE]
    const annotatedLogs = annotateWorkoutLogsForSkipped(
      workoutLogs,
      sessionAuditResult.skippedExercises,
      activeSession.title
    );
    setWorkoutLogs(annotatedLogs);

    // 2. Record skipped exercises in athlete history
    const skippedRecords: SkippedExerciseRecord[] = sessionAuditResult.skippedExercises.map((sk) => ({
      id: `skip_${sk.id}_${Date.now()}`,
      exerciseId: sk.id,
      exerciseName: sk.name,
      sessionId: activeSession.id,
      sessionTitle: activeSession.title,
      skippedAt: new Date().toISOString(),
      originalSets: sk.targetSets,
      completedSets: sk.completedSets,
      proposedSets: sk.targetSets,
      autoAdjusted: false,
      reason: sk.reason,
    }));
    storageManager.recordSkippedExercises(skippedRecords);

    // Calculate workout duration from first completed task to completion click
    const completedAt = new Date().toISOString();
    const startedAt = sessionStartTimes[completedId] || completedAt;
    const durationMs = Math.max(0, new Date(completedAt).getTime() - new Date(startedAt).getTime());
    const totalDurationSeconds = Math.round(durationMs / 1000);

    // Persist completed workout session to history
    // Update today's auto-saved record (made when the session hit 100%) instead of logging the workout twice
    const autoSaved = findAutoSavedToday(Object.values(storageManager.getCompletedWorkouts()), completedId);
    const completedRecord: CompletedWorkoutSession = {
          ...(deloadRef.current ? { deload: true } : {}),
      id: autoSaved?.id || `completed_${completedId}_${Date.now()}`,
      autoSaved: false,
      date: completedAt,
      startedAt,
      completedAt,
      totalDurationSeconds,
      sessionId: completedId,
      sessionTitle: completedTitle,
      logs: pickSessionLogs(activeSession, annotatedLogs),
      adherencePercentage: Math.round(
        (sessionAuditResult.completedExercises.length / sessionAuditResult.totalExercises) * 100
      ),
      completedExercisesCount: sessionAuditResult.completedExercises.length,
      totalExercisesCount: sessionAuditResult.totalExercises,
      totalVolumeLbs: sessionTelemetry.totalTonnageLbs,
      skippedExercises: sessionAuditResult.skippedExercises.map((sk) => ({
        exerciseId: sk.id,
        exerciseName: sk.name,
        reason: sk.reason,
        skippedSets: sk.skippedSets,
        targetSets: sk.targetSets,
      })),
    };

    void finalizeSessionCompletionAndRefresh(completedRecord, nextSessionId, nextSession, annotatedLogs);
  }, [
    sessionAuditResult,
    activeSession,
    activeSessionId,
    workoutLogs,
    sessionStartTimes,
    sessionTelemetry.totalTonnageLbs,
    finalizeSessionCompletionAndRefresh,
  ]);

  // Reset logs for a single exercise card
  const handleResetExerciseLogs = useCallback(
    (exerciseId: string) => {
      setWorkoutLogs((prev) => {
        const next = { ...prev };
        delete next[exerciseId];
        const ex = sessionExercises.find((e) => e.id === exerciseId) ||
                   activeSession.dailyCoreFinisher?.find((e) => e.id === exerciseId);
        if (ex) {
          try {
            storageManager.updateWorkoutLog(ex.id, {
              completed: false,
              weight: ex.defaultWeightLbs || ex.defaultWeight || 0,
              reps: 0,
              notes: '',
            });
          } catch {
            // non-blocking fallback
          }
        }
        return next;
      });
    },
    [sessionExercises, activeSession.dailyCoreFinisher]
  );

  return { handleApplyCompletionAdjustments, handleCompleteWithoutAdjustments, handleResetAllAndStartFresh, handleResetExerciseLogs, handleResetSessionLogs, handleSaveCurrentSessionToHistory, handleToggleWorkoutCompleted };
}
