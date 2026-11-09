// src/components/GuideWidget.tsx
// Guide tab: a step-by-step cue sheet for each workout (what to do, what to feel, what to avoid) and a
// searchable glossary of the program's terms.
import React, { Suspense, useMemo, useState } from 'react';
import { BookOpen, ListChecks, Search, ChevronDown, ChevronUp, AlertTriangle, LifeBuoy, Quote, Clock, Repeat, ExternalLink, Info, PlayCircle } from 'lucide-react';
import type { WorkoutExercise, WarmupExercise, WorkoutSession } from '../domain/programData';
import { getEffectiveExerciseTempo } from '../domain/programData';
import { EXERCISE_VISUALS } from '../domain/exerciseVisualsData';
import { useCueCardLookup } from '../domain/cueCardStore';
import type { CueCard } from '../domain/cueCardTypes';
import { GLOSSARY_CATEGORIES, GLOSSARY_DEMOS, explainTempo, searchExerciseDemos, searchGlossary, type GlossaryCategory } from '../domain/glossary';
import { LazyExerciseDiagram } from './LazyExerciseDiagram';
import { RatingDefinitionsModal } from '../lazyView';

export interface GuideWidgetProps {
  sessions: WorkoutSession[];
  initialSessionId?: string;
  /** opens the full cue card (with demo diagram) for an exercise id */
  onOpenCueCard?: (exerciseId: string) => void;
}

type GuideItem = {
  key: string;
  id: string;
  name: string;
  kind: 'warmup' | 'lift' | 'core';
  tier: string;
  prescription: string;
  rest?: string;
  tempo?: string;
  tempoText?: string | null;
  cues: string[];
  faults: string[];
  ifItHurts?: string;
  quote?: { creator: string; text: string };
  note?: string;
  /** id the app's cue card lookup resolves (null when there is no stored card) */
  cardId: string | null;
};

const TIER_TERM: Record<string, string> = { T1: 'T1 (Tier 1)', T2: 'T2 (Tier 2)', T3: 'T3 (Tier 3)', Warmup: 'Warmup' };
const TIER_STYLE: Record<string, string> = {
  T1: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
  T2: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
  T3: 'bg-sky-500/15 text-sky-300 border-sky-500/40',
  Warmup: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
};

const stripPhase = (s: string) => s.replace(/^Phase\s*\d+\s*[—–-]\s*[^:]{0,60}:\s*/i, '').trim();
const firstSentence = (s: string) => {
  const m = /^(.{20,180}?[.!?])(\s|$)/.exec(s);
  return m ? m[1] : s.length > 180 ? `${s.slice(0, 177)}…` : s;
};
const fmtRest = (sec: number) => (sec >= 60 ? `${Math.round((sec / 60) * 10) / 10} min rest` : `${sec} s rest`);
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function findCard(lookup: ReadonlyMap<string, CueCard>, id: string, baseId: string | undefined, name: string): CueCard | undefined {
  return lookup.get(id) || (baseId ? lookup.get(baseId) : undefined) || lookup.get(id.replace(/__side_(left|right)$/, '')) || lookup.get(name.toLowerCase());
}

function toItem(ex: WorkoutExercise | WarmupExercise, kind: GuideItem['kind'], lookup: ReadonlyMap<string, CueCard>): GuideItem {
  const lift = 'tier' in ex ? (ex as WorkoutExercise) : null;
  const baseId = lift?.baseExerciseId;
  const visual = EXERCISE_VISUALS[ex.id] || (baseId ? EXERCISE_VISUALS[baseId] : undefined);
  const card = findCard(lookup, ex.id, baseId, ex.name);
  const rawTempo = lift ? getEffectiveExerciseTempo(lift.tempo, lift.targetReps) : (ex as WarmupExercise).tempo || card?.tempo;
  const cues = (visual?.keyCues?.length ? visual.keyCues : (card?.setupInstructions || []).map(stripPhase).map(firstSentence)).slice(0, 5);
  const regression = lift?.regression;
  const quote = card?.creatorCues?.[0];
  return {
    key: `${kind}-${ex.id}`,
    id: ex.id,
    name: ex.name.replace(/\s*\((Left|Right) (Leg|Arm|Side)\)$/, ''),
    kind,
    tier: lift ? lift.tier : 'Warmup',
    prescription: lift ? `${lift.targetSets} × ${lift.targetReps}${lift.isAmrapLastSet ? ' (last set AMRAP)' : ''}` : (ex as WarmupExercise).targetDurationOrReps,
    rest: lift ? fmtRest(lift.restSeconds) : undefined,
    tempo: rawTempo,
    tempoText: explainTempo(rawTempo),
    cues,
    faults: (card?.commonFaults || []).slice(0, 3),
    ifItHurts: regression
      ? `${regression.condition}: switch to ${regression.name}.`
      : card?.rehabRegressions?.[0],
    quote: quote ? { creator: quote.creator, text: firstSentence(quote.quote) } : undefined,
    note: lift ? undefined : (ex as WarmupExercise).coachingNotes,
    cardId: card ? card.exerciseId : null,
  };
}

const GuideCard: React.FC<{ item: GuideItem; index: number; open: boolean; onToggle: () => void; onTerm: (t: string) => void; onOpenCueCard?: (id: string) => void }> = ({
  item,
  index,
  open,
  onToggle,
  onTerm,
  onOpenCueCard,
}) => (
  <li data-testid={`guide-exercise-${item.id}`} className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="w-full text-left px-3 py-2.5 flex items-start gap-2.5 cursor-pointer hover:bg-slate-800/40"
    >
      <span className="mt-0.5 w-6 h-6 shrink-0 rounded-full bg-slate-800 text-slate-300 text-xs font-bold flex items-center justify-center">{index}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold text-white leading-snug">{item.name}</span>
        <span className="block text-xs text-slate-400 mt-0.5">
          {item.prescription}
          {item.rest ? ` · ${item.rest}` : ''}
        </span>
      </span>
      <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded border ${TIER_STYLE[item.tier] || TIER_STYLE.T3}`}>{item.tier}</span>
      {open ? <ChevronUp className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" /> : <ChevronDown className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />}
    </button>

    {open && (
      <div className="px-3 pb-3 space-y-2.5 text-[13px] leading-relaxed text-slate-200">
        {item.tempo && (
          <div className="flex items-start gap-2 text-xs">
            <Clock className="w-3.5 h-3.5 text-cyan-400 mt-0.5 shrink-0" />
            <span>
              <button type="button" onClick={() => onTerm('Tempo')} className="font-mono font-bold text-cyan-300 underline decoration-dotted underline-offset-2 cursor-pointer">
                {item.tempo}
              </button>
              {item.tempoText ? <span className="text-slate-300">: {item.tempoText}</span> : null}
            </span>
          </div>
        )}

        {item.cues.length > 0 && (
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-emerald-400 mb-1 flex items-center gap-1">
              <ListChecks className="w-3.5 h-3.5" /> Cues
            </div>
            <ol className="list-decimal pl-5 space-y-0.5">
              {item.cues.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ol>
          </div>
        )}

        {item.note && <p className="text-xs text-slate-300 italic">{item.note}</p>}

        {item.faults.length > 0 && (
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-amber-400 mb-1 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Avoid
            </div>
            <ul className="list-disc pl-5 space-y-0.5 text-slate-300">
              {item.faults.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </div>
        )}

        {item.ifItHurts && (
          <div className="flex items-start gap-2 text-xs text-slate-300">
            <LifeBuoy className="w-3.5 h-3.5 text-rose-300 mt-0.5 shrink-0" />
            <span>
              <span className="font-semibold text-rose-200">If it hurts or you can't do it: </span>
              {item.ifItHurts}
            </span>
          </div>
        )}

        {item.quote && (
          <blockquote className="flex items-start gap-2 text-xs text-slate-400 border-l-2 border-slate-700 pl-2">
            <Quote className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              "{item.quote.text}" <span className="text-slate-500">({item.quote.creator})</span>
            </span>
          </blockquote>
        )}

        <div className="flex flex-wrap gap-2 pt-0.5">
          {item.tier !== 'Warmup' && (
            <button type="button" onClick={() => onTerm(TIER_TERM[item.tier] || item.tier)} className="text-[11px] px-2 py-1 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 cursor-pointer">
              What is {item.tier}?
            </button>
          )}
          {onOpenCueCard && item.cardId && (
            <button
              type="button"
              data-testid={`guide-open-card-${item.id}`}
              onClick={() => onOpenCueCard(item.cardId as string)}
              className="text-[11px] px-2 py-1 rounded-lg border border-emerald-600/50 bg-emerald-600/15 text-emerald-200 hover:bg-emerald-600/25 cursor-pointer flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" /> Full cue card &amp; demo
            </button>
          )}
        </div>
      </div>
    )}
  </li>
);

const DEMOS = 'Exercise demos' as const;

function DemoToggle({ testId, open, onToggle, label, wide = false }: { testId: string; open: boolean; onToggle: () => void; label: string; wide?: boolean }) {
  return (
    <button
      type="button"
      data-testid={testId}
      aria-expanded={open}
      onClick={onToggle}
      className={`${wide ? 'w-full justify-between text-left text-[13px] text-white' : 'text-[11px] text-sky-200'} min-h-[34px] inline-flex items-center gap-1.5 px-2.5 rounded-lg border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 font-semibold cursor-pointer`}
    >
      <span className="inline-flex items-center gap-1.5 min-w-0">
        <PlayCircle className="w-3.5 h-3.5 text-sky-300 shrink-0" />
        <span className={wide ? 'truncate' : ''}>{label}</span>
      </span>
      {open ? <ChevronUp className="w-3.5 h-3.5 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 shrink-0" />}
    </button>
  );
}

export const GuideWidget: React.FC<GuideWidgetProps> = ({ sessions, initialSessionId, onOpenCueCard }) => {
  const lookup = useCueCardLookup();
  const [tab, setTab] = useState<'cues' | 'glossary'>('cues');
  const [sessionId, setSessionId] = useState<string>(() =>
    sessions.some((s) => s.id === initialSessionId) ? (initialSessionId as string) : sessions[0]?.id
  );
  const [openKeys, setOpenKeys] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<GlossaryCategory | 'All' | typeof DEMOS>('All');
  /** which demo is open inline: 'term:<term>' or 'demo:<exercise name>' */
  const [openDemo, setOpenDemo] = useState<string | null>(null);
  const toggleDemo = (k: string) => setOpenDemo((cur) => (cur === k ? null : k));
  const [ratingsOpen, setRatingsOpen] = useState(false);

  const session = sessions.find((s) => s.id === sessionId) || sessions[0];

  const groups = useMemo(() => {
    if (!session) return [];
    const seen = new Set<string>();
    const uniq = <T extends { id: string; baseExerciseId?: string }>(list: T[]) =>
      list.filter((e) => {
        const k = e.baseExerciseId || e.id.replace(/__side_(left|right)$/, '');
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    const warm = (session.warmupSequence?.length ? session.warmupSequence : session.warmup) || [];
    return [
      { title: 'Warmup', items: uniq(warm).map((e) => toItem(e, 'warmup', lookup)) },
      { title: 'Main work', items: uniq(session.exercises || []).map((e) => toItem(e, 'lift', lookup)) },
      { title: 'Core finisher', items: uniq(session.dailyCoreFinisher || []).map((e) => toItem(e, 'core', lookup)) },
    ].filter((g) => g.items.length);
  }, [session, lookup]);

  const allKeys = groups.flatMap((g) => g.items.map((i) => i.key));
  const allOpen = allKeys.length > 0 && allKeys.every((k) => openKeys.has(k));
  const toggle = (k: string) =>
    setOpenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  const jumpToTerm = (term: string) => {
    setTab('glossary');
    setCategory('All');
    setQuery(term);
  };

  const results = useMemo(() => (category === DEMOS ? [] : searchGlossary(query, category)), [query, category]);
  // every exercise's movement demo: the whole list on its own chip, matches under the terms when searching
  const demos = useMemo(
    () => (category === DEMOS || (category === 'All' && query.trim()) ? searchExerciseDemos(query) : []),
    [query, category]
  );

  return (
    <section data-testid="guide-view" className="space-y-3 sm:space-y-4">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3 sm:p-4">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="w-5 h-5 text-emerald-400" />
          <h2 className="text-lg font-bold text-white">Guide</h2>
        </div>
        <div role="tablist" aria-label="Guide sections" className="grid grid-cols-2 gap-1 bg-slate-950 border border-slate-800 rounded-xl p-1">
          {(
            [
              ['cues', 'Workout cues'],
              ['glossary', 'Glossary'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              data-testid={`guide-tab-${id}`}
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`min-h-[40px] rounded-lg text-sm font-semibold cursor-pointer transition-colors ${
                tab === id ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'cues' && session && (
        <div className="space-y-3">
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1" role="tablist" aria-label="Workout">
            {sessions.map((s) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                data-testid={`guide-session-${s.id}`}
                aria-selected={s.id === session.id}
                onClick={() => {
                  setSessionId(s.id);
                  setOpenKeys(new Set());
                }}
                className={`shrink-0 px-3 min-h-[38px] rounded-full text-xs font-semibold border cursor-pointer whitespace-nowrap ${
                  s.id === session.id ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200' : 'border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                {s.title}
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-base font-bold text-white">{session.title}</h3>
                <p className="text-xs text-slate-400">{session.subtitle}</p>
              </div>
              <span className="shrink-0 text-[11px] text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />~{session.estimatedDurationMinutes} min
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-2">{session.focus}</p>
            <button
              type="button"
              data-testid="guide-expand-all"
              onClick={() => setOpenKeys(allOpen ? new Set() : new Set(allKeys))}
              className="mt-2 text-[11px] px-2 py-1 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 cursor-pointer flex items-center gap-1"
            >
              <Repeat className="w-3 h-3" /> {allOpen ? 'Collapse all' : 'Expand all'}
            </button>
          </div>

          {groups.map((g) => {
            const offset = groups.slice(0, groups.indexOf(g)).reduce((n, x) => n + x.items.length, 0);
            return (
              <div key={g.title} className="space-y-1.5">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">{g.title}</h4>
                <ol className="space-y-1.5">
                  {g.items.map((item, i) => (
                    <GuideCard
                      key={item.key}
                      item={item}
                      index={offset + i + 1}
                      open={openKeys.has(item.key)}
                      onToggle={() => toggle(item.key)}
                      onTerm={jumpToTerm}
                      onOpenCueCard={onOpenCueCard}
                    />
                  ))}
                </ol>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'glossary' && (
        <div className="space-y-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3 space-y-2">
            <label className="relative block">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                data-testid="glossary-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search terms, e.g. RPE, tempo, deload"
                aria-label="Search the glossary"
                className="w-full min-h-[42px] pl-9 pr-3 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </label>
            <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1">
              {(['All', ...GLOSSARY_CATEGORIES, DEMOS] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={category === c}
                  onClick={() => setCategory(c)}
                  className={`shrink-0 px-2.5 min-h-[34px] rounded-full text-[11px] font-semibold border cursor-pointer whitespace-nowrap ${
                    category === c ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200' : 'border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setRatingsOpen(true)}
              className="text-[11px] px-2 py-1 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 cursor-pointer flex items-center gap-1"
            >
              <Info className="w-3 h-3" /> Rating scales (knee pain, RPE, sleep…)
            </button>
          </div>

          <p className="text-[11px] text-slate-500 px-1" data-testid="glossary-count">
            {category === DEMOS
              ? `${demos.length} exercise ${demos.length === 1 ? 'demo' : 'demos'}`
              : `${results.length} ${results.length === 1 ? 'term' : 'terms'}${demos.length ? ` · ${demos.length} exercise ${demos.length === 1 ? 'demo' : 'demos'}` : ''}`}
          </p>
          <dl className="space-y-1.5">
            {results.map((g) => (
              <div key={g.term} data-testid={`glossary-entry-${slug(g.term)}`} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                <dt className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="text-sm font-bold text-white">{g.term}</span>
                  {g.aka?.length ? <span className="text-[11px] text-slate-500">also: {g.aka.join(', ')}</span> : null}
                  <span className="ml-auto text-[10px] text-slate-500">{g.category}</span>
                </dt>
                <dd className="text-[13px] text-slate-300 leading-relaxed mt-1">{g.definition}</dd>
                {g.inApp && (
                  <dd className="text-xs text-emerald-200/90 mt-1.5 leading-relaxed">
                    <span className="font-semibold text-emerald-300">In this app: </span>
                    {g.inApp}
                  </dd>
                )}
                {GLOSSARY_DEMOS[g.term] && (
                  <dd className="mt-2">
                    <DemoToggle
                      testId={`glossary-watch-${slug(g.term)}`}
                      open={openDemo === `term:${g.term}`}
                      onToggle={() => toggleDemo(`term:${g.term}`)}
                      label="Watch the demo"
                    />
                    {openDemo === `term:${g.term}` && (
                      <div className="mt-2" data-testid={`glossary-demo-player-${slug(g.term)}`}>
                        <LazyExerciseDiagram diagramType={GLOSSARY_DEMOS[g.term]} exerciseName={g.term} />
                      </div>
                    )}
                  </dd>
                )}
              </div>
            ))}
          </dl>
          {demos.length > 0 && (
            <div data-testid="glossary-demos" className="space-y-1.5">
              {category !== DEMOS && <h3 className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 px-1 pt-1">Exercise demos</h3>}
              <ul className="space-y-1.5">
                {demos.map((d) => (
                  <li key={d.name} className="rounded-xl border border-slate-800 bg-slate-900/60 p-2.5">
                    <DemoToggle
                      testId={`glossary-demo-${slug(d.name)}`}
                      open={openDemo === `demo:${d.name}`}
                      onToggle={() => toggleDemo(`demo:${d.name}`)}
                      label={d.name}
                      wide
                    />
                    {openDemo === `demo:${d.name}` && (
                      <div className="mt-2">
                        <LazyExerciseDiagram diagramType={d.type} exerciseName={d.name} />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {results.length === 0 && demos.length === 0 && <p className="text-sm text-slate-400 px-1">No match. Try a shorter word.</p>}
        </div>
      )}

      <Suspense fallback={null}>
        {ratingsOpen && <RatingDefinitionsModal isOpen={ratingsOpen} onClose={() => setRatingsOpen(false)} />}
      </Suspense>
    </section>
  );
};

export default GuideWidget;
