// src/components/PostureAssessmentWidget.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Activity, CheckCircle2, ChevronDown, ChevronUp, ExternalLink, RotateCcw, Trash2, XCircle } from 'lucide-react';
import {
  POSTURE_ASSESSMENT_EVENT,
  POSTURE_PLAN_DAYS,
  POSTURE_TESTS,
  POSTURE_VIDEO_URL,
  baselineFor,
  compareRecords,
  dayType,
  deleteRecord,
  endPlan,
  failedSides,
  failedTests,
  getTest,
  isRecordComplete,
  loadPostureState,
  passCount,
  planDayNumber,
  retestFor,
  routineForDay,
  saveAssessment,
  sidesFor,
  toggleDayComplete,
  type PostureResult,
  type PostureSide,
  type PostureState,
  type PostureTestResults,
} from '../domain/postureAssessment';

export interface PostureAssessmentWidgetProps {
  className?: string;
  /** For tests */
  now?: Date;
}

const SIDE_LABEL: Record<PostureSide, string> = { left: 'Left', right: 'Right', both: 'Result' };

const DAY_LABEL: Record<ReturnType<typeof dayType>, string> = {
  test: 'Test day',
  stretch: 'Stretch day',
  strength: 'Strengthening day',
  retest: 'Retest day',
};

function ResultToggle({ value, onChange, label }: { value?: PostureResult; onChange: (v: PostureResult) => void; label: string }) {
  const base = 'min-h-[40px] px-3 rounded-lg border text-xs font-semibold flex items-center gap-1';
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[11px] text-slate-400 w-12">{label}</span>
      <button
        type="button"
        aria-pressed={value === 'pass'}
        aria-label={`${label} pass`}
        onClick={() => onChange('pass')}
        className={`${base} ${value === 'pass' ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200' : 'bg-slate-800 border-slate-700 text-slate-300'}`}
      >
        <CheckCircle2 className="w-3.5 h-3.5" /> Pass
      </button>
      <button
        type="button"
        aria-pressed={value === 'fail'}
        aria-label={`${label} fail`}
        onClick={() => onChange('fail')}
        className={`${base} ${value === 'fail' ? 'bg-rose-500/20 border-rose-400 text-rose-200' : 'bg-slate-800 border-slate-700 text-slate-300'}`}
      >
        <XCircle className="w-3.5 h-3.5" /> Fail
      </button>
    </div>
  );
}

function TestRunner({ kind, onSave, onCancel }: { kind: 'baseline' | 'retest'; onSave: (r: PostureTestResults) => void; onCancel?: () => void }) {
  const [results, setResults] = useState<PostureTestResults>({});
  const [open, setOpen] = useState<string | null>(POSTURE_TESTS[0].id);
  const complete = isRecordComplete(results);

  const setResult = (id: string, side: PostureSide, v: PostureResult) =>
    setResults((prev) => ({ ...prev, [id]: { ...(prev[id as keyof PostureTestResults] || {}), [side]: v } }));

  return (
    <div className="flex flex-col gap-2" data-testid="posture-test-runner">
      <p className="text-sm text-slate-300">
        {kind === 'baseline' ? 'Day 1: ' : 'Day 22: '}run all six tests. Don’t force any position; test the way you actually move.
      </p>
      {POSTURE_TESTS.map((t, i) => {
        const done = sidesFor(t).every((s) => results[t.id]?.[s]);
        const isOpen = open === t.id;
        return (
          <div key={t.id} className="rounded-xl bg-slate-950/70 border border-slate-800">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : t.id)}
              className="w-full min-h-[44px] px-3 py-2 flex items-center justify-between text-left"
            >
              <span className="text-sm text-white font-semibold">
                {i + 1}. {t.area} <span className="text-slate-400 font-normal">· {t.name}</span>
              </span>
              <span className="flex items-center gap-2">
                {done && (failedSides(t, results).length ? <XCircle className="w-4 h-4 text-rose-400" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />)}
                {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </span>
            </button>
            {isOpen && (
              <div className="px-3 pb-3 flex flex-col gap-2">
                <ol className="list-decimal ml-5 text-xs text-slate-300 space-y-1">
                  {t.howTo.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ol>
                <p className="text-xs text-emerald-300"><b>Pass:</b> {t.pass}</p>
                <p className="text-xs text-slate-400"><b>If you fail:</b> {t.failMeans}</p>
                <div className="flex flex-wrap gap-3">
                  {sidesFor(t).map((side) => (
                    <ResultToggle
                      key={side}
                      label={SIDE_LABEL[side]}
                      value={results[t.id]?.[side]}
                      onChange={(v) => {
                        setResult(t.id, side, v);
                        const next = { ...results, [t.id]: { ...(results[t.id] || {}), [side]: v } };
                        if (sidesFor(t).every((s) => next[t.id]?.[s]) && i < POSTURE_TESTS.length - 1) setOpen(POSTURE_TESTS[i + 1].id);
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
      <div className="flex gap-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className="min-h-[44px] px-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-sm">
            Cancel
          </button>
        )}
        <button
          type="button"
          disabled={!complete}
          onClick={() => onSave(results)}
          data-testid="posture-save"
          className="flex-1 min-h-[44px] px-3 rounded-xl bg-blue-600 disabled:bg-slate-800 disabled:text-slate-500 text-white text-sm font-semibold"
        >
          {complete ? (kind === 'baseline' ? 'Save & start 22-day plan' : 'Save retest') : 'Mark every test pass or fail'}
        </button>
      </div>
    </div>
  );
}

export const PostureAssessmentWidget: React.FC<PostureAssessmentWidgetProps> = ({ className = '', now }) => {
  const [state, setState] = useState<PostureState>(() => loadPostureState());
  const [testing, setTesting] = useState<'baseline' | 'retest' | null>(null);
  const today = now ?? new Date();

  useEffect(() => {
    const onUpdate = () => setState(loadPostureState());
    window.addEventListener(POSTURE_ASSESSMENT_EVENT, onUpdate);
    return () => window.removeEventListener(POSTURE_ASSESSMENT_EVENT, onUpdate);
  }, []);

  const baseline = baselineFor(state);
  const retest = retestFor(state);
  const rawDay = state.plan ? planDayNumber(state.plan.startDate, today) : 0;
  const day = Math.min(Math.max(rawDay, 1), POSTURE_PLAN_DAYS);
  const type = dayType(day);
  const routine = useMemo(() => (baseline ? routineForDay(baseline.results, day) : []), [baseline, day]);
  const failed = baseline ? failedTests(baseline.results) : [];
  const completed = state.plan?.completedDays ?? [];

  const save = (results: PostureTestResults) => {
    if (!testing) return;
    setState(saveAssessment(state, results, testing, today));
    setTesting(null);
  };

  return (
    <div data-testid="posture-assessment-widget" className={`rounded-2xl bg-slate-900 border border-slate-800 p-3.5 sm:p-5 shadow-xl flex flex-col gap-3 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-400">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Posture assessment</h3>
            <p className="text-xs text-slate-400">6 pass/fail tests · 22-day fix plan (ATHLEAN-X)</p>
          </div>
        </div>
        <a href={POSTURE_VIDEO_URL} target="_blank" rel="noreferrer" className="min-h-[36px] text-xs text-blue-300 flex items-center gap-1 hover:underline">
          Video <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {testing ? (
        <TestRunner kind={testing} onSave={save} onCancel={() => setTesting(null)} />
      ) : !state.plan || !baseline ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-slate-300">
            Test thoracic spine, hamstrings, calves, abs, hip flexors and hip rotation. Only the areas you fail get stretches and
            strengthening work, alternating days for 3 weeks, then you retest on day 22.
          </p>
          <button
            type="button"
            onClick={() => setTesting('baseline')}
            data-testid="posture-start"
            className="min-h-[44px] px-3 rounded-xl bg-blue-600 text-white text-sm font-semibold"
          >
            Start posture test (Day 1)
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span data-testid="posture-day" className="rounded-lg bg-slate-950/80 border border-slate-800 px-2.5 py-1 text-white font-bold">
              Day {day} / {POSTURE_PLAN_DAYS}
            </span>
            <span className="rounded-lg bg-slate-950/80 border border-slate-800 px-2.5 py-1 text-slate-300">{DAY_LABEL[type]}</span>
            <span className="rounded-lg bg-slate-950/80 border border-slate-800 px-2.5 py-1 text-slate-300">
              Baseline: {passCount(baseline.results)}/6 passed
            </span>
          </div>

          {/* 22-day strip */}
          <div className="grid grid-cols-11 gap-1" aria-label="22-day plan">
            {Array.from({ length: POSTURE_PLAN_DAYS }, (_, i) => i + 1).map((d) => {
              const t = dayType(d);
              const isDone = completed.includes(d);
              const isToday = d === day;
              const color = t === 'test' || t === 'retest' ? 'border-violet-500/60' : t === 'stretch' ? 'border-cyan-500/50' : 'border-amber-500/50';
              return (
                <div
                  key={d}
                  title={`Day ${d}: ${DAY_LABEL[t]}`}
                  className={`h-8 rounded-md border text-[10px] flex items-center justify-center tabular-nums ${color} ${
                    isDone ? 'bg-emerald-500/25 text-emerald-200' : 'bg-slate-950/70 text-slate-400'
                  } ${isToday ? 'ring-2 ring-white/70' : ''}`}
                >
                  {d}
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-slate-500">
            <span className="text-cyan-300">Even days</span> stretch · <span className="text-amber-300">odd days</span> strengthen ·{' '}
            <span className="text-violet-300">day 1 & 22</span> test
          </p>

          {failed.length === 0 ? (
            <p className="text-sm text-emerald-300">You passed all six tests. Nothing to correct; retest anytime to check you’re holding it.</p>
          ) : type === 'stretch' || type === 'strength' ? (
            <div className="flex flex-col gap-2" data-testid="posture-routine">
              <h4 className="text-sm font-semibold text-white">Today’s {type === 'stretch' ? 'stretches' : 'strengthening'}</h4>
              {routine.length === 0 && <p className="text-xs text-slate-400">Nothing scheduled today. Rest.</p>}
              {routine.map((item) => (
                <div key={item.testId} className="rounded-xl bg-slate-950/70 border border-slate-800 p-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm text-white font-semibold">{item.prescription.name}</span>
                    <span className="text-xs font-mono text-cyan-300 whitespace-nowrap">{item.prescription.dose}</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    For: {item.area}
                    {item.sides.length > 0 && item.sides.length < 2 ? ` · ${item.sides[0]} side only` : ''}
                  </p>
                  <ul className="list-disc ml-5 mt-1 text-xs text-slate-300 space-y-0.5">
                    {item.prescription.cues.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                  {item.prescription.alternative && <p className="text-[11px] text-slate-400 mt-1">{item.prescription.alternative}</p>}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setState(toggleDayComplete(state, day))}
                data-testid="posture-mark-done"
                className={`min-h-[44px] px-3 rounded-xl text-sm font-semibold border ${
                  completed.includes(day) ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200' : 'bg-slate-800 border-slate-700 text-white'
                }`}
              >
                {completed.includes(day) ? `Day ${day} done ✓` : `Mark day ${day} done`}
              </button>
            </div>
          ) : null}

          {(type === 'retest' || retest) && !retest && (
            <button type="button" onClick={() => setTesting('retest')} data-testid="posture-retest" className="min-h-[44px] px-3 rounded-xl bg-violet-600 text-white text-sm font-semibold">
              Run day 22 retest
            </button>
          )}

          {retest && (
            <div className="flex flex-col gap-1.5" data-testid="posture-comparison">
              <h4 className="text-sm font-semibold text-white">
                Retest: {passCount(baseline.results)}/6 → {passCount(retest.results)}/6 passed
              </h4>
              {compareRecords(baseline.results, retest.results).map((c) => (
                <div key={c.testId} className="flex items-center justify-between text-xs rounded-lg bg-slate-950/60 border border-slate-800 px-2.5 py-1.5">
                  <span className="text-slate-300">{getTest(c.testId).area}</span>
                  <span
                    className={
                      c.change === 'fixed' ? 'text-emerald-300' : c.change === 'still-failing' || c.change === 'regressed' ? 'text-rose-300' : 'text-slate-400'
                    }
                  >
                    {c.change === 'fixed' ? 'Fixed' : c.change === 'still-failing' ? 'Still failing — keep going' : c.change === 'regressed' ? 'Now failing' : 'Passing'}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            {type !== 'retest' && !retest && (
              <button type="button" onClick={() => setTesting('retest')} className="min-h-[40px] px-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs">
                Retest early
              </button>
            )}
            <button
              type="button"
              onClick={() => setTesting('baseline')}
              className="min-h-[40px] px-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" /> New 22-day plan
            </button>
            <button type="button" onClick={() => setState(endPlan(state))} className="min-h-[40px] px-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 text-xs">
              End plan
            </button>
          </div>
        </div>
      )}

      {state.records.length > 0 && !testing && (
        <details className="text-xs text-slate-400">
          <summary className="cursor-pointer min-h-[32px] flex items-center">History ({state.records.length})</summary>
          <ul className="mt-1 space-y-1">
            {[...state.records].reverse().map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-950/60 border border-slate-800 px-2.5 py-1.5">
                <span>
                  {r.date} · {r.kind === 'retest' ? 'Retest' : 'Baseline'} · {passCount(r.results)}/6 passed
                </span>
                <button
                  type="button"
                  aria-label={`Delete ${r.kind} from ${r.date}`}
                  onClick={() => setState(deleteRecord(state, r.id))}
                  className="min-h-[32px] min-w-[32px] flex items-center justify-center text-slate-500 hover:text-rose-300"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
};
