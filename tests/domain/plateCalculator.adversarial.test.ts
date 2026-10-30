import { describe, it, expect } from 'vitest';
import {
  calculatePlates,
  DEFAULT_PLATE_INVENTORY,
  PlateInventory,
} from '../../src/domain/plateCalculator';

describe('Adversarial Stress Test Suite: Barbell Plate Calculator', () => {
  // Helper: Independent greedy change-making simulation for comparison
  function greedyPlateSelection(desiredSide: number, availableSidePlates: number[]): number[] {
    const sorted = [...availableSidePlates].sort((a, b) => b - a);
    let remaining = desiredSide;
    const chosen: number[] = [];
    for (const p of sorted) {
      if (remaining >= p - 1e-6) {
        chosen.push(p);
        remaining = Number((remaining - p).toFixed(4));
      }
    }
    return remaining < 1e-6 ? chosen : [];
  }

  // Helper: Independent exhaustive oracle finding true minimal plate count
  function oracleMinimalPlates(desiredSide: number, sidePlates: number[]): { plates: number[]; count: number } | null {
    const n = sidePlates.length;
    let best: number[] | null = null;
    for (let mask = 0; mask < (1 << n); mask++) {
      let sum = 0;
      const subset: number[] = [];
      for (let i = 0; i < n; i++) {
        if (mask & (1 << i)) {
          sum += sidePlates[i];
          subset.push(sidePlates[i]);
        }
      }
      if (Math.abs(sum - desiredSide) < 1e-6) {
        if (!best || subset.length < best.length) {
          best = subset;
        }
      }
    }
    return best ? { plates: best, count: best.length } : null;
  }

  const defaultSidePlates = [45, 35, 25, 10, 5, 5, 2.5];

  describe('1. Full Grid Sweep: 0 to 400 lbs in 0.5 lb steps (801 discrete weights)', () => {
    const testWeights: number[] = [];
    for (let w = 0; w <= 400; w += 0.5) {
      testWeights.push(w);
    }

    it('verifies all 801 target weights maintain physical, mathematical, and structural invariants', () => {
      let exactMatches = 0;
      let clampedMin = 0;
      let clampedMax = 0;
      let nonExactFractional = 0;

      for (const target of testWeights) {
        const res = calculatePlates(target);

        // Invariant 1: Total weight invariant
        const sideSum = res.platesPerSide.reduce((s, p) => s + p, 0);
        const reconstructedWeight = Number((res.barWeight + 2 * sideSum).toFixed(2));
        expect(reconstructedWeight).toBe(res.achievableWeight);

        // Invariant 2: Symmetry invariant
        expect(res.totalPlatesUsed).toBe(res.platesPerSide.length * 2);

        // Invariant 3: Per-side weight calculation
        expect(res.weightPerSide).toBe(Number(sideSum.toFixed(2)));

        // Invariant 4: Remainder invariant
        expect(res.remainder).toBe(Number((res.targetWeight - res.achievableWeight).toFixed(2)));

        // Invariant 5: Plate sorting (descending)
        for (let i = 0; i < res.platesPerSide.length - 1; i++) {
          expect(res.platesPerSide[i]).toBeGreaterThanOrEqual(res.platesPerSide[i + 1]);
        }

        // Invariant 6: Inventory limits
        const counts: Record<number, number> = {};
        for (const p of res.platesPerSide) {
          counts[p] = (counts[p] || 0) + 1;
        }
        expect(counts[45] || 0).toBeLessThanOrEqual(1);
        expect(counts[35] || 0).toBeLessThanOrEqual(1);
        expect(counts[25] || 0).toBeLessThanOrEqual(1);
        expect(counts[10] || 0).toBeLessThanOrEqual(1);
        expect(counts[5] || 0).toBeLessThanOrEqual(2);
        expect(counts[2.5] || 0).toBeLessThanOrEqual(1);

        // Invariant 7: Achievable weight range
        expect(res.achievableWeight).toBeGreaterThanOrEqual(45);
        expect(res.achievableWeight).toBeLessThanOrEqual(300);

        // Invariant 8: Visual & Group summaries
        expect(res.platesVisual.length).toBe(res.platesPerSide.length);
        const groupTotalPlates = res.groupSummary.reduce((acc, g) => acc + g.totalCount, 0);
        expect(groupTotalPlates).toBe(res.totalPlatesUsed);

        // Exact match analysis
        if (res.isExact) {
          exactMatches++;
          expect(res.achievableWeight).toBe(target);
          expect(res.remainder).toBe(0);
          // Target must be achievable: target >= 45, target <= 300, (target - 45) % 5 === 0
          expect(target).toBeGreaterThanOrEqual(45);
          expect(target).toBeLessThanOrEqual(300);
          expect((target - 45) % 5).toBe(0);
        } else {
          if (target < 45) clampedMin++;
          else if (target > 300) clampedMax++;
          else nonExactFractional++;
        }
      }

      // Exactly 52 weights from 45 to 300 in 5 lb steps are achievable
      expect(exactMatches).toBe(52);
      expect(clampedMin).toBe(90); // 0, 0.5, ..., 44.5 = 90 weights
      expect(clampedMax).toBe(200); // 300.5, 301, ..., 400 = 200 weights
      expect(nonExactFractional).toBe(801 - 52 - 90 - 200); // 459 inexact fractional/unrepresentable
    });
  });

  describe('2. Knapsack Subset-Sum vs Greedy Comparison on 165, 170, 175, 180 lbs and across all weights', () => {
    it('empirically proves subset-sum strictly beats greedy at 165 lbs', () => {
      const greedyPlates = greedyPlateSelection(60, defaultSidePlates); // [45, 10, 5]
      const result = calculatePlates(165);

      expect(greedyPlates).toEqual([45, 10, 5]);
      expect(greedyPlates.length).toBe(3); // Greedy uses 3 plates/side (6 total)
      expect(result.platesPerSide).toEqual([35, 25]);
      expect(result.platesPerSide.length).toBe(2); // Subset-sum uses 2 plates/side (4 total)
      expect(result.platesPerSide.length).toBeLessThan(greedyPlates.length);
    });

    it('empirically proves subset-sum strictly beats greedy at 170 lbs', () => {
      const greedyPlates = greedyPlateSelection(62.5, defaultSidePlates); // [45, 10, 5, 2.5]
      const result = calculatePlates(170);

      expect(greedyPlates).toEqual([45, 10, 5, 2.5]);
      expect(greedyPlates.length).toBe(4); // Greedy uses 4 plates/side (8 total)
      expect(result.platesPerSide).toEqual([35, 25, 2.5]);
      expect(result.platesPerSide.length).toBe(3); // Subset-sum uses 3 plates/side (6 total)
      expect(result.platesPerSide.length).toBeLessThan(greedyPlates.length);
    });

    it('empirically proves subset-sum strictly beats greedy at 175 lbs', () => {
      const greedyPlates = greedyPlateSelection(65, defaultSidePlates); // [45, 10, 5, 5]
      const result = calculatePlates(175);

      expect(greedyPlates).toEqual([45, 10, 5, 5]);
      expect(greedyPlates.length).toBe(4); // Greedy uses 4 plates/side (8 total)
      expect(result.platesPerSide).toEqual([35, 25, 5]);
      expect(result.platesPerSide.length).toBe(3); // Subset-sum uses 3 plates/side (6 total)
      expect(result.platesPerSide.length).toBeLessThan(greedyPlates.length);
    });

    it('empirically proves subset-sum strictly beats greedy at 180 lbs', () => {
      const greedyPlates = greedyPlateSelection(67.5, defaultSidePlates); // [45, 10, 5, 5, 2.5]
      const result = calculatePlates(180);

      expect(greedyPlates).toEqual([45, 10, 5, 5, 2.5]);
      expect(greedyPlates.length).toBe(5); // Greedy uses 5 plates/side (10 total)
      expect(result.platesPerSide).toEqual([35, 25, 5, 2.5]);
      expect(result.platesPerSide.length).toBe(4); // Subset-sum uses 4 plates/side (8 total)
      expect(result.platesPerSide.length).toBeLessThan(greedyPlates.length);
    });

    it('identifies ALL targets where greedy produces suboptimal plate counts', () => {
      const suboptimalTargets: { target: number; greedyCount: number; optimalCount: number }[] = [];

      for (let w = 45; w <= 300; w += 5) {
        const desiredSide = (w - 45) / 2;
        const greedy = greedyPlateSelection(desiredSide, defaultSidePlates);
        const optimal = calculatePlates(w);

        if (greedy.length > 0 && optimal.platesPerSide.length < greedy.length) {
          suboptimalTargets.push({
            target: w,
            greedyCount: greedy.length * 2,
            optimalCount: optimal.totalPlatesUsed,
          });
        }
      }

      // Exactly 4 weights fail under greedy: 165, 170, 175, 180
      expect(suboptimalTargets.map((t) => t.target)).toEqual([165, 170, 175, 180]);
    });

    it('verifies calculatePlates matches the global oracle minimal count on all 52 achievable weights', () => {
      for (let w = 45; w <= 300; w += 5) {
        const desiredSide = (w - 45) / 2;
        const oracle = oracleMinimalPlates(desiredSide, defaultSidePlates);
        const result = calculatePlates(w);

        expect(oracle).not.toBeNull();
        expect(result.platesPerSide.length).toBe(oracle!.count);
      }
    });
  });

  describe('3. Extreme Edge Cases and Boundary Conditions', () => {
    it('handles 45 lb barbell (empty bar)', () => {
      const res = calculatePlates(45);
      expect(res.isExact).toBe(true);
      expect(res.achievableWeight).toBe(45);
      expect(res.platesPerSide).toEqual([]);
      expect(res.totalPlatesUsed).toBe(0);
      expect(res.remainder).toBe(0);
      expect(res.message).toMatch(/empty bar/i);
    });

    it('handles 300 lb target (100% full inventory)', () => {
      const res = calculatePlates(300);
      expect(res.isExact).toBe(true);
      expect(res.achievableWeight).toBe(300);
      expect(res.platesPerSide).toEqual([45, 35, 25, 10, 5, 5, 2.5]);
      expect(res.totalPlatesUsed).toBe(14);
      expect(res.remainder).toBe(0);
    });

    it('handles weights below 45 lbs (clamping to empty bar)', () => {
      const belowTare = [44.9, 40, 25, 10, 0, -1, -50, -1000];
      for (const w of belowTare) {
        const res = calculatePlates(w);
        expect(res.isExact).toBe(false);
        expect(res.achievableWeight).toBe(45);
        expect(res.platesPerSide).toEqual([]);
        expect(res.totalPlatesUsed).toBe(0);
        expect(res.remainder).toBe(Number((w - 45).toFixed(2)));
        expect(res.message).toMatch(/below empty bar/i);
      }
    });

    it('handles weights above 300 lbs (clamping to max capacity)', () => {
      const aboveCapacity = [300.5, 305, 310, 350, 400, 500, 1000];
      for (const w of aboveCapacity) {
        const res = calculatePlates(w);
        expect(res.isExact).toBe(false);
        expect(res.achievableWeight).toBe(300);
        expect(res.platesPerSide).toEqual([45, 35, 25, 10, 5, 5, 2.5]);
        expect(res.totalPlatesUsed).toBe(14);
        expect(res.remainder).toBe(Number((w - 300).toFixed(2)));
        expect(res.message).toMatch(/exceeds maximum capacity/i);
      }
    });
  });

  describe('4. Malformed and Non-Finite Inputs', () => {
    it('handles NaN safely', () => {
      const res = calculatePlates(NaN);
      expect(res.isExact).toBe(false);
      expect(res.achievableWeight).toBe(45);
      expect(res.platesPerSide).toEqual([]);
      expect(res.message).toMatch(/invalid/i);
    });

    it('handles null, undefined, strings, objects without throwing', () => {
      // @ts-expect-error test invalid types
      expect(calculatePlates(null).isExact).toBe(false);
      // @ts-expect-error test invalid types
      expect(calculatePlates(undefined).isExact).toBe(false);
      // @ts-expect-error test invalid types
      expect(calculatePlates('225').isExact).toBe(false);
      // @ts-expect-error test invalid types
      expect(calculatePlates({}).isExact).toBe(false);
    });

    it('adversarially probes Infinity and -Infinity handling', () => {
      const resNegInf = calculatePlates(-Infinity);
      expect(resNegInf.isExact).toBe(false);
      expect(resNegInf.achievableWeight).toBe(45);
      expect(resNegInf.message).toMatch(/invalid/i);

      const resPosInf = calculatePlates(Infinity);
      expect(resPosInf.isExact).toBe(false);
      expect(resPosInf.achievableWeight).toBe(45);
      expect(resPosInf.message).toMatch(/invalid/i);
    });
  });

  describe('5. Unrepresentable Fractions and Nearest Achievable Approximations', () => {
    it('handles 47.5 lbs (which requires 1.25 lb/side, unachievable)', () => {
      const res = calculatePlates(47.5);
      expect(res.isExact).toBe(false);
      expect([45, 50]).toContain(res.achievableWeight);
      expect(Math.abs(res.remainder)).toBe(2.5);
    });

    it('handles 162.5 lbs (side 58.75 lbs, unachievable)', () => {
      const res = calculatePlates(162.5);
      expect(res.isExact).toBe(false);
      expect([160, 165]).toContain(res.achievableWeight);
      expect(Math.abs(res.remainder)).toBe(2.5);
    });

    it('handles odd increments like 187.5 lbs', () => {
      const res = calculatePlates(187.5);
      expect(res.isExact).toBe(false);
      expect([185, 190]).toContain(res.achievableWeight);
    });
  });

  describe('6. Custom Inventories and Custom Bar Weights', () => {
    it('handles women 35 lb barbell', () => {
      // 35 lb bar + [25] each side = 85 lbs
      const res = calculatePlates(85, DEFAULT_PLATE_INVENTORY, 35);
      expect(res.isExact).toBe(true);
      expect(res.barWeight).toBe(35);
      expect(res.achievableWeight).toBe(85);
      expect(res.platesPerSide).toEqual([25]);
    });

    it('handles restricted inventory (only 45s and 25s)', () => {
      const inventory: PlateInventory = {
        45: 2,
        35: 0,
        25: 2,
        10: 0,
        5: 0,
        2.5: 0,
      };
      // 45 bar + 45 each side = 135
      const res135 = calculatePlates(135, inventory);
      expect(res135.isExact).toBe(true);
      expect(res135.platesPerSide).toEqual([45]);

      // 45 bar + 70 each side (45 + 25) = 185
      const res185 = calculatePlates(185, inventory);
      expect(res185.isExact).toBe(true);
      expect(res185.platesPerSide).toEqual([45, 25]);

      // 165 lbs requires 60/side -> impossible with [45, 25] -> closest is 45 (135) or 70 (185)
      const res165 = calculatePlates(165, inventory);
      expect(res165.isExact).toBe(false);
    });

    it('handles empty inventory (all plates 0)', () => {
      const emptyInventory: PlateInventory = {
        45: 0,
        35: 0,
        25: 0,
        10: 0,
        5: 0,
        2.5: 0,
      };
      const res = calculatePlates(135, emptyInventory);
      expect(res.isExact).toBe(false);
      expect(res.achievableWeight).toBe(45);
      expect(res.platesPerSide).toEqual([]);
      expect(res.message).toMatch(/exceeds maximum capacity/i);
    });
  });
});
