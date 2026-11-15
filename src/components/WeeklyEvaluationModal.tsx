// src/components/WeeklyEvaluationModal.tsx
import React, { useState } from 'react';
import {
  X,
  Sparkles,
  TrendingUp,
  ShieldAlert,
  CheckCircle2,
  Clock,
  RotateCcw,
  Zap,
  Activity,
  Check,
} from 'lucide-react';
import { WeeklyEvaluationResult, WorkoutAdaptation } from '../domain/weeklyEvaluator';

export interface WeeklyEvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
  evaluation: WeeklyEvaluationResult;
  onApplyAdaptations: (selectedAdaptations: WorkoutAdaptation[]) => void;
  onResetAdaptations?: () => void;
  onReevaluate?: () => void;
  hasAppliedAdaptations?: boolean;
}

export const WeeklyEvaluationModal: React.FC<WeeklyEvaluationModalProps> = ({
  isOpen,
  onClose,
  evaluation,
  onApplyAdaptations,
  onResetAdaptations,
  onReevaluate,
  hasAppliedAdaptations = false,
}) => {
  if (!isOpen) return null;

  // Selected adaptations state (defaults to all proposed)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(evaluation.adaptations.map((a) => a.id))
  );
  const [appliedSuccess, setAppliedSuccess] = useState<boolean>(false);

  const toggleAdaptation = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleApply = () => {
    const toApply = evaluation.adaptations.filter((a) => selectedIds.has(a.id));
    onApplyAdaptations(toApply);
    setAppliedSuccess(true);
    setTimeout(() => {
      setAppliedSuccess(false);
      onClose();
    }, 1200);
  };

  const getStatusBadge = () => {
    switch (evaluation.overallStatus) {
      case 'progressing':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            Progressing (Overload Ready)
          </span>
        );
      case 'adapting_for_recovery':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            Joint Recovery & Regression Protocol
          </span>
        );
      case 'deload_recommended':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            Fatigue Management / Deload
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
            <Activity className="w-3.5 h-3.5 text-slate-400" />
            Maintaining Baseline
          </span>
        );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="weekly-eval-title"
    >
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-inner">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="weekly-eval-title" className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Weekly Evaluation & Adaptations
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold border border-slate-700">
                  Week {evaluation.weekNumber}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Evaluating athlete comments, RPE notes, and performance data
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Weekly Evaluation Modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="overflow-y-auto px-4 sm:px-6 py-4 space-y-4 sm:space-y-5 text-xs sm:text-sm">
          {/* Status & Coach Verdict Card */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs uppercase tracking-wider font-mono text-slate-400 font-semibold">
                Biomechanical Assessment
              </span>
              {getStatusBadge()}
            </div>

            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans">
              {evaluation.coachVerdict}
            </p>

            <div className="pt-2 border-t border-slate-800/60 flex items-start gap-2 text-xs text-emerald-300 font-medium">
              <Zap className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>Next Week Focus:</strong> {evaluation.nextWeekFocus}
              </span>
            </div>
          </div>

          {/* Weekly Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono">
            <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/60">
              <span className="text-[10px] uppercase text-slate-400 block mb-0.5">Adherence</span>
              <span className="text-base sm:text-lg font-bold text-emerald-400">
                {evaluation.stats.adherenceRate}%
              </span>
              <span className="text-[9px] text-slate-400 block">
                {evaluation.stats.totalSetsCompleted}/{evaluation.stats.totalSetsPrescribed} sets
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/60">
              <span className="text-[10px] uppercase text-slate-400 block mb-0.5">Total Volume</span>
              <span className="text-base sm:text-lg font-bold text-white">
                {evaluation.stats.totalTonnageLbs > 0
                  ? `${Math.round(evaluation.stats.totalTonnageLbs).toLocaleString()}`
                  : '0'}{' '}
                <span className="text-[10px] text-slate-400">lbs</span>
              </span>
              <span className="text-[9px] text-slate-400 block">total tonnage</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/60">
              <span className="text-[10px] uppercase text-slate-400 block mb-0.5">Exercises</span>
              <span className="text-base sm:text-lg font-bold text-indigo-400">
                {evaluation.stats.exercisesCompletedCount}
              </span>
              <span className="text-[9px] text-slate-400 block">fully completed</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/60">
              <span className="text-[10px] uppercase text-slate-400 block mb-0.5">Comments</span>
              <span className="text-base sm:text-lg font-bold text-amber-400">
                {evaluation.stats.notesAnalyzedCount}
              </span>
              <span className="text-[9px] text-slate-400 block">notes analyzed</span>
            </div>
          </div>

          {/* Athlete Comment Insights (if any notes were recorded) */}
          {evaluation.commentInsights.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-slate-400" />
                Athlete Notes & Signals Evaluated
              </h3>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {evaluation.commentInsights.map((insight, idx) => (
                  <div
                    key={`${insight.exerciseId}_${idx}`}
                    className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-bold text-slate-200">{insight.exerciseName}</span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          insight.sentiment === 'pain'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : insight.sentiment === 'positive'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : insight.sentiment === 'fatigued'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {insight.sentiment === 'pain'
                          ? 'Joint / Tendon Alert'
                          : insight.sentiment === 'positive'
                          ? 'High Readiness'
                          : insight.sentiment === 'fatigued'
                          ? 'Fatigue Signal'
                          : 'Note Logged'}
                      </span>
                    </div>

                    <p className="text-slate-300 italic font-mono text-[11px]">
                      "{insight.rawNote}"
                    </p>
                    <p className="text-[11px] text-slate-400 leading-tight">
                      <strong className="text-slate-300">Biomechanical Finding:</strong>{' '}
                      {insight.biomechanicalFinding}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Proposed Workout Adaptations */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                Proposed Workout Changes ({evaluation.adaptations.length})
              </h3>
              {evaluation.adaptations.length > 0 && (
                <span className="text-[11px] text-slate-400">
                  Select changes to apply
                </span>
              )}
            </div>

            {evaluation.adaptations.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 text-center text-xs text-slate-400 space-y-1">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-1 opacity-80" />
                <p className="font-semibold text-slate-300">Current Program is Well-Calibrated</p>
                <p className="text-[11px]">
                  Log more sets with weights, reps, and RPE notes to trigger tailored weekly adaptations.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {evaluation.adaptations.map((adapt) => {
                  const isChecked = selectedIds.has(adapt.id);
                  return (
                    <label
                      key={adapt.id}
                      className={`block p-3 rounded-xl border transition-all cursor-pointer ${
                        isChecked
                          ? 'bg-emerald-950/20 border-emerald-500/40 shadow-sm'
                          : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 opacity-70'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleAdaptation(adapt.id)}
                          className="mt-1 w-4 h-4 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900 cursor-pointer"
                        />

                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="font-bold text-white text-xs sm:text-sm">
                              {adapt.exerciseName}
                            </span>
                            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              {adapt.proposedLabel}
                            </span>
                          </div>

                          <p className="text-xs text-slate-300 leading-snug">
                            {adapt.rationale}
                          </p>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="px-4 sm:px-6 py-3.5 border-t border-slate-800 bg-slate-950/70 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {onReevaluate && (
              <button
                type="button"
                onClick={onReevaluate}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors w-full sm:w-auto cursor-pointer"
                title="Re-run evaluation with latest workout logs and notes"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Re-Evaluate</span>
              </button>
            )}

            {hasAppliedAdaptations && onResetAdaptations && (
              <button
                type="button"
                onClick={onResetAdaptations}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-rose-300 border border-slate-700 transition-colors w-full sm:w-auto cursor-pointer"
                title="Reset program parameters back to initial default weights and settings"
              >
                <span>Reset to Defaults</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Close
            </button>

            {evaluation.adaptations.length > 0 && (
              <button
                type="button"
                onClick={handleApply}
                disabled={selectedIds.size === 0 || appliedSuccess}
                className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all w-full sm:w-auto cursor-pointer shadow-md ${
                  appliedSuccess
                    ? 'bg-emerald-500 text-slate-950'
                    : selectedIds.size > 0
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 active:scale-95'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                {appliedSuccess ? (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Workouts Updated!</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Apply Adaptations ({selectedIds.size})</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
