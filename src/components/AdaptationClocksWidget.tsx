// src/components/AdaptationClocksWidget.tsx
import React, { useState } from 'react';
import {
  Clock,
  Layers,
  Flame,
  Activity,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import {
  FIVE_CLOCKS_OF_ADAPTATION,
  FIVE_RUNG_GATE_LADDERS,
  NIPPARD_LLP_STUDY_SYNTHESIS,
  LUCAS_HARDIE_RANGE_OF_STRENGTH_SYNTHESIS,
  AdaptationClock,
} from '../domain/adaptationClocks';

export interface AdaptationClocksWidgetProps {
  className?: string;
  defaultExpanded?: boolean;
}

type StudyTab = 'clocks' | 'ladders' | 'llp' | 'feats';

const STORAGE_KEY_STUDIES_COLLAPSED = 'workout_studies_widget_collapsed_v1';
const STORAGE_KEY_CURRENT_RUNGS = 'workout_calisthenics_current_rungs_v1';

export const AdaptationClocksWidget: React.FC<AdaptationClocksWidgetProps> = ({
  className = '',
  defaultExpanded = true,
}) => {
  const [activeTab, setActiveTab] = useState<StudyTab>('clocks');
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_STUDIES_COLLAPSED);
      if (stored !== null) return stored === 'true';
    } catch {
      // safe fallback
    }
    return !defaultExpanded;
  });

  const [activeLadderId, setActiveLadderId] = useState<'push' | 'pull' | 'squat'>('push');
  const [currentRungs, setCurrentRungs] = useState<Record<string, number>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_CURRENT_RUNGS);
      if (stored) return JSON.parse(stored);
    } catch {
      // fallback
    }
    return { push: 1, pull: 1, squat: 1 };
  });

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY_STUDIES_COLLAPSED, String(next));
      } catch {
        // safe fallback
      }
      return next;
    });
  };

  const handleSetCurrentRung = (ladderId: string, rungNumber: number) => {
    setCurrentRungs((prev) => {
      const updated = { ...prev, [ladderId]: rungNumber };
      try {
        localStorage.setItem(STORAGE_KEY_CURRENT_RUNGS, JSON.stringify(updated));
      } catch {
        // safe fallback
      }
      return updated;
    });
  };

  const activeLadder = FIVE_RUNG_GATE_LADDERS.find((l) => l.id === activeLadderId) || FIVE_RUNG_GATE_LADDERS[0];

  const getSpeedBadge = (speed: AdaptationClock['speed']) => {
    switch (speed) {
      case 'Fastest':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'Fast':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'Split':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      case 'Slow':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'Slowest':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
    }
  };

  return (
    <article
      data-testid="adaptation-clocks-widget"
      className={`rounded-2xl bg-slate-900 border border-slate-800 p-3.5 sm:p-5 shadow-xl flex flex-col gap-4 text-white ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>Exercise Science &amp; Creator Studies</span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-950/80 border border-purple-500/40 text-purple-300">
                2024–2026 Evidence
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Biological timelines, tendon remodeling gates, lengthened partials (LLPs), and loaded feats of range.
            </p>
          </div>
        </div>

        <button
          type="button"
          data-testid="toggle-studies-collapse-btn"
          onClick={handleToggleCollapse}
          aria-expanded={!isCollapsed}
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80 text-xs font-semibold cursor-pointer self-start sm:self-auto min-h-[44px]"
        >
          <span>{isCollapsed ? 'Expand Studies' : 'Collapse'}</span>
          {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      {!isCollapsed && (
        <>
          {/* Navigation Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-800 pb-2" role="tablist">
            <button
              type="button"
              role="tab"
              data-testid="tab-clocks"
              aria-selected={activeTab === 'clocks'}
              onClick={() => setActiveTab('clocks')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[44px] ${
                activeTab === 'clocks'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50 shadow-sm'
                  : 'bg-slate-950/60 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>5 Clocks of Adaptation</span>
            </button>

            <button
              type="button"
              role="tab"
              data-testid="tab-ladders"
              aria-selected={activeTab === 'ladders'}
              onClick={() => setActiveTab('ladders')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[44px] ${
                activeTab === 'ladders'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50 shadow-sm'
                  : 'bg-slate-950/60 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>5-Rung Gate Ladders</span>
            </button>

            <button
              type="button"
              role="tab"
              data-testid="tab-llp"
              aria-selected={activeTab === 'llp'}
              onClick={() => setActiveTab('llp')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[44px] ${
                activeTab === 'llp'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50 shadow-sm'
                  : 'bg-slate-950/60 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              <Flame className="w-4 h-4 text-purple-400" />
              <span>Lengthened Partials (LLPs)</span>
            </button>

            <button
              type="button"
              role="tab"
              data-testid="tab-feats"
              aria-selected={activeTab === 'feats'}
              onClick={() => setActiveTab('feats')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[44px] ${
                activeTab === 'feats'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50 shadow-sm'
                  : 'bg-slate-950/60 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Feats of Range</span>
            </button>
          </div>

          {/* TAB 1: 5 Clocks of Adaptation (Yellow Dude) */}
          {activeTab === 'clocks' && (
            <div data-testid="clocks-content" className="space-y-3.5">
              <div className="p-3 sm:p-3.5 rounded-xl bg-purple-950/30 border border-purple-500/30 text-xs text-purple-200">
                <span className="font-bold text-purple-300 block mb-1">
                  Yellow Dude Principle: &quot;Your fastest clock writes the check your slowest one has to cover.&quot;
                </span>
                <p className="leading-relaxed">
                  Trainees routinely fail or injure themselves around weeks 2–4 because the body operates 5 distinct physiological clocks. Muscular and neural strength adapt in days, but tendons require months of collagen turnover to catch up.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {FIVE_CLOCKS_OF_ADAPTATION.map((clock) => (
                  <div
                    key={clock.id}
                    className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between gap-2.5"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs font-bold text-white line-clamp-1">{clock.name}</span>
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border shrink-0 ${getSpeedBadge(
                            clock.speed
                          )}`}
                        >
                          {clock.speed}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-purple-400 block mb-2 font-semibold">
                        ⏱️ {clock.timelineLabel}
                      </span>
                      <p className="text-xs text-slate-300 leading-relaxed mb-2">
                        {clock.biologicalMechanism}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                      <div className="flex items-start gap-1.5 text-[11px] text-amber-300/90">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <span>{clock.athleteWarning}</span>
                      </div>
                      <p className="text-[10px] italic text-slate-500">&quot;{clock.quote}&quot;</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: 5-Rung Gate Ladders (Yellow Dude) */}
          {activeTab === 'ladders' && (
            <div data-testid="ladders-content" className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                {FIVE_RUNG_GATE_LADDERS.map((ladder) => (
                  <button
                    key={ladder.id}
                    type="button"
                    onClick={() => setActiveLadderId(ladder.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer min-h-[40px] ${
                      activeLadderId === ladder.id
                        ? 'bg-purple-500/25 text-purple-300 border-purple-400/50 shadow-sm'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    {ladder.pattern}: {ladder.movementName}
                  </button>
                ))}
              </div>

              {/* Rung 2 Trap Callout */}
              <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-amber-300 block mb-0.5">The &quot;Rung 2 Trap&quot;</span>
                  <p>{activeLadder.theRung2Trap}</p>
                </div>
              </div>

              {/* Rung List */}
              <div className="space-y-2">
                {activeLadder.rungs.map((rung) => {
                  const isCurrent = currentRungs[activeLadder.id] === rung.rung;
                  const isCleared = currentRungs[activeLadder.id] > rung.rung;
                  return (
                    <div
                      key={rung.rung}
                      className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isCurrent
                          ? 'bg-purple-950/40 border-purple-500/80 shadow-md ring-1 ring-purple-500/30'
                          : isCleared
                          ? 'bg-slate-950/60 border-emerald-500/40'
                          : 'bg-slate-950/40 border-slate-800 text-slate-400'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-7 h-7 rounded-lg font-mono font-bold text-xs flex items-center justify-center shrink-0 ${
                            isCurrent
                              ? 'bg-purple-500 text-slate-950 font-black'
                              : isCleared
                              ? 'bg-emerald-500 text-slate-950'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {isCleared ? '✓' : `R${rung.rung}`}
                        </div>
                        <div>
                          <span className="text-sm font-bold text-white block">{rung.name}</span>
                          <span className="text-xs text-purple-300 font-mono block mt-0.5">
                            Gate Requirement: <strong>{rung.gateCriteria}</strong>
                          </span>
                          <p className="text-[11px] text-slate-400 mt-1">{rung.techniqueRule}</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSetCurrentRung(activeLadder.id, rung.rung)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0 min-h-[36px] ${
                          isCurrent
                            ? 'bg-purple-500 text-slate-950 font-bold'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        }`}
                      >
                        {isCurrent ? 'Current Working Rung' : 'Set as Current'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: Jeff Nippard Long-Length Partials (LLPs) */}
          {activeTab === 'llp' && (
            <div data-testid="llp-content" className="space-y-4">
              <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-500/40 space-y-2">
                <div className="flex items-center gap-2 text-purple-300 font-bold text-sm">
                  <Flame className="w-5 h-5 text-purple-400" />
                  <span>{NIPPARD_LLP_STUDY_SYNTHESIS.title}</span>
                </div>
                <span className="text-xs font-mono text-purple-400/90 block">
                  Core Biological Mechanism: {NIPPARD_LLP_STUDY_SYNTHESIS.coreMechanism}
                </span>
                <p className="text-xs text-purple-200/90 leading-relaxed">
                  {NIPPARD_LLP_STUDY_SYNTHESIS.summary}
                </p>
              </div>

              <div className="space-y-2.5">
                <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400">
                  Execution Protocol Rules
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {NIPPARD_LLP_STUDY_SYNTHESIS.protocolRules.map((rule, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-200 flex items-start gap-2.5"
                    >
                      <div className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-300 font-bold font-mono text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </div>
                      <p className="leading-relaxed">{rule}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Lucas Hardie Feats of Range */}
          {activeTab === 'feats' && (
            <div data-testid="feats-content" className="space-y-4">
              <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/40 space-y-2">
                <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                  <Activity className="w-5 h-5 text-emerald-400" />
                  <span>{LUCAS_HARDIE_RANGE_OF_STRENGTH_SYNTHESIS.title}</span>
                </div>
                <span className="text-xs font-mono text-emerald-400/90 block">
                  {LUCAS_HARDIE_RANGE_OF_STRENGTH_SYNTHESIS.corePrinciple}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {LUCAS_HARDIE_RANGE_OF_STRENGTH_SYNTHESIS.guidelines.map((guide, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-200 flex items-start gap-2.5"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">{guide}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </article>
  );
};
