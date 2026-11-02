// src/components/PlateLoadStrip.tsx
/**
 * Always-visible plate loading for barbell lifts: for each working weight on the card, the plates to
 * put on EACH side of a 45 lb bar. "Bar view" opens the full visual loader for that weight.
 */
import React from 'react';
import { Disc } from 'lucide-react';
import { calculatePlates } from '../domain/plateCalculator';

interface PlateLoadStripProps {
  exerciseId: string;
  weights: number[];
  openWeight: number | null;
  onToggleVisual: (weight: number) => void;
}

export const PlateLoadStrip: React.FC<PlateLoadStripProps> = ({ exerciseId, weights, openWeight, onToggleVisual }) => {
  if (weights.length === 0) return null;
  return (
    <div
      data-testid={`plate-load-strip-${exerciseId}`}
      className="mb-3 rounded-xl bg-slate-950/70 border border-slate-800 px-2.5 py-2 space-y-1.5"
    >
      <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400 flex items-center gap-1.5">
        <Disc className="w-3 h-3 text-red-400" />
        <span>Plates per side · 45 lb bar</span>
      </div>
      {weights.map((w, i) => {
        const r = calculatePlates(w);
        return (
          <div key={w} data-testid={`plate-load-${exerciseId}-${w}`} className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-bold text-white w-14 shrink-0">{w} lb</span>
            <div className="flex items-center gap-1 flex-wrap flex-1 min-w-0">
              {r.groupSummary.length === 0 ? (
                <span className="text-[11px] text-slate-400">Empty bar</span>
              ) : (
                r.groupSummary.map((g) => (
                  <span
                    key={g.plateWeight}
                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md border text-[11px] font-mono font-bold ${g.spec.tailwindBg} ${g.spec.tailwindBorder} ${g.spec.textColor}`}
                  >
                    {g.plateWeight}
                    {g.countPerSide > 1 && <span className="opacity-80">×{g.countPerSide}</span>}
                  </span>
                ))
              )}
              {!r.isExact && w > r.barWeight && (
                <span className="text-[10px] text-amber-300">≈ {r.achievableWeight} lb</span>
              )}
            </div>
            <button
              type="button"
              data-testid={i === 0 ? `barbell-plates-toggle-${exerciseId}` : undefined}
              onClick={() => onToggleVisual(w)}
              aria-expanded={openWeight === w}
              aria-label={`${openWeight === w ? 'Hide' : 'Show'} bar view for ${w} lbs`}
              className={`shrink-0 px-2 py-1 rounded-lg border text-[11px] font-semibold cursor-pointer transition-colors ${
                openWeight === w
                  ? 'bg-red-500/20 text-red-300 border-red-500/50'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              {openWeight === w ? 'Hide' : 'Bar view'}
            </button>
          </div>
        );
      })}
    </div>
  );
};

/** Plates per side as text, e.g. "25 + 10" ("bar" for an empty bar). */
export function platesPerSideText(weight: number): string {
  const r = calculatePlates(weight);
  return r.platesPerSide.length ? r.platesPerSide.join(' + ') : 'bar';
}
