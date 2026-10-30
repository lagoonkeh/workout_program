# Empirical Adversarial Challenge Report: Barbell Plate Calculator

**Agent**: Challenger 1 (challenger_m1_1)  
**Roles**: critic, specialist (Empirical Challenger)  
**Milestone**: Milestone 1 (Core Domain Models & Algorithms)  
**Target Module**: `src/domain/plateCalculator.ts`  
**Test Suite**: `tests/domain/plateCalculator.adversarial.test.ts` (20 comprehensive test suites, 801 parameterized grid iterations, oracle comparison)  
**Date**: 2026-10-13  
**Verdict**: **APPROVE**

---

## 1. Executive Summary & Risk Assessment

**Overall Risk Assessment: LOW**

The Barbell Plate Calculator (`src/domain/plateCalculator.ts`) was subjected to exhaustive empirical stress testing, mathematical invariant validation, boundary probing, and adversarial edge-case generation. The implementation was validated against an independent brute-force oracle and compared against standard greedy change-making algorithms.

### Key Empirical Findings:
1. **Mathematical Optimality Verified**: The 128-state ($2^7$) power-set subset-sum algorithm consistently produces the provably minimal plate count across all 52 achievable weights ($45 \text{ to } 300\text{ lbs}$).
2. **Greedy Sub-Optimality Proven**: For target weights **165 lbs, 170 lbs, 175 lbs, and 180 lbs**, standard greedy change-making fails by selecting suboptimal plate counts (using up to 10 total plates). The subset-sum engine successfully finds the minimal 4-to-8 plate solutions, yielding a **20% to 33% plate count reduction**.
3. **801-Weight Grid Sweep Passed (100%)**: Across all integer and fractional weights from $0.0\text{ to }400.0\text{ lbs}$ in $0.5\text{ lb}$ steps, 100% of mathematical, physical, symmetry, and sorting invariants hold without a single deviation or failure.
4. **Boundary & Malformed Input Hardening Verified**: The module safely handles empty bar tare weight ($45\text{ lbs}$), maximum inventory capacity ($300\text{ lbs}$), sub-tare weights ($<45\text{ lbs}$), over-capacity loads ($>300\text{ lbs}$), unrepresentable fractional increments, `NaN`, non-numeric types, and non-finite numbers (`Infinity`, `-Infinity`).

---

## 2. Adversarial Challenge Dimensions & Empirical Results

### Challenge 1: Subset-Sum Minimization vs. Greedy Change-Making Flaws

- **Hypothesis**: Standard greedy change-making algorithms fail on finite barbell inventories where combinations of non-canonical denominations (specifically $35\text{ lb}$ and $25\text{ lb}$ plates) can sum to target loads using fewer plates than taking the largest available $45\text{ lb}$ plate first.
- **Empirical Test Setup**: An independent greedy selection simulator was implemented and run alongside `calculatePlates()` across all 52 achievable weights against the user's available side inventory: `[45, 35, 25, 10, 5, 5, 2.5]`.
- **Results**:
  - **165 lbs** (Side: $60\text{ lbs}$):
    - *Greedy*: $[45, 10, 5]$ $\rightarrow$ 3 plates/side (6 total).
    - *Subset-Sum*: $[35, 25]$ $\rightarrow$ **2 plates/side (4 total)** (33.3% reduction, **PASS**).
  - **170 lbs** (Side: $62.5\text{ lbs}$):
    - *Greedy*: $[45, 10, 5, 2.5]$ $\rightarrow$ 4 plates/side (8 total).
    - *Subset-Sum*: $[35, 25, 2.5]$ $\rightarrow$ **3 plates/side (6 total)** (25.0% reduction, **PASS**).
  - **175 lbs** (Side: $65\text{ lbs}$):
    - *Greedy*: $[45, 10, 5, 5]$ $\rightarrow$ 4 plates/side (8 total).
    - *Subset-Sum*: $[35, 25, 5]$ $\rightarrow$ **3 plates/side (6 total)** (25.0% reduction, **PASS**).
  - **180 lbs** (Side: $67.5\text{ lbs}$):
    - *Greedy*: $[45, 10, 5, 5, 2.5]$ $\rightarrow$ 5 plates/side (10 total).
    - *Subset-Sum*: $[35, 25, 5, 2.5]$ $\rightarrow$ **4 plates/side (8 total)** (20.0% reduction, **PASS**).
  - **Global Inventory Exhaustive Check**: Out of all 52 achievable weights, exactly these 4 weights trigger greedy failure. Across all 52 weights, `calculatePlates()` was verified against an independent brute-force global oracle to guarantee that **no shorter plate combination exists in any case**.

### Challenge 2: Full Continuous Grid Sweep (0 to 400 lbs in 0.5 lb steps, 801 discrete targets)

- **Hypothesis**: Floating-point rounding errors, off-by-one errors in remaining weight calculation, or boundary condition edge-cases could corrupt barbell symmetry or produce unphysical plate loads.
- **Empirical Execution**: Iterated $w \in [0.0, 400.0]$ with $\Delta w = 0.5\text{ lbs}$ ($N = 801$).
- **Invariants Verified for Every Iteration**:
  1. *Total Weight Invariant*: `(sum(platesPerSide) * 2) + barWeight === achievableWeight` (Exact floating-point preservation).
  2. *Bilateral Symmetry Invariant*: `totalPlatesUsed === platesPerSide.length * 2`.
  3. *Side Weight Invariant*: `weightPerSide === sum(platesPerSide)`.
  4. *Remainder Invariant*: `remainder === targetWeight - achievableWeight`.
  5. *Plate Loading Order*: `platesPerSide[i] >= platesPerSide[i+1]` for all $i$ (heaviest plates closest to barbell sleeve collar for rotational safety).
  6. *Inventory Capacity Limits*: Plate counts per sleeve strictly conform to $45 \le 1, 35 \le 1, 25 \le 1, 10 \le 1, 5 \le 2, 2.5 \le 1$.
  7. *Achievable Range Clamping*: $45 \le \text{achievableWeight} \le 300$ for all real inputs.
  8. *Visual Representation Consistency*: `platesVisual.length === platesPerSide.length` and `sum(groupSummary.totalCount) === totalPlatesUsed`.
- **Results**:
  - Exact matches: **52** targets (exact $45 + 5k, k \in [0, 51]$).
  - Sub-tare clamped loads: **90** targets ($0.0 \text{ to } 44.5\text{ lbs}$ clamped to empty bar $45\text{ lbs}$).
  - Over-capacity clamped loads: **200** targets ($300.5 \text{ to } 400.0\text{ lbs}$ clamped to $300\text{ lbs}$).
  - Inexact / fractional approximations: **459** targets (correctly approximated to nearest achievable weight).
  - **Result: 801 / 801 PASSED (100%)**.

### Challenge 3: Extreme Boundary Conditions and Boundary Transitions

| Test Case | Input | Expected Output | Actual Output | Status |
|---|---|---|---|---|
| Empty Bar Tare | $45\text{ lbs}$ | $45\text{ lbs}$, 0 plates, exact | $45\text{ lbs}$, 0 plates, exact | **PASS** |
| Maximum Capacity | $300\text{ lbs}$ | $300\text{ lbs}$, 14 plates, exact | $300\text{ lbs}$, 14 plates, exact | **PASS** |
| Just Below Tare | $44.9\text{ lbs}$ | Clamp 45, inexact, rem: -0.1 | Clamp 45, inexact, rem: -0.1 | **PASS** |
| Zero Weight | $0\text{ lbs}$ | Clamp 45, inexact, rem: -45 | Clamp 45, inexact, rem: -45 | **PASS** |
| Negative Weight | $-50\text{ lbs}$ | Clamp 45, inexact, rem: -95 | Clamp 45, inexact, rem: -95 | **PASS** |
| Just Above Max | $300.5\text{ lbs}$ | Clamp 300, inexact, rem: +0.5 | Clamp 300, inexact, rem: +0.5 | **PASS** |
| Extreme Load | $1000\text{ lbs}$ | Clamp 300, inexact, rem: +700 | Clamp 300, inexact, rem: +700 | **PASS** |
| Unachievable Half | $47.5\text{ lbs}$ | Nearest [45, 50], inexact | 45 or 50, inexact, rem: $\pm 2.5$ | **PASS** |
| Fractional Odd | $162.3\text{ lbs}$ | Nearest [160, 165], inexact | 160 or 165, inexact | **PASS** |

### Challenge 4: Non-Finite & Malformed Runtime Inputs

- Probed: `NaN`, `null`, `undefined`, `"225"`, `{}`, `Infinity`, `-Infinity`.
- Results:
  - Guard condition `typeof targetWeight !== 'number' || Number.isNaN(targetWeight) || !Number.isFinite(targetWeight) || ...` catches malformed inputs immediately at line 225.
  - Safe default return object produced with `achievableWeight: 45`, `platesPerSide: []`, `isExact: false`, and `message: "Invalid target weight entered."`.
  - Zero unhandled exceptions or runtime panics.

### Challenge 5: Custom Inventories and Barbell Configurations

- Probed:
  - Women's $35\text{ lb}$ Olympic barbell: verified exact loading (e.g. $85\text{ lbs} \rightarrow 35\text{ bar} + 2 \times 25\text{ lb plates}$).
  - Restricted plate sets (only 45s and 25s): verified proper resolution of achievable loads ($135, 185$) and safe fallback for unachievable loads ($165$).
  - Empty plate inventory (0 pairs): verified graceful fallback to bar weight with capacity exceeded warning.

---

## 3. Stress Test Results Summary

```
 RUN  v3.0.5 C:/Users/lagoo/.gemini/antigravity/scratch/workout_program

 ✓ tests/domain/plateCalculator.adversarial.test.ts (20 test suites / 801 grid cases) 92ms
 ✓ tests/domain/plateCalculator.test.ts (73 tests) 16ms
 ✓ tests/domain/adversarial_m1_challenger2.test.ts (25 tests) 12ms
 ✓ tests/domain/mobility.test.ts (26 tests) 5ms
 ✓ tests/domain/programData.test.ts (33 tests) 9ms
 ✓ tests/App.test.tsx (4 tests) 40ms

 Test Files  6 passed (6)
      Tests  181 passed (181)
   Duration  2.18s
```

---

## 4. Final Verdict

### **VERDICT: APPROVE**

The Barbell Plate Calculator (`src/domain/plateCalculator.ts`) fulfills all mathematical requirements, completely solves the knapsack subset-sum optimization problem, eliminates greedy flaws, enforces physical and safety loading constraints, and exhibits rock-solid defensive resilience under adversarial stress testing. No code modifications or rework are requested.
