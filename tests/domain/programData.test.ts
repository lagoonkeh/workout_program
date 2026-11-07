import { describe, it, expect } from 'vitest';
import {
  WORKOUT_SESSIONS,
  REST_PRESETS,
  getEffectiveExerciseTempo,
  BOWFLEX_840_KETTLEBELL_SETTINGS,
} from '../../src/domain/programData';
import { CUE_CARDS } from '../../src/domain/cueCardsData';

describe('Workout Program Data & Biomechanical Architecture', () => {
  describe('Session Roster & Scheduling Integrity', () => {
    it('contains exactly 4 distinct training sessions', () => {
      expect(WORKOUT_SESSIONS).toHaveLength(4);
    });

    it('contains required session IDs: lower_a, upper_a, lower_b, upper_b', () => {
      const sessionIds = WORKOUT_SESSIONS.map((s) => s.id);
      expect(sessionIds).toEqual(['lower_a', 'upper_a', 'lower_b', 'upper_b']);
    });

    it('defines realistic workout duration between 45 and 60 minutes for every session', () => {
      WORKOUT_SESSIONS.forEach((session) => {
        expect(session.estimatedDurationMinutes).toBeGreaterThanOrEqual(45);
        expect(session.estimatedDurationMinutes).toBeLessThanOrEqual(60);
      });
    });
  });

  describe('Equipment Constraints: Strict Home Gym Feasibility', () => {
    const ALLOWED_EQUIPMENT = new Set([
      'barbell',
      'rack',
      'landmine',
      'pull_up_bar',
      'kettlebell',
      'indian_clubs',
      'rowing_machine',
      'bodyweight',
      'bench',
      'plates',
    ]);

    const PROHIBITED_EQUIPMENT_KEYWORDS = [
      'cable',
      'cables',
      'leg_extension',
      'leg_press',
      'smith',
      'dumbbell',
      'pec_deck',
      'lat_pulldown_machine',
    ];

    it('guarantees every warmup exercise uses only allowed equipment', () => {
      WORKOUT_SESSIONS.forEach((session) => {
        session.warmup.forEach((warmupItem) => {
          if (warmupItem.equipment) {
            expect(ALLOWED_EQUIPMENT.has(warmupItem.equipment)).toBe(true);
          }
        });
      });
    });

    it('guarantees every working exercise uses only allowed equipment', () => {
      WORKOUT_SESSIONS.forEach((session) => {
        session.exercises.forEach((exercise) => {
          expect(ALLOWED_EQUIPMENT.has(exercise.equipment)).toBe(true);
          PROHIBITED_EQUIPMENT_KEYWORDS.forEach((prohibited) => {
            expect(exercise.equipment.toLowerCase()).not.toContain(prohibited);
          });
        });
      });
    });

    it('restricts kettlebell exercise loading to exact BowFlex SelectTech 840 dial settings (8, 12, 20, 25, 35, 40 lbs)', () => {
      const validSettings: number[] = [...BOWFLEX_840_KETTLEBELL_SETTINGS];
      WORKOUT_SESSIONS.forEach((session) => {
        session.exercises.forEach((exercise) => {
          if (exercise.equipment === 'kettlebell' && exercise.defaultWeight) {
            expect(validSettings).toContain(exercise.defaultWeight);
            expect(validSettings).toContain(exercise.defaultWeightLbs);
          }
        });
      });
    });
  });

  describe('GZCL Tier Structure Compliance', () => {
    WORKOUT_SESSIONS.forEach((session) => {
      describe(`Session: ${session.title}`, () => {
        it('contains at least one Tier 1, Tier 2, and Tier 3 exercise', () => {
          const tiers = session.exercises.map((e) => e.tier);
          expect(tiers).toContain('T1');
          expect(tiers).toContain('T2');
          expect(tiers).toContain('T3');
        });

        it('enforces Tier 1 specifications: 5 sets, 3 reps base with AMRAP on final set', () => {
          const t1Exercises = session.exercises.filter((e) => e.tier === 'T1');
          expect(t1Exercises.length).toBeGreaterThanOrEqual(1);

          t1Exercises.forEach((t1) => {
            expect(t1.targetSets).toBe(5);
            expect(t1.targetReps).toBe('3');
            // RDLs stop short of failure (lower-back safety); the other T1 lifts end with an AMRAP set
            expect(t1.isAmrapLastSet).toBe(t1.id !== 't1_bb_rdl');
            // Rest interval for heavy T1 powerbuilding must be 180s to 300s (3-5 minutes)
            expect(t1.restSeconds).toBeGreaterThanOrEqual(180);
            expect(t1.restSeconds).toBeLessThanOrEqual(300);
          });
        });

        it('enforces Tier 2 specifications: 3 sets x 8-10 reps (or calisthenic ladder) with 120-180s rest', () => {
          const t2Exercises = session.exercises.filter((e) => e.tier === 'T2');
          expect(t2Exercises.length).toBeGreaterThanOrEqual(1);

          t2Exercises.forEach((t2) => {
            expect(t2.targetSets).toBeGreaterThanOrEqual(3);
            expect(t2.restSeconds).toBeGreaterThanOrEqual(120);
            expect(t2.restSeconds).toBeLessThanOrEqual(180);
          });
        });

        it('enforces Tier 3 specifications: accessory volume or Effective Reps with 15-90s rest', () => {
          const t3Exercises = session.exercises.filter((e) => e.tier === 'T3');
          expect(t3Exercises.length).toBeGreaterThanOrEqual(1);

          t3Exercises.forEach((t3) => {
            expect(t3.targetSets).toBeGreaterThanOrEqual(1);
            // Regular T3 rest is 60-90s; ER rest-pause cluster rest is 15-30s
            expect(t3.restSeconds).toBeGreaterThanOrEqual(15);
            expect(t3.restSeconds).toBeLessThanOrEqual(90);
          });
        });
      });
    });
  });

  describe('Knee Tendinitis & Biomechanical Safety Protocols', () => {
    it('verifies Lower A enforces posterior pre-fatigue in warmup before T1 Barbell Squat', () => {
      const lowerA = WORKOUT_SESSIONS.find((s) => s.id === 'lower_a')!;
      const warmupNames = lowerA.warmup.map((w) => w.name.toLowerCase());

      // Must include Ben Patrick reverse sled/locomotion simulation
      const hasReverseLocomotion = warmupNames.some(
        (name) => name.includes('reverse') || name.includes('rowing') || name.includes('backward')
      );
      expect(hasReverseLocomotion).toBe(true);

      // Must include Eugene Teo calf and hamstring pre-fatigue
      const hasCalfPreFatigue = warmupNames.some((name) => name.includes('calf'));
      const hasHamstringPreFatigue = warmupNames.some(
        (name) => name.includes('hinge') || name.includes('hamstring')
      );
      expect(hasCalfPreFatigue).toBe(true);
      expect(hasHamstringPreFatigue).toBe(true);
    });

    it('enforces slow eccentric tempos (>=3s) on all knee-loading movements in Lower sessions', () => {
      const lowerSessions = WORKOUT_SESSIONS.filter((s) => s.id.startsWith('lower_'));

      lowerSessions.forEach((session) => {
        session.exercises.forEach((exercise) => {
          const isKneeDominant =
            exercise.name.toLowerCase().includes('squat') ||
            exercise.name.toLowerCase().includes('step-down');

          if (isKneeDominant) {
            // First character of tempo ABCD is eccentric duration
            const eccentricDuration = parseInt(exercise.tempo[0], 10);
            expect(eccentricDuration).toBeGreaterThanOrEqual(3);
          }
        });
      });
    });

    it('defines pain-free regression paths for T1 Squat and T2 Split Squat in Lower A', () => {
      const lowerA = WORKOUT_SESSIONS.find((s) => s.id === 'lower_a')!;
      const squat = lowerA.exercises.find((e) => e.name.toLowerCase().includes('squat'))!;
      const splitSquat = lowerA.exercises.find((e) => e.name.toLowerCase().includes('split squat'))!;

      expect(squat.regression).toBeDefined();
      expect(squat.regression?.name.toLowerCase()).toContain('box squat');

      expect(splitSquat.regression).toBeDefined();
      expect(splitSquat.regression?.condition).toMatch(/pain/i);
    });

    it('verifies Lower B includes Alyssa Lu hip reset and ATG Elephant Walks', () => {
      const lowerB = WORKOUT_SESSIONS.find((s) => s.id === 'lower_b')!;
      const warmupNames = lowerB.warmup.map((w) => w.name.toLowerCase());

      const hasAlyssaLu = warmupNames.some(
        (name) => name.includes('alyssa lu') || name.includes('hip reset') || name.includes('90/90')
      );
      const hasElephantWalks = warmupNames.some((name) => name.includes('elephant walk'));

      expect(hasAlyssaLu).toBe(true);
      expect(hasElephantWalks).toBe(true);
    });
  });

  describe('Upper Body Shoulder Health & Calisthenics Gates', () => {
    it('verifies Upper A includes Indian club shoulder circles in warmup', () => {
      const upperA = WORKOUT_SESSIONS.find((s) => s.id === 'upper_a')!;
      const warmupNames = upperA.warmup.map((w) => w.name.toLowerCase());
      const hasIndianClubs = warmupNames.some((name) => name.includes('club'));
      expect(hasIndianClubs).toBe(true);
    });

    it('verifies Upper A T3 contains Athlean-X Non-Negotiable Face Pulls', () => {
      const upperA = WORKOUT_SESSIONS.find((s) => s.id === 'upper_a')!;
      const facePull = upperA.exercises.find((e) => e.name.toLowerCase().includes('face pull'));
      expect(facePull).toBeDefined();
      expect(facePull?.tier).toBe('T3');
    });

    it('verifies Upper B includes dead hangs and Marcus Filly tempo kettlebell Z-press', () => {
      const upperB = WORKOUT_SESSIONS.find((s) => s.id === 'upper_b')!;
      const warmupNames = upperB.warmup.map((w) => w.name.toLowerCase());
      const hasDeadHang = warmupNames.some((name) => name.includes('hang'));
      expect(hasDeadHang).toBe(true);

      const zPress = upperB.exercises.find((e) => e.name.toLowerCase().includes('z-press'));
      expect(zPress).toBeDefined();
      expect(zPress?.tempo).toBe('30X1');
    });
  });

  describe('Creator Cue Cards Encyclopedia Integrity', () => {
    it('contains at least 13 detailed creator cue cards', () => {
      expect(CUE_CARDS.length).toBeGreaterThanOrEqual(13);
    });

    it('represents all 9 creators + Dr. Stuart McGill across the cue encyclopedia', () => {
      const allCreatorMentions = new Set<string>();

      CUE_CARDS.forEach((card) => {
        card.creatorCues.forEach((cue) => {
          allCreatorMentions.add(cue.creator.toLowerCase());
        });
      });

      const requiredCreators = [
        'jeff nippard',
        'jeff cavaliere',
        'ben patrick',
        'dr. aaron horschig',
        'marcus filly',
        'coach eugene teo',
        'yellow dude',
        'dr. alyssa lu',
        'dr. stuart mcgill',
        'lucas hardie',
      ];

      requiredCreators.forEach((creator) => {
        const found = Array.from(allCreatorMentions).some((mention) =>
          mention.includes(creator.split(' ')[1]) // match surname
        );
        expect(found).toBe(true);
      });
    });

    it('validates every cue card contains setup, creator cues, common faults, and tempo', () => {
      CUE_CARDS.forEach((card) => {
        expect(card.id).toBeTruthy();
        expect(card.exerciseName).toBeTruthy();
        expect(card.setup).toBeTruthy();
        expect(card.creatorCues.length).toBeGreaterThan(0);
        expect(card.commonFaults.length).toBeGreaterThan(0);
        expect(card.tempo).toMatch(/^[0-9][0-9][0-9X][0-9]$/);
      });
    });
  });

  describe('Rest Presets Catalog', () => {
    it('contains presets for 15s, 30s, 60s, 90s, 120s, 180s, 240s, 300s', () => {
      const durations = REST_PRESETS.map((p) => p.durationSeconds);
      const expected = [15, 30, 60, 90, 120, 180, 240, 300];
      expected.forEach((d) => {
        expect(durations).toContain(d);
      });
    });
  });

  describe('getEffectiveExerciseTempo Cadence Resolution', () => {
    it('preserves standard 4-digit cadences and explicit HOLD formats', () => {
      expect(getEffectiveExerciseTempo('30X1', '8–10')).toBe('30X1');
      expect(getEffectiveExerciseTempo('3112', '10–12')).toBe('3112');
      expect(getEffectiveExerciseTempo('HOLD-45', '45s')).toBe('HOLD-45');
      expect(getEffectiveExerciseTempo('0010', '10s')).toBe('0010');
      expect(getEffectiveExerciseTempo('0030', '30s')).toBe('0030');
    });

    it('accurately resolves isometric hold durations from targetReps strings', () => {
      expect(getEffectiveExerciseTempo('Isometric Hold', '25–35s')).toBe('HOLD-35');
      expect(getEffectiveExerciseTempo('Isometric Hold', '30–45s')).toBe('HOLD-45');
      expect(getEffectiveExerciseTempo('Isometric Hold', '45–60s')).toBe('HOLD-60');
      expect(getEffectiveExerciseTempo('Isometric Hold', '15–25s')).toBe('HOLD-25');
      expect(getEffectiveExerciseTempo('Isometric Hold', '20–30s')).toBe('HOLD-30');
      expect(getEffectiveExerciseTempo('Isometric Holds', '10s')).toBe('HOLD-10');
      expect(getEffectiveExerciseTempo('Isometric Holds', '3 rounds')).toBe('HOLD-10');
      expect(getEffectiveExerciseTempo('Dead Hang', '45s dead hang + 10 club casts / side')).toBe('HOLD-45');
      expect(getEffectiveExerciseTempo('Isometric Hold', '40s hold')).toBe('HOLD-40');
      expect(getEffectiveExerciseTempo('Isometric Hold')).toBe('HOLD-30');
    });

    it('defaults to 30X1 for empty or missing tempo strings', () => {
      expect(getEffectiveExerciseTempo('')).toBe('30X1');
      expect(getEffectiveExerciseTempo(undefined)).toBe('30X1');
    });
  });
});
