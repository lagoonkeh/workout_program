// src/components/ObliqueFigure.tsx
/**
 * Front 3/4, rear 3/4 and top-down views of the motion demo. The figure, implements and equipment
 * are 3-D (see domain/obliqueView) and drawn back to front by their depth from the camera.
 */
import React, { useMemo } from 'react';
import { BONES, buildSkeleton, poseAt, type SegmentId, type Vec } from '../domain/motionRig';
import { FLOOR_Y, type MotionDef } from '../domain/motionLibrary';
import type { FrontalConfig } from '../domain/frontalView';
import {
  LIMBS3,
  SCENE3D,
  add3,
  build3D,
  dot3,
  cameraFor,
  props3D,
  scale3,
  sub3,
  track3D,
  type ObliqueCamera,
  type Projector,
  type Prop3,
  type Scene3,
  type Skeleton3,
  type Vec3,
} from '../domain/obliqueView';

const TRAIL_SAMPLES = 48;

const C = {
  near: '#cbd5e1',
  far: '#8796ab',
  outline: '#0b1220',
  head: '#e2e8f0',
  worked: '#10b981',
  workedFar: '#059669',
  steel: '#475569',
  bar: '#94a3b8',
  cable: '#fbbf24',
};

const LIMB_W: Partial<Record<SegmentId, number>> = {
  uaN: 8.5, uaF: 8.5, faN: 7, faF: 7, thN: 11.5, thF: 11.5, shN: 8.5, shF: 8.5, ftN: 4.5, ftF: 4.5,
};

type Item = { d: number; node: React.ReactNode };

const f1 = (n: number) => n.toFixed(1);
const pts = (ps: Vec[]) => ps.map((p) => `${f1(p[0])},${f1(p[1])}`).join(' ');
const pathFrom = (ps: Vec[]) => ps.map((p, i) => `${i ? 'L' : 'M'}${f1(p[0])},${f1(p[1])}`).join(' ');

/** Convex hull (monotone chain) of projected points. */
function hull(points: Vec[]): Vec[] {
  const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cross = (o: Vec, a: Vec, b: Vec) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: Vec[] = [];
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop();
    lower.push(q);
  }
  const upper: Vec[] = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop();
    upper.push(q);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

/** Outline of a disc of radius r centred on c, lying in the plane spanned by a and b. */
function disc(pr: Projector, c: Vec3, r: number, a: Vec3, b: Vec3, n = 20): Vec[] {
  const out: Vec[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    out.push(pr.project(add3(c, add3(scale3(a, Math.cos(t) * r), scale3(b, Math.sin(t) * r)))).p);
  }
  return out;
}
const X3: Vec3 = [1, 0, 0];
const Y3: Vec3 = [0, 1, 0];
const Z3: Vec3 = [0, 0, 1];

// ---------------------------------------------------------------------------
// Body
// ---------------------------------------------------------------------------

function bodyItems(s3: Skeleton3, pr: Projector, worked: Set<SegmentId>, load: number, ghost: boolean, ids: string): Item[] {
  const P = (v: Vec3) => pr.project(v);
  const items: Item[] = [];
  const glow = 0.35 + 0.65 * load;
  const pelvisD = P(s3.j.pelvis).d;

  LIMBS3.forEach((l) => {
    const a = P(s3.j[l.a]);
    const b = P(s3.j[l.b]);
    const d = (a.d + b.d) / 2;
    const w = LIMB_W[l.seg] ?? 7;
    const far = pr.cam !== 'top' && d < pelvisD - 3;
    const color = ghost ? '#94a3b8' : far ? C.far : C.near;
    items.push({
      d,
      node: (
        <g key={l.seg}>
          {!ghost && <line x1={a.p[0]} y1={a.p[1]} x2={b.p[0]} y2={b.p[1]} stroke={C.outline} strokeWidth={w + 2.4} strokeLinecap="round" />}
          <line x1={a.p[0]} y1={a.p[1]} x2={b.p[0]} y2={b.p[1]} stroke={color} strokeWidth={w} strokeLinecap="round" />
          {!ghost && worked.has(l.seg) && (
            <line
              x1={a.p[0]} y1={a.p[1]} x2={b.p[0]} y2={b.p[1]}
              stroke={far ? C.workedFar : C.worked} strokeWidth={w - 2} strokeLinecap="round"
              opacity={glow} filter={`url(#${ids}-glow)`} data-worked={l.seg}
            />
          )}
        </g>
      ),
    });
  });

  // torso: hull of three elliptical rings (hips, chest, shoulders) around the spine
  const halfW = (a: Vec3, b: Vec3) => (Math.abs(a[2]) + Math.abs(b[2])) / 2;
  const shoulderW = halfW(s3.j.shoulderN, s3.j.shoulderF);
  const hipW = halfW(s3.j.hipN, s3.j.hipF) * 1.45;
  const spine = sub3(s3.j.neck, s3.j.pelvis);
  const ring = (c: Vec3, w: number, depth: number): Vec[] => disc(pr, c, 1, scale3(Z3, w), scale3(s3.forward, depth), 12);
  const torsoPts = [
    ...ring(s3.j.pelvis, hipW, 6.5),
    ...ring(add3(s3.j.pelvis, scale3(spine, 0.72)), shoulderW * 0.95, 9),
    ...ring(s3.j.neck, shoulderW, 6),
  ];
  const outline = hull(torsoPts);
  const torsoD = (P(s3.j.pelvis).d + P(s3.j.neck).d) / 2;
  const fill = ghost ? '#94a3b8' : C.near;
  items.push({
    d: torsoD,
    node: (
      <g key="torso">
        <polygon points={pts(outline)} fill={fill} stroke={ghost ? 'none' : C.outline} strokeWidth={1.4} strokeLinejoin="round" />
        {!ghost && worked.has('torso') && (
          <polygon points={pts(outline)} fill={C.worked} opacity={glow * 0.8} filter={`url(#${ids}-glow)`} data-worked="torso" />
        )}
      </g>
    ),
  });

  // shoulder blades on the back, when the back faces the camera
  if (!ghost && dot3(s3.forward, pr.toCamera) < 0.15) {
    const scaps = (['N', 'F'] as const).map((s) => {
      const c = s3.j[`scap${s}`];
      const out = Math.sign(c[2]) || 1;
      const tri: Vec3[] = [add3(c, scale3(s3.up, 4)), add3(add3(c, scale3(s3.up, 2)), [0, 0, out * 6]), sub3(c, scale3(s3.up, 9))];
      return <polygon key={s} points={pts(tri.map((t) => P(t).p))} fill="#94a3b8" stroke="#475569" strokeWidth={0.8} opacity={0.9} />;
    });
    // the spine down the back (flat or rounding) and the hip line (square or dropping)
    const back = (v: Vec3) => P(sub3(v, scale3(s3.forward, 6.5))).p;
    const sp0 = back(add3(s3.j.pelvis, scale3(s3.up, 3)));
    const sp1 = back(sub3(s3.j.neck, scale3(s3.up, 3)));
    const hN = back(s3.j.hipN);
    const hF = back(s3.j.hipF);
    items.push({
      d: torsoD + 0.5,
      node: (
        <g key="scap" data-testid="oblique-scapulae">
          <line x1={sp0[0]} y1={sp0[1]} x2={sp1[0]} y2={sp1[1]} stroke="#475569" strokeWidth={1.3} strokeDasharray="1.5 2" data-testid="oblique-spine" />
          <line x1={hN[0]} y1={hN[1]} x2={hF[0]} y2={hF[1]} stroke="#38bdf8" strokeWidth={1.1} opacity={0.8} data-testid="oblique-hip-line" />
          {scaps}
        </g>
      ),
    });
  }

  // from above: shoulder line against hip line shows any torso twist
  if (!ghost && pr.cam === 'top') {
    const sN = P(s3.j.shoulderN).p;
    const sF = P(s3.j.shoulderF).p;
    const hN = P(s3.j.hipN).p;
    const hF = P(s3.j.hipF).p;
    items.push({
      d: P(s3.j.neck).d + 0.1,
      node: (
        <g key="twist" data-testid="oblique-twist-lines">
          <line x1={hN[0]} y1={hN[1]} x2={hF[0]} y2={hF[1]} stroke="#38bdf8" strokeWidth={1.4} strokeLinecap="round" opacity={0.85} />
          <line x1={sN[0]} y1={sN[1]} x2={sF[0]} y2={sF[1]} stroke="#34d399" strokeWidth={1.4} strokeLinecap="round" opacity={0.9} />
        </g>
      ),
    });
  }

  const head = P(s3.j.head);
  const neck = P(s3.j.neck);
  const faceTo = dot3(s3.face, pr.toCamera);
  const nose = P(add3(s3.j.head, scale3(s3.face, BONES.headRadius * 0.8)));
  items.push({
    d: head.d + 0.3,
    node: (
      <g key="head">
        <line x1={neck.p[0]} y1={neck.p[1]} x2={head.p[0]} y2={head.p[1]} stroke={ghost ? '#94a3b8' : C.near} strokeWidth={6} strokeLinecap="round" />
        <circle cx={head.p[0]} cy={head.p[1]} r={BONES.headRadius} fill={ghost ? '#94a3b8' : C.head} stroke={ghost ? 'none' : C.outline} strokeWidth={1.4} />
        {!ghost && faceTo > -0.35 && <circle cx={nose.p[0]} cy={nose.p[1]} r={1.9} fill="#64748b" data-testid="oblique-face" />}
      </g>
    ),
  });
  return items;
}

// ---------------------------------------------------------------------------
// Props and equipment
// ---------------------------------------------------------------------------

function propItems(props: Prop3[], pr: Projector, ids: string): Item[] {
  const P = (v: Vec3) => pr.project(v);
  const items: Item[] = [];
  props.forEach((p, i) => {
    switch (p.kind) {
      case 'bar': {
        const n = 8;
        for (let k = 0; k < n; k++) {
          const a = P(add3(p.c, [0, 0, -p.half + (2 * p.half * k) / n]));
          const b = P(add3(p.c, [0, 0, -p.half + (2 * p.half * (k + 1)) / n]));
          items.push({
            d: (a.d + b.d) / 2 - 0.2,
            node: <line key={`bar${i}-${k}`} x1={a.p[0]} y1={a.p[1]} x2={b.p[0]} y2={b.p[1]} stroke="#cbd5e1" strokeWidth={2.6} strokeLinecap="round" />,
          });
        }
        [-1, 1].forEach((side) =>
          (
            [
              [6, 13.5],
              [12, 11],
            ] as const
          ).forEach(([inset, r]) => {
            const c = add3(p.c, [0, 0, side * (p.half - inset)]);
            items.push({
              d: P(c).d,
              node: (
                <polygon
                  key={`plate${i}-${side}-${inset}`}
                  points={pts(disc(pr, c, r, X3, Y3))}
                  fill={`url(#${ids}-plate)`}
                  stroke="#78350f"
                  strokeWidth={0.9}
                  strokeLinejoin="round"
                />
              ),
            });
          })
        );
        break;
      }
      case 'kettlebell': {
        const c = P(p.c);
        const top = pr.cam === 'top';
        items.push({
          d: c.d + 0.4,
          node: (
            <g key={`kb${i}`} data-oblique-prop="kettlebell">
              {top ? (
                <line x1={c.p[0] - 4.5} y1={c.p[1]} x2={c.p[0] + 4.5} y2={c.p[1]} stroke="#92400e" strokeWidth={2.4} strokeLinecap="round" />
              ) : (
                <path d={`M${f1(c.p[0] - 4.5)},${f1(c.p[1] - 6)} Q${f1(c.p[0])},${f1(c.p[1] - 14)} ${f1(c.p[0] + 4.5)},${f1(c.p[1] - 6)}`} fill="none" stroke="#92400e" strokeWidth={2.4} strokeLinecap="round" />
              )}
              <circle cx={c.p[0]} cy={c.p[1]} r={7.5} fill={`url(#${ids}-plate)`} stroke="#78350f" strokeWidth={1} />
            </g>
          ),
        });
        break;
      }
      case 'dumbbell': {
        const a = add3(p.c, [0, 0, -6]);
        const b = add3(p.c, [0, 0, 6]);
        items.push({
          d: P(p.c).d + 0.4,
          node: (
            <g key={`db${i}`}>
              <line x1={P(a).p[0]} y1={P(a).p[1]} x2={P(b).p[0]} y2={P(b).p[1]} stroke="#cbd5e1" strokeWidth={2} />
              {[a, b].map((e, k) => (
                <polygon key={k} points={pts(disc(pr, e, 5, X3, Y3, 12))} fill={`url(#${ids}-plate)`} stroke="#78350f" strokeWidth={0.8} />
              ))}
            </g>
          ),
        });
        break;
      }
      case 'club': {
        const h = P(p.hand);
        const t = P(p.tip);
        const mid: Vec = [h.p[0] + (t.p[0] - h.p[0]) * 0.6, h.p[1] + (t.p[1] - h.p[1]) * 0.6];
        items.push({
          d: (h.d + t.d) / 2 + 0.4,
          node: (
            <g key={`club${i}`}>
              <line x1={h.p[0]} y1={h.p[1]} x2={mid[0]} y2={mid[1]} stroke="#b45309" strokeWidth={3} strokeLinecap="round" />
              <line x1={mid[0]} y1={mid[1]} x2={t.p[0]} y2={t.p[1]} stroke="#f59e0b" strokeWidth={7.5} strokeLinecap="round" />
            </g>
          ),
        });
        break;
      }
      case 'cable': {
        const a = P(p.anchor);
        p.hands.forEach((hv, k) => {
          const h = P(hv);
          items.push({
            d: (a.d + h.d) / 2,
            node: <line key={`cable${i}-${k}`} x1={a.p[0]} y1={a.p[1]} x2={h.p[0]} y2={h.p[1]} stroke={C.cable} strokeWidth={1.5} strokeDasharray="3 2" />,
          });
        });
        items.push({ d: a.d, node: <circle key={`anchor${i}`} cx={a.p[0]} cy={a.p[1]} r={3} fill={C.steel} /> });
        break;
      }
    }
  });
  return items;
}

const TONE: Record<'pad' | 'steel' | 'wall' | 'plate', { fill: string; side: string; stroke: string }> = {
  pad: { fill: '#52525b', side: '#3f3f46', stroke: '#71717a' },
  steel: { fill: '#475569', side: '#334155', stroke: '#64748b' },
  wall: { fill: '#1e293b', side: '#111c30', stroke: '#334155' },
  plate: { fill: '#374151', side: '#1f2937', stroke: '#b45309' },
};

/** Equipment split into what sits behind the lifter and what has to be depth-sorted with them. */
function sceneItems(scene: Scene3[], pr: Projector, pelvisD: number): { back: React.ReactNode[]; sorted: Item[]; front: React.ReactNode[] } {
  const P = (v: Vec3) => pr.project(v);
  const back: React.ReactNode[] = [];
  const front: React.ReactNode[] = [];
  const sorted: Item[] = [];
  scene.forEach((s, i) => {
    if (s.kind === 'box') {
      const [x0, y0, z0] = s.min;
      const [x1, y1, z1] = s.max;
      const corner = (x: number, y: number, z: number): Vec3 => [x, y, z];
      const faces: { n: Vec3; q: Vec3[]; lit: boolean }[] = [
        { n: [0, -1, 0], q: [corner(x0, y0, z0), corner(x1, y0, z0), corner(x1, y0, z1), corner(x0, y0, z1)], lit: true },
        { n: [1, 0, 0], q: [corner(x1, y0, z0), corner(x1, y0, z1), corner(x1, y1, z1), corner(x1, y1, z0)], lit: false },
        { n: [-1, 0, 0], q: [corner(x0, y0, z0), corner(x0, y0, z1), corner(x0, y1, z1), corner(x0, y1, z0)], lit: false },
        { n: [0, 0, 1], q: [corner(x0, y0, z1), corner(x1, y0, z1), corner(x1, y1, z1), corner(x0, y1, z1)], lit: true },
        { n: [0, 0, -1], q: [corner(x0, y0, z0), corner(x1, y0, z0), corner(x1, y1, z0), corner(x0, y1, z0)], lit: true },
      ];
      const t = TONE[s.tone];
      const visible = faces.filter((f) => dot3(f.n, pr.toCamera) > 1e-6);
      const centre: Vec3 = [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2];
      const nearer = P(centre).d > pelvisD;
      const node = (
        <g key={`box${i}`} opacity={s.tone === 'wall' && nearer ? 0.28 : 1} data-oblique-scene={s.tone}>
          {visible.map((f, k) => (
            <polygon key={k} points={pts(f.q.map((q) => P(q).p))} fill={f.lit ? t.fill : t.side} stroke={t.stroke} strokeWidth={0.9} strokeLinejoin="round" />
          ))}
        </g>
      );
      // a wall between the camera and the lifter is drawn see-through on top; everything else sits behind
      if (s.tone === 'wall' && nearer) front.push(node);
      else back.push(node);
    } else if (s.kind === 'rod') {
      const n = Math.max(1, Math.round(Math.hypot(...sub3(s.b, s.a)) / 12));
      for (let k = 0; k < n; k++) {
        const a = P(add3(s.a, scale3(sub3(s.b, s.a), k / n)));
        const b = P(add3(s.a, scale3(sub3(s.b, s.a), (k + 1) / n)));
        sorted.push({
          d: (a.d + b.d) / 2,
          node: (
            <line key={`rod${i}-${k}`} x1={a.p[0]} y1={a.p[1]} x2={b.p[0]} y2={b.p[1]} stroke={s.tone === 'bar' ? C.bar : C.steel} strokeWidth={s.w} strokeLinecap="round" />
          ),
        });
      }
    } else {
      sorted.push({
        d: P(s.c).d,
        node: <polygon key={`wheel${i}`} points={pts(disc(pr, s.c, s.r, X3, Y3))} fill="#111827" stroke={C.steel} strokeWidth={2} />,
      });
    }
  });
  return { back, sorted, front };
}

// ---------------------------------------------------------------------------
// Figure
// ---------------------------------------------------------------------------

export interface ObliqueFigureProps {
  motion: MotionDef;
  type: string;
  cfg: FrontalConfig;
  cam: ObliqueCamera;
  progress: number;
  load: number;
  ids: string;
  showTrail: boolean;
  showGhosts: boolean;
}

const frame = (motion: MotionDef, cfg: FrontalConfig, p: number) => {
  const sk = buildSkeleton(poseAt(motion.frames, p));
  const s3 = build3D(sk, cfg, p);
  const props = props3D(motion, cfg, sk, s3);
  return { sk, s3, props, track: track3D(motion, sk, s3, props) };
};

export const ObliqueFigure: React.FC<ObliqueFigureProps> = ({ motion, type, cfg, cam, progress, load, ids, showTrail, showGhosts }) => {
  const worked = useMemo(() => new Set(motion.worked), [motion]);
  const pr = useMemo(() => cameraFor(motion, type, cfg, cam), [cam, motion, type, cfg]);
  const scene = SCENE3D[type as keyof typeof SCENE3D] ?? [];
  const cur = useMemo(() => frame(motion, cfg, progress), [motion, cfg, progress]);

  const statics = useMemo(() => {
    const trail: Vec[] = [];
    for (let i = 0; i <= TRAIL_SAMPLES; i++) trail.push(pr.project(frame(motion, cfg, i / TRAIL_SAMPLES).track).p);
    return {
      trail,
      start: frame(motion, cfg, 0).s3,
      end: frame(motion, cfg, motion.order === 'loop' ? 0.5 : 1).s3,
    };
  }, [motion, cfg, pr]);

  const pelvis = pr.project(cur.s3.j.pelvis);
  const sc = sceneItems(scene, pr, pelvis.d);
  const items = [...bodyItems(cur.s3, pr, worked, load, false, ids), ...propItems(cur.props, pr, ids), ...sc.sorted].sort((a, b) => a.d - b.d);
  const tp = pr.project(cur.track).p;
  const trail = statics.trail;
  const moving = trail.some((p) => Math.hypot(p[0] - trail[0][0], p[1] - trail[0][1]) > 1.5);
  const ghostNodes = (s3: Skeleton3) =>
    bodyItems(s3, pr, worked, 0, true, ids)
      .sort((a, b) => a.d - b.d)
      .map((it) => it.node);

  const top = cam === 'top';
  const feet = (['N', 'F'] as const).map((s) => pr.project(cur.s3.j[`ankle${s}`]).p);

  return (
    <g data-testid="diagram-oblique" data-view={cam}>
      {top ? (
        <g data-testid="oblique-floor">
          {/* the line the lifter faces along, through the hips */}
          <line x1={pelvis.p[0]} y1={-18} x2={pelvis.p[0]} y2={186} stroke="#38bdf8" strokeWidth={0.8} strokeDasharray="2 3" opacity={0.45} />
          <text x={4} y={188} fontSize={6} fill="#7dd3fc" fontFamily="ui-monospace, monospace" opacity={0.85}>
            {'↑ faces up the screen'}
          </text>
          {feet.map((f, i) =>
            cur.s3.j[i ? 'ankleF' : 'ankleN'][1] > FLOOR_Y - 8 ? <ellipse key={i} cx={f[0]} cy={f[1]} rx={6} ry={8} fill="#000" opacity={0.3} /> : null
          )}
        </g>
      ) : (
        <g data-testid="oblique-floor">
          {/* floor tiles seen at an angle */}
          {Array.from({ length: 9 }, (_, k) => -80 + k * 20).map((o) => {
            const x0 = pr.x0;
            const a = pr.project([x0 + o, FLOOR_Y, -90]).p;
            const b = pr.project([x0 + o, FLOOR_Y, 90]).p;
            const c = pr.project([x0 - 90, FLOOR_Y, o]).p;
            const d = pr.project([x0 + 90, FLOOR_Y, o]).p;
            return (
              <g key={o} stroke="#334155" strokeWidth={0.6} opacity={0.55}>
                <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} />
                <line x1={c[0]} y1={c[1]} x2={d[0]} y2={d[1]} />
              </g>
            );
          })}
          {(['N', 'F'] as const).map((s) => {
            const an = cur.s3.j[`ankle${s}`];
            if (an[1] < FLOOR_Y - 10) return null;
            const sh = disc(pr, [an[0] + 4, FLOOR_Y, an[2]], 1, scale3(X3, 10), scale3(Z3, 5), 14);
            return <polygon key={s} points={pts(sh)} fill="#000" opacity={0.35} />;
          })}
        </g>
      )}

      {sc.back}

      {showGhosts && (
        <g data-testid="oblique-ghosts" opacity={0.16}>
          {ghostNodes(statics.start)}
          {ghostNodes(statics.end)}
        </g>
      )}

      {items.map((it) => it.node)}
      {sc.front}

      {showTrail && moving && (
        <g data-testid="oblique-trajectory">
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
