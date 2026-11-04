import { describe, it, expect } from 'vitest';
import { MOTIONS, FLOOR_Y, type MotionDef } from '../../src/domain/motionLibrary';
import { buildSkeleton, poseAt, jointAngle, BONES, type Skeleton, type Vec, type LimbSpec, type PoseSpec } from '../../src/domain/motionRig';

/** Frame-by-frame anatomy checks for every demo: things a viewer would see as a "broken" animation. */
const STEPS = 40;
const JOINTS = ['hip', 'neck', 'head', 'elbowN', 'handN', 'elbowF', 'handF', 'kneeN', 'ankleN', 'toeN', 'kneeF', 'ankleF', 'toeF'] as const;
const cross = (a: Vec, b: Vec, c: Vec) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
const dist = (a: Vec, b: Vec) => Math.hypot(a[0] - b[0], a[1] - b[1]);

// Wall slides move in the frontal plane; the 2-D side rig cannot show W -> Y without the elbow crossing over.
const FRONTAL_PLANE_ONLY = new Set(['warmup_wall_slide']);

function sample(m: MotionDef) {
  const poses: PoseSpec[] = [];
  const sks: Skeleton[] = [];
  for (let i = 0; i <= STEPS; i++) {
    const p = poseAt(m.frames, i / STEPS);
    poses.push(p);
    sks.push(buildSkeleton(p));
  }
  return { poses, sks };
}

function targetMiss(spec: LimbSpec | undefined, end: Vec, sk: Skeleton): number {
  if (!spec || !('to' in spec)) return 0;
  const t: Vec = Array.isArray(spec.to) ? spec.to : [sk[spec.to.rel][0] + spec.to.d[0], sk[spec.to.rel][1] + spec.to.d[1]];
  return dist(end, t);
}

describe.each(Object.entries(MOTIONS))('%s demo', (id, m) => {
  const { poses, sks } = sample(m);

  it('never pushes a joint through the floor', () => {
    for (const sk of sks) for (const j of JOINTS) expect(sk[j][1], `${j}`).toBeLessThanOrEqual(FLOOR_Y + 1.5);
  });

  it('only aims hands and feet at points the limb can reach', () => {
    poses.forEach((p, i) => {
      const sk = sks[i];
      expect(targetMiss(p.armN, sk.handN, sk)).toBeLessThan(1);
      expect(targetMiss(p.armF ?? p.armN, sk.handF, sk)).toBeLessThan(1);
      expect(targetMiss(p.legN, sk.ankleN, sk)).toBeLessThan(1);
      expect(targetMiss(p.legF ?? p.legN, sk.ankleF, sk)).toBeLessThan(1);
    });
  });

  it('moves smoothly (no joint snaps between frames)', () => {
    for (let i = 1; i < sks.length; i++) for (const j of JOINTS) expect(dist(sks[i][j], sks[i - 1][j]), `${j} @${i}`).toBeLessThan(12);
  });

  it.skipIf(FRONTAL_PLANE_ONLY.has(id))('keeps every elbow and knee bending one way through the rep', () => {
    const chains: [string, (s: Skeleton) => [Vec, Vec, Vec]][] = [
      ['kneeN', (s) => [s.hip, s.kneeN, s.ankleN]],
      ['kneeF', (s) => [s.hip, s.kneeF, s.ankleF]],
      ['elbowN', (s) => [s.neck, s.elbowN, s.handN]],
      ['elbowF', (s) => [s.neck, s.elbowF, s.handF]],
    ];
    for (const [name, f] of chains) {
      const signs = sks.map((s) => Math.sign(Math.round(cross(...f(s))))).filter((x) => x !== 0);
      expect(new Set(signs).size, name).toBeLessThanOrEqual(1);
    }
  });
});

describe('exercise-specific form', () => {
  const end = (id: keyof typeof MOTIONS) => buildSkeleton(poseAt(MOTIONS[id].frames, 1));

  it('pull-up finishes with the chin over the bar', () => {
    const barY = (MOTIONS.pullup.scenery.find((s) => s.kind === 'bar') as { y: number }).y;
    expect(end('pullup').head[1] + BONES.headRadius).toBeLessThan(barY);
  });

  it('RDL keeps the arms straight and the bar over mid-foot', () => {
    const { sks } = sample(MOTIONS.rdl);
    for (const s of sks) {
      expect(jointAngle(s.neck, s.elbowN, s.handN)).toBeGreaterThan(175);
      expect(Math.abs(s.handN[0] - MOTIONS.rdl.plumb!.x)).toBeLessThan(5);
    }
  });

  it('back squat reaches parallel with the bar over mid-foot', () => {
    const s = end('squat');
    expect(s.hip[1]).toBeGreaterThanOrEqual(s.kneeN[1] - 2);
    expect(Math.abs(s.neck[0] - 3 - MOTIONS.squat.plumb!.x)).toBeLessThan(4);
  });

  it('hanging demos keep the feet off the floor', () => {
    for (const id of ['dead_hang', 'warmup_dead_hang', 'pullup'] as const) {
      const { sks } = sample(MOTIONS[id]);
      for (const s of sks) expect(Math.max(s.toeN[1], s.toeF[1]), id).toBeLessThan(FLOOR_Y);
    }
  });
});
