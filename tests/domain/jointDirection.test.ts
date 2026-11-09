// tests/domain/jointDirection.test.ts
/**
 * Knees and elbows only bend one way.
 *
 * Every pose in the side-view rig is the same right-side view, rotated (standing, lying face-up,
 * face-down, hanging), never mirrored. So a knee bending the right way always turns the shin the
 * same way relative to the thigh, and an elbow always turns the forearm the opposite way.
 */
import { describe, it, expect } from 'vitest';
import { MOTIONS } from '../../src/domain/motionLibrary';
import { buildSkeleton, jointAngle, poseAt, type Vec } from '../../src/domain/motionRig';

/** sine of the turn from the first bone to the second (screen coords, y down) */
const turn = (a: Vec, b: Vec, c: Vec) => {
  const t = [b[0] - a[0], b[1] - a[1]];
  const s = [c[0] - b[0], c[1] - b[1]];
  return (t[0] * s[1] - t[1] * s[0]) / (Math.hypot(t[0], t[1]) * Math.hypot(s[0], s[1]));
};

/** about 5 degrees of play around a straight limb */
const SLACK = 0.09;

/**
 * Wall slides move the arms sideways along the wall (frontal plane), which a side view cannot show;
 * the front and 3-D views show that drill.
 */
const ELBOW_EXEMPT = new Set(['warmup_wall_slide']);

describe('joint direction in every animation', () => {
  it.each(Object.keys(MOTIONS))('%s: knees and elbows never bend backward', (id) => {
    const m = MOTIONS[id as keyof typeof MOTIONS];
    for (let i = 0; i <= 40; i++) {
      const p = i / 40;
      const sk = buildSkeleton(poseAt(m.frames, p));
      for (const s of ['N', 'F'] as const) {
        expect(turn(sk.hip, sk[`knee${s}`], sk[`ankle${s}`]), `knee${s} at ${p}`).toBeGreaterThan(-SLACK);
        // a fully folded elbow (hands at the neck, as in a back squat) has no measurable direction
        if (!ELBOW_EXEMPT.has(id) && jointAngle(sk.neck, sk[`elbow${s}`], sk[`hand${s}`]) > 30) {
          expect(turn(sk.neck, sk[`elbow${s}`], sk[`hand${s}`]), `elbow${s} at ${p}`).toBeLessThan(SLACK);
        }
      }
    }
  });
});

describe('hanging demos', () => {
  const hangs = ['dead_hang', 'warmup_dead_hang', 'pullup'] as const;

  it('hang with the knees bent forward and the shins back (bar lower than the body is tall)', () => {
    hangs.forEach((id) => {
      for (let i = 0; i <= 10; i++) {
        const sk = buildSkeleton(poseAt(MOTIONS[id].frames, i / 10));
        // the knee leads the ankle in the direction the lifter faces (+x)
        expect(sk.kneeN[0], id).toBeGreaterThan(sk.ankleN[0]);
        expect(jointAngle(sk.hip, sk.kneeN, sk.ankleN), id).toBeGreaterThan(120);
      }
    });
  });

  it('pull-up: the body stays behind the bar and the elbows point down at the top', () => {
    const bar = MOTIONS.pullup.scenery.find((s) => s.kind === 'bar') as { x1: number; x2: number; y: number };
    const barX = (bar.x1 + bar.x2) / 2;
    for (let i = 0; i <= 20; i++) {
      const sk = buildSkeleton(poseAt(MOTIONS.pullup.frames, i / 20));
      // lifter faces +x, so the bar is in front of the shoulders and the head never passes through it
      expect(sk.neck[0]).toBeLessThanOrEqual(barX + 0.5);
      expect(Math.hypot(sk.head[0] - barX, sk.head[1] - bar.y)).toBeGreaterThan(10);
    }
    const top = buildSkeleton(poseAt(MOTIONS.pullup.frames, 1));
    expect(top.elbowN[1]).toBeGreaterThan(top.neck[1] + 15);
  });
});
