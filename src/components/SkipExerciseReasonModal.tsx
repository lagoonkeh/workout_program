// src/components/SkipExerciseReasonModal.tsx
import React, { useState, useEffect } from 'react';
import {
  X,
  FastForward,
  RotateCcw,
  Clock,
  Dumbbell,
  AlertCircle,
  BatteryLow,
  ShieldCheck,
  Check,
} from 'lucide-react';

export interface SkipExerciseReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  exerciseId: string;
  exerciseName: string;
  exerciseTier: string;
  isCurrentlySkipped: boolean;
  initialReason?: string;
  onConfirmSkip: (exerciseId: string, reason: string) => void;
  onUnskip?: (exerciseId: string) => void;
}

const PRESET_REASON_CHIPS = [
  { id: 'time', label: 'Ran out of time', icon: Clock, category: 'time_constraint' },
  { id: 'equipment', label: 'Equipment occupied/unavailable', icon: Dumbbell, category: 'equipment_unavailable' },
  { id: 'joint', label: 'Joint/knee discomfort', icon: AlertCircle, category: 'pain' },
  { id: 'fatigue', label: 'High fatigue / drained', icon: BatteryLow, category: 'fatigued' },
  { id: 'precaution', label: 'Minor tweak / precaution', icon: ShieldCheck, category: 'pain' },
  { id: 'deload', label: 'Planned volume deload', icon: RotateCcw, category: 'deload' },
];

export const SkipExerciseReasonModal: React.FC<SkipExerciseReasonModalProps> = ({
  isOpen,
  onClose,
  exerciseId,
  exerciseName,
  exerciseTier,
  isCurrentlySkipped,
  initialReason = '',
  onConfirmSkip,
  onUnskip,
}) => {
  const [reason, setReason] = useState<string>(initialReason);

  useEffect(() => {
    if (isOpen) {
      setReason(initialReason || '');
    }
  }, [isOpen, initialReason]);

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

  const handleSelectPreset = (chipLabel: string) => {
    setReason((prev) => {
      if (prev.trim() === chipLabel) {
        return '';
      }
      return chipLabel;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirmSkip(exerciseId, reason.trim());
    onClose();
  };

  const handleUnskip = () => {
    if (onUnskip) {
      onUnskip(exerciseId);
    }
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="skip-exercise-title"
      data-testid="skip-exercise-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in"
    >
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <FastForward className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {exerciseTier}
                </span>
                <h3
                  id="skip-exercise-title"
                  className="text-base sm:text-lg font-bold text-white truncate"
                >
                  {isCurrentlySkipped ? 'Edit Skip Reason' : 'Skip Exercise'}
                </h3>
              </div>
              <p className="text-xs text-slate-400 truncate mt-0.5">{exerciseName}</p>
            </div>
          </div>

          <button
            type="button"
            data-testid="close-skip-modal-btn"
            onClick={onClose}
            aria-label="Close Skip Exercise modal"
            className="min-h-[44px] min-w-[44px] p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700/80 transition-colors flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {/* Status Alert if already skipped */}
          {isCurrentlySkipped && (
            <div
              data-testid="currently-skipped-alert"
              className="p-3 sm:p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-300">Exercise Currently Marked Skipped</span>
                <p className="text-amber-200/80 mt-0.5">
                  Sets are marked [NOT DONE]. You can update the reason below or unskip to resume tracking this exercise.
                </p>
              </div>
            </div>
          )}

          {/* Quick Preset Chips */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Quick Reason (Tap to select)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRESET_REASON_CHIPS.map((chip) => {
                const IconComponent = chip.icon;
                const isSelected = reason === chip.label;
                return (
                  <button
                    key={chip.id}
                    type="button"
                    data-testid={`skip-preset-${chip.id}`}
                    onClick={() => handleSelectPreset(chip.label)}
                    className={`min-h-[44px] px-3 py-2.5 rounded-xl border text-left text-xs font-medium flex items-center gap-2.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/20 text-amber-200 border-amber-500/60 ring-1 ring-amber-500/40 font-semibold'
                        : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300 border-slate-700/80 hover:border-slate-600'
                    }`}
                  >
                    <IconComponent className={`w-4 h-4 shrink-0 ${isSelected ? 'text-amber-400' : 'text-slate-400'}`} />
                    <span className="truncate flex-1">{chip.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 stroke-[3] shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Free-Text Input / Reason Analysis Area */}
          <div>
            <label
              htmlFor="skip-reason-input"
              className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5"
            >
              Custom Reason (Analyzed for Weekly Adaptations)
            </label>
            <textarea
              id="skip-reason-input"
              data-testid="skip-reason-input"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., knee tendon discomfort on heavy sets, gym cable station was broken, needed to leave early for work..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-all resize-none min-h-[88px]"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Your reason is parsed by the weekly analysis engine to recommend intelligent volume auto-regulations and exercise regressions.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            {isCurrentlySkipped && onUnskip ? (
              <button
                type="button"
                data-testid="unskip-exercise-btn"
                onClick={handleUnskip}
                className="min-h-[48px] px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <RotateCcw className="w-4 h-4 text-emerald-400" />
                <span>Unskip & Restore Sets</span>
              </button>
            ) : (
              <button
                type="button"
                data-testid="cancel-skip-btn"
                onClick={onClose}
                className="min-h-[48px] px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 font-semibold text-xs sm:text-sm flex items-center justify-center cursor-pointer transition-colors"
              >
                Cancel
              </button>
            )}

            <button
              type="submit"
              data-testid="confirm-skip-exercise-btn"
              className="min-h-[48px] px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-950/40 cursor-pointer transition-all active:scale-95"
            >
              <FastForward className="w-4 h-4 stroke-[3]" />
              <span>{isCurrentlySkipped ? 'Save Updated Reason' : 'Skip Exercise'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
