// Extracted from src/App.tsx (WorkoutAppMain). Presentation only: state and handlers come in as props.
import { BookOpen, Check, ChevronDown, ChevronUp, Flame, ListOrdered, Play, Timer } from 'lucide-react';
import { type Dispatch, type SetStateAction } from 'react';
import { LazyExerciseDiagram as ExerciseDiagram } from '../components/LazyExerciseDiagram';
import { type RestTargetContext } from '../components/RestTimerWidget';
import { WarmupPhaseSubCard } from '../components/WarmupPhaseSubCard';
import { type CueCardLookup } from '../domain/cueCardStore';
import { EXERCISE_VISUALS } from '../domain/exerciseVisualsData';
import { extractTargetReps, isTimedPrescription, type WorkoutSession } from '../domain/programData';

export interface WarmupSectionProps {
  activeFocusWarmupId: string | null;
  activeSession: WorkoutSession;
  collapsedWarmupDrills: Record<string, boolean>;
  completedWarmups: Record<string, boolean>;
  CUE_CARD_MAP: CueCardLookup;
  expandedWarmupInstructions: Record<string, boolean>;
  handleQuickStartRest: (sec: number, explicitContext?: RestTargetContext) => void;
  handleQuickStartTempo: (tempo: string, exId?: string, targetReps?: number) => void;
  handleToggleAllDrillPhases: (drillId: string, totalPhases: number) => void;
  handleTogglePhaseTask: (phaseKey: string, drillId?: string, totalPhases?: number) => void;
  handleToggleWarmupDrill: (drillId: string, totalPhases?: number) => void;
  handleToggleWarmupDrillCollapse: (drillId: string, currentlyCollapsed: boolean) => void;
  handleToggleWarmupInstructions: (drillId: string) => void;
  isFocusMode: boolean;
  phaseTasks: Record<string, boolean>;
  setActiveCueCardId: Dispatch<SetStateAction<string | null>>;
  setShowWarmup: Dispatch<SetStateAction<boolean>>;
  showWarmup: boolean;
}

export function WarmupSection({ activeFocusWarmupId, activeSession, collapsedWarmupDrills, completedWarmups, CUE_CARD_MAP, expandedWarmupInstructions, handleQuickStartRest, handleQuickStartTempo, handleToggleAllDrillPhases, handleTogglePhaseTask, handleToggleWarmupDrill, handleToggleWarmupDrillCollapse, handleToggleWarmupInstructions, isFocusMode, phaseTasks, setActiveCueCardId, setShowWarmup, showWarmup }: WarmupSectionProps) {
  return (
    <>
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
                    className={`cv-card border rounded-xl sm:rounded-2xl p-3 sm:p-4 text-xs text-slate-300 space-y-2.5 transition-all shadow-md ${
                              isDrillDone
                                ? 'bg-gradient-to-b from-slate-900 to-emerald-950/20 border-emerald-500/60 ring-1 ring-emerald-500/30'
                                : 'bg-slate-900 border-slate-800'
                            }`}
                  >
                    {/* Row 1: Badges */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-md border font-mono tracking-wide bg-amber-500/20 text-amber-300 border-amber-500/40 flex items-center gap-1">
                        <Flame className="w-3 h-3 text-amber-400" />
                        <span>WARM-UP</span>
                      </span>

                      <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700/60 uppercase font-mono tracking-wider">
                        {drill.equipment.replaceAll('_', ' ')}
                      </span>

                      {warmupInstructions.length > 0 && (
                        <span
                          className={`text-[10px] sm:text-xs font-mono font-semibold px-2 py-0.5 rounded-md border ${
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

                      <span className="text-[10px] sm:text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        {drill.targetDurationOrReps}
                      </span>

                      {isDrillDone && (
                        <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span>Done</span>
                        </span>
                      )}
                    </div>

                    {/* Row 2: Visual Thumbnail, Title & Primary Completion (Complete + Collapse) */}
                    <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
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
                          className={`text-sm sm:text-base font-bold text-white hover:text-emerald-300 transition-colors cursor-pointer text-left truncate ${
                                    isDrillDone ? 'text-emerald-400 line-through' : ''
                                  }`}
                        >
                          {idx + 1}. {drill.name}
                        </button>
                      </div>

                      {/* Complete + Collapse buttons together on right, matching ExerciseCard */}
                      <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                        <button
                          type="button"
                          onClick={() => handleToggleWarmupDrill(drill.id, warmupInstructions.length)}
                          aria-label={`Mark drill ${drill.name} as ${isDrillDone ? 'incomplete' : 'completed'}`}
                          className={`flex items-center gap-1.5 px-2.5 py-1 min-h-[36px] rounded-lg border text-xs font-bold transition-all cursor-pointer select-none active:scale-95 ${
                                    isDrillDone
                                      ? 'bg-emerald-500/25 text-emerald-300 border-emerald-500/50 shadow-sm shadow-emerald-950/60'
                                      : 'bg-slate-800/90 hover:bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
                                  }`}
                        >
                          <div
                            className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                                      isDrillDone
                                        ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                                        : 'border-slate-500 bg-slate-950'
                                    }`}
                          >
                            {isDrillDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                          <span>{isDrillDone ? 'Completed ✓' : 'Complete'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleWarmupDrillCollapse(drill.id, isDrillCollapsed)}
                          aria-expanded={!isDrillCollapsed}
                          aria-label={`${isDrillCollapsed ? 'Expand' : 'Collapse'} warmup drill ${drill.name}`}
                          className="flex items-center gap-1 px-2.5 py-1 min-h-[36px] rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/80 text-xs font-medium cursor-pointer transition-colors"
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

                    {/* Row 3: Target Tasks & Reps, Purpose */}
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-400">
                      <span>
                        Target:{' '}
                        <strong className="text-slate-200">
                          {warmupInstructions.length > 0 ? `${completedPhaseCount}/${warmupInstructions.length} Tasks · ` : ''}{drill.targetDurationOrReps}
                        </strong>
                      </span>
                      <span>·</span>
                      <span>
                        Purpose: <span className="text-slate-300">{drill.biomechanicalPurpose}</span>
                      </span>
                    </div>

                    {/* Row 4: Uniform Action Buttons in 1 row (or 2 rows if needed) directly under Tasks & Reps */}
                    {!isDrillCollapsed && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
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
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 min-h-[36px] rounded-lg bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-semibold text-xs cursor-pointer shadow-md shadow-blue-900/30 transition-all"
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
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 min-h-[36px] rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-semibold text-xs cursor-pointer shadow-md shadow-emerald-900/30 transition-all"
                                title={`Start ${holdSec}s Hold Clock (${targetReps} reps/side)`}
                                aria-label={`Start ${holdSec}s Hold Clock (${targetReps} reps/side)`}
                              >
                                <Flame className="w-3.5 h-3.5 text-amber-300" />
                                <span>Start {holdSec}s Hold Clock ({targetReps} reps/side)</span>
                              </button>
                            );
                          }

                          if (drillTempo) {
                            // Paced breathing and holds need a clock; a plain rep cadence on a rep-based drill doesn't
                            const pacedBreathing = drillTempo === '5083' || drillTempo === '4040' || drillTempo === '4083';
                            if (!pacedBreathing && !isTimedPrescription(drill.targetDurationOrReps, drillTempo)) return null;
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
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 min-h-[36px] rounded-lg bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-white font-semibold text-xs cursor-pointer shadow-md shadow-emerald-950/30 transition-all"
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
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 min-h-[36px] rounded-lg bg-slate-800/80 hover:bg-slate-700 text-emerald-400 border border-slate-700/80 font-semibold cursor-pointer text-xs transition-colors"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>View Technique Cues & Science</span>
                        </button>

                        {warmupInstructions.length > 0 && (
                          <button
                            type="button"
                            onClick={() => handleToggleWarmupInstructions(drill.id)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 min-h-[36px] rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/80 font-medium cursor-pointer text-xs transition-colors"
                          >
                            <ListOrdered className="w-3.5 h-3.5 text-emerald-400" />
                            <span>
                              {expandedWarmupInstructions[drill.id] ? 'Hide Instructions' : 'Step-by-Step Instructions'}
                            </span>
                            {expandedWarmupInstructions[drill.id] ? (
                              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                            )}
                          </button>
                        )}
                      </div>
                    )}

                    {!isDrillCollapsed && (
                      <>
                        <div className="text-slate-400 italic pt-0.5">💡 {drill.coachingNotes}</div>
                        {(() => {
                          const matchingWarmupCueCard =
                            CUE_CARD_MAP.get(drill.id) ||
                            CUE_CARD_MAP.get(drill.name.toLowerCase());
                          const warmupInstructions = drill.setupInstructions || matchingWarmupCueCard?.setupInstructions || [];

                          return (
                            <>
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
    </>
  );
}
