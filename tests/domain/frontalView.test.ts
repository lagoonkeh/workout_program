// tests/domain/frontalView.test.ts
import { describe, it, expect } from 'vitest';
import { CX, FRONTAL, frontalTrackPoint, getFrontal, lateralX, projectFrontal } from '../../src/domain/frontalView';
import { MOTIONS } from '../../src/domain/motionLibrary';
import { buildSkeleton, poseAt } from '../../src/domain/motionRig';

const at = (id: keyof typeof MOTIONS, p: number) =>
  projectFrontal(buildSkeleton(poseAt(MOTIONS[id].frames, p)), FRONTAL[id], p);

describe('domain/frontalView', () => {
  it('has a front or back view for every exercise', () => {
    expect(Object.keys(FRONTAL).sort()).toEqual(Object.keys(MOTIONS).sort());
    Object.values(FRONTAL).forEach((c) => {
      expect(['front', 'back']).toContain(c.view);
      expect(c.cue.length).toBeGreaterThan(5);
      expect(c.track.label.length).toBeGreaterThan(2);
    });
    expect(getFrontal('nope')).toBe(FRONTAL.squat);
  });

  it('puts the lifter’s right on the viewer’s left from the front, and mirrors from behind', () => {
    expect(lateralX('front', 'N', 10)).toBe(CX - 10);
    expect(lateralX('back', 'N', 10)).toBe(CX + 10);
  });

  it('keeps heights from the side view so both views stay in phase', () => {
    for (const p of [0, 0.3, 0.7, 1]) {
      const sk = buildSkeleton(poseAt(MOTIONS.squat.frames, p));
      const fs = projectFrontal(sk, FRONTAL.squat, p);
      expect(fs.joints.knee.N.p[1]).toBeCloseTo(sk.kneeN[1], 6);
      expect(fs.neck.p[1]).toBeCloseTo(sk.neck[1], 6);
    }
  });

  it('is left/right symmetric for bilateral lifts', () => {
    for (const id of ['squat', 'rdl', 'ohp', 'pullup', 'bench_press'] as const) {
      for (const p of [0, 0.5, 1]) {
        const fs = at(id, p);
        (['hand', 'elbow', 'hip', 'shoulder'] as const).forEach((j) => {
          expect(fs.joints[j].N.p[0] + fs.joints[j].F.p[0]).toBeCloseTo(2 * CX, 6);
        });
      }
    }
  });

  it('animates lateral cues: squat knees push out, face-pull elbows flare, scapulae retract', () => {
    const kneeW = (p: number) => Math.abs(at('squat', p).joints.knee.N.p[0] - CX);
    expect(kneeW(1)).toBeGreaterThan(kneeW(0));
    const elbowW = (p: number) => Math.abs(at('face_pull', p).joints.elbow.N.p[0] - CX);
    expect(elbowW(1)).toBeGreaterThan(elbowW(0));
    const scapW = (p: number) => Math.abs(at('warmup_scapular', p).joints.scap.N.p[0] - CX);
    expect(scapW(1)).toBeLessThan(scapW(0));
  });

  it.each(Object.keys(MOTIONS) as (keyof typeof MOTIONS)[])('%s projects on-screen through the rep', (id) => {
    for (let i = 0; i <= 10; i++) {
      const fs = at(id, i / 10);
      const pts = [fs.head.p, fs.neck.p, fs.pelvis.p, ...Object.values(fs.joints).flatMap((s) => [s.N.p, s.F.p]), frontalTrackPoint(fs, FRONTAL[id])];
      pts.forEach(([x, y]) => {
        expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true);
        expect(x).toBeGreaterThan(0);
        expect(x).toBeLessThan(200);
        expect(y).toBeGreaterThan(-28);
        expect(y).toBeLessThan(192);
      });
    }
  });
});
