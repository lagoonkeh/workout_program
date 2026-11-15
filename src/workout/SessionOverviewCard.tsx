// Extracted from src/App.tsx (WorkoutAppMain). Presentation only: state and handlers come in as props.
import { Activity, ArrowLeftRight, CheckCircle2, ChevronDown, ChevronUp, Clock, Crosshair, Dumbbell, Flame, Layers, Maximize2, Minimize2, RotateCcw, Sparkles, Trophy, Zap } from 'lucide-react';
import { type Dispatch, type SetStateAction } from 'react';
import { type SessionProgressStats } from '../components/SessionNav';
import { type WorkoutCycle } from '../domain/exerciseVariations';
import { WORKOUT_PROGRAM, type WorkoutExercise, type WorkoutSession } from '../domain/programData';
import { type DeloadStatus } from '../domain/progression';

export interface SessionOverviewCardProps {
  activeSession: WorkoutSession;
  activeSessionId: string;
  bulkCollapseState: "collapsed" | "expanded" | null;
  completedWarmups: Record<string, boolean>;
  currentSessionCycle: WorkoutCycle;
  customVariations: Record<string, string>;
  deloadInfo: DeloadStatus;
  handleResetSessionLogs: () => void;
  handleResetSessionVariations: (sessionId?: string) => void;
  handleSetDeloadPostponed: (postpone: boolean) => void;
  handleToggleBulkCollapse: () => void;
  handleToggleFocusMode: () => void;
  handleToggleSessionCycle: (sessionId?: string) => void;
  handleToggleSessionOverview: () => void;
  handleToggleSplitAllUnilateral: () => void;
  isDeloadWeek: boolean;
  isFocusMode: boolean;
  isSessionOverviewCollapsed: boolean;
  programAdaptations: Record<string, Partial<WorkoutExercise>>;
  sessionStats: Record<string, SessionProgressStats>;
  sessionTelemetry: { totalTonnageLbs: number; prCount: number; topE1RM: number; };
  setIsHeatmapModalOpen: Dispatch<SetStateAction<boolean>>;
  setIsWeeklyModalOpen: Dispatch<SetStateAction<boolean>>;
}

export function SessionOverviewCard({ activeSession, activeSessionId, bulkCollapseState, completedWarmups, currentSessionCycle, customVariations, deloadInfo, handleResetSessionLogs, handleResetSessionVariations, handleSetDeloadPostponed, handleToggleBulkCollapse, handleToggleFocusMode, handleToggleSessionCycle, handleToggleSessionOverview, handleToggleSplitAllUnilateral, isDeloadWeek, isFocusMode, isSessionOverviewCollapsed, programAdaptations, sessionStats, sessionTelemetry, setIsHeatmapModalOpen, setIsWeeklyModalOpen }: SessionOverviewCardProps) {
  return (
    <>
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
                className={`flex items-center gap-1.5 px-2 py-0.5 min-h-[36px] rounded-lg border text-[11px] font-semibold cursor-pointer transition-all ${
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
                className="flex items-center gap-1.5 px-2 py-0.5 min-h-[36px] rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80 text-[11px] font-medium cursor-pointer transition-colors"
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
    </>
  );
}
