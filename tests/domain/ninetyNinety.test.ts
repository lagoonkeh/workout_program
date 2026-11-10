// tests/domain/ninetyNinety.test.ts
import { describe, it, expect } from 'vitest';
import { MOTIONS } from '../../src/domain/motionLibrary';
import { buildSkeleton, jointAngle, poseAt } from '../../src/domain/motionRig';

describe('90/90 breathing + bridge', () => {
  const at = (p: number) => buildSkeleton(poseAt(MOTIONS.warmup_90_90.frames, p));

  it('starts in a true 90/90: knee straight above the hip, shin level to the heels on the box', () => {
    const sk = at(0);
    expect(sk.kneeN[1]).toBeLessThan(sk.hip[1] - 35); // knee points at the ceiling
    expect(Math.abs(sk.kneeN[0] - sk.hip[0])).toBeLessThan(3);
    expect(jointAngle(sk.hip, sk.kneeN, sk.ankleN)).toBeGreaterThan(85);
    expect(jointAngle(sk.hip, sk.kneeN, sk.ankleN)).toBeLessThan(95);
    expect(jointAngle(sk.neck, sk.hip, sk.kneeN)).toBeGreaterThan(85);
    expect(jointAngle(sk.neck, sk.hip, sk.kneeN)).toBeLessThan(95);
  });

  it('never bends the knee backward: it stays above the hip-to-heel line through the bridge', () => {
    for (let i = 0; i <= 10; i++) {
      const sk = at(i / 10);
      const [hx, hy] = sk.hip;
      const [ax, ay] = sk.ankleN;
      const [kx, ky] = sk.kneeN;
      // knee on the ceiling side of the hip->ankle line (screen y is down)
      const side = (ax - hx) * (ky - hy) - (ay - hy) * (kx - hx);
      expect(side).toBeLessThan(0);
      expect(ky).toBeLessThan(hy - 20);
    }
  });
});
