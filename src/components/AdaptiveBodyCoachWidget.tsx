// src/components/AdaptiveBodyCoachWidget.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  Mic,
  MicOff,
  RotateCcw,
  Check,
  ShieldCheck,
  History,
  Info,
} from 'lucide-react';
import {
  analyzeBodyFeelingAndHistory,
  BodyFeelingAnalysisResult,
} from '../domain/bodyFeelingAnalyzer';
import { WorkoutSession } from '../domain/programData';
import { WorkoutAdaptation } from '../domain/weeklyEvaluator';
import { CompletedWorkoutSession } from '../storage/storageManager';

export interface AdaptiveBodyCoachWidgetProps {
  activeSession: WorkoutSession;
  history?: CompletedWorkoutSession[];
  appliedAdaptations?: Record<string, any>;
  onApplyAdaptations: (adaptations: WorkoutAdaptation[]) => void;
  onResetAdaptations: () => void;
  className?: string;
  defaultExpanded?: boolean;
}

const PRESET_SYMPTOM_CHIPS = [
  { label: '⚡ High Energy & Fresh', category: 'peak' },
  { label: '🦵 Knee Tender', category: 'knee' },
  { label: '🪵 Stiff Lower Back', category: 'back' },
  { label: '🎯 Shoulder Pinch', category: 'shoulder' },
  { label: '🤸 Tight Hamstrings', category: 'hamstring' },
  { label: '😴 Low Sleep & Fatigued', category: 'energy' },
];

const STORAGE_KEY_COACH_COLLAPSED = 'workout_adaptive_coach_collapsed_v1';

export const AdaptiveBodyCoachWidget: React.FC<AdaptiveBodyCoachWidgetProps> = ({
  activeSession,
  history = [],
  appliedAdaptations = {},
  onApplyAdaptations,
  onResetAdaptations,
  className = '',
  defaultExpanded = false,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_COACH_COLLAPSED);
      if (stored !== null) return stored === 'true';
    } catch {
      // safe fallback
    }
    return !defaultExpanded;
  });

  const [feelingText, setFeelingText] = useState<string>('');
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const [analysisResult, setAnalysisResult] = useState<BodyFeelingAnalysisResult | null>(null);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [speechSupported, setSpeechSupported] = useState<boolean>(false);
  const [hasAppliedRecently, setHasAppliedRecently] = useState<boolean>(false);

  // Check speech recognition support
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasSpeech = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
      setSpeechSupported(hasSpeech);
    }
  }, []);

  const hasAppliedAdaptations = useMemo(() => {
    return Object.keys(appliedAdaptations).length > 0;
  }, [appliedAdaptations]);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY_COACH_COLLAPSED, String(next));
      } catch {
        // safe fallback
      }
      return next;
    });
  }, []);

  const handleToggleChip = (chipLabel: string) => {
    setSelectedChips((prev) => {
      if (prev.includes(chipLabel)) {
        return prev.filter((c) => c !== chipLabel);
      }
      return [...prev, chipLabel];
    });
  };

  // Web Speech API Voice Recognition
  const handleToggleVoice = () => {
    if (!speechSupported) return;

    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRec) return;

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setFeelingText((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  // Run Analysis on demand
  const handleAnalyze = useCallback(() => {
    const result = analyzeBodyFeelingAndHistory(
      feelingText,
      selectedChips,
      history,
      activeSession
    );
    setAnalysisResult(result);
    setHasAppliedRecently(false);
  }, [feelingText, selectedChips, history, activeSession]);

  const handleApply = () => {
    if (!analysisResult) return;
    onApplyAdaptations(analysisResult.adaptations);
    setHasAppliedRecently(true);
  };

  const handleReset = () => {
    onResetAdaptations();
    setAnalysisResult(null);
    setFeelingText('');
    setSelectedChips([]);
    setHasAppliedRecently(false);
  };

  const severityBadgeClass = (sev: string) => {
    switch (sev) {
      case 'high':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'moderate':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      default:
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    }
  };

  return (
    <div
      data-testid="adaptive-body-coach-widget"
      className={`rounded-2xl border transition-all duration-300 shadow-xl overflow-hidden ${
        hasAppliedAdaptations
          ? 'bg-gradient-to-r from-slate-950 via-emerald-950/20 to-slate-950 border-emerald-500/40 ring-1 ring-emerald-500/20'
          : 'bg-slate-900/95 border-slate-800'
      } ${className}`}
    >
      {/* Collapsed Pill Bar */}
      {isCollapsed ? (
        <div className="flex items-center justify-between px-3.5 py-2.5 sm:px-5 sm:py-3 cursor-pointer">
          <button
            type="button"
            data-testid="toggle-body-coach-btn"
            onClick={toggleCollapse}
            aria-expanded={false}
            className="flex items-center gap-2.5 text-left flex-1 min-w-0 cursor-pointer group"
          >
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                hasAppliedAdaptations
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
              }`}
            >
              <Sparkles className="w-4 h-4" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs sm:text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                  Adaptive Body Feeling & Mobility Coach
                </span>
                {hasAppliedAdaptations ? (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold">
                    ✓ Adaptations Active ({Object.keys(appliedAdaptations).length})
                  </span>
                ) : (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    Tap to tell me how your body feels
                  </span>
                )}
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={toggleCollapse}
            aria-label="Expand Adaptive Body Coach"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      ) : (
        /* Full Expanded Adaptive Coach */
        <div className="p-3.5 sm:p-5 flex flex-col gap-3.5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  hasAppliedAdaptations
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
                }`}
              >
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    Adaptive Body Feeling & Mobility Coach
                  </h3>
                  <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold">
                    Live Biomechanical AI
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  Type or speak how your body feels. The coach diagnoses joint strain, reviews your past 14 days of workout notes, and tailors today's routine for functional longevity.
                </p>
              </div>
            </div>

            <button
              type="button"
              data-testid="toggle-body-coach-btn"
              onClick={toggleCollapse}
              aria-label="Collapse Adaptive Body Coach"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Symptom Chips */}
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block mb-1.5 font-bold">
              Quick 1-Tap Feeling Chips:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_SYMPTOM_CHIPS.map((chip) => {
                const isSelected = selectedChips.includes(chip.label);
                return (
                  <button
                    key={chip.label}
                    type="button"
                    data-testid={`feeling-chip-${chip.category}`}
                    onClick={() => handleToggleChip(chip.label)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-emerald-500/25 text-emerald-300 border-emerald-500/50 shadow-sm'
                        : 'bg-slate-950/80 hover:bg-slate-800 text-slate-300 border-slate-800'
                    }`}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Free-form Natural Language Input & Voice */}
          <div className="relative">
            <label htmlFor="body-feeling-input" className="sr-only">
              How does your body feel today?
            </label>
            <textarea
              id="body-feeling-input"
              data-testid="body-feeling-input"
              rows={2}
              value={feelingText}
              onChange={(e) => setFeelingText(e.target.value)}
              placeholder="e.g., 'Right knee is feeling tender when bending, lower back is a bit stiff, but shoulders feel great'..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 pr-12 text-xs sm:text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-colors resize-none leading-relaxed"
            />

            {speechSupported && (
              <button
                type="button"
                data-testid="body-feeling-voice-btn"
                onClick={handleToggleVoice}
                aria-label={isListening ? 'Stop listening' : 'Start voice input'}
                title={isListening ? 'Listening... click to stop' : 'Click to speak your body feeling'}
                className={`absolute right-2.5 bottom-3.5 p-2 rounded-lg border transition-all cursor-pointer ${
                  isListening
                    ? 'bg-rose-500 text-white border-rose-400 animate-pulse'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border-slate-700'
                }`}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            )}
          </div>

          {/* Action Trigger Buttons */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <button
                type="button"
                data-testid="analyze-feeling-btn"
                onClick={handleAnalyze}
                disabled={!feelingText.trim() && selectedChips.length === 0}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95 min-h-[44px]"
              >
                <Sparkles className="w-4 h-4" />
                <span>Analyze My Body & Adapt Routine</span>
              </button>

              {(feelingText || selectedChips.length > 0) && (
                <button
                  type="button"
                  onClick={() => {
                    setFeelingText('');
                    setSelectedChips([]);
                    setAnalysisResult(null);
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-medium cursor-pointer transition-colors min-h-[44px]"
                >
                  Clear
                </button>
              )}
            </div>

            {hasAppliedAdaptations && (
              <button
                type="button"
                data-testid="revert-adaptations-btn"
                onClick={handleReset}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold cursor-pointer transition-colors"
                title="Revert all exercises in today's routine back to the standard baseline"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                <span>Revert to Original Routine</span>
              </button>
            )}
          </div>

          {/* Biomechanical Analysis & Proposed Adaptations Card */}
          {analysisResult && (
            <div
              data-testid="body-feeling-analysis-card"
              className="rounded-xl bg-slate-950/80 border border-slate-800 p-3.5 sm:p-4 flex flex-col gap-3 mt-1 animate-in fade-in slide-in-from-top-1"
            >
              {/* Diagnostic Summary Header */}
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs sm:text-sm font-bold text-white">
                    Biomechanical Findings & Longevity Strategy
                  </h4>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    {analysisResult.biomechanicalSummary}
                  </p>
                </div>
              </div>

              {/* Diagnosed Symptoms Badges & Evidence */}
              {analysisResult.diagnosedSymptoms.length > 0 && (
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1 font-bold">
                    Diagnosed Strains & Sensory Signals:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {analysisResult.diagnosedSymptoms.map((symp, idx) => (
                      <div
                        key={idx}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-semibold ${severityBadgeClass(
                          symp.severity
                        )}`}
                      >
                        <span>{symp.label}</span>
                        <span className="text-[10px] opacity-75 uppercase">({symp.severity})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Past 2 Weeks Recurring Findings */}
              {analysisResult.pastTwoWeeksFindings.length > 0 && (
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 flex items-start gap-2">
                  <History className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block mb-0.5">Past 14-Day Trend Recognition:</strong>
                    {analysisResult.pastTwoWeeksFindings.map((finding, idx) => (
                      <p key={idx} className="text-slate-400 text-[11px] mt-0.5">
                        {finding}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Injected Targeted Mobility & Prehab */}
              {analysisResult.injectedWarmups.length > 0 && (
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 block mb-1 font-bold">
                    Targeted Joint Prehab & Warmup Injections:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {analysisResult.injectedWarmups.map((w) => (
                      <div
                        key={w.id}
                        className="p-2.5 rounded-lg bg-slate-900/90 border border-amber-500/30 text-slate-300"
                      >
                        <strong className="text-amber-200 block text-xs">{w.name}</strong>
                        <span className="text-[11px] text-slate-400 block mt-0.5">{w.rationale}</span>
                        <span className="text-[10px] text-amber-400/80 font-mono mt-1 block">
                          Source: {w.creatorInfluence}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Proposed Workout Routine Adaptations */}
              {analysisResult.adaptations.length > 0 ? (
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 block mb-1 font-bold">
                    Today's Proposed Exercise Adaptations ({analysisResult.adaptations.length}):
                  </span>
                  <div className="space-y-1.5">
                    {analysisResult.adaptations.map((adapt) => (
                      <div
                        key={adapt.id}
                        className="p-2.5 rounded-lg bg-slate-900 border border-emerald-500/30 flex items-start justify-between gap-2 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-white">{adapt.exerciseName}</span>
                            <span className="text-[10px] text-emerald-400 font-mono">➔ {adapt.proposedLabel}</span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">{adapt.rationale}</p>
                        </div>
                        <span className="text-[10px] font-mono text-emerald-300 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 shrink-0">
                          {adapt.creatorInfluence}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
                  <Info className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    No exercise regressions required for this session. Your body is well-adapted for today's programmed movement patterns.
                  </span>
                </div>
              )}

              {/* Confirm / Apply Button */}
              <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-800/80 flex-wrap">
                <button
                  type="button"
                  data-testid="apply-body-feeling-adaptations-btn"
                  onClick={handleApply}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95 min-h-[44px] ${
                    hasAppliedRecently
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950'
                  }`}
                >
                  {hasAppliedRecently ? <Check className="w-4 h-4 stroke-[3]" /> : <Sparkles className="w-4 h-4" />}
                  <span>
                    {hasAppliedRecently
                      ? 'Adaptations Applied to Today’s Workout!'
                      : `Apply Adaptations to Today's Routine (${analysisResult.adaptations.length})`}
                  </span>
                </button>

                {hasAppliedRecently && (
                  <span className="text-xs text-emerald-300 font-mono">
                    ✓ Workout cards updated in real-time
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
