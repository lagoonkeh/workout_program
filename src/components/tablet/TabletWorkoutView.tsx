// src/components/tablet/TabletWorkoutView.tsx
import React, { useState, useEffect } from 'react';
import {
  WorkoutSession,
  WorkoutExercise,
  WORKOUT_SESSIONS,
  RECOVERY_SESSIONS,
} from '../../domain/programData';
import { ExerciseCard, SetLogRecord } from '../ExerciseCard';
import { RestTargetContext } from '../RestTimerWidget';
import { AdaptiveBodyCoachWidget } from '../AdaptiveBodyCoachWidget';
import { storageManager } from '../../storage/storageManager';
import {
  Dumbbell,
  Clock,
  CheckCircle2,
  Trophy,
  Flame,
  ChevronDown,
  ChevronUp,
  Crosshair,
  Timer,
  RotateCcw,
  Sparkles,
  Layers,
  ShieldCheck,
  Check,
} from 'lucide-react';

export interface TabletWorkoutViewProps {
  activeSession: WorkoutSession;
  activeSessionId: string;
  onSelectSession: (sessionId: string) => void;
  sessionStats: Record<string, { completedSets: number; totalSets: number; completedExercises: number; totalExercises: number; isComplete: boolean }>;
  sessionTelemetry: { totalTonnageLbs: number; prCount: number; topE1RM: number };
  workoutLogs?: Record<string, SetLogRecord[]>;
  onUpdateSetLog: (exerciseId: string, setIndex: number, updated: Partial<SetLogRecord>) => void;
  onResetExercise: (exerciseId: string) => void;
  onResetSessionLogs: () => void;
  sessionExercises: WorkoutExercise[];
  getExerciseLogs: (exercise: WorkoutExercise) => SetLogRecord[];
  completedWarmups: Record<string, boolean>;
  onToggleWarmupDrill: (drillId: string, totalPhases?: number) => void;
  phaseTasks?: Record<string, boolean>;
  onTogglePhaseTask?: (phaseKey: string, drillId?: string, totalPhases?: number) => void;
  collapsedWarmupDrills?: Record<string, boolean>;
  onToggleWarmupDrillCollapse?: (drillId: string, collapsed: boolean) => void;
  splitSidesExercises: Record<string, boolean>;
  onToggleSplitSides: (baseExerciseId: string) => void;
  onSwitchToPairedSide: (targetExerciseId: string) => void;
  onOpenCueCard: (exerciseId: string) => void;
  activeRestSeconds: number | null;
  activeRestContext: RestTargetContext | null;
  onQuickStartRest: (seconds: number) => void;
  onClearActivePreset: () => void;
  onStartNextSet: () => void;
  activeTempo?: string | null;
  onQuickStartTempo: (tempo: string, exerciseId?: string, targetReps?: number) => void;
  isMuted?: boolean;
  programAdaptations?: Record<string, any>;
  onApplyAdaptations: (adaptations: any) => void;
  onResetAdaptations: () => void;
  onCompleteWorkout: () => void;
  currentSessionCompletion: number;
  sessionStartTime?: string;
  isFocusMode: boolean;
  onToggleFocusMode: () => void;
  bulkCollapseState?: 'collapsed' | 'expanded' | null;
  collapseRevision: number;
  onToggleExpandCollapseAll: () => void;
  onOpenWeeklyEvaluation?: () => void;
}

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

export const TabletWorkoutView: React.FC<TabletWorkoutViewProps> = ({
  activeSession,
  activeSessionId,
  onSelectSession,
  sessionStats,
  sessionTelemetry,
  workoutLogs: _workoutLogs,
  onUpdateSetLog,
  onResetExercise,
  onResetSessionLogs,
  sessionExercises,
  getExerciseLogs,
  completedWarmups,
  onToggleWarmupDrill,
  phaseTasks: _phaseTasks,
  onTogglePhaseTask: _onTogglePhaseTask,
  collapsedWarmupDrills: _collapsedWarmupDrills,
  onToggleWarmupDrillCollapse: _onToggleWarmupDrillCollapse,
  splitSidesExercises,
  onToggleSplitSides,
  onSwitchToPairedSide,
  onOpenCueCard,
  activeRestSeconds,
  activeRestContext,
  onQuickStartRest,
  onClearActivePreset,
  onStartNextSet,
  activeTempo: _activeTempo,
  onQuickStartTempo,
  isMuted: _isMuted,
  programAdaptations,
  onApplyAdaptations,
  onResetAdaptations,
  onCompleteWorkout,
  currentSessionCompletion,
  sessionStartTime,
  isFocusMode,
  onToggleFocusMode,
  bulkCollapseState,
  collapseRevision,
  onToggleExpandCollapseAll,
  onOpenWeeklyEvaluation,
}) => {
  const [showWarmupInSidebar, setShowWarmupInSidebar] = useState(false);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Live elapsed workout clock calculated from first completed task start timestamp
  useEffect(() => {
    if (!sessionStartTime) {
      setElapsedSeconds(0);
      return;
    }
    const updateElapsed = () => {
      const startMs = new Date(sessionStartTime).getTime();
      const nowMs = Date.now();
      setElapsedSeconds(Math.max(0, Math.round((nowMs - startMs) / 1000)));
    };
    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [sessionStartTime]);

  const formatElapsed = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      const remMins = mins % 60;
      return `${hrs}h ${remMins}m ${s < 10 ? '0' : ''}${s}s`;
    }
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  // Scroll main stage to selected exercise
  const handleJumpToExercise = (exerciseId: string) => {
    setSelectedExerciseId(exerciseId);
    const el = document.getElementById(`exercise-card-${exerciseId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const allAvailableSessions = [...WORKOUT_SESSIONS, ...RECOVERY_SESSIONS];
  const activeFocusExerciseId = sessionExercises.find((ex) => {
    const logs = getExerciseLogs(ex);
    return logs.length === 0 || logs.some((l) => !l.isCompleted);
  })?.id;

  return (
    <div
      data-testid="tablet-workout-dashboard"
      className="w-full max-w-[1600px] mx-auto px-3 sm:px-5 lg:px-8 py-3 lg:py-6"
    >
      {/* Tablet Session Switcher Strip */}
      <div className="mb-4 lg:mb-6 overflow-x-auto no-scrollbar pb-1">
        <div className="flex items-center gap-2 min-w-max">
          {allAvailableSessions.map((session) => {
            const isSelected = session.id === activeSessionId;
            const stat = sessionStats[session.id];
            const pct = stat && stat.totalSets > 0 ? Math.round((stat.completedSets / stat.totalSets) * 100) : 0;
            const isComplete = stat?.isComplete || pct === 100;

            return (
              <button
                key={session.id}
                type="button"
                onClick={() => onSelectSession(session.id)}
                className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer min-h-[44px] ${
                  isSelected
                    ? 'bg-emerald-500/20 border-emerald-500/60 text-white shadow-md shadow-emerald-950/40 ring-1 ring-emerald-500/50'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <div
                  className={`w-2.5 h-2.5 rounded-full ${
                    isComplete ? 'bg-emerald-400' : isSelected ? 'bg-cyan-400 animate-pulse' : 'bg-slate-600'
                  }`}
                />
                <span className="truncate">{session.title}</span>
                {pct > 0 && (
                  <span
                    className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${
                      isComplete ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-cyan-300'
                    }`}
                  >
                    {pct}%
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Dual-Pane Tablet Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
        {/* ========================================================= */}
        {/* LEFT COLUMN: Tablet Command Deck & HUD (4 or 5 cols)     */}
        {/* ========================================================= */}
        <aside className="lg:col-span-5 xl:col-span-4 space-y-4 lg:sticky lg:top-18 max-h-[calc(100vh-5.5rem)] overflow-y-auto no-scrollbar">
          {/* Active Session Overview & Live Telemetry Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-3.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30 inline-block mb-1">
                  Active Routine
                </span>
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug">
                  {activeSession.title}
                </h2>
                <p className="text-xs text-slate-400">{activeSession.subtitle}</p>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={onResetSessionLogs}
                  title="Reset session logs"
                  aria-label="Reset session logs"
                  className="p-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer border border-slate-700"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Glanceable Gym Telemetry Grid (16:10 high visibility for distance viewing) */}
            <div className="grid grid-cols-2 gap-2 text-center">
              {/* Elapsed Workout Timer */}
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
                <div className="flex items-center justify-center gap-1 text-[10px] uppercase font-bold text-slate-400">
                  <Clock className="w-3 h-3 text-cyan-400" />
                  <span>Workout Time</span>
                </div>
                <div className="text-base sm:text-lg font-mono font-black text-cyan-300 mt-0.5">
                  {sessionStartTime ? formatElapsed(elapsedSeconds) : '0:00'}
                </div>
                <span className="text-[9px] text-slate-500">
                  {sessionStartTime ? 'Live Active' : 'Starts on task 1'}
                </span>
              </div>

              {/* Live Volume Tonnage */}
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
                <div className="flex items-center justify-center gap-1 text-[10px] uppercase font-bold text-slate-400">
                  <Dumbbell className="w-3 h-3 text-emerald-400" />
                  <span>Volume Lifted</span>
                </div>
                <div className="text-base sm:text-lg font-mono font-black text-emerald-300 mt-0.5">
                  {sessionTelemetry.totalTonnageLbs > 0
                    ? `${sessionTelemetry.totalTonnageLbs.toLocaleString()} lbs`
                    : '0 lbs'}
                </div>
                <span className="text-[9px] text-slate-500">Live tonnage</span>
              </div>

              {/* Completed Sets / Total */}
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
                <div className="flex items-center justify-center gap-1 text-[10px] uppercase font-bold text-slate-400">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>Sets Completed</span>
                </div>
                <div className="text-base sm:text-lg font-mono font-black text-white mt-0.5">
                  {sessionStats[activeSessionId]?.completedSets || 0} / {sessionStats[activeSessionId]?.totalSets || 0}
                </div>
                <span className="text-[9px] text-emerald-400 font-semibold">
                  {currentSessionCompletion}% Complete
                </span>
              </div>

              {/* PRs & e1RM */}
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
                <div className="flex items-center justify-center gap-1 text-[10px] uppercase font-bold text-slate-400">
                  <Trophy className="w-3 h-3 text-amber-400" />
                  <span>PRs & Peak Lifts</span>
                </div>
                <div className="text-base sm:text-lg font-mono font-black text-amber-300 mt-0.5">
                  {sessionTelemetry.prCount} PRs
                </div>
                <span className="text-[9px] text-slate-500">
                  {sessionTelemetry.topE1RM > 0 ? `Top e1RM: ${sessionTelemetry.topE1RM} lbs` : 'BW'}
                </span>
              </div>
            </div>

            {/* Overall Session Progress Bar */}
            <div className="space-y-1">
              <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-cyan-400 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, currentSessionCompletion)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Embedded Rest Timer & Tempo Metronome Station (Sidecar) */}
          <div
            data-testid="tablet-rest-timer-deck"
            className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/30 border border-cyan-500/30 shadow-xl space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
                  <Timer className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                  Rest & Tempo Console
                </span>
              </div>

              {activeRestSeconds !== null && (
                <button
                  type="button"
                  onClick={onClearActivePreset}
                  className="text-[10px] text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Quick Rest Timer Preset Buttons */}
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { sec: 45, label: '45s' },
                { sec: 90, label: '90s' },
                { sec: 120, label: '2:00' },
                { sec: 180, label: '3:00' },
              ].map(({ sec, label }) => {
                const isSelected = activeRestSeconds === sec;
                return (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => onQuickStartRest(sec)}
                    className={`py-2 px-1 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer min-h-[40px] flex items-center justify-center ${
                      isSelected
                        ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-950/50'
                        : 'bg-slate-800/90 hover:bg-slate-700 text-slate-300 border border-slate-700/60'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Context Notice & Start Next Set Shortcut */}
            {activeRestContext && (
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-cyan-500/20 text-xs flex items-center justify-between gap-2">
                <span className="text-slate-300 truncate font-medium">
                  {activeRestContext.isLastSet && activeRestContext.nextExerciseName
                    ? `Next: ${activeRestContext.nextExerciseName}`
                    : `Next Set: Set ${activeRestContext.nextSetNumber || 'Next'}`}
                </span>
                <button
                  type="button"
                  onClick={onStartNextSet}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px] shrink-0 cursor-pointer shadow-sm active:scale-95"
                >
                  Start Next Set ➔
                </button>
              </div>
            )}
          </div>

          {/* Quick-Jump Exercise Rail */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                <span>Exercise Jump Rail</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {sessionExercises.length} Exercises
              </span>
            </div>

            <div className="space-y-1.5 max-h-[280px] overflow-y-auto no-scrollbar">
              {sessionExercises.map((exercise) => {
                const logs = getExerciseLogs(exercise);
                const completedCount = logs.filter((l) => l.isCompleted).length;
                const isAllDone = logs.length > 0 && completedCount >= logs.length;
                const isCurrentFocus = exercise.id === selectedExerciseId || exercise.id === activeFocusExerciseId;

                return (
                  <button
                    key={exercise.id}
                    type="button"
                    onClick={() => handleJumpToExercise(exercise.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs font-medium transition-all cursor-pointer min-h-[44px] ${
                      isCurrentFocus
                        ? 'bg-slate-800 border border-emerald-500/50 text-white shadow-sm'
                        : isAllDone
                        ? 'bg-emerald-950/20 border border-emerald-500/30 text-emerald-300'
                        : 'bg-slate-950/60 border border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          exercise.tier === 'T1'
                            ? 'bg-rose-500/20 text-rose-300'
                            : exercise.tier === 'T2'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-emerald-500/20 text-emerald-300'
                        }`}
                      >
                        {exercise.tier}
                      </span>
                      <span className={`truncate ${isAllDone ? 'line-through text-slate-400' : ''}`}>
                        {exercise.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <span className="font-mono text-[10px] text-slate-400">
                        {completedCount}/{logs.length || exercise.targetSets}
                      </span>
                      {isAllDone && (
                        <div className="w-4 h-4 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Warmup & Biomechanical Priming Sequence Accordion */}
          {activeSession.warmupSequence && activeSession.warmupSequence.length > 0 && (
            <div className="rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowWarmupInSidebar((prev) => !prev)}
                className="w-full flex items-center justify-between p-3.5 text-xs font-bold text-slate-200 hover:bg-slate-800/60 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <span>Warmup & Priming ({activeSession.warmupSequence.length} Drills)</span>
                </div>
                {showWarmupInSidebar ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {showWarmupInSidebar && (
                <div className="p-3 pt-0 space-y-2 border-t border-slate-800/80">
                  {activeSession.warmupSequence.map((drill, idx) => {
                    const isDone = !!completedWarmups[drill.id];
                    return (
                      <div
                        key={drill.id || idx}
                        className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                          isDone
                            ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                            : 'bg-slate-950 border-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="min-w-0">
                          <span className="font-semibold block truncate">
                            {idx + 1}. {drill.name}
                          </span>
                          <span className="text-[10px] text-amber-400 font-mono">
                            {drill.targetDurationOrReps}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => onToggleWarmupDrill(drill.id)}
                          aria-label={`Mark drill ${drill.name} as ${isDone ? 'incomplete' : 'complete'}`}
                          className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                            isDone
                              ? 'bg-emerald-500 text-slate-950'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                          }`}
                        >
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span>{isDone ? 'Done' : 'Complete'}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Adaptive Body Coach Widget (Sidebar Embedded) */}
          <AdaptiveBodyCoachWidget
            activeSession={activeSession}
            history={Object.values(storageManager.getCompletedWorkouts())}
            appliedAdaptations={programAdaptations}
            onApplyAdaptations={onApplyAdaptations}
            onResetAdaptations={onResetAdaptations}
            className="shadow-xl"
          />
        </aside>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: Active Exercise Stage (7 or 8 cols)         */}
        {/* ========================================================= */}
        <section className="lg:col-span-7 xl:col-span-8 space-y-5">
          {/* Top Quick Actions Bar for Exercises */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-md flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onToggleFocusMode}
                aria-pressed={isFocusMode}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all min-h-[40px] ${
                  isFocusMode
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
              >
                <Crosshair className="w-3.5 h-3.5" />
                <span>Focus Mode</span>
              </button>

              <button
                type="button"
                onClick={onToggleExpandCollapseAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold cursor-pointer transition-all min-h-[40px]"
              >
                <span>{bulkCollapseState === 'collapsed' ? 'Expand All' : 'Collapse All'}</span>
              </button>
            </div>

            {onOpenWeeklyEvaluation && (
              <button
                type="button"
                onClick={onOpenWeeklyEvaluation}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold cursor-pointer transition-all min-h-[40px]"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Evaluate Program</span>
              </button>
            )}
          </div>

          {/* Collapsible Exercise Tiers (T1, T2, T3) */}
          {(['T1', 'T2', 'T3'] as const).map((tierKey) => {
            const tierExercises = sessionExercises.filter((ex) => ex.tier === tierKey);
            if (tierExercises.length === 0) return null;
            const meta = TIER_META[tierKey];

            return (
              <div
                key={tierKey}
                className="rounded-2xl bg-slate-900/60 border border-slate-800/80 overflow-hidden shadow-lg"
              >
                <div className="p-3.5 sm:p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
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
                </div>

                <div className="p-3 sm:p-5 space-y-4">
                  {tierExercises.map((exercise) => {
                    const cardDefaultCollapsed = isFocusMode
                      ? exercise.id !== activeFocusExerciseId
                      : bulkCollapseState === 'collapsed'
                      ? true
                      : bulkCollapseState === 'expanded'
                      ? false
                      : undefined;

                    return (
                      <div key={exercise.id} id={`exercise-card-${exercise.id}`}>
                        <ExerciseCard
                          exercise={exercise}
                          logs={getExerciseLogs(exercise)}
                          defaultCollapsed={cardDefaultCollapsed}
                          collapseRevision={collapseRevision}
                          onUpdateSetLog={onUpdateSetLog}
                          onResetExercise={onResetExercise}
                          onOpenCueCard={onOpenCueCard}
                          onQuickStartRest={onQuickStartRest}
                          onQuickStartTempo={onQuickStartTempo}
                          onToggleSplitSides={onToggleSplitSides}
                          onSwitchToPairedSide={onSwitchToPairedSide}
                          isSideSplitActive={!!splitSidesExercises[exercise.baseExerciseId || exercise.id]}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Athlean-X Daily Core Finisher Section */}
          {activeSession.dailyCoreFinisher && activeSession.dailyCoreFinisher.length > 0 && (
            <div className="rounded-2xl bg-gradient-to-b from-amber-950/20 via-slate-900/90 to-slate-900 border border-amber-500/40 overflow-hidden shadow-xl">
              <div className="p-3.5 sm:p-4 bg-slate-900/90 border-b border-amber-500/30 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg border bg-amber-500/20 text-amber-300 border-amber-500/40 flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                    <span>CORE FINISHER</span>
                  </span>
                  <span className="text-sm sm:text-base font-bold text-white">
                    Daily Functional Core & Pelvic Anti-Rotation
                  </span>
                </div>
              </div>

              <div className="p-3 sm:p-5 space-y-4">
                {activeSession.dailyCoreFinisher.map((exercise) => (
                  <div key={exercise.id} id={`exercise-card-${exercise.id}`}>
                    <ExerciseCard
                      exercise={exercise}
                      logs={getExerciseLogs(exercise)}
                      onUpdateSetLog={onUpdateSetLog}
                      onResetExercise={onResetExercise}
                      onOpenCueCard={onOpenCueCard}
                      onQuickStartRest={onQuickStartRest}
                      onQuickStartTempo={onQuickStartTempo}
                      onToggleSplitSides={onToggleSplitSides}
                      onSwitchToPairedSide={onSwitchToPairedSide}
                      isSideSplitActive={!!splitSidesExercises[exercise.baseExerciseId || exercise.id]}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Workout Completion Action Card */}
          <div
            data-testid="tablet-workout-completion-card"
            className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-emerald-950/50 via-slate-900 to-slate-900 border border-emerald-500/50 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Finish & Complete Workout
                </h3>
              </div>
              <p className="text-xs text-slate-400 max-w-xl">
                Records completion timestamp, logs exact workout duration, and saves your session to Workout History and Google Sheets.
              </p>
            </div>

            <button
              type="button"
              data-testid="mark-workout-completed-btn"
              onClick={onCompleteWorkout}
              className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm transition-all cursor-pointer shadow-lg shadow-emerald-950/50 hover:shadow-emerald-900/40 active:scale-95 flex items-center justify-center gap-2 shrink-0 min-h-[48px]"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Mark Workout as Completed</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};
