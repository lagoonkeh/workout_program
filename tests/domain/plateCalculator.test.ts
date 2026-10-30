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
      // Available per side: [45, 35, 25, 10, 5, 5, 2.5]. 1x 45 available per side.
      // 90 lbs side target = 45 + 35 + 10
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

    it('handles Infinity and -Infinity safely', () => {
      const resultInf = calculatePlates(Infinity);
      expect(resultInf.isExact).toBe(false);
      expect(resultInf.achievableWeight).toBe(45);
      expect(resultInf.message).toMatch(/invalid/i);

      const resultNegInf = calculatePlates(-Infinity);
      expect(resultNegInf.isExact).toBe(false);
      expect(resultNegInf.achievableWeight).toBe(45);
      expect(resultNegInf.message).toMatch(/invalid/i);
    });
  });

  describe('Plate Visual and Group Summary Helpers', () => {
    it('generates visual items and group summaries matching plates per side', () => {
      const result = calculatePlates(185); // [45, 25] per side
      expect(result.platesVisual).toHaveLength(2);
      expect(result.platesVisual[0].weight).toBe(45);
      expect(result.platesVisual[1].weight).toBe(25);
      expect(result.groupSummary).toHaveLength(2);
      expect(result.groupSummary[0].plateWeight).toBe(45);
      expect(result.groupSummary[0].countPerSide).toBe(1);
      expect(result.groupSummary[0].totalCount).toBe(2);
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
