// tests/domain/motionRig.test.ts
import { describe, it, expect } from 'vitest';
import {
  BONES,
  buildSkeleton,
  buildTimeline,
  dist,
  jointAngle,
  lerpAngle,
  poseAt,
  solveTwoBone,
  polar,
  timelineAt,
  timelineDuration,
  type Vec,
} from '../../src/domain/motionRig';
import { MOTIONS, getMotion } from '../../src/domain/motionLibrary';

const close = (a: Vec, b: Vec, tol = 0.6) => expect(dist(a, b)).toBeLessThan(tol);

describe('domain/motionRig', () => {
  it('two-bone IK reaches reachable targets with fixed bone lengths', () => {
    const root: Vec = [100, 100];
    const target: Vec = [130, 140];
    for (const bend of [1, -1] as const) {
      const [a1, a2] = solveTwoBone(root, target, 40, 38, bend);
      const mid = polar(root, a1, 40);
      const end = polar(mid, a2, 38);
      close(end, target);
    }
  });

  it('IK straightens toward unreachable targets instead of breaking', () => {
    const [a1, a2] = solveTwoBone([0, 0], [500, 0], 40, 38, 1);
    expect(Math.abs(a1)).toBeLessThan(1);
    expect(Math.abs(a2)).toBeLessThan(1);
  });

  it('interpolates angles the short way round', () => {
    expect(lerpAngle(170, -170, 0.5)).toBeCloseTo(180, 5);
    expect(lerpAngle(-90, 0, 0.5)).toBeCloseTo(-45, 5);
  });

  it('parses tempo into eccentric / pause / concentric / pause', () => {
    const tl = buildTimeline('30X1', 'eccentric-first');
    expect(tl.map((s) => s.kind)).toEqual(['holdStart', 'toEnd', 'holdEnd', 'toStart']);
    expect(tl[1]).toMatchObject({ action: 'eccentric', seconds: 3, tempoChar: '3' });
    expect(tl[3]).toMatchObject({ action: 'concentric', tempoChar: 'X' });
    expect(tl[3].seconds).toBeLessThan(1);
    const pull = buildTimeline('20X1', 'concentric-first');
    expect(pull[1].action).toBe('concentric');
    expect(pull[3]).toMatchObject({ action: 'eccentric', seconds: 2 });
  });

  it('timeline progress runs 0 → 1 → 0 and wraps', () => {
    const tl = buildTimeline('30X1', 'eccentric-first');
    const T = timelineDuration(tl);
    expect(timelineAt(tl, 0.5).progress).toBe(0);
    expect(timelineAt(tl, 2.5).progress).toBeCloseTo(0.5, 5);
    expect(timelineAt(tl, 4.1).progress).toBe(1);
    expect(timelineAt(tl, T + 0.5).progress).toBe(0);
  });

  describe('motion library', () => {
    const entries = Object.entries(MOTIONS);

    it('covers all 40 diagram types', () => {
      expect(entries.length).toBe(40);
      expect(getMotion('not-a-type')).toBe(MOTIONS.squat);
    });

    it.each(entries)('%s keeps bone lengths and stays on screen through the whole rep', (_, m) => {
      for (let i = 0; i <= 20; i++) {
        const pose = poseAt(m.frames, i / 20);
        const sk = buildSkeleton(pose);
        // a shrug (passive hang) lifts the shoulders above the torso top; arms stay straight
        expect(dist(sk.hip, sk.neck)).toBeCloseTo(BONES.torso + (pose.shrug ?? 0), 3);
        expect(dist(sk.neck, sk.elbowN)).toBeCloseTo(BONES.upperArm, 3);
        expect(dist(sk.elbowN, sk.handN)).toBeCloseTo(BONES.forearm, 3);
        // a leg reaching sideways is drawn shorter in the side view (its 3-D length is checked in obliqueView)
        expect(dist(sk.hip, sk.kneeN)).toBeCloseTo(BONES.thigh * (pose.scaleN ?? 1), 3);
        expect(dist(sk.kneeN, sk.ankleN)).toBeCloseTo(BONES.shin * (pose.scaleN ?? 1), 3);
        Object.values(sk).forEach(([x, y]) => {
          expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true);
          expect(x).toBeGreaterThan(-10);
          expect(x).toBeLessThan(210);
          expect(y).toBeGreaterThan(-28);
          expect(y).toBeLessThan(192);
        });
      }
    });

    it('hangs keep the arms straight while the shoulders depress', () => {
      for (const id of ['dead_hang', 'warmup_dead_hang'] as const) {
        for (let i = 0; i <= 10; i++) {
          const sk = buildSkeleton(poseAt(MOTIONS[id].frames, i / 10));
          expect(dist(sk.neck, sk.handN)).toBeCloseTo(BONES.upperArm + BONES.forearm, 1);
        }
        const top = buildSkeleton(poseAt(MOTIONS[id].frames, 1));
        const bottom = buildSkeleton(poseAt(MOTIONS[id].frames, 0));
        expect(top.hip[1]).toBeLessThan(bottom.hip[1]);
      }
    });

    it('keeps the feet planted on lifts done standing', () => {
      for (const id of ['squat', 'rdl', 'ohp', 'good_morning', 'split_squat'] as const) {
        const a = buildSkeleton(poseAt(MOTIONS[id].frames, 0));
        for (let i = 1; i <= 10; i++) {
          close(buildSkeleton(poseAt(MOTIONS[id].frames, i / 10)).ankleN, a.ankleN);
        }
      }
    });

    it('squat reaches parallel with the bar over mid-foot', () => {
      const bottom = buildSkeleton(poseAt(MOTIONS.squat.frames, 1));
      expect(bottom.hip[1]).toBeGreaterThanOrEqual(bottom.kneeN[1] - 2); // hip crease at/below knee
      expect(jointAngle(bottom.hip, bottom.kneeN, bottom.ankleN)).toBeLessThan(80);
      const bar = bottom.neck[0] - 3;
      expect(Math.abs(bar - MOTIONS.squat.plumb!.x)).toBeLessThan(8);
    });

    it('bench bar travels in a J from over the shoulder to the lower chest', () => {
      const top = buildSkeleton(poseAt(MOTIONS.bench_press.frames, 0));
      const bottom = buildSkeleton(poseAt(MOTIONS.bench_press.frames, 1));
      expect(Math.abs(top.handN[0] - top.neck[0])).toBeLessThan(4);
      expect(bottom.handN[0]).toBeGreaterThan(top.handN[0] + 8);
      expect(bottom.handN[1]).toBeGreaterThan(top.handN[1] + 25);
    });

    it('pull-up ends with the chin over the bar', () => {
      const top = buildSkeleton(poseAt(MOTIONS.pullup.frames, 1));
      const bar = MOTIONS.pullup.scenery.find((x) => x.kind === 'bar') as { y: number };
      expect(top.head[1] + BONES.headRadius * 0.4).toBeLessThan(bar.y);
    });
  });
});
