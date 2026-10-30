# Adversarial Challenge Report — Milestone 1: Biomechanics & Mobility Models

**Challenger**: Challenger 2 (Empirical Challenger, M1)  
**Date**: 2026-10-13  
**Project Root**: `C:\Users\lagoo\.gemini\antigravity\scratch\workout_program`  
**Test Suite**: `tests/domain/adversarial_m1_challenger2.test.ts` (25 automated adversarial tests)  
**Build Status**: Production build passing (`tsc && vite build`, exit code 0)  

---

## Challenge Summary

**Overall risk assessment**: **LOW**

The domain architecture authored by Worker 1 adheres strictly to the biomechanical and clinical constraints defined in `ORIGINAL_REQUEST.md` and `PROJECT.md`. All quad-dominant knee loading exercises enforce slow eccentric tempos ($\ge 3$s), scalable regressions are documented, pre-fatigue sequencing is correctly arranged, all 8 fitness authorities plus Dr. Stuart McGill are richly quoted with biomechanical rationales, and the mobility calculations handle inverted polarity and boundary edge cases cleanly.

Two minor forward-looking architectural observations have been surfaced for Milestone 3 (UI implementation): unilateral entry side-filtering in mobility tracking and SVG coordinate inversion for split squat elevation sparklines.

---

## Challenges

### [Low] Challenge 1: Unilateral Mobility History Co-Mingling

- **Assumption challenged**: Assumes `calculateMobilityProgress(history, testId)` is passed an already limb-filtered dataset for unilateral tests like `knee-to-wall`.
- **Attack scenario**: If a user logs Left and Right ankle dorsiflexion entries alternately (e.g., Left: 3.5", Right: 5.0", Left: 3.8"), `calculateMobilityProgress` sorts solely by chronological timestamp and evaluates `baseline = 3.5` (Left) vs `latest = 5.0` (Right), yielding an artificial $+1.5$" delta across different limbs.
- **Blast radius**: Low in Milestone 1 (domain logic only). Could cause inaccurate progress labels in Milestone 3 UI if the UI fails to filter by `entry.side` prior to invoking `calculateMobilityProgress`.
- **Mitigation**: In Milestone 3, ensure the Mobility Tracker UI either queries progress per limb (`side === 'left'` vs `side === 'right'`) or provides an optional `side` filter argument to `calculateMobilityProgress`.

### [Low] Challenge 2: Cartesian Downward Trajectory for Improving Split Squat Elevation Sparklines

- **Assumption challenged**: Assumes standard SVG polyline coordinate mapping (`y = height - ((val - min)/(max - min))*height`) is visually intuitive across all metric directions.
- **Attack scenario**: For ATG Split Squat Elevation, lower elevation represents progress (e.g. progressing from 12" bench height down to 0" flat ground). In SVG space where $y=0$ is top, 12" maps to $y=0$ (top) and 0" maps to $y=height$ (bottom). The sparkline visually slopes downward from left to right as the user achieves mastery.
- **Blast radius**: Cosmetic / UX only. Users might perceive a downward slope as "regression" unless visually contextualized.
- **Mitigation**: In Milestone 3 UI, either invert the Y mapping for `lower_is_better` metrics or provide explicit green/red trending badges and labels ("Elev. reduced: 12" → 0" [Target Met]").

---

## Stress Test Results

All 25 stress test scenarios were implemented in `tests/domain/adversarial_m1_challenger2.test.ts` and executed via Vitest:

| # | Stress Test Scenario | Expected Behavior | Actual Behavior | Result |
|---|----------------------|-------------------|-----------------|--------|
| 1 | Equipment compliance across all 4 sessions | `equipmentRequired` contains only authorized tools | Strictly limited to barbell, rack, landmine, pull-up bar, kettlebell, clubs, rowing, bodyweight, bench, plates | **PASS** |
| 2 | Prohibited commercial machine keyword scan | 0 occurrences of leg press, cables, smith machine, etc. in names, rationales, notes, or regressions | 0 occurrences across all 4 sessions | **PASS** |
| 3 | Kettlebell load boundary enforcement | All KB loads within 8 to 40 lbs (BowFlex 840 capacity) | All prescribed loads between 18 and 35 lbs | **PASS** |
| 4 | Barbell default load knapsack feasibility | All barbell loads (185, 165, 205, 105 lbs) solvable with exact user plate inventory | 100% exact solutions verified via `calculatePlates()` | **PASS** |
| 5 | Knee tendinitis eccentric tempo verification | All knee-loading exercises enforce $\ge 3$s eccentric duration (`31X1`, `3010`, `4010`) | All quad/knee loads enforce $\ge 3$s eccentrics | **PASS** |
| 6 | Compound quad regression availability | T1 Back Squat and T2 ATG Split Squat define explicit pain-free regressions | Box Squat (`31X1`) and Elevated Split Squat (`4010`) defined | **PASS** |
| 7 | Zero ballistic knee extension movements | No jumping, ballistic squats, or leg extensions prescribed | Zero ballistic quad movements found | **PASS** |
| 8 | Lower A pre-fatigue order | Rowing flush (1st), Calf raise (3rd), KB Hinge (4th) all precede T1 Squat | Pre-fatigue occurs strictly prior to heavy squats | **PASS** |
| 9 | Lower B pre-fatigue order | Alyssa Lu hip reset (1st) and ATG Elephant Walks (2nd) precede T1 RDL | Hip reset & active lengthening precede deadlifts | **PASS** |
| 10 | Representation of all 8 creators + McGill | Every authority has $\ge 1$ substantive quote & rationale in `CUE_CARDS` | All 9 authorities represented across 13 cue cards (21 total creator quotes) | **PASS** |
| 11 | Cue card metadata completeness | Valid 4-digit tempo, setup, faults, and regressions on every card | All 13 cards fully populated | **PASS** |
| 12 | Inverted polarity delta for Split Squat | Elevation drop from 12" to 0" marked as `status: 'improved'`, `isTargetMet: true` | `delta: -12`, `status: 'improved'`, `isTargetMet: true` | **PASS** |
| 13 | Elevation increase marked as declined | Elevation increase from 2" to 8" marked as `status: 'declined'` | `delta: 6`, `status: 'declined'`, `isTargetMet: false` | **PASS** |
| 14 | Inverted polarity Personal Best tracking | Split Squat PB tracks minimum elevation value achieved (`Math.min`) | PB correctly reflects minimum (e.g. 2" rather than 12") | **PASS** |
| 15 | Higher-is-better Personal Best tracking | Dead Hang / Sorensen PB tracks maximum value achieved (`Math.max`) | PB correctly reflects maximum (e.g. 95s rather than 45s) | **PASS** |
| 16 | Knee-to-Wall boundary values | Exact thresholds at 1.99", 2.0", 3.99", 4.0", 4.99", 5.0" | Correctly transitions severe → moderate → functional → optimal | **PASS** |
| 17 | Biering-Sørensen boundary values | Exact thresholds at 59s, 60s, 119s, 120s | Correctly transitions suboptimal → adequate → optimal | **PASS** |
| 18 | Split Squat Elevation boundary values | Exact thresholds at 18", 6.01", 6.0", 0.1", 0" | Correctly transitions regressed → near_mastery → optimal | **PASS** |
| 19 | Elephant Walk reach tiers (1 to 5) | Exact integer tiers 1, 2, 3, 4, 5 | Correctly transitions severe → moderate → baseline → functional → optimal | **PASS** |
| 20 | Dead Hang boundary values | Exact thresholds at 29s, 30s, 59s, 60s | Correctly transitions restricted → baseline → optimal | **PASS** |
| 21 | Empty mobility history robustness | `getAllMobilitySummaries([])` returns 5 summaries with `null` PB and `'untested'` status | 5 valid summary objects with zero crashes | **PASS** |
| 22 | Negative value rejection | `validateMobilityEntry({ value: -1 })` rejected | `{ isValid: false, error: 'Negative values are not allowed' }` | **PASS** |
| 23 | Non-integer Elephant Walk rejection | `validateMobilityEntry` rejects level 3.5, 0, or 6 | `{ isValid: false }` for all invalid levels | **PASS** |
| 24 | Sparkline flat values (min === max) | Generates horizontal baseline without NaN or division by zero | Generates `'0,15 100,15'` | **PASS** |
| 25 | Sparkline single entry | Generates midpoint point without NaN | Generates `'0,15'` | **PASS** |

---

## Unchallenged Areas

- **Interactive Audio Synthesis (`src/audio/audioSynthesizer.ts`)**: Out of scope for Milestone 1; scheduled for Milestone 2.
- **Interactive UI Components (`src/components/*`)**: Out of scope for Milestone 1; scheduled for Milestone 3.
- **LocalStorage v1 Engine (`src/storage/storageManager.ts`)**: Out of scope for Milestone 1; scheduled for Milestone 3.
