// dev/gallery.tsx — dev-only contact sheet of every motion demo (not part of the production build).
// Open /dev/gallery.html?view=side&p=0,0.5,1&only=squat,rdl&from=0&count=12&size=150
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MOTIONS } from '../src/domain/motionLibrary';
import { getFrontal } from '../src/domain/frontalView';
import '../src/index.css';
import { ExerciseDiagram, MotionFigure, FrontalFigure } from '../src/components/ExerciseDiagram';
import type { DiagramType } from '../src/domain/exerciseVisualsData';
import { ObliqueFigure } from '../src/components/ObliqueFigure';
import type { ObliqueCamera } from '../src/domain/obliqueView';

const q = new URLSearchParams(location.search);
const view = q.get('view') ?? 'side';
const ps = (q.get('p') ?? '0,0.5,1').split(',').map(Number);
const only = q.get('only')?.split(',');
const from = Number(q.get('from') ?? 0);
const count = Number(q.get('count') ?? 999);
const size = Number(q.get('size') ?? 150);
const ghosts = q.get('ghosts') === '1';
const trail = q.get('trail') === '1';

const types = Object.keys(MOTIONS).filter((t) => !only || only.includes(t)).slice(from, from + count);

function Defs({ ids }: { ids: string }) {
  return (
    <defs>
      <radialGradient id={`${ids}-plate`} cx="35%" cy="35%" r="70%">
        <stop offset="0%" stopColor="#fcd34d" />
        <stop offset="60%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#b45309" />
      </radialGradient>
      <linearGradient id={`${ids}-trail`} gradientUnits="userSpaceOnUse" x1="0" y1="-24" x2="200" y2="192">
        <stop offset="0%" stopColor="#38bdf8" />
        <stop offset="100%" stopColor="#34d399" />
      </linearGradient>
      <filter id={`${ids}-glow`} x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="1.6" result="b" />
        <feMerge>
          <feMergeNode in="b" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );
}

function Cell({ type, p, i }: { type: string; p: number; i: number }) {
  const motion = (MOTIONS as Record<string, (typeof MOTIONS)[keyof typeof MOTIONS]>)[type];
  const cfg = getFrontal(type);
  const ids = `g${i}`;
  return (
    <svg viewBox="0 -24 200 216" width={size} height={size * 1.08} style={{ background: '#0b1324', display: 'block' }}>
      <Defs ids={ids} />
      {view === 'side' ? (
        <MotionFigure motion={motion} progress={p} load={0.8} ids={ids} detailed={q.get('detail') === '1'} showTrail={trail} showGhosts={ghosts} />
      ) : view === 'frontal' ? (
        <FrontalFigure motion={motion} cfg={cfg} progress={p} load={0.8} ids={ids} showTrail={trail} showGhosts={ghosts} />
      ) : (
        <ObliqueFigure motion={motion} type={type} cfg={cfg} cam={view as ObliqueCamera} progress={p} load={0.8} ids={ids} showTrail={trail} showGhosts={ghosts} />
      )}
    </svg>
  );
}

function Gallery() {
  let n = 0;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: 6 }}>
      {types.map((t) => (
        <div key={t} style={{ border: '1px solid #1e293b' }}>
          <div style={{ padding: '2px 4px', color: '#7dd3fc' }}>{t}</div>
          <div style={{ display: 'flex', gap: 1 }}>
            {ps.map((p) => (
              <Cell key={p} type={t} p={p} i={n++} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ?live=squat plays the real component (controls, tempo timeline, every camera) for one exercise
const live = q.get('live');
createRoot(document.getElementById('root')!).render(
  live ? (
    <div style={{ maxWidth: 520, margin: '12px auto' }}>
      <ExerciseDiagram diagramType={live as DiagramType} exerciseName={live} tempo={q.get('tempo') ?? '30X1'} />
    </div>
  ) : (
    <Gallery />
  )
);
