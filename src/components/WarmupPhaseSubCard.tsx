// src/components/WarmupPhaseSubCard.tsx
import React, { useState, useMemo } from 'react';
import {
  Check,
  Timer,
  Eye,
  ChevronDown,
  ChevronUp,
  Flame,
  Info,
  Maximize2,
  Compass,
} from 'lucide-react';
import { LazyExerciseDiagram as ExerciseDiagram } from './LazyExerciseDiagram';
import { type ExerciseVisual } from '../domain/exerciseVisualsData';

export interface WarmupPhaseSubCardProps {
  drillId: string;
  drillName: string;
  phaseIndex: number;
  totalPhases: number;
  instruction: string;
  isDone: boolean;
  onToggleDone: () => void;
  drillVisual?: ExerciseVisual;
  onOpenDemoModal: () => void;
  onStartTimer: (seconds: number, label?: string) => void;
}

export interface ParsedPhase {
  phaseNumber: number;
  title: string;
  details: string;
  timerSeconds: number;
  timerLabel: string;
  focusType: 'setup' | 'movement' | 'hold' | 'breathing' | 'cooldown';
  forcedPhase: 'start' | 'bottom';
}

export function parseWarmupPhase(instruction: string, fallbackIndex: number, totalPhases: number): ParsedPhase {
  let title = `Phase ${fallbackIndex + 1}`;
  let details = instruction;
  let phaseNum = fallbackIndex + 1;

  // Extract prefix if present (e.g. "Phase 1 — Machine & Strap Setup: ...")
  const colonIdx = instruction.indexOf(':');
  if (colonIdx > 0 && colonIdx < 55) {
    const rawTitle = instruction.substring(0, colonIdx).trim();
    details = instruction.substring(colonIdx + 1).trim();

    // Check if rawTitle starts with "Phase X — "
    const phaseMatch = rawTitle.match(/Phase\s+(\d+)\s*[—–-]\s*(.+)/i);
    if (phaseMatch) {
      phaseNum = parseInt(phaseMatch[1], 10);
      title = phaseMatch[2].trim();
    } else {
      title = rawTitle;
    }
  }

  // Determine focus type and suggested diagram position
  const lower = instruction.toLowerCase();
  let focusType: ParsedPhase['focusType'] = 'movement';
  let forcedPhase: ParsedPhase['forcedPhase'] = fallbackIndex < Math.ceil(totalPhases / 2) ? 'start' : 'bottom';

  if (lower.includes('setup') || lower.includes('stance') || lower.includes('position') || lower.includes('placement')) {
    focusType = 'setup';
    forcedPhase = 'start';
  } else if (lower.includes('inhale') || lower.includes('exhale') || lower.includes('breath') || lower.includes('vacuum')) {
    focusType = 'breathing';
  } else if (lower.includes('hold') || lower.includes('pause') || lower.includes('squeeze') || lower.includes('isometric')) {
    focusType = 'hold';
    forcedPhase = 'bottom';
  } else if (lower.includes('recovery') || lower.includes('flush') || lower.includes('down-regulation')) {
    focusType = 'cooldown';
  }

  // Parse suggested timer seconds
  let timerSeconds = 30; // sensible default
  let timerLabel = '30s Clock';

  if (lower.includes('4–5 min') || lower.includes('4-5 min') || lower.includes('5 min')) {
    timerSeconds = 240;
    timerLabel = '4-Min Clock';
  } else if (lower.includes('3 min') || lower.includes('3-minute')) {
    timerSeconds = 180;
    timerLabel = '3-Min Clock';
  } else if (lower.includes('30s') || lower.includes('30 seconds') || lower.includes('30-second')) {
    timerSeconds = 30;
    timerLabel = '30s Timer';
  } else if (lower.includes('20s') || lower.includes('20 seconds') || lower.includes('20-second')) {
    timerSeconds = 20;
    timerLabel = '20s Hold';
  } else if (lower.includes('15s') || lower.includes('15 seconds') || lower.includes('15-second')) {
    timerSeconds = 15;
    timerLabel = '15s Timer';
  } else if (lower.includes('10s') || lower.includes('10 seconds') || lower.includes('10-second')) {
    timerSeconds = 10;
    timerLabel = '10s Hold';
  } else if (lower.includes('8s') || lower.includes('8 full seconds') || lower.includes('8 seconds')) {
    timerSeconds = 8;
    timerLabel = '8s Exhale';
  } else if (lower.includes('7s') || lower.includes('7 seconds') || lower.includes('7-second')) {
    timerSeconds = 7;
    timerLabel = '7s Exhale';
  } else if (lower.includes('5s') || lower.includes('5 seconds') || lower.includes('5-second')) {
    timerSeconds = 5;
    timerLabel = '5s Inhale';
  } else if (lower.includes('4s') || lower.includes('4 seconds') || lower.includes('4-second')) {
    timerSeconds = 4;
    timerLabel = '4s Cadence';
  } else if (lower.includes('3s') || lower.includes('3 seconds') || lower.includes('3-second')) {
    timerSeconds = 3;
    timerLabel = '3s Pause';
  } else if (lower.includes('2s') || lower.includes('2 seconds') || lower.includes('2-second')) {
    timerSeconds = 2;
    timerLabel = '2s Hold';
  } else if (focusType === 'setup') {
    timerSeconds = 15;
    timerLabel = '15s Setup';
  }

  return {
    phaseNumber: phaseNum,
    title,
    details,
    timerSeconds,
    timerLabel,
    focusType,
    forcedPhase,
  };
}

export const WarmupPhaseSubCard: React.FC<WarmupPhaseSubCardProps> = ({
  drillId: _drillId,
  drillName,
  phaseIndex,
  totalPhases,
  instruction,
  isDone,
  onToggleDone,
  drillVisual,
  onOpenDemoModal,
  onStartTimer,
}) => {
  const [showInlineDemo, setShowInlineDemo] = useState<boolean>(false);

  const parsed = useMemo(
    () => parseWarmupPhase(instruction, phaseIndex, totalPhases),
    [instruction, phaseIndex, totalPhases]
  );

  return (
    <div
      className={`border rounded-xl p-3 sm:p-4 text-xs space-y-2.5 transition-all shadow-sm ${
        isDone
          ? 'bg-emerald-950/20 border-emerald-500/40 shadow-emerald-950/20'
          : 'bg-slate-900/80 border-slate-800 hover:border-slate-700/80 shadow-black/20'
      }`}
    >
      {/* Sub Card Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* 1-Tap Completion Checkbox */}
          <button
            type="button"
            onClick={onToggleDone}
            aria-label={`Mark Phase ${parsed.phaseNumber} as ${isDone ? 'incomplete' : 'complete'}`}
            className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
              isDone
                ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-sm shadow-emerald-900/40'
                : 'bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white'
            }`}
          >
            {isDone ? (
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            ) : (
              <span className="text-[10px] font-mono font-bold">{parsed.phaseNumber}</span>
            )}
          </button>

          {/* Phase Badge & Title */}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                  isDone
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : parsed.focusType === 'setup'
                    ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                    : parsed.focusType === 'breathing'
                    ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                    : parsed.focusType === 'hold'
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                Phase {parsed.phaseNumber}
              </span>
              <strong
                className={`text-xs font-semibold truncate ${
                  isDone ? 'text-emerald-300 line-through' : 'text-slate-100'
                }`}
              >
                {parsed.title}
              </strong>
            </div>
          </div>
        </div>

        {/* Action Controls: Timer & Demo */}
        <div className="flex items-center gap-1.5 flex-wrap ml-auto">
          {/* Phase Quick-Timer Button */}
          <button
            type="button"
            onClick={() => onStartTimer(parsed.timerSeconds, `${drillName} — ${parsed.title}`)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 active:scale-95 text-blue-300 border border-blue-500/30 text-[11px] font-semibold transition-all cursor-pointer shadow-sm"
            title={`Start ${parsed.timerLabel} for ${parsed.title}`}
            aria-label={`Start ${parsed.timerLabel} for ${parsed.title}`}
          >
            <Timer className="w-3 h-3 text-blue-400" />
            <span>{parsed.timerLabel}</span>
          </button>

          {/* Fullscreen Demo Modal Launcher */}
          <button
            type="button"
            onClick={onOpenDemoModal}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 active:scale-95 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold transition-all cursor-pointer"
            title={`Open full visual demo for ${drillName}`}
            aria-label={`Open full visual demo for ${drillName}`}
          >
            <Eye className="w-3 h-3 text-emerald-400" />
            <span>Demo</span>
          </button>

          {/* Inline Diagram Preview Toggle */}
          {drillVisual && (
            <button
              type="button"
              onClick={() => setShowInlineDemo((prev) => !prev)}
              aria-expanded={showInlineDemo}
              aria-label={`${showInlineDemo ? 'Hide' : 'Show'} visual diagram for Phase ${parsed.phaseNumber}`}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-medium transition-colors cursor-pointer"
              title={showInlineDemo ? 'Hide inline diagram' : 'Show inline diagram'}
            >
              <span>{showInlineDemo ? 'Hide Diagram' : 'Diagram'}</span>
              {showInlineDemo ? (
                <ChevronUp className="w-3 h-3 text-slate-400" />
              ) : (
                <ChevronDown className="w-3 h-3 text-slate-400" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Phase Details & Instructions */}
      <div className="pl-8 text-slate-300 space-y-2">
        <p className={`leading-relaxed text-xs ${isDone ? 'text-slate-400' : 'text-slate-200'}`}>
          {parsed.details}
        </p>

        {/* Biomechanical Target Pill & Key Alignment */}
        {drillVisual && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800 text-slate-400">
              <Compass className="w-3 h-3 text-amber-400" />
              <span>
                {parsed.forcedPhase === 'start'
                  ? `Stance: ${drillVisual.jointAngleCues.start}`
                  : `Peak Angle: ${drillVisual.jointAngleCues.bottom}`}
              </span>
            </span>

            {drillVisual.safetyNote && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-emerald-950/30 px-2 py-0.5 rounded-md border border-emerald-900/40 text-emerald-400/90">
                <Info className="w-3 h-3 text-emerald-400" />
                <span>{drillVisual.safetyNote}</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Inline Demo Accordion Preview */}
      {showInlineDemo && drillVisual && (
        <div className="mt-2.5 pt-2.5 border-t border-slate-800/80 animate-in fade-in duration-200 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <Flame className="w-3.5 h-3.5" />
              <span>
                Visual Demo: {parsed.forcedPhase === 'start' ? drillVisual.startPositionLabel : drillVisual.bottomPositionLabel}
              </span>
            </span>
            <button
              type="button"
              onClick={onOpenDemoModal}
              className="inline-flex items-center gap-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <Maximize2 className="w-3 h-3" />
              <span>Zoom & Technique Cues</span>
            </button>
          </div>

          <div className="bg-slate-950 rounded-xl p-2 border border-slate-800/90 flex flex-col sm:flex-row items-center gap-3">
            <div className="w-full sm:w-48 h-36 flex items-center justify-center shrink-0 overflow-hidden rounded-lg bg-slate-900/60">
              <ExerciseDiagram
                compact={true}
                diagramType={drillVisual.diagramType}
                exerciseName={drillName}
                forcedPhase={parsed.forcedPhase}
                onOpenZoom={onOpenDemoModal}
              />
            </div>
            <div className="space-y-1.5 text-[11px] text-slate-300">
              <p className="italic text-slate-400">{drillVisual.caption}</p>
              <div className="space-y-1">
                <span className="font-semibold text-slate-200 block">Biomechanical Cues:</span>
                <ul className="list-disc list-inside space-y-0.5 text-slate-400">
                  {drillVisual.keyCues.slice(0, 2).map((cue, cIdx) => (
                    <li key={cIdx}>{cue}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
