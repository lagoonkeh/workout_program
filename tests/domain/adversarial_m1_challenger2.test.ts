import { describe, it, expect } from 'vitest';
import {
  WORKOUT_SESSIONS,
  SESSION_LOWER_A,
  SESSION_LOWER_B,
} from '../../src/domain/programData';
import { CUE_CARDS } from '../../src/domain/cueCardsData';
import { calculatePlates } from '../../src/domain/plateCalculator';
import {
  MobilityEntry,
  calculateMobilityProgress,
  getMobilityBenchmarkStatus,
  generateSparklinePoints,
  validateMobilityEntry,
  calculateMobilitySummary,
  getAllMobilitySummaries,
} from '../../src/domain/mobility';

describe('Adversarial Challenge M1-2: Biomechanics, Equipment, and Mobility Models', () => {
  // =========================================================================
  // 1. Equipment Constraints Adherence
  // =========================================================================
  describe('Adversarial Check 1: Strict Equipment Constraints', () => {
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

    const STRICT_FORBIDDEN_KEYWORDS = [
      'leg press',
      'cable crossover',
      'cable machine',
      'lat pulldown machine',
      'pec deck',
      'smith machine',
      'dumbbell',
      'leg extension machine',
      'hamstring curl machine',
      'hack squat machine',
    ];

    it('verifies all 4 sessions only require allowed equipment types', () => {
      WORKOUT_SESSIONS.forEach((session) => {
        session.equipmentRequired.forEach((eq) => {
          expect(ALLOWED_EQUIPMENT.has(eq), `Unauthorized equipment ${eq} in session ${session.id}`).toBe(true);
        });
      });
    });

    it('verifies no exercise or warmup description contains commercial machines outside inventory', () => {
      WORKOUT_SESSIONS.forEach((session) => {
        // Check warmup
        session.warmup.forEach((w) => {
          expect(ALLOWED_EQUIPMENT.has(w.equipment), `Warmup ${w.id} uses unlisted equipment ${w.equipment}`).toBe(true);
          const fullText = `${w.name} ${w.coachingNotes} ${w.biomechanicalPurpose}`.toLowerCase();
          STRICT_FORBIDDEN_KEYWORDS.forEach((keyword) => {
            expect(fullText, `Warmup ${w.id} mentions prohibited equipment: ${keyword}`).not.toContain(keyword);
          });
        });

        // Check working exercises
        session.exercises.forEach((ex) => {
          expect(ALLOWED_EQUIPMENT.has(ex.equipment), `Exercise ${ex.id} uses unlisted equipment ${ex.equipment}`).toBe(true);
          const fullText = `${ex.name} ${ex.biomechanicalRationale} ${ex.progressionRule}`.toLowerCase();
          STRICT_FORBIDDEN_KEYWORDS.forEach((keyword) => {
            expect(fullText, `Exercise ${ex.id} mentions prohibited equipment: ${keyword}`).not.toContain(keyword);
          });

          // Check regression if present
          if (ex.regression) {
            const regText = `${ex.regression.name} ${ex.regression.instructions}`.toLowerCase();
            STRICT_FORBIDDEN_KEYWORDS.forEach((keyword) => {
              expect(regText, `Regression for ${ex.id} mentions prohibited equipment: ${keyword}`).not.toContain(keyword);
            });
          }
        });
      });
    });

    it('verifies all kettlebell exercises fall strictly within BowFlex 840 inventory (8–40 lbs)', () => {
      WORKOUT_SESSIONS.forEach((session) => {
        session.exercises.forEach((ex) => {
          if (ex.equipment === 'kettlebell') {
            const weight = ex.defaultWeightLbs ?? ex.defaultWeight;
            if (weight !== undefined) {
              expect(weight, `KB exercise ${ex.id} weight ${weight} below 8 lbs`).toBeGreaterThanOrEqual(8);
              expect(weight, `KB exercise ${ex.id} weight ${weight} exceeds 40 lbs`).toBeLessThanOrEqual(40);
            }
          }
        });
      });
    });

    it('verifies all barbell default loads are exactly achievable with user plate inventory', () => {
      WORKOUT_SESSIONS.forEach((session) => {
        session.exercises.forEach((ex) => {
          if (ex.equipment === 'barbell') {
            const weight = ex.defaultWeightLbs ?? ex.defaultWeight;
            if (weight !== undefined) {
              const result = calculatePlates(weight);
              expect(result.isExact, `Barbell exercise ${ex.id} weight ${weight} cannot be loaded exactly`).toBe(true);
              expect(result.achievableWeight).toBe(weight);
              expect(result.achievableWeight).toBeLessThanOrEqual(300);
            }
          }
        });
      });
    });
  });

  // =========================================================================
  // 2. Knee Tendinitis Rules & Eccentrics
  // =========================================================================
  describe('Adversarial Check 2: Knee Tendinitis Protocols', () => {
    it('verifies all quad-dominant knee loading incorporates >= 3s eccentric tempo', () => {
      const kneeLoadingExerciseIds = [
        't1_bb_squat',
        't2_atg_split_squat',
        't3_patrick_step_down',
        't3_patrick_step_down_b',
      ];

      WORKOUT_SESSIONS.forEach((session) => {
        session.exercises.forEach((ex) => {
          if (kneeLoadingExerciseIds.includes(ex.id)) {
            const eccentricSeconds = parseInt(ex.tempo[0], 10);
            expect(eccentricSeconds, `Exercise ${ex.id} has eccentric tempo < 3s: ${ex.tempo}`).toBeGreaterThanOrEqual(3);
          }
        });
      });
    });

    it('verifies quad-dominant compound movements have explicit regressions defined', () => {
      // Lower A: T1 Squat and T2 Split Squat
      const squat = SESSION_LOWER_A.exercises.find((e) => e.id === 't1_bb_squat')!;
      const splitSquat = SESSION_LOWER_A.exercises.find((e) => e.id === 't2_atg_split_squat')!;

      expect(squat.regression, 'T1 Squat must have regression defined').toBeDefined();
      expect(squat.regression?.name).toMatch(/box squat/i);
      expect(parseInt(squat.regression!.tempo[0], 10)).toBeGreaterThanOrEqual(3);

      expect(splitSquat.regression, 'T2 Split Squat must have regression defined').toBeDefined();
      expect(splitSquat.regression?.name).toMatch(/elevated/i);
      expect(parseInt(splitSquat.regression!.tempo[0], 10)).toBeGreaterThanOrEqual(3);
    });

    it('verifies Patrick Step-Downs provide explicit plate progression/regression guidance', () => {
      const stepDownA = SESSION_LOWER_A.exercises.find((e) => e.id === 't3_patrick_step_down')!;
      const stepDownB = SESSION_LOWER_B.exercises.find((e) => e.id === 't3_patrick_step_down_b')!;

      expect(stepDownA.progressionRule).toMatch(/plate|step-down/i);
      expect(stepDownB.progressionRule).toMatch(/plate/i);
    });

    it('verifies zero ballistic knee extensions exist across entire program', () => {
      WORKOUT_SESSIONS.forEach((session) => {
        session.exercises.forEach((ex) => {
          expect(ex.name.toLowerCase()).not.toContain('jump');
          expect(ex.name.toLowerCase()).not.toContain('ballistic');
          expect(ex.name.toLowerCase()).not.toContain('extension machine');
        });
      });
    });
  });

  // =========================================================================
  // 3. Pre-Fatigue Sequencing
  // =========================================================================
  describe('Adversarial Check 3: Pre-Fatigue Sequencing', () => {
    it('verifies Lower A orders calf and hamstring pre-fatigue prior to Barbell Squat', () => {
      const lowerA = SESSION_LOWER_A;
      const warmupIds = lowerA.warmup.map((w) => w.id);

      const calfIdx = warmupIds.findIndex((id) => id === 'w_lower_a_3'); // Calf raise
      const hamIdx = warmupIds.findIndex((id) => id === 'w_lower_a_4'); // Hamstring hinge
      const reverseDriveIdx = warmupIds.findIndex((id) => id === 'w_lower_a_1'); // Reverse rowing

      expect(reverseDriveIdx).toBe(0); // Synovial flush first
      expect(calfIdx).toBeGreaterThan(-1);
      expect(hamIdx).toBeGreaterThan(-1);
      expect(calfIdx).toBeLessThan(hamIdx); // Calf precedes hamstring hinge

      // And all warmup items precede T1 Squat in exercises array
      const squatIdx = lowerA.exercises.findIndex((e) => e.id === 't1_bb_squat');
      expect(squatIdx).toBe(0);
      expect(lowerA.warmup.length).toBeGreaterThanOrEqual(4);
    });

    it('verifies Lower B orders Alyssa Lu Hip Reset and ATG Elephant Walks prior to RDL Deadlifts', () => {
      const lowerB = SESSION_LOWER_B;
      const warmupIds = lowerB.warmup.map((w) => w.id);

      const hipResetIdx = warmupIds.findIndex((id) => id === 'w_lower_b_1');
      const elephantWalkIdx = warmupIds.findIndex((id) => id === 'w_lower_b_2');

      expect(hipResetIdx).toBe(0); // Hip reset first
      expect(elephantWalkIdx).toBe(1); // Elephant walks second
      expect(hipResetIdx).toBeLessThan(elephantWalkIdx);

      // Deadlift is in exercises array after warmup
      const rdlIdx = lowerB.exercises.findIndex((e) => e.id === 't1_bb_rdl');
      expect(rdlIdx).toBe(0);
    });
  });

  // =========================================================================
  // 4. Creator Coverage in cueCardsData.ts
  // =========================================================================
  describe('Adversarial Check 4: 9 Creators + McGill Representation', () => {
    it('verifies all 9 creators + Dr. Stuart McGill have explicit quotes and rationales', () => {
      const creatorMap = new Map<string, number>();

      CUE_CARDS.forEach((card) => {
        card.creatorCues.forEach((cue) => {
          const name = cue.creator.toLowerCase();
          creatorMap.set(name, (creatorMap.get(name) || 0) + 1);
          // Verify cue is not empty
          expect(cue.quote.length).toBeGreaterThan(15);
          expect(cue.biomechanicalRationale.length).toBeGreaterThan(15);
        });
      });

      const requiredCreators = [
        { key: 'nippard', name: 'Jeff Nippard' },
        { key: 'cavaliere', name: 'Jeff Cavaliere (ATHLEAN-X)' },
        { key: 'patrick', name: 'Ben Patrick (ATG)' },
        { key: 'horschig', name: 'Dr. Aaron Horschig (Squat University)' },
        { key: 'filly', name: 'Marcus Filly (FBB)' },
        { key: 'teo', name: 'Coach Eugene Teo' },
        { key: 'yellow dude', name: 'Yellow Dude' },
        { key: 'alyssa lu', name: 'Dr. Alyssa Lu (Proformance)' },
        { key: 'mcgill', name: 'Dr. Stuart McGill' },
        { key: 'hardie', name: 'Lucas Hardie (Range of Strength)' },
      ];

      requiredCreators.forEach(({ key, name }) => {
        const matches = Array.from(creatorMap.entries()).filter(([creator]) =>
          creator.includes(key)
        );
        const totalMentions = matches.reduce((sum, [, count]) => sum + count, 0);
        expect(totalMentions, `Creator ${name} has zero quotes in cue cards!`).toBeGreaterThanOrEqual(1);
      });
    });

    it('verifies each cue card contains all required metadata fields', () => {
      CUE_CARDS.forEach((card) => {
        expect(card.id).toBeTruthy();
        expect(card.exerciseName).toBeTruthy();
        expect(card.setupInstructions.length).toBeGreaterThan(0);
        expect(card.creatorCues.length).toBeGreaterThan(0);
        expect(card.commonFaults.length).toBeGreaterThan(0);
        expect(card.rehabRegressions.length).toBeGreaterThan(0);
      });
    });
  });

  // =========================================================================
  // 5. Mobility Domain Calculations Stress Testing
  // =========================================================================
  describe('Adversarial Check 5: Mobility Model Calculations & Edge Cases', () => {
    describe('Polarity Inversion for Split Squat Elevation (lower is better)', () => {
      it('marks decrease in elevation height as improved', () => {
        const history: MobilityEntry[] = [
          { testId: 'split-squat-elevation', date: '2026-10-01T00:00:00Z', value: 12 },
          { testId: 'split-squat-elevation', date: '2026-10-10T00:00:00Z', value: 6 },
          { testId: 'split-squat-elevation', date: '2026-10-20T00:00:00Z', value: 0 },
        ];

        const progress = calculateMobilityProgress(history, 'split-squat-elevation');
        expect(progress.baseline).toBe(12);
        expect(progress.latest).toBe(0);
        expect(progress.delta).toBe(-12);
        expect(progress.status).toBe('improved');
        expect(progress.isTargetMet).toBe(true); // 0" is target
      });

      it('marks increase in elevation height as declined', () => {
        const history: MobilityEntry[] = [
          { testId: 'split-squat-elevation', date: '2026-10-01T00:00:00Z', value: 2 },
          { testId: 'split-squat-elevation', date: '2026-10-10T00:00:00Z', value: 8 },
        ];

        const progress = calculateMobilityProgress(history, 'split-squat-elevation');
        expect(progress.delta).toBe(6);
        expect(progress.status).toBe('declined');
        expect(progress.isTargetMet).toBe(false);
      });

      it('correctly sets personalBest to minimum elevation achieved', () => {
        const history: MobilityEntry[] = [
          { testId: 'split-squat-elevation', date: '2026-10-01T00:00:00Z', value: 12 },
          { testId: 'split-squat-elevation', date: '2026-10-05T00:00:00Z', value: 2 },
          { testId: 'split-squat-elevation', date: '2026-10-10T00:00:00Z', value: 6 },
        ];

        const summary = calculateMobilitySummary('split-squat-elevation', history);
        expect(summary.personalBest).toBe(2); // Minimum elevation is the PB!
      });
    });

    describe('Higher is Better Metrics (Knee-to-Wall, Sorensen, Dead Hang, Elephant Walk)', () => {
      it('correctly sets personalBest to maximum value achieved', () => {
        const history: MobilityEntry[] = [
          { testId: 'dead-hang', date: '2026-10-01T00:00:00Z', value: 45 },
          { testId: 'dead-hang', date: '2026-10-05T00:00:00Z', value: 95 },
          { testId: 'dead-hang', date: '2026-10-10T00:00:00Z', value: 60 },
        ];

        const summary = calculateMobilitySummary('dead-hang', history);
        expect(summary.personalBest).toBe(95); // Maximum hang time is the PB!
      });
    });

    describe('Boundary Value Classifications in getMobilityBenchmarkStatus', () => {
      it('tests exact Knee-to-Wall boundaries', () => {
        expect(getMobilityBenchmarkStatus('knee-to-wall', 0).status).toBe('severe_restriction');
        expect(getMobilityBenchmarkStatus('knee-to-wall', 1.99).status).toBe('severe_restriction');
        expect(getMobilityBenchmarkStatus('knee-to-wall', 2.0).status).toBe('moderate_restriction');
        expect(getMobilityBenchmarkStatus('knee-to-wall', 3.99).status).toBe('moderate_restriction');
        expect(getMobilityBenchmarkStatus('knee-to-wall', 4.0).status).toBe('functional');
        expect(getMobilityBenchmarkStatus('knee-to-wall', 4.99).status).toBe('functional');
        expect(getMobilityBenchmarkStatus('knee-to-wall', 5.0).status).toBe('optimal');
        expect(getMobilityBenchmarkStatus('knee-to-wall', 5.0).isTargetMet).toBe(true);
      });

      it('tests exact Biering-Sorensen boundaries', () => {
        expect(getMobilityBenchmarkStatus('biering-sorensen', 59).status).toBe('suboptimal');
        expect(getMobilityBenchmarkStatus('biering-sorensen', 60).status).toBe('adequate');
        expect(getMobilityBenchmarkStatus('biering-sorensen', 119).status).toBe('adequate');
        expect(getMobilityBenchmarkStatus('biering-sorensen', 120).status).toBe('optimal');
        expect(getMobilityBenchmarkStatus('biering-sorensen', 120).isTargetMet).toBe(true);
      });

      it('tests exact Split Squat Elevation boundaries', () => {
        expect(getMobilityBenchmarkStatus('split-squat-elevation', 18).status).toBe('regressed');
        expect(getMobilityBenchmarkStatus('split-squat-elevation', 6.01).status).toBe('regressed');
        expect(getMobilityBenchmarkStatus('split-squat-elevation', 6.0).status).toBe('near_mastery');
        expect(getMobilityBenchmarkStatus('split-squat-elevation', 0.1).status).toBe('near_mastery');
        expect(getMobilityBenchmarkStatus('split-squat-elevation', 0).status).toBe('optimal');
        expect(getMobilityBenchmarkStatus('split-squat-elevation', 0).isTargetMet).toBe(true);
      });

      it('tests exact Elephant Walk levels (1 to 5)', () => {
        expect(getMobilityBenchmarkStatus('elephant-walk', 1).status).toBe('severe_restriction');
        expect(getMobilityBenchmarkStatus('elephant-walk', 2).status).toBe('moderate_restriction');
        expect(getMobilityBenchmarkStatus('elephant-walk', 3).status).toBe('baseline');
        expect(getMobilityBenchmarkStatus('elephant-walk', 4).status).toBe('functional');
        expect(getMobilityBenchmarkStatus('elephant-walk', 5).status).toBe('optimal');
        expect(getMobilityBenchmarkStatus('elephant-walk', 5).isTargetMet).toBe(true);
      });

      it('tests exact Dead Hang boundaries', () => {
        expect(getMobilityBenchmarkStatus('dead-hang', 29).status).toBe('restricted');
        expect(getMobilityBenchmarkStatus('dead-hang', 30).status).toBe('baseline');
        expect(getMobilityBenchmarkStatus('dead-hang', 59).status).toBe('baseline');
        expect(getMobilityBenchmarkStatus('dead-hang', 60).status).toBe('optimal');
        expect(getMobilityBenchmarkStatus('dead-hang', 60).isTargetMet).toBe(true);
      });
    });

    describe('Defensive Robustness & Edge Cases', () => {
      it('gracefully handles empty history in getAllMobilitySummaries', () => {
        const summaries = getAllMobilitySummaries([]);
        expect(summaries).toHaveLength(7);
        summaries.forEach((s) => {
          expect(s.latestValue).toBeNull();
          expect(s.personalBest).toBeNull();
          expect(s.status).toBe('untested');
        });
      });

      it('rejects invalid inputs during validateMobilityEntry', () => {
        expect(validateMobilityEntry({ testId: 'knee-to-wall', value: -1 }).isValid).toBe(false);
        expect(validateMobilityEntry({ testId: 'elephant-walk', value: 6 }).isValid).toBe(false);
        expect(validateMobilityEntry({ testId: 'elephant-walk', value: 0 }).isValid).toBe(false);
        expect(validateMobilityEntry({ testId: 'elephant-walk', value: 3.5 }).isValid).toBe(false);
        // @ts-expect-error testing invalid ID
        expect(validateMobilityEntry({ testId: 'invalid-test', value: 10 }).isValid).toBe(false);
      });

      it('sparkline coordinate math survives flat values without NaN or Infinity', () => {
        const flatEntries: MobilityEntry[] = [
          { testId: 'knee-to-wall', value: 4.5 },
          { testId: 'knee-to-wall', value: 4.5 },
        ];
        const sparkline = generateSparklinePoints(flatEntries, 100, 30);
        expect(sparkline).toBe('0,15 100,15');
      });

      it('sparkline coordinate math survives single entry', () => {
        const single: MobilityEntry[] = [{ testId: 'knee-to-wall', value: 5.0 }];
        const sparkline = generateSparklinePoints(single, 100, 30);
        expect(sparkline).toBe('0,15');
      });
    });
  });
});
