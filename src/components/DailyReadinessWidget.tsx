import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import {
  DailyReadinessEntry,
  COMMON_SORENESS_TAGS,
  analyzeDailyReadiness,
  ReadinessTier,
} from '../domain/dailyReadiness';
import { WorkoutSession } from '../domain/programData';
import { healthForDate, loadCachedHealth, restingHrTrend, sleepScoreFromHours, type HealthDay } from '../domain/healthMetrics';
import { refreshHealthMetrics } from '../services/healthService';
import { HEALTH_UPDATED_EVENT, interpretWorkout, loadCachedWorkouts, type HealthWorkout } from '../domain/healthWorkouts';

const MUSCLE_SHORT: Record<string, string> = {
  chest: 'chest', shoulders: 'shoulders', biceps: 'grip/biceps', triceps: 'triceps', lats: 'lats', traps: 'traps/neck',
  core: 'core', lower_back: 'lower back', quads: 'quads', hamstrings: 'hamstrings', glutes: 'glutes', calves: 'calves',
};
import { WorkoutAdaptation } from '../domain/weeklyEvaluator';
import type { RatingCategoryTab } from './RatingDefinitionsModal';
import { RatingDefinitionsModal } from '../lazyView';
import {
  HeartPulse,
  Sparkles,
  CheckCircle2,
  Calendar,
  Zap,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Tag,
  Clock,
  ArrowRight,
  TrendingUp,
  Info,
} from 'lucide-react';

export const STORAGE_KEY_READINESS_LOGS = 'workout_daily_readiness_logs_v1';

export interface DailyReadinessWidgetProps {
  activeSession: WorkoutSession;
  onApplyAdaptations: (adaptations: WorkoutAdaptation[]) => void;
  onNavigateToWorkout?: () => void;
}

export const DailyReadinessWidget: React.FC<DailyReadinessWidgetProps> = ({
  activeSession,
  onApplyAdaptations,
  onNavigateToWorkout,
}) => {
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Form State
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [kneePainScore, setKneePainScore] = useState<number>(1);
  const [hamstringTightness, setHamstringTightness] = useState<number>(2);
  const [energyScore, setEnergyScore] = useState<number>(7);
  const [sleepScore, setSleepScore] = useState<number>(7);
  const [sorenessTags, setSorenessTags] = useState<string[]>([]);
  const [journalNotes, setJournalNotes] = useState<string>('');

  // Rating Scale Terms Definition Modal State
  const [isRatingModalOpen, setIsRatingModalOpen] = useState<boolean>(false);
  const [initialRatingTab, setInitialRatingTab] = useState<RatingCategoryTab>('all');

  const handleOpenRatingModal = useCallback((tab: RatingCategoryTab = 'all') => {
    setInitialRatingTab(tab);
    setIsRatingModalOpen(true);
  }, []);

  // Persisted History & Active Analysis
  const [history, setHistory] = useState<DailyReadinessEntry[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_READINESS_LOGS);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // fallback
    }
    return [];
  });

  const [activeAnalysis, setActiveAnalysis] = useState<DailyReadinessEntry | null>(null);
  const [appliedSuccess, setAppliedSuccess] = useState<boolean>(false);
  const [showHistory, setShowHistory] = useState<boolean>(false);

  // Load existing log for the selected date if present
  useEffect(() => {
    const existing = history.find((h) => h.date === selectedDate);
    if (existing) {
      setKneePainScore(existing.kneePainScore);
      setHamstringTightness(existing.hamstringTightness);
      setEnergyScore(existing.energyScore);
      setSleepScore(existing.sleepScore);
      setSorenessTags(existing.sorenessTags);
      setJournalNotes(existing.journalNotes);
      setActiveAnalysis(existing);
    } else {
      setActiveAnalysis(null);
      setAppliedSuccess(false);
    }
  }, [selectedDate, history]);

  // Health Connect (posted by Tasker to /api/health): pre-fill sleep for a day without a check-in yet
  const [healthDays, setHealthDays] = useState<HealthDay[]>(() => loadCachedHealth());
  useEffect(() => {
    let alive = true;
    void refreshHealthMetrics().then((days) => {
      if (alive && days) setHealthDays(days);
    });
    return () => {
      alive = false;
    };
  }, []);
  const [outsideWorkouts, setOutsideWorkouts] = useState<HealthWorkout[]>(() => loadCachedWorkouts());
  useEffect(() => {
    const onUpdate = () => setOutsideWorkouts(loadCachedWorkouts());
    window.addEventListener(HEALTH_UPDATED_EVENT, onUpdate);
    return () => window.removeEventListener(HEALTH_UPDATED_EVENT, onUpdate);
  }, []);
  // Workouts done outside the app on the selected day and the day before
  const recentOutside = useMemo(() => {
    const prev = new Date(`${selectedDate}T12:00:00`);
    prev.setDate(prev.getDate() - 1);
    const prevKey = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-${String(prev.getDate()).padStart(2, '0')}`;
    return outsideWorkouts
      .filter((w) => w.date === selectedDate || w.date === prevKey)
      .sort((a, b) => b.start.localeCompare(a.start))
      .slice(0, 4)
      .map((w) => ({ w, it: interpretWorkout(w), when: w.date === selectedDate ? 'Today' : 'Yesterday' }));
  }, [outsideWorkouts, selectedDate]);
  const healthToday = useMemo(() => healthForDate(healthDays, selectedDate), [healthDays, selectedDate]);
  const rhrTrend = useMemo(() => restingHrTrend(healthDays, selectedDate), [healthDays, selectedDate]);
  const [healthSleepApplied, setHealthSleepApplied] = useState(false);
  useEffect(() => {
    const hasEntry = history.some((h) => h.date === selectedDate);
    if (!hasEntry && typeof healthToday?.sleepHours === 'number') {
      setSleepScore(sleepScoreFromHours(healthToday.sleepHours));
      setHealthSleepApplied(true);
    } else {
      setHealthSleepApplied(false);
    }
  }, [healthToday, selectedDate, history]);

  const handleToggleTag = useCallback((tag: string) => {
    setSorenessTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }, []);

  const handleAnalyze = useCallback(() => {
    const analysis = analyzeDailyReadiness(
      {
        date: selectedDate,
        kneePainScore,
        hamstringTightness,
        energyScore,
        sleepScore,
        sorenessTags,
        journalNotes,
      },
      activeSession
    );

    setActiveAnalysis(analysis);
    setAppliedSuccess(false);

    // Persist to history
    setHistory((prev) => {
      const filtered = prev.filter((h) => h.date !== selectedDate);
      const updated = [analysis, ...filtered];
      try {
        localStorage.setItem(STORAGE_KEY_READINESS_LOGS, JSON.stringify(updated));
      } catch {
        // fallback
      }
      return updated;
    });
  }, [selectedDate, kneePainScore, hamstringTightness, energyScore, sleepScore, sorenessTags, journalNotes, activeSession]);

  const handleApplyAdaptations = useCallback(() => {
    if (!activeAnalysis || activeAnalysis.recommendedAdaptations.length === 0) return;

    onApplyAdaptations(activeAnalysis.recommendedAdaptations);
    setAppliedSuccess(true);

    // Update activeAnalysis applied flag
    setActiveAnalysis((prev) => (prev ? { ...prev, applied: true } : null));

    // Update history
    setHistory((prev) => {
      const updated = prev.map((entry) =>
        entry.id === activeAnalysis.id ? { ...entry, applied: true } : entry
      );
      try {
        localStorage.setItem(STORAGE_KEY_READINESS_LOGS, JSON.stringify(updated));
      } catch {
        // fallback
      }
      return updated;
    });
  }, [activeAnalysis, onApplyAdaptations]);

  // Color helper for tier
  const tierMeta: Record<ReadinessTier, { label: string; bg: string; text: string; border: string }> = {
    peak: {
      label: 'Peak Readiness (Cleared for PRs)',
      bg: 'bg-emerald-500/20',
      text: 'text-emerald-300',
      border: 'border-emerald-500/40',
    },
    standard: {
      label: 'Standard Training Ready',
      bg: 'bg-cyan-500/20',
      text: 'text-cyan-300',
      border: 'border-cyan-500/40',
    },
    cautious: {
      label: 'Joint Caution (Adaptations Recommended)',
      bg: 'bg-amber-500/20',
      text: 'text-amber-300',
      border: 'border-amber-500/40',
    },
    rest_recovery: {
      label: 'Recovery / Deload Mode',
      bg: 'bg-rose-500/20',
      text: 'text-rose-300',
      border: 'border-rose-500/40',
    },
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4 sm:space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <HeartPulse className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-2xl font-bold text-white tracking-tight">
                Daily Body Readiness & Recovery Check-In
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Log how your joints, tendons, and energy feel today. The AI biomechanical engine analyzes your notes to tailor today's workout.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-mono text-slate-300">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-white focus:outline-none cursor-pointer"
                aria-label="Select check-in date"
              />
            </div>
          </div>
        </div>

        {/* Current Active Session Callout */}
        <div className="mt-3 py-2 px-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs text-slate-300">
          <span>
            Target Workout Today: <strong className="text-emerald-300">{activeSession.title}</strong> — {activeSession.subtitle}
          </span>
          <span className="text-[11px] font-mono text-slate-400">
            {activeSession.exercises.length} Exercises
          </span>
        </div>
      </div>

      {/* Main Form: Biometric Sliders & Body Region Tags */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <span>1. Rate Today's Physical Sensations</span>
          </h3>

          <button
            type="button"
            data-testid="open-rating-terms-guide"
            onClick={() => handleOpenRatingModal('all')}
            title="Open Rating Terms & Clinical Scale Definitions Guide"
            aria-label="View rating scale definitions"
            className="flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] rounded-xl bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-800/60 text-xs font-semibold transition-all cursor-pointer shadow-sm hover:border-cyan-600"
          >
            <Info className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Rating Terms Guide</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Knee Discomfort Slider */}
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                <span>Knee Tendon Discomfort</span>
                <button
                  type="button"
                  data-testid="info-knee-rating"
                  onClick={() => handleOpenRatingModal('knee')}
                  title="Define Knee Tendon Discomfort terms (0-10)"
                  aria-label="Define Knee Tendon Discomfort terms"
                  className="p-1 min-h-[44px] min-w-[44px] -m-1 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800/80 transition-colors flex items-center justify-center cursor-pointer"
                >
                  <Info className="w-3.5 h-3.5 text-slate-400 hover:text-cyan-400" />
                </button>
              </span>
              <span
                className={`px-2 py-0.5 rounded-full font-mono text-[11px] font-bold border ${
                  kneePainScore === 0
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : kneePainScore <= 2
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : kneePainScore <= 4
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-rose-500/25 text-rose-300 border-rose-500/50'
                }`}
              >
                {kneePainScore === 0 ? '0/10 (Pain-Free)' : `${kneePainScore}/10`}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="10"
              step="1"
              value={kneePainScore}
              onChange={(e) => setKneePainScore(Number(e.target.value))}
              aria-label="Knee Tendon Discomfort Score"
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>0 (Iron Knees)</span>
              <span>2 (Mild Warmup Stiffness)</span>
              <span>5 (Ache)</span>
              <span>10 (Sharp Pain)</span>
            </div>
          </div>

          {/* Hamstring / Posterior Chain Tightness */}
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-sky-400" />
                <span>Hamstring / Posterior Chain Tightness</span>
                <button
                  type="button"
                  data-testid="info-hamstring-rating"
                  onClick={() => handleOpenRatingModal('hamstring')}
                  title="Define Hamstring Tightness terms (0-10)"
                  aria-label="Define Hamstring Tightness terms"
                  className="p-1 min-h-[44px] min-w-[44px] -m-1 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800/80 transition-colors flex items-center justify-center cursor-pointer"
                >
                  <Info className="w-3.5 h-3.5 text-slate-400 hover:text-cyan-400" />
                </button>
              </span>
              <span
                className={`px-2 py-0.5 rounded-full font-mono text-[11px] font-bold border ${
                  hamstringTightness <= 2
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : hamstringTightness <= 5
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-rose-500/25 text-rose-300 border-rose-500/50'
                }`}
              >
                {hamstringTightness <= 2 ? 'Supple' : `${hamstringTightness}/10 Tightness`}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="10"
              step="1"
              value={hamstringTightness}
              onChange={(e) => setHamstringTightness(Number(e.target.value))}
              aria-label="Hamstring Tightness Score"
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>0 (Loose & Open)</span>
              <span>4 (Moderate Stiffness)</span>
              <span>7 (Guarding)</span>
              <span>10 (Locked Up)</span>
            </div>
          </div>

          {/* Overall Energy & CNS Readiness */}
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span>Overall Energy & CNS Readiness</span>
                <button
                  type="button"
                  data-testid="info-energy-rating"
                  onClick={() => handleOpenRatingModal('energy')}
                  title="Define Energy & CNS Readiness terms (1-10)"
                  aria-label="Define Energy and CNS Readiness terms"
                  className="p-1 min-h-[44px] min-w-[44px] -m-1 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800/80 transition-colors flex items-center justify-center cursor-pointer"
                >
                  <Info className="w-3.5 h-3.5 text-slate-400 hover:text-cyan-400" />
                </button>
              </span>
              <span className="px-2 py-0.5 rounded-full font-mono text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                {energyScore}/10
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={energyScore}
              onChange={(e) => setEnergyScore(Number(e.target.value))}
              aria-label="Energy Score"
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>1 (Exhausted)</span>
              <span>5 (Moderate)</span>
              <span>10 (Peak PR Energy)</span>
            </div>
          </div>

          {/* Sleep Quality */}
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span>Sleep Quality & Recovery</span>
                <button
                  type="button"
                  data-testid="info-sleep-rating"
                  onClick={() => handleOpenRatingModal('sleep')}
                  title="Define Sleep Quality terms (1-10)"
                  aria-label="Define Sleep Quality terms"
                  className="p-1 min-h-[44px] min-w-[44px] -m-1 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800/80 transition-colors flex items-center justify-center cursor-pointer"
                >
                  <Info className="w-3.5 h-3.5 text-slate-400 hover:text-cyan-400" />
                </button>
              </span>
              <span className="px-2 py-0.5 rounded-full font-mono text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                {sleepScore}/10
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={sleepScore}
              onChange={(e) => setSleepScore(Number(e.target.value))}
              aria-label="Sleep Score"
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>1 (&lt; 5 hrs / Broken)</span>
              <span>6 (Adequate)</span>
              <span>10 (8+ hrs Restored)</span>
            </div>
            {healthToday && (
              <div
                data-testid="health-connect-summary"
                className="mt-1 p-2 rounded-lg bg-indigo-950/40 border border-indigo-500/30 text-[11px] text-indigo-100 space-y-0.5"
              >
                <div className="font-semibold text-indigo-300">From Health Connect</div>
                {typeof healthToday.sleepHours === 'number' && (
                  <div>
                    Slept {healthToday.sleepHours.toFixed(1)} h → sleep score {sleepScoreFromHours(healthToday.sleepHours)}/10
                    {healthSleepApplied ? ' (filled in)' : ''}
                  </div>
                )}
                {rhrTrend ? (
                  <div className={rhrTrend.elevated ? 'text-amber-300 font-semibold' : ''}>
                    Resting HR {rhrTrend.today} bpm ({rhrTrend.delta >= 0 ? '+' : ''}
                    {rhrTrend.delta} vs 7-day avg){rhrTrend.elevated ? ': elevated, recovery may be incomplete' : ''}
                  </div>
                ) : typeof healthToday.restingHr === 'number' ? (
                  <div>Resting HR {healthToday.restingHr} bpm</div>
                ) : null}
                {typeof healthToday.hrvMs === 'number' && <div>HRV {healthToday.hrvMs} ms</div>}
                {typeof healthToday.weightLbs === 'number' && <div>Weight {healthToday.weightLbs} lb</div>}
              </div>
            )}
            {recentOutside.length > 0 && (
              <div
                data-testid="health-connect-workouts"
                className="mt-1 p-2 rounded-lg bg-indigo-950/40 border border-indigo-500/30 text-[11px] text-indigo-100 space-y-1"
              >
                <div className="font-semibold text-indigo-300">Training outside the app</div>
                {recentOutside.map(({ w, it, when }) => (
                  <div key={w.uuid} data-testid={`health-workout-${w.uuid}`}>
                    <span className="font-semibold">{when}:</span> {it.summary}
                    {it.trained.length > 0 && (
                      <span className="text-indigo-300">
                        {' '}
                        &rarr; counts toward {it.trained.slice(0, 5).map((m) => MUSCLE_SHORT[m] || m).join(', ')}
                        {it.fromRecordedSets ? ' (from recorded sets)' : ''}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 1-Tap Quick Tags */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-emerald-400" />
            <span>2. Quick Body Tags (Tap any that apply today)</span>
          </label>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {COMMON_SORENESS_TAGS.map((tag) => {
              const isSelected = sorenessTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleToggleTag(tag)}
                  aria-pressed={isSelected}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-500/25 text-emerald-200 border-emerald-500/60 font-semibold shadow-sm'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        {/* Open-Ended Feeling Journal */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span>3. How does your body feel today? (Write freely for AI Analysis)</span>
            <span className="text-[10px] text-slate-400 font-normal">
              Detects tendon pain, joint friction, and stiffness keywords
            </span>
          </label>
          <textarea
            value={journalNotes}
            onChange={(e) => setJournalNotes(e.target.value)}
            rows={3}
            placeholder="e.g. Woke up with a dull ache in my left patellar tendon stepping down stairs this morning (3/10), hamstrings feel stiff after yesterday's RDLs, but shoulders feel loose and ready to press..."
            aria-label="Daily Body Feeling Journal Notes"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs sm:text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition-colors leading-relaxed"
          />
        </div>

        {/* Action Button: Analyze */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/80">
          <button
            type="button"
            onClick={handleAnalyze}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-emerald-950/50 transition-all cursor-pointer active:scale-95"
            aria-label="Analyze Body Readiness and Generate Adjustments"
          >
            <Sparkles className="w-4 h-4 fill-slate-950" />
            <span>Analyze Body Readiness & Generate Adjustments</span>
          </button>
        </div>
      </div>

      {/* Analysis Results & Proposed Adjustments Card */}
      {activeAnalysis && (
        <div
          data-testid="readiness-analysis-card"
          className="bg-slate-900 border border-emerald-500/40 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-2xl space-y-4 animate-in fade-in duration-300"
        >
          {/* Header Scorecard */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold border font-mono ${
                    tierMeta[activeAnalysis.statusTier].bg
                  } ${tierMeta[activeAnalysis.statusTier].text} ${
                    tierMeta[activeAnalysis.statusTier].border
                  }`}
                >
                  {tierMeta[activeAnalysis.statusTier].label}
                </span>
                <span className="text-xs text-slate-400 font-mono">Date: {activeAnalysis.date}</span>
              </div>
              <h4 className="text-base sm:text-xl font-bold text-white flex items-center gap-2 flex-wrap">
                <span>Biomechanical Readiness Assessment: {activeAnalysis.readinessScore}%</span>
                <button
                  type="button"
                  data-testid="info-readiness-tiers"
                  onClick={() => handleOpenRatingModal('readiness')}
                  title="Define Biomechanical Readiness Tiers"
                  aria-label="Define Biomechanical Readiness Tiers"
                  className="p-1 min-h-[44px] min-w-[44px] -m-1 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800/80 transition-colors flex items-center justify-center cursor-pointer"
                >
                  <Info className="w-4 h-4 text-slate-400 hover:text-cyan-400" />
                </button>
              </h4>
            </div>

            <div className="flex items-center gap-2">
              {activeAnalysis.recommendedAdaptations.length > 0 && (
                <button
                  type="button"
                  onClick={handleApplyAdaptations}
                  disabled={appliedSuccess}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    appliedSuccess
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-md'
                      : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/50'
                  }`}
                  aria-label="Apply readiness adjustments to workout"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{appliedSuccess ? 'Adjustments Applied ✓' : 'Apply to Today\'s Workout'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Biomechanical Findings */}
          <div className="space-y-2">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>Biomechanical & Clinical Findings</span>
            </h5>
            <div className="space-y-1.5">
              {activeAnalysis.biomechanicalFindings.map((finding, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-200 leading-relaxed flex items-start gap-2"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                  <span>{finding}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recommended Adaptations */}
          {activeAnalysis.recommendedAdaptations.length > 0 ? (
            <div className="space-y-2 pt-2">
              <h5 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                <span>Recommended Workout Adjustments ({activeAnalysis.recommendedAdaptations.length})</span>
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {activeAnalysis.recommendedAdaptations.map((adapt) => (
                  <div
                    key={adapt.id}
                    className="p-3 rounded-xl bg-slate-950 border border-amber-500/30 flex flex-col justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-mono text-amber-300 font-semibold mb-1">
                        <span>{adapt.exerciseName}</span>
                        <span className="uppercase text-[9px] bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30">
                          {adapt.action.replaceAll('_', ' ')}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-white mb-1">
                        {adapt.proposedLabel}
                      </div>
                      <p className="text-[11px] text-slate-400 leading-normal">
                        {adapt.rationale}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Navigation button to workout routine */}
              {onNavigateToWorkout && (
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={onNavigateToWorkout}
                    className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer"
                  >
                    <span>View Adjusted Exercises in Routine</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-xs text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>No exercise modifications required. Your body is ready for standard GZCL progression today!</span>
            </div>
          )}
        </div>
      )}

      {/* Historical Check-Ins Accordion */}
      {history.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl sm:rounded-2xl overflow-hidden">
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            aria-expanded={showHistory}
            className="w-full p-4 flex items-center justify-between text-left text-xs sm:text-sm font-bold text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span>Past Check-Ins & Recovery Log ({history.length} Entries)</span>
            </div>
            {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showHistory && (
            <div className="p-4 pt-0 space-y-2 border-t border-slate-800/80">
              {[...history]
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedDate(item.date)}
                  className="p-3 rounded-xl bg-slate-950/60 hover:bg-slate-950 border border-slate-800 hover:border-slate-700 flex items-center justify-between gap-3 text-xs cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-slate-400">{item.date}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
                        tierMeta[item.statusTier].bg
                      } ${tierMeta[item.statusTier].text} ${tierMeta[item.statusTier].border}`}
                    >
                      {item.readinessScore}% · {item.statusTier}
                    </span>
                    {item.kneePainScore > 0 && (
                      <span className="text-[10px] text-amber-400 font-mono">
                        Knee: {item.kneePainScore}/10
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-400 truncate max-w-xs sm:max-w-md">
                    {item.journalNotes || 'No notes logged'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Interactive Rating Scale Definitions Modal */}
      {isRatingModalOpen && (
        <Suspense fallback={null}>
          <RatingDefinitionsModal
            isOpen={isRatingModalOpen}
            onClose={() => setIsRatingModalOpen(false)}
            initialTab={initialRatingTab}
          />
        </Suspense>
      )}
    </div>
  );
};
