// src/components/StrengthHeatmapWidget.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Dumbbell, Info, TrendingDown } from 'lucide-react';
import {
  ATHLETE_GROUPS,
  DATA_GAPS,
  LIFTS,
  NO_DATA_COLOR,
  PERCENT_BANDS,
  SOURCES,
  TIER_COLORS,
  buildStrengthProfile,
  colorForScore,
  computeLiftResults,
  cooperBenchPercentile,
  ordinal,
  tierFromScore,
  type CompareMode,
  type LiftId,
  type MuscleId,
  type StrengthTier,
} from '../domain/strengthStandards';
import {
  DEFAULT_BASELINE_ASSESSMENT,
  QUARTERLY_ASSESSMENTS_EVENT,
  loadQuarterlyAssessments,
  type QuarterlyAssessmentRecord,
} from '../domain/fitnessAssessment';
import type { CompletedWorkoutSession } from '../storage/storageManager';
import {
  ATHLETE_PROFILE_EVENT,
  bodyweightOn,
  bodyweightTimeline,
  currentBodyweight,
  loadProfile,
  profileAge,
} from '../domain/athleteProfile';

export interface StrengthHeatmapWidgetProps {
  history?: CompletedWorkoutSession[];
  /** Override for tests; otherwise read from saved quarterly assessments */
  assessment?: QuarterlyAssessmentRecord | null;
  now?: Date;
  className?: string;
}

function latestAssessment(): QuarterlyAssessmentRecord {
  const list = loadQuarterlyAssessments();
  if (!list.length) return DEFAULT_BASELINE_ASSESSMENT;
  return [...list].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))[0];
}

// Body outline + muscle shapes (same geometry as the recovery heatmap so the two read alike)
const SILHOUETTE = (
  <g opacity="0.3" fill="#1e293b" stroke="#334155" strokeWidth="1.5">
    <ellipse cx="100" cy="35" rx="20" ry="24" />
    <rect x="92" y="58" width="16" height="15" rx="3" />
    <path d="M72,72 Q100,74 128,72 L124,175 Q100,180 76,175 Z" />
    <path d="M76,175 L68,360 L88,360 L96,200 L104,200 L112,360 L132,360 L124,175 Z" />
    <path d="M68,76 L44,180 L56,182 L76,105 Z" />
    <path d="M132,76 L156,180 L144,182 L124,105 Z" />
  </g>
);

const FRONT_SHAPES: { id: MuscleId; d: string[] }[] = [
  { id: 'chest', d: ['M74,78 Q96,76 98,92 L98,118 Q74,122 70,98 Z', 'M126,78 Q104,76 102,92 L102,118 Q126,122 130,98 Z'] },
  { id: 'shoulders', d: ['M58,74 Q74,72 74,86 L70,105 Q52,98 56,78 Z', 'M142,74 Q126,72 126,86 L130,105 Q148,98 144,78 Z'] },
  { id: 'biceps', d: ['M52,106 Q64,106 64,136 Q50,138 48,114 Z', 'M148,106 Q136,106 136,136 Q150,138 152,114 Z'] },
  { id: 'core', d: ['M84,122 L116,122 L114,170 Q100,174 86,170 Z'] },
  { id: 'quads', d: ['M74,180 Q98,180 96,260 Q72,258 70,215 Z', 'M126,180 Q102,180 104,260 Q128,258 130,215 Z'] },
  { id: 'calves', d: ['M74,272 Q92,272 90,345 L76,345 Z', 'M126,272 Q108,272 110,345 L124,345 Z'] },
];

const BACK_SHAPES: { id: MuscleId; d: string[] }[] = [
  { id: 'traps', d: ['M84,65 L116,65 L128,86 L100,108 L72,86 Z'] },
  { id: 'lats', d: ['M72,90 Q92,102 96,146 L76,144 Q68,115 72,90 Z', 'M128,90 Q108,102 104,146 L124,144 Q132,115 128,90 Z'] },
  { id: 'triceps', d: ['M54,98 Q66,98 64,136 Q48,136 48,106 Z', 'M146,98 Q134,98 136,136 Q152,136 152,106 Z'] },
  { id: 'lower_back', d: ['M86,146 L114,146 L116,176 L84,176 Z'] },
  { id: 'glutes', d: ['M72,176 Q100,176 98,215 Q72,215 70,185 Z', 'M128,176 Q100,176 102,215 Q128,215 130,185 Z'] },
  { id: 'hamstrings', d: ['M72,218 Q96,218 94,270 Q74,270 70,230 Z', 'M128,218 Q104,218 106,270 Q126,270 130,230 Z'] },
  { id: 'calves', d: ['M72,274 Q94,274 90,345 L74,345 Z', 'M128,274 Q106,274 110,345 L126,345 Z'] },
];

const TIER_BADGE: Record<StrengthTier, string> = {
  Beginner: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
  Novice: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
  Intermediate: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40',
  Advanced: 'bg-blue-500/15 text-blue-300 border-blue-500/40',
  Elite: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
};

const TIER_RANGE: Record<StrengthTier, string> = {
  Beginner: '<20th',
  Novice: '20–49th',
  Intermediate: '50–79th',
  Advanced: '80–94th',
  Elite: '95th+',
};

const liftName = (id: LiftId) => LIFTS.find((l) => l.id === id)?.name ?? id;

function formatValue(lift: LiftId, value: number): string {
  return lift === 'pullups' ? `${value} reps` : `${value.toFixed(2)}× BW`;
}

export const StrengthHeatmapWidget: React.FC<StrengthHeatmapWidgetProps> = ({
  history = [],
  assessment: assessmentProp,
  now,
  className = '',
}) => {
  const [mode, setMode] = useState<CompareMode>('general');
  const [selected, setSelected] = useState<MuscleId>('chest');
  const [stored, setStored] = useState<QuarterlyAssessmentRecord>(() => latestAssessment());
  const [athlete, setAthlete] = useState(() => loadProfile());
  const [allAssessments, setAllAssessments] = useState(() => loadQuarterlyAssessments());

  useEffect(() => {
    const refresh = () =>
      setTimeout(() => {
        setAthlete(loadProfile());
        setAllAssessments(loadQuarterlyAssessments());
      }, 0);
    // catch anything saved by sibling widgets while this one was mounting
    refresh();
    window.addEventListener(ATHLETE_PROFILE_EVENT, refresh);
    window.addEventListener(QUARTERLY_ASSESSMENTS_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(ATHLETE_PROFILE_EVENT, refresh);
      window.removeEventListener(QUARTERLY_ASSESSMENTS_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  useEffect(() => {
    if (assessmentProp !== undefined) return;
    // Deferred: the assessment widget can save while it is rendering
    const refresh = () => setTimeout(() => setStored(latestAssessment()), 0);
    window.addEventListener(QUARTERLY_ASSESSMENTS_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(QUARTERLY_ASSESSMENTS_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [assessmentProp]);

  const assessment = assessmentProp !== undefined ? assessmentProp : stored;

  const inputs = useMemo(() => {
    const records = assessment
      ? [assessment, ...allAssessments.filter((a) => a.id !== assessment.id)]
      : allAssessments;
    const timeline = bodyweightTimeline(athlete, records);
    return computeLiftResults(assessment, history, now, {
      bodyweightAt: timeline.length ? (d) => bodyweightOn(timeline, d) : undefined,
      currentBodyweightLbs: timeline.length ? currentBodyweight(timeline) : undefined,
      age: profileAge(athlete, now),
      sex: athlete.sex,
    });
  }, [assessment, allAssessments, athlete, history, now]);
  const profile = useMemo(() => buildStrengthProfile(inputs, mode), [inputs, mode]);
  const muscle = profile.muscles[selected];
  const isGeneral = mode === 'general';

  const scoreLabel = (score: number | null) =>
    score === null ? 'No data' : isGeneral ? `${ordinal(score)} percentile` : `${score}% of avg`;

  const renderBody = (shapes: typeof FRONT_SHAPES, label: string, testId: string) => (
    <div className="flex flex-col items-center">
      <span className="text-[11px] font-mono font-bold uppercase text-slate-400 mb-1">{label}</span>
      <svg data-testid={testId} viewBox="0 0 200 400" className="w-32 sm:w-40 h-auto select-none" aria-label={`${label} strength map`}>
        {SILHOUETTE}
        {shapes.map((shape) => {
          const m = profile.muscles[shape.id];
          const isSel = selected === shape.id;
          return (
            <g
              key={shape.id}
              data-testid={`strength-muscle-${shape.id}-${testId.endsWith('front') ? 'front' : 'back'}`}
              role="button"
              tabIndex={0}
              aria-label={`${m.name}: ${scoreLabel(m.score)}`}
              onClick={() => setSelected(shape.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') setSelected(shape.id);
              }}
              className="cursor-pointer outline-none"
            >
              <title>{`${m.name}: ${scoreLabel(m.score)}`}</title>
              {shape.d.map((d, i) => (
                <path
                  key={i}
                  d={d}
                  fill={colorForScore(m.score, mode)}
                  stroke={isSel ? '#ffffff' : '#0f172a'}
                  strokeWidth={isSel ? 2.5 : 1}
                  opacity={isSel ? 1 : m.score === null ? 0.55 : 0.88}
                />
              ))}
            </g>
          );
        })}
      </svg>
    </div>
  );

  const group = profile.group;
  const usedSources = new Set<string>();
  if (isGeneral) {
    usedSources.add('strengthlevel');
    usedSources.add('cooper');
  } else if (group) {
    Object.values(group.lifts).forEach((r) => r && usedSources.add(r.source));
    if (group.id === 'soccer') usedSources.add('wisloff2004');
  }
  if (LIFTS.some((l) => profile.lifts[l.id].result?.origin === 'estimated')) usedSources.add('epley');

  return (
    <div
      data-testid="strength-heatmap-widget"
      className={`rounded-2xl bg-slate-900 border border-slate-800 p-3.5 sm:p-5 shadow-xl flex flex-col gap-4 ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-800 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Dumbbell className="w-4 h-4" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white">Strength Development Heatmap</h3>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Each muscle is rated from the lifts that train it, using your best 1RM relative to bodyweight (
            {Math.round(profile.bodyweightLbs)} lb). Compare against general standards or published athlete data.
          </p>
        </div>
        <div className="shrink-0 rounded-xl bg-slate-950/80 border border-slate-800 px-3 py-2 text-right">
          <span className="text-[10px] font-mono uppercase text-slate-400 block">
            {isGeneral ? 'Overall percentile' : `vs ${group?.shortLabel ?? ''}`}
          </span>
          <span data-testid="strength-overall" className="text-xl font-bold text-white font-mono">
            {profile.overall === null ? '—' : isGeneral ? ordinal(profile.overall) : `${profile.overall}%`}
          </span>
          {isGeneral && profile.overall !== null && (
            <span className="text-[11px] font-semibold block" style={{ color: TIER_COLORS[tierFromScore(profile.overall)] }}>
              {tierFromScore(profile.overall)}
            </span>
          )}
        </div>
      </div>

      {/* Compare selector */}
      <div>
        <span className="text-[11px] font-mono font-bold uppercase text-slate-400 block mb-1.5">Compare against</span>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Comparison group">
          {[{ id: 'general', shortLabel: 'General standards' }, ...ATHLETE_GROUPS].map((g) => (
            <button
              key={g.id}
              type="button"
              role="radio"
              aria-checked={mode === g.id}
              data-testid={`strength-compare-${g.id}`}
              onClick={() => setMode(g.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                mode === g.id
                  ? 'bg-blue-500/20 text-blue-200 border-blue-500/50'
                  : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              {g.shortLabel}
            </button>
          ))}
        </div>
        {group && (
          <p data-testid="strength-group-caption" className="text-[11px] text-slate-400 mt-1.5">
            {group.label} — {group.population}.{group.caveat ? ` ${group.caveat}` : ''}
            {inputs.sex === 'female' && ' These studies measured male athletes, so treat the comparison as rough.'}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Body maps + legend */}
        <div className="lg:col-span-7 rounded-xl bg-slate-950/60 border border-slate-800 p-3 sm:p-4 flex flex-col items-center gap-3">
          <div className="flex items-start justify-center gap-4 sm:gap-8 w-full">
            {renderBody(FRONT_SHAPES, 'Front', 'strength-svg-front')}
            {renderBody(BACK_SHAPES, 'Back', 'strength-svg-back')}
          </div>
          <div data-testid="strength-legend" className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] font-mono text-slate-400">
            {isGeneral
              ? (Object.keys(TIER_COLORS) as StrengthTier[]).map((t) => (
                  <span key={t} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ background: TIER_COLORS[t] }} />
                    {t} <span className="text-slate-500">{TIER_RANGE[t]}</span>
                  </span>
                ))
              : PERCENT_BANDS.map((b) => (
                  <span key={b.label} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ background: b.color }} />
                    {b.label}
                  </span>
                ))}
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: NO_DATA_COLOR }} />
              No data
            </span>
          </div>
        </div>

        {/* Inspector */}
        <div data-testid="strength-inspector" className="lg:col-span-5 rounded-xl bg-slate-950/80 border border-slate-800 p-4 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-3">
            <h4 className="text-base sm:text-lg font-bold text-white">{muscle.name}</h4>
            <span
              data-testid="strength-inspector-score"
              className={`inline-flex items-center px-2.5 py-1 rounded-lg border text-xs font-bold font-mono ${
                muscle.score === null
                  ? 'bg-slate-800 text-slate-400 border-slate-700'
                  : isGeneral && muscle.tier
                  ? TIER_BADGE[muscle.tier]
                  : 'bg-slate-800 text-white border-slate-600'
              }`}
            >
              {muscle.score === null ? 'No data' : isGeneral ? `${muscle.tier} · ${ordinal(muscle.score)} %ile` : `${muscle.score}% of avg`}
            </span>
          </div>

          {muscle.contributors.length > 0 ? (
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-mono font-bold uppercase text-slate-400">Rated from</span>
              {muscle.contributors.map((c) => {
                const ls = profile.lifts[c.lift];
                return (
                  <div key={c.lift} className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs">
                    <div className="flex justify-between gap-2">
                      <span className="text-white font-semibold">
                        {liftName(c.lift)} <span className="text-slate-500 font-normal">· {Math.round(c.weight * 100)}% weight</span>
                      </span>
                      <span className="font-mono text-white">{isGeneral ? `${ordinal(Math.round(c.score))} %ile` : `${c.score}%`}</span>
                    </div>
                    {ls.result && (
                      <span className="text-slate-400 block mt-0.5 font-mono">
                        You: {formatValue(c.lift, ls.result.value)}
                        {ls.reference ? ` · Group avg: ${formatValue(c.lift, ls.reference.value)}` : ''}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : null}

          {muscle.missingLifts.length > 0 && (
            <p className="text-xs text-slate-400 flex items-start gap-2">
              <Info className="w-4 h-4 text-slate-500 shrink-0" />
              <span>
                {isGeneral
                  ? `Log or test ${muscle.missingLifts.map(liftName).join(', ')} to rate this muscle fully.`
                  : `No published ${group?.shortLabel.toLowerCase()} data for ${muscle.missingLifts.map(liftName).join(', ')}.`}
              </span>
            </p>
          )}
          {muscle.contributors.length === 0 && muscle.missingLifts.length === 0 && (
            <p className="text-xs text-slate-400 flex items-start gap-2">
              <Info className="w-4 h-4 text-slate-500 shrink-0" />
              <span>None of the five tracked lifts load this muscle enough to rate it.</span>
            </p>
          )}

          {profile.laggards.length > 0 && (
            <div data-testid="strength-laggards" className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex items-start gap-2">
              <TrendingDown className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                <strong className="block text-amber-100">Lagging vs your average</strong>
                {profile.laggards.map((id) => profile.muscles[id].name).join(', ')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Lift table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table data-testid="strength-lift-table" className="w-full text-xs">
          <thead className="bg-slate-950/80 text-slate-400 font-mono uppercase text-[10px]">
            <tr>
              <th className="text-left px-3 py-2">Lift</th>
              <th className="text-left px-3 py-2">You</th>
              <th className="text-left px-3 py-2">{isGeneral ? 'Percentile (lifters)' : `${group?.shortLabel} avg`}</th>
              <th className="text-left px-3 py-2 hidden sm:table-cell">Basis</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {LIFTS.map(({ id }) => {
              const ls = profile.lifts[id];
              const r = ls.result;
              const benchPct =
                isGeneral && id === 'bench' && r && profile.age ? cooperBenchPercentile(r.value, profile.age, inputs.sex) : null;
              return (
                <tr key={id} data-testid={`strength-lift-row-${id}`} className="text-slate-300">
                  <td className="px-3 py-2 font-semibold text-white whitespace-nowrap">{liftName(id)}</td>
                  <td className="px-3 py-2 font-mono whitespace-nowrap">
                    {r ? (
                      <>
                        {formatValue(id, r.value)}
                        {id !== 'pullups' && <span className="text-slate-500"> · {Math.round(r.best)} lb</span>}
                      </>
                    ) : (
                      <span className="text-slate-500">Not logged</span>
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono">
                    {isGeneral ? (
                      ls.score === null ? (
                        '—'
                      ) : (
                        <span style={{ color: colorForScore(ls.score, mode) }}>
                          {tierFromScore(ls.score)} · {ordinal(Math.round(ls.score))}
                          {benchPct !== null && (
                            <span className="text-slate-400 block text-[10px]">~{ordinal(benchPct)} vs all {inputs.sex === 'female' ? 'women' : 'men'} {profile.age} (Cooper)</span>
                          )}
                        </span>
                      )
                    ) : ls.reference ? (
                      <span>
                        {formatValue(id, ls.reference.value)}
                        {ls.reference.depth === 'half' && (
                          <span className="ml-1 px-1 rounded bg-amber-500/15 text-amber-300 text-[10px]">half squat</span>
                        )}
                        {ls.score !== null && (
                          <span className="block text-[10px]" style={{ color: colorForScore(ls.score, mode) }}>
                            you = {ls.score}%
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-slate-500">No published data</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-slate-500 hidden sm:table-cell">
                    {r?.originDetail ?? '—'}
                    {!isGeneral && ls.reference && <span className="block">{ls.reference.detail}</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Sources */}
      <details data-testid="strength-sources" className="rounded-xl bg-slate-950/60 border border-slate-800 p-3 text-xs text-slate-400">
        <summary className="cursor-pointer font-semibold text-slate-300 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-blue-400" /> How this is scored &amp; sources
        </summary>
        <div className="mt-2 space-y-2">
          <p>
            Lift values are your best 1RM ÷ bodyweight: the latest quarterly test, or a higher Epley estimate from any
            logged set of ≤10 reps in the last 180 days (RDLs are not counted as deadlifts). General mode estimates your
            percentile among lifters of your sex from Strength Level&apos;s bodyweight tables (set in your profile), which put Beginner at the 5th,
            Novice 20th, Intermediate 50th, Advanced 80th and Elite 95th percentile; values in between are interpolated.
            These are people who log their lifts, a stronger crowd than the general population — for bench, the Cooper
            Institute line shows where you sit among all men or women your age. Athlete mode shows you as a % of each group&apos;s
            published mean. Muscle percentiles average the lifts that load them (e.g. shoulders = 65% press, 35% bench).
          </p>
          {DATA_GAPS.map((g) => (
            <p key={g.label}>
              <strong className="text-slate-300">{g.label} not included:</strong> {g.reason}
            </p>
          ))}
          <ul className="list-disc pl-4 space-y-1">
            {Object.values(SOURCES)
              .filter((s) => usedSources.has(s.id))
              .map((s) => (
                <li key={s.id}>
                  <a href={s.url} target="_blank" rel="noreferrer" className="text-blue-300 hover:underline">
                    {s.citation}
                  </a>
                </li>
              ))}
          </ul>
        </div>
      </details>
    </div>
  );
};
