// src/components/StretchingRoutineWidget.tsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  AdaptiveStretch,
  generateAdaptiveStretchingRoutine,
  getBachataRecoveryRoutine
} from '../domain/adaptiveStretching';
import { SetLogRecord } from './ExerciseCard';
import { MobilityEntry } from '../domain/mobility';
import { audioSynthesizer } from '../audio/audioSynthesizer';
import {
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  AlertTriangle,
  Flame,
  BookOpen,
  Music
} from 'lucide-react';

export type StretchingRoutineMode = 'adaptive' | 'bachata';

export interface StretchingRoutineWidgetProps {
  workoutLogs?: Record<string, SetLogRecord[]>;
  mobilityHistory?: MobilityEntry[];
  onPlayChime?: () => void;
}

const STORAGE_KEY_ROUTINE_MODE = 'workout_stretching_routine_mode_v1';
const STORAGE_KEY_COMPLETED_STRETCHES = 'workout_completed_stretches_v1';
const STORAGE_KEY_COMPLETED_BACHATA = 'workout_completed_bachata_stretches_v1';
const STORAGE_KEY_PROTOCOL_COLLAPSED = 'workout_stretch_protocol_collapsed_v1';
const STORAGE_KEY_DIAGNOSTIC_COLLAPSED = 'workout_stretch_diagnostic_collapsed_v1';

const StretchingRoutineWidgetComponent: React.FC<StretchingRoutineWidgetProps> = ({
  workoutLogs = {},
  mobilityHistory = [],
  onPlayChime
}) => {
  // Routine Mode: Adaptive (workouts & mobility) vs Dedicated Post-Bachata Dance Recovery
  const [routineMode, setRoutineMode] = useState<StretchingRoutineMode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ROUTINE_MODE);
      if (saved === 'bachata' || saved === 'adaptive') return saved;
    } catch {
      // safe fallback
    }
    return 'adaptive';
  });

  const handleSelectRoutineMode = useCallback((mode: StretchingRoutineMode) => {
    setRoutineMode(mode);
    try {
      localStorage.setItem(STORAGE_KEY_ROUTINE_MODE, mode);
    } catch {
      // safe fallback
    }
  }, []);

  // 1. Generate adaptive routine or load dedicated Post-Bachata Dance Recovery
  const routine = useMemo(() => {
    if (routineMode === 'bachata') {
      return getBachataRecoveryRoutine();
    }
    return generateAdaptiveStretchingRoutine(workoutLogs, mobilityHistory);
  }, [routineMode, workoutLogs, mobilityHistory]);

  // Collapsible states for Protocol Hero Card and Diagnostic Insights Card
  const [isProtocolCollapsed, setIsProtocolCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_PROTOCOL_COLLAPSED) === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleProtocolCollapse = useCallback(() => {
    setIsProtocolCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY_PROTOCOL_COLLAPSED, String(next));
      } catch {
        // safe fallback
      }
      return next;
    });
  }, []);

  const [isDiagnosticCollapsed, setIsDiagnosticCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_DIAGNOSTIC_COLLAPSED) === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleDiagnosticCollapse = useCallback(() => {
    setIsDiagnosticCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY_DIAGNOSTIC_COLLAPSED, String(next));
      } catch {
        // safe fallback
      }
      return next;
    });
  }, []);

  // 2. Track completed stretches and manual card collapse states (separated by routineMode)
  const [completedStretches, setCompletedStretches] = useState<Record<string, boolean>>(() => {
    try {
      const storageKey = routineMode === 'bachata' ? STORAGE_KEY_COMPLETED_BACHATA : STORAGE_KEY_COMPLETED_STRETCHES;
      const stored = localStorage.getItem(storageKey);
      if (stored) return JSON.parse(stored);
    } catch {
      // safe fallback
    }
    return {};
  });

  // Re-sync completion map when switching routine modes
  useEffect(() => {
    try {
      const storageKey = routineMode === 'bachata' ? STORAGE_KEY_COMPLETED_BACHATA : STORAGE_KEY_COMPLETED_STRETCHES;
      const stored = localStorage.getItem(storageKey);
      setCompletedStretches(stored ? JSON.parse(stored) : {});
      setCollapsedStretchCards({});
    } catch {
      setCompletedStretches({});
    }
  }, [routineMode]);

  const [collapsedStretchCards, setCollapsedStretchCards] = useState<Record<string, boolean>>({});

  const handleToggleStretchCardCollapse = useCallback((stretchId: string, currentlyCollapsed: boolean) => {
    setCollapsedStretchCards((prev) => ({
      ...prev,
      [stretchId]: !currentlyCollapsed,
    }));
  }, []);

  const handleToggleComplete = useCallback((stretchId: string) => {
    setCompletedStretches((prev) => {
      const nextCompleted = !prev[stretchId];
      const next = { ...prev, [stretchId]: nextCompleted };
      setCollapsedStretchCards((cPrev) => ({
        ...cPrev,
        [stretchId]: nextCompleted,
      }));
      try {
        const storageKey = routineMode === 'bachata' ? STORAGE_KEY_COMPLETED_BACHATA : STORAGE_KEY_COMPLETED_STRETCHES;
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // safe fallback
      }
      return next;
    });
  }, [routineMode]);

  const handleResetRoutine = useCallback(() => {
    setCompletedStretches({});
    setCollapsedStretchCards({});
    try {
      const storageKey = routineMode === 'bachata' ? STORAGE_KEY_COMPLETED_BACHATA : STORAGE_KEY_COMPLETED_STRETCHES;
      localStorage.removeItem(storageKey);
    } catch {
      // safe fallback
    }
  }, [routineMode]);

  const handleCompleteAll = useCallback(() => {
    const allDone: Record<string, boolean> = {};
    routine.stretches.forEach((s) => {
      allDone[s.id] = true;
    });
    setCompletedStretches(allDone);
    setCollapsedStretchCards(allDone);
    try {
      const storageKey = routineMode === 'bachata' ? STORAGE_KEY_COMPLETED_BACHATA : STORAGE_KEY_COMPLETED_STRETCHES;
      localStorage.setItem(storageKey, JSON.stringify(allDone));
    } catch {
      // safe fallback
    }
  }, [routine.stretches, routineMode]);

  // 3. Instruction Drawer visibility for each stretch
  const [expandedInstructions, setExpandedInstructions] = useState<Record<string, boolean>>({});
  const handleToggleInstructions = (stretchId: string) => {
    setExpandedInstructions((prev) => ({
      ...prev,
      [stretchId]: !prev[stretchId]
    }));
  };

  // 4. Timer states per stretch (active running stretch ID, time left, side 1 or 2)
  const [activeTimerStretchId, setActiveTimerStretchId] = useState<string | null>(null);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [timerSecondsLeft, setTimerSecondsLeft] = useState<number>(0);
  const [activeSide, setActiveSide] = useState<1 | 2>(1); // For bilateral stretches: side 1 (Left/first) or side 2 (Right/second)

  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimerForStretch = (stretch: AdaptiveStretch, side: 1 | 2 = 1) => {
    if (activeTimerStretchId === stretch.id && isTimerRunning) {
      // Pause
      setIsTimerRunning(false);
      return;
    }

    if (activeTimerStretchId === stretch.id && !isTimerRunning && timerSecondsLeft > 0) {
      // Resume
      setIsTimerRunning(true);
      return;
    }

    // New start
    setActiveTimerStretchId(stretch.id);
    setActiveSide(side);
    setTimerSecondsLeft(stretch.durationSeconds);
    setIsTimerRunning(true);
  };

  const resetTimerForStretch = (stretch: AdaptiveStretch) => {
    if (activeTimerStretchId === stretch.id) {
      setIsTimerRunning(false);
      setTimerSecondsLeft(stretch.durationSeconds);
      setActiveSide(1);
    }
  };

  // Timer Tick Effect
  useEffect(() => {
    if (!isTimerRunning || !activeTimerStretchId) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      return;
    }

    timerIntervalRef.current = setInterval(() => {
      setTimerSecondsLeft((prev) => {
        if (prev <= 1) {
          // Play Completion Chime
          try {
            if (onPlayChime) {
              onPlayChime();
            } else {
              audioSynthesizer.playTone('completion');
            }
          } catch {
            // safe fallback
          }

          const currentStretch = routine.stretches.find((s) => s.id === activeTimerStretchId);

          // If bilateral and on side 1, automatically transition to side 2!
          if (currentStretch && currentStretch.isBilateral && activeSide === 1) {
            setActiveSide(2);
            return currentStretch.durationSeconds;
          }

          // Fully completed both sides or unilateral!
          setIsTimerRunning(false);
          handleToggleComplete(activeTimerStretchId);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isTimerRunning, activeTimerStretchId, activeSide, routine.stretches, handleToggleComplete, onPlayChime]);

  // Completion calculation
  const completedCount = routine.stretches.filter((s) => !!completedStretches[s.id]).length;
  const totalCount = routine.stretches.length;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Format seconds to MM:SS
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  return (
    <section
      aria-label="Adaptive Stretching Routine"
      className="space-y-3 sm:space-y-5 w-full max-w-full overflow-x-hidden min-w-0"
    >
      {/* Routine Mode Switcher Tablist */}
      <div className="flex items-center justify-between gap-2 flex-wrap pb-0.5">
        <div
          role="tablist"
          aria-label="Stretching Routine Mode"
          className="inline-flex p-1 bg-slate-950/80 rounded-2xl border border-slate-800 shadow-inner max-w-full overflow-x-auto"
        >
          <button
            type="button"
            role="tab"
            aria-selected={routineMode === 'adaptive'}
            onClick={() => handleSelectRoutineMode('adaptive')}
            className={`px-3 sm:px-4 py-2 min-h-[44px] rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              routineMode === 'adaptive'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
            <span>Adaptive Workout Protocol</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={routineMode === 'bachata'}
            onClick={() => handleSelectRoutineMode('bachata')}
            className={`px-3 sm:px-4 py-2 min-h-[44px] rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              routineMode === 'bachata'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-950/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Music className="w-3.5 h-3.5 text-rose-300" />
            <span>Post-Bachata Dance Recovery</span>
          </button>
        </div>
      </div>

      {/* Hero Header Card (Collapsible Protocol Overview) */}
      {isProtocolCollapsed ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 shadow-xl transition-all">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleToggleProtocolCollapse}
              aria-expanded={false}
              aria-label="Expand protocol overview"
              className="flex items-center gap-2 text-left flex-1 min-w-0 cursor-pointer group"
            >
              {routineMode === 'bachata' ? (
                <Music className="w-4 h-4 text-rose-400 shrink-0" />
              ) : (
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      routineMode === 'bachata'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    }`}
                  >
                    {routineMode === 'bachata' ? 'Dance Medicine Recovery' : 'Adaptive Recovery Protocol'}
                  </span>
                  <h2 className="text-xs sm:text-sm font-bold text-white group-hover:text-emerald-300 transition-colors truncate">
                    {routineMode === 'bachata'
                      ? 'Post-Bachata Dance Recovery Routine'
                      : 'Evidence-Based Stretching Routine'}
                  </h2>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono mt-0.5 flex-wrap">
                  <span
                    className={`font-semibold ${
                      routineMode === 'bachata' ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                  >
                    {completedCount} / {totalCount} Completed ({completionPercentage}%)
                  </span>
                  <span>·</span>
                  <span>~{Math.round(routine.totalDurationSeconds / 60)}m</span>
                </div>
              </div>
            </button>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleCompleteAll}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all cursor-pointer"
                title="Mark all stretches done"
              >
                <Check
                  className={`w-3.5 h-3.5 ${
                    routineMode === 'bachata' ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                />
                <span className="hidden xs:inline">Mark All Done</span>
              </button>

              <button
                type="button"
                onClick={handleResetRoutine}
                title="Reset stretching routine checklist"
                className="p-1.5 sm:p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors cursor-pointer"
                aria-label="Reset stretching routine"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleToggleProtocolCollapse}
                aria-label="Expand protocol"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80 text-xs font-medium cursor-pointer transition-colors"
              >
                <span>Expand</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl sm:rounded-2xl p-3.5 sm:p-6 shadow-xl relative overflow-hidden transition-all">
          {/* Top Row: Protocol Badge + Top-Right Collapse Button */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <button
              type="button"
              onClick={handleToggleProtocolCollapse}
              aria-expanded={true}
              aria-label="Collapse Protocol Overview"
              className="flex items-center gap-2 flex-wrap text-left cursor-pointer group"
            >
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg border transition-colors ${
                  routineMode === 'bachata'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/30 group-hover:bg-rose-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 group-hover:bg-emerald-500/30'
                }`}
              >
                {routineMode === 'bachata' ? (
                  <>
                    <Music className="w-3.5 h-3.5 text-rose-400" />
                    Dance Medicine Recovery
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    Adaptive Recovery Protocol
                  </>
                )}
              </span>
              <span className="text-xs font-mono text-slate-400">
                ~{Math.round(routine.totalDurationSeconds / 60)} Minutes Total
              </span>
            </button>

            <button
              type="button"
              onClick={handleToggleProtocolCollapse}
              aria-label="Collapse protocol"
              title="Collapse protocol card"
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80 text-xs font-medium cursor-pointer transition-colors shrink-0"
            >
              <span>Collapse</span>
              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="space-y-1.5 flex-1 min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {routineMode === 'bachata'
                  ? 'Post-Bachata Dance Recovery Routine'
                  : 'Evidence-Based Stretching Routine'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
                {routine.summaryText}
              </p>
            </div>

            {/* Quick Action Controls */}
            <div className="flex items-center gap-2 self-start md:self-center shrink-0 flex-wrap">
              <button
                type="button"
                onClick={handleCompleteAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all cursor-pointer"
              >
                <Check
                  className={`w-3.5 h-3.5 ${
                    routineMode === 'bachata' ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                />
                <span>Mark All Done</span>
              </button>

              <button
                type="button"
                onClick={handleResetRoutine}
                title="Reset stretching routine checklist"
                className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors cursor-pointer"
                aria-label="Reset stretching routine"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4 pt-3.5 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-400 font-medium">Routine Progress:</span>
              <span
                className={`font-bold font-mono ${
                  routineMode === 'bachata' ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {completedCount} / {totalCount} Completed ({completionPercentage}%)
              </span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 rounded-full ${
                  routineMode === 'bachata' ? 'bg-rose-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Diagnostic Insights Panel (Collapsible) */}
      {routine.detectedIssues.length > 0 && (
        <div
          className={`bg-slate-900/90 border rounded-xl sm:rounded-2xl p-2.5 sm:p-4 shadow-lg transition-all ${
            routineMode === 'bachata' ? 'border-rose-500/30' : 'border-emerald-500/30'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleToggleDiagnosticCollapse}
              aria-expanded={!isDiagnosticCollapsed}
              aria-label={isDiagnosticCollapsed ? 'Expand diagnostic insights' : 'Collapse diagnostic insights'}
              className="flex items-center gap-2 text-left flex-1 min-w-0 cursor-pointer group"
            >
              {routineMode === 'bachata' ? (
                <Music className="w-4 h-4 text-rose-400 shrink-0" />
              ) : (
                <Flame className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
              <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-emerald-300 transition-colors uppercase tracking-wider truncate">
                {routineMode === 'bachata'
                  ? 'Dance Medicine Biomechanical Targets'
                  : 'Diagnostic Insights from Past 2 Weeks'}
              </h3>
            </button>

            <div className="flex items-center gap-1.5 shrink-0">
              <span
                className={`text-[10px] sm:text-[11px] font-mono px-2 py-0.5 rounded-full border whitespace-nowrap ${
                  routineMode === 'bachata'
                    ? 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                    : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                }`}
              >
                {routine.detectedIssues.length} Triggers Detected
              </span>

              <button
                type="button"
                onClick={handleToggleDiagnosticCollapse}
                aria-label={isDiagnosticCollapsed ? 'Expand diagnostic' : 'Collapse diagnostic'}
                title={isDiagnosticCollapsed ? 'Expand diagnostic insights' : 'Collapse diagnostic insights'}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80 text-xs font-medium cursor-pointer transition-colors"
              >
                <span>{isDiagnosticCollapsed ? 'Expand' : 'Collapse'}</span>
                {isDiagnosticCollapsed ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                )}
              </button>
            </div>
          </div>

          {!isDiagnosticCollapsed && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3 pt-2.5 border-t border-slate-800/60">
              {routine.detectedIssues.map((issue, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-start gap-2.5 text-xs"
                >
                  <div
                    className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                      issue.severity === 'high' ? 'bg-rose-400 animate-pulse' : 'bg-emerald-400'
                    }`}
                  />
                  <div className="space-y-0.5 min-w-0">
                    <div className="font-semibold text-slate-200 truncate">{issue.label}</div>
                    <div className="text-slate-400 text-[11px] truncate">{issue.source}</div>
                    {issue.quote && (
                      <div className="text-emerald-300/90 italic text-[11px] truncate">
                        "{issue.quote}"
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Stretch Cards List (Collapsible & Sorted so Completed Stretches Move to Bottom) */}
      <div className="space-y-3 sm:space-y-4">
        {[...routine.stretches]
          .map((stretch, originalIdx) => ({ stretch, originalIdx }))
          .sort((a, b) => {
            const aDone = !!completedStretches[a.stretch.id];
            const bDone = !!completedStretches[b.stretch.id];
            if (aDone === bDone) return a.originalIdx - b.originalIdx;
            return aDone ? 1 : -1;
          })
          .map(({ stretch, originalIdx }) => {
          const isDone = !!completedStretches[stretch.id];
          const isCardCollapsed =
            collapsedStretchCards[stretch.id] !== undefined
              ? collapsedStretchCards[stretch.id]
              : isDone;
          const isTimerActiveForThis = activeTimerStretchId === stretch.id;
          const displaySeconds = isTimerActiveForThis ? timerSecondsLeft : stretch.durationSeconds;
          const isShowingInstructions = !!expandedInstructions[stretch.id];

          return (
            <article
              key={stretch.id}
              className={`rounded-xl sm:rounded-2xl border ${
                isCardCollapsed ? 'p-3 sm:p-4' : 'p-3.5 sm:p-5'
              } transition-all duration-200 shadow-md ${
                isDone
                  ? 'bg-emerald-950/20 border-emerald-500/50 shadow-emerald-950/40'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              {isCardCollapsed ? (
                /* Collapsed Stretch Card Summary */
                <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleToggleStretchCardCollapse(stretch.id, true)}
                    className="flex items-center gap-2 text-left min-w-0 flex-1 cursor-pointer group"
                    aria-expanded={false}
                    aria-label={`Expand ${stretch.name}`}
                  >
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                      Step {originalIdx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3
                        className={`text-sm sm:text-base font-bold truncate transition-colors ${
                          isDone ? 'text-emerald-300 line-through' : 'text-white group-hover:text-emerald-300'
                        }`}
                      >
                        {stretch.name}
                      </h3>
                      <div className="text-[11px] text-slate-400 truncate">
                        {stretch.targetArea} · {stretch.durationSeconds}s {stretch.isBilateral ? '/ Side' : 'Dynamic'}
                      </div>
                    </div>
                  </button>

                  <div className="flex items-center gap-1.5 self-end xs:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleComplete(stretch.id)}
                      aria-label={`Mark stretch ${stretch.name} as ${isDone ? 'incomplete' : 'complete'}`}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer select-none active:scale-95 ${
                        isDone
                          ? 'bg-emerald-500/25 text-emerald-300 border-emerald-500/50'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                      }`}
                    >
                      <div
                        className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-all ${
                          isDone
                            ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                            : 'border-slate-500 bg-slate-950'
                        }`}
                      >
                        {isDone && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                      <span>{isDone ? 'Done' : 'Check Off'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleStretchCardCollapse(stretch.id, true)}
                      aria-label={`Expand stretch ${stretch.name}`}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80 text-xs font-medium cursor-pointer transition-colors"
                    >
                      <span>Expand</span>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  </div>
                </div>
              ) : (
                /* Expanded Stretch Card */
                <>
              {/* Stretch Top Info Row */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <span className="text-[10px] sm:text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      Step {originalIdx + 1}
                    </span>
                    <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {stretch.targetMuscles.join(', ')}
                    </span>
                    {stretch.isBilateral ? (
                      <span className="text-[10px] sm:text-xs font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/20">
                        {stretch.durationSeconds}s / Side
                      </span>
                    ) : (
                      <span className="text-[10px] sm:text-xs font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                        {stretch.durationSeconds}s Dynamic
                      </span>
                    )}
                  </div>

                  <h3
                    className={`text-base sm:text-lg font-bold tracking-tight transition-colors ${
                      isDone ? 'text-emerald-300 line-through' : 'text-white'
                    }`}
                  >
                    {stretch.name}
                  </h3>

                  <div className="text-xs text-slate-400">
                    <strong>Target:</strong>{' '}
                    <span className="text-slate-300">{stretch.targetArea}</span> (
                    {stretch.targetMuscles.join(', ')})
                  </div>
                </div>

                {/* Mark Complete Checkbox & Collapse Card Buttons */}
                <div className="flex items-center gap-1.5 self-start sm:self-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleComplete(stretch.id)}
                    aria-label={`Mark stretch ${stretch.name} as ${isDone ? 'incomplete' : 'complete'}`}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer select-none active:scale-95 ${
                      isDone
                        ? 'bg-emerald-500/25 text-emerald-300 border-emerald-500/50 shadow-sm shadow-emerald-950/60'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                        isDone
                          ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                          : 'border-slate-500 bg-slate-950'
                      }`}
                    >
                      {isDone && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span>{isDone ? 'Completed' : 'Check Off'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleStretchCardCollapse(stretch.id, false)}
                    aria-label={`Collapse stretch ${stretch.name}`}
                    title={`Collapse ${stretch.name}`}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80 text-xs font-medium cursor-pointer transition-colors"
                  >
                    <span>Collapse</span>
                    <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </div>
              </div>

              {/* Personalized Trigger Reason Pill */}
              <div className="mb-3.5 p-2.5 rounded-xl bg-slate-950/80 border border-emerald-500/30 flex items-start gap-2 text-xs text-slate-300">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong className="text-emerald-400 font-medium">Why it was prescribed: </strong>
                  <span>{stretch.triggerReason}</span>
                </div>
              </div>

              {/* Interactive Countdown Timer Bar */}
              <div className="bg-slate-950 border border-slate-800/90 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="font-mono text-xl sm:text-2xl font-bold text-white tracking-wider flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{formatTime(displaySeconds)}</span>
                  </div>

                  {stretch.isBilateral && (
                    <div className="flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700 text-sky-300">
                      <span>Side {isTimerActiveForThis ? activeSide : 1} of 2</span>
                      <span className="text-slate-400">
                        ({(isTimerActiveForThis ? activeSide : 1) === 1 ? 'Left' : 'Right'})
                      </span>
                    </div>
                  )}
                </div>

                {/* Timer Controls */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => startTimerForStretch(stretch, activeSide)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95 ${
                      isTimerActiveForThis && isTimerRunning
                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                    }`}
                  >
                    {isTimerActiveForThis && isTimerRunning ? (
                      <>
                        <Pause className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Pause</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>{isTimerActiveForThis && timerSecondsLeft > 0 ? 'Resume' : 'Start Timer'}</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => resetTimerForStretch(stretch)}
                    title="Reset countdown timer"
                    aria-label={`Reset timer for ${stretch.name}`}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer border border-slate-700"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Creator Coaching Quote */}
              <div className="text-slate-400 italic text-xs mb-3 flex items-start gap-1.5">
                <span className="text-emerald-400 shrink-0">💡</span>
                <span>"{stretch.coachingQuote}"</span>
              </div>

              {/* Step-by-Step Instructions Toggle Button */}
              <div className="pt-2 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => handleToggleInstructions(stretch.id)}
                  aria-expanded={isShowingInstructions}
                  className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white font-medium cursor-pointer transition-colors"
                >
                  <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    {isShowingInstructions ? 'Hide Protocol' : 'View Step-by-Step Protocol & Technique'}
                  </span>
                  {isShowingInstructions ? (
                    <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </button>

                {/* Expandable Protocol Drawer */}
                {isShowingInstructions && (
                  <div className="mt-3 p-3 sm:p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-3 animate-in fade-in duration-200">
                    <div className="font-bold text-slate-200 pb-1.5 border-b border-slate-800 flex items-center justify-between">
                      <span className="text-emerald-400">Step-by-Step Execution Protocol</span>
                      {stretch.recommendedTempo && (
                        <span className="font-mono text-slate-400 text-[11px]">
                          Tempo: {stretch.recommendedTempo}
                        </span>
                      )}
                    </div>

                    <div className="space-y-2">
                      {stretch.instructions.map((step, sIdx) => (
                        <div
                          key={sIdx}
                          className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-900/60 border border-slate-800/60 leading-relaxed"
                        >
                          <span className="flex-shrink-0 w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold flex items-center justify-center mt-0.5">
                            {sIdx + 1}
                          </span>
                          <span className="text-slate-300">{step}</span>
                        </div>
                      ))}
                    </div>

                    {/* Common Faults to Avoid */}
                    {stretch.commonFaults && stretch.commonFaults.length > 0 && (
                      <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                        <span className="font-semibold text-amber-300 flex items-center gap-1 text-[11px]">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                          <span>Common Faults to Avoid:</span>
                        </span>
                        <ul className="list-disc pl-5 space-y-1 text-slate-400 text-[11px]">
                          {stretch.commonFaults.map((fault, fIdx) => (
                            <li key={fIdx}>{fault}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
              </>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
};

export const StretchingRoutineWidget = React.memo(StretchingRoutineWidgetComponent);
