# Milestone 1 Testing Blueprint Handoff Report
**From**: Explorer M1-3 (Domain Test Architect)  
**To**: Parent Orchestrator (`cb602ec0-e284-415a-81f8-951ad7b01fdb`) & Milestone 1 Workers  
**Date**: 2026-10-13T05:32:00Z  
**Working Directory**: `C:\Users\lagoo\.gemini\antigravity\scratch\workout_program\.agents\teamwork\explorer_m1_3`

---

## 1. Observation

1. **Equipment Inventory & Mathematical Grid** (`ORIGINAL_REQUEST.md:17` and `PROJECT.md:65-72`):
   - The user has an Olympic barbell ($45\text{ lbs}$) and plate inventory: $2\times 45, 2\times 35, 2\times 25, 2\times 10, 4\times 5, 2\times 2.5\text{ lbs}$.
   - Available per side: $[45, 35, 25, 10, 5, 5, 2.5]\text{ lbs}$ (total per side = $127.5\text{ lbs}$).
   - Maximum barbell weight = $45 + 2 \times 127.5 = 300\text{ lbs}$.
   - Resolution step = $2 \times 2.5 = 5.0\text{ lbs}$.
   - The achievable weight grid contains exactly 52 values: $W_k = 45 + 5k, k \in [0..51]$ ($45\text{ to }300\text{ lbs}$).

2. **Greedy Sub-Optimality Flaw** (`survey_testing.md:173-184`):
   - Greedy plate selection algorithm selects $[45, 10, 5]$ (3 plates/side, 6 total) for $165\text{ lbs}$.
   - Optimal subset-sum knapsack selection selects $[35, 25]$ (2 plates/side, 4 total) for $165\text{ lbs}$, saving 33% plate loading overhead.
   - Similar greedy flaws occur at $170\text{ lbs}$ (greedy 4 plates vs optimal 3 plates), $175\text{ lbs}$ (greedy 4 plates vs optimal 3 plates), and $180\text{ lbs}$ (greedy 5 plates vs optimal 4 plates).

3. **Biomechanical & Creator Protocols** (`ORIGINAL_REQUEST.md:24-37`, `survey_biomechanics.md:220-406`):
   - 4-Day GZCL routine: Lower A (Quad/Knee Bulletproofing), Upper A (Horizontal Push/Pull), Lower B (Posterior Chain & Hamstring Restoration), Upper B (Vertical Push/Pull & Calisthenics).
   - Strictly enforced equipment: Barbell/rack, Landmine, Pull-up bar, BowFlex 840 kettlebell (8–40 lbs), Indian clubs (2 & 5 lb), Rowing machine.
   - Knee tendinitis: Zero uncontrolled ballistic knee flexion; all knee loading mandates $\ge 3\text{s}$ controlled eccentric tempo (`31X1`, `4010`); warmup mandates calf & hamstring pre-fatigue (Eugene Teo) and reverse sled simulation (Ben Patrick) prior to axial squat loading.
   - 13 creator cue cards covering all 8 creators + Dr. Stuart McGill.

4. **Mobility Tracking Metrics** (`ORIGINAL_REQUEST.md:78-85`, `survey_biomechanics.md:723-742`):
   - 5 protocols: ATG Elephant Walks (Level 1–5), Knee-to-Wall Ankle Dorsiflexion (inches), ATG Split Squat Elevation (inches regression down to 0), Dr. Stuart McGill Biering-Sørensen Hold (seconds), Dead Hang Decompression (seconds).
   - Inverted progress polarity: In ATG Split Squat Elevation, a decrease in elevation ($6" \rightarrow 2"$) represents an improvement ($\Delta < 0$).

5. **Windows 11 Runtime Environment** (`survey_testing.md:40-56`):
   - Node.js `v24.20.0`, npm `11.19.0`.
   - Windows PowerShell restricts execution of `.ps1` scripts; commands must invoke Windows batch files `npm.cmd` and `npx.cmd`.

---

## 2. Logic Chain

1. From **Observation 1 & 2**, because software defects in plate loading risk physical injury and barbell imbalance in real gym sessions, unit tests must not only verify the 4 milestone weights but must exhaustively verify all 52 achievable weights in the grid, asserting mathematical invariants:
   $$\text{barWeight} + 2 \times \sum \text{platesPerSide} = \text{targetWeight}$$
   $$\text{plateCount} \le \text{inventoryCount}$$
   Furthermore, tests must explicitly assert optimal plate counts at $165, 170, 175, 180\text{ lbs}$ to fail any naive greedy implementation.

2. From **Observation 3**, because user equipment is strictly home gym gear, unit tests must programmatically iterate over all warmups and exercises in all 4 sessions, asserting that equipment strings match the allowed set (`barbell`, `rack`, `landmine`, `pull_up_bar`, `kettlebell`, `indian_clubs`, `rowing_machine`, `bodyweight`, `bench`, `plates`) and that no commercial gym apparatus (cables, leg press, leg extension) is present.

3. From **Observation 3**, to ensure GZCL and knee tendinitis safety requirements are met programmatically, tests must assert that T1 sets are 5 sets x 3 reps base with AMRAP, rest times are $\ge 180\text{s}$, knee-dominant exercises have first tempo digit $\ge 3$, Lower A includes calf/hamstring pre-fatigue in warm-up, and all 13 cue cards cover the 8 creators + Dr. Stuart McGill.

4. From **Observation 4**, mobility calculations must test progress delta directionality. If a naive developer computes $\Delta = \text{latest} - \text{baseline}$ without checking the test type, decreasing elevation in ATG Split Squat would be misclassified as a decline. Tests must explicitly verify that a decrease from $6"$ to $2"$ is categorized as `'improved'`.

5. From **Observation 5**, Vitest configuration and CLI execution instructions must be standardized with `.cmd` batch wrappers so the implementation worker can execute them seamlessly on Windows 11 without PowerShell execution policy blockades.

---

## 3. Caveats

- **Scope Boundary**: This specification governs Milestone 1 domain models and unit tests (`plateCalculator.test.ts`, `programData.test.ts`, `mobility.test.ts`). Tier 3 cross-feature integration and Tier 4 E2E workflow tests belong to Milestones 2–4.
- **Assumed File Locations**: Assumes domain models will be placed in `src/domain/plateCalculator.ts`, `src/domain/programData.ts`, `src/domain/cueCardsData.ts`, and `src/domain/mobility.ts`, following `PROJECT.md`.
- **Barbell Tare Weight**: Assumed constant at 45.0 lbs (Standard Olympic bar) unless user overrides inventory.

---

## 4. Conclusion

The testing blueprint for Milestone 1 is fully completed and documented in `C:\Users\lagoo\.gemini\antigravity\scratch\workout_program\.agents\teamwork\explorer_m1_3\m1_test_spec.md`. It provides:
1. Complete, copy-pasteable test code for `tests/domain/plateCalculator.test.ts` (all 52 weights, boundary conditions, greedy flaw assertions at 165/170/175/180 lbs, custom inventory).
2. Complete test code for `tests/domain/programData.test.ts` (4 sessions, equipment feasibility, GZCL tiers, eccentric tempos, cue card encyclopedia).
3. Complete test code for `tests/domain/mobility.test.ts` (5 assessments, validation, delta directionality, sparkline generation).
4. `vitest.config.ts` and `tests/setup.ts` configurations with Web Audio and LocalStorage mocks.
5. Exact Windows CLI commands for execution.

---

## 5. Verification Method

Once Milestone 1 domain models are implemented by the worker:

1. **Verify Plate Calculator Suite**:
   ```powershell
   npx.cmd vitest run tests/domain/plateCalculator.test.ts
   ```
   *Expected*: 100% tests pass, including loop of 52 achievable weights and knapsack checks.

2. **Verify Program Data Suite**:
   ```powershell
   npx.cmd vitest run tests/domain/programData.test.ts
   ```
   *Expected*: 100% tests pass, confirming 4 sessions, equipment compliance, GZCL tiers, and cue cards.

3. **Verify Mobility Suite**:
   ```powershell
   npx.cmd vitest run tests/domain/mobility.test.ts
   ```
   *Expected*: 100% tests pass, confirming 5 protocols, validation, and inverted elevation delta.

4. **Verify Entire Domain Suite**:
   ```powershell
   npx.cmd vitest run tests/domain --reporter=verbose
   ```
   *Expected*: All test files pass cleanly with zero warnings or errors.

5. **Type Checking**:
   ```powershell
   npx.cmd tsc --noEmit
   ```
   *Expected*: Clean exit with code `0`.
