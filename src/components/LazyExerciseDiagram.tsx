// src/components/LazyExerciseDiagram.tsx
// The diagram renderer and motion engine (~65 KB) are their own chunk so they don't hold up the first paint.
// The chunk starts downloading as soon as the app runs; until it arrives a same-size placeholder keeps the
// thumbnail's tap target and label, so nothing shifts when the figure appears.
import React, { Suspense } from 'react';
import { lazyView } from '../lazyView';
import type { ExerciseDiagramProps } from './ExerciseDiagram';

const Diagram = lazyView(() => import('./ExerciseDiagram').then((m) => m.ExerciseDiagram));
export const preloadExerciseDiagram = Diagram.preload;

if (typeof window !== 'undefined') {
  window.setTimeout(() => {
    void preloadExerciseDiagram().catch(() => {
      // offline: retried when a diagram renders
    });
  }, 0);
}

function Placeholder({ compact, exerciseName, onOpenZoom, className = '' }: ExerciseDiagramProps) {
  if (compact) {
    return (
      <button
        type="button"
        onClick={onOpenZoom}
        title={`View form demonstration for ${exerciseName}`}
        aria-label={`View form demonstration for ${exerciseName}`}
        className={`w-11 h-11 rounded-xl bg-slate-900 border border-slate-700/80 flex-shrink-0 cursor-pointer ${className}`}
      />
    );
  }
  return <div className={`w-full min-h-[260px] rounded-2xl bg-slate-900/60 border border-slate-800 ${className}`} aria-busy="true" />;
}

export const LazyExerciseDiagram: React.FC<ExerciseDiagramProps> = (props) => (
  <Suspense fallback={<Placeholder {...props} />}>
    <Diagram {...props} />
  </Suspense>
);
