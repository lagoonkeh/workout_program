// src/components/ExerciseVariationModal.tsx
import React, { useId } from 'react';
import { WorkoutExercise } from '../domain/programData';
import { ExerciseVariation, WorkoutCycle } from '../domain/exerciseVariations';
import {
  X,
  Check,
  Sparkles,
} from 'lucide-react';

export interface ExerciseVariationModalProps {
  isOpen: boolean;
  onClose: () => void;
  baseExercise: WorkoutExercise;
  variations: ExerciseVariation[];
  activeVariationId: string;
  onSelectVariation: (variation: ExerciseVariation) => void;
  currentCycle: WorkoutCycle;
  onToggleCycle?: () => void;
}

export const ExerciseVariationModal: React.FC<ExerciseVariationModalProps> = ({
  isOpen,
  onClose,
  baseExercise,
  variations,
  activeVariationId,
  onSelectVariation,
  currentCycle,
}) => {
  const titleId = useId();

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl max-h-[90vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-900/90 sticky top-0 z-10">
          <div className="flex-1 pr-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] sm:text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                {baseExercise.tier} Variation Pool
              </span>
              <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Cycle {currentCycle} Active
              </span>
            </div>
            <h2 id={titleId} className="text-base sm:text-lg font-bold text-white">
              Exercise Variations & Rotations
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Target Slot: <strong className="text-slate-200">{baseExercise.name}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close variation selector"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Variation List */}
        <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1">
          {/* Scientific Rationale Banner */}
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-emerald-400">
              <Sparkles className="w-4 h-4" />
              <span>Biomechanical Science & Longevity Rule</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {baseExercise.tier === 'T1'
                ? 'T1 compound strength lifts maintain core neuromuscular movement patterns across mesocycles. Periodized variations target sticking points (pause squats, deficit hinges, pin presses) with reduced joint strain.'
                : 'T2 & T3 exercises rotate force vectors, grip angles, and length curves across cycles to stimulate complete regional hypertrophy while preventing overuse tendinopathies.'}
            </p>
          </div>

          {/* List of Variations */}
          <div className="space-y-3">
            {variations.map((v) => {
              const isSelected = v.id === activeVariationId || v.name === baseExercise.name;
              const isKb = v.equipment === 'kettlebell';
              const isBarbell = v.equipment === 'barbell';

              return (
                <div
                  key={v.id}
                  data-testid={`variation-option-${v.id}`}
                  className={`p-3.5 sm:p-4 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-emerald-950/20 border-emerald-500/60 ring-1 ring-emerald-500/40 shadow-md shadow-emerald-950/40'
                      : 'bg-slate-950/50 hover:bg-slate-800/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm sm:text-base font-bold text-white">
                        {v.name}
                      </h3>
                      {v.cycleAffiliation !== 'Both' && (
                        <span
                          className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${
                            v.cycleAffiliation === 'A'
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                              : 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                          }`}
                        >
                          Cycle {v.cycleAffiliation} {v.cycleAffiliation === 'A' ? '(Base)' : '(Wave)'}
                        </span>
                      )}
                    </div>

                    {isSelected ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/40 shrink-0">
                        <Check className="w-3.5 h-3.5" />
                        Active
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectVariation(v);
                          onClose();
                        }}
                        aria-label={`Select ${v.name}`}
                        className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs transition-colors cursor-pointer shrink-0"
                      >
                        Select
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed mb-2.5">
                    {v.scientificRationale}
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                    <div>
                      <span className="text-slate-500 block">Sets × Reps</span>
                      <strong className="text-slate-200">
                        {v.targetSets} × {v.targetReps}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Tempo</span>
                      <strong className="text-slate-200 font-mono">{v.tempo}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Rest Interval</span>
                      <strong className="text-slate-200 font-mono">{v.restSeconds}s</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Equipment</span>
                      <span className="text-slate-200 font-medium">
                        {isKb ? (
                          <span className="text-amber-300 font-mono">
                            Bowflex KB {v.defaultWeightLbs ? `(${v.defaultWeightLbs} lb)` : ''}
                          </span>
                        ) : isBarbell ? (
                          <span className="text-rose-300">
                            Barbell {v.defaultWeightLbs ? `(${v.defaultWeightLbs} lb)` : ''}
                          </span>
                        ) : (
                          v.equipment.replace('_', ' ')
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs">
          <div className="text-slate-400">
            {variations.length} science-backed variation{variations.length === 1 ? '' : 's'} available
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
