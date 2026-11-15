import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  preloadLazyViews,
} from './lazyView';
import { sessionToOpen } from './domain/nextSession';
import { increaseGate, gateReason, type ReadinessCheckIn } from './domain/trainingReadiness';
import { loadCachedHealth } from './domain/healthMetrics';
import { loadCnsChecks } from './domain/cnsReadiness';
import { HEALTH_UPDATED_EVENT, loadCachedWorkouts } from './domain/healthWorkouts';
import { migrateMeadowsRowOnce, removeNov1PhantomsOnce, removeSheetCopiesOnce, repairSheetHistory } from './services/historyRepair';
import {
  WORKOUT_PROGRAM,
  WORKOUT_SESSIONS,
  RECOVERY_SESSIONS,
  WorkoutExercise,
  createUnilateralSideExercises,
  isUnilateralExercise,
} from './domain/programData';
import {
  WorkoutCycle,
  ExerciseVariation,
  loadSessionCycles,
  saveSessionCycle,
  loadCustomVariations,
  saveCustomVariation,
  getExerciseVariations,
  getCycleVariation,
  variationToWorkoutExercise,
  STORAGE_KEY_CUSTOM_VARIATIONS,
} from './domain/exerciseVariations';
import { loadCueCards, useCueCardLookup } from './domain/cueCardStore';
import { audioSynthesizer } from './audio/audioSynthesizer';
import { storageManager, CompletedWorkoutSession } from './storage/storageManager';
import { Header, AppViewMode } from './components/Header';
import { SessionNav } from './components/SessionNav';
import { SetLogRecord } from './components/ExerciseCard';
import { RestTimerWidget, RestTargetContext } from './components/RestTimerWidget';
import {
  scanLastWorkout,
  LastWorkoutScanResult,
  STORAGE_KEY_LAST_SCANNED_WORKOUT,
} from './services/sheetSyncService';
import { useSheetsSync } from './hooks/useSheetsSync';
import { restoreAppBackupIfNewer, startAppBackupAutoSync } from './services/appBackupService';
import { useCloudSync } from './hooks/useCloudSync';
import { isTestEnvironment } from './services/firebaseAuth';
import {
  SessionCompletionAudit,
} from './domain/adaptiveAdjustments';
import { evaluateWeeklyPerformance, WorkoutAdaptation } from './domain/weeklyEvaluator';
import {
  findLastPerformance,
  suggestNextLoad,
  deloadStatus,
  deloadSets,
  resizeSets,
  type HistoryRecord,
  type LastPerformance,
  type LoadSuggestion,
} from './domain/progression';
import {
  type NextSetInfo,
} from './timer/watchCommands';
import { MobilityEntry } from './domain/mobility';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthGate } from './components/AuthGate';
import {
  STORAGE_KEY_LOGS,
  STORAGE_KEY_SESSION,
  STORAGE_KEY_VIEW,
  STORAGE_KEY_SESSION_OVERVIEW_COLLAPSED,
  STORAGE_KEY_FOCUS_MODE,
  STORAGE_KEY_SPLIT_SIDES,
  STORAGE_KEY_HIDE_COMPLETED_SESSIONS,
  STORAGE_KEY_SESSION_START_TIMES,
  STORAGE_KEY_LOAD_SUGGESTIONS,
  STORAGE_KEY_DELOAD_POSTPONED,
} from './storage/appStorageKeys';
import { createDefaultExerciseLogs, type AppliedSuggestion } from './workout/shared';
import { SessionOverviewCard } from './workout/SessionOverviewCard';
import { WarmupSection } from './workout/WarmupSection';
import { WorkoutCompleteCard } from './workout/WorkoutCompleteCard';
import { ExerciseTierSections } from './workout/ExerciseTierSections';
import { AppOverlays } from './workout/AppOverlays';
import { BottomNavBar } from './workout/BottomNavBar';
import { SecondaryViews } from './workout/SecondaryViews';
import { SessionCompletionToast } from './workout/SessionCompletionToast';
import { MobilityReminderBanner } from './workout/MobilityReminderBanner';
import { SyncToastBanner } from './workout/SyncToastBanner';
import { useActiveCueCard } from './workout/hooks/useActiveCueCard';
import { useSessionCompletion } from './workout/hooks/useSessionCompletion';
import { useAutoCompleteSession } from './workout/hooks/useAutoCompleteSession';
import { useSessionStats } from './workout/hooks/useSessionStats';
import { useTempoAndWatchControls } from './workout/hooks/useTempoAndWatchControls';
import { useSetLogging } from './workout/hooks/useSetLogging';
import { useMobilityCheckIn } from './workout/hooks/useMobilityCheckIn';
import { useWarmupProgress } from './workout/hooks/useWarmupProgress';

// The cue card data (~130 KB) is its own chunk; start fetching it as soon as the app module runs
void loadCueCards().catch(() => {});

export function WorkoutAppMain() {
  const { user } = useAuth();
  // One-time history repair, before anything reads history (see services/historyRepair)
  useState(() => {
    removeSheetCopiesOnce();
    removeNov1PhantomsOnce();
    migrateMeadowsRowOnce();
  });
  // O(1) lookup by id, exercise id, name or title; empty until the cue card chunk arrives
  const CUE_CARD_MAP = useCueCardLookup();

  // Fetch the secondary view chunks once the main screen is up, so tab switches are instant (and work offline)
  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1500));
    idle(() => {
      void preloadLazyViews();
    });
  }, []);

  // 1. Navigation & View State
  // On load (refresh), open the next workout in the rotation after the last one finished, or resume
  // a workout in progress. Falls back to the last session that was open when there's no history.
  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    let stored = 'lower_a';
    try {
      const fromManager = storageManager.load().activeSessionId;
      const fromStorage = localStorage.getItem(STORAGE_KEY_SESSION);
      if (fromManager && (fromManager in WORKOUT_PROGRAM)) stored = fromManager;
      else if (fromStorage && (fromStorage in WORKOUT_PROGRAM)) stored = fromStorage;

      const finished: { sessionId: string; date: string; completedAt?: string }[] = Object.values(
        storageManager.getCompletedWorkouts()
      );
      const cachedScan = JSON.parse(localStorage.getItem(STORAGE_KEY_LAST_SCANNED_WORKOUT) || 'null');
      if (cachedScan?.lastWorkout?.sessionId && cachedScan.lastWorkout.date) {
        finished.push({ sessionId: cachedScan.lastWorkout.sessionId, date: cachedScan.lastWorkout.date });
      }
      const startTimes = JSON.parse(localStorage.getItem(STORAGE_KEY_SESSION_START_TIMES) || '{}');
      const open = sessionToOpen({ finished, startTimes, isKnownSession: (id) => id in WORKOUT_PROGRAM });
      if (open && open in WORKOUT_PROGRAM) return open;
    } catch {
      // fallback
    }
    return stored;
  });
  const initialSessionIdRef = useRef(activeSessionId);

  const [currentView, setCurrentView] = useState<AppViewMode>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const fromQuery = params.get('view') as AppViewMode | null;
      if (
        fromQuery === 'workout' ||
        fromQuery === 'readiness' ||
        fromQuery === 'cns' ||
        fromQuery === 'mobility' ||
        fromQuery === 'stretching' ||
        fromQuery === 'progress' ||
        fromQuery === 'assessment' ||
        fromQuery === 'guide'
      ) {
        return fromQuery;
      }
      const fromStorage = localStorage.getItem(STORAGE_KEY_VIEW) as AppViewMode;
      if (
        fromStorage === 'workout' ||
        fromStorage === 'readiness' ||
        fromStorage === 'cns' ||
        fromStorage === 'mobility' ||
        fromStorage === 'stretching' ||
        fromStorage === 'progress' ||
        fromStorage === 'assessment' ||
        fromStorage === 'guide'
      ) {
        return fromStorage;
      }
    } catch {
      // fallback
    }
    return 'workout';
  });

  // 2. Audio Mute State
  const [isMuted, setIsMuted] = useState<boolean>(() => audioSynthesizer.isMuted());

  // 3. Modal & Quick Launch State
  const [activeCueCardId, setActiveCueCardId] = useState<string | null>(null);
  const [activeRestSeconds, setActiveRestSeconds] = useState<number | null>(null);
  const [activeRestContext, setActiveRestContext] = useState<RestTargetContext | null>(null);
  const pendingRestContextRef = useRef<RestTargetContext | null>(null);
  const [activeTempo, setActiveTempo] = useState<string | null>(null);
  const [activeTempoExerciseId, setActiveTempoExerciseId] = useState<string | null>(null);
  const [activeTempoTargetReps, setActiveTempoTargetReps] = useState<number | undefined>(undefined);
  const [showWarmup, setShowWarmup] = useState<boolean>(true);
  const [expandedTiers, setExpandedTiers] = useState<Record<string, boolean>>({
    T1: true,
    T2: true,
    T3: true,
  });

  const handleToggleTier = useCallback((tier: string) => {
    setExpandedTiers((prev) => ({
      ...prev,
      [tier]: !prev[tier],
    }));
  }, []);

  const [isSessionOverviewCollapsed, setIsSessionOverviewCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_SESSION_OVERVIEW_COLLAPSED) === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleSessionOverview = useCallback(() => {
    setIsSessionOverviewCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY_SESSION_OVERVIEW_COLLAPSED, String(next));
      } catch {
        // safe fallback
      }
      return next;
    });
  }, []);

  // Focus Mode (Auto-Accordion) & Bulk Collapse/Expand State
  const [isFocusMode, setIsFocusMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_FOCUS_MODE) === 'true';
    } catch {
      return false;
    }
  });
  const [bulkCollapseState, setBulkCollapseState] = useState<'collapsed' | 'expanded' | null>(null);
  const [collapseRevision, setCollapseRevision] = useState<number>(0);
  const [isDailyAbsFinisherExpanded, setIsDailyAbsFinisherExpanded] = useState<boolean>(true);

  const handleToggleFocusMode = useCallback(() => {
    setIsFocusMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY_FOCUS_MODE, String(next));
      } catch {
        // safe fallback
      }
      return next;
    });
    setBulkCollapseState(null);
    setCollapsedWarmupDrills({});
    setCollapseRevision((r) => r + 1);
  }, []);

  const { collapsedWarmupDrills, completedWarmups, expandedWarmupInstructions, handleToggleAllDrillPhases, handleTogglePhaseTask, handleToggleWarmupDrill, handleToggleWarmupDrillCollapse, handleToggleWarmupInstructions, phaseTasks, recordTaskCompletionStartTime, sessionStartTimes, setCollapsedWarmupDrills, setCompletedWarmups, setPhaseTasks, setSessionStartTimes } = useWarmupProgress({ activeSessionId });

  // 4. Workout Set Logs State (exerciseId -> SetLogRecord[])
  const [workoutLogs, setWorkoutLogs] = useState<Record<string, SetLogRecord[]>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_LOGS);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to parse stored workout logs:', e);
    }
    return {};
  });

  // 4b. Split Sides (Unilateral) Workouts State (exerciseId -> boolean)
  const [splitSidesExercises, setSplitSidesExercises] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SPLIT_SIDES);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // safe fallback
    }
    return {};
  });

  // Persist splitSidesExercises
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SPLIT_SIDES, JSON.stringify(splitSidesExercises));
    } catch {
      // safe fallback
    }
  }, [splitSidesExercises]);

  // 4c. Auto-hide completed workout sessions in SessionNav
  const [autoHideCompletedSessions, setAutoHideCompletedSessions] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_HIDE_COMPLETED_SESSIONS);
      return stored !== null ? stored === 'true' : true;
    } catch {
      return true;
    }
  });

  const handleToggleAutoHideCompletedSessions = useCallback(() => {
    setAutoHideCompletedSessions((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY_HIDE_COMPLETED_SESSIONS, String(next));
      } catch {
        // safe fallback
      }
      return next;
    });
  }, []);

  // 4d. Scanned Last Workout & Suggested Session
  const [scannedWorkoutInfo, setScannedWorkoutInfo] = useState<LastWorkoutScanResult | null>(null);

  const handleScanLastWorkout = useCallback(async () => {
    try {
      const result = await scanLastWorkout(workoutLogs, activeSessionId);
      setScannedWorkoutInfo(result);
      // workouts finished on another device may have just been added to history
      setCompletedWorkouts(storageManager.getCompletedWorkouts());
    } catch (err) {
      console.warn('[App] Error scanning last workout:', err);
    }
  }, [workoutLogs, activeSessionId]);

  useEffect(() => {
    handleScanLastWorkout();
  }, []);

  // Rebuild the Google Sheets workout log from this device's own workouts (once, needs sign-in),
  // then pick up workouts finished on other devices.
  useEffect(() => {
    if (!user || isTestEnvironment()) return;
    void repairSheetHistory().then((ok) => {
      if (ok) handleScanLastWorkout();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadSyncDoneRef = useRef(false);
  useEffect(() => {
    if (loadSyncDoneRef.current || !scannedWorkoutInfo) return;
    loadSyncDoneRef.current = true;
    // only if nothing changed since load: the user hasn't picked another session or started one
    if (activeSessionId !== initialSessionIdRef.current) return;
    const last = scannedWorkoutInfo.lastWorkout;
    if (scannedWorkoutInfo.source !== 'google_sheets' || !last?.sessionId) return;
    const open = sessionToOpen({
      finished: [
        ...Object.values(storageManager.getCompletedWorkouts()),
        { sessionId: last.sessionId, date: last.date },
      ],
      startTimes: sessionStartTimes,
      isKnownSession: (id) => id in WORKOUT_PROGRAM,
    });
    if (open && open !== activeSessionId && open in WORKOUT_PROGRAM) setActiveSessionId(open);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scannedWorkoutInfo]);

  // 4e. Session completion announcement toast
  const [sessionCompletionToast, setSessionCompletionToast] = useState<{
    completedTitle: string;
    completedId: string;
    nextTitle: string;
    nextId: string;
    durationSeconds?: number;
    calendarLogged?: boolean;
    calendarEventLink?: string;
  } | null>(null);

  // Save active session to LocalStorage & storageManager
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SESSION, activeSessionId);
      storageManager.saveImmediate({ activeSessionId });
    } catch {
      // safe fallback
    }
  }, [activeSessionId]);

  // Save current view mode
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_VIEW, currentView);
    } catch {
      // safe fallback
    }
  }, [currentView]);

  // Debounced auto-save of logs to LocalStorage. A pending save is written right away if the app is
  // closed, backgrounded or unmounted first, so a set ticked just before leaving is never lost.
  const pendingLogsRef = useRef<Record<string, SetLogRecord[]> | null>(null);
  const writeLogsNow = useCallback(() => {
    if (!pendingLogsRef.current) return;
    try {
      localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(pendingLogsRef.current));
      pendingLogsRef.current = null;
    } catch (e) {
      console.warn('Failed to save workout logs:', e);
    }
  }, []);
  useEffect(() => {
    pendingLogsRef.current = workoutLogs;
    const timer = setTimeout(writeLogsNow, 300);
    return () => clearTimeout(timer);
  }, [workoutLogs, writeLogsNow]);
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') writeLogsNow();
    };
    window.addEventListener('pagehide', writeLogsNow);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('pagehide', writeLogsNow);
      document.removeEventListener('visibilitychange', onHide);
      writeLogsNow();
    };
  }, [writeLogsNow]);

  // Audio mute toggle handler
  const handleToggleMute = useCallback(() => {
    const next = !audioSynthesizer.isMuted();
    audioSynthesizer.setMuted(next);
    setIsMuted(next);
  }, []);

  // 5. Cloud Sync to Google Sheets State
  const {
    isSyncing,
    syncSuccessFlash,
    lastSyncedTime,
    syncToast,
    setSyncToast,
    handleSyncFinishedWorkout,
    handleManualSyncToSheets,
  } = useSheetsSync(activeSessionId, workoutLogs);

  // Google Drive backup of profile, weigh-ins and assessments: restore on a new device, back up on change
  useEffect(() => {
    void restoreAppBackupIfNewer();
    return startAppBackupAutoSync();
  }, []);

  // 5c. Auto-sync tracker ref for 100% completion
  const lastAutoSyncedSessionRef = useRef<string | null>(null);

  // 6. Weekly Evaluation & Adaptation State
  const [isWeeklyModalOpen, setIsWeeklyModalOpen] = useState<boolean>(false);
  const [isWorkoutCompletionModalOpen, setIsWorkoutCompletionModalOpen] = useState<boolean>(false);
  const [isSavingAndAdvancing, setIsSavingAndAdvancing] = useState<boolean>(false);
  const [isWorkoutHistoryModalOpen, setIsWorkoutHistoryModalOpen] = useState<boolean>(false);
  const [isHeatmapModalOpen, setIsHeatmapModalOpen] = useState<boolean>(false);
  const [sessionAuditResult, setSessionAuditResult] = useState<SessionCompletionAudit | null>(null);
  const [programAdaptations, setProgramAdaptations] = useState<Record<string, Partial<WorkoutExercise>>>(() => {
    try {
      return storageManager.getProgramAdaptations();
    } catch {
      return {};
    }
  });

  // Workout Cycles (Cycle A: Base Focus vs Cycle B: Periodized Wave) & Custom Exercise Variations
  const [sessionCycles, setSessionCycles] = useState<Record<string, WorkoutCycle>>(() => {
    try {
      return loadSessionCycles();
    } catch {
      return {};
    }
  });

  const [customVariations, setCustomVariations] = useState<Record<string, string>>(() => {
    try {
      return loadCustomVariations();
    } catch {
      return {};
    }
  });

  const [completedWorkouts, setCompletedWorkouts] = useState<Record<string, CompletedWorkoutSession>>(() => {
    try {
      return storageManager.getCompletedWorkouts();
    } catch {
      return {};
    }
  });

  const [mobilityHistory, setMobilityHistory] = useState<MobilityEntry[]>(() => {
    try {
      return storageManager.load().mobilityHistory;
    } catch {
      return [];
    }
  });

  // Re-sync state whenever storage changes (completed workouts, mobility)
  useEffect(() => {
    return storageManager.subscribe((data) => {
      if (data.completedWorkouts) {
        setCompletedWorkouts({ ...data.completedWorkouts });
      }
      if (data.mobilityHistory) {
        setMobilityHistory(data.mobilityHistory);
      }
    });
  }, []);

  // 5b. Cloud Firestore Real-Time Bi-Directional Multi-Device Sync
  useCloudSync({
    userId: user?.uid,
    activeSessionId,
    workoutLogs,
    completedWarmups,
    splitSidesExercises,
    setActiveSessionId,
    setWorkoutLogs,
    setCompletedWarmups,
    setSplitSidesExercises,
    setMobilityHistory,
  });

  const { handleDismissMobilityPrompt, handleSnoozeMobilityPrompt, mobilityCheckInStatus } = useMobilityCheckIn({ mobilityHistory });

  // Compute weekly evaluation from current workout logs and mobility data
  const weeklyEvaluation = useMemo(() => {
    return evaluateWeeklyPerformance(workoutLogs, WORKOUT_SESSIONS, mobilityHistory, 1);
  }, [workoutLogs, mobilityHistory]);

  // Planned deload: every 5th training week (4 building weeks), counted from history
  const [deloadPostponedWeek, setDeloadPostponedWeek] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_DELOAD_POSTPONED);
    } catch {
      return null;
    }
  });
  const deloadInfo = useMemo(
    () =>
      deloadStatus(Object.values(completedWorkouts) as HistoryRecord[], new Date(), {
        postponedWeekKey: deloadPostponedWeek,
        isLifting: (id) => id in WORKOUT_PROGRAM,
      }),
    [completedWorkouts, deloadPostponedWeek]
  );
  const isDeloadWeek = deloadInfo.isDeloadWeek;
  const deloadRef = useRef(isDeloadWeek);
  deloadRef.current = isDeloadWeek;
  const handleSetDeloadPostponed = useCallback((postpone: boolean) => {
    const key = postpone ? deloadInfo.weekKey : null;
    setDeloadPostponedWeek(key);
    try {
      if (key) localStorage.setItem(STORAGE_KEY_DELOAD_POSTPONED, key);
      else localStorage.removeItem(STORAGE_KEY_DELOAD_POSTPONED);
    } catch {
      // safe fallback
    }
  }, [deloadInfo.weekKey]);

  // Apply adaptations and cycle/custom variations dynamically over WORKOUT_PROGRAM
  const adaptedSessions = useMemo(() => {
    const baseMap = { ...WORKOUT_PROGRAM };
    const result: Record<string, (typeof baseMap)['lower_a']> = {};

    Object.entries(baseMap).forEach(([sId, session]) => {
      const currentCycle = sessionCycles[sId] || 'A';
      const adaptedExercises = session.exercises.map((ex) => {
        let currentEx = ex;
        const customVarId = customVariations[ex.id] || customVariations[ex.baseExerciseId || ''];
        if (customVarId) {
          const allVars = getExerciseVariations(ex.baseExerciseId || ex.id);
          const chosen = allVars.find((v) => v.id === customVarId);
          if (chosen) {
            currentEx = variationToWorkoutExercise(chosen, ex);
          }
        } else if (currentCycle === 'B') {
          const cycleBVar = getCycleVariation(ex.baseExerciseId || ex.id, 'B');
          if (cycleBVar && cycleBVar.id !== ex.id) {
            currentEx = variationToWorkoutExercise(cycleBVar, ex);
          }
        }

        const adaptation = programAdaptations[ex.id];
        const adapted: WorkoutExercise = !adaptation ? currentEx : {
          ...currentEx,
          ...adaptation,
          targetSets: adaptation.targetSets ?? currentEx.targetSets,
          priorityBadge: adaptation.priorityBadge ?? currentEx.priorityBadge,
          missedLastSession: adaptation.missedLastSession ?? currentEx.missedLastSession,
          defaultWeightLbs: adaptation.defaultWeightLbs ?? currentEx.defaultWeightLbs,
          tempo: adaptation.tempo ?? currentEx.tempo,
          restSeconds: adaptation.restSeconds ?? currentEx.restSeconds,
        };
        // Planned deload week: about half the sets and no AMRAP grind (lighter loads come from the suggestions)
        return isDeloadWeek ? { ...adapted, targetSets: deloadSets(adapted.targetSets), isAmrapLastSet: false } : adapted;
      });

      result[sId] = {
        ...session,
        subtitle: currentCycle === 'B' ? `${session.subtitle} · [Cycle B Wave]` : session.subtitle,
        exercises: adaptedExercises,
      };
    });

    return result;
  }, [programAdaptations, sessionCycles, customVariations, isDeloadWeek]);

  const activeSession = adaptedSessions[activeSessionId] || adaptedSessions.lower_a;
  // Guide tab: every session as currently programmed (variations, deload week)
  const guideSessions = useMemo(
    () => Object.keys(WORKOUT_PROGRAM).map((id) => adaptedSessions[id] || WORKOUT_PROGRAM[id]),
    [adaptedSessions]
  );

  const currentSessionCycle: WorkoutCycle = sessionCycles[activeSessionId] || 'A';

  const handleToggleSessionCycle = useCallback((sessionId?: string) => {
    const targetId = sessionId || activeSessionId;
    setSessionCycles((prev) => {
      const current = prev[targetId] || 'A';
      const nextCycle: WorkoutCycle = current === 'A' ? 'B' : 'A';
      const updated = { ...prev, [targetId]: nextCycle };
      saveSessionCycle(targetId, nextCycle);
      audioSynthesizer.playTone('completion');
      return updated;
    });
  }, [activeSessionId]);

  const handleSelectExerciseVariation = useCallback(
    (baseExerciseId: string, variation: ExerciseVariation) => {
      setCustomVariations((prev) => {
        const updated = { ...prev, [baseExerciseId]: variation.id };
        saveCustomVariation(baseExerciseId, variation.id);
        return updated;
      });
      audioSynthesizer.playTone('completion');
    },
    []
  );

  const handleResetSessionVariations = useCallback((sessionId?: string) => {
    const targetId = sessionId || activeSessionId;
    setCustomVariations((prev) => {
      const next = { ...prev };
      const session = WORKOUT_PROGRAM[targetId as keyof typeof WORKOUT_PROGRAM];
      if (session) {
        session.exercises.forEach((ex) => {
          delete next[ex.id];
          if (ex.baseExerciseId) delete next[ex.baseExerciseId];
        });
      }
      try {
        localStorage.setItem(STORAGE_KEY_CUSTOM_VARIATIONS, JSON.stringify(next));
      } catch {
        // safe fallback
      }
      return next;
    });
  }, [activeSessionId]);

  // Dynamically expand exercises in activeSession where Left/Right split is active
  const sessionExercises = useMemo(() => {
    return activeSession.exercises.flatMap((ex) => {
      if (splitSidesExercises[ex.id]) {
        const { left, right } = createUnilateralSideExercises(ex);
        return [left, right];
      }
      return [ex];
    });
  }, [activeSession, splitSidesExercises]);

  // "Last time" and the next-weight suggestion for every exercise in the open session. Today's own
  // workout is left out, so a finished session still compares against the one before.
  // Recovery signals (sleep, resting HR, outside training, today's check-in) that hold back load increases.
  // Re-read when Health Connect data refreshes or a check-in is saved.
  const [recoveryTick, setRecoveryTick] = useState(0);
  useEffect(() => {
    const bump = () => setRecoveryTick((t) => t + 1);
    window.addEventListener(HEALTH_UPDATED_EVENT, bump);
    window.addEventListener('storage', bump);
    window.addEventListener('focus', bump);
    return () => {
      window.removeEventListener(HEALTH_UPDATED_EVENT, bump);
      window.removeEventListener('storage', bump);
      window.removeEventListener('focus', bump);
    };
  }, []);
  const holdIncreasesReason = useMemo(() => {
    let checkIns: ReadinessCheckIn[] = [];
    try {
      const raw = JSON.parse(localStorage.getItem('workout_daily_readiness_logs_v1') || '[]');
      if (Array.isArray(raw)) checkIns = raw;
    } catch {
      // no check-ins yet
    }
    return gateReason(increaseGate(new Date(), loadCachedHealth(), loadCachedWorkouts(), checkIns, loadCnsChecks()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recoveryTick, currentView]);

  const progressionByExercise = useMemo(() => {
    const history = Object.values(completedWorkouts) as HistoryRecord[];
    const before = new Date(new Date().toDateString()).getTime();
    const finisherIds = new Set((activeSession.dailyCoreFinisher || []).map((e) => e.id));
    const map: Record<string, { last: LastPerformance | null; suggestion: LoadSuggestion | null }> = {};
    for (const ex of [...sessionExercises, ...(activeSession.dailyCoreFinisher || [])]) {
      const last = findLastPerformance(ex.id, history, { before });
      const basis = last && !last.deload ? last : findLastPerformance(ex.id, history, { before, skipDeload: true });
      map[ex.id] = {
        last,
        suggestion: suggestNextLoad(ex, basis, { deload: isDeloadWeek && !finisherIds.has(ex.id), holdIncreasesReason }),
      };
    }
    return map;
  }, [completedWorkouts, sessionExercises, activeSession.dailyCoreFinisher, isDeloadWeek, holdIncreasesReason]);

  const handleToggleSplitSides = useCallback((exerciseId: string) => {
    const baseId = exerciseId.replace(/__side_(left|right)$/, '');
    setSplitSidesExercises((prev) => {
      const nextState = !prev[baseId];
      const next = { ...prev, [baseId]: nextState };

      if (nextState) {
        setWorkoutLogs((prevLogs) => {
          const existing = prevLogs[baseId];
          const leftKey = `${baseId}__side_left`;
          const rightKey = `${baseId}__side_right`;
          const nextLogs = { ...prevLogs };

          if (existing && existing.length > 0) {
            if (!nextLogs[leftKey]) nextLogs[leftKey] = JSON.parse(JSON.stringify(existing));
            if (!nextLogs[rightKey]) nextLogs[rightKey] = JSON.parse(JSON.stringify(existing));
          }
          return nextLogs;
        });
      }

      return next;
    });
  }, []);

  const handleToggleSplitAllUnilateral = useCallback(() => {
    setSplitSidesExercises((prev) => {
      const unilateralInSession = activeSession.exercises.filter((ex) => isUnilateralExercise(ex));
      const allCurrentlySplit = unilateralInSession.every((ex) => !!prev[ex.id]);
      const targetVal = !allCurrentlySplit;

      const next = { ...prev };
      unilateralInSession.forEach((ex) => {
        next[ex.id] = targetVal;
      });

      if (targetVal) {
        setWorkoutLogs((prevLogs) => {
          const nextLogs = { ...prevLogs };
          unilateralInSession.forEach((ex) => {
            const existing = prevLogs[ex.id];
            const leftKey = `${ex.id}__side_left`;
            const rightKey = `${ex.id}__side_right`;
            if (existing && existing.length > 0) {
              if (!nextLogs[leftKey]) nextLogs[leftKey] = JSON.parse(JSON.stringify(existing));
              if (!nextLogs[rightKey]) nextLogs[rightKey] = JSON.parse(JSON.stringify(existing));
            }
          });
          return nextLogs;
        });
      }

      return next;
    });
  }, [activeSession]);

  const handleSwitchToPairedSide = useCallback((targetSideExerciseId: string) => {
    const el = document.getElementById(`exercise-card-${targetSideExerciseId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  // Apply selected weekly adaptations
  const handleApplyWeeklyAdaptations = useCallback(
    (selectedAdaptations: WorkoutAdaptation[]) => {
      let updatedLogs = { ...workoutLogs };

      setProgramAdaptations((prev) => {
        const next = { ...prev };

        selectedAdaptations.forEach((adapt) => {
          const current = next[adapt.exerciseId] || {};
          if (adapt.parameter === 'weightLbs') {
            const newWeight = Number(adapt.proposedValue);
            next[adapt.exerciseId] = { ...current, defaultWeightLbs: newWeight, defaultWeight: newWeight };

            // Also update any uncompleted or template sets for this exercise
            if (updatedLogs[adapt.exerciseId]) {
              updatedLogs[adapt.exerciseId] = updatedLogs[adapt.exerciseId].map((set) => ({
                ...set,
                weightLbs: set.isCompleted ? set.weightLbs : newWeight,
              }));
            }
          } else if (adapt.parameter === 'tempo') {
            next[adapt.exerciseId] = { ...current, tempo: String(adapt.proposedValue) };
          } else if (adapt.parameter === 'restSeconds') {
            next[adapt.exerciseId] = { ...current, restSeconds: Number(adapt.proposedValue) };
          } else if (adapt.parameter === 'regression') {
            const allExs = Object.values(WORKOUT_PROGRAM).flatMap((s) => s.exercises);
            const baseEx = allExs.find((e) => e.id === adapt.exerciseId);
            if (baseEx?.regression) {
              next[adapt.exerciseId] = {
                ...current,
                name: String(adapt.proposedValue || baseEx.regression.name),
                tempo: baseEx.regression.tempo || '4010',
              };
            } else if (adapt.proposedValue) {
              next[adapt.exerciseId] = {
                ...current,
                name: String(adapt.proposedValue),
              };
            }
          }
        });

        storageManager.saveProgramAdaptations(next);
        storageManager.saveWeeklyEvaluation(weeklyEvaluation);
        return next;
      });

      setWorkoutLogs(updatedLogs);
    },
    [workoutLogs, weeklyEvaluation]
  );

  const handleResetWeeklyAdaptations = useCallback(() => {
    setProgramAdaptations({});
    storageManager.saveProgramAdaptations({});
  }, []);

  // Pre-compute referentially stable default log arrays per exercise in the active session
  const defaultLogsByExerciseId = useMemo(() => {
    const map: Record<string, SetLogRecord[]> = {};
    const allExercises = [
      ...sessionExercises,
      ...(activeSession.dailyCoreFinisher || []),
    ];
    allExercises.forEach((ex) => {
      map[ex.id] = createDefaultExerciseLogs(ex);
    });
    return map;
  }, [sessionExercises, activeSession.dailyCoreFinisher]);

  // Initialize or retrieve logs for a given exercise (referentially stable per exercise)
  const getExerciseLogs = useCallback(
    (exercise: WorkoutExercise): SetLogRecord[] => {
      return (
        workoutLogs[exercise.id] ||
        defaultLogsByExerciseId[exercise.id] ||
        createDefaultExerciseLogs(exercise)
      );
    },
    [workoutLogs, defaultLogsByExerciseId]
  );

  // Next-weight suggestions are written into an exercise's sets once per new workout they're based on,
  // and only before its first set is ticked. Set counts follow the plan (deload weeks have fewer sets).
  const [appliedSuggestions, setAppliedSuggestions] = useState<Record<string, AppliedSuggestion>>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY_LOAD_SUGGESTIONS) || '{}') || {};
    } catch {
      return {};
    }
  });
  const appliedSuggestionsRef = useRef(appliedSuggestions);
  appliedSuggestionsRef.current = appliedSuggestions;
  const saveAppliedSuggestions = useCallback((next: Record<string, AppliedSuggestion>) => {
    setAppliedSuggestions(next);
    try {
      localStorage.setItem(STORAGE_KEY_LOAD_SUGGESTIONS, JSON.stringify(next));
    } catch {
      // safe fallback
    }
  }, []);

  useEffect(() => {
    const exercises = [...sessionExercises, ...(activeSession.dailyCoreFinisher || [])];
    const markers = { ...appliedSuggestionsRef.current };
    const nextLogs: Record<string, SetLogRecord[]> = {};
    let markersChanged = false;
    for (const ex of exercises) {
      const current = workoutLogs[ex.id];
      if (current?.some((s) => s.isCompleted)) continue;
      const base = current || defaultLogsByExerciseId[ex.id] || createDefaultExerciseLogs(ex);
      let logs = resizeSets(base, ex.targetSets, ex.targetReps);
      const s = progressionByExercise[ex.id]?.suggestion;
      if (s) {
        const key = `${s.basisRecordId}|${s.change}|${s.weightLbs}`;
        const prev = markers[ex.id];
        if (prev?.key !== key) {
          const fromWeightLbs = logs[0]?.weightLbs || 0;
          // a "hold" leaves the weight alone, except to come back up after a deload
          const write = s.change !== 'hold' || prev?.change === 'deload' || !!s.readinessHold;
          if (write && logs.some((l) => l.weightLbs !== s.weightLbs)) {
            logs = logs.map((l) => ({ ...l, weightLbs: s.weightLbs }));
          }
          markers[ex.id] = { ...s, key, fromWeightLbs };
          markersChanged = true;
        }
      }
      if (logs !== base) nextLogs[ex.id] = logs;
    }
    if (Object.keys(nextLogs).length) setWorkoutLogs((prev) => ({ ...prev, ...nextLogs }));
    if (markersChanged) saveAppliedSuggestions(markers);
    // runs when the plan or history changes, not on every logged rep
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progressionByExercise, sessionExercises]);

  const handleUndoSuggestion = useCallback(
    (exerciseId: string) => {
      const marker = appliedSuggestionsRef.current[exerciseId];
      if (!marker) return;
      saveAppliedSuggestions({ ...appliedSuggestionsRef.current, [exerciseId]: { ...marker, undone: true } });
      setWorkoutLogs((prev) => {
        const cur = prev[exerciseId];
        if (!cur) return prev;
        return { ...prev, [exerciseId]: cur.map((s) => (s.isCompleted ? s : { ...s, weightLbs: marker.fromWeightLbs })) };
      });
    },
    [saveAppliedSuggestions]
  );

  // The set that comes next (for the rest notification's "Set N done" button on the phone / watch)
  const nextSetInfo = useCallback(
    (exerciseId: string | undefined, setNumber: number | undefined): NextSetInfo | null => {
      if (!exerciseId || !setNumber) return null;
      const ex = [...sessionExercises, ...(activeSession.dailyCoreFinisher || [])].find((e) => e.id === exerciseId);
      if (!ex) return null;
      const logs = getExerciseLogs(ex);
      const set = logs[setNumber - 1];
      if (!set) return null;
      return {
        exerciseId: ex.id,
        setIndex: setNumber - 1,
        exerciseName: ex.name,
        setNumber,
        totalSets: logs.length,
        weightLbs: set.weightLbs || 0,
        targetReps: set.targetReps || ex.targetReps,
      };
    },
    [sessionExercises, activeSession.dailyCoreFinisher, getExerciseLogs]
  );

  const { handleJumpToNextSet, handleOpenCueCard, handleQuickStartRest, handleQuickStartRestForExercise, handleStartNextSet, handleUpdateSetLog, nextOpenSet } = useSetLogging({ activeRestContext, activeSession, defaultLogsByExerciseId, getExerciseLogs, nextSetInfo, pendingRestContextRef, recordTaskCompletionStartTime, sessionExercises, setActiveCueCardId, setActiveRestContext, setActiveRestSeconds, setWorkoutLogs });

  const { handleClearActivePreset, handleOpenWeeklyEvaluation, handleQuickStartTempo, handleTempoSetComplete } = useTempoAndWatchControls({ activeSession, activeTempoExerciseId, adaptedSessions, getExerciseLogs, handleQuickStartRest, handleQuickStartRestForExercise, handleUpdateSetLog, sessionExercises, setActiveRestSeconds, setActiveTempo, setActiveTempoExerciseId, setActiveTempoTargetReps, setIsWeeklyModalOpen });

  const { currentSessionCompletion, sessionStats, sessionTelemetry } = useSessionStats({ activeSessionId, adaptedSessions, sessionExercises, splitSidesExercises, workoutLogs });

  useAutoCompleteSession({ activeSession, activeSessionId, completedWarmups, completedWorkouts, currentSessionCompletion, deloadRef, handleSyncFinishedWorkout, isSyncing, lastAutoSyncedSessionRef, pendingLogsRef, phaseTasks, sessionExercises, sessionStartTimes, sessionTelemetry, setCompletedWarmups, setPhaseTasks, setWorkoutLogs, workoutLogs });

  const { handleApplyCompletionAdjustments, handleCompleteWithoutAdjustments, handleResetAllAndStartFresh, handleResetExerciseLogs, handleResetSessionLogs, handleSaveCurrentSessionToHistory, handleToggleWorkoutCompleted } = useSessionCompletion({ activeSession, activeSessionId, currentSessionCompletion, defaultLogsByExerciseId, deloadRef, handleScanLastWorkout, handleSyncFinishedWorkout, isMuted, lastAutoSyncedSessionRef, programAdaptations, sessionAuditResult, sessionExercises, sessionStartTimes, sessionTelemetry, setActiveSessionId, setCompletedWorkouts, setIsSavingAndAdvancing, setIsWorkoutCompletionModalOpen, setProgramAdaptations, setSessionAuditResult, setSessionCompletionToast, setSessionStartTimes, setWorkoutLogs, workoutLogs });

  // Identify the current active (first uncompleted) exercise and warmup drill for Focus Mode
  const activeFocusExerciseId = useMemo(() => {
    const firstUncompleted = sessionExercises.find((ex) => {
      const logs = getExerciseLogs(ex);
      return logs.some((l) => !l.isCompleted);
    });
    return firstUncompleted?.id ?? null;
  }, [sessionExercises, getExerciseLogs]);

  // Exercise card currently being worked on (synced with the app rest timer)
  const activeWorkingExercise = useMemo(() => {
    if (activeFocusExerciseId) {
      const found = sessionExercises.find((e) => e.id === activeFocusExerciseId);
      if (found) return found;
    }
    if (activeSession.dailyCoreFinisher && activeSession.dailyCoreFinisher.length > 0) {
      const firstUncompletedCore = activeSession.dailyCoreFinisher.find((ex) => {
        const logs = getExerciseLogs(ex);
        return logs.some((l) => !l.isCompleted);
      });
      if (firstUncompletedCore) return firstUncompletedCore;
    }
    return sessionExercises[0] || null;
  }, [sessionExercises, activeFocusExerciseId, activeSession.dailyCoreFinisher, getExerciseLogs]);

  const currentWorkingRestContext: RestTargetContext | null = useMemo(() => {
    if (!activeWorkingExercise) return null;
    const logs = getExerciseLogs(activeWorkingExercise);
    const completedCount = logs.filter((l) => l.isCompleted).length;
    const firstUnfinishedIdx = logs.findIndex((l) => !l.isCompleted);
    const nextSetNumber = firstUnfinishedIdx >= 0 ? firstUnfinishedIdx + 1 : 1;
    return {
      exerciseId: activeWorkingExercise.id,
      exerciseName: activeWorkingExercise.name,
      completedSetNumber: completedCount > 0 ? completedCount : undefined,
      totalSets: logs.length || activeWorkingExercise.targetSets,
      nextSetNumber,
      isLastSet: firstUnfinishedIdx === logs.length - 1,
    };
  }, [activeWorkingExercise, getExerciseLogs]);

  const currentExerciseRestSeconds = activeWorkingExercise?.restSeconds || 60;

  const activeFocusWarmupId = useMemo(() => {
    const firstUncompleted = activeSession.warmupSequence?.find((w) => !completedWarmups[w.id]);
    return firstUncompleted?.id ?? null;
  }, [activeSession, completedWarmups]);

  const handleToggleBulkCollapse = useCallback(() => {
    const nextState = bulkCollapseState === 'collapsed' ? 'expanded' : 'collapsed';
    setBulkCollapseState(nextState);
    if (nextState === 'expanded') {
      setIsFocusMode(false);
      try {
        localStorage.setItem(STORAGE_KEY_FOCUS_MODE, 'false');
      } catch {
        // safe fallback
      }
      setExpandedTiers({ T1: true, T2: true, T3: true });
      setShowWarmup(true);
    }
    const nextWarmupMap: Record<string, boolean> = {};
    activeSession.warmupSequence?.forEach((w) => {
      nextWarmupMap[w.id] = nextState === 'collapsed';
    });
    setCollapsedWarmupDrills(nextWarmupMap);
    setCollapseRevision((r) => r + 1);
  }, [bulkCollapseState, activeSession]);

  const { activeCueCard, activeCueCardTimed } = useActiveCueCard({ activeCueCardId, activeSession, CUE_CARD_MAP, sessionExercises });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950 w-full max-w-full overflow-x-hidden min-w-0">
      {/* Sticky Header */}
      <Header
        activeSessionTitle={activeSession.title}
        activeSessionSubtitle={activeSession.subtitle}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        currentView={currentView}
        onSelectView={setCurrentView}
        completionPercentage={currentSessionCompletion}
        isSyncing={isSyncing}
        syncSuccessFlash={syncSuccessFlash}
        lastSyncedTime={lastSyncedTime}
        onSync={handleManualSyncToSheets}
        onOpenWeeklyEvaluation={handleOpenWeeklyEvaluation}
        weeklyAdaptationCount={weeklyEvaluation.adaptations.length}
        onOpenWorkoutHistory={() => setIsWorkoutHistoryModalOpen(true)}
      />

      <SyncToastBanner setSyncToast={setSyncToast} syncToast={syncToast} />

      {/* Main View Area */}
      <main className="flex-1 w-full max-w-full overflow-x-hidden min-w-0 mx-auto pb-44 sm:pb-36">
        <MobilityReminderBanner
          currentView={currentView}
          handleDismissMobilityPrompt={handleDismissMobilityPrompt}
          handleSnoozeMobilityPrompt={handleSnoozeMobilityPrompt}
          mobilityCheckInStatus={mobilityCheckInStatus}
          setCurrentView={setCurrentView}
        />

        {/* View 1: Workout Routine */}
        {currentView === 'workout' && (
          <div>
            {/* Session Navigation Tabs */}
            <SessionNav
              sessions={WORKOUT_SESSIONS}
              extraSessions={RECOVERY_SESSIONS}
              activeSessionId={activeSessionId}
              onSelectSession={setActiveSessionId}
              sessionStats={sessionStats}
              autoHideCompleted={autoHideCompletedSessions}
              onToggleAutoHideCompleted={handleToggleAutoHideCompletedSessions}
            />

            <SessionCompletionToast
              sessionCompletionToast={sessionCompletionToast}
              setActiveSessionId={setActiveSessionId}
              setCurrentView={setCurrentView}
              setSessionCompletionToast={setSessionCompletionToast}
            />

            <div className="px-1 sm:px-3 md:px-6 py-2 sm:py-5 w-full max-w-7xl mx-auto">
              <SessionOverviewCard
                activeSession={activeSession}
                activeSessionId={activeSessionId}
                bulkCollapseState={bulkCollapseState}
                completedWarmups={completedWarmups}
                currentSessionCycle={currentSessionCycle}
                customVariations={customVariations}
                deloadInfo={deloadInfo}
                handleResetSessionLogs={handleResetSessionLogs}
                handleResetSessionVariations={handleResetSessionVariations}
                handleSetDeloadPostponed={handleSetDeloadPostponed}
                handleToggleBulkCollapse={handleToggleBulkCollapse}
                handleToggleFocusMode={handleToggleFocusMode}
                handleToggleSessionCycle={handleToggleSessionCycle}
                handleToggleSessionOverview={handleToggleSessionOverview}
                handleToggleSplitAllUnilateral={handleToggleSplitAllUnilateral}
                isDeloadWeek={isDeloadWeek}
                isFocusMode={isFocusMode}
                isSessionOverviewCollapsed={isSessionOverviewCollapsed}
                programAdaptations={programAdaptations}
                sessionStats={sessionStats}
                sessionTelemetry={sessionTelemetry}
                setIsHeatmapModalOpen={setIsHeatmapModalOpen}
                setIsWeeklyModalOpen={setIsWeeklyModalOpen}
              />

              <WarmupSection
                activeFocusWarmupId={activeFocusWarmupId}
                activeSession={activeSession}
                collapsedWarmupDrills={collapsedWarmupDrills}
                completedWarmups={completedWarmups}
                CUE_CARD_MAP={CUE_CARD_MAP}
                expandedWarmupInstructions={expandedWarmupInstructions}
                handleQuickStartRest={handleQuickStartRest}
                handleQuickStartTempo={handleQuickStartTempo}
                handleToggleAllDrillPhases={handleToggleAllDrillPhases}
                handleTogglePhaseTask={handleTogglePhaseTask}
                handleToggleWarmupDrill={handleToggleWarmupDrill}
                handleToggleWarmupDrillCollapse={handleToggleWarmupDrillCollapse}
                handleToggleWarmupInstructions={handleToggleWarmupInstructions}
                isFocusMode={isFocusMode}
                phaseTasks={phaseTasks}
                setActiveCueCardId={setActiveCueCardId}
                setShowWarmup={setShowWarmup}
                showWarmup={showWarmup}
              />

              {/* Collapsible Tier Sections */}
              <div className="space-y-4 sm:space-y-6">
                <ExerciseTierSections
                  activeFocusExerciseId={activeFocusExerciseId}
                  activeSession={activeSession}
                  appliedSuggestions={appliedSuggestions}
                  bulkCollapseState={bulkCollapseState}
                  collapseRevision={collapseRevision}
                  currentSessionCycle={currentSessionCycle}
                  expandedTiers={expandedTiers}
                  getExerciseLogs={getExerciseLogs}
                  handleOpenCueCard={handleOpenCueCard}
                  handleQuickStartRestForExercise={handleQuickStartRestForExercise}
                  handleQuickStartTempo={handleQuickStartTempo}
                  handleResetExerciseLogs={handleResetExerciseLogs}
                  handleSelectExerciseVariation={handleSelectExerciseVariation}
                  handleSwitchToPairedSide={handleSwitchToPairedSide}
                  handleToggleSplitSides={handleToggleSplitSides}
                  handleToggleTier={handleToggleTier}
                  handleUndoSuggestion={handleUndoSuggestion}
                  handleUpdateSetLog={handleUpdateSetLog}
                  isDailyAbsFinisherExpanded={isDailyAbsFinisherExpanded}
                  isFocusMode={isFocusMode}
                  progressionByExercise={progressionByExercise}
                  sessionExercises={sessionExercises}
                  setIsDailyAbsFinisherExpanded={setIsDailyAbsFinisherExpanded}
                  splitSidesExercises={splitSidesExercises}
                />

                <WorkoutCompleteCard
                  activeSession={activeSession}
                  activeSessionId={activeSessionId}
                  currentSessionCompletion={currentSessionCompletion}
                  handleToggleWorkoutCompleted={handleToggleWorkoutCompleted}
                  isSavingAndAdvancing={isSavingAndAdvancing}
                  sessionExercises={sessionExercises}
                  sessionStats={sessionStats}
                  sessionTelemetry={sessionTelemetry}
                  setCurrentView={setCurrentView}
                />
              </div>
            </div>
          </div>
        )}

        <SecondaryViews
          activeSession={activeSession}
          activeSessionId={activeSessionId}
          completedWorkouts={completedWorkouts}
          currentView={currentView}
          guideSessions={guideSessions}
          handleApplyWeeklyAdaptations={handleApplyWeeklyAdaptations}
          handleOpenCueCard={handleOpenCueCard}
          handleResetWeeklyAdaptations={handleResetWeeklyAdaptations}
          isMuted={isMuted}
          mobilityHistory={mobilityHistory}
          programAdaptations={programAdaptations}
          setCurrentView={setCurrentView}
          workoutLogs={workoutLogs}
        />
      </main>

      <BottomNavBar
        currentView={currentView}
        handleJumpToNextSet={handleJumpToNextSet}
        nextOpenSet={nextOpenSet}
        setCurrentView={setCurrentView}
      />

      {/* Docked Rest Timer Widget (Synced to Active Exercise Card) */}
      <RestTimerWidget
        variant="docked"
        initialDuration={currentExerciseRestSeconds}
        activePresetSeconds={activeRestSeconds}
        activeRestContext={activeRestContext || currentWorkingRestContext}
        onClearActivePreset={handleClearActivePreset}
        onStartNextSet={handleStartNextSet}
      />

      <AppOverlays
        activeCueCard={activeCueCard}
        activeCueCardTimed={activeCueCardTimed}
        activeSession={activeSession}
        activeTempo={activeTempo}
        activeTempoExerciseId={activeTempoExerciseId}
        activeTempoTargetReps={activeTempoTargetReps}
        adaptedSessions={adaptedSessions}
        completedWorkouts={completedWorkouts}
        getExerciseLogs={getExerciseLogs}
        handleApplyCompletionAdjustments={handleApplyCompletionAdjustments}
        handleApplyWeeklyAdaptations={handleApplyWeeklyAdaptations}
        handleCompleteWithoutAdjustments={handleCompleteWithoutAdjustments}
        handleResetAllAndStartFresh={handleResetAllAndStartFresh}
        handleResetWeeklyAdaptations={handleResetWeeklyAdaptations}
        handleSaveCurrentSessionToHistory={handleSaveCurrentSessionToHistory}
        handleScanLastWorkout={handleScanLastWorkout}
        handleTempoSetComplete={handleTempoSetComplete}
        isHeatmapModalOpen={isHeatmapModalOpen}
        isSavingAndAdvancing={isSavingAndAdvancing}
        isWeeklyModalOpen={isWeeklyModalOpen}
        isWorkoutCompletionModalOpen={isWorkoutCompletionModalOpen}
        isWorkoutHistoryModalOpen={isWorkoutHistoryModalOpen}
        programAdaptations={programAdaptations}
        sessionAuditResult={sessionAuditResult}
        sessionExercises={sessionExercises}
        setActiveCueCardId={setActiveCueCardId}
        setActiveTempo={setActiveTempo}
        setActiveTempoExerciseId={setActiveTempoExerciseId}
        setIsHeatmapModalOpen={setIsHeatmapModalOpen}
        setIsWeeklyModalOpen={setIsWeeklyModalOpen}
        setIsWorkoutCompletionModalOpen={setIsWorkoutCompletionModalOpen}
        setIsWorkoutHistoryModalOpen={setIsWorkoutHistoryModalOpen}
        setPhaseTasks={setPhaseTasks}
        setSessionAuditResult={setSessionAuditResult}
        weeklyEvaluation={weeklyEvaluation}
        workoutLogs={workoutLogs}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGate>
        <WorkoutAppMain />
      </AuthGate>
    </AuthProvider>
  );
}

