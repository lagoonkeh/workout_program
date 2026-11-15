import { describe, it, expect } from 'vitest';
import { SIX_PACK_CUE_CARDS, SIX_PACK_EXERCISES, SIX_PACK_ROUTINES, SIX_PACK_VISUALS } from '../../src/domain/sixPackData';
import { SIX_PACK_FRONTAL, SIX_PACK_MOTIONS } from '../../src/domain/sixPackMotions';
import { MOTIONS } from '../../src/domain/motionLibrary';
import { FRONTAL, getFrontal } from '../../src/domain/frontalView';
import { WORKOUT_PROGRAM, isTimedPrescription, isUnilateralExercise } from '../../src/domain/programData';
import { buildSkeleton, poseAt } from '../../src/domain/motionRig';
import { build3D, props3D } from '../../src/domain/obliqueView';
import { CUE_CARDS } from '../../src/domain/cueCardsData';
import { EXERCISE_VISUALS } from '../../src/domain/exerciseVisualsData';

const SESSIONS = ['lower_a', 'upper_a', 'lower_b', 'upper_b'] as const;

describe('ab finishers: the 21 floor and standing drills', () => {
  it('has 21 drills and no mountain climbers', () => {
    const ids = Object.keys(SIX_PACK_EXERCISES);
    expect(ids).toHaveLength(21);
    expect(ids.some((id) => /mountain|climber/.test(id))).toBe(false);
  });

  it('uses every drill exactly once across the four session finishers', () => {
    const used = SESSIONS.flatMap((s) => SIX_PACK_ROUTINES[s].map((e) => e.id));
    expect(used).toHaveLength(21);
    expect(new Set(used).size).toBe(21);
    SESSIONS.forEach((s) => {
      expect(SIX_PACK_ROUTINES[s].length).toBeGreaterThanOrEqual(5);
      expect(WORKOUT_PROGRAM[s].dailyCoreFinisher!.map((e) => e.baseExerciseId)).toEqual(SIX_PACK_ROUTINES[s].map((e) => e.id));
    });
  });

  it('runs each drill as a timed interval, bodyweight, one round, 30 s rest', () => {
    for (const e of Object.values(SIX_PACK_EXERCISES)) {
      expect(isTimedPrescription(e.targetReps, e.tempo), e.id).toBe(true);
      expect(e.equipment).toBe('bodyweight');
      expect(e.targetSets).toBe(1);
      expect(e.restSeconds).toBe(30);
    }
  });

  it('splits only the true one-side drills into left and right', () => {
    const sided = Object.values(SIX_PACK_EXERCISES).filter(isUnilateralExercise).map((e) => e.id).sort();
    expect(sided).toEqual(['t3_sp_side_crunches', 't3_sp_side_plank_lifts']);
  });

  it('gives every drill its own demo, front view, caption and cue card', () => {
    for (const e of Object.values(SIX_PACK_EXERCISES)) {
      const v = SIX_PACK_VISUALS[e.id];
      expect(EXERCISE_VISUALS[e.id]).toBe(v);
      expect(v.diagramType.startsWith('sp_')).toBe(true);
      expect(MOTIONS[v.diagramType]).toBe(SIX_PACK_MOTIONS[v.diagramType as keyof typeof SIX_PACK_MOTIONS]);
      expect(FRONTAL[v.diagramType]).toBe(SIX_PACK_FRONTAL[v.diagramType as keyof typeof SIX_PACK_FRONTAL]);
      expect(v.keyCues.length).toBeGreaterThanOrEqual(3);
      const card = CUE_CARDS.find((c) => c.exerciseId === e.id)!;
      expect(card).toBeDefined();
      expect(card.setupInstructions).toHaveLength(5);
      expect(card.commonFaults.length).toBeGreaterThan(0);
    }
    expect(SIX_PACK_CUE_CARDS).toHaveLength(21);
    // each drill has a demo of its own
    expect(new Set(Object.values(SIX_PACK_VISUALS).map((v) => v.diagramType)).size).toBe(21);
  });

  it('old placeholder core drills are gone', () => {
    expect(Object.keys(EXERCISE_VISUALS).some((id) => id.startsWith('t3_core_'))).toBe(false);
    expect(CUE_CARDS.some((c) => c.exerciseId.startsWith('t3_core_'))).toBe(false);
  });
});

describe('ab drill demos', () => {
  const sk = (id: keyof typeof SIX_PACK_MOTIONS, p: number) => buildSkeleton(poseAt(MOTIONS[id].frames, p));

  it('heels to the heavens: the hips lift and the heels go higher', () => {
    expect(sk('sp_heels_heavens', 1).hip[1]).toBeLessThan(sk('sp_heels_heavens', 0).hip[1] - 8);
    expect(sk('sp_heels_heavens', 1).ankleN[1]).toBeLessThan(sk('sp_heels_heavens', 0).ankleN[1]);
  });

  it('V-up and X-man: the chest comes up and the hands close in on the legs', () => {
    for (const id of ['sp_vups', 'sp_x_man_crunch'] as const) {
      const d = (p: number) => {
        const s = sk(id, p);
        return Math.hypot(s.handN[0] - s.ankleN[0], s.handN[1] - s.ankleN[1]);
      };
      expect(sk(id, 1).neck[1]).toBeLessThan(140);
      expect(d(1)).toBeLessThan(d(0) / 2);
    }
  });

  it('marching plank lifts one straight leg, then the other', () => {
    const a = sk('sp_marching_plank', 0);
    const b = sk('sp_marching_plank', 1);
    expect(a.ankleN[1]).toBeLessThan(a.ankleF[1] - 20);
    expect(b.ankleF[1]).toBeLessThan(b.ankleN[1] - 20);
  });

  it('tuck plank: the knee crosses the midline toward the opposite elbow', () => {
    const cfg = getFrontal('sp_tuck_plank_opposite');
    const s3 = build3D(sk('sp_tuck_plank_opposite', 0), cfg, 0);
    // the lifter's right knee (z < 0 side) ends up on the left of the midline (z > 0)
    expect(s3.j.kneeN[2]).toBeGreaterThan(0);
  });

  it('windshield wipers: the knees swing to both sides', () => {
    const cfg = getFrontal('sp_windshield_wipers');
    const zs = [0.25, 0.75].map((p) => build3D(sk('sp_windshield_wipers', p), cfg, p).j.kneeN[2]);
    expect(Math.sign(zs[0])).not.toBe(Math.sign(zs[1]));
  });

  it('behind-the-back pass draws a ball, not a kettlebell, that goes behind the back', () => {
    const m = MOTIONS.sp_btb_pass;
    expect(m.props[0]).toMatchObject({ kind: 'kettlebell', ball: true });
    const cfg = getFrontal('sp_btb_pass');
    const behind = (p: number) => {
      const skel = sk('sp_btb_pass', p);
      const s3 = build3D(skel, cfg, p);
      return { ball: props3D(m, cfg, skel, s3)[0], hip: s3.j.pelvis };
    };
    const front = behind(0);
    const back = behind(0.5);
    expect(front.ball).toMatchObject({ ball: true });
    expect(front.ball.kind === 'kettlebell' && front.ball.c[0]).toBeGreaterThan(front.hip[0]);
    expect(back.ball.kind === 'kettlebell' && back.ball.c[0]).toBeLessThan(back.hip[0]);
  });
});
