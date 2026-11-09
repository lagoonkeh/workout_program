// src/components/CnsReadinessWidget.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Brain, Hand, Zap, RotateCcw, Trash2, ChevronRight, Info, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import {
  CNS_CHECKS_EVENT,
  MIN_BASELINE_CHECKS,
  REACTION_TRIALS,
  TAP_TEST_SECONDS,
  TIER_LABEL,
  deleteCnsCheck,
  evaluateCns,
  loadCnsChecks,
  median,
  saveCnsCheck,
  type CnsCheck,
  type CnsEvaluation,
  type CnsTier,
  type Flag,
} from '../domain/cnsReadiness';
import { healthForDate, loadCachedHealth } from '../domain/healthMetrics';
import { localDateKey } from '../domain/trainingReadiness';

export interface CnsReadinessWidgetProps {
  className?: string;
  now?: Date;
  onNavigateToWorkout?: () => void;
}

type Step = 'intro' | 'tap' | 'reaction' | 'self' | 'result';

const TIER_STYLE: Record<CnsTier, { ring: string; text: string; bg: string; Icon: typeof CheckCircle2 }> = {
  ready: { ring: 'border-emerald-500/50', text: 'text-emerald-300', bg: 'bg-emerald-500/10', Icon: CheckCircle2 },
  moderate: { ring: 'border-amber-500/50', text: 'text-amber-300', bg: 'bg-amber-500/10', Icon: AlertTriangle },
  low: { ring: 'border-rose-500/50', text: 'text-rose-300', bg: 'bg-rose-500/10', Icon: XCircle },
};

const FLAG_STYLE: Record<Flag, string> = {
  good: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30',
  ok: 'text-slate-300 bg-slate-800 border-slate-700',
  watch: 'text-amber-300 bg-amber-500/10 border-amber-500/30',
  poor: 'text-rose-300 bg-rose-500/10 border-rose-500/30',
};
const FLAG_LABEL: Record<Flag, string> = { good: 'Above usual', ok: 'Normal', watch: 'Below usual', poor: 'Well below' };

/* ---------------- Tap test ---------------- */

const TapTest: React.FC<{ onDone: (taps: number | null) => void }> = ({ onDone }) => {
  const [taps, setTaps] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(TAP_TEST_SECONDS);
  const [finished, setFinished] = useState(false);
  const tapsRef = useRef(0);

  useEffect(() => {
    if (startedAt === null || finished) return;
    const id = setInterval(() => {
      const left = TAP_TEST_SECONDS - (performance.now() - startedAt) / 1000;
      if (left <= 0) {
        setRemaining(0);
        setFinished(true);
        clearInterval(id);
      } else setRemaining(left);
    }, 50);
    return () => clearInterval(id);
  }, [startedAt, finished]);

  const onTap = (e: React.PointerEvent) => {
    e.preventDefault();
    if (finished) return;
    if (startedAt === null) setStartedAt(performance.now());
    tapsRef.current += 1;
    setTaps(tapsRef.current);
  };

  const reset = () => {
    tapsRef.current = 0;
    setTaps(0);
    setStartedAt(null);
    setRemaining(TAP_TEST_SECONDS);
    setFinished(false);
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-slate-300">
        Use the <b>same finger and hand every time</b> (index finger, dominant hand). Tap as fast as you can for {TAP_TEST_SECONDS} seconds —
        the timer starts on your first tap.
      </p>
      <button
        type="button"
        data-testid="cns-tap-pad"
        onPointerDown={onTap}
        disabled={finished}
        style={{ touchAction: 'manipulation' }}
        className={`select-none h-56 sm:h-64 rounded-2xl border-2 flex flex-col items-center justify-center transition-colors ${
          finished ? 'bg-slate-800 border-slate-700' : startedAt ? 'bg-cyan-500/20 border-cyan-400 active:bg-cyan-500/30' : 'bg-slate-800 border-cyan-500/50'
        }`}
        aria-label="Tap pad"
      >
        <span className="text-6xl font-black tabular-nums text-white">{taps}</span>
        <span className="text-sm text-slate-300 mt-2 tabular-nums">
          {finished ? 'Done' : startedAt ? `${remaining.toFixed(1)} s` : 'Tap to start'}
        </span>
      </button>
      <div className="flex gap-2">
        <button type="button" onClick={reset} className="min-h-[44px] px-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-sm flex items-center gap-1.5">
          <RotateCcw className="w-4 h-4" /> Redo
        </button>
        <button type="button" onClick={() => onDone(null)} className="min-h-[44px] px-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 text-sm">
          Skip
        </button>
        <button
          type="button"
          data-testid="cns-tap-next"
          disabled={!finished}
          onClick={() => onDone(tapsRef.current)}
          className="ml-auto min-h-[44px] px-4 rounded-xl bg-emerald-600 disabled:opacity-40 text-white text-sm font-semibold flex items-center gap-1"
        >
          Next <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

/* ---------------- Reaction test ---------------- */

type RtState = 'idle' | 'waiting' | 'go' | 'early';

const ReactionTest: React.FC<{ onDone: (ms: number | null) => void }> = ({ onDone }) => {
  const [state, setState] = useState<RtState>('idle');
  const [times, setTimes] = useState<number[]>([]);
  const goAt = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const arm = useCallback(() => {
    setState('waiting');
    const delay = 1500 + Math.random() * 2500;
    timer.current = setTimeout(() => {
      goAt.current = performance.now();
      setState('go');
    }, delay);
  }, []);

  const onPress = (e: React.PointerEvent) => {
    e.preventDefault();
    if (times.length >= REACTION_TRIALS) return;
    if (state === 'idle' || state === 'early') return arm();
    if (state === 'waiting') {
      if (timer.current) clearTimeout(timer.current);
      setState('early');
      return;
    }
    if (state === 'go') {
      const ms = Math.round(performance.now() - goAt.current);
      if (ms < 100) {
        // faster than humanly possible: an anticipation, not a reaction
        setState('early');
        return;
      }
      const next = [...times, ms];
      setTimes(next);
      setState('idle');
    }
  };

  const done = times.length >= REACTION_TRIALS;
  const color = done ? 'bg-slate-800 border-slate-700' : state === 'go' ? 'bg-emerald-500 border-emerald-300' : state === 'waiting' ? 'bg-rose-600/80 border-rose-400' : state === 'early' ? 'bg-amber-600/70 border-amber-400' : 'bg-slate-800 border-cyan-500/50';
  const msg = done
    ? `Median ${median(times)} ms`
    : state === 'go' ? 'TAP!' : state === 'waiting' ? 'Wait for green…' : state === 'early' ? 'Too early — tap to retry' : `Tap to start trial ${times.length + 1} of ${REACTION_TRIALS}`;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-slate-300">
        When the pad turns <span className="text-emerald-300 font-semibold">green</span>, tap as fast as you can. {REACTION_TRIALS} trials; early taps don’t count.
      </p>
      <button
        type="button"
        data-testid="cns-reaction-pad"
        onPointerDown={onPress}
        disabled={done}
        style={{ touchAction: 'manipulation' }}
        className={`select-none h-56 sm:h-64 rounded-2xl border-2 flex flex-col items-center justify-center transition-colors duration-75 ${color}`}
        aria-label="Reaction pad"
      >
        <span className="text-2xl font-black text-white text-center px-4">{msg}</span>
        {times.length > 0 && <span className="text-xs text-slate-200 mt-3 tabular-nums">{times.map((t) => `${t}`).join(' · ')} ms</span>}
      </button>
      <div className="flex gap-2">
        <button type="button" onClick={() => { if (timer.current) clearTimeout(timer.current); setTimes([]); setState('idle'); }} className="min-h-[44px] px-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-sm flex items-center gap-1.5">
          <RotateCcw className="w-4 h-4" /> Redo
        </button>
        <button type="button" onClick={() => onDone(null)} className="min-h-[44px] px-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 text-sm">
          Skip
        </button>
        <button
          type="button"
          data-testid="cns-reaction-next"
          disabled={!done}
          onClick={() => onDone(median(times))}
          className="ml-auto min-h-[44px] px-4 rounded-xl bg-emerald-600 disabled:opacity-40 text-white text-sm font-semibold flex items-center gap-1"
        >
          Next <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

/* ---------------- Self ratings ---------------- */

const Rating: React.FC<{ label: string; low: string; high: string; value: number; onChange: (v: number) => void; testId: string }> = ({ label, low, high, value, onChange, testId }) => (
  <div className="flex flex-col gap-1.5">
    <div className="text-sm font-semibold text-white">{label}</div>
    <div className="grid grid-cols-5 gap-1.5" role="radiogroup" aria-label={label}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          data-testid={`${testId}-${n}`}
          onClick={() => onChange(n)}
          className={`min-h-[44px] rounded-xl border text-sm font-bold ${value === n ? 'bg-cyan-500 text-slate-950 border-cyan-300' : 'bg-slate-800 text-slate-300 border-slate-700'}`}
        >
          {n}
        </button>
      ))}
    </div>
    <div className="flex justify-between text-[11px] text-slate-500"><span>{low}</span><span>{high}</span></div>
  </div>
);

/* ---------------- Widget ---------------- */

export const CnsReadinessWidget: React.FC<CnsReadinessWidgetProps> = ({ className = '', now, onNavigateToWorkout }) => {
  const today = localDateKey(now ?? new Date());
  const [checks, setChecks] = useState<CnsCheck[]>(() => loadCnsChecks());
  const todays = checks.find((c) => c.date === today) || null;
  const [step, setStep] = useState<Step>(() => (todays ? 'result' : 'intro'));
  const [taps, setTaps] = useState<number | null>(todays?.taps ?? null);
  const [reactionMs, setReactionMs] = useState<number | null>(todays?.reactionMs ?? null);
  const [drive, setDrive] = useState(todays?.drive ?? 3);
  const [focus, setFocus] = useState(todays?.focus ?? 3);
  const [stress, setStress] = useState(todays?.stress ?? 3);
  const [showHow, setShowHow] = useState(false);
  const healthDays = useMemo(() => loadCachedHealth(), []);

  useEffect(() => {
    const refresh = () => setChecks(loadCnsChecks());
    window.addEventListener(CNS_CHECKS_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(CNS_CHECKS_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const evaluation: CnsEvaluation | null = useMemo(() => {
    if (step !== 'result') return null;
    return evaluateCns({ taps, reactionMs, drive, focus, stress }, checks, healthDays, today);
  }, [step, taps, reactionMs, drive, focus, stress, checks, healthDays, today]);

  const finish = () => {
    const ev = evaluateCns({ taps, reactionMs, drive, focus, stress }, checks, healthDays, today);
    const h = healthForDate(healthDays, today);
    const check: CnsCheck = {
      id: `cns_${today}`,
      date: today,
      timestamp: Date.now(),
      taps,
      reactionMs,
      drive,
      focus,
      stress,
      hrvMs: h?.hrvMs ?? null,
      restingHr: h?.restingHr ?? null,
      score: ev.score,
      tier: ev.tier,
    };
    setChecks(saveCnsCheck(check));
    setStep('result');
  };

  const retest = () => {
    setTaps(null);
    setReactionMs(null);
    setStep('tap');
  };

  const priorCount = checks.filter((c) => c.date < today).length;
  const recent = [...checks].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 14);
  const chart = [...recent].reverse();

  return (
    <article data-testid="cns-readiness-widget" className={`rounded-2xl bg-slate-900 border border-slate-800 p-3.5 sm:p-5 shadow-xl flex flex-col gap-4 text-white ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold">CNS Readiness</h3>
            <p className="text-xs text-slate-400">1-minute nervous-system check before you train, compared to your own baseline.</p>
          </div>
        </div>
        <button type="button" onClick={() => setShowHow((v) => !v)} aria-expanded={showHow} aria-label="How this works" className="min-h-[44px] min-w-[44px] rounded-xl bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center">
          <Info className="w-4 h-4" />
        </button>
      </div>

      {showHow && (
        <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-3 text-xs text-slate-300 space-y-1.5">
          <p><b>What it measures:</b> finger-tap speed and simple reaction time (quick reads of how sharp your motor output is today), plus HRV and resting HR from Health Connect when they’ve synced, and three self-ratings.</p>
          <p><b>How it judges:</b> each test is compared with your last {MIN_BASELINE_CHECKS}–10 checks. A result only counts as down when it drops more than your normal day-to-day spread, so one slightly slow run won’t flag you.</p>
          <p><b>For good data:</b> test at the same point every time (before your warm-up), same hand, same posture, phone on a table.</p>
          <p className="text-slate-500">These are trend signals, not a medical test — tap and reaction scores are noisy and only loosely track lifting performance, so pair them with how your warm-up sets move.</p>
        </div>
      )}

      {step === 'intro' && (
        <div className="flex flex-col gap-3">
          <ol className="text-sm text-slate-300 space-y-2">
            <li className="flex items-center gap-2"><Hand className="w-4 h-4 text-cyan-400" /> {TAP_TEST_SECONDS}-second tap test</li>
            <li className="flex items-center gap-2"><Zap className="w-4 h-4 text-cyan-400" /> Reaction test ({REACTION_TRIALS} taps)</li>
            <li className="flex items-center gap-2"><Brain className="w-4 h-4 text-cyan-400" /> 3 quick ratings</li>
          </ol>
          {priorCount < MIN_BASELINE_CHECKS && (
            <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5">
              Building your baseline: {priorCount} of {MIN_BASELINE_CHECKS} checks. Until then tap and reaction results are recorded but not scored.
            </p>
          )}
          <button type="button" data-testid="cns-start" onClick={() => setStep('tap')} className="min-h-[48px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold">
            Start check
          </button>
        </div>
      )}

      {step === 'tap' && <TapTest onDone={(t) => { setTaps(t); setStep('reaction'); }} />}
      {step === 'reaction' && <ReactionTest onDone={(ms) => { setReactionMs(ms); setStep('self'); }} />}

      {step === 'self' && (
        <div className="flex flex-col gap-4">
          <Rating label="Drive to train" low="None" high="Fired up" value={drive} onChange={setDrive} testId="cns-drive" />
          <Rating label="Mental focus" low="Foggy" high="Sharp" value={focus} onChange={setFocus} testId="cns-focus" />
          <Rating label="Stress (life / work)" low="Calm" high="Very high" value={stress} onChange={setStress} testId="cns-stress" />
          <button type="button" data-testid="cns-finish" onClick={finish} className="min-h-[48px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold">
            See my readiness
          </button>
        </div>
      )}

      {step === 'result' && evaluation && (() => {
        const s = TIER_STYLE[evaluation.tier];
        return (
          <div className="flex flex-col gap-3" data-testid="cns-result">
            <div className={`rounded-2xl border ${s.ring} ${s.bg} p-4 flex items-center gap-4`}>
              <div className="relative w-20 h-20 shrink-0">
                <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" className="text-slate-800" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" className={s.text} strokeWidth="3" strokeLinecap="round" strokeDasharray={`${(evaluation.score / 100) * 97.4} 97.4`} />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xl font-black tabular-nums" data-testid="cns-score">{evaluation.score}</span>
              </div>
              <div className="min-w-0">
                <div className={`flex items-center gap-1.5 font-bold ${s.text}`}><s.Icon className="w-4 h-4" /> <span data-testid="cns-tier">{TIER_LABEL[evaluation.tier]}</span></div>
                <div className="text-sm font-semibold text-white mt-0.5">{evaluation.headline}</div>
              </div>
            </div>

            <ul className="space-y-1.5 text-sm text-slate-200">
              {evaluation.advice.map((a) => (
                <li key={a} className="flex gap-2"><span className={s.text}>•</span><span>{a}</span></li>
              ))}
            </ul>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {evaluation.metrics.map((m) => (
                <div key={m.key} className="rounded-xl bg-slate-950/50 border border-slate-800 p-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs text-slate-400">{m.label}</div>
                    <div className="text-sm font-bold tabular-nums">{m.value}</div>
                    {m.comparison && <div className="text-[11px] text-slate-500 tabular-nums">{m.comparison}</div>}
                  </div>
                  {(m.comparison || ['drive', 'focus', 'stress'].includes(m.key)) && (
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${FLAG_STYLE[m.flag]}`}>{FLAG_LABEL[m.flag]}</span>
                  )}
                </div>
              ))}
            </div>
            {evaluation.baselineChecks < MIN_BASELINE_CHECKS && (
              <p className="text-xs text-amber-300">Baseline: {evaluation.baselineChecks} of {MIN_BASELINE_CHECKS} earlier checks — tap and reaction aren’t scored yet.</p>
            )}

            <div className="flex gap-2">
              <button type="button" data-testid="cns-retest" onClick={retest} className="min-h-[44px] px-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-sm flex items-center gap-1.5">
                <RotateCcw className="w-4 h-4" /> Re-test
              </button>
              {onNavigateToWorkout && (
                <button type="button" onClick={onNavigateToWorkout} className="ml-auto min-h-[44px] px-4 rounded-xl bg-emerald-600 text-white text-sm font-semibold flex items-center gap-1">
                  Go to workout <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {recent.length > 0 && (
        <div className="border-t border-slate-800 pt-3 flex flex-col gap-2">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Last {recent.length} checks</div>
          {chart.length >= 2 && (
            <svg viewBox={`0 0 ${chart.length * 20} 50`} className="w-full h-14" preserveAspectRatio="none" aria-label="Readiness score trend">
              {chart.map((c, i) => {
                const h = Math.max(2, (c.score / 100) * 46);
                const fill = c.tier === 'ready' ? '#34d399' : c.tier === 'moderate' ? '#fbbf24' : '#fb7185';
                return <rect key={c.date} x={i * 20 + 3} y={50 - h} width={14} height={h} rx={2} fill={fill} opacity={0.85} />;
              })}
            </svg>
          )}
          <ul className="divide-y divide-slate-800">
            {recent.slice(0, 7).map((c) => (
              <li key={c.date} className="py-1.5 flex items-center gap-2 text-xs">
                <span className="text-slate-400 w-20 tabular-nums">{c.date.slice(5)}</span>
                <span className={`font-semibold w-16 ${TIER_STYLE[c.tier].text}`}>{TIER_LABEL[c.tier]} {c.score}</span>
                <span className="text-slate-500 tabular-nums flex-1 truncate">
                  {c.taps !== null ? `${c.taps} taps` : '—'} · {c.reactionMs !== null ? `${c.reactionMs} ms` : '—'}
                </span>
                <button type="button" aria-label={`Delete check from ${c.date}`} onClick={() => { setChecks(deleteCnsCheck(c.date)); if (c.date === today) setStep('intro'); }} className="min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-500 hover:text-rose-400">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
};
