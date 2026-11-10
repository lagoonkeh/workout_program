import { useState, useEffect, useMemo, useCallback, useRef, Suspense } from 'react';
import {
  MobilityTrackerWidget,
  StretchingRoutineWidget,
  ProgressChartWidget,
  QuarterlyAssessmentWidget,
  StrengthHeatmapWidget,
  AthleteProfileCard,
  AdaptationClocksWidget,
  preloadLazyViews,
  CueCardModal,
  WeeklyEvaluationModal,
  WorkoutCompletionModal,
  WorkoutHistoryModal,
  DailyReadinessWidget,
  TempoMetronomeWidget,
  MuscleHeatmapWidget,
  AdaptiveBodyCoachWidget,
  GuideWidget,
} from './lazyView';
import { sessionToOpen } from './domain/nextSession';
import { increaseGate, gateReason, type ReadinessCheckIn } from './domain/trainingReadiness';
import { loadCachedHealth } from './domain/healthMetrics';
import { HEALTH_UPDATED_EVENT, loadCachedWorkouts } from './domain/healthWorkouts';
import { migrateMeadowsRowOnce, removeNov1PhantomsOnce, removeSheetCopiesOnce, repairSheetHistory } from './services/historyRepair';
import { clearSessionMarks, findAutoSavedToday, finishedToday, isLeftoverFromEarlierDay, pickSessionLogs, sessionLogKeys } from './domain/sessionReset';
import {
  WORKOUT_PROGRAM,
  WORKOUT_SESSIONS,
  RECOVERY_SESSIONS,
  WorkoutExercise,
  WorkoutSession,
  createUnilateralSideExercises,
  isUnilateralExercise,
  extractTargetReps,
  isTimedPrescription,
  getEffectiveExerciseTempo,
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
import type { CueCard } from './domain/cueCardTypes';
import { loadCueCards, useCueCardLookup } from './domain/cueCardStore';
import { audioSynthesizer } from './audio/audioSynthesizer';
import { storageManager, CompletedWorkoutSession } from './storage/storageManager';
import { Header, AppViewMode } from './components/Header';
import { SessionNav, SessionProgressStats } from './components/SessionNav';
import { SetLogRecord } from './components/ExerciseCard';
import { RestTimerWidget, RestTargetContext } from './components/RestTimerWidget';
import { ChevronDown, BookOpen, CheckCircle2, AlertCircle, Sparkles, Dumbbell, Activity, TrendingUp, Trophy, HeartPulse, X } from 'lucide-react';
import {
  scanLastWorkout,
  LastWorkoutScanResult,
  clearRemoteWorkoutHistory,
  STORAGE_KEY_LAST_SCANNED_WORKOUT,
  STORAGE_KEY_LAST_SYNC,
} from './services/sheetSyncService';
import { useSheetsSync } from './hooks/useSheetsSync';
import { restoreAppBackupIfNewer, startAppBackupAutoSync } from './services/appBackupService';
import { useCloudSync } from './hooks/useCloudSync';
import { isTestEnvironment } from './services/firebaseAuth';
import { autoLogWorkoutToGoogleCalendar } from './services/calendarSyncService';
import {
  auditSessionCompletion,
  applySkippedExerciseAdjustments,
  annotateWorkoutLogsForSkipped,
  SessionCompletionAudit,
  SkippedExerciseAdjustment,
  SkippedExerciseRecord,
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
  commandFromMessage,
  parseWatchCommand,
  resolveSetTarget,
  type NextSetInfo,
  type WatchCommand,
} from './timer/watchCommands';
import { MobilityEntry, getMobilityCheckInStatus } from './domain/mobility';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthGate } from './components/AuthGate';
import {
  STORAGE_KEY_LOGS,
  STORAGE_KEY_SESSION,
  STORAGE_KEY_VIEW,
  STORAGE_KEY_WARMUPS,
  STORAGE_KEY_SESSION_OVERVIEW_COLLAPSED,
  STORAGE_KEY_FOCUS_MODE,
  STORAGE_KEY_SPLIT_SIDES,
  STORAGE_KEY_HIDE_COMPLETED_SESSIONS,
  STORAGE_KEY_MOBILITY_SNOOZE,
  STORAGE_KEY_PHASE_TASKS,
  STORAGE_KEY_SESSION_START_TIMES,
  STORAGE_KEY_LOAD_SUGGESTIONS,
  STORAGE_KEY_DELOAD_POSTPONED,
} from './storage/appStorageKeys';
import { ViewLoadingFallback, createDefaultExerciseLogs, type AppliedSuggestion } from './workout/shared';
import { SessionOverviewCard } from './workout/SessionOverviewCard';
import { WarmupSection } from './workout/WarmupSection';
import { WorkoutCompleteCard } from './workout/WorkoutCompleteCard';
import { ExerciseTierSections } from './workout/ExerciseTierSections';

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

  const [completedWarmups, setCompletedWarmups] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_WARMUPS);
      if (stored) return JSON.parse(stored);
    } catch {
      // safe fallback
    }
    return {};
  });

  const [phaseTasks, setPhaseTasks] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PHASE_TASKS);
      if (stored) return JSON.parse(stored);
    } catch {
      // safe fallback
    }
    return {};
  });

  const [sessionStartTimes, setSessionStartTimes] = useState<Record<string, string>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SESSION_START_TIMES);
      if (stored) return JSON.parse(stored);
    } catch {
      // safe fallback
    }
    return {};
  });

  // Record start time on first completed task (warmup drill, phase task, or exercise set)
  const recordTaskCompletionStartTime = useCallback((sessionId?: string) => {
    const targetId = sessionId || activeSessionId;
    if (!targetId) return;
    setSessionStartTimes((prev) => {
      if (prev[targetId]) return prev;
      const nowIso = new Date().toISOString();
      const updated = { ...prev, [targetId]: nowIso };
      try {
        localStorage.setItem(STORAGE_KEY_SESSION_START_TIMES, JSON.stringify(updated));
      } catch {
        // safe fallback
      }
      return updated;
    });
  }, [activeSessionId]);

  const [collapsedWarmupDrills, setCollapsedWarmupDrills] = useState<Record<string, boolean>>({});

  const handleToggleWarmupDrillCollapse = useCallback((drillId: string, currentlyCollapsed: boolean) => {
    setCollapsedWarmupDrills((prev) => ({
      ...prev,
      [drillId]: !currentlyCollapsed,
    }));
  }, []);

  const handleToggleWarmupDrill = useCallback((drillId: string, totalPhases?: number) => {
    setCompletedWarmups((prev) => {
      const nextDone = !prev[drillId];
      if (nextDone) {
        recordTaskCompletionStartTime();
      }
      const next = { ...prev, [drillId]: nextDone };
      try {
        localStorage.setItem(STORAGE_KEY_WARMUPS, JSON.stringify(next));
      } catch {
        // safe fallback
      }
      setCollapsedWarmupDrills((prevCol) => ({
        ...prevCol,
        [drillId]: nextDone,
      }));

      // Synchronize all phase tasks if totalPhases provided
      if (totalPhases && totalPhases > 0) {
        setPhaseTasks((prevTasks) => {
          const updated = { ...prevTasks };
          for (let i = 0; i < totalPhases; i++) {
            updated[`${drillId}_phase_${i}`] = nextDone;
          }
          try {
            localStorage.setItem(STORAGE_KEY_PHASE_TASKS, JSON.stringify(updated));
          } catch {
            // safe fallback
          }
          return updated;
        });
      }

      return next;
    });
  }, [recordTaskCompletionStartTime]);

  const handleTogglePhaseTask = useCallback((phaseKey: string, drillId?: string, totalPhases?: number) => {
    setPhaseTasks((prev) => {
      const nextDone = !prev[phaseKey];
      if (nextDone) {
        recordTaskCompletionStartTime();
      }
      const next = { ...prev, [phaseKey]: nextDone };
      try {
        localStorage.setItem(STORAGE_KEY_PHASE_TASKS, JSON.stringify(next));
      } catch {
        // safe fallback
      }

      // If all phases for this drill are now done, mark the drill completed
      if (drillId && totalPhases && totalPhases > 0) {
        let allPhasesDone = true;
        for (let i = 0; i < totalPhases; i++) {
          const k = `${drillId}_phase_${i}`;
          if (k === phaseKey ? !nextDone : !next[k]) {
            allPhasesDone = false;
            break;
          }
        }
        if (allPhasesDone) {
          setCompletedWarmups((prevWarmups) => {
            if (prevWarmups[drillId]) return prevWarmups;
            const updated = { ...prevWarmups, [drillId]: true };
            try {
              localStorage.setItem(STORAGE_KEY_WARMUPS, JSON.stringify(updated));
            } catch {
              // safe fallback
            }
            return updated;
          });
        }
      }

      return next;
    });
  }, [recordTaskCompletionStartTime]);

  const handleToggleAllDrillPhases = useCallback((drillId: string, totalPhases: number) => {
    if (!drillId || totalPhases <= 0) return;
    setPhaseTasks((prev) => {
      let allDone = true;
      for (let i = 0; i < totalPhases; i++) {
        if (!prev[`${drillId}_phase_${i}`]) {
          allDone = false;
          break;
        }
      }
      const targetState = !allDone;
      if (targetState) {
        recordTaskCompletionStartTime();
      }
      const next = { ...prev };
      for (let i = 0; i < totalPhases; i++) {
        next[`${drillId}_phase_${i}`] = targetState;
      }
      try {
        localStorage.setItem(STORAGE_KEY_PHASE_TASKS, JSON.stringify(next));
      } catch {
        // safe fallback
      }

      if (targetState) {
        setCompletedWarmups((prevWarmups) => {
          if (prevWarmups[drillId]) return prevWarmups;
          const updated = { ...prevWarmups, [drillId]: true };
          try {
            localStorage.setItem(STORAGE_KEY_WARMUPS, JSON.stringify(updated));
          } catch {
            // safe fallback
          }
          return updated;
        });
      }

      return next;
    });
  }, [recordTaskCompletionStartTime]);

  const [expandedWarmupInstructions, setExpandedWarmupInstructions] = useState<Record<string, boolean>>({});

  const handleToggleWarmupInstructions = useCallback((drillId: string) => {
    setExpandedWarmupInstructions((prev) => ({
      ...prev,
      [drillId]: !prev[drillId],
    }));
  }, []);

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

  // 6b. Bi-Weekly Mobility Assessment Check-In State (Every 14 Days)
  const [mobilitySnoozeTimestamp, setMobilitySnoozeTimestamp] = useState<number | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_MOBILITY_SNOOZE);
      return stored ? Number(stored) : null;
    } catch {
      return null;
    }
  });

  const mobilityCheckInStatus = useMemo(() => {
    return getMobilityCheckInStatus(mobilityHistory, mobilitySnoozeTimestamp);
  }, [mobilityHistory, mobilitySnoozeTimestamp]);

  const handleSnoozeMobilityPrompt = useCallback(() => {
    const twoDaysMs = Date.now() + 2 * 24 * 60 * 60 * 1000;
    try {
      localStorage.setItem(STORAGE_KEY_MOBILITY_SNOOZE, String(twoDaysMs));
    } catch {
      // safe fallback
    }
    setMobilitySnoozeTimestamp(twoDaysMs);
  }, []);

  const handleDismissMobilityPrompt = useCallback(() => {
    const sevenDaysMs = Date.now() + 7 * 24 * 60 * 60 * 1000;
    try {
      localStorage.setItem(STORAGE_KEY_MOBILITY_SNOOZE, String(sevenDaysMs));
    } catch {
      // safe fallback
    }
    setMobilitySnoozeTimestamp(sevenDaysMs);
  }, []);

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
    return gateReason(increaseGate(new Date(), loadCachedHealth(), loadCachedWorkouts(), checkIns));
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

  // Update a single set log record (stable across workoutLogs updates so memoized ExerciseCards do not re-render)
  const handleUpdateSetLog = useCallback(
    (exerciseId: string, setIndex: number, updated: Partial<SetLogRecord>) => {
      if (updated.isCompleted === true) {
        recordTaskCompletionStartTime();
      }
      const targetExercise = sessionExercises.find((e) => e.id === exerciseId) ||
                             activeSession.dailyCoreFinisher?.find((e) => e.id === exerciseId);

      if (updated.isCompleted === true && targetExercise) {
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

  // Identify the current active (first uncompleted) exercise and warmup drill for Focus Mode
  const activeFocusExerciseId = useMemo(() => {
    const firstUncompleted = sessionExercises.find((ex) => {
      const logs = getExerciseLogs(ex);
      return logs.some((l) => !l.isCompleted);
    });
    return firstUncompleted?.id ?? null;
  }, [sessionExercises, getExerciseLogs]);

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

      {/* Sync Notification Banner */}
      {syncToast && (
        <aside
          role="status"
          aria-live="polite"
          className={`w-full px-3 sm:px-6 py-2 text-xs font-medium flex items-center justify-between border-b transition-all ${
            syncToast.type === 'success'
              ? 'bg-emerald-950/95 border-emerald-600/80 text-emerald-200'
              : 'bg-rose-950/95 border-rose-600/80 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
            {syncToast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span className="flex-1 font-sans">{syncToast.message}</span>
            <button
              type="button"
              onClick={() => setSyncToast(null)}
              className="text-slate-400 hover:text-white px-2 py-0.5 rounded cursor-pointer text-xs"
              aria-label="Dismiss sync notification"
            >
              ✕
            </button>
          </div>
        </aside>
      )}

      {/* Main View Area */}
      <main className="flex-1 w-full max-w-full overflow-x-hidden min-w-0 mx-auto pb-32 sm:pb-32">
        {/* Bi-Weekly Mobility Assessment Reminder Banner */}
        {mobilityCheckInStatus.isDue && currentView !== 'mobility' && (
          <aside
            role="region"
            aria-label="Bi-Weekly Mobility Check-In Prompt"
            data-testid="biweekly-mobility-prompt"
            className="w-full bg-gradient-to-r from-emerald-950 via-slate-900 to-sky-950 border-b border-emerald-500/40 px-2.5 sm:px-6 py-2 sm:py-3 text-white shadow-lg animate-in fade-in slide-in-from-top-2"
          >
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0">
                  <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <h3 className="font-bold text-xs sm:text-base text-white truncate">
                      🗓 Bi-Weekly Mobility Assessment Due
                    </h3>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0">
                      {mobilityCheckInStatus.daysSinceLastAssessment !== null
                        ? `${mobilityCheckInStatus.daysSinceLastAssessment} days since last test`
                        : 'Initial Baseline Needed'}
                    </span>
                  </div>
                  <p className="hidden md:block text-xs text-slate-300 mt-0.5 leading-relaxed">
                    Every 2 weeks, assess your 5 mobility benchmarks (Ankle Dorsiflexion, Elephant Walk Hamstring Reach, Split Squat Elevation, Biering-Sørensen Lumbar Endurance, and Dead Hang) to measure how your warm-ups and adaptive stretching are restoring joint mobility.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  data-testid="biweekly-mobility-log-now-btn"
                  onClick={() => setCurrentView('mobility')}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1 cursor-pointer shadow-md transition-all active:scale-95"
                >
                  <span>Log Mobility Now</span>
                  <span>➔</span>
                </button>
                <button
                  type="button"
                  data-testid="biweekly-mobility-snooze-btn"
                  onClick={handleSnoozeMobilityPrompt}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold cursor-pointer transition-colors"
                  title="Remind me again in 2 days"
                >
                  Snooze 2 Days
                </button>
                <button
                  type="button"
                  data-testid="biweekly-mobility-dismiss-btn"
                  onClick={handleDismissMobilityPrompt}
                  aria-label="Dismiss mobility reminder"
                  className="text-slate-400 hover:text-white p-1 rounded cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center"
                >
                  ✕
                </button>
              </div>
            </div>
          </aside>
        )}

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

            {/* Session Completion Celebration Toast */}
            {sessionCompletionToast && (
              <aside
                role="status"
                aria-live="polite"
                data-testid="session-completion-toast"
                className="w-full px-3 sm:px-6 py-2.5 bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 border-b border-emerald-500/50 text-white shadow-xl flex items-center justify-between gap-3 text-xs sm:text-sm animate-in fade-in slide-in-from-top-2"
              >
                <div className="max-w-7xl mx-auto w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-base sm:text-lg">🎉</span>
                    <div>
                      <span className="font-bold text-white">
                        {sessionCompletionToast.completedTitle} Completed!
                      </span>{' '}
                      {sessionCompletionToast.durationSeconds !== undefined && sessionCompletionToast.durationSeconds > 0 && (
                        <span className="font-semibold text-cyan-300 mr-1.5">
                          ({Math.max(1, Math.round(sessionCompletionToast.durationSeconds / 60))} min) ·
                        </span>
                      )}
                      <span className="text-emerald-300">
                        Card hidden & automatically moved to {sessionCompletionToast.nextTitle}.
                      </span>
                      {sessionCompletionToast.calendarLogged && (
                        <span
                          data-testid="toast-calendar-logged-badge"
                          className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-semibold"
                        >
                          📅 Logged to 'Workouts' Calendar
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSessionId(sessionCompletionToast.completedId);
                        setSessionCompletionToast(null);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 cursor-pointer"
                    >
                      View {sessionCompletionToast.completedTitle}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentView('stretching');
                        setSessionCompletionToast(null);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold cursor-pointer"
                    >
                      Stretching ➔
                    </button>
                    <button
                      type="button"
                      onClick={() => setSessionCompletionToast(null)}
                      aria-label="Dismiss completion notification"
                      className="text-slate-400 hover:text-white px-1.5 py-0.5 rounded cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </aside>
            )}

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

        {/* View: Daily Body Readiness & Recovery Check-In */}
        {currentView === 'readiness' && (
          <div className="px-1 sm:px-3 md:px-6 py-2.5 sm:py-6 w-full max-w-7xl mx-auto space-y-4 sm:space-y-6">
            <Suspense fallback={<ViewLoadingFallback />}>
              <AdaptiveBodyCoachWidget
                activeSession={activeSession}
                history={Object.values(completedWorkouts)}
                appliedAdaptations={programAdaptations}
                onApplyAdaptations={handleApplyWeeklyAdaptations}
                onResetAdaptations={handleResetWeeklyAdaptations}
                defaultExpanded={true}
              />
            </Suspense>
            <Suspense fallback={<ViewLoadingFallback />}>
              <DailyReadinessWidget
                activeSession={activeSession}
                onApplyAdaptations={handleApplyWeeklyAdaptations}
                onNavigateToWorkout={() => setCurrentView('workout')}
              />
            </Suspense>
          </div>
        )}

        {/* View 2: Mobility & Flexibility Tracker */}
        {currentView === 'mobility' && (
          <div className="px-1 sm:px-3 md:px-6 py-2.5 sm:py-6 w-full max-w-7xl mx-auto">
            <Suspense fallback={<ViewLoadingFallback />}>
              <MobilityTrackerWidget />
            </Suspense>
          </div>
        )}

        {/* View 3: Adaptive Stretching Routine (Based on 2-week workout comments & mobility data) */}
        {currentView === 'stretching' && (
          <div className="px-1 sm:px-3 md:px-6 py-2.5 sm:py-6 w-full max-w-7xl mx-auto">
            <Suspense fallback={<ViewLoadingFallback />}>
              <StretchingRoutineWidget
                workoutLogs={workoutLogs}
                mobilityHistory={mobilityHistory}
                onPlayChime={() => {
                  if (!isMuted) audioSynthesizer.playTone('completion');
                }}
              />
            </Suspense>
          </div>
        )}

        {/* View 4: Progress Chart, Projections & Muscle Fatigue Heatmap */}
        {currentView === 'progress' && (
          <div className="px-1 sm:px-3 md:px-6 py-2.5 sm:py-6 w-full max-w-7xl mx-auto space-y-4 sm:space-y-6">
            <Suspense fallback={<ViewLoadingFallback />}>
              <MuscleHeatmapWidget
                history={Object.values(completedWorkouts)}
                activeLogs={workoutLogs}
              />
            </Suspense>
            <Suspense fallback={<ViewLoadingFallback />}>
              <ProgressChartWidget
                workoutLogs={workoutLogs}
                mobilityHistory={mobilityHistory}
                programAdaptations={programAdaptations}
                history={Object.values(completedWorkouts)}
              />
            </Suspense>
          </div>
        )}

        {/* View 5: Quarterly Fitness Assessment */}
        {currentView === 'assessment' && (
          <div className="px-1 sm:px-3 md:px-6 py-2.5 sm:py-6 w-full max-w-7xl mx-auto space-y-4 sm:space-y-6">
            <Suspense fallback={<ViewLoadingFallback />}>
              <AthleteProfileCard />
              <AdaptationClocksWidget />
              <StrengthHeatmapWidget history={Object.values(completedWorkouts)} />
              <QuarterlyAssessmentWidget />
            </Suspense>
          </div>
        )}

        {/* View 6: Guide (workout cue sheets + glossary) */}
        {currentView === 'guide' && (
          <div className="px-1 sm:px-3 md:px-6 py-2.5 sm:py-6 w-full max-w-3xl mx-auto">
            <Suspense fallback={<ViewLoadingFallback />}>
              <GuideWidget sessions={guideSessions} initialSessionId={activeSessionId} onOpenCueCard={handleOpenCueCard} />
            </Suspense>
          </div>
        )}
      </main>

      {/* Mobile Bottom Thumb-Zone Quick Navigation Bar (Optimized for Pixel 9 Pro XL 20:9 screen) */}
      <nav
        aria-label="Mobile Thumb-Zone Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-slate-950/95 backdrop-blur-md border-t border-slate-800/90 px-1 pt-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] grid grid-cols-7 gap-0.5 shadow-2xl"
      >
        {(
          [
            { id: 'workout', label: 'Routine', icon: Dumbbell },
            { id: 'readiness', label: 'Check-In', icon: HeartPulse },
            { id: 'mobility', label: 'Mobility', icon: Activity },
            { id: 'stretching', label: 'Stretch', icon: Sparkles },
            { id: 'progress', label: 'Progress', icon: TrendingUp },
            { id: 'assessment', label: 'Assess', icon: Trophy },
            { id: 'guide', label: 'Guide', icon: BookOpen },
          ] as const
        ).map(({ id, label, icon: Icon }) => {
          const isActive = currentView === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setCurrentView(id)}
              aria-label={`Quick switch to ${label} view`}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center justify-center min-h-[44px] py-1 px-0.5 rounded-xl text-[9px] sm:text-[10px] font-semibold transition-all cursor-pointer active:scale-95 ${
                isActive
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 mb-0.5 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span className="truncate max-w-full">{label}</span>
            </button>
          );
        })}
      </nav>

      {/* Jump to the next unfinished set: the first lift sits a few screens below the warmups */}
      {currentView === 'workout' && nextOpenSet && (
        <button
          type="button"
          data-testid="jump-next-set-btn"
          onClick={handleJumpToNextSet}
          className="fixed bottom-14 left-3 md:bottom-4 z-40 max-w-[calc(100vw-11rem)] min-h-[48px] px-3 rounded-2xl bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-white shadow-2xl border border-emerald-400/50 flex items-center gap-2 text-left cursor-pointer"
          aria-label={`Jump to ${nextOpenSet.exercise.name}, set ${nextOpenSet.setIndex + 1}`}
        >
          <ChevronDown className="w-4 h-4 shrink-0" />
          <span className="min-w-0 leading-tight">
            <span className="block text-[11px] font-semibold opacity-90">Next · Set {nextOpenSet.setIndex + 1}</span>
            <span className="jump-next-name block text-sm font-bold truncate" data-name={nextOpenSet.exercise.name} />
          </span>
        </button>
      )}

      {/* Docked Rest Timer Widget (Always Available) */}
      <RestTimerWidget
        variant="docked"
        activePresetSeconds={activeRestSeconds}
        activeRestContext={activeRestContext}
        onClearActivePreset={handleClearActivePreset}
        onStartNextSet={handleStartNextSet}
      />

      {/* Marcus Filly Tempo Metronome Modal (When Triggered) */}
      {activeTempo && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Marcus Filly Tempo Metronome"
        >
          <div className="max-w-2xl w-full my-auto">
            <Suspense fallback={<ViewLoadingFallback />}>
              <TempoMetronomeWidget
                initialTempo={activeTempo}
                initialTargetReps={(() => {
                  if (activeTempoTargetReps !== undefined) return activeTempoTargetReps;
                  if (!activeTempoExerciseId) return 10;
                  const allExs = [
                    ...Object.values(adaptedSessions).flatMap((s) => [
                      ...s.exercises,
                      ...(s.dailyCoreFinisher || []),
                    ]),
                    ...sessionExercises,
                    ...(activeSession.dailyCoreFinisher || []),
                  ];
                  const ex = allExs.find((e) => e.id === activeTempoExerciseId);
                  if (!ex) return 10;
                  const tempoLower = (ex.tempo || '').toLowerCase();
                  const targetRepsLower = (ex.targetReps || '').toLowerCase();
                  const isHold =
                    tempoLower.includes('hold') ||
                    tempoLower.includes('isometric') ||
                    tempoLower.startsWith('hold-') ||
                    targetRepsLower.includes('hold') ||
                    (targetRepsLower.includes('s') && (targetRepsLower.includes('–') || targetRepsLower.includes('-')));
  
                  if (isHold && !targetRepsLower.includes('reps')) {
                    return 1;
                  }
                  const currentLogs = getExerciseLogs(ex);
                  const nextUncompleted = currentLogs.find((s) => !s.isCompleted);
                  return extractTargetReps(nextUncompleted?.targetReps || ex.targetReps, 10);
                })()}
                exerciseId={activeTempoExerciseId || undefined}
                autoStart={true}
                onSetComplete={handleTempoSetComplete}
                onClose={() => {
                  setActiveTempo(null);
                  setActiveTempoExerciseId(null);
                }}
              />
            </Suspense>
          </div>
        </div>
      )}

      {/* Modals are separate chunks; nothing shows while one loads */}
      <Suspense fallback={null}>
      {/* Creator Cue Card Modal */}
      <CueCardModal
        cueCard={activeCueCard}
        isOpen={!!activeCueCard}
        onClose={() => setActiveCueCardId(null)}
        onLaunchTempo={
          activeCueCardTimed
            ? (tempo) => {
                setActiveTempo(tempo);
                setActiveTempoExerciseId(activeCueCard?.exerciseId || null);
              }
            : undefined
        }
        onPhaseTaskToggle={(phaseKey, isDone) => {
          setPhaseTasks((prev) => ({ ...prev, [phaseKey]: isDone }));
        }}
      />

      {/* Weekly Evaluation & AI Coach Modal */}
      <WeeklyEvaluationModal
        isOpen={isWeeklyModalOpen}
        onClose={() => setIsWeeklyModalOpen(false)}
        evaluation={weeklyEvaluation}
        onApplyAdaptations={handleApplyWeeklyAdaptations}
        onResetAdaptations={handleResetWeeklyAdaptations}
        hasAppliedAdaptations={Object.keys(programAdaptations).length > 0}
      />

      {/* Workout Session Completion & Skipped Exercise Auto-Regulation Modal */}
      {sessionAuditResult && (
        <WorkoutCompletionModal
          isOpen={isWorkoutCompletionModalOpen}
          session={activeSession}
          audit={sessionAuditResult}
          onApplyAdjustmentsAndComplete={handleApplyCompletionAdjustments}
          onCompleteWithoutAdjustments={handleCompleteWithoutAdjustments}
          isSaving={isSavingAndAdvancing}
          onClose={() => {
            if (isSavingAndAdvancing) return;
            setIsWorkoutCompletionModalOpen(false);
            setSessionAuditResult(null);
          }}
        />
      )}

      {/* Workout History & Past Session Log Editor Modal */}
      <WorkoutHistoryModal
        isOpen={isWorkoutHistoryModalOpen}
        onClose={() => setIsWorkoutHistoryModalOpen(false)}
        onSessionUpdated={() => {
          handleScanLastWorkout();
        }}
        activeSession={activeSession}
        workoutLogs={workoutLogs}
        onSaveCurrentSessionToHistory={handleSaveCurrentSessionToHistory}
        onResetAllAndStartFresh={handleResetAllAndStartFresh}
      />
      </Suspense>

      {/* 1-Tap Muscle Fatigue & Recovery Heatmap Modal */}
      {isHeatmapModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Muscle Fatigue Heatmap Modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in"
        >
          <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-3 sm:p-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base sm:text-lg font-bold text-white">Muscle Fatigue & Recovery Status</h3>
              </div>
              <button
                type="button"
                data-testid="close-heatmap-modal-btn"
                onClick={() => setIsHeatmapModalOpen(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                aria-label="Close Muscle Heatmap Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <Suspense fallback={<ViewLoadingFallback />}>
              <MuscleHeatmapWidget
                history={Object.values(completedWorkouts)}
                activeLogs={workoutLogs}
              />
            </Suspense>
          </div>
        </div>
      )}
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

