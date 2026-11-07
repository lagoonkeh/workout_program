import { useState, useEffect, useMemo, useCallback, useRef, Suspense } from 'react';
import {
  MobilityTrackerWidget,
  StretchingRoutineWidget,
  ProgressChartWidget,
  QuarterlyAssessmentWidget,
  StrengthHeatmapWidget,
  AthleteProfileCard,
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
import { ExerciseCard, SetLogRecord } from './components/ExerciseCard';
import { RestTimerWidget, RestTargetContext } from './components/RestTimerWidget';
import { LazyExerciseDiagram as ExerciseDiagram } from './components/LazyExerciseDiagram';
import { WarmupPhaseSubCard } from './components/WarmupPhaseSubCard';
import { EXERCISE_VISUALS } from './domain/exerciseVisualsData';
import { Flame, ChevronDown, ChevronUp, Clock, RotateCcw, BookOpen, Check, CheckCircle2, AlertCircle, Sparkles, Zap, ListOrdered, Crosshair, Minimize2, Maximize2, Dumbbell, Activity, TrendingUp, Trophy, HeartPulse, ArrowLeftRight, Play, Timer, X, Layers } from 'lucide-react';
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

function ViewLoadingFallback() {
  return (
    <div className="flex items-center justify-center py-16 text-slate-400 text-sm" role="status">
      Loading…
    </div>
  );
}

// The cue card data (~130 KB) is its own chunk; start fetching it as soon as the app module runs
void loadCueCards().catch(() => {});

const TIER_META: Record<string, { label: string; desc: string; badgeClass: string }> = {
  T1: {
    label: 'Tier 1',
    desc: 'Strength & Powerbuilding (AMRAP)',
    badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  },
  T2: {
    label: 'Tier 2',
    desc: 'Hypertrophy & Work Capacity',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },
  T3: {
    label: 'Tier 3',
    desc: 'Accessory & Joint Bulletproofing',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },
};

function createDefaultExerciseLogs(exercise: WorkoutExercise): SetLogRecord[] {
  return Array.from({ length: exercise.targetSets }, (_, i) => ({
    setNumber: i + 1,
    targetReps: exercise.targetReps,
    weightLbs: exercise.defaultWeightLbs || exercise.defaultWeight || 0,
    repsAchieved: 0,
    isCompleted: false,
    notes: '',
  }));
}

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
        suggestion: suggestNextLoad(ex, basis, { deload: isDeloadWeek && !finisherIds.has(ex.id) }),
      };
    }
    return map;
  }, [completedWorkouts, sessionExercises, activeSession.dailyCoreFinisher, isDeloadWeek]);

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
  type AppliedSuggestion = LoadSuggestion & { key: string; fromWeightLbs: number; undone?: boolean };
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
          const write = s.change !== 'hold' || prev?.change === 'deload';
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
              {/* Session Overview Card (Collapsible) */}
              {isSessionOverviewCollapsed ? (
                /* Collapsed Session Header Summary */
                <div className="bg-slate-900 border border-slate-800 rounded-xl sm:rounded-2xl px-3 py-2 sm:px-4 sm:py-2.5 mb-3 sm:mb-5 shadow-xl transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <button
                      type="button"
                      onClick={handleToggleSessionOverview}
                      className="flex items-center gap-2 text-left flex-1 min-w-0 cursor-pointer group"
                      aria-expanded={false}
                      aria-label="Expand session overview details"
                    >
                      <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                      <h2 className="text-xs sm:text-sm font-bold text-white group-hover:text-emerald-300 transition-colors truncate">
                        {activeSession.title} — {activeSession.subtitle}
                      </h2>
                      <span className="text-[10px] sm:text-xs font-mono text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full shrink-0">
                        {sessionStats[activeSessionId]?.completedSets || 0}/{sessionStats[activeSessionId]?.totalSets || 0} sets
                      </span>
                    </button>

                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 max-w-full justify-start sm:justify-end shrink-0">
                      {/* Periodized Cycle Wave Selector */}
                      <div
                        data-testid="session-cycle-selector"
                        className="flex items-center gap-1 p-0.5 rounded-xl bg-slate-950 border border-slate-700/80 shrink-0"
                      >
                        <button
                          type="button"
                          data-testid="cycle-a-btn"
                          onClick={() => {
                            if (currentSessionCycle !== 'A') handleToggleSessionCycle();
                          }}
                          aria-pressed={currentSessionCycle === 'A'}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            currentSessionCycle === 'A'
                              ? 'bg-emerald-500 text-slate-950 shadow-sm font-black'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                          title="Cycle A: Primary Baseline Compound Strength & Hypertrophy"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Cycle A (Base)</span>
                        </button>
                        <button
                          type="button"
                          data-testid="cycle-b-btn"
                          onClick={() => {
                            if (currentSessionCycle !== 'B') handleToggleSessionCycle();
                          }}
                          aria-pressed={currentSessionCycle === 'B'}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            currentSessionCycle === 'B'
                              ? 'bg-purple-500 text-slate-950 shadow-sm font-black'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                          title="Cycle B: Periodized Variations (Pause Squats, Deficit RDLs, Landmine, etc.)"
                        >
                          <Layers className="w-3 h-3" />
                          <span>Cycle B (Wave)</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={handleToggleFocusMode}
                        aria-pressed={isFocusMode}
                        aria-label="Toggle Focus Mode"
                        title="Focus Mode: Keep only the active uncompleted exercise expanded"
                        className={`flex items-center gap-1 px-2 py-1 rounded-xl border text-[11px] font-semibold cursor-pointer transition-all ${
                          isFocusMode
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700/80'
                        }`}
                      >
                        <Crosshair className="w-3 h-3" />
                        <span>Focus</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleToggleBulkCollapse}
                        aria-label={bulkCollapseState === 'collapsed' ? 'Expand all cards' : 'Collapse all cards'}
                        title={bulkCollapseState === 'collapsed' ? 'Expand all exercise and warmup cards' : 'Collapse all exercise and warmup cards'}
                        className="flex items-center gap-1 px-2 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80 text-[11px] font-medium cursor-pointer transition-colors"
                      >
                        {bulkCollapseState === 'collapsed' ? (
                          <>
                            <Maximize2 className="w-3 h-3 text-emerald-400" />
                            <span>Expand All</span>
                          </>
                        ) : (
                          <>
                            <Minimize2 className="w-3 h-3 text-slate-400" />
                            <span>Collapse All</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        data-testid="split-all-unilateral-btn"
                        onClick={handleToggleSplitAllUnilateral}
                        title="Split all unilateral exercises in this session into independent Left and Right side workouts to be completed"
                        aria-label="Split all unilateral exercises into Left and Right workouts"
                        className="flex items-center gap-1 px-2 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-300 border border-slate-700/80 text-[11px] font-medium cursor-pointer transition-colors"
                      >
                        <ArrowLeftRight className="w-3 h-3 text-blue-400" />
                        <span>L/R Sides</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleResetSessionLogs}
                        title="Reset completed sets for this session"
                        className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer border border-slate-700/60"
                        aria-label="Reset session logs"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={handleToggleSessionOverview}
                        aria-expanded={false}
                        aria-label="Expand session overview"
                        className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80 text-xs font-medium cursor-pointer transition-colors"
                      >
                        <span>Expand</span>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Expanded Session Header Card */
                <div className="bg-slate-900 border border-slate-800 rounded-xl sm:rounded-2xl p-3 sm:p-5 mb-3 sm:mb-5 shadow-xl transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2.5 mb-2">
                    <button
                      type="button"
                      onClick={handleToggleSessionOverview}
                      className="text-left cursor-pointer group flex-1 min-w-0"
                      aria-expanded={true}
                      aria-label="Collapse session header"
                    >
                      <h2 className="text-base sm:text-2xl font-bold text-white group-hover:text-emerald-300 transition-colors tracking-tight">
                        {activeSession.title} — {activeSession.subtitle}
                      </h2>
                    </button>

                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 max-w-full justify-start sm:justify-end shrink-0">
                      {/* Periodized Cycle Wave Selector */}
                      <div
                        data-testid="session-cycle-selector"
                        className="flex items-center gap-1 p-0.5 rounded-xl bg-slate-950 border border-slate-700/80 shrink-0"
                      >
                        <button
                          type="button"
                          data-testid="cycle-a-btn"
                          onClick={() => {
                            if (currentSessionCycle !== 'A') handleToggleSessionCycle();
                          }}
                          aria-pressed={currentSessionCycle === 'A'}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            currentSessionCycle === 'A'
                              ? 'bg-emerald-500 text-slate-950 shadow-sm font-black'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                          title="Cycle A: Primary Baseline Compound Strength & Hypertrophy"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Cycle A (Base)</span>
                        </button>
                        <button
                          type="button"
                          data-testid="cycle-b-btn"
                          onClick={() => {
                            if (currentSessionCycle !== 'B') handleToggleSessionCycle();
                          }}
                          aria-pressed={currentSessionCycle === 'B'}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            currentSessionCycle === 'B'
                              ? 'bg-purple-500 text-slate-950 shadow-sm font-black'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                          title="Cycle B: Periodized Variations (Pause Squats, Deficit RDLs, Landmine, etc.)"
                        >
                          <Layers className="w-3 h-3" />
                          <span>Cycle B (Wave)</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={handleToggleFocusMode}
                        aria-pressed={isFocusMode}
                        aria-label="Toggle Focus Mode"
                        title="Focus Mode: Keep only the active uncompleted exercise expanded"
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                          isFocusMode
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700/80'
                        }`}
                      >
                        <Crosshair className="w-3.5 h-3.5" />
                        <span>{isFocusMode ? 'Focus: ON' : 'Focus Mode'}</span>
                      </button>


                      <button
                        type="button"
                        data-testid="session-overview-heatmap-btn"
                        onClick={() => setIsHeatmapModalOpen(true)}
                        title="View anatomical muscle fatigue and recovery status"
                        aria-label="Open Muscle Recovery Heatmap"
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700/80 text-xs font-medium cursor-pointer transition-colors"
                      >
                        <Activity className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Heatmap</span>
                      </button>

                      <button
                        type="button"
                        data-testid="split-all-unilateral-btn"
                        onClick={handleToggleSplitAllUnilateral}
                        title="Split all unilateral exercises in this session into independent Left and Right side workouts to be completed"
                        aria-label="Split all unilateral exercises into Left and Right workouts"
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-300 border border-slate-700/80 text-xs font-medium cursor-pointer transition-colors"
                      >
                        <ArrowLeftRight className="w-3.5 h-3.5 text-blue-400" />
                        <span>L/R Sides</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleToggleBulkCollapse}
                        aria-label={bulkCollapseState === 'collapsed' ? 'Expand all cards' : 'Collapse all cards'}
                        title={bulkCollapseState === 'collapsed' ? 'Expand all exercise and warmup cards' : 'Collapse all exercise and warmup cards'}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80 text-xs font-medium cursor-pointer transition-colors"
                      >
                        {bulkCollapseState === 'collapsed' ? (
                          <>
                            <Maximize2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="hidden xs:inline">Expand All</span>
                          </>
                        ) : (
                          <>
                            <Minimize2 className="w-3.5 h-3.5 text-slate-400" />
                            <span className="hidden xs:inline">Collapse All</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleToggleSessionOverview}
                        aria-expanded={true}
                        aria-label="Collapse session overview"
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80 text-xs font-medium cursor-pointer transition-colors shrink-0"
                        title="Collapse session overview"
                      >
                        <span>Collapse</span>
                        <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-300 mb-3 max-w-2xl leading-relaxed">
                    {activeSession.focus}
                  </p>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Warm-Up Progress Badge */}
                    {activeSession.warmupSequence && activeSession.warmupSequence.length > 0 && (
                      <div className="flex items-center gap-1.5 font-mono text-xs text-amber-300 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/30 whitespace-nowrap">
                        <Flame className="w-3.5 h-3.5 text-amber-400" />
                        <span>
                          Warmup: {activeSession.warmupSequence.filter((w) => !!completedWarmups[w.id]).length}/{activeSession.warmupSequence.length}
                        </span>
                      </div>
                    )}

                    {/* Workout Sets Progress Badge */}
                    <div className="flex items-center gap-1.5 font-mono text-xs text-emerald-300 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/30 whitespace-nowrap">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>
                        Sets: {sessionStats[activeSessionId]?.completedSets || 0}/{sessionStats[activeSessionId]?.totalSets || 0}
                      </span>
                    </div>

                    {/* Live Session Volume Tonnage Badge (Hevy / Strong inspired) */}
                    {sessionTelemetry.totalTonnageLbs > 0 && (
                      <div
                        data-testid="session-tonnage-badge"
                        className="flex items-center gap-1.5 font-mono text-xs text-cyan-300 bg-cyan-500/10 px-3 py-1.5 rounded-xl border border-cyan-500/30 whitespace-nowrap"
                      >
                        <Dumbbell className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Tonnage: {sessionTelemetry.totalTonnageLbs.toLocaleString()} lbs</span>
                      </div>
                    )}

                    {/* Live Session PR Counter Badge */}
                    {sessionTelemetry.prCount > 0 && (
                      <div
                        data-testid="session-prs-badge"
                        className="flex items-center gap-1.5 font-mono text-xs text-amber-300 bg-amber-500/15 px-3 py-1.5 rounded-xl border border-amber-400/50 whitespace-nowrap"
                      >
                        <Trophy className="w-3.5 h-3.5 text-amber-400" />
                        <span>PRs: {sessionTelemetry.prCount}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 font-mono text-xs text-sky-300 bg-sky-500/10 px-3 py-1.5 rounded-xl border border-sky-500/30 whitespace-nowrap">
                      <Clock className="w-3.5 h-3.5 text-sky-400" />
                      <span>~{activeSession.estimatedDurationMinutes} Minutes</span>
                    </div>


                    <button
                      type="button"
                      onClick={handleResetSessionLogs}
                      title="Reset completed sets for this session"
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer border border-slate-700/60"
                      aria-label="Reset session logs"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Planned deload / training block position */}
                  {activeSessionId in WORKOUT_PROGRAM && (
                    <div
                      data-testid="deload-banner"
                      className={`mt-3.5 p-2.5 sm:p-3 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                        isDeloadWeek
                          ? 'bg-sky-950/40 border-sky-500/40 text-sky-100'
                          : 'bg-slate-900/60 border-slate-700/60 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Activity className={`w-4 h-4 shrink-0 ${isDeloadWeek ? 'text-sky-400' : 'text-slate-400'}`} />
                        <span>
                          {isDeloadWeek ? (
                            <>
                              <strong>Deload week.</strong> About half the sets at ~85% weight, so you come back stronger next week.
                            </>
                          ) : deloadInfo.postponed ? (
                            <>
                              <strong>Deload pushed back</strong> to next week. Training as normal.
                            </>
                          ) : (
                            <>
                              <strong>Week {deloadInfo.blockWeek} of 5.</strong>{' '}
                              {deloadInfo.weeksUntilDeload === 1 ? 'Deload next week.' : `Deload in ${deloadInfo.weeksUntilDeload} weeks.`}
                            </>
                          )}
                        </span>
                      </div>
                      {(isDeloadWeek || deloadInfo.postponed) && (
                        <button
                          type="button"
                          data-testid="deload-postpone-btn"
                          onClick={() => handleSetDeloadPostponed(isDeloadWeek)}
                          className="text-xs underline font-semibold cursor-pointer whitespace-nowrap min-h-[36px] px-1 hover:opacity-80"
                        >
                          {isDeloadWeek ? 'Push back a week' : 'Deload this week'}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Active Program Adaptations Banner */}
                  {Object.keys(programAdaptations).length > 0 && (
                    <div className="mt-3.5 p-2.5 sm:p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-200">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>
                          <strong>Adaptive Program Active:</strong> {Object.keys(programAdaptations).length} weekly adaptations applied.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsWeeklyModalOpen(true)}
                        className="text-xs text-emerald-400 hover:text-emerald-300 underline font-semibold ml-2 cursor-pointer whitespace-nowrap"
                      >
                        Review & Edit
                      </button>
                    </div>
                  )}

                  {/* Custom Exercise Variations Active Banner */}
                  {Object.keys(customVariations).length > 0 && (
                    <div className="mt-2.5 p-2.5 sm:p-3 rounded-xl bg-blue-950/40 border border-blue-500/30 flex items-center justify-between text-xs text-blue-200">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-blue-400 shrink-0" />
                        <span>
                          <strong>Variable Workout Active:</strong> {Object.keys(customVariations).length} custom variation{Object.keys(customVariations).length === 1 ? '' : 's'} selected.
                        </span>
                      </div>
                      <button
                        type="button"
                        data-testid="reset-all-variations-btn"
                        onClick={() => handleResetSessionVariations()}
                        className="text-xs text-blue-400 hover:text-blue-300 underline font-semibold ml-2 cursor-pointer whitespace-nowrap"
                      >
                        Reset to Cycle Defaults
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Warm-Up Accordion Section */}
              {activeSession.warmupSequence && activeSession.warmupSequence.length > 0 && (
                <div className="mb-6 bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowWarmup(!showWarmup)}
                    className="w-full flex items-center justify-between p-4 sm:p-5 text-left font-bold text-slate-200 hover:text-white transition-colors cursor-pointer"
                    aria-expanded={showWarmup}
                  >
                    <div className="flex items-center gap-2.5">
                      <Flame className="w-5 h-5 text-amber-400" />
                      <span>
                        Warm-Up & Biomechanical Priming Sequence ({activeSession.warmupSequence.length} Drills)
                      </span>
                    </div>
                    {showWarmup ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </button>

                  {showWarmup && (
                    <div className="p-4 sm:p-6 pt-0 space-y-3.5 border-t border-slate-800/60">
                      {[...activeSession.warmupSequence]
                        .sort((a, b) => {
                          const aDone = !!completedWarmups[a.id];
                          const bDone = !!completedWarmups[b.id];
                          if (aDone === bDone) return 0;
                          return aDone ? 1 : -1;
                        })
                        .map((drill, idx) => {
                        const isDrillDone = !!completedWarmups[drill.id];
                        const focusWarmupDefaultCollapsed = isFocusMode ? drill.id !== activeFocusWarmupId : isDrillDone;
                        const isDrillCollapsed = collapsedWarmupDrills[drill.id] ?? focusWarmupDefaultCollapsed;
                        const drillVisual = EXERCISE_VISUALS[drill.id];
                        const matchingWarmupCueCard =
                          CUE_CARD_MAP.get(drill.id) ||
                          CUE_CARD_MAP.get(drill.name.toLowerCase());
                        const warmupInstructions = drill.setupInstructions || matchingWarmupCueCard?.setupInstructions || [];
                        const completedPhaseCount = warmupInstructions.filter(
                          (_, pIdx) => !!phaseTasks[`${drill.id}_phase_${pIdx}`]
                        ).length;
                        return (
                          <div
                            key={drill.id || idx}
                            className={`border rounded-xl p-3.5 text-xs text-slate-300 space-y-2 transition-all ${
                              isDrillDone
                                ? 'bg-emerald-950/20 border-emerald-500/50 shadow-sm shadow-emerald-950/40'
                                : 'bg-slate-950 border-slate-800/80'
                            }`}
                          >
                            <div className="flex items-center justify-between font-bold text-sm text-white flex-wrap gap-2">
                              <div className="flex items-center gap-2.5">
                                {drillVisual && (
                                  <ExerciseDiagram
                                    compact={true}
                                    diagramType={drillVisual.diagramType}
                                    exerciseName={drill.name}
                                    onOpenZoom={() => setActiveCueCardId(drill.id)}
                                  />
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleToggleWarmupDrillCollapse(drill.id, isDrillCollapsed)}
                                  className={`text-left hover:text-emerald-300 transition-colors cursor-pointer ${
                                    isDrillDone ? 'text-emerald-400 line-through' : ''
                                  }`}
                                >
                                  {idx + 1}. {drill.name}
                                </button>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                {warmupInstructions.length > 0 && (
                                  <span
                                    className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md border ${
                                      completedPhaseCount === warmupInstructions.length
                                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                        : completedPhaseCount > 0
                                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                        : 'bg-slate-800 text-slate-400 border-slate-700'
                                    }`}
                                    title={`${completedPhaseCount} of ${warmupInstructions.length} phases completed`}
                                  >
                                    {completedPhaseCount}/{warmupInstructions.length} Tasks
                                  </span>
                                )}
                                <span className="text-amber-400 font-mono text-xs">
                                  {drill.targetDurationOrReps}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleToggleWarmupDrill(drill.id, warmupInstructions.length)}
                                  aria-label={`Mark drill ${drill.name} as ${isDrillDone ? 'incomplete' : 'completed'}`}
                                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                                    isDrillDone
                                      ? 'bg-emerald-500/25 text-emerald-300 border-emerald-500/40'
                                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                                  }`}
                                >
                                  <div
                                    className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-all ${
                                      isDrillDone
                                        ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                                        : 'border-slate-500 bg-slate-900'
                                    }`}
                                  >
                                    {isDrillDone && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                  </div>
                                  <span>{isDrillDone ? 'Completed' : 'Complete'}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleWarmupDrillCollapse(drill.id, isDrillCollapsed)}
                                  aria-expanded={!isDrillCollapsed}
                                  aria-label={`${isDrillCollapsed ? 'Expand' : 'Collapse'} warmup drill ${drill.name}`}
                                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium cursor-pointer transition-colors"
                                >
                                  <span>{isDrillCollapsed ? 'Expand' : 'Collapse'}</span>
                                  {isDrillCollapsed ? (
                                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                                  ) : (
                                    <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                                  )}
                                </button>
                              </div>
                            </div>
                            {!isDrillCollapsed && (
                              <>
                                <div className="text-slate-400">
                                  <strong>Coach / Creator:</strong> {drill.creatorAttribution} ·{' '}
                                  <strong>Equipment:</strong> {drill.equipment}
                                </div>
                                <p className="text-slate-300 leading-relaxed">
                                  <strong>Purpose:</strong> {drill.biomechanicalPurpose}
                                </p>
                                <div className="text-slate-400 italic">💡 {drill.coachingNotes}</div>
                                {(() => {
                                  const matchingWarmupCueCard =
                                    CUE_CARD_MAP.get(drill.id) ||
                                    CUE_CARD_MAP.get(drill.name.toLowerCase());
                                  const warmupInstructions = drill.setupInstructions || matchingWarmupCueCard?.setupInstructions || [];

                                  return (
                                    <>
                                      <div className="flex flex-wrap items-center gap-3 pt-1">
                                        {/* 1-Tap Dedicated Warmup Drill Timer / Cadence Launcher */}
                                        {(() => {
                                          const drillTempo = drill.tempo || matchingWarmupCueCard?.tempo;
                                          const targetLower = drill.targetDurationOrReps.toLowerCase();
                                          const nameLower = drill.name.toLowerCase();
                                          const isIsometricHold =
                                            targetLower.includes('hold') ||
                                            nameLower.includes('hold') ||
                                            drillTempo?.toLowerCase().includes('hold') ||
                                            drillTempo?.toLowerCase().includes('0010');

                                          const isTimedMinutes = targetLower.includes('min');

                                          if (isTimedMinutes) {
                                            let timerSec = 180;
                                            if (targetLower.includes('4–5') || targetLower.includes('4-5') || targetLower.includes('5 min')) timerSec = 240;
                                            else if (targetLower.includes('5–6') || targetLower.includes('5-6') || targetLower.includes('6 min')) timerSec = 300;
                                            else if (targetLower.includes('3–4') || targetLower.includes('3-4')) timerSec = 180;
                                            else if (targetLower.includes('3 min')) timerSec = 180;

                                            return (
                                              <button
                                                type="button"
                                                onClick={() => handleQuickStartRest(timerSec)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-semibold text-xs cursor-pointer shadow-md shadow-blue-900/30 transition-all"
                                                title={`Start ${Math.round(timerSec / 60)}-minute drill clock`}
                                                aria-label={`Start ${Math.round(timerSec / 60)}-minute drill clock`}
                                              >
                                                <Timer className="w-3.5 h-3.5" />
                                                <span>Start {Math.round(timerSec / 60)}-Min Drill Clock</span>
                                              </button>
                                            );
                                          }

                                          if (isIsometricHold) {
                                            const holdSec = targetLower.includes('10s') ? 10 : targetLower.includes('30s') ? 30 : 10;
                                            const targetReps = targetLower.includes('4 reps') ? 4 : targetLower.includes('8 reps') ? 8 : 4;
                                            return (
                                              <button
                                                type="button"
                                                onClick={() => handleQuickStartTempo(`HOLD-${holdSec}`, drill.id, targetReps)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-semibold text-xs cursor-pointer shadow-md shadow-emerald-900/30 transition-all"
                                                title={`Start ${holdSec}s Hold Clock (${targetReps} reps/side)`}
                                                aria-label={`Start ${holdSec}s Hold Clock (${targetReps} reps/side)`}
                                              >
                                                <Flame className="w-3.5 h-3.5 text-amber-300" />
                                                <span>Start {holdSec}s Hold Clock ({targetReps} reps/side)</span>
                                              </button>
                                            );
                                          }

                                          if (drillTempo) {
                                            const targetReps = extractTargetReps(drill.targetDurationOrReps, 10);
                                            const tempoLabel = drillTempo.startsWith('HOLD-')
                                              ? `${drillTempo.replace('HOLD-', '')}s Hold`
                                              : drillTempo === '5083'
                                              ? '90/90 Breathing (5-0-8-3)'
                                              : drillTempo === '4040'
                                              ? 'Cat-Camel Wave (4040)'
                                              : drillTempo === '4083'
                                              ? 'Vacuum Breath (4083)'
                                              : `Cadence (${drillTempo})`;

                                            return (
                                              <button
                                                type="button"
                                                onClick={() => handleQuickStartTempo(drillTempo, drill.id, targetReps)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-white font-semibold text-xs cursor-pointer shadow-md shadow-emerald-950/30 transition-all"
                                                title={`Start metronome cadence ${drillTempo} for ${targetReps} reps`}
                                                aria-label={`Start metronome cadence ${drillTempo} for ${targetReps} reps`}
                                              >
                                                <Play className="w-3.5 h-3.5 fill-white" />
                                                <span>Start {tempoLabel} ({targetReps} reps)</span>
                                              </button>
                                            );
                                          }

                                          return null;
                                        })()}

                                        <button
                                          type="button"
                                          onClick={() => setActiveCueCardId(drill.id)}
                                          className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer text-xs transition-colors"
                                        >
                                          <BookOpen className="w-3.5 h-3.5" />
                                          <span>View Technique Cues & Science</span>
                                        </button>

                                        {warmupInstructions.length > 0 && (
                                          <button
                                            type="button"
                                            onClick={() => handleToggleWarmupInstructions(drill.id)}
                                            className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white font-medium cursor-pointer text-xs transition-colors"
                                          >
                                            <ListOrdered className="w-3.5 h-3.5 text-emerald-400" />
                                            <span>
                                              {expandedWarmupInstructions[drill.id] ? 'Hide Instructions' : 'Step-by-Step Instructions'}
                                            </span>
                                            {expandedWarmupInstructions[drill.id] ? (
                                              <ChevronUp className="w-3.5 h-3.5" />
                                            ) : (
                                              <ChevronDown className="w-3.5 h-3.5" />
                                            )}
                                          </button>
                                        )}
                                      </div>

                                      {expandedWarmupInstructions[drill.id] && warmupInstructions.length > 0 && (
                                        <div className="mt-2.5 p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 space-y-2.5 animate-in fade-in duration-200">
                                          <div className="font-bold text-slate-200 flex items-center justify-between pb-1.5 border-b border-slate-800/80 flex-wrap gap-2">
                                            <span className="flex items-center gap-1.5 text-emerald-400">
                                              <ListOrdered className="w-4 h-4" />
                                              <span>Execution Tasks & Phases</span>
                                            </span>
                                            <div className="flex items-center gap-2 text-[11px] font-mono">
                                              <span className="text-emerald-400 font-semibold">
                                                {completedPhaseCount}/{warmupInstructions.length} Done
                                              </span>
                                              <button
                                                type="button"
                                                onClick={() => handleToggleAllDrillPhases(drill.id, warmupInstructions.length)}
                                                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
                                              >
                                                {completedPhaseCount === warmupInstructions.length ? 'Reset All' : 'Mark All Done'}
                                              </button>
                                            </div>
                                          </div>
                                          <div className="space-y-2.5 pt-1">
                                            {warmupInstructions.map((instruction, sIdx) => {
                                              const phaseKey = `${drill.id}_phase_${sIdx}`;
                                              const isPhaseDone = !!phaseTasks[phaseKey];

                                              return (
                                                <WarmupPhaseSubCard
                                                  key={sIdx}
                                                  drillId={drill.id}
                                                  drillName={drill.name}
                                                  phaseIndex={sIdx}
                                                  totalPhases={warmupInstructions.length}
                                                  instruction={instruction}
                                                  isDone={isPhaseDone}
                                                  onToggleDone={() =>
                                                    handleTogglePhaseTask(phaseKey, drill.id, warmupInstructions.length)
                                                  }
                                                  drillVisual={drillVisual}
                                                  onOpenDemoModal={() => setActiveCueCardId(drill.id)}
                                                  onStartTimer={(seconds) => handleQuickStartRest(seconds)}
                                                />
                                              );
                                            })}
                                          </div>
                                        </div>
                                      )}
                                    </>
                                  );
                                })()}
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Collapsible Tier Sections */}
              <div className="space-y-4 sm:space-y-6">
                {(['T1', 'T2', 'T3'] as const).map((tierKey) => {
                  const tierExercises = sessionExercises.filter((ex) => ex.tier === tierKey);
                  if (tierExercises.length === 0) return null;

                  const isExpanded = expandedTiers[tierKey] !== false;
                  const meta = TIER_META[tierKey];

                  return (
                    <section
                      key={tierKey}
                      className="rounded-2xl bg-slate-900/60 border border-slate-800/80 overflow-hidden shadow-lg"
                      aria-label={`${meta.label}: ${meta.desc}`}
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleTier(tierKey)}
                        aria-expanded={isExpanded}
                        className="w-full flex items-center justify-between p-3.5 sm:p-4 text-left transition-colors cursor-pointer bg-slate-900/90 hover:bg-slate-800/70 border-b border-slate-800/60"
                      >
                        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
                          <span
                            className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg border ${meta.badgeClass}`}
                          >
                            {meta.label}
                          </span>
                          <span className="text-sm sm:text-base font-bold text-slate-200">
                            {meta.desc}
                          </span>
                          <span className="text-xs text-slate-500 font-mono">
                            ({tierExercises.length} {tierExercises.length === 1 ? 'Exercise' : 'Exercises'})
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-400">
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="p-2 sm:p-4 space-y-4">
                          {[...tierExercises]
                            .sort((a, b) => {
                              const aLogs = getExerciseLogs(a);
                              const bLogs = getExerciseLogs(b);
                              const aDone = aLogs.length > 0 && aLogs.every((l) => l.isCompleted);
                              const bDone = bLogs.length > 0 && bLogs.every((l) => l.isCompleted);
                              if (aDone === bDone) return 0;
                              return aDone ? 1 : -1;
                            })
                            .map((exercise) => {
                              const cardDefaultCollapsed = isFocusMode
                                ? exercise.id !== activeFocusExerciseId
                                : bulkCollapseState === 'collapsed'
                                ? true
                                : bulkCollapseState === 'expanded'
                                ? false
                                : undefined;
                              return (
                                <ExerciseCard
                                  key={exercise.id}
                                  exercise={exercise}
                                  logs={getExerciseLogs(exercise)}
                                  defaultCollapsed={cardDefaultCollapsed}
                                  collapseRevision={collapseRevision}
                                  onUpdateSetLog={handleUpdateSetLog}
                                  onResetExercise={handleResetExerciseLogs}
                                  onOpenCueCard={handleOpenCueCard}
                                  onQuickStartRest={(sec) => handleQuickStartRestForExercise(sec, exercise)}
                                  onQuickStartTempo={handleQuickStartTempo}
                                  onToggleSplitSides={handleToggleSplitSides}
                                  onSwitchToPairedSide={handleSwitchToPairedSide}
                                  isSideSplitActive={!!splitSidesExercises[exercise.baseExerciseId || exercise.id]}
                                  onSelectVariation={handleSelectExerciseVariation}
                                  currentCycle={currentSessionCycle}
                                  lastTime={progressionByExercise[exercise.id]?.last ?? null}
                                  loadSuggestion={appliedSuggestions[exercise.id] ?? null}
                                  onUndoSuggestion={handleUndoSuggestion}
                                />
                              );
                            })}
                        </div>
                      )}
                    </section>
                  );
                })}

                {/* Athlean-X Daily Core Finisher Section */}
                {activeSession.dailyCoreFinisher && activeSession.dailyCoreFinisher.length > 0 && (
                  <section
                    className="rounded-2xl bg-gradient-to-b from-amber-950/20 via-slate-900/90 to-slate-900 border border-amber-500/40 overflow-hidden shadow-xl"
                    aria-label="Athlean-X Daily Core Finisher"
                    data-testid="daily-core-finisher-section"
                  >
                    <button
                      type="button"
                      onClick={() => setIsDailyAbsFinisherExpanded((prev) => !prev)}
                      aria-expanded={isDailyAbsFinisherExpanded}
                      className="w-full flex items-center justify-between p-3.5 sm:p-4 text-left transition-colors cursor-pointer bg-slate-900/90 hover:bg-slate-800/70 border-b border-amber-500/30"
                    >
                      <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
                        <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg border bg-amber-500/20 text-amber-300 border-amber-500/40 flex items-center gap-1.5">
                          <Flame className="w-3.5 h-3.5 text-amber-400" />
                          <span>CORE FINISHER</span>
                        </span>
                        <span className="text-sm sm:text-base font-bold text-white">
                          Athlean-X Daily Core Progression
                        </span>
                        <span className="text-xs text-amber-300/80 font-mono">
                          (6-Min Kinetic Sequence · 6 Exercises)
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                          {isDailyAbsFinisherExpanded ? 'Hide Finisher' : 'Show Finisher'}
                        </span>
                        {isDailyAbsFinisherExpanded ? (
                          <ChevronUp className="w-5 h-5 text-amber-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-amber-400" />
                        )}
                      </div>
                    </button>

                    {isDailyAbsFinisherExpanded && (
                      <div className="p-2 sm:p-4 space-y-4">
                        <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-200">
                          <div>
                            <span className="font-bold text-amber-300">Jeff Cavaliere Kinetic Sequence:</span>{' '}
                            <span>Bottom-Up ➔ Rotational ➔ Mid-Range Hold ➔ Top-Down ➔ Flexion ➔ Core Cylinder</span>
                          </div>
                          {(() => {
                            const isAllCoreDone = !!activeSession.dailyCoreFinisher?.every((ex) => {
                              const l = getExerciseLogs(ex);
                              return l.length > 0 && l.every((s) => s.isCompleted);
                            });
                            return (
                              <button
                                type="button"
                                onClick={() => {
                                  const nextDone = !isAllCoreDone;
                                  activeSession.dailyCoreFinisher?.forEach((ex) => {
                                    handleUpdateSetLog(ex.id, 0, { isCompleted: nextDone });
                                  });
                                }}
                                className={`px-3 py-1.5 rounded-lg font-semibold border self-start sm:self-auto transition-colors flex items-center gap-1.5 cursor-pointer ${
                                  isAllCoreDone
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                                    : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40'
                                }`}
                              >
                                {isAllCoreDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                <span>{isAllCoreDone ? 'All 6 Core Sets Done ✓' : 'Mark All 6 Core Sets Done'}</span>
                              </button>
                            );
                          })()}
                        </div>

                        {activeSession.dailyCoreFinisher.map((exercise) => {
                          const cardDefaultCollapsed = isFocusMode
                            ? exercise.id !== activeFocusExerciseId
                            : bulkCollapseState === 'collapsed'
                            ? true
                            : bulkCollapseState === 'expanded'
                            ? false
                            : undefined;
                          return (
                            <ExerciseCard
                              key={exercise.id}
                              exercise={exercise}
                              logs={getExerciseLogs(exercise)}
                              defaultCollapsed={cardDefaultCollapsed}
                              collapseRevision={collapseRevision}
                              onUpdateSetLog={handleUpdateSetLog}
                              onResetExercise={handleResetExerciseLogs}
                              onOpenCueCard={handleOpenCueCard}
                              onQuickStartRest={(sec) => handleQuickStartRestForExercise(sec, exercise)}
                              onQuickStartTempo={handleQuickStartTempo}
                              onToggleSplitSides={handleToggleSplitSides}
                              onSwitchToPairedSide={handleSwitchToPairedSide}
                              onSelectVariation={handleSelectExerciseVariation}
                              currentCycle={currentSessionCycle}
                                  lastTime={progressionByExercise[exercise.id]?.last ?? null}
                                  loadSuggestion={appliedSuggestions[exercise.id] ?? null}
                                  onUndoSuggestion={handleUndoSuggestion}
                            />
                          );
                        })}
                      </div>
                    )}
                  </section>
                )}

                {/* Fallback for any non-T1/T2/T3 exercises */}
                {[...sessionExercises.filter((ex) => !['T1', 'T2', 'T3'].includes(ex.tier))]
                  .sort((a, b) => {
                    const aLogs = getExerciseLogs(a);
                    const bLogs = getExerciseLogs(b);
                    const aDone = aLogs.length > 0 && aLogs.every((l) => l.isCompleted);
                    const bDone = bLogs.length > 0 && bLogs.every((l) => l.isCompleted);
                    if (aDone === bDone) return 0;
                    return aDone ? 1 : -1;
                  })
                  .map((exercise) => {
                    const cardDefaultCollapsed = isFocusMode
                      ? exercise.id !== activeFocusExerciseId
                      : bulkCollapseState === 'collapsed'
                      ? true
                      : bulkCollapseState === 'expanded'
                      ? false
                      : undefined;
                    return (
                      <ExerciseCard
                        key={exercise.id}
                        exercise={exercise}
                        logs={getExerciseLogs(exercise)}
                        defaultCollapsed={cardDefaultCollapsed}
                        collapseRevision={collapseRevision}
                        onUpdateSetLog={handleUpdateSetLog}
                        onResetExercise={handleResetExerciseLogs}
                        onOpenCueCard={handleOpenCueCard}
                        onQuickStartRest={(sec) => handleQuickStartRestForExercise(sec, exercise)}
                        onQuickStartTempo={handleQuickStartTempo}
                        onToggleSplitSides={handleToggleSplitSides}
                        onSwitchToPairedSide={handleSwitchToPairedSide}
                        isSideSplitActive={!!splitSidesExercises[exercise.baseExerciseId || exercise.id]}
                        onSelectVariation={handleSelectExerciseVariation}
                        currentCycle={currentSessionCycle}
                                  lastTime={progressionByExercise[exercise.id]?.last ?? null}
                                  loadSuggestion={appliedSuggestions[exercise.id] ?? null}
                                  onUndoSuggestion={handleUndoSuggestion}
                      />
                    );
                  })}

                {/* Workout Completed Option Card at the End of All Exercise Cards */}
                <div
                  data-testid="workout-completion-card"
                  className="mt-6 p-4 sm:p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-emerald-950/30 to-slate-900 border border-emerald-500/40 shadow-2xl relative overflow-hidden space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-inner">
                        <Trophy className="w-6 h-6 text-emerald-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                            {currentSessionCompletion === 100 ? '🎉 Workout Completed!' : '🏁 Workout Completion'}
                          </h3>
                          <span
                            data-testid="workout-completion-badge"
                            className={`text-xs font-bold font-mono px-2.5 py-0.5 rounded-full border ${
                              currentSessionCompletion === 100
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                                : 'bg-slate-800 text-slate-300 border-slate-700'
                            }`}
                          >
                            Status: {currentSessionCompletion} / 100 Done
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 mt-1">
                          {activeSession.title} · {activeSession.subtitle}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        data-testid="mark-workout-completed-btn"
                        onClick={handleToggleWorkoutCompleted}
                        disabled={isSavingAndAdvancing}
                        className={`px-5 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg active:scale-95 ${
                          currentSessionCompletion === 100
                            ? 'bg-emerald-500/25 hover:bg-emerald-500/35 text-emerald-300 border border-emerald-500/50 ring-1 ring-emerald-500/30'
                            : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-950/50 hover:shadow-emerald-900/60'
                        } ${isSavingAndAdvancing ? 'opacity-80 cursor-wait' : ''}`}
                        aria-label={currentSessionCompletion === 100 ? 'Workout Completed (100% Done)' : 'Mark Workout as Completed'}
                      >
                        {isSavingAndAdvancing ? (
                          <>
                            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            <span>Confirming & Saving Workout...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-5 h-5 stroke-[3]" />
                            <span>
                              {currentSessionCompletion === 100
                                ? '✓ Complete & Save to History'
                                : '✓ Mark Workout as Completed'}
                            </span>
                          </>
                        )}
                      </button>

                    </div>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="w-full bg-slate-800/80 rounded-full h-3 overflow-hidden border border-slate-700/60 p-0.5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 ease-out"
                      style={{ width: `${currentSessionCompletion}%` }}
                    />
                  </div>

                  {/* Session Telemetry Badges */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col">
                      <span className="text-slate-400 text-[11px]">Sets Completed</span>
                      <span className="text-white font-mono font-bold text-sm">
                        {sessionStats[activeSessionId]?.completedSets || 0} / {sessionStats[activeSessionId]?.totalSets || 0}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col">
                      <span className="text-slate-400 text-[11px]">Total Volume</span>
                      <span className="text-white font-mono font-bold text-sm">
                        {sessionTelemetry.totalTonnageLbs.toLocaleString()} lbs
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col">
                      <span className="text-slate-400 text-[11px]">Personal Records</span>
                      <span className="text-amber-300 font-mono font-bold text-sm">
                        {sessionTelemetry.prCount} PRs
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col">
                      <span className="text-slate-400 text-[11px]">Exercises Done</span>
                      <span className="text-emerald-300 font-mono font-bold text-sm">
                        {sessionStats[activeSessionId]?.completedExercises || 0} / {sessionExercises.length}
                      </span>
                    </div>
                  </div>

                  {/* Post-Workout Recovery Quick Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                    <span className="text-xs text-slate-400 font-medium">Post-Workout Shortcuts:</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setCurrentView('stretching')}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <span>🧘 Post-Workout Stretching ➔</span>
                      </button>
                    </div>
                  </div>
                </div>
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
        onLaunchTempo={(tempo) => {
          setActiveTempo(tempo);
          setActiveTempoExerciseId(activeCueCard?.exerciseId || null);
        }}
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

