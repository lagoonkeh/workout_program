// src/components/ExerciseDiagram.tsx
import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Eye, EyeOff, Gauge, Pause, Play, Route, ZoomIn } from 'lucide-react';
import { type DiagramType } from '../domain/exerciseVisualsData';
import {
  BONES,
  SEGMENTS,
  angleOf,
  buildSkeleton,
  buildTimeline,
  dist,
  jointAngle,
  poseAt,
  polar,
  timelineAt,
  timelineDuration,
  type JointId,
  type SegmentId,
  type Skeleton,
  type TimelineSegment,
  type Vec,
} from '../domain/motionRig';
import { FLOOR_Y, getMotion, type MotionDef, type PropDef, type SceneryDef } from '../domain/motionLibrary';
import {
  CX,
  frontalTrackPoint,
  getFrontal,
  projectFrontal,
  type FrontalConfig,
  type FrontalJoint,
  type FrontalProp,
  type FrontalScenery,
  type FrontalSkeleton,
  type Side,
} from '../domain/frontalView';

export interface ExerciseDiagramProps {
  diagramType: DiagramType;
  exerciseName?: string;
  forcedPhase?: 'start' | 'bottom';
  compact?: boolean;
  onOpenZoom?: () => void;
  className?: string;
  tempo?: string;
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

const TRAIL_SAMPLES = 48;
const FAR_OFFSET: Vec = [3.5, -2.5];

function propCenter(p: PropDef, sk: Skeleton): Vec {
  if (p.kind === 'cable') return sk[p.at];
  if (p.kind === 'club') {
    const a = angleOf(sk[p.from], sk[p.at]);
    return polar(sk[p.at], a, p.len);
  }
  const d = 'd' in p && p.d ? p.d : [0, 0];
  const j = sk[p.at];
  return [j[0] + d[0], j[1] + d[1]];
}

function trackPoint(m: MotionDef, sk: Skeleton): Vec {
  return 'prop' in m.track ? propCenter(m.props[m.track.prop], sk) : sk[m.track.joint];
}

const pathFrom = (pts: Vec[]) =>
  pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');

const isFar = (s: SegmentId) => s.endsWith('F');

const SEGMENT_WIDTH: Record<SegmentId, number> = {
  torso: 0,
  neck: 6,
  uaN: 8.5,
  uaF: 8.5,
  faN: 7,
  faF: 7,
  thN: 11.5,
  thF: 11.5,
  shN: 8.5,
  shF: 8.5,
  ftN: 4.5,
  ftF: 4.5,
};

// ---------------------------------------------------------------------------
// Pure figure renderer (also used by the thumbnail)
// ---------------------------------------------------------------------------

interface FigureProps {
  motion: MotionDef;
  progress: number;
  load: number;
  ids: string;
  detailed: boolean;
  showTrail: boolean;
  showGhosts: boolean;
}

const COLORS = {
  near: '#cbd5e1',
  far: '#64748b',
  outline: '#0b1220',
  head: '#e2e8f0',
  worked: '#10b981',
  workedFar: '#059669',
  joint: '#0f172a',
  steel: '#475569',
  pad: '#334155',
  plate: '#f59e0b',
  bar: '#fbbf24',
  trail: '#38bdf8',
};

function Limb({ a, b, w, color, outline = true }: { a: Vec; b: Vec; w: number; color: string; outline?: boolean }) {
  return (
    <>
      {outline && (
        <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={COLORS.outline} strokeWidth={w + 2.4} strokeLinecap="round" />
      )}
      <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={color} strokeWidth={w} strokeLinecap="round" />
    </>
  );
}

/** Tapered torso: wider at the chest than the hips */
function torsoPath(hip: Vec, neck: Vec): string {
  const a = angleOf(hip, neck);
  const n = a + 90;
  const h1 = polar(hip, n, 6.5);
  const h2 = polar(hip, n + 180, 6.5);
  const chest = polar(hip, a, BONES.torso * 0.72);
  const c1 = polar(chest, n, 9);
  const c2 = polar(chest, n + 180, 9);
  const s1 = polar(neck, n, 6);
  const s2 = polar(neck, n + 180, 6);
  const f = (p: Vec) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`;
  return `M${f(h1)} L${f(c1)} Q${f(polar(neck, n, 9))} ${f(s1)} L${f(s2)} Q${f(polar(neck, n + 180, 9))} ${f(c2)} L${f(h2)} Z`;
}

function Scenery({ s }: { s: SceneryDef }) {
  switch (s.kind) {
    case 'rect': {
      const fill = s.tone === 'wall' ? '#1e293b' : s.tone === 'plate' ? '#1f2937' : s.tone === 'steel' ? '#334155' : '#3f3f46';
      const stroke = s.tone === 'plate' ? '#b45309' : s.tone === 'wall' ? '#334155' : '#52525b';
      return <rect x={s.x} y={s.y} width={s.w} height={s.h} rx={s.r ?? 0} fill={fill} stroke={stroke} strokeWidth={1.2} />;
    }
    case 'line':
      return (
        <line
          x1={s.from[0]}
          y1={s.from[1]}
          x2={s.to[0]}
          y2={s.to[1]}
          stroke={s.tone === 'wall' ? '#334155' : COLORS.steel}
          strokeWidth={s.w ?? 3}
          strokeLinecap="round"
        />
      );
    case 'bar':
      return (
        <g>
          <line x1={s.x1} y1={s.y} x2={s.x2} y2={s.y} stroke="#94a3b8" strokeWidth={4} strokeLinecap="round" />
          <line x1={s.x1} y1={s.y} x2={s.x1} y2={s.y - 30} stroke={COLORS.steel} strokeWidth={3} />
          <line x1={s.x2} y1={s.y} x2={s.x2} y2={s.y - 30} stroke={COLORS.steel} strokeWidth={3} />
        </g>
      );
    case 'wheel':
      return (
        <g>
          <circle cx={s.c[0]} cy={s.c[1]} r={s.r} fill="#111827" stroke={COLORS.steel} strokeWidth={2} />
          <circle cx={s.c[0]} cy={s.c[1]} r={Math.max(1.5, s.r * 0.25)} fill={COLORS.steel} />
        </g>
      );
  }
}

function Prop({ p, sk, ids }: { p: PropDef; sk: Skeleton; ids: string }) {
  const c = propCenter(p, sk);
  switch (p.kind) {
    case 'barbell':
      return (
        <g>
          <circle cx={c[0]} cy={c[1]} r={13.5} fill={`url(#${ids}-plate)`} stroke="#78350f" strokeWidth={1.2} />
          <circle cx={c[0]} cy={c[1]} r={8.5} fill="none" stroke="#92400e" strokeWidth={1} opacity={0.7} />
          <circle cx={c[0]} cy={c[1]} r={2.6} fill="#e5e7eb" stroke="#475569" strokeWidth={0.8} />
        </g>
      );
    case 'kettlebell':
      return (
        <g>
          <path
            d={`M${c[0] - 4.5},${c[1] - 6} Q${c[0]},${c[1] - 14} ${c[0] + 4.5},${c[1] - 6}`}
            fill="none"
            stroke="#92400e"
            strokeWidth={2.4}
            strokeLinecap="round"
          />
          <circle cx={c[0]} cy={c[1]} r={7.5} fill={`url(#${ids}-plate)`} stroke="#78350f" strokeWidth={1} />
        </g>
      );
    case 'dumbbell':
      return (
        <g>
          <rect x={c[0] - 5} y={c[1] - 5} width={10} height={10} rx={2.5} fill={`url(#${ids}-plate)`} stroke="#78350f" strokeWidth={1} />
          <circle cx={c[0]} cy={c[1]} r={1.6} fill="#e5e7eb" />
        </g>
      );
    case 'club': {
      const h = sk[p.at];
      const a = angleOf(h, c);
      const mid = polar(h, a, p.len * 0.6);
      return (
        <g>
          <line x1={h[0]} y1={h[1]} x2={mid[0]} y2={mid[1]} stroke="#b45309" strokeWidth={3} strokeLinecap="round" />
          <line x1={mid[0]} y1={mid[1]} x2={c[0]} y2={c[1]} stroke={COLORS.plate} strokeWidth={7.5} strokeLinecap="round" />
        </g>
      );
    }
    case 'cable':
      return (
        <g>
          <line x1={p.anchor[0]} y1={p.anchor[1]} x2={c[0]} y2={c[1]} stroke={COLORS.bar} strokeWidth={1.6} strokeDasharray="3 2" />
          <rect x={c[0] - 3} y={c[1] - 3} width={6} height={6} rx={1.5} fill="#e5e7eb" stroke="#475569" strokeWidth={0.8} />
        </g>
      );
  }
}

function Body({ sk, worked, load, ghost = false, ids }: { sk: Skeleton; worked: Set<SegmentId>; load: number; ghost?: boolean; ids: string }) {
  const off = (j: JointId): Vec => {
    const p = sk[j];
    return /F$/.test(j) ? [p[0] + FAR_OFFSET[0], p[1] + FAR_OFFSET[1]] : p;
  };
  const glowOpacity = 0.35 + 0.65 * load;

  const seg = (s: SegmentId) => {
    const [a, b] = SEGMENTS[s];
    // far limbs hang off the (unshifted) shoulder/hip so they stay attached
    const pa = s === 'uaF' || s === 'thF' ? sk[a] : off(a);
    const pb = off(b);
    const far = isFar(s);
    const base = ghost ? '#94a3b8' : far ? COLORS.far : COLORS.near;
    const w = SEGMENT_WIDTH[s];
    return (
      <g key={s}>
        <Limb a={pa} b={pb} w={w} color={base} outline={!ghost} />
        {!ghost && worked.has(s) && (
          <line
            x1={pa[0]}
            y1={pa[1]}
            x2={pb[0]}
            y2={pb[1]}
            stroke={far ? COLORS.workedFar : COLORS.worked}
            strokeWidth={w - 2}
            strokeLinecap="round"
            opacity={glowOpacity}
            filter={`url(#${ids}-glow)`}
            data-worked={s}
          />
        )}
      </g>
    );
  };

  const farSegs: SegmentId[] = ['thF', 'shF', 'ftF', 'uaF', 'faF'];
  const nearLegs: SegmentId[] = ['thN', 'shN', 'ftN'];
  const nearArm: SegmentId[] = ['uaN', 'faN'];
  const torsoD = torsoPath(sk.hip, sk.neck);

  return (
    <g opacity={ghost ? 0.16 : 1}>
      {farSegs.map(seg)}
      {nearLegs.map(seg)}
      {/* torso */}
      <path d={torsoD} fill={ghost ? '#94a3b8' : COLORS.near} stroke={ghost ? 'none' : COLORS.outline} strokeWidth={1.4} strokeLinejoin="round" />
      {!ghost && worked.has('torso') && (
        <path d={torsoD} fill={COLORS.worked} opacity={glowOpacity * 0.85} filter={`url(#${ids}-glow)`} data-worked="torso" />
      )}
      {seg('neck')}
      <circle cx={sk.head[0]} cy={sk.head[1]} r={BONES.headRadius} fill={ghost ? '#94a3b8' : COLORS.head} stroke={ghost ? 'none' : COLORS.outline} strokeWidth={1.4} />
      {nearArm.map(seg)}
      {!ghost &&
        (['kneeN', 'elbowN', 'hip', 'ankleN'] as JointId[]).map((j) => (
          <circle key={j} cx={sk[j][0]} cy={sk[j][1]} r={1.7} fill={COLORS.joint} opacity={0.7} />
        ))}
    </g>
  );
}

function AngleArc({ a, b, c, label }: { a: Vec; b: Vec; c: Vec; label: string }) {
  const r = 13;
  const a1 = angleOf(b, a);
  const a2 = angleOf(b, c);
  let sweep = ((a2 - a1 + 540) % 360) - 180;
  const p1 = polar(b, a1, r);
  const p2 = polar(b, a1 + sweep, r);
  const large = Math.abs(sweep) > 180 ? 1 : 0;
  const mid = polar(b, a1 + sweep / 2, r + 11);
  const value = Math.round(jointAngle(a, b, c));
  return (
    <g data-testid="diagram-angle-readout">
      <path
        d={`M${b[0]},${b[1]} L${p1[0]},${p1[1]} A${r},${r} 0 ${large} ${sweep > 0 ? 1 : 0} ${p2[0]},${p2[1]} Z`}
        fill="#f59e0b"
        fillOpacity={0.18}
        stroke="#fbbf24"
        strokeWidth={1}
      />
      <g transform={`translate(${mid[0]},${mid[1]})`}>
        <rect x={-15} y={-6.5} width={30} height={13} rx={3} fill="#0f172a" stroke="#f59e0b" strokeWidth={0.7} opacity={0.92} />
        <text x={0} y={3} textAnchor="middle" fontSize={7.5} fontFamily="ui-monospace, monospace" fontWeight={700} fill="#fde68a">
          {value}°
        </text>
      </g>
      <title>{`${label} angle ${value}°`}</title>
    </g>
  );
}

export const MotionFigure: React.FC<FigureProps> = ({ motion, progress, load, ids, detailed, showTrail, showGhosts }) => {
  const sk = useMemo(() => buildSkeleton(poseAt(motion.frames, progress)), [motion, progress]);
  const worked = useMemo(() => new Set(motion.worked), [motion]);

  const statics = useMemo(() => {
    const start = buildSkeleton(poseAt(motion.frames, 0));
    const end = buildSkeleton(poseAt(motion.frames, motion.order === 'loop' ? 0.5 : 1));
    const pts: Vec[] = [];
    for (let i = 0; i <= TRAIL_SAMPLES; i++) {
      pts.push(trackPoint(motion, buildSkeleton(poseAt(motion.frames, i / TRAIL_SAMPLES))));
    }
    return { start, end, trail: pts };
  }, [motion]);

  const tp = trackPoint(motion, sk);
  const trail = statics.trail;
  const arrowIdx = Math.floor(trail.length * 0.55);
  const arrowA = trail[Math.max(0, arrowIdx - 2)];
  const arrowB = trail[Math.min(trail.length - 1, arrowIdx + 1)];
  const arrowAngle = angleOf(arrowA, arrowB);
  const farProps = motion.props.filter((p) => 'at' in p && /F$/.test(p.at));
  const nearProps = motion.props.filter((p) => !farProps.includes(p));
  // bar on the back sits behind the near arm; held implements sit in front
  const behind = nearProps.filter((p) => 'at' in p && (p.at === 'neck' || p.kind === 'cable'));
  const front = nearProps.filter((p) => !behind.includes(p));

  return (
    <g>
      {/* floor + contact shadow */}
      <line x1={0} y1={FLOOR_Y} x2={200} y2={FLOOR_Y} stroke="#334155" strokeWidth={1.5} />
      {detailed && (
        <ellipse cx={(sk.ankleN[0] + sk.hip[0]) / 2} cy={FLOOR_Y + 1.5} rx={34} ry={3.2} fill="#000" opacity={0.35} />
      )}
      {motion.scenery.map((s, i) => (
        <Scenery key={i} s={s} />
      ))}

      {detailed && motion.plumb && (
        <g data-testid="diagram-plumb-line">
          <line x1={motion.plumb.x} y1={-18} x2={motion.plumb.x} y2={FLOOR_Y} stroke="#38bdf8" strokeWidth={0.8} strokeDasharray="2 3" opacity={0.55} />
          <text x={motion.plumb.x + 3} y={FLOOR_Y - 3} fontSize={6} fill="#7dd3fc" fontFamily="ui-monospace, monospace" opacity={0.8}>
            {motion.plumb.label}
          </text>
        </g>
      )}

      {detailed && showGhosts && (
        <g data-testid="diagram-ghosts">
          <Body sk={statics.start} worked={worked} load={0} ghost ids={ids} />
          <Body sk={statics.end} worked={worked} load={0} ghost ids={ids} />
        </g>
      )}

      {farProps.map((p, i) => (
        <Prop key={`f${i}`} p={p} sk={sk} ids={ids} />
      ))}
      {behind.map((p, i) => (
        <Prop key={`b${i}`} p={p} sk={sk} ids={ids} />
      ))}
      <Body sk={sk} worked={worked} load={load} ids={ids} />
      {front.map((p, i) => (
        <Prop key={`n${i}`} p={p} sk={sk} ids={ids} />
      ))}

      {detailed && showTrail && (
        <g data-testid="diagram-trajectory">
          <path d={pathFrom(trail)} fill="none" stroke="#020617" strokeWidth={4.2} strokeLinecap="round" opacity={0.75} />
          <path d={pathFrom(trail)} fill="none" stroke={`url(#${ids}-trail)`} strokeWidth={2} strokeDasharray="3.5 2.5" strokeLinecap="round" />
          <circle cx={trail[0][0]} cy={trail[0][1]} r={2.2} fill="#38bdf8" />
          <circle cx={trail[trail.length - 1][0]} cy={trail[trail.length - 1][1]} r={2.2} fill="#34d399" />
          <path
            d="M-3.5,-3 L3.5,0 L-3.5,3 Z"
            transform={`translate(${arrowB[0]},${arrowB[1]}) rotate(${arrowAngle})`}
            fill="#e0f2fe"
            opacity={0.9}
          />
        </g>
      )}

      {detailed && showTrail && (
        <g>
          <circle cx={tp[0]} cy={tp[1]} r={6} fill="#38bdf8" opacity={0.25} />
          <circle cx={tp[0]} cy={tp[1]} r={2.6} fill="#e0f2fe" stroke="#0ea5e9" strokeWidth={1} data-testid="diagram-track-dot" />
        </g>
      )}

      {detailed && motion.angle && (
        <AngleArc a={sk[motion.angle.joints[0]]} b={sk[motion.angle.joints[1]]} c={sk[motion.angle.joints[2]]} label={motion.angle.label} />
      )}
    </g>
  );
};

// ---------------------------------------------------------------------------
// Front / back view (projection of the same skeleton)
// ---------------------------------------------------------------------------

interface FrontalFigureProps {
  motion: MotionDef;
  cfg: FrontalConfig;
  progress: number;
  load: number;
  ids: string;
  showTrail: boolean;
  showGhosts: boolean;
}

function FrontalScene({ s }: { s: FrontalScenery }) {
  switch (s.kind) {
    case 'rect': {
      const fill = s.tone === 'wall' ? '#111c30' : s.tone === 'plate' ? '#1f2937' : s.tone === 'steel' ? '#334155' : '#3f3f46';
      const stroke = s.tone === 'plate' ? '#b45309' : s.tone === 'wall' ? '#1e293b' : '#52525b';
      return <rect x={s.x} y={s.y} width={s.w} height={s.h} rx={s.r ?? 0} fill={fill} stroke={stroke} strokeWidth={1.2} />;
    }
    case 'line':
      return <line x1={s.from[0]} y1={s.from[1]} x2={s.to[0]} y2={s.to[1]} stroke={COLORS.steel} strokeWidth={s.w ?? 3} strokeLinecap="round" />;
    case 'bar':
      return (
        <g>
          <line x1={CX - s.half} y1={s.y} x2={CX + s.half} y2={s.y} stroke="#94a3b8" strokeWidth={4} strokeLinecap="round" />
          <line x1={CX - s.half} y1={s.y} x2={CX - s.half} y2={s.y - 30} stroke={COLORS.steel} strokeWidth={3} />
          <line x1={CX + s.half} y1={s.y} x2={CX + s.half} y2={s.y - 30} stroke={COLORS.steel} strokeWidth={3} />
        </g>
      );
  }
}

function frontalPropAnchor(p: FrontalProp, fs: FrontalSkeleton): { pt: Vec; depth: number } {
  const hand = (side: Side) => fs.joints.hand[side];
  switch (p.kind) {
    case 'bar': {
      if (p.at === 'neck') return { pt: [CX, fs.neck.p[1] + (p.dy ?? 0)], depth: fs.neck.depth - 3 };
      const a = hand('N');
      const b = hand('F');
      return { pt: [CX, (a.p[1] + b.p[1]) / 2 + (p.dy ?? 0)], depth: (a.depth + b.depth) / 2 + 0.5 };
    }
    case 'kettlebell':
    case 'dumbbell':
    case 'club': {
      const h = hand(p.side);
      const d = 'd' in p && p.d ? p.d : [0, 0];
      return { pt: [h.p[0] + d[0], h.p[1] + d[1]], depth: h.depth + 0.5 };
    }
    case 'cable':
      return { pt: p.anchor, depth: Math.max(fs.joints.hand.N.depth, fs.joints.hand.F.depth) + 30 };
  }
}

function FrontalPropShape({ p, fs, ids }: { p: FrontalProp; fs: FrontalSkeleton; ids: string }) {
  const { pt } = frontalPropAnchor(p, fs);
  switch (p.kind) {
    case 'bar': {
      const y = pt[1];
      return (
        <g data-frontal-prop="bar">
          <line x1={CX - p.half} y1={y} x2={CX + p.half} y2={y} stroke="#cbd5e1" strokeWidth={2.6} strokeLinecap="round" />
          {[-1, 1].map((k) => (
            <g key={k}>
              <rect x={CX + k * (p.half - 6) - 3.5} y={y - 15} width={7} height={30} rx={1.5} fill={`url(#${ids}-plate)`} stroke="#78350f" strokeWidth={0.8} />
              <rect x={CX + k * (p.half - 12) - 2.5} y={y - 11} width={5} height={22} rx={1.2} fill={`url(#${ids}-plate)`} stroke="#78350f" strokeWidth={0.8} />
            </g>
          ))}
        </g>
      );
    }
    case 'kettlebell':
      return (
        <g>
          <path d={`M${pt[0] - 4.5},${pt[1] - 6} Q${pt[0]},${pt[1] - 14} ${pt[0] + 4.5},${pt[1] - 6}`} fill="none" stroke="#92400e" strokeWidth={2.4} strokeLinecap="round" />
          <circle cx={pt[0]} cy={pt[1]} r={7.5} fill={`url(#${ids}-plate)`} stroke="#78350f" strokeWidth={1} />
        </g>
      );
    case 'dumbbell':
      return (
        <g>
          <line x1={pt[0] - 7} y1={pt[1]} x2={pt[0] + 7} y2={pt[1]} stroke="#cbd5e1" strokeWidth={2} />
          <rect x={pt[0] - 9} y={pt[1] - 5} width={4} height={10} rx={1.2} fill={`url(#${ids}-plate)`} />
          <rect x={pt[0] + 5} y={pt[1] - 5} width={4} height={10} rx={1.2} fill={`url(#${ids}-plate)`} />
        </g>
      );
    case 'club': {
      const e = fs.joints.elbow[p.side].p;
      const h = fs.joints.hand[p.side].p;
      const a = angleOf(e, h);
      const tip = polar(h, a, p.len);
      const mid = polar(h, a, p.len * 0.6);
      return (
        <g>
          <line x1={h[0]} y1={h[1]} x2={mid[0]} y2={mid[1]} stroke="#b45309" strokeWidth={3} strokeLinecap="round" />
          <line x1={mid[0]} y1={mid[1]} x2={tip[0]} y2={tip[1]} stroke={COLORS.plate} strokeWidth={7.5} strokeLinecap="round" />
        </g>
      );
    }
    case 'cable':
      return (
        <g>
          {p.sides.map((sd) => {
            const h = fs.joints.hand[sd].p;
            return <line key={sd} x1={p.anchor[0]} y1={p.anchor[1]} x2={h[0]} y2={h[1]} stroke={COLORS.bar} strokeWidth={1.4} strokeDasharray="3 2" />;
          })}
          <circle cx={p.anchor[0]} cy={p.anchor[1]} r={3} fill={COLORS.steel} />
        </g>
      );
  }
}

function FrontalBody({ fs, worked, load, ghost = false, ids }: { fs: FrontalSkeleton; worked: Set<SegmentId>; load: number; ghost?: boolean; ids: string }) {
  const J = fs.joints;
  const glow = 0.35 + 0.65 * load;
  const isWorked = (s: SegmentId) => !ghost && worked.has(s);
  const viewerFront = fs.view === 'front';

  type Item = { depth: number; order: number; node: React.ReactNode };
  const items: Item[] = [];

  const limb = (key: SegmentId, a: FrontalJoint, b: FrontalJoint, side: Side, w: number, order: number) => {
    const pa = J[a][side];
    const pb = J[b][side];
    const color = ghost ? '#94a3b8' : COLORS.near;
    items.push({
      depth: (pa.depth + pb.depth) / 2,
      order,
      node: (
        <g key={`${key}`}>
          <Limb a={pa.p} b={pb.p} w={w} color={color} outline={!ghost} />
          {isWorked(key) && (
            <line x1={pa.p[0]} y1={pa.p[1]} x2={pb.p[0]} y2={pb.p[1]} stroke={COLORS.worked} strokeWidth={w - 2} strokeLinecap="round" opacity={glow} filter={`url(#${ids}-glow)`} data-worked={key} />
          )}
        </g>
      ),
    });
  };

  (['N', 'F'] as Side[]).forEach((sd) => {
    limb(`th${sd}` as SegmentId, 'hip', 'knee', sd, 12, 1);
    limb(`sh${sd}` as SegmentId, 'knee', 'ankle', sd, 9, 1);
    limb(`ft${sd}` as SegmentId, 'ankle', 'toe', sd, 5, 1);
    limb(`ua${sd}` as SegmentId, 'shoulder', 'elbow', sd, 8.5, 3);
    limb(`fa${sd}` as SegmentId, 'elbow', 'hand', sd, 7, 3);
  });

  // torso: trapezoid shoulders → hips, or an end-on cross-section when lying / folded flat
  const sN = J.shoulder.N.p;
  const sF = J.shoulder.F.p;
  const hN = J.hip.N.p;
  const hF = J.hip.F.p;
  const torsoH = Math.abs(fs.pelvis.p[1] - fs.neck.p[1]);
  const endOn = torsoH < 16;
  const torsoDepth = (fs.neck.depth + fs.pelvis.depth) / 2;
  const fill = ghost ? '#94a3b8' : COLORS.near;
  let torsoNode: React.ReactNode;
  if (endOn) {
    const cy = (fs.neck.p[1] + fs.pelvis.p[1]) / 2;
    torsoNode = (
      <g key="torso">
        <ellipse cx={CX} cy={cy} rx={Math.abs(sN[0] - sF[0]) / 2 + 3} ry={9} fill={fill} stroke={ghost ? 'none' : COLORS.outline} strokeWidth={1.4} />
        {isWorked('torso') && <ellipse cx={CX} cy={cy} rx={Math.abs(sN[0] - sF[0]) / 2} ry={7} fill={COLORS.worked} opacity={glow * 0.85} filter={`url(#${ids}-glow)`} data-worked="torso" />}
      </g>
    );
  } else {
    const hw = (p: Vec, k: number): Vec => [CX + (p[0] - CX) * k, p[1]];
    const h1 = hw(hN, 1.45);
    const h2 = hw(hF, 1.45);
    const d = `M${sN[0]},${sN[1]} L${sF[0]},${sF[1]} L${h2[0]},${h2[1]} L${h1[0]},${h1[1]} Z`;
    const scapN = J.scap.N.p;
    const scapF = J.scap.F.p;
    const showBack = fs.view === 'back' && !ghost;
    torsoNode = (
      <g key="torso">
        <path d={d} fill={fill} stroke={ghost ? 'none' : COLORS.outline} strokeWidth={1.4} strokeLinejoin="round" />
        {isWorked('torso') && <path d={d} fill={COLORS.worked} opacity={glow * 0.8} filter={`url(#${ids}-glow)`} data-worked="torso" />}
        {showBack && (
          <g data-testid="frontal-scapulae">
            <line x1={CX} y1={fs.neck.p[1] + 2} x2={CX} y2={fs.pelvis.p[1] - 2} stroke="#475569" strokeWidth={1.2} strokeDasharray="1.5 2" />
            {[scapN, scapF].map((sc, i) => (
              <path key={i} d={`M${sc[0]},${sc[1] - 4} L${sc[0] + (sc[0] < CX ? -6 : 6)},${sc[1] - 2} L${sc[0]},${sc[1] + 9} Z`} fill="#94a3b8" stroke="#475569" strokeWidth={0.8} opacity={0.9} />
            ))}
          </g>
        )}
        {!showBack && !ghost && (
          <line x1={CX} y1={fs.neck.p[1] + 4} x2={CX} y2={fs.pelvis.p[1] - 4} stroke="#94a3b8" strokeWidth={0.8} opacity={0.6} />
        )}
      </g>
    );
  }
  items.push({ depth: torsoDepth, order: 2, node: torsoNode });

  const head = fs.head;
  items.push({
    depth: head.depth,
    order: 4,
    node: (
      <g key="head">
        <line x1={CX} y1={fs.neck.p[1]} x2={CX} y2={head.p[1]} stroke={ghost ? '#94a3b8' : COLORS.near} strokeWidth={6} strokeLinecap="round" />
        <circle cx={CX} cy={head.p[1]} r={BONES.headRadius} fill={ghost ? '#94a3b8' : fs.view === 'back' ? '#cbd5e1' : COLORS.head} stroke={ghost ? 'none' : COLORS.outline} strokeWidth={1.4} />
        {!ghost && fs.view === 'back' && <path d={`M${CX - 7},${head.p[1] - 4} Q${CX},${head.p[1] - 12} ${CX + 7},${head.p[1] - 4}`} fill="none" stroke="#64748b" strokeWidth={2} />}
      </g>
    ),
  });

  // far from the viewer first
  items.sort((a, b) => (viewerFront ? a.depth - b.depth : b.depth - a.depth) || a.order - b.order);
  return <g opacity={ghost ? 0.16 : 1}>{items.map((i) => i.node)}</g>;
}

export const FrontalFigure: React.FC<FrontalFigureProps> = ({ motion, cfg, progress, load, ids, showTrail, showGhosts }) => {
  const worked = useMemo(() => new Set(motion.worked), [motion]);
  const fs = useMemo(() => projectFrontal(buildSkeleton(poseAt(motion.frames, progress)), cfg, progress), [motion, cfg, progress]);
  const statics = useMemo(() => {
    const at = (p: number) => projectFrontal(buildSkeleton(poseAt(motion.frames, p)), cfg, p);
    const trail: Vec[] = [];
    for (let i = 0; i <= TRAIL_SAMPLES; i++) trail.push(frontalTrackPoint(at(i / TRAIL_SAMPLES), cfg));
    return { start: at(0), end: at(motion.order === 'loop' ? 0.5 : 1), trail };
  }, [motion, cfg]);

  const viewerFront = cfg.view === 'front';
  const propItems = cfg.props.map((p, i) => ({ p, i, depth: frontalPropAnchor(p, fs).depth }));
  const behind = propItems.filter((x) => (viewerFront ? x.depth < fs.neck.depth - 1 : x.depth > fs.neck.depth + 1));
  const front = propItems.filter((x) => !behind.includes(x));
  const tp = frontalTrackPoint(fs, cfg);
  const trail = statics.trail;
  const moving = trail.some((p) => dist(p, trail[0]) > 1.5);
  const toeN = fs.joints.toe.N.p;
  const toeF = fs.joints.toe.F.p;

  return (
    <g data-testid="diagram-frontal" data-view={cfg.view}>
      <line x1={0} y1={FLOOR_Y} x2={200} y2={FLOOR_Y} stroke="#334155" strokeWidth={1.5} />
      <ellipse cx={CX} cy={FLOOR_Y + 1.5} rx={30} ry={3} fill="#000" opacity={0.35} />
      {cfg.scenery.map((s, i) => (
        <FrontalScene key={i} s={s} />
      ))}

      {cfg.guide === 'midline' && (
        <g data-testid="frontal-guide">
          <line x1={CX} y1={-18} x2={CX} y2={FLOOR_Y} stroke="#38bdf8" strokeWidth={0.8} strokeDasharray="2 3" opacity={0.5} />
          <text x={CX + 3} y={-12} fontSize={6} fill="#7dd3fc" fontFamily="ui-monospace, monospace" opacity={0.85}>midline</text>
        </g>
      )}
      {cfg.guide === 'toes' && (
        <g data-testid="frontal-guide">
          {[toeN, toeF].map((t, i) => (
            <line key={i} x1={t[0]} y1={t[1]} x2={t[0]} y2={t[1] - 70} stroke="#38bdf8" strokeWidth={0.8} strokeDasharray="2 3" opacity={0.55} />
          ))}
          <text x={Math.max(toeN[0], toeF[0]) + 3} y={toeN[1] - 62} fontSize={6} fill="#7dd3fc" fontFamily="ui-monospace, monospace" opacity={0.85}>over toes</text>
        </g>
      )}

      {showGhosts && (
        <g data-testid="frontal-ghosts">
          <FrontalBody fs={statics.start} worked={worked} load={0} ghost ids={ids} />
          <FrontalBody fs={statics.end} worked={worked} load={0} ghost ids={ids} />
        </g>
      )}

      {behind.map((x) => (
        <FrontalPropShape key={`b${x.i}`} p={x.p} fs={fs} ids={ids} />
      ))}
      <FrontalBody fs={fs} worked={worked} load={load} ids={ids} />
      {front.map((x) => (
        <FrontalPropShape key={`f${x.i}`} p={x.p} fs={fs} ids={ids} />
      ))}

      {showTrail && moving && (
        <g data-testid="frontal-trajectory">
          <path d={pathFrom(trail)} fill="none" stroke="#020617" strokeWidth={4.2} strokeLinecap="round" opacity={0.75} />
          <path d={pathFrom(trail)} fill="none" stroke={`url(#${ids}-trail)`} strokeWidth={2} strokeDasharray="3.5 2.5" strokeLinecap="round" />
          <circle cx={trail[0][0]} cy={trail[0][1]} r={2.2} fill="#38bdf8" />
          <circle cx={trail[trail.length - 1][0]} cy={trail[trail.length - 1][1]} r={2.2} fill="#34d399" />
        </g>
      )}
      {showTrail && (
        <g>
          <circle cx={tp[0]} cy={tp[1]} r={6} fill="#38bdf8" opacity={0.25} />
          <circle cx={tp[0]} cy={tp[1]} r={2.6} fill="#e0f2fe" stroke="#0ea5e9" strokeWidth={1} />
        </g>
      )}
    </g>
  );
};

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
      <radialGradient id={`${ids}-bg`} cx="50%" cy="40%" r="75%">
        <stop offset="0%" stopColor="#13213a" />
        <stop offset="100%" stopColor="#020617" />
      </radialGradient>
      <filter id={`${ids}-glow`} x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="1.6" result="b" />
        <feMerge>
          <feMergeNode in="b" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <pattern id={`${ids}-grid`} width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.5" />
      </pattern>
    </defs>
  );
}

// ---------------------------------------------------------------------------
// Playback
// ---------------------------------------------------------------------------

const TICK_MS = 1000 / 60;
const TWEEN_SECONDS = 0.35;

type ViewMode = 'side' | 'frontal' | 'both';

function prefersReducedMotion(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

function phaseBadge(seg: TimelineSegment, order: MotionDef['order']): { text: string; dir: 'up' | 'down' | 'hold' } {
  if (seg.kind === 'holdStart') return { text: 'Phase: Setup / Lockout', dir: 'hold' };
  if (seg.kind === 'holdEnd') {
    if (order === 'eccentric-first') return { text: 'Phase: Bottom Contraction', dir: 'hold' };
    if (order === 'concentric-first') return { text: 'Phase: Peak Contraction', dir: 'hold' };
    if (order === 'hold') return { text: 'Phase: Hold Position', dir: 'hold' };
    return { text: 'Phase: Plant', dir: 'hold' };
  }
  const secs = seg.tempoChar ? (seg.tempoChar === 'X' ? ' · explosive' : ` · ${seg.tempoChar}s`) : '';
  return { text: `Phase: ${seg.label}${secs}`, dir: seg.action === 'eccentric' ? 'down' : 'up' };
}

const ExerciseDiagramComponent: React.FC<ExerciseDiagramProps> = ({
  diagramType,
  exerciseName = '',
  forcedPhase,
  compact = false,
  onOpenZoom,
  className = '',
  tempo = '30X1',
}) => {
  const ids = `ed${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const motion = useMemo(() => getMotion(diagramType), [diagramType]);
  const timeline = useMemo(() => buildTimeline(tempo, motion.order), [tempo, motion.order]);
  const total = timelineDuration(timeline);

  const [isLooping, setIsLooping] = useState<boolean>(() => !compact && !forcedPhase && !prefersReducedMotion());
  const [speed, setSpeed] = useState<0.5 | 1>(1);
  const [showTrail, setShowTrail] = useState(true);
  const [showGhosts, setShowGhosts] = useState(true);
  const frontalCfg = useMemo(() => getFrontal(diagramType), [diagramType]);
  const [viewMode, setViewMode] = useState<ViewMode>('both');
  const [clock, setClock] = useState(0); // seconds into the loop
  // manual / forced target: 0 start, 1 end; animated toward with a short tween
  const [target, setTarget] = useState<0 | 1>(forcedPhase === 'bottom' ? 1 : 0);
  const [manual, setManual] = useState<number>(forcedPhase === 'bottom' ? 1 : 0);
  const lastTick = useRef<number>(Date.now());

  useEffect(() => {
    if (forcedPhase) {
      setIsLooping(false);
      setTarget(forcedPhase === 'bottom' ? 1 : 0);
    }
  }, [forcedPhase]);

  // single ticker drives both the loop clock and the manual tween
  const needsTween = manual !== target;
  useEffect(() => {
    if (!isLooping && !needsTween) return;
    lastTick.current = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      const dt = Math.min(0.1, (now - lastTick.current) / 1000);
      lastTick.current = now;
      if (isLooping) {
        setClock((c) => (c + dt * speed) % total);
      } else {
        setManual((m) => {
          const step = dt / TWEEN_SECONDS;
          if (Math.abs(target - m) <= step) return target;
          return m + Math.sign(target - m) * step;
        });
      }
    }, TICK_MS);
    return () => clearInterval(id);
  }, [isLooping, needsTween, speed, total, target]);

  const state = isLooping ? timelineAt(timeline, clock) : null;
  const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const progress = state ? state.progress : ease(manual);
  const load = state ? state.load : 0.35 + 0.5 * manual;

  const badge = state
    ? phaseBadge(state.segment, motion.order)
    : target === 1
    ? phaseBadge({ kind: 'holdEnd' } as TimelineSegment, motion.order)
    : phaseBadge({ kind: 'holdStart' } as TimelineSegment, motion.order);
  const atEnd = state ? state.segment.kind === 'holdEnd' || state.segment.kind === 'toEnd' : target === 1;

  if (compact) {
    return (
      <button
        type="button"
        onClick={onOpenZoom}
        title={`View form demonstration for ${exerciseName}`}
        aria-label={`View form demonstration for ${exerciseName}`}
        className={`group relative w-11 h-11 rounded-xl bg-slate-900 border border-slate-700/80 hover:border-emerald-500/80 transition-all flex items-center justify-center overflow-hidden flex-shrink-0 cursor-pointer shadow-sm hover:shadow-emerald-950/40 ${className}`}
      >
        <svg viewBox="10 -20 180 205" className="w-10 h-10" aria-hidden="true">
          <Defs ids={ids} />
          <MotionFigure
            motion={motion}
            progress={forcedPhase ? progress : 0.65}
            load={forcedPhase ? load : 0.8}
            ids={ids}
            detailed={false}
            showTrail={false}
            showGhosts={false}
          />
        </svg>
        <div className="absolute inset-0 bg-emerald-500/0 group-hover:bg-emerald-500/10 transition-colors flex items-center justify-center">
          <ZoomIn className="w-3.5 h-3.5 text-emerald-300 opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
        </div>
      </button>
    );
  }

  const goTo = (end: 0 | 1) => {
    if (isLooping && state) setManual(state.progress);
    setIsLooping(false);
    setTarget(end);
  };

  const playheadPct = state ? (clock / total) * 100 : null;

  return (
    <div
      data-testid="exercise-diagram"
      className={`relative bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-inner ${className}`}
    >
      {/* Controls */}
      <div className="flex items-center justify-between gap-2 px-3 py-2.5 bg-slate-900/80 border-b border-slate-800/80 flex-wrap">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => goTo(0)}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
              !isLooping && target === 0 ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
          >
            1. Setup / Lockout
          </button>
          <button
            type="button"
            onClick={() => goTo(1)}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
              !isLooping && target === 1 ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
          >
            2. Peak Contraction / Depth
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowTrail((v) => !v)}
            aria-pressed={showTrail}
            title="Show trajectory"
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              showTrail ? 'bg-sky-500/15 border-sky-500/40 text-sky-300' : 'bg-slate-800 border-slate-700 text-slate-500'
            }`}
          >
            <Route className="w-3.5 h-3.5" />
            <span className="sr-only">Toggle trajectory</span>
          </button>
          <button
            type="button"
            onClick={() => setShowGhosts((v) => !v)}
            aria-pressed={showGhosts}
            title="Show start and end ghosts"
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              showGhosts ? 'bg-sky-500/15 border-sky-500/40 text-sky-300' : 'bg-slate-800 border-slate-700 text-slate-500'
            }`}
          >
            {showGhosts ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span className="sr-only">Toggle ghost poses</span>
          </button>
          <button
            type="button"
            onClick={() => setSpeed((s) => (s === 1 ? 0.5 : 1))}
            title="Playback speed"
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-mono font-semibold border bg-slate-800 border-slate-700 text-slate-300 hover:text-white cursor-pointer"
          >
            <Gauge className="w-3 h-3" />
            {speed === 1 ? '1×' : '½×'}
          </button>
          <button
            type="button"
            onClick={() => {
              if (!isLooping) {
                // resume from wherever the figure is
                setClock(manual >= 0.5 ? timeline.slice(0, 2).reduce((a, s) => a + s.seconds, 0) : 0);
              }
              setIsLooping(!isLooping);
            }}
            title={isLooping ? 'Pause animation loop' : 'Auto-play motion demonstration'}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
              isLooping ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            {isLooping ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            <span className="hidden sm:inline">{isLooping ? 'Looping' : 'Auto-Play'}</span>
          </button>
          {onOpenZoom && (
            <button
              type="button"
              onClick={onOpenZoom}
              aria-label="Zoom diagram"
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* View selector */}
      <div className="flex items-center gap-1.5 px-3 pt-2.5" role="radiogroup" aria-label="Camera view">
        {(
          [
            { id: 'side', label: 'Side' },
            { id: 'frontal', label: frontalCfg.label },
            { id: 'both', label: 'Both' },
          ] as { id: ViewMode; label: string }[]
        ).map((v) => (
          <button
            key={v.id}
            type="button"
            role="radio"
            aria-checked={viewMode === v.id}
            data-testid={`diagram-view-${v.id}`}
            onClick={() => setViewMode(v.id)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold border transition-colors cursor-pointer ${
              viewMode === v.id ? 'bg-sky-500/20 border-sky-500/50 text-sky-200' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Canvas */}
      <div
        className={`relative w-full grid ${
          viewMode === 'both' ? 'h-[30rem] grid-rows-2 grid-cols-1 sm:h-72 sm:grid-rows-1 sm:grid-cols-2' : 'h-64 sm:h-72 grid-cols-1'
        }`}
      >
        {viewMode !== 'frontal' && (
          <div className="relative min-w-0 min-h-0 h-full">
            <svg
              viewBox="0 -24 200 216"
              className="absolute inset-0 w-full h-full"
              role="img"
              aria-label={`${exerciseName || motion.title} motion demonstration, side view`}
            >
              <Defs ids={ids} />
              <rect x={-200} y={-100} width={600} height={400} fill={`url(#${ids}-bg)`} />
              <rect x={-200} y={-100} width={600} height={400} fill={`url(#${ids}-grid)`} />
              <MotionFigure
                motion={motion}
                progress={progress}
                load={load}
                ids={ids}
                detailed
                showTrail={showTrail}
                showGhosts={showGhosts}
              />
            </svg>
            <span className="absolute top-2.5 left-3 text-[10px] font-mono font-bold uppercase text-slate-400">Side</span>
            {showTrail && (
              <div className="absolute top-2.5 right-3 text-[10px] font-mono text-sky-300 bg-slate-900/80 border border-sky-500/30 rounded-lg px-2 py-0.5 backdrop-blur-sm flex items-center gap-1 max-w-[70%] truncate">
                <span className="w-3 border-t border-dashed border-sky-400 shrink-0" />
                {motion.trackLabel}
              </div>
            )}
          </div>
        )}
        {viewMode !== 'side' && (
          <div className={`relative min-w-0 min-h-0 h-full ${viewMode === 'both' ? 'border-t sm:border-t-0 sm:border-l border-slate-800' : ''}`}>
            <svg
              viewBox="0 -24 200 216"
              className="absolute inset-0 w-full h-full"
              role="img"
              aria-label={`${exerciseName || motion.title} motion demonstration, ${frontalCfg.label.toLowerCase()} view`}
            >
              <Defs ids={`${ids}f`} />
              <rect x={-200} y={-100} width={600} height={400} fill={`url(#${ids}f-bg)`} />
              <rect x={-200} y={-100} width={600} height={400} fill={`url(#${ids}f-grid)`} />
              <FrontalFigure
                motion={motion}
                cfg={frontalCfg}
                progress={progress}
                load={load}
                ids={`${ids}f`}
                showTrail={showTrail}
                showGhosts={showGhosts}
              />
            </svg>
            <span className="absolute top-2.5 left-3 text-[10px] font-mono font-bold uppercase text-slate-400">{frontalCfg.label}</span>
            {showTrail && (
              <div className="absolute top-2.5 right-3 text-[10px] font-mono text-sky-300 bg-slate-900/80 border border-sky-500/30 rounded-lg px-2 py-0.5 backdrop-blur-sm flex items-center gap-1 max-w-[70%] truncate">
                <span className="w-3 border-t border-dashed border-sky-400 shrink-0" />
                {frontalCfg.track.label}
              </div>
            )}
          </div>
        )}

        {/* Phase badge */}
        <div className="absolute bottom-2.5 right-3 bg-slate-900/90 border border-slate-700/80 rounded-lg px-2 py-0.5 text-[11px] font-mono text-slate-300 flex items-center gap-1.5 shadow backdrop-blur-sm">
          {badge.dir === 'down' || (badge.dir === 'hold' && atEnd) ? (
            <ArrowDown className="w-3 h-3 text-emerald-400" />
          ) : (
            <ArrowUp className="w-3 h-3 text-cyan-400" />
          )}
          <span data-testid="diagram-phase-badge" className={atEnd ? 'text-emerald-300 font-semibold' : 'text-cyan-300 font-semibold'}>
            {badge.text}
          </span>
        </div>
      </div>

      {/* Tempo timeline */}
      <div className="px-3 pb-3 pt-2 bg-slate-900/60 border-t border-slate-800/80">
        <p data-testid="diagram-cue" className="text-xs font-semibold text-slate-200 mb-2 flex items-start gap-1.5">
          <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${atEnd ? 'bg-emerald-400' : 'bg-cyan-400'}`} />
          <span>{atEnd ? motion.endCue : motion.startCue}</span>
        </p>
        {viewMode !== 'side' && (
          <p data-testid="diagram-frontal-cue" className="text-[11px] text-sky-200/90 -mt-1 mb-2 pl-3">
            {frontalCfg.label} view: {frontalCfg.cue}
          </p>
        )}
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
          <span>
            {motion.order === 'hold' || motion.order === 'cycle' || motion.order === 'loop' ? 'Rhythm' : `Tempo ${tempo}`}
          </span>
          <span>{total.toFixed(1)}s / rep</span>
        </div>
        <div data-testid="diagram-timeline" className="relative flex h-5 rounded-md overflow-hidden border border-slate-800">
          {timeline.map((seg, i) => {
            const w = (seg.seconds / total) * 100;
            const active = state?.index === i;
            const color =
              seg.action === 'eccentric'
                ? 'bg-emerald-500/25 text-emerald-200'
                : seg.action === 'concentric'
                ? 'bg-cyan-500/25 text-cyan-200'
                : seg.action === 'hold'
                ? 'bg-amber-500/25 text-amber-200'
                : seg.action === 'move'
                ? 'bg-sky-500/20 text-sky-200'
                : 'bg-slate-700/40 text-slate-300';
            return (
              <div
                key={i}
                style={{ width: `${w}%` }}
                className={`${color} flex items-center justify-center text-[9px] font-mono truncate border-r border-slate-900/80 last:border-r-0 ${
                  active ? 'ring-1 ring-inset ring-white/40' : ''
                }`}
                title={`${seg.label} ${seg.seconds.toFixed(1)}s`}
              >
                {w > 9 ? `${seg.label}${seg.tempoChar ? ` ${seg.tempoChar}` : ''}` : ''}
              </div>
            );
          })}
          {playheadPct !== null && (
            <div className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]" style={{ left: `${playheadPct}%` }} />
          )}
        </div>
      </div>
    </div>
  );
};

export const ExerciseDiagram = React.memo(ExerciseDiagramComponent);
