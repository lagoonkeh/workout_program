# Testing Infrastructure, Verification Harnesses & 4-Tier E2E Strategy Survey
**Project**: 4-Day Upper/Lower Workout Web Application  
**Author**: Explorer Survey 3 (Testing Infrastructure & Strategy Explorer)  
**Date**: October 13, 2026  
**Status**: Comprehensive Survey & Blueprint Specification  

---

## 1. Executive Summary & Testing Philosophy

The **4-Day Upper/Lower Workout Web Application** synthesizes complex biomechanical principles from 8 elite fitness creators (Jeff Nippard, ATHLEAN-X / Jeff Cavaliere, Ben Patrick / ATG, Dr. Aaron Horschig / Squat University, Marcus Filly, Coach Eugene Teo, Yellow Dude, Dr. Alyssa Lu) and GZCL powerbuilding logic into a high-performance web tool. 

Because the application controls real-time gym training sessions—governing heavy barbell loading, strict rest-interval timers, explosive/eccentric tempo cadence, and knee tendinitis rehab progressions—**software defects carry direct real-world physical consequences** (e.g. incorrect plate calculations risking physical injury, timer drift throwing off metabolic recovery, or lost training logs destroying progression data).

### Core Testing Mandates
1. **Mathematical Infallibility**:
   - The barbell plate calculator must be verified exhaustively across every single valid barbell weight from 45 lbs to 300 lbs in 5 lb increments (all 52 achievable weights) using the user's specific plate inventory (`[45, 35, 25, 10, 5, 5, 2.5]` lbs per side).
   - Automated tests must explicitly assert **optimal knapsack plate minimization** over naive greedy change-making, proving minimal plate counts at tricky boundary weights ($165$, $170$, $175$, and $180$ lbs total).
2. **Deterministic Time Simulation (Zero Flakiness)**:
   - High-precision countdown timers and Marcus Filly tempo metronomes must be verified using deterministic mock clocks (`performance.now()` deltas and virtual timers) rather than real-world asynchronous waiting. A 5-minute (300-second) rest timer test must execute in less than $1\text{ millisecond}$ of CPU time without race conditions.
3. **Zero Audio Asset Dependency Verification**:
   - Automated spies must intercept programmatic Web Audio API calls (`AudioContext`, `createOscillator`, `createGain`, frequency envelopes, and destination connections) to verify that sound cues (ticks, 3-2-1 countdown warnings, completion chimes, tempo inflections) fire accurately without external network asset dependencies.
4. **Resilient Local-First Persistence**:
   - Round-trip serialization, debounced mutations, and corrupt-state recovery must be verified through adversarial fault-injection tests (malformed JSON, schema version drift, quota exceptions, disabled storage).
5. **4-Tier E2E Test Strategy**:
   - Strict adherence to the Teamwork Project Pattern: Tier 1 (Feature Coverage $\ge 5$ cases/feature), Tier 2 (Boundary & Corner Cases $\ge 5$ cases/feature), Tier 3 (Cross-Feature Combinations $\ge 10$ cases), and Tier 4 (Real-World Application Workflows simulating complete multi-day workouts).

---

## 2. Windows Development & Runtime Environment Survey

### 2.1 Hardware & Operating System Context
- **Workstation OS**: Windows 11 Pro (64-bit)
- **Processor**: AMD Ryzen 9 9900X (12 Cores, 24 Threads, 4.4 GHz Base / 5.6 GHz Boost). Capable of executing hundreds of concurrent test suites in milliseconds.
- **Memory**: 32 GB DDR5 RAM (6400 MHz).
- **GPU**: NVIDIA GeForce RTX 5080 + AMD Radeon Graphics.
- **Storage**: High-speed PCIe NVMe SSDs (Crucial P3 Plus 2TB, SSK PCIe 1TB).

### 2.2 Toolchain Survey & Verification
Empirical verification via local terminal execution confirmed:
- **Node.js**: `v24.20.0` (LTS Node 24 runtime with modern ECMAScript module support, native `node:test`, `node:assert`, native mock timers, and built-in code coverage).
- **NPM**: `11.19.0`
- **NPX**: `11.19.0`

### 2.3 Windows PowerShell Script Execution Policy Workaround
During surveying, running `npm -v` in PowerShell triggered:
```
npm : File C:\Program Files\nodejs\npm.ps1 cannot be loaded because running scripts is disabled on this system.
For more information, see about_Execution_Policies at https:/go.microsoft.com/fwlink/?LinkID=135170.
```
**Root Cause**: Windows PowerShell defaults to `Restricted` execution policy, which blocks `.ps1` script wrappers installed in `C:\Program Files\nodejs\`.  
**Standard Solution for Project**:
1. All CLI commands in project documentation and npm scripts must call the Windows batch wrapper `npm.cmd` and `npx.cmd` rather than `npm` / `npx`.
2. Verified: Running `npm.cmd -v` and `npx.cmd -v` exits cleanly with code `0`.
3. In `package.json`, standard script commands (e.g. `"test": "vitest run"`) executed via `npm.cmd run test` invoke `node.exe` directly under `cmd.exe`, completely bypassing PowerShell execution policy issues.

### 2.4 Browser Installation Inventory on Development Machine
System registry inspection verified the physical presence of all major browsers:
- **Google Chrome**: `C:\Program Files\Google\Chrome\Application\chrome.exe` (Verified: supports `--headless=new` DOM extraction and Chrome DevTools Protocol automation).
- **Microsoft Edge**: `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`
- **Mozilla Firefox**: `C:\Program Files\Mozilla Firefox\firefox.exe`
- **Opera**: `C:\Program Files\Opera\opera.exe`

### 2.5 Test Runner Architecture Evaluation

| Evaluation Criteria | Native Node 24 (`node:test`) | Vitest + jsdom / happy-dom | Playwright / Headless Chrome |
|---|---|---|---|
| **Zero-Config Availability** | 100% Native (Out of the box, zero npm install) | Requires `npm.cmd install` | Requires `@playwright/test` & browser binaries |
| **Execution Speed** | Sub-millisecond (0.4ms per test) | Very fast (~15ms per suite) | Moderate (~300-800ms per browser launch) |
| **Timer Mocking** | Native `mock.timers.enable()` with `.tick()` | Built-in `vi.useFakeTimers()` | Virtual time / browser time manipulation |
| **DOM Environment** | Requires lightweight DOM shim or jsdom | Built-in jsdom/happy-dom support | 100% Real Browser DOM |
| **React Component Testing** | Needs `@testing-library/react` wrapper | Native React 19 testing library support | E2E browser page automation |
| **Built-in Code Coverage** | Native `node --experimental-test-coverage` | Built-in `@vitest/coverage-v8` | Playwright coverage reports |

### 2.6 Recommended Multi-Tier Harness Architecture
To achieve both blazingly fast iteration during development and absolute visual/DOM fidelity:
1. **Tier 1–3 Unit, Logic & Component Harness**: **Vitest + React Testing Library + happy-dom** (with Node 24 native runner compatibility).
   - All pure business logic (`plate-calculator.ts`, `timer-machine.ts`, `tempo-machine.ts`, `storage-service.ts`, `mobility-data.ts`, `gzcl-logic.ts`) can run directly in Node in $< 50\text{ms}$ total.
   - Fast TDD feedback loop for the developer.
2. **Tier 4 Real-World E2E Harness**: **Headless Chrome / Playwright Harness** targeting `C:\Program Files\Google\Chrome\Application\chrome.exe`.
   - Simulates complete workout flows directly on a real browser instance.
   - Tests viewport resizing (mobile 375px, tablet 768px, desktop 1280px) and asserts zero horizontal layout overflow (`scrollWidth <= innerWidth`).

---

## 3. Domain-Specific Testing Engines & Mock Harnesses

### 3.1 Rest Interval Countdown Timer Testing Engine

#### 3.1.1 State Machine Transition Verification
The timer is governed by a deterministic Finite State Machine (FSM):
$$\text{States}: \{\text{IDLE}, \text{RUNNING}, \text{PAUSED}, \text{COMPLETED}\}$$

```
                +---------------------------------------+
                |                                       |
                v                                       |
            [ IDLE ] ---(START/PRESET)---> [ RUNNING ]  | (RESET)
                ^                             |   ^     |
                |                          (PAUSE)|(RESUME)
                |                             v   |     |
                +---------(RESET)--------- [ PAUSED ]   |
                |                                       |
         [ COMPLETED ] <---(TIME_REMAINING <= 0)--------+
                |
                +---(RESET / NEW_PRESET)---> [ IDLE ]
```

#### 3.1.2 Virtual Clock & Precision Testing
Timers that rely on `setInterval(..., 1000)` accumulate drift and throttle in background tabs. The architecture uses `targetEndTime - performance.now()`. The test harness must verify:
- **Elapsed Time Accuracy**: Advancing mock clock by $15,000\text{ms}$ on a $30\text{s}$ timer results in exactly $15\text{s}$ remaining ($50\%$ progress).
- **Pause Invariance**: Advancing mock clock by $60,000\text{ms}$ while in `PAUSED` state results in zero change to `remainingSeconds`.
- **Resume Continuity**: Resuming after pause and advancing clock by $5,000\text{ms}$ decrements from the exact paused value.
- **Zero Overshoot**: Timer terminates cleanly at $0\text{s}$ and transitions to `COMPLETED`; never produces negative values (e.g. $-1\text{s}$).

#### 3.1.3 Event & Callback Spy Specifications
- `onTick(remainingMs, totalMs, percent)`: Called on every tick with verified percentage:
  $$\text{percent} = \frac{\text{remainingMs}}{\text{totalMs}} \times 100$$
- `onWarning(secondsLeft)`: Triggered exactly once at $3\text{s}$, $2\text{s}$, and $1\text{s}$.
- `onComplete()`: Triggered exactly once upon hitting $0\text{s}$.
- `audioDispatchSpy`: Verifies that `SoundEngine.playCompletionChime()` or `playWarningPing()` was invoked.

#### 3.1.4 Concurrency & Stress Harness
- Rapid pause/resume spam: 100 alternating `PAUSE` and `RESUME` actions dispatched within 5ms must leave timer in consistent state without memory leaks or runaway workers.
- Double-start: Calling `START` while already in `RUNNING` cleanly updates target duration or ignores redundant trigger without instantiating duplicate tickers.

---

### 3.2 Marcus Filly Tempo Metronome Testing Engine

#### 3.2.1 4-Digit Cadence Parser Validation
Marcus Filly's Functional Bodybuilding tempos follow $[E][P_B][C][P_T]$:
$$\text{Regex}: \quad \mathbf{\wedge(\backslash d)(\backslash d)([0-9X])(\backslash d)\$}$$

| Input Tempo | $E$ (Eccentric) | $P_B$ (Bottom Pause) | $C$ (Concentric) | $P_T$ (Top Pause) | Cycle Time |
|---|---|---|---|---|---|
| `"30X1"` | 3s | 0s | 1s (Explosive) | 1s | 5s / rep |
| `"4110"` | 4s | 1s | 1s | 0s | 6s / rep |
| `"31X0"` | 3s | 1s | 1s (Explosive) | 0s | 5s / rep |
| `"2020"` | 2s | 0s | 2s | 0s | 4s / rep |
| `"4010"` | 4s | 0s | 1s | 0s | 5s / rep |

#### 3.2.2 Phase Progression & Tick Harness
For `"30X1"` over an 8-rep set:
1. $t = 0\text{s} \rightarrow 3\text{s}$: Phase = `eccentric`. Test asserts:
   - Emits 440 Hz cadence tick at $t=0, 1, 2$.
   - Phase label = `"LOWERING (ECCENTRIC)"`.
2. $t = 3\text{s}$: $P_B = 0\text{s}$, so `pause_bottom` is immediately bypassed.
3. $t = 3\text{s} \rightarrow 4\text{s}$: Phase = `concentric`. Test asserts:
   - Emits crisp 880 Hz explosive drive ping at $t=3\text{s}$.
   - Phase label = `"EXPLODE (CONCENTRIC)"`.
4. $t = 4\text{s} \rightarrow 5\text{s}$: Phase = `pause_top`. Test asserts:
   - Emits 659 Hz squeeze hold tone at $t=4\text{s}$.
   - Phase label = `"SQUEEZE & HOLD"`.
5. $t = 5\text{s}$: Rep 1 completes! `completedReps` increments from $0 \rightarrow 1$.
6. $t = 40\text{s}$: At completion of Rep 8 ($8 \times 5\text{s} = 40\text{s}$), metronome automatically stops and dispatches completion chime.

#### 3.2.3 Zero-Phase Robustness
- In tempos with $0\text{s}$ pause phases (e.g. `"30X1"` or `"2020"`), the engine must transition instantaneously without causing 0-duration division-by-zero errors or visual freezing.

---

### 3.3 Barbell Plate Loading Calculator Verification Suite

#### 3.3.1 Inventory & Barbell Specifications
- **Barbell**: Olympic Barbell = $45\text{ lbs}$.
- **Inventory Pool per Side**:
  $$I_{\text{side}} = [45, 35, 25, 10, 5, 5, 2.5]\text{ lbs}$$
- **Total Possible Load**:
  $$45\text{ (bar)} + 2 \times 127.5\text{ (plates)} = \mathbf{300\text{ lbs}}$$

#### 3.3.2 Mathematical Proof: Greedy Flaws vs Exact 128-State Subset-Sum
A standard greedy algorithm selects the largest plate that fits into the remaining weight. Our empirical testing revealed **severe sub-optimality in greedy algorithms for the user's exact inventory**:

```
+----------------------------------------------------------------------------------------------------+
| Target Weight | Side Weight | Greedy Plates per Side       | Optimal DP Plates per Side | Reduction|
+----------------------------------------------------------------------------------------------------+
| 165 lbs       | 60.0 lbs    | [45, 10, 5]       (3 plates) | [35, 25]        (2 plates) | 33% fewer|
| 170 lbs       | 62.5 lbs    | [45, 10, 5, 2.5]  (4 plates) | [35, 25, 2.5]   (3 plates) | 25% fewer|
| 175 lbs       | 65.0 lbs    | [45, 10, 5, 5]    (4 plates) | [35, 25, 5]     (3 plates) | 25% fewer|
| 180 lbs       | 67.5 lbs    | [45, 10, 5, 5, 2.5](5 plates)| [35, 25, 5, 2.5](4 plates) | 20% fewer|
+----------------------------------------------------------------------------------------------------+
```

**Why this matters**: In weightlifting, loading fewer plates reduces plate changes, minimizes barbell sleeve deflection, and saves athlete energy between heavy sets.  
**Test Suite Requirement**: The test suite must assert that target weights $165$, $170$, $175$, and $180$ lbs return **strictly the optimal minimal plate count** (`[35, 25]` for 165 lbs), failing any implementation relying on naive greedy heuristics.

#### 3.3.3 Exhaustive 52-Weight Test Matrix
The test suite iterates through every possible valid barbell weight from 45 lbs to 300 lbs:
$$W_k = 45 + 5k, \quad \text{for } k \in [0, 51]$$
Every single weight must return:
1. `isExact === true`
2. `barWeight + 2 * sum(platesPerSide) === targetWeight`
3. `platesPerSide` is a valid submultiset of `[45, 35, 25, 10, 5, 5, 2.5]`
4. `platesPerSide` is sorted descending (heaviest plates closest to collar)
5. `platesPerSide.length === minimalAchievablePlateCount(targetWeight)`

#### 3.3.4 Boundary & Error Rejection Tests
- **Empty Bar**: $45\text{ lbs} \rightarrow$ `platesPerSide: []`, `message: "Empty bar"`.
- **Below Tare**:
  - $0\text{ lbs}$, $20\text{ lbs}$, $40\text{ lbs} \rightarrow$ `achievableWeight: 45`, `isExact: false`, message warning that weight is below empty bar.
- **Above Maximum Capacity**:
  - $305\text{ lbs}$, $315\text{ lbs}$, $500\text{ lbs} \rightarrow$ `achievableWeight: 300`, `isExact: false`, message warning that weight exceeds 300 lb inventory limit.
- **Non-Representable Increments**:
  - $47.5\text{ lbs}$, $52.5\text{ lbs}$, $63\text{ lbs}$, $162\text{ lbs} \rightarrow$ rounded to nearest achievable 5 lb increment with informative user notification.
- **Malformed Inputs**:
  - `NaN`, `null`, `undefined`, `""`, `"-50"`, `"abc"` $\rightarrow$ handled without runtime throwing, defaulting to empty bar (45 lbs).

---

### 3.4 GZCL Progression & Volume Logic Testing Engine

#### 3.4.1 Tier Rules & Intensity Mapping

| GZCL Tier | Target Movement Type | Prescribed Scheme | Target Rest | Progression Rules on Failure |
|---|---|---|---|---|
| **Tier 1 (T1)** | Heavy Compound (Squat, Bench, RDL, OHP) | $5 \text{ sets} \times 3 \text{ reps}$ (Base) or $3 \times 5+$ | $180\text{s} - 300\text{s}$ | Fail $\rightarrow$ transition to $6 \times 2+$; fail $\rightarrow$ transition to $10 \times 1+$; fail $\rightarrow$ test new 5RM & reset. |
| **Tier 2 (T2)** | Hypertrophy Compound (ATG Split Squat, Landmine Row, Cossack Squat, Pull-Up) | $3 \text{ sets} \times 8 - 10 \text{ reps}$ | $120\text{s} - 180\text{s}$ | Fail $\rightarrow$ transition to $3 \times 8$; fail $\rightarrow$ $3 \times 6$; fail $\rightarrow$ reset weight. |
| **Tier 3 (T3)** | Accessory / Rehab / Mobility (Tibialis raises, McGill Big 3, Face Pulls, KB Press, L-Sit) | $3 \text{ sets} \times 15 \text{ reps}$ or 20 Effective Reps (ER) | $60\text{s} - 90\text{s}$ (15-30s ER) | Hitting all target reps (especially AMRAP $> 20$) triggers $+5\text{ lb}$ progression. |

#### 3.4.2 Volume Calculation Formula
$$\text{Total Session Volume (lbs)} = \sum_{i \in \text{completed sets}} \left( \text{weight}_i \times \text{reps}_i \right)$$
The test harness verifies:
- Unchecked/uncompleted sets contribute $0$ volume.
- Bodyweight movements (e.g. Pull-ups or Tibialis raises with weight $= 0$) contribute $0\text{ lbs}$ to barbell tonnage but track rep counts.
- Mixed weights across sets (e.g. warmup $135 \times 5$, working $185 \times 3$, $185 \times 3$, $185 \times 3$) compute exact mathematical tonnage.

---

### 3.5 LocalStorage State Persistence & Resilience Harness

#### 3.5.1 Schema Contract (`v1`)
```typescript
export interface AppStorageSchema {
  version: 1;
  activeSession: ActiveWorkoutSession | null;
  workoutHistory: CompletedWorkout[];
  mobilityHistory: MobilityRecord[];
  preferences: UserPreferences;
}
```

#### 3.5.2 Round-Trip & Mutation Verification
- **Set Completion Toggle**: Checking set 1 of Squat immediately writes to `localStorage['workout_app_v1']`.
- **Page Reload Simulation**: Re-instantiating the application state from `localStorage.getItem()` recreates exact identical UI state (active tab, completed checkboxes, logged weights/reps).
- **Debounced Input Test**: Typing `185` into weight input triggers at most one write after $300\text{ms}$ delay, avoiding storage thrashing.

#### 3.5.3 Adversarial Fault Injection Harness
1. **Malformed JSON String**:
   - Injection: `localStorage.setItem('workout_app_v1', '{ corrupt_json: [')`
   - Test Assertion: Application initializes clean default state without unhandled exceptions; backs up raw corrupted string to `'workout_app_v1_corrupt_backup'`.
2. **Schema Version Mismatch**:
   - Injection: `localStorage.setItem('workout_app_v1', JSON.stringify({ version: 0, oldData: true }))`
   - Test Assertion: Automatically executes migration function to upgrade data to `v1`.
3. **Missing Keys / Null Values**:
   - Injection: Valid JSON missing `mobilityHistory` or `activeSession.exercises`.
   - Test Assertion: Safe deep-merge applies default arrays and objects without `Cannot read property of undefined` crashes.
4. **Storage Quota Exceeded**:
   - Simulates `DOMException: QuotaExceededError`.
   - Test Assertion: Catches error, displays toast notification to user, and falls back to in-memory state.
5. **Incognito / Storage Disabled**:
   - Simulates `localStorage` throwing on access.
   - Test Assertion: Seamlessly operates using transient in-memory store.

---

### 3.6 Mobility & Flexibility Tracker Testing Engine

#### 3.6.1 Tracked Assessments & Benchmarks

| Assessment Name | Creator | Units | Valid Inputs | Clinical Target Goal |
|---|---|---|---|---|
| **ATG Elephant Walks** | Ben Patrick | Level 1–5 | Ordinal integers $[1, 2, 3, 4, 5]$ | Level 5 (Palms Flat on Floor) |
| **Knee-to-Wall Dorsiflexion** | Dr. Aaron Horschig | Inches (or cm) | Floats $\ge 0.0$ (Bilateral / Left / Right) | $\ge 5.0\text{ inches}$ with $< 0.5"$ asymmetry |
| **ATG Split Squat Elevation** | Ben Patrick | Inches | Floats $\ge 0.0$ (Elevation off floor) | $0.0\text{ inches}$ (Flat Ground full coverage) |
| **Biering-Sørensen Hold** | Dr. Stuart McGill | Seconds | Integers $\ge 0$ | $\ge 120\text{ seconds}$ spinal extensor endurance |
| **Dead Hang Decompression** | Jeff Cavaliere | Seconds | Integers $\ge 0$ | $\ge 60 - 90\text{ seconds}$ grip/decompression |

#### 3.6.2 Verification Assertions
- **Input Validation**: Rejects negative values (e.g. $-3\text{ inches}$ or $-10\text{ seconds}$), non-numeric strings, or Elephant Walk levels outside $[1..5]$.
- **Chronological Sorting**: Test verifies that entries logged out of order are rendered chronologically by timestamp.
- **Progress Delta Calculation**:
  $$\Delta = \text{Latest Score} - \text{Baseline Score}$$
  - For Dorsiflexion, Sørensen, Dead Hang, and Elephant Walk: Positive $\Delta$ indicates improvement ($\uparrow$).
  - For Split Squat Elevation: Negative $\Delta$ (decreasing elevation down toward 0) indicates improvement ($\downarrow$).
- **SVG Sparkline Generator**: Verifies that polyline coordinates scale cleanly between `min` and `max` values without `NaN` points.

---

### 3.7 Responsive UI Layout & DOM Integrity Testing

#### 3.7.1 Responsive Viewport Test Matrix
Tests run across standard device viewport dimensions:
- **Mobile Small**: $375 \times 667\text{ px}$ (iPhone SE)
- **Mobile Standard**: $390 \times 844\text{ px}$ (iPhone 14/15)
- **Mobile Large**: $412 \times 915\text{ px}$ (Pixel 7 / Galaxy S)
- **Tablet**: $768 \times 1024\text{ px}$ (iPad Mini / Air)
- **Desktop**: $1280 \times 800\text{ px}$ and $1920 \times 1080\text{ px}$

#### 3.7.2 DOM Integrity & Accessibility Assertions
1. **Zero Horizontal Layout Overflow**:
   ```javascript
   assert.ok(document.documentElement.scrollWidth <= window.innerWidth,
     `Horizontal overflow detected: scrollWidth (${document.documentElement.scrollWidth}) > innerWidth (${window.innerWidth})`);
   ```
2. **Touch Target Size**:
   - All primary buttons (Preset timers, Checkboxes, Start/Pause, Tab navigation) must have minimum bounding rect of $44 \times 44\text{ px}$ (WCAG 2.5.5 Level AAA / 2.5.8 Level AA).
3. **Contrast & Readability**:
   - Timer digit display must remain visible in high-contrast dark theme without font wrapping or digit clipping (e.g. `"03:45"` must render on a single line).
4. **Expandable Cue Cards**:
   - Clicking cue card accordion smoothly expands details (Squat University foot tripod, ATG knee over toes, Athlean-X scapular retraction) without layout shift overlapping adjacent inputs.

---

## 4. Comprehensive 4-Tier E2E Test Strategy

Following the Teamwork Project Pattern, testing is partitioned into 4 distinct verification tiers.

```
+-----------------------------------------------------------------------------+
| TIER 4: Real-World Workflows (Lower A -> Upper B multi-session journeys)   |
+-----------------------------------------------------------------------------+
| TIER 3: Cross-Feature Combinations (Active timer + plate calc + metronome)  |
+-----------------------------------------------------------------------------+
| TIER 2: Boundary & Corner Cases (0s timers, 45 lb bar, 300 lb max, corrupt) |
+-----------------------------------------------------------------------------+
| TIER 1: Feature Coverage (>=5 test cases per feature for happy path)        |
+-----------------------------------------------------------------------------+
```

---

### Tier 1: Feature Coverage (Happy Path Verification)
*Requires $\ge 5$ test cases per feature.*

#### Feature 1: Rest Interval Timer
- **TC-1.1.1**: Countdown runs accurately for 15s preset and dispatches completion chime.
- **TC-1.1.2**: Countdown runs accurately for 60s preset and updates circular SVG stroke dash.
- **TC-1.1.3**: Countdown runs accurately for 180s (3m) heavy compound preset.
- **TC-1.1.4**: User can pause at 45s, verify clock freezes, resume, and reach 0s.
- **TC-1.1.5**: Quick-add buttons (`+15s`, `+30s`) extend active timer duration seamlessly.

#### Feature 2: Marcus Filly Tempo Metronome
- **TC-1.2.1**: Prescribed `"30X1"` tempo cycles through 3s eccentric, explosive concentric, and 1s top squeeze.
- **TC-1.2.2**: Prescribed `"4110"` tempo executes 4s eccentric, 1s bottom pause, 1s concentric, 0s top pause.
- **TC-1.2.3**: Visual pacing indicator animates synchronized contraction/expansion during cadence.
- **TC-1.2.4**: Target rep counter increments after each full cycle until target reps reached.
- **TC-1.2.5**: Stop button immediately terminates metronome and silences audio ticks.

#### Feature 3: Barbell Plate Loading Calculator
- **TC-1.3.1**: Target $135\text{ lbs}$ outputs exactly 1x45 lb plate per side on 45 lb bar.
- **TC-1.3.2**: Target $185\text{ lbs}$ outputs 1x45, 1x25 lb plates per side.
- **TC-1.3.3**: Target $225\text{ lbs}$ outputs 2x45 lb plates per side.
- **TC-1.3.4**: Target $275\text{ lbs}$ outputs 1x45, 1x35, 1x25, 1x10 lb plates per side.
- **TC-1.3.5**: Visual barbell graphic renders plates ordered heaviest inside to lightest outside.

#### Feature 4: GZCL Progression & Volume Tracker
- **TC-1.4.1**: Logging 5 sets of 3 reps at 200 lbs computes exact volume ($3,000\text{ lbs}$).
- **TC-1.4.2**: Tier badge renders distinct color badges for T1 (Gold/Amber), T2 (Blue), and T3 (Emerald).
- **TC-1.4.3**: Checking off sets updates the session progress percentage bar in real time.
- **TC-1.4.4**: AMRAP set logging (logging 7 reps on 3+ set) flags successful progression recommendation.
- **TC-1.4.5**: T3 accessory sets track reps and effective rest-pause intervals without errors.

#### Feature 5: Biomechanical Cue Cards & Knee Rehab Guidance
- **TC-1.5.1**: Cue card for Squat displays Squat University 360-degree core brace and foot tripod cue.
- **TC-1.5.2**: Cue card for ATG Split Squat displays Ben Patrick pain-free elevation regression guidelines.
- **TC-1.5.3**: Cue card for Bench Press displays ATHLEAN-X 45-degree elbow tuck & lat rooting cue.
- **TC-1.5.4**: Cue card for Dead Hang displays spinal decompression cues and shoulder pack mechanics.
- **TC-1.5.5**: Accordion expands on click and collapses cleanly on secondary click.

#### Feature 6: Mobility & Flexibility Tracker
- **TC-1.6.1**: Logging ATG Elephant Walks Level 4 saves entry with current date and renders in history table.
- **TC-1.6.2**: Logging Knee-to-Wall Dorsiflexion (4.5" Left, 4.5" Right) records bilateral symmetry.
- **TC-1.6.3**: Logging ATG Split Squat Elevation (2" plate) displays regression benchmark badge.
- **TC-1.6.4**: Logging Biering-Sørensen Hold (125s) triggers green goal-achieved indicator ($\ge 120\text{s}$).
- **TC-1.6.5**: Logging Dead Hang Decompression (60s) records grip and spinal endurance metric.

#### Feature 7: Session Navigator & Routine Selection
- **TC-1.7.1**: Switching tab to Lower A displays quad bulletproofing and Eugene Teo pre-fatigue exercises.
- **TC-1.7.2**: Switching tab to Upper A displays horizontal push/pull and Indian club shoulder prep.
- **TC-1.7.3**: Switching tab to Lower B displays posterior chain and Alyssa Lu active hip reset.
- **TC-1.7.4**: Switching tab to Upper B displays vertical push/pull and pull-up progressions.
- **TC-1.7.5**: Active session tab displays prominent highlight ring and active workout status.

#### Feature 8: LocalStorage Persistence & State Recovery
- **TC-1.8.1**: Marking sets complete persists immediately to `localStorage`.
- **TC-1.8.2**: Hard page refresh retains all entered set reps, weights, and completed checkboxes.
- **TC-1.8.3**: Clear workout session button wipes active session state after user confirmation modal.
- **TC-1.8.4**: JSON export downloads valid `.json` payload containing workout and mobility history.
- **TC-1.8.5**: JSON import restores exported backup file with 100% data fidelity.

---

### Tier 2: Boundary & Corner Cases
*Requires $\ge 5$ test cases per feature.*

#### Feature 1: Timer Boundaries
- **TC-2.1.1**: Setting timer to $0\text{s}$ immediately completes without infinite loop or negative countdown.
- **TC-2.1.2**: Rapid pause/resume spam (10 clicks in 200ms) maintains accurate remaining time.
- **TC-2.1.3**: Extreme duration input ($9999\text{s}$) formats cleanly as `166:39` without visual overflow.
- **TC-2.1.4**: Clicking reset while timer is in mid-tick resets clock immediately to default duration.
- **TC-2.1.5**: Tab backgrounding during final 3s does not cause missed completion chime when reopened.

#### Feature 2: Metronome Boundaries
- **TC-2.2.1**: Tempo string containing 0s in pause slots (`"30X0"`) executes without hanging on 0s pause.
- **TC-2.2.2**: Malformed tempo input (`"invalid"`, `"30X"`, `"99999"`) falls back safely to default `"3010"`.
- **TC-2.2.3**: Switching tempo preset while metronome is actively ticking cleanly restarts cadence on rep 1.
- **TC-2.2.4**: Target reps set to 1 executes exactly 1 cycle and halts automatically.
- **TC-2.2.5**: Extreme tempo (`"9090"`) displays large numbers without SVG text truncation.

#### Feature 3: Plate Calculator Boundaries & Knapsack Minimization
- **TC-2.3.1**: Target $45\text{ lbs}$ (bar only) outputs 0 plates per side without dividing by zero.
- **TC-2.3.2**: Target $300\text{ lbs}$ (absolute max inventory) successfully loads all plates: `[45, 35, 25, 10, 5, 5, 2.5]`.
- **TC-2.3.3**: Knapsack Minimization Verification at $165\text{ lbs}$: Assert result is `[35, 25]` (2 plates) rather than greedy `[45, 10, 5]` (3 plates).
- **TC-2.3.4**: Knapsack Minimization Verification at $170\text{ lbs}$, $175\text{ lbs}$, $180\text{ lbs}$: Assert strictly optimal plate count.
- **TC-2.3.5**: Invalid target weights: $< 45\text{ lbs}$ (e.g. 40), $> 300\text{ lbs}$ (e.g. 305), odd increments (e.g. 52.5 lbs) return clamped/rounded targets with informative messages.

#### Feature 4: GZCL Tracker Boundaries
- **TC-2.4.1**: Entering 0 reps logged in a set marks set as failed and does not award volume.
- **TC-2.4.2**: Entering negative weight (e.g. `-50 lbs`) is rejected and clamped to 0.
- **TC-2.4.3**: Extremely high weight (e.g. `999 lbs`) clamped to maximum realistic load (300 lbs).
- **TC-2.4.4**: All sets marked failed in T1 exercise triggers next stage progression indicator.
- **TC-2.4.5**: Blank/empty input in rep box preserves previous valid value or defaults to 0 without `NaN`.

#### Feature 5: Mobility Tracker Boundaries
- **TC-2.5.1**: Dead hang logged as $0\text{ seconds}$ saves entry without divide-by-zero on chart.
- **TC-2.5.2**: Extreme hold time ($600\text{ seconds}$) renders within SVG chart boundary without clipped labels.
- **TC-2.5.3**: Elephant Walk level logged outside 1–5 is clamped to valid range.
- **TC-2.5.4**: Logging multiple entries on the same calendar date updates existing record or sorts stably.
- **TC-2.5.5**: Deleting all mobility history leaves dashboard in clean empty state with onboarding prompt.

#### Feature 6: LocalStorage Resilience Boundaries
- **TC-2.6.1**: Corrupted JSON string in storage recovers to clean default state without crashing.
- **TC-2.6.2**: Storage filled to quota (`QuotaExceededError`) triggers graceful toast alert without losing memory state.
- **TC-2.6.3**: Schema version migration from older payload successfully preserves existing completed workout records.
- **TC-2.6.4**: Completely empty storage (`null`) initializes full default program data.
- **TC-2.6.5**: Importing malformed or foreign JSON file is rejected with clear schema validation error.

---

### Tier 3: Cross-Feature Combinations (Concurrent Multi-Engine Interactions)
*Requires $\ge 10$ test cases.*

- **TC-3.1**: **Timer Active While Switching Routine Tabs**: User starts 180s timer in Lower A, switches tab to Upper B. Timer remains active in persistent top banner; audio alerts fire on completion regardless of active tab.
- **TC-3.2**: **Logging Reps While Tempo Metronome is Running**: User logs completed reps into Set Tracker while the metronome is actively ticking. Input event does not disrupt metronome cadence or drop audio beats.
- **TC-3.3**: **Opening Plate Calculator During Active Rest Countdown**: User opens Plate Calculator modal while 90s timer is counting down. Timer continues uninterrupted behind modal; selecting calculated weight populates active exercise input.
- **TC-3.4**: **Mobility Entry Persistence Concurrent With Workout Logging**: User logs Knee-to-Wall test in Mobility tab while an active Lower A session is in progress. Both workout sets and mobility history persist simultaneously without state overwrites.
- **TC-3.5**: **Audio Mute Setting Affects Both Timer and Metronome**: User toggles global mute icon in header. Subsequent timer completion and metronome ticks produce zero sound while visual animations continue uninterrupted.
- **TC-3.6**: **GZCL Stage Progression Updates Next Week's Prescribed Sets**: Marking all 5 sets of Squat failed updates the exercise config for the subsequent Lower A session to $6 \times 2+$.
- **TC-3.7**: **Timer Auto-Start on Set Checkbox Click**: Marking a working set complete automatically triggers preset rest timer (e.g. 180s for T1, 60s for T3) if auto-timer setting is enabled.
- **TC-3.8**: **Cue Card Expansion Does Not Obscure Plate Calculator Modal**: Opening plate calculator while a cue card is expanded properly manages z-index layering and modal backdrop focus trap.
- **TC-3.9**: **Exporting JSON During Active Workout Session**: Exporting backup file while a session is partially complete captures active session state, past workouts, and mobility history in a single coherent snapshot.
- **TC-3.10**: **Offline Mode Simulation**: Simulating network disconnection (navigator.onLine = false) confirms zero degradation in app function, timer, audio, or persistence.

---

### Tier 4: Real-World Application Workflows (Complete User Journeys)
*Requires full end-to-end multi-step workout simulation.*

#### Workflow 1: Complete Lower A Session (Quad & Knee Bulletproofing)
- **Step 1**: Open app $\rightarrow$ verify default view is Lower A.
- **Step 2**: Warm-up: Review Ben Patrick backward walking / sled protocol and Eugene Teo calf/hamstring pre-fatigue cues.
- **Step 3**: Tier 1 Barbell Box Squat:
  - Open Plate Calculator $\rightarrow$ enter $185\text{ lbs}$ $\rightarrow$ verify 1x45, 1x25 lb plates per side $\rightarrow$ apply to set logs.
  - Complete Sets 1 through 5 (3 reps each).
  - After each set, trigger 180s rest countdown timer $\rightarrow$ simulate tick completion $\rightarrow$ verify chime.
- **Step 4**: Tier 2 ATG Split Squats:
  - Review cue card for elevation regression.
  - Log 3 sets of 10 reps with Bowflex kettlebell (35 lbs).
  - Trigger 120s rest interval between sets.
- **Step 5**: Tier 3 Tibialis Wall Raises & McGill Big 3:
  - Log 3 sets of 15 reps tibialis raises + McGill core holds.
- **Step 6**: Post-Workout Mobility:
  - Switch to Mobility Tracker $\rightarrow$ log Knee-to-Wall Dorsiflexion ($4.2"$ Left, $4.0"$ Right).
- **Step 7**: Session Completion:
  - Click "Finish Workout" $\rightarrow$ verify total volume computed and saved to `workoutHistory`.
  - Reload page $\rightarrow$ verify session is logged in history and Lower A is ready for next cycle.

#### Workflow 2: Complete Upper A Session (Horizontal Push/Pull & Shoulder Health)
- **Step 1**: Switch to Upper A tab.
- **Step 2**: Prep: Review Indian club shoulder circle prep cue card (2 lb / 5 lb clubs).
- **Step 3**: Tier 1 Barbell Bench Press:
  - Use Plate Calculator for $165\text{ lbs}$ $\rightarrow$ verify optimal knapsack loads 1x35, 1x25 lb plates.
  - Log 5 sets of 3 reps with ATHLEAN-X 45-degree elbow tuck cues.
  - Run 180s rest timer between sets.
- **Step 4**: Tier 2 Landmine Underhand Row:
  - Log 3 sets of 8 reps with landmine attachment.
- **Step 5**: Tier 3 Athlean-X 20 Effective Reps (ER) Kettlebell Floor Press:
  - Complete initial set to failure (12 reps) $\rightarrow$ trigger 15s rest-pause timer $\rightarrow$ log 4 reps $\rightarrow$ 15s rest $\rightarrow$ 4 reps (total 20 effective reps).
- **Step 6**: Complete session and assert persistence integrity.

#### Workflow 3: Complete Lower B Session (Posterior Chain & Hamstring Restoration)
- **Step 1**: Switch to Lower B tab.
- **Step 2**: Mobility prep: Review Dr. Alyssa Lu active hip reset and perform ATG Elephant Walks.
  - Log Elephant Walk reach (Level 4 - Knuckles to floor) in Mobility Tracker.
- **Step 3**: Tier 1 Barbell Romanian Deadlift (RDL):
  - Plate Calculator for $225\text{ lbs}$ $\rightarrow$ verify 2x45 lb plates per side.
  - Log 5 sets of 3 reps with Eugene Teo hamstring hinge cues.
  - Run 180s timer between sets.
- **Step 4**: Tier 2 Goblet Cossack Squats:
  - Log 3 sets of 8 reps with kettlebell.
- **Step 5**: Tier 3 Single-Leg Patrick Step-ups on weight plates & Biering-Sørensen back extensor holds:
  - Log 3 sets of Patrick step-downs.
  - Log Biering-Sørensen hold ($130\text{s}$) $\rightarrow$ verify benchmark celebration indicator.
- **Step 6**: Assert persistence and history tonnage update.

#### Workflow 4: Complete Upper B Session (Vertical Push/Pull & Functional Calisthenics)
- **Step 1**: Switch to Upper B tab.
- **Step 2**: Dead Hang Prep:
  - Perform 60s dead hang on pull-up bar $\rightarrow$ log in Mobility Tracker.
- **Step 3**: Tier 1 Barbell Overhead Press (OHP):
  - Plate Calculator for $115\text{ lbs}$ $\rightarrow$ verify 1x35 lb plate per side.
  - Log 5 sets of 3 reps.
- **Step 4**: Tier 2 Pull-Up Progression:
  - Log pull-up ladder sets (Yellow Dude gate threshold).
- **Step 5**: Tier 3 Marcus Filly Single-Arm Kettlebell Press with 30X1 Tempo:
  - Launch Tempo Metronome $\rightarrow$ set tempo `"30X1"`, target reps 8.
  - Run metronome $\rightarrow$ verify 5s cycle cadence and audio pings $\rightarrow$ log completed set.
  - L-Sit compression holds on floor.
- **Step 6**: Finish workout $\rightarrow$ verify full 4-day workout cycle completed.

#### Workflow 5: Disaster Recovery & Storage Backup / Restore Lifecycle
- **Step 1**: Complete entire 4-session training week (Lower A, Upper A, Lower B, Upper B) and 5 mobility assessments.
- **Step 2**: Export backup JSON file $\rightarrow$ verify payload contains all 4 completed workouts and 5 mobility records.
- **Step 3**: Simulate catastrophic browser cache wipe (`localStorage.clear()`) $\rightarrow$ refresh page $\rightarrow$ verify clean default state.
- **Step 4**: Import exported backup JSON $\rightarrow$ verify instantaneous recovery of all historical workouts, active progression stages, and mobility charts with 100% data fidelity.

---

## 5. TEST_INFRA.md Blueprint & Implementation Guidelines

### 5.1 Project Directory Structure
```
workout_program/
├── src/
│   ├── domain/               # Pure business logic (Zero UI dependencies)
│   │   ├── plate-calculator.ts
│   │   ├── timer-machine.ts
│   │   ├── tempo-machine.ts
│   │   ├── gzcl-logic.ts
│   │   ├── workout-data.ts
│   │   └── mobility-data.ts
│   ├── services/             # Browser interfaces & adapters
│   │   ├── sound-engine.ts
│   │   ├── storage-service.ts
│   │   └── worker-timer.ts
│   └── components/           # React UI components
│
├── tests/
│   ├── helpers/              # Deterministic test harnesses & mocks
│   │   ├── mock-audio.ts     # Web Audio API oscillator & gain spy
│   │   ├── mock-storage.ts   # Fault-injected LocalStorage mock
│   │   ├── mock-timer.ts     # Virtual time stepper
│   │   └── mock-dom.ts       # Viewport & DOM layout helpers
│   ├── unit/                 # Domain logic unit tests (Tier 1 & 2)
│   │   ├── plate-calculator.test.ts
│   │   ├── timer-machine.test.ts
│   │   ├── tempo-machine.test.ts
│   │   ├── gzcl-logic.test.ts
│   │   ├── mobility-data.test.ts
│   │   └── storage-service.test.ts
│   ├── integration/          # Component & multi-engine tests (Tier 3)
│   │   ├── cross-feature.test.tsx
│   │   ├── set-tracker-timer.test.tsx
│   │   └── responsive-dom.test.ts
│   └── e2e/                  # Full application workflows (Tier 4)
│       ├── workflow-lower-a.test.ts
│       ├── workflow-upper-a.test.ts
│       ├── workflow-lower-b.test.ts
│       ├── workflow-upper-b.test.ts
│       └── workflow-backup-restore.test.ts
│
├── vitest.config.ts
└── package.json
```

### 5.2 Key Test Mock Implementations

#### 5.2.1 Mock Audio Synthesizer (`tests/helpers/mock-audio.ts`)
```typescript
export class MockSoundEngine {
  public playedTones: Array<{ type: string; freq?: number; time: number }> = [];
  public isMuted = false;

  playTick() {
    if (!this.isMuted) this.playedTones.push({ type: 'tick', freq: 800, time: Date.now() });
  }

  playWarningPing(secondsLeft: number) {
    const freqs: Record<number, number> = { 3: 523.25, 2: 587.33, 1: 659.25 };
    if (!this.isMuted) this.playedTones.push({ type: 'warning', freq: freqs[secondsLeft], time: Date.now() });
  }

  playCompletionChime() {
    if (!this.isMuted) this.playedTones.push({ type: 'completion', freq: 880, time: Date.now() });
  }

  playTempoCadenceTick() {
    if (!this.isMuted) this.playedTones.push({ type: 'tempo_tick', freq: 440, time: Date.now() });
  }

  playTempoConcentricPing() {
    if (!this.isMuted) this.playedTones.push({ type: 'tempo_explode', freq: 880, time: Date.now() });
  }

  clear() {
    this.playedTones = [];
  }
}
```

#### 5.2.2 Fault-Injected Storage Mock (`tests/helpers/mock-storage.ts`)
```typescript
export class MockLocalStorage {
  private store: Map<string, string> = new Map();
  public shouldThrowQuotaError = false;
  public shouldBlockAccess = false;

  getItem(key: string): string | null {
    if (this.shouldBlockAccess) throw new Error('SecurityError: Access denied');
    return this.store.get(key) || null;
  }

  setItem(key: string, value: string): void {
    if (this.shouldBlockAccess) throw new Error('SecurityError: Access denied');
    if (this.shouldThrowQuotaError) throw new DOMException('QuotaExceededError');
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}
```

### 5.3 Windows-Compliant NPM Scripts Configuration
In `package.json`:
```json
{
  "name": "workout-program-web",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:unit": "vitest run tests/unit",
    "test:integration": "vitest run tests/integration",
    "test:e2e": "vitest run tests/e2e",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

---

## 6. Quality Assurance Gate & Verification Protocol

### 6.1 Gate Acceptance Criteria
Prior to releasing any milestone build to parent orchestrators or user review:
- [ ] **100% Test Pass Rate**: All unit, integration, and E2E tests pass with zero failures (`exit code 0`).
- [ ] **Exhaustive Plate Infallibility**: All 52 barbell weights (45 to 300 lbs) pass validation; weights $165, 170, 175, 180$ lbs strictly verify optimal minimal plate counts.
- [ ] **Zero Timer Drift**: Timer countdowns proven accurate under synthetic clock advance.
- [ ] **Zero Audio Asset Dependency**: All sound cues fire programmatically without network assets.
- [ ] **Storage Resilience**: Fault-injection tests confirm zero unhandled exceptions on corrupt JSON, missing schema keys, or quota exhaustion.
- [ ] **DOM Layout Cleanliness**: Viewport checks at 375px, 768px, and 1280px show zero horizontal scrollbar overflow.

### 6.2 Test Failure Escalation Matrix
- **Critical (Blocker)**: Plate calculation failure, timer failure to stop at 0s, or unhandled persistence crash. Immediate stop-work and fix.
- **High**: Miscalculated GZCL volume, incorrect tempo phase progression, missing audio cue trigger.
- **Medium**: Visual button truncation on 375px mobile view, missing cue card description text.
- **Low**: Non-breaking color styling discrepancy.

---
