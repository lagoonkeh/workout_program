import React, { useEffect, useState } from 'react';
import type { CueCard } from '../domain/cueCardTypes';
import { voiceAnnouncer } from '../audio/voiceAnnouncer';
import { ExerciseDiagram } from './ExerciseDiagram';
import { EXERCISE_VISUALS } from '../domain/exerciseVisualsData';
import { X, Quote, AlertTriangle, ShieldCheck, Activity, Dumbbell, Volume2, VolumeX, Eye, Sparkles, Check, CheckSquare } from 'lucide-react';

const STORAGE_KEY_PHASE_TASKS = 'workout_phase_tasks_v1';

export interface CueCardModalProps {
  cueCard: CueCard | null;
  isOpen: boolean;
  onClose: () => void;
  onLaunchTempo?: (tempo: string) => void;
  onPhaseTaskToggle?: (phaseKey: string, isDone: boolean) => void;
}

export const CueCardModal: React.FC<CueCardModalProps> = ({
  cueCard,
  isOpen,
  onClose,
  onLaunchTempo,
  onPhaseTaskToggle,
}) => {
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [completedPhases, setCompletedPhases] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PHASE_TASKS);
      if (stored) return JSON.parse(stored);
    } catch {
      // safe fallback
    }
    return {};
  });

  // Sync with localStorage whenever modal opens or cueCard changes
  useEffect(() => {
    if (!isOpen) return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PHASE_TASKS);
      if (stored) setCompletedPhases(JSON.parse(stored));
    } catch {
      // safe fallback
    }
  }, [isOpen, cueCard?.id, cueCard?.exerciseId]);

  const handleTogglePhase = (phaseKey: string) => {
    setCompletedPhases((prev) => {
      const nextDone = !prev[phaseKey];
      const next = { ...prev, [phaseKey]: nextDone };
      try {
        localStorage.setItem(STORAGE_KEY_PHASE_TASKS, JSON.stringify(next));
      } catch {
        // safe fallback
      }
      onPhaseTaskToggle?.(phaseKey, nextDone);
      return next;
    });
  };

  const handleToggleAllPhases = () => {
    if (!cueCard || !cueCard.setupInstructions || cueCard.setupInstructions.length === 0) return;
    const baseId = cueCard.exerciseId || cueCard.id;
    const allDone = cueCard.setupInstructions.every(
      (_, idx) => !!completedPhases[`${baseId}_phase_${idx}`]
    );

    setCompletedPhases((prev) => {
      const next = { ...prev };
      cueCard.setupInstructions!.forEach((_, idx) => {
        const key = `${baseId}_phase_${idx}`;
        next[key] = !allDone;
        onPhaseTaskToggle?.(key, !allDone);
      });
      try {
        localStorage.setItem(STORAGE_KEY_PHASE_TASKS, JSON.stringify(next));
      } catch {
        // safe fallback
      }
      return next;
    });
  };

  // Stop audio on close or unmount
  useEffect(() => {
    return () => {
      voiceAnnouncer.cancel();
      setIsSpeaking(false);
    };
  }, [isOpen]);

  // ESC key close listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        voiceAnnouncer.cancel();
        setIsSpeaking(false);
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is active
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !cueCard) {
    return null;
  }

  const prescribedTempo = cueCard.prescribedTempo || cueCard.tempo;
  const visualData = EXERCISE_VISUALS[cueCard.exerciseId] ||
    Object.values(EXERCISE_VISUALS).find(
      (v) =>
        v.exerciseName.toLowerCase() === cueCard.exerciseName.toLowerCase() ||
        cueCard.title.toLowerCase().includes(v.exerciseName.toLowerCase())
    );

  const handleToggleVoiceCues = () => {
    if (isSpeaking) {
      voiceAnnouncer.cancel();
      setIsSpeaking(false);
    } else {
      setIsSpeaking(true);
      const title = cueCard.title || cueCard.exerciseName;
      const cues = (cueCard.creatorCues || []).map((c) => c.quote);
      voiceAnnouncer.announceCues(title, cues, {
        onEnd: () => setIsSpeaking(false),
      });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cue-card-title"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl sm:max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl relative my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between p-3.5 sm:p-6 border-b border-slate-800 bg-slate-950/60">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {cueCard.tier}
              </span>
              {prescribedTempo && (
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  Tempo: {prescribedTempo}
                </span>
              )}
            </div>
            <h2 id="cue-card-title" className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {cueCard.title || cueCard.exerciseName}
            </h2>
            <div className="text-xs text-slate-400 mt-1">
              Muscles: <span className="text-slate-300">{cueCard.primaryMuscles.join(', ')}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleVoiceCues}
              aria-label={isSpeaking ? 'Stop Reading Form Cues' : 'Listen to Form Cues Aloud'}
              title={isSpeaking ? 'Stop audio playback' : 'Listen to key form cues through speech synthesis'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                isSpeaking
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-sm'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
              }`}
            >
              {isSpeaking ? (
                <VolumeX className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <span>{isSpeaking ? 'Stop Audio' : 'Listen to Cues'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                voiceAnnouncer.cancel();
                setIsSpeaking(false);
                onClose();
              }}
              aria-label="Close Cue Card Modal"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-3.5 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6 text-sm text-slate-300">
          {/* Visual Exercise Demonstration Banner */}
          {visualData && (
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-emerald-400" />
                  Visual Motion Demonstration & Trajectory
                </h3>
                <span className="text-[11px] font-mono text-emerald-400/90 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-md">
                  {visualData.trajectoryNote}
                </span>
              </div>

              <ExerciseDiagram
                diagramType={visualData.diagramType}
                exerciseName={cueCard.exerciseName}
                tempo={prescribedTempo}
              />

              <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 text-xs space-y-1.5">
                <p className="text-slate-200 font-medium">
                  💡 <span className="text-slate-300">{visualData.caption}</span>
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400 font-mono pt-1 border-t border-slate-800/60">
                  <span><strong>Start:</strong> {visualData.jointAngleCues.start}</span>
                  <span><strong>Peak:</strong> {visualData.jointAngleCues.bottom}</span>
                </div>
              </div>
            </section>
          )}

          {/* Equipment & Setup Instructions / Actionable Phase Tasks */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Dumbbell className="w-4 h-4 text-emerald-400" />
                Setup & Equipment Tasks ({cueCard.equipment})
              </h3>
              {cueCard.setupInstructions && cueCard.setupInstructions.length > 0 && (
                <button
                  type="button"
                  onClick={handleToggleAllPhases}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold cursor-pointer transition-all min-h-[36px]"
                  aria-label={
                    cueCard.setupInstructions.every(
                      (_, idx) => !!completedPhases[`${cueCard.exerciseId || cueCard.id}_phase_${idx}`]
                    )
                      ? 'Reset all tasks for this exercise'
                      : 'Mark all tasks completed for this exercise'
                  }
                >
                  <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    {cueCard.setupInstructions.every(
                      (_, idx) => !!completedPhases[`${cueCard.exerciseId || cueCard.id}_phase_${idx}`]
                    )
                      ? 'Reset Tasks'
                      : 'Mark All Tasks Done'}
                  </span>
                </button>
              )}
            </div>

            {cueCard.setupInstructions && cueCard.setupInstructions.length > 0 && (() => {
              const baseId = cueCard.exerciseId || cueCard.id;
              const total = cueCard.setupInstructions.length;
              const completedCount = cueCard.setupInstructions.filter(
                (_, idx) => !!completedPhases[`${baseId}_phase_${idx}`]
              ).length;
              const pct = Math.round((completedCount / total) * 100);

              return (
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Phase Tasks Progress</span>
                    </span>
                    <span className="font-mono font-bold text-emerald-400">
                      {completedCount} / {total} Done ({pct}%)
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })()}

            <div className="space-y-2.5">
              {cueCard.setupInstructions && cueCard.setupInstructions.length > 0 ? (
                cueCard.setupInstructions.map((instruction, idx) => {
                  const baseId = cueCard.exerciseId || cueCard.id;
                  const phaseKey = `${baseId}_phase_${idx}`;
                  const isDone = !!completedPhases[phaseKey];

                  const colonIndex = instruction.indexOf(':');
                  const hasPrefix = colonIndex > 0 && colonIndex < 45;
                  const prefix = hasPrefix ? instruction.substring(0, colonIndex).trim() : null;
                  const body = hasPrefix ? instruction.substring(colonIndex + 1).trim() : instruction;

                  return (
                    <div
                      key={idx}
                      onClick={() => handleTogglePhase(phaseKey)}
                      role="checkbox"
                      aria-checked={isDone}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === ' ' || e.key === 'Enter') {
                          e.preventDefault();
                          handleTogglePhase(phaseKey);
                        }
                      }}
                      className={`group cursor-pointer rounded-xl p-3 sm:p-3.5 transition-all min-h-[48px] select-none border ${
                        isDone
                          ? 'bg-emerald-950/20 border-emerald-500/50 shadow-sm shadow-emerald-950/30'
                          : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/60'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTogglePhase(phaseKey);
                          }}
                          aria-label={`Mark task ${idx + 1} as ${isDone ? 'incomplete' : 'complete'}`}
                          className={`flex-shrink-0 w-7 h-7 mt-0.5 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                            isDone
                              ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-sm shadow-emerald-900/40'
                              : 'bg-slate-900 border-slate-700 text-slate-400 group-hover:border-slate-500'
                          }`}
                        >
                          {isDone ? (
                            <Check className="w-4 h-4 stroke-[3]" />
                          ) : (
                            <span className="text-[11px] font-mono font-bold text-slate-400 group-hover:text-slate-200">
                              {idx + 1}
                            </span>
                          )}
                        </button>
                        <div className="flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {prefix ? (
                              <span
                                className={`font-semibold text-xs sm:text-sm transition-colors ${
                                  isDone ? 'text-emerald-300' : 'text-slate-200'
                                }`}
                              >
                                {prefix}
                              </span>
                            ) : (
                              <span
                                className={`font-semibold text-xs sm:text-sm transition-colors ${
                                  isDone ? 'text-emerald-300' : 'text-slate-300'
                                }`}
                              >
                                Task {idx + 1}
                              </span>
                            )}
                            <span
                              className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded border transition-colors ${
                                isDone
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                  : 'bg-slate-800 text-slate-400 border-slate-700'
                              }`}
                            >
                              {isDone ? 'Completed' : 'Tap to Complete'}
                            </span>
                          </div>
                          <p
                            className={`text-xs sm:text-sm leading-relaxed transition-colors ${
                              isDone ? 'text-slate-400 line-clamp-none' : 'text-slate-300'
                            }`}
                          >
                            {body}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : cueCard.setup ? (
                <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {cueCard.setup}
                </div>
              ) : (
                <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 text-xs text-slate-400">
                  Standard setup applies.
                </div>
              )}
            </div>
          </section>

          {/* Creator Cues & Science */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Quote className="w-4 h-4 text-sky-400" />
              Form Cues & Biomechanics
            </h3>

            <div className="space-y-3.5">
              {cueCard.creatorCues.map((cue, idx) => (
                <div
                  key={idx}
                  className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="font-bold text-emerald-300 text-xs sm:text-sm">
                      Form Cue {idx + 1}
                    </span>
                  </div>

                  <blockquote className="border-l-2 border-emerald-500/40 pl-3 text-xs sm:text-sm text-slate-200 italic leading-relaxed">
                    "{cue.quote}"
                  </blockquote>

                  <p className="text-xs text-slate-400 pl-3 leading-relaxed">
                    <strong className="text-slate-300">Biomechanical Rationale:</strong>{' '}
                    {cue.biomechanicalRationale}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Common Faults */}
          {cueCard.commonFaults && cueCard.commonFaults.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Common Faults to Avoid
              </h3>
              <ul className="space-y-1.5 bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl text-xs text-amber-200">
                {cueCard.commonFaults.map((fault, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold">•</span>
                    <span>{fault}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Lengthened Partials & Stretch-Mediated Hypertrophy Protocol */}
          {cueCard.lengthenedPartialsProtocol && (
            <section
              data-testid="cue-card-lengthened-partials"
              className="space-y-2 p-4 rounded-xl bg-gradient-to-r from-purple-950/40 via-slate-950 to-purple-950/20 border border-purple-500/30"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  Lengthened Partials & Stretch Science (Wolf et al. 2023/2024)
                </h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-200 border border-purple-500/30">
                  LML-RT Hypertrophy
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <p className="text-slate-200 font-medium leading-relaxed">
                  💡 <strong className="text-purple-300">Technique:</strong>{' '}
                  {cueCard.lengthenedPartialsProtocol.recommendation}
                </p>
                <div className="bg-slate-900/80 border border-purple-900/40 rounded-lg p-2.5 space-y-1">
                  <div className="text-[11px] text-purple-200 font-mono">
                    <strong>Target Range:</strong> {cueCard.lengthenedPartialsProtocol.targetRangeNote}
                  </div>
                  <div className="text-[11px] text-slate-400 leading-relaxed">
                    <strong>Biomechanical Rationale:</strong> {cueCard.lengthenedPartialsProtocol.scientificRationale}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Rehab Regressions */}
          {cueCard.rehabRegressions && cueCard.rehabRegressions.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Pain-Free Rehab Regressions
              </h3>
              <ul className="space-y-1.5 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-xs text-emerald-200">
                {cueCard.rehabRegressions.map((reg, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>{reg}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/60 flex flex-wrap items-center justify-between gap-3">
          {onLaunchTempo && (cueCard.tempo || prescribedTempo) && (
            <button
              type="button"
              onClick={() => {
                onLaunchTempo(cueCard.tempo || prescribedTempo);
                onClose();
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 text-xs font-semibold border border-sky-500/40 transition-colors cursor-pointer"
            >
              <Activity className="w-4 h-4 text-sky-400" />
              <span>Launch Tempo Metronome ({cueCard.tempo || prescribedTempo})</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="ml-auto px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
