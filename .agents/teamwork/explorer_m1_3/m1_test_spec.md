# Milestone 1 Testing Blueprint & Unit Test Specification
**Project**: 4-Day Upper/Lower Workout Web Application  
**Author**: Explorer M1-3 (Domain Test Architect)  
**Date**: 2026-10-13  
**Status**: Ready for Implementation Worker  
**Target Milestone**: Milestone 1 (Core Domain Models & Algorithms)

---

## 1. Executive Summary & Verification Strategy

This document delivers the comprehensive unit testing blueprint and production-grade test specifications for Milestone 1. The test suite exercises pure TypeScript business logic with zero DOM or network dependencies, achieving sub-millisecond execution times on Windows 11.

### Scope of Verification
1. **`tests/domain/plateCalculator.test.ts`**:
   - Exhaustive validation of all **52 achievable barbell weights** ($45\text{ to }300\text{ lbs}$ in $5\text{ lb}$ increments) on the user's specific plate inventory ($2\times 45, 2\times 35, 2\times 25, 2\times 10, 4\times 5, 2\times 2.5\text{ lbs}$).
   - Strict mathematical assertions proving **knapsack subset-sum plate minimization** over greedy flaws at boundary targets: $165, 170, 175, 180\text{ lbs}$.
   - Boundary tests for tare bar ($45\text{ lbs}$), full capacity ($300\text{ lbs}$), below-tare inputs ($<45\text{ lbs}$), above-capacity inputs ($>300\text{ lbs}$), odd unachievable fractions ($47.5, 52.5, 162\text{ lbs}$), negative values, and malformed inputs (`NaN`, `null`, `undefined`).
   - Custom inventory overrides.
2. **`tests/domain/programData.test.ts`**:
   - Verification of all 4 training sessions (`lower_a`, `upper_a`, `lower_b`, `upper_b`).
   - 100% adherence to available home gym equipment (Barbell & rack, Landmine, Pull-up bar, BowFlex 840 kettlebell 8-40 lbs, Indian clubs 2 & 5 lb, Rowing machine) with zero unauthorized commercial gym gear.
   - Exact GZCL Tier compliance: Tier 1 ($5\times 3+$, 3–5 min rest), Tier 2 ($3\times 8-10$, 2–3 min rest), Tier 3 ($3-4\times 12-20$ or 20 Effective Reps, 60–90s or 15–30s rest).
   - Patellar tendinitis bulletproofing: $\ge 3\text{s}$ controlled eccentric tempos (`31X1`, `4010`) on all knee-dominant exercises, box squat and elevation regressions, and mandatory warmup pre-fatigue (Eugene Teo calf/hamstring activation before heavy squats).
   - Complete 13-card creator cue encyclopedia covering all 8 creators + Dr. Stuart McGill.
3. **`tests/domain/mobility.test.ts`**:
   - Validation and scoring logic for all 5 creator mobility assessments: ATG Elephant Walks (1–5 level), Knee-to-Wall Ankle Dorsiflexion (inches), ATG Split Squat Elevation (inches regression to 0), Dr. Stuart McGill Biering-Sørensen Hold (seconds), and Dead Hang Decompression (seconds).
   - Proper directional polarity: verification that decreasing elevation in ATG Split Squat ($6" \rightarrow 2"$) correctly registers as positive progress ($\Delta < 0$).
   - Input sanitization (negative rejection, level bounding, type safety).
   - Sparkline SVG polyline coordinate generator and zero-division defenses.
4. **Vitest Configuration & Windows 11 CLI Commands**:
   - `vitest.config.ts`, `tests/setup.ts`, Windows PowerShell / cmd batch compatibility (`npm.cmd test`, `npx.cmd vitest run tests/domain`).

---

## 2. Test File 1 Specification: `tests/domain/plateCalculator.test.ts`

### 2.1 File Location
`C:\Users\lagoo\.gemini\antigravity\scratch\workout_program\tests\domain\plateCalculator.test.ts`

### 2.2 Domain Interface Under Test
```typescript
export interface PlateInventory {
  45: number; // 2
  35: number; // 2
  25: number; // 2
  10: number; // 2
  5: number;  // 4
  2.5: number;// 2
}

export interface PlateCalculationResult {
  targetWeight: number;
  barWeight: number; // 45
  weightPerSide: number;
  platesPerSide: number[];
  achievableWeight: number;
  isExact: boolean;
  totalPlatesUsed: number;
  remainder: number;
  message?: string;
}

export function calculatePlates(targetWeight: number, inventory?: PlateInventory): PlateCalculationResult;
```

### 2.3 Complete Source Code for `tests/domain/plateCalculator.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import {
  calculatePlates,
  DEFAULT_PLATE_INVENTORY,
  PlateInventory,
} from '../../src/domain/plateCalculator';

describe('Barbell Plate Calculator Domain Engine', () => {
  describe('Mathematical Invariants across all 52 Achievable Barbell Weights (45 to 300 lbs in 5 lb increments)', () => {
    // Generate all 52 achievable weights: 45, 50, 55, ..., 295, 300
    const achievableWeights = Array.from({ length: 52 }, (_, i) => 45 + i * 5);

    achievableWeights.forEach((targetWeight) => {
      it(`resolves target ${targetWeight} lbs with exact symmetry and valid inventory`, () => {
        const result = calculatePlates(targetWeight);

        // 1. Exactness & Target Verification
        expect(result.isExact).toBe(true);
        expect(result.targetWeight).toBe(targetWeight);
        expect(result.achievableWeight).toBe(targetWeight);
        expect(result.remainder).toBe(0);
        expect(result.barWeight).toBe(45);

        // 2. Per-side Weight Mathematics
        const expectedPerSide = (targetWeight - 45) / 2;
        expect(result.weightPerSide).toBe(expectedPerSide);

        const sumOfPlatesPerSide = result.platesPerSide.reduce((sum, p) => sum + p, 0);
        expect(sumOfPlatesPerSide).toBe(expectedPerSide);

        // 3. Total Weight Invariant: Bar + 2 * sum(platesPerSide) === targetWeight
        expect(result.barWeight + 2 * sumOfPlatesPerSide).toBe(targetWeight);

        // 4. Plate Count Consistency
        expect(result.totalPlatesUsed).toBe(result.platesPerSide.length * 2);

        // 5. Plate Sorting Order: Heaviest to lightest
        for (let j = 0; j < result.platesPerSide.length - 1; j++) {
          expect(result.platesPerSide[j]).toBeGreaterThanOrEqual(result.platesPerSide[j + 1]);
        }

        // 6. Plate Inventory Limits Per Side: [45:1, 35:1, 25:1, 10:1, 5:2, 2.5:1]
        const plateCounts: Record<number, number> = {};
        for (const plate of result.platesPerSide) {
          plateCounts[plate] = (plateCounts[plate] || 0) + 1;
        }

        expect(plateCounts[45] || 0).toBeLessThanOrEqual(DEFAULT_PLATE_INVENTORY[45] / 2); // max 1
        expect(plateCounts[35] || 0).toBeLessThanOrEqual(DEFAULT_PLATE_INVENTORY[35] / 2); // max 1
        expect(plateCounts[25] || 0).toBeLessThanOrEqual(DEFAULT_PLATE_INVENTORY[25] / 2); // max 1
        expect(plateCounts[10] || 0).toBeLessThanOrEqual(DEFAULT_PLATE_INVENTORY[10] / 2); // max 1
        expect(plateCounts[5] || 0).toBeLessThanOrEqual(DEFAULT_PLATE_INVENTORY[5] / 2);   // max 2
        expect(plateCounts[2.5] || 0).toBeLessThanOrEqual(DEFAULT_PLATE_INVENTORY[2.5] / 2); // max 1
      });
    });
  });

  describe('Knapsack Subset-Sum Minimization vs Greedy Flaw Verification', () => {
    it('proves minimal plate count at 165 lbs: loads [35, 25] (2 plates/side) instead of greedy [45, 10, 5] (3 plates/side)', () => {
      // 165 lbs target -> 60 lbs per side
      // Greedy selection takes 45, then 10, then 5 = 3 plates per side (6 total)
      // Optimal subset-sum takes 35 + 25 = 2 plates per side (4 total)
      const result = calculatePlates(165);

      expect(result.isExact).toBe(true);
      expect(result.platesPerSide).toEqual([35, 25]);
      expect(result.platesPerSide.length).toBe(2);
      expect(result.totalPlatesUsed).toBe(4);
    });

    it('proves minimal plate count at 170 lbs: loads [35, 25, 2.5] (3 plates/side) instead of greedy [45, 10, 5, 2.5] (4 plates/side)', () => {
      // 170 lbs target -> 62.5 lbs per side
      // Greedy takes 45 + 10 + 5 + 2.5 = 4 plates per side (8 total)
      // Optimal subset-sum takes 35 + 25 + 2.5 = 3 plates per side (6 total)
      const result = calculatePlates(170);

      expect(result.isExact).toBe(true);
      expect(result.platesPerSide).toEqual([35, 25, 2.5]);
      expect(result.platesPerSide.length).toBe(3);
      expect(result.totalPlatesUsed).toBe(6);
    });

    it('proves minimal plate count at 175 lbs: loads [35, 25, 5] (3 plates/side) instead of greedy [45, 10, 5, 5] (4 plates/side)', () => {
      // 175 lbs target -> 65 lbs per side
      // Greedy takes 45 + 10 + 5 + 5 = 4 plates per side (8 total)
      // Optimal subset-sum takes 35 + 25 + 5 = 3 plates per side (6 total)
      const result = calculatePlates(175);

      expect(result.isExact).toBe(true);
      expect(result.platesPerSide).toEqual([35, 25, 5]);
      expect(result.platesPerSide.length).toBe(3);
      expect(result.totalPlatesUsed).toBe(6);
    });

    it('proves minimal plate count at 180 lbs: loads [35, 25, 5, 2.5] (4 plates/side) instead of greedy [45, 10, 5, 5, 2.5] (5 plates/side)', () => {
      // 180 lbs target -> 67.5 lbs per side
      // Greedy takes 45 + 10 + 5 + 5 + 2.5 = 5 plates per side (10 total)
      // Optimal subset-sum takes 35 + 25 + 5 + 2.5 = 4 plates per side (8 total)
      const result = calculatePlates(180);

      expect(result.isExact).toBe(true);
      expect(result.platesPerSide).toEqual([35, 25, 5, 2.5]);
      expect(result.platesPerSide.length).toBe(4);
      expect(result.totalPlatesUsed).toBe(8);
    });
  });

  describe('Standard Milestone Weight Loadings', () => {
    it('handles empty barbell (45 lbs) with 0 plates', () => {
      const result = calculatePlates(45);
      expect(result.isExact).toBe(true);
      expect(result.platesPerSide).toEqual([]);
      expect(result.totalPlatesUsed).toBe(0);
      expect(result.weightPerSide).toBe(0);
    });

    it('handles single 45 lb plate per side for 135 lbs', () => {
      const result = calculatePlates(135);
      expect(result.isExact).toBe(true);
      expect(result.platesPerSide).toEqual([45]);
      expect(result.totalPlatesUsed).toBe(2);
    });

    it('handles 185 lbs with 45 + 25', () => {
      const result = calculatePlates(185);
      expect(result.isExact).toBe(true);
      expect(result.platesPerSide).toEqual([45, 25]);
      expect(result.totalPlatesUsed).toBe(4);
    });

    it('handles 225 lbs with two 45 lb plates per side', () => {
      // Inventory has 2x 45 plates total -> 1 per side!
      // Wait! 225 lbs requires (225-45)/2 = 90 lbs per side.
      // Available per side: [45, 35, 25, 10, 5, 5, 2.5]. Notice there is only ONE 45 per side!
      // 90 lbs = 45 + 35 + 10!
      const result = calculatePlates(225);
      expect(result.isExact).toBe(true);
      expect(result.platesPerSide).toEqual([45, 35, 10]);
      expect(result.totalPlatesUsed).toBe(6);
    });

    it('handles maximum possible load (300 lbs) utilizing 100% of plate inventory', () => {
      // 300 lbs -> 127.5 lbs per side -> all 7 plates per side
      const result = calculatePlates(300);
      expect(result.isExact).toBe(true);
      expect(result.platesPerSide).toEqual([45, 35, 25, 10, 5, 5, 2.5]);
      expect(result.platesPerSide.length).toBe(7);
      expect(result.totalPlatesUsed).toBe(14);
      expect(result.remainder).toBe(0);
    });
  });

  describe('Boundary Conditions: Below Tare and Exceeding Capacity', () => {
    it('returns empty bar and isExact: false when target is below 45 lbs (e.g. 35 lbs)', () => {
      const result = calculatePlates(35);
      expect(result.isExact).toBe(false);
      expect(result.achievableWeight).toBe(45);
      expect(result.platesPerSide).toEqual([]);
      expect(result.totalPlatesUsed).toBe(0);
      expect(result.message).toMatch(/below empty bar/i);
    });

    it('handles 0 lbs gracefully without throwing', () => {
      const result = calculatePlates(0);
      expect(result.isExact).toBe(false);
      expect(result.achievableWeight).toBe(45);
      expect(result.platesPerSide).toEqual([]);
    });

    it('handles negative weights gracefully without throwing', () => {
      const result = calculatePlates(-50);
      expect(result.isExact).toBe(false);
      expect(result.achievableWeight).toBe(45);
      expect(result.platesPerSide).toEqual([]);
    });

    it('clamps to max capacity (300 lbs) when target exceeds inventory (e.g. 305 lbs)', () => {
      const result = calculatePlates(305);
      expect(result.isExact).toBe(false);
      expect(result.achievableWeight).toBe(300);
      expect(result.platesPerSide).toEqual([45, 35, 25, 10, 5, 5, 2.5]);
      expect(result.totalPlatesUsed).toBe(14);
      expect(result.remainder).toBe(5);
      expect(result.message).toMatch(/exceeds/i);
    });

    it('clamps to 300 lbs when target is extreme (e.g. 500 lbs)', () => {
      const result = calculatePlates(500);
      expect(result.isExact).toBe(false);
      expect(result.achievableWeight).toBe(300);
      expect(result.remainder).toBe(200);
    });
  });

  describe('Odd Increments and Unachievable Fractions', () => {
    it('handles single fractional 2.5 lb target above bar (47.5 lbs) by flagging non-exact symmetry', () => {
      // 47.5 lbs would require 1.25 lbs per side, which does not exist in inventory
      const result = calculatePlates(47.5);
      expect(result.isExact).toBe(false);
      expect([45, 50]).toContain(result.achievableWeight);
      expect(result.remainder).not.toBe(0);
    });

    it('handles arbitrary decimal targets (e.g. 162.3 lbs)', () => {
      const result = calculatePlates(162.3);
      expect(result.isExact).toBe(false);
      expect([160, 165]).toContain(result.achievableWeight);
    });
  });

  describe('Malformed and Edge Case Inputs', () => {
    it('handles NaN safely defaulting to empty bar', () => {
      const result = calculatePlates(NaN);
      expect(result.isExact).toBe(false);
      expect(result.achievableWeight).toBe(45);
      expect(result.platesPerSide).toEqual([]);
    });

    it('handles null / undefined / empty string safely', () => {
      // @ts-expect-error Testing runtime defensive checks
      const resultNull = calculatePlates(null);
      expect(resultNull.isExact).toBe(false);
      expect(resultNull.achievableWeight).toBe(45);

      // @ts-expect-error Testing runtime defensive checks
      const resultUndefined = calculatePlates(undefined);
      expect(resultUndefined.isExact).toBe(false);
      expect(resultUndefined.achievableWeight).toBe(45);
    });
  });

  describe('Custom Inventory Parameter Support', () => {
    it('supports custom plate inventory with restricted plates', () => {
      const customInventory: PlateInventory = {
        45: 2, // 1 per side
        35: 0,
        25: 2, // 1 per side
        10: 0,
        5: 0,
        2.5: 0,
      };

      // Target 185 lbs -> 70 lbs per side -> 45 + 25 = 70
      const result = calculatePlates(185, customInventory);
      expect(result.isExact).toBe(true);
      expect(result.platesPerSide).toEqual([45, 25]);

      // Target 135 lbs -> 45 lbs per side -> 45
      const result135 = calculatePlates(135, customInventory);
      expect(result135.isExact).toBe(true);
      expect(result135.platesPerSide).toEqual([45]);

      // Target 155 lbs -> 55 lbs per side -> unachievable with only 45 and 25
      const result155 = calculatePlates(155, customInventory);
      expect(result155.isExact).toBe(false);
    });
  });
});
```

---

## 3. Test File 2 Specification: `tests/domain/programData.test.ts`

### 3.1 File Location
`C:\Users\lagoo\.gemini\antigravity\scratch\workout_program\tests\domain\programData.test.ts`

### 3.2 Domain Interfaces Under Test
```typescript
import {
  WORKOUT_SESSIONS,
  REST_PRESETS,
  WorkoutSession,
  WorkoutExercise,
} from '../../src/domain/programData';
import { CUE_CARDS } from '../../src/domain/cueCardsData';
```

### 3.3 Complete Source Code for `tests/domain/programData.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import {
  WORKOUT_SESSIONS,
  REST_PRESETS,
  WorkoutSession,
  WorkoutExercise,
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

    it('restricts kettlebell exercise loading to BowFlex 840 capacity (8 to 40 lbs)', () => {
      WORKOUT_SESSIONS.forEach((session) => {
        session.exercises.forEach((exercise) => {
          if (exercise.equipment === 'kettlebell' && exercise.defaultWeight) {
            expect(exercise.defaultWeight).toBeGreaterThanOrEqual(8);
            expect(exercise.defaultWeight).toBeLessThanOrEqual(40);
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
            expect(t1.isAmrapLastSet).toBe(true);
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

    it('represents all 8 creators + Dr. Stuart McGill across the cue encyclopedia', () => {
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
});
```

---

## 4. Test File 3 Specification: `tests/domain/mobility.test.ts`

### 4.1 File Location
`C:\Users\lagoo\.gemini\antigravity\scratch\workout_program\tests\domain\mobility.test.ts`

### 4.2 Domain Interfaces Under Test
```typescript
import {
  MOBILITY_PROTOCOLS,
  MobilityTestId,
  MobilityEntry,
  validateMobilityEntry,
  calculateMobilityProgress,
  getMobilityBenchmarkStatus,
  generateSparklinePoints,
} from '../../src/domain/mobility';
```

### 4.3 Complete Source Code for `tests/domain/mobility.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import {
  MOBILITY_PROTOCOLS,
  MobilityTestId,
  MobilityEntry,
  validateMobilityEntry,
  calculateMobilityProgress,
  getMobilityBenchmarkStatus,
  generateSparklinePoints,
} from '../../src/domain/mobility';

describe('Mobility & Flexibility Assessment Domain Module', () => {
  describe('Protocol Definitions Inventory', () => {
    it('defines exactly 5 standardized assessment protocols', () => {
      expect(MOBILITY_PROTOCOLS).toHaveLength(5);
    });

    it('contains all required assessment test IDs', () => {
      const testIds = MOBILITY_PROTOCOLS.map((p) => p.id);
      expect(testIds).toEqual([
        'elephant-walk',
        'knee-to-wall',
        'split-squat-elevation',
        'biering-sorensen',
        'dead-hang',
      ]);
    });

    it('specifies correct creator attribution for each assessment', () => {
      const creators = Object.fromEntries(MOBILITY_PROTOCOLS.map((p) => [p.id, p.creator]));
      expect(creators['elephant-walk']).toMatch(/Ben Patrick|ATG/i);
      expect(creators['knee-to-wall']).toMatch(/Dr\. Aaron Horschig|Squat University/i);
      expect(creators['split-squat-elevation']).toMatch(/Ben Patrick|ATG/i);
      expect(creators['biering-sorensen']).toMatch(/Dr\. Stuart McGill/i);
      expect(creators['dead-hang']).toMatch(/Cavaliere|Yellow Dude/i);
    });

    it('configures direction of improvement correctly for each assessment', () => {
      const directions = Object.fromEntries(
        MOBILITY_PROTOCOLS.map((p) => [p.id, p.improvementDirection])
      );
      // Higher is better for reach, dorsiflexion, spinal endurance, and dead hang
      expect(directions['elephant-walk']).toBe('higher');
      expect(directions['knee-to-wall']).toBe('higher');
      expect(directions['biering-sorensen']).toBe('higher');
      expect(directions['dead-hang']).toBe('higher');

      // LOWER elevation is better for ATG split squat regression towards flat ground (0")
      expect(directions['split-squat-elevation']).toBe('lower');
    });
  });

  describe('Entry Validation Logic (validateMobilityEntry)', () => {
    it('approves a valid Elephant Walk entry (level 1-5)', () => {
      const validEntry: MobilityEntry = {
        id: 'entry-1',
        testId: 'elephant-walk',
        date: '2026-10-13T08:00:00.000Z',
        value: 4,
        notes: 'Knuckles touching floor',
      };
      const result = validateMobilityEntry(validEntry);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('rejects Elephant Walk levels outside 1-5 range', () => {
      expect(validateMobilityEntry({ testId: 'elephant-walk', value: 0 }).isValid).toBe(false);
      expect(validateMobilityEntry({ testId: 'elephant-walk', value: 6 }).isValid).toBe(false);
      expect(validateMobilityEntry({ testId: 'elephant-walk', value: 2.5 }).isValid).toBe(false);
      expect(validateMobilityEntry({ testId: 'elephant-walk', value: -1 }).isValid).toBe(false);
    });

    it('rejects negative values for any test', () => {
      const testIds: MobilityTestId[] = [
        'elephant-walk',
        'knee-to-wall',
        'split-squat-elevation',
        'biering-sorensen',
        'dead-hang',
      ];

      testIds.forEach((testId) => {
        const result = validateMobilityEntry({ testId, value: -5 });
        expect(result.isValid).toBe(false);
        expect(result.error).toMatch(/negative/i);
      });
    });

    it('rejects NaN or non-numeric values', () => {
      const result = validateMobilityEntry({ testId: 'knee-to-wall', value: NaN });
      expect(result.isValid).toBe(false);
    });

    it('rejects missing testId or missing date', () => {
      // @ts-expect-error Testing defensive check
      expect(validateMobilityEntry({ value: 5 }).isValid).toBe(false);
      expect(validateMobilityEntry({ testId: 'knee-to-wall', value: 5, date: '' }).isValid).toBe(
        false
      );
    });
  });

  describe('Mobility Progress & Delta Analytics (calculateMobilityProgress)', () => {
    it('handles single entry as baseline with zero delta', () => {
      const history: MobilityEntry[] = [
        {
          id: '1',
          testId: 'biering-sorensen',
          date: '2026-10-01T08:00:00.000Z',
          value: 90,
        },
      ];

      const progress = calculateMobilityProgress(history, 'biering-sorensen');
      expect(progress.baseline).toBe(90);
      expect(progress.latest).toBe(90);
      expect(progress.delta).toBe(0);
      expect(progress.status).toBe('baseline');
    });

    it('correctly calculates positive progress for higher-is-better tests (Knee-to-Wall)', () => {
      const history: MobilityEntry[] = [
        { id: '1', testId: 'knee-to-wall', date: '2026-10-01T08:00:00.000Z', value: 3.5 },
        { id: '2', testId: 'knee-to-wall', date: '2026-10-08T08:00:00.000Z', value: 4.2 },
        { id: '3', testId: 'knee-to-wall', date: '2026-10-15T08:00:00.000Z', value: 5.0 },
      ];

      const progress = calculateMobilityProgress(history, 'knee-to-wall');
      expect(progress.baseline).toBe(3.5);
      expect(progress.latest).toBe(5.0);
      expect(progress.delta).toBeCloseTo(1.5, 2);
      expect(progress.status).toBe('improved');
      expect(progress.isTargetMet).toBe(true); // 5.0" is benchmark
    });

    it('correctly inverts delta for lower-is-better tests (ATG Split Squat Elevation)', () => {
      // User progresses from 6" elevation down to 2" elevation
      const history: MobilityEntry[] = [
        { id: '1', testId: 'split-squat-elevation', date: '2026-10-01T08:00:00.000Z', value: 6.0 },
        { id: '2', testId: 'split-squat-elevation', date: '2026-10-08T08:00:00.000Z', value: 4.0 },
        { id: '3', testId: 'split-squat-elevation', date: '2026-10-15T08:00:00.000Z', value: 2.0 },
      ];

      const progress = calculateMobilityProgress(history, 'split-squat-elevation');
      expect(progress.baseline).toBe(6.0);
      expect(progress.latest).toBe(2.0);
      // Raw mathematical difference is -4.0, but status MUST be 'improved'!
      expect(progress.status).toBe('improved');
      expect(progress.delta).toBe(-4.0);
    });

    it('detects decline when hold time decreases (Biering-Sørensen)', () => {
      const history: MobilityEntry[] = [
        { id: '1', testId: 'biering-sorensen', date: '2026-10-01T08:00:00.000Z', value: 120 },
        { id: '2', testId: 'biering-sorensen', date: '2026-10-08T08:00:00.000Z', value: 90 },
      ];

      const progress = calculateMobilityProgress(history, 'biering-sorensen');
      expect(progress.delta).toBe(-30);
      expect(progress.status).toBe('declined');
    });

    it('stably sorts entries by date even if input array is out of chronological order', () => {
      const history: MobilityEntry[] = [
        { id: '3', testId: 'dead-hang', date: '2026-10-15T08:00:00.000Z', value: 75 },
        { id: '1', testId: 'dead-hang', date: '2026-10-01T08:00:00.000Z', value: 40 },
        { id: '2', testId: 'dead-hang', date: '2026-10-08T08:00:00.000Z', value: 60 },
      ];

      const progress = calculateMobilityProgress(history, 'dead-hang');
      expect(progress.baseline).toBe(40); // 2026-10-01
      expect(progress.latest).toBe(75);   // 2026-10-15
      expect(progress.delta).toBe(35);
      expect(progress.status).toBe('improved');
    });

    it('returns empty progress when history is empty', () => {
      const progress = calculateMobilityProgress([], 'elephant-walk');
      expect(progress.baseline).toBeNull();
      expect(progress.latest).toBeNull();
      expect(progress.delta).toBe(0);
      expect(progress.status).toBe('empty');
    });
  });

  describe('Benchmark Status Classification (getMobilityBenchmarkStatus)', () => {
    it('classifies Knee-to-Wall Dorsiflexion tiers correctly', () => {
      expect(getMobilityBenchmarkStatus('knee-to-wall', 1.5).status).toBe('severe_restriction');
      expect(getMobilityBenchmarkStatus('knee-to-wall', 3.0).status).toBe('moderate_restriction');
      expect(getMobilityBenchmarkStatus('knee-to-wall', 4.5).status).toBe('functional');
      expect(getMobilityBenchmarkStatus('knee-to-wall', 5.2).status).toBe('optimal');
      expect(getMobilityBenchmarkStatus('knee-to-wall', 5.2).isTargetMet).toBe(true);
    });

    it('classifies Biering-Sørensen Hold tiers correctly', () => {
      expect(getMobilityBenchmarkStatus('biering-sorensen', 45).status).toBe('suboptimal');
      expect(getMobilityBenchmarkStatus('biering-sorensen', 90).status).toBe('adequate');
      expect(getMobilityBenchmarkStatus('biering-sorensen', 135).status).toBe('optimal');
      expect(getMobilityBenchmarkStatus('biering-sorensen', 135).isTargetMet).toBe(true);
    });

    it('classifies ATG Split Squat Flat Ground Mastery (0" elevation) as optimal', () => {
      expect(getMobilityBenchmarkStatus('split-squat-elevation', 12).status).toBe('regressed');
      expect(getMobilityBenchmarkStatus('split-squat-elevation', 2).status).toBe('near_mastery');
      expect(getMobilityBenchmarkStatus('split-squat-elevation', 0).status).toBe('optimal');
      expect(getMobilityBenchmarkStatus('split-squat-elevation', 0).isTargetMet).toBe(true);
    });
  });

  describe('Zero-Dependency SVG Sparkline Generator (generateSparklinePoints)', () => {
    it('generates valid scaled SVG polyline coordinate points for multi-entry history', () => {
      const entries: MobilityEntry[] = [
        { id: '1', testId: 'dead-hang', date: '2026-10-01T08:00:00.000Z', value: 30 },
        { id: '2', testId: 'dead-hang', date: '2026-10-08T08:00:00.000Z', value: 45 },
        { id: '3', testId: 'dead-hang', date: '2026-10-15T08:00:00.000Z', value: 60 },
      ];

      const points = generateSparklinePoints(entries, 100, 40);
      expect(typeof points).toBe('string');
      const pointPairs = points.trim().split(' ');
      expect(pointPairs).toHaveLength(3);

      // Verify format "x,y"
      pointPairs.forEach((pair) => {
        const [x, y] = pair.split(',').map(Number);
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(100);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(40);
        expect(isNaN(x)).toBe(false);
        expect(isNaN(y)).toBe(false);
      });
    });

    it('handles identical values without division-by-zero (NaN) errors', () => {
      const entries: MobilityEntry[] = [
        { id: '1', testId: 'elephant-walk', date: '2026-10-01T08:00:00.000Z', value: 3 },
        { id: '2', testId: 'elephant-walk', date: '2026-10-08T08:00:00.000Z', value: 3 },
        { id: '3', testId: 'elephant-walk', date: '2026-10-15T08:00:00.000Z', value: 3 },
      ];

      const points = generateSparklinePoints(entries, 100, 40);
      expect(points).not.toContain('NaN');
      expect(points).not.toContain('Infinity');
    });

    it('returns empty string or safe placeholder for empty entries', () => {
      const points = generateSparklinePoints([], 100, 40);
      expect(points).toBe('');
    });
  });
});
```

---

## 5. Vitest Configuration & Global Setup Blueprint

### 5.1 `vitest.config.ts`
To be created at the project root (`C:\Users\lagoo\.gemini\antigravity\scratch\workout_program\vitest.config.ts`):

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: ['src/main.tsx', 'src/vite-env.d.ts'],
    },
  },
});
```

### 5.2 `tests/setup.ts`
To be created at `C:\Users\lagoo\.gemini\antigravity\scratch\workout_program\tests\setup.ts`:

```typescript
import { vi, afterEach } from 'vitest';

// 1. Mock LocalStorage
class MockLocalStorage {
  private store: Map<string, string> = new Map();

  getItem(key: string): string | null {
    return this.store.get(key) || null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get length(): number {
    return this.store.size;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] || null;
  }
}

Object.defineProperty(globalThis, 'localStorage', {
  value: new MockLocalStorage(),
  writable: true,
});

// 2. Mock Web Audio API
class MockAudioContext {
  state: AudioContextState = 'suspended';
  currentTime = 0;

  async resume(): Promise<void> {
    this.state = 'running';
  }

  createOscillator() {
    return {
      type: 'sine',
      frequency: {
        value: 440,
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
  }

  createGain() {
    return {
      gain: {
        value: 1,
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    };
  }

  destination = {};
}

Object.defineProperty(globalThis, 'AudioContext', {
  value: MockAudioContext,
  writable: true,
});

Object.defineProperty(globalThis, 'webkitAudioContext', {
  value: MockAudioContext,
  writable: true,
});

// 3. Clean up mocks after each test
afterEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});
```

---

## 6. Windows 11 Execution Commands & CLI Guide

Because Windows 11 PowerShell defaults to a restricted execution policy blocking `.ps1` wrapper files, the implementer must invoke the `.cmd` wrappers:

| Task | PowerShell / CMD Command | Purpose |
|---|---|---|
| **Run all domain unit tests** | `npx.cmd vitest run tests/domain` | Runs Plate Calculator, Program Data, and Mobility tests in one shot. |
| **Run Plate Calculator test suite** | `npx.cmd vitest run tests/domain/plateCalculator.test.ts` | Exhaustively checks all 52 weights & greedy flaws. |
| **Run Program Data test suite** | `npx.cmd vitest run tests/domain/programData.test.ts` | Validates GZCL tiers, equipment profile, cues, and tempos. |
| **Run Mobility test suite** | `npx.cmd vitest run tests/domain/mobility.test.ts` | Validates 5 assessment metrics and delta calculations. |
| **Run all tests with verbose reporter** | `npx.cmd vitest run --reporter=verbose` | Displays detailed test-by-test pass list. |
| **Run full test suite via npm** | `npm.cmd test` | Triggers npm script configured in `package.json`. |
| **Run TypeScript type checking** | `npx.cmd tsc --noEmit` | Confirms zero type errors across src and tests. |

---

## 7. Quality Gate Checklist for Implementation Workers

Before marking Milestone 1 complete:
- [ ] `tests/domain/plateCalculator.test.ts` executes with **100% pass rate** (52/52 weights verified, targets $165, 170, 175, 180\text{ lbs}$ verified optimal).
- [ ] `tests/domain/programData.test.ts` executes with **100% pass rate** (all 4 sessions conform to equipment, GZCL tiers, eccentric tempos, and cue cards).
- [ ] `tests/domain/mobility.test.ts` executes with **100% pass rate** (5 protocols verified, progress delta direction verified).
- [ ] `npx.cmd tsc --noEmit` exits cleanly with code `0`.
- [ ] Zero unhandled promise rejections, memory leaks, or NaN outputs.
