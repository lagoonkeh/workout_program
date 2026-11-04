// src/components/WorkoutCompletionModal.tsx
import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Zap,
  ShieldAlert,
} from 'lucide-react';
import { SessionCompletionAudit, SkippedExerciseAdjustment } from '../domain/adaptiveAdjustments';
import { WorkoutSession } from '../domain/programData';

export interface WorkoutCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: WorkoutSession;
  audit: SessionCompletionAudit;
  onApplyAdjustmentsAndComplete: (selectedAdjustments: SkippedExerciseAdjustment[]) => void;
  onCompleteWithoutAdjustments: () => void;
  isSaving?: boolean;
}

export const WorkoutCompletionModal: React.FC<WorkoutCompletionModalProps> = ({
  isOpen,
  onClose,
  session,
  audit,
  onApplyAdjustmentsAndComplete,
  onCompleteWithoutAdjustments,
  isSaving = false,
}) => {
  const [selectedAdjustmentIds, setSelectedAdjustmentIds] = useState<Set<string>>(() => {
    return new Set(audit.proposedAdjustments.map((a) => a.exerciseId));
  });

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toggleAdjustment = (exerciseId: string) => {
    setSelectedAdjustmentIds((prev) => {
      const next = new Set(prev);
      if (next.has(exerciseId)) {
        next.delete(exerciseId);
      } else {
        next.add(exerciseId);
      }
      return next;
    });
  };

  const handleApply = () => {
    const selected = audit.proposedAdjustments.filter((a) =>
      selectedAdjustmentIds.has(a.exerciseId)
    );
    onApplyAdjustmentsAndComplete(selected);
  };

  const hasSkipped = audit.skippedExercises.length > 0;

  return (
    <div
      role="dialog"
      data-testid="workout-completion-modal"
      aria-modal="true"
      aria-labelledby="workout-completion-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                hasSkipped
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              }`}
            >
              {hasSkipped ? (
                <ShieldAlert className="w-5 h-5 text-amber-400" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              )}
            </div>
            <div>
              <h2
                id="workout-completion-title"
                className="text-base sm:text-lg font-bold text-white flex items-center gap-2"
              >
                {hasSkipped ? 'Session Wrap-Up & Future Adjustments' : '🎉 Workout Completed!'}
              </h2>
              <p className="text-xs text-slate-400">
                {session.title} · {session.subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Completion Modal"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs sm:text-sm">
          {/* Adherence Scorecard */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[11px] text-slate-400 block">Exercises Completed</span>
              <span className="text-base sm:text-lg font-bold font-mono text-emerald-400">
                {audit.completedExercises.length} / {audit.totalExercises}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[11px] text-slate-400 block">Exercises Not Done</span>
              <span
                className={`text-base sm:text-lg font-bold font-mono ${
                  hasSkipped ? 'text-amber-400' : 'text-slate-400'
                }`}
              >
                {audit.skippedExercises.length} Skipped
              </span>
            </div>
            <div className="col-span-2 sm:col-span-1 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[11px] text-slate-400 block">Adherence</span>
              <span className="text-base sm:text-lg font-bold font-mono text-white">
                {audit.totalExercises > 0
                  ? Math.round((audit.completedExercises.length / audit.totalExercises) * 100)
                  : 0}
                %
              </span>
            </div>
          </div>

          {/* Skipped Exercises Notice */}
          {hasSkipped && (
            <div
              data-testid="skipped-exercises-alert"
              className="p-3.5 sm:p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 space-y-2"
            >
              <div className="flex items-center gap-2 font-semibold text-amber-300">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>Exercises Not Completed During This Session:</span>
              </div>
              <ul className="space-y-1.5 pl-6 list-disc text-xs text-amber-200/90">
                {audit.skippedExercises.map((sk) => (
                  <li key={sk.id}>
                    <strong className="text-white">{sk.name}</strong> ({sk.tier}):{' '}
                    <span>
                      {sk.completedSets} of {sk.targetSets} sets logged ({sk.skippedSets} skipped)
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-[11px] text-amber-300/80 italic pt-1 border-t border-amber-500/20">
                These will be formally recorded as skipped in your athlete history. Future sessions are adjusted below.
              </p>
            </div>
          )}

          {/* Future Workout Adjustments Section */}
          {hasSkipped && audit.proposedAdjustments.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-200 text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2">
                  <Zap className="w-4 h-4 text-emerald-400" />
                  <span>Future Workout Auto-Regulations</span>
                </h3>
                <span className="text-[11px] text-slate-400">
                  {selectedAdjustmentIds.size} of {audit.proposedAdjustments.length} selected
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                To prevent fatigue accumulation and ensure consistent adherence, the program can automatically adjust future sessions:
              </p>

              <div className="space-y-2.5">
                {audit.proposedAdjustments.map((adj) => {
                  const isChecked = selectedAdjustmentIds.has(adj.exerciseId);
                  return (
                    <label
                      key={adj.exerciseId}
                      className={`block p-3 sm:p-3.5 rounded-xl border transition-all cursor-pointer ${
                        isChecked
                          ? 'bg-emerald-950/25 border-emerald-500/50 shadow-sm shadow-emerald-950/30'
                          : 'bg-slate-950/50 border-slate-800 opacity-60 hover:opacity-90'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleAdjustment(adj.exerciseId)}
                          className="mt-1 w-4 h-4 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                        />
                        <div className="flex-1 space-y-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-bold text-white text-xs sm:text-sm">
                              {adj.exerciseName}
                            </span>
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              Adjust to {adj.proposedSets} Sets
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-amber-300 font-mono">
                            <span>{adj.priorityBadge}</span>
                            <span>·</span>
                            <span>
                              Load: {adj.proposedWeightLbs && adj.proposedWeightLbs > 0 ? `Held at ${adj.proposedWeightLbs} lbs` : 'Bodyweight'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed pt-0.5">
                            {adj.biomechanicalRationale}
                          </p>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Completed Exercises Checklist */}
          {audit.completedExercises.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <h3 className="font-bold text-slate-300 text-xs uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Completed Exercises ({audit.completedExercises.length})</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {audit.completedExercises.map((c) => (
                  <div
                    key={c.id}
                    className="p-2.5 rounded-lg bg-slate-950/50 border border-slate-800/80 flex items-center justify-between text-xs"
                  >
                    <span className="text-slate-200 font-medium truncate">{c.name}</span>
                    <span className="text-emerald-400 font-mono font-bold text-[11px] shrink-0 ml-2">
                      {c.completedSets}/{c.targetSets} Sets ✓
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row items-center justify-end gap-2.5">
          <button
            type="button"
            data-testid="resume-workout-btn"
            onClick={onClose}
            disabled={isSaving}
            className="w-full sm:w-auto px-4 py-2.5 min-h-[44px] flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer transition-colors disabled:opacity-50"
          >
            Resume Workout
          </button>

          {hasSkipped && (
            <button
              type="button"
              data-testid="complete-without-adjustments-btn"
              onClick={onCompleteWithoutAdjustments}
              disabled={isSaving}
              className="w-full sm:w-auto px-4 py-2.5 min-h-[44px] flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-semibold cursor-pointer transition-colors disabled:opacity-50"
            >
              Complete Without Adjustments
            </button>
          )}

          <button
            type="button"
            data-testid="confirm-completion-adjustments-btn"
            onClick={hasSkipped ? handleApply : onCompleteWithoutAdjustments}
            disabled={isSaving}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 cursor-pointer min-h-[44px] transition-all disabled:opacity-75"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>Saving Data & Refreshing...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                <span>
                  {hasSkipped
                    ? `Apply Adjustments (${selectedAdjustmentIds.size}) & Complete`
                    : 'Complete & Advance'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
