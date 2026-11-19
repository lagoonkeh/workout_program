// Extracted from src/App.tsx (WorkoutAppMain). Presentation only: state and handlers come in as props.
import { Check, ChevronDown, ChevronUp, Flame } from 'lucide-react';
import { type Dispatch, type SetStateAction, useMemo } from 'react';
import { ExerciseCard, type SetLogRecord } from '../components/ExerciseCard';
import { type ExerciseVariation, type WorkoutCycle } from '../domain/exerciseVariations';
import { type WorkoutExercise, type WorkoutSession } from '../domain/programData';
import { type LastPerformance, type LoadSuggestion } from '../domain/progression';
import { type AppliedSuggestion, TIER_META } from './shared';

export interface ExerciseTierSectionsProps {
  activeFocusExerciseId: string | null;
  activeSession: WorkoutSession;
  appliedSuggestions: Record<string, AppliedSuggestion>;
  bulkCollapseState: "collapsed" | "expanded" | null;
  collapseRevision: number;
  currentSessionCycle: WorkoutCycle;
  expandedTiers: Record<string, boolean>;
  getExerciseLogs: (exercise: WorkoutExercise) => SetLogRecord[];
  handleOpenCueCard: (exId: string) => void;
  handleQuickStartRestForExercise: (sec: number, exercise: WorkoutExercise) => void;
  handleQuickStartTempo: (tempo: string, exId?: string, targetReps?: number) => void;
  handleResetExerciseLogs: (exerciseId: string) => void;
  handleSelectExerciseVariation: (baseExerciseId: string, variation: ExerciseVariation) => void;
  handleSwitchToPairedSide: (targetSideExerciseId: string) => void;
  handleToggleSplitSides: (exerciseId: string) => void;
  handleToggleTier: (tier: string) => void;
  handleUndoSuggestion: (exerciseId: string) => void;
  handleUpdateSetLog: (exerciseId: string, setIndex: number, updated: Partial<SetLogRecord>) => void;
  isDailyAbsFinisherExpanded: boolean;
  isFocusMode: boolean;
  progressionByExercise: Record<string, { last: LastPerformance | null; suggestion: LoadSuggestion | null; }>;
  sessionExercises: WorkoutExercise[];
  setIsDailyAbsFinisherExpanded: Dispatch<SetStateAction<boolean>>;
  splitSidesExercises: Record<string, boolean>;
}

export function ExerciseTierSections({ activeFocusExerciseId, activeSession, appliedSuggestions, bulkCollapseState, collapseRevision, currentSessionCycle, expandedTiers, getExerciseLogs, handleOpenCueCard, handleQuickStartRestForExercise, handleQuickStartTempo, handleResetExerciseLogs, handleSelectExerciseVariation, handleSwitchToPairedSide, handleToggleSplitSides, handleToggleTier, handleUndoSuggestion, handleUpdateSetLog, isDailyAbsFinisherExpanded, isFocusMode, progressionByExercise, sessionExercises, setIsDailyAbsFinisherExpanded, splitSidesExercises }: ExerciseTierSectionsProps) {
  // One stable rest handler per exercise object, so the memoized ExerciseCard can compare onQuickStartRest
  // like any other prop. The cache resets when the underlying handler changes.
  const getRestHandler = useMemo(() => {
    const cache = new WeakMap<WorkoutExercise, (sec: number) => void>();
    return (exercise: WorkoutExercise) => {
      let handler = cache.get(exercise);
      if (!handler) {
        handler = (sec: number) => handleQuickStartRestForExercise(sec, exercise);
        cache.set(exercise, handler);
      }
      return handler;
    };
  }, [handleQuickStartRestForExercise]);

  return (
    <>
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
                        onQuickStartRest={getRestHandler(exercise)}
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

      {/* Daily Core Finisher Section */}
      {activeSession.dailyCoreFinisher && activeSession.dailyCoreFinisher.length > 0 && (
        <section
          className="rounded-2xl bg-gradient-to-b from-amber-950/20 via-slate-900/90 to-slate-900 border border-amber-500/40 overflow-hidden shadow-xl"
          aria-label="Daily Core Finisher"
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
                Daily Core Progression
              </span>
              <span className="text-xs text-amber-300/80 font-mono">
                (Kinetic Core Sequence)
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
                  <span className="font-bold text-amber-300">30-second intervals:</span>{' '}
                  <span>Lower abs ➔ Middle &amp; rotation ➔ Upper abs ➔ Plank &amp; side work</span>
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
                      <span>
                        {isAllCoreDone
                          ? `All ${activeSession.dailyCoreFinisher?.length ?? 0} Core Sets Done ✓`
                          : `Mark All ${activeSession.dailyCoreFinisher?.length ?? 0} Core Sets Done`}
                      </span>
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
                    onQuickStartRest={getRestHandler(exercise)}
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
              onQuickStartRest={getRestHandler(exercise)}
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
    </>
  );
}
