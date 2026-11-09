// tests/domain/obliqueView.test.ts
import { describe, it, expect } from 'vitest';
import {
  CAMERA_LABEL,
  LIMBS3,
  OBLIQUE_CAMERAS,
  SCENE3D,
  build3D,
  cameraFor,
  defaultCamera,
  dist3,
  projector,
  props3D,
  solveTwoBone3,
  track3D,
  type ObliqueCamera,
  type Vec3,
} from '../../src/domain/obliqueView';
import { FRONTAL, hipDropAt, latFor, shiftAt, projectFrontal } from '../../src/domain/frontalView';
import { MOTIONS } from '../../src/domain/motionLibrary';
import { BONES, buildSkeleton, poseAt } from '../../src/domain/motionRig';

type Id = keyof typeof MOTIONS;
const IDS = Object.keys(MOTIONS) as Id[];
// A wide W/Y wall slide or a 90/90 knee moves the elbow/knee up to ~9 units from the flat 2-D spot:
// that is the 3-D correction that keeps the upper arm / thigh its true length.
const ELBOW_KNEE_TOL = 10;
const STEPS = Array.from({ length: 21 }, (_, i) => i / 20);

const frameAt = (id: Id, p: number) => {
  const sk = buildSkeleton(poseAt(MOTIONS[id].frames, p));
  const s3 = build3D(sk, FRONTAL[id], p);
  return { sk, s3, props: props3D(MOTIONS[id], FRONTAL[id], sk, s3) };
};

const propPoints = (props: ReturnType<typeof props3D>): Vec3[] =>
  props.flatMap((p) => {
    if (p.kind === 'bar') return [p.c, [p.c[0], p.c[1], p.c[2] - p.half], [p.c[0], p.c[1], p.c[2] + p.half]] as Vec3[];
    if (p.kind === 'club') return [p.hand];
    if (p.kind === 'cable') return [...p.hands];
    return [p.c];
  });

describe('domain/obliqueView', () => {
  it('3-D IK keeps both bones exact and lands on the target, sliding the root if out of reach', () => {
    const reach = solveTwoBone3([0, 0, 0], [30, 20, 10], 27, 25, [10, 30, 0]);
    expect(dist3(reach.root, reach.mid)).toBeCloseTo(27, 9);
    expect(dist3(reach.mid, [30, 20, 10])).toBeCloseTo(25, 9);
    expect(reach.root).toEqual([0, 0, 0]);
    const far = solveTwoBone3([0, 0, 0], [60, 0, 0], 27, 25, [0, 10, 0]);
    expect(dist3(far.root, far.mid)).toBeCloseTo(27, 6);
    expect(dist3(far.mid, [60, 0, 0])).toBeCloseTo(25, 6);
    expect(far.root[0]).toBeCloseTo(8, 4);
  });

  it('cameras put the right faces of the lifter nearest', () => {
    const f = projector('front45', 100);
    // chest (+x) and the lifter's right (-z) face the front 3/4 camera
    expect(f.project([110, 100, 0]).d).toBeGreaterThan(f.project([90, 100, 0]).d);
    expect(f.project([100, 100, -10]).d).toBeGreaterThan(f.project([100, 100, 10]).d);
    const r = projector('rear45', 100);
    expect(r.project([90, 100, 0]).d).toBeGreaterThan(r.project([110, 100, 0]).d);
    const t = projector('top', 100);
    expect(t.project([100, 50, 0]).d).toBeGreaterThan(t.project([100, 150, 0]).d);
    // from above, lifter faces up the screen with the right side on the right
    expect(t.project([110, 100, 0]).p[1]).toBeLessThan(t.project([100, 100, 0]).p[1]);
    expect(t.project([100, 100, -10]).p[0]).toBeGreaterThan(t.project([100, 100, 10]).p[0]);
    OBLIQUE_CAMERAS.forEach((c) => expect(CAMERA_LABEL[c].length).toBeGreaterThan(2));
  });

  it('opens each exercise in the angle that shows it best', () => {
    expect(defaultCamera('squat')).toBe('front45');
    expect(defaultCamera('bench_press')).toBe('front45');
    (['rdl', 'good_morning', 'kb_row', 'pullup', 'face_pull', 'dead_hang'] as Id[]).forEach((id) => expect(defaultCamera(id)).toBe('rear45'));
    expect(defaultCamera('single_leg_atw')).toBe('top');
    expect(defaultCamera('carry')).toBe('top');
    expect(defaultCamera('hanging_knee_raise')).toBe('front45');
    expect(defaultCamera('cossack_squat')).toBe('top');
    expect(defaultCamera('pelvic_drop')).toBe('rear45');
    // a flexing spine reads best straight from the side
    expect(defaultCamera('cat_camel')).toBe('side');
    IDS.forEach((id) => expect([...OBLIQUE_CAMERAS, 'side']).toContain(defaultCamera(id)));
  });

  it('gives benches, bars, walls and machines real width wherever the side view has scenery', () => {
    IDS.filter((id) => MOTIONS[id].scenery.length > 0).forEach((id) => {
      expect(SCENE3D[id], id).toBeDefined();
      expect(SCENE3D[id]!.length).toBeGreaterThan(0);
    });
  });

  it('draws the around-the-world bell as a full circle round the waist from above', () => {
    const t = cameraFor(MOTIONS.single_leg_atw, 'single_leg_atw', FRONTAL.single_leg_atw, 'top');
    let sweep = 0;
    let prev: number | null = null;
    const hip = (p: number) => t.project(frameAt('single_leg_atw', p).s3.j.pelvis).p;
    for (let i = 0; i <= 80; i++) {
      const p = i / 80;
      const f = frameAt('single_leg_atw', p);
      const b = t.project(track3D(MOTIONS.single_leg_atw, f.sk, f.s3, f.props)).p;
      const h = hip(p);
      const a = Math.atan2(b[1] - h[1], b[0] - h[0]);
      if (prev !== null) sweep += ((a - prev + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
      prev = a;
    }
    expect(Math.abs(sweep)).toBeGreaterThan(1.8 * Math.PI);
  });

  it('Cossack squat: feet stay planted wide while the hips slide over the right foot and sink', () => {
    const a = frameAt('cossack_squat', 0).s3.j;
    const b = frameAt('cossack_squat', 1).s3.j;
    [0, 1, 2].forEach((k) => {
      expect(b.ankleN[k]).toBeCloseTo(a.ankleN[k], 9);
      expect(b.ankleF[k]).toBeCloseTo(a.ankleF[k], 9);
    });
    expect(b.ankleF[2] - b.ankleN[2]).toBeGreaterThan(90); // wide stance
    expect(b.pelvis[2]).toBeLessThan(a.pelvis[2] - 25); // slid toward the right (N) foot
    expect(b.pelvis[1]).toBeGreaterThan(a.pelvis[1] + 30); // and sank
    // trail leg nearly straight in 3-D even though the side view draws it short
    const trail = dist3(b.hipF, b.kneeF) + dist3(b.kneeF, b.ankleF);
    expect(dist3(b.hipF, b.ankleF)).toBeGreaterThan(trail * 0.95);
    const fs = projectFrontal(buildSkeleton(poseAt(MOTIONS.cossack_squat.frames, 1)), FRONTAL.cossack_squat, 1);
    expect(fs.joints.ankle.N.p[0]).toBeCloseTo(projectFrontal(buildSkeleton(poseAt(MOTIONS.cossack_squat.frames, 0)), FRONTAL.cossack_squat, 0).joints.ankle.N.p[0], 9);
  });

  it('pelvic leveling: the free hip starts dropped and finishes level', () => {
    const tilt = (p: number) => {
      const j = frameAt('pelvic_drop', p).s3.j;
      return j.hipF[1] - j.hipN[1];
    };
    expect(tilt(0)).toBeGreaterThan(5);
    expect(Math.abs(tilt(1))).toBeLessThan(2);
  });

  describe.each(IDS)('%s', (id) => {
    const m = MOTIONS[id];

    it('keeps every bone its true length in 3-D through the rep', () => {
      STEPS.forEach((p) => {
        const { s3, sk } = frameAt(id, p);
        LIMBS3.forEach((l) => expect(dist3(s3.j[l.a], s3.j[l.b]), `${l.seg} at ${p}`).toBeCloseTo(l.len, 6));
        const spine = dist3(s3.j.pelvis, s3.j.neck) + dist3(s3.j.neck, s3.j.head);
        expect(spine).toBeCloseTo(BONES.torso + BONES.neck, 6);
        expect(dist3(s3.j.pelvis, s3.j.neck)).toBeCloseTo(Math.hypot(sk.neck[0] - sk.hip[0], sk.neck[1] - sk.hip[1]), 6);
      });
    });

    it('stays in sync with the side and front views', () => {
      STEPS.forEach((p) => {
        const { sk, s3 } = frameAt(id, p);
        const same = (a: Vec3, b: [number, number], label: string) => {
          expect(a[0], label).toBeCloseTo(b[0], 9);
          expect(a[1], label).toBeCloseTo(b[1], 9);
        };
        // the body can slide sideways over planted feet, and the free hip can drop
        const sh = shiftAt(FRONTAL[id], p);
        const drop = hipDropAt(FRONTAL[id], p);
        same(s3.j.pelvis, sk.hip, 'pelvis');
        expect(s3.j.pelvis[2]).toBeCloseTo(sh, 9);
        same(s3.j.neck, sk.neck, 'neck');
        same(s3.j.head, sk.head, 'head');
        (['N', 'F'] as const).forEach((s) => {
          // hands and feet sit exactly where the side view puts them, at the front view's width
          same(s3.j[`hand${s}`], sk[`hand${s}`], `hand${s}`);
          same(s3.j[`ankle${s}`], sk[`ankle${s}`], `ankle${s}`);
          const sign = s === 'N' ? -1 : 1;
          expect(s3.j[`hand${s}`][2]).toBeCloseTo(sign * latFor(FRONTAL[id], 'hand', s, p) + sh, 9);
          expect(s3.j[`ankle${s}`][2]).toBeCloseTo(sign * latFor(FRONTAL[id], 'ankle', s, p), 9);
          // elbows and knees are re-solved in 3-D but stay close to both 2-D views
          const near = (j3: Vec3, j2: [number, number], lat: number, label: string) =>
            expect(Math.hypot(j3[0] - j2[0], j3[1] - j2[1], j3[2] - sign * lat - sh), `${label} at ${p}`).toBeLessThan(ELBOW_KNEE_TOL);
          near(s3.j[`elbow${s}`], sk[`elbow${s}`], latFor(FRONTAL[id], 'elbow', s, p), `elbow${s}`);
          near(s3.j[`knee${s}`], sk[`knee${s}`], latFor(FRONTAL[id], 'knee', s, p), `knee${s}`);
          // the shoulder girdle only slides a little to keep a wide grip on the bar
          expect(dist3(s3.j[`shoulder${s}`], [sk.neck[0], sk.neck[1], sign * latFor(FRONTAL[id], 'shoulder', s, p) + sh])).toBeLessThan(4);
          expect(dist3(s3.j[`hip${s}`], [sk.hip[0], sk.hip[1] + (s === 'F' ? drop : 0), sign * latFor(FRONTAL[id], 'hip', s, p) + sh])).toBeLessThan(2);
        });
      });
      // the 3/4 views are a rigid camera turn of the same points: distances along the spine survive projection
      (['front45', 'rear45'] as ObliqueCamera[]).forEach((cam) => {
        const pr = cameraFor(m, id, FRONTAL[id], cam);
        STEPS.forEach((p) => {
          const { s3 } = frameAt(id, p);
          const a = pr.project(s3.j.pelvis);
          const b = pr.project(s3.j.neck);
          const screen = Math.hypot(b.p[0] - a.p[0], b.p[1] - a.p[1], b.d - a.d);
          expect(screen).toBeCloseTo(dist3(s3.j.pelvis, s3.j.neck), 9);
        });
      });
    });

    it.each(OBLIQUE_CAMERAS)('stays on screen in the %s view', (cam) => {
      const pr = cameraFor(m, id, FRONTAL[id], cam);
      STEPS.forEach((p) => {
        const { sk, s3, props } = frameAt(id, p);
        const pts: Vec3[] = [...Object.values(s3.j), ...propPoints(props), track3D(m, sk, s3, props)];
        pts.forEach((pt) => {
          const { p: [u, v], d } = pr.project(pt);
          expect(Number.isFinite(u) && Number.isFinite(v) && Number.isFinite(d)).toBe(true);
          expect(u, `${cam} x at ${p}`).toBeGreaterThan(2);
          expect(u, `${cam} x at ${p}`).toBeLessThan(198);
          expect(v, `${cam} y at ${p}`).toBeGreaterThan(-24);
          expect(v, `${cam} y at ${p}`).toBeLessThan(192);
        });
        // the club tip swings to the same height as in the side view (~3 units over the top at full reach)
        props.forEach((pp) => pp.kind === 'club' && expect(pr.project(pp.tip).p[1]).toBeGreaterThan(-28));
        // head never leaves the view either (radius included)
        const h = pr.project(s3.j.head).p;
        expect(h[0] - BONES.headRadius).toBeGreaterThan(0);
        expect(h[0] + BONES.headRadius).toBeLessThan(200);
        expect(h[1] - BONES.headRadius).toBeGreaterThan(-24);
      });
    });
  });
});

