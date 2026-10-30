# Web Architecture, Interactive Engines & Audio Survey
**Project**: 4-Day Upper/Lower Workout Web Application  
**Author**: Explorer Survey 2 (Web Architecture & Timer Engine Explorer)  
**Date**: October 13, 2026  
**Status**: Completed Architectural Specification  

---

## 1. Executive Summary & Core Design Principles

This survey establishes the complete technical architecture, interactive engine designs, and data specifications for the **4-Day Upper/Lower Workout Web Application**. The application synthesizes training methodologies from 8 elite fitness creators (Jeff Nippard, Jeff Cavaliere / ATHLEAN-X, Ben Patrick / ATG, Dr. Aaron Horschig / Squat University, Marcus Filly, Coach Eugene Teo, Yellow Dude, Dr. Alyssa Lu) and GZCL methodology into a personalized training web app.

### Core Architectural Principles
1. **Zero External Asset Dependencies**:
   - Zero audio assets (`.mp3`/`.wav`) to fetch, preload, or fail over poor gym Wi-Fi/cellular. All sounds (ticks, warning pings, completion chimes, tempo beats) are synthesized programmatically in real-time via the browser's native **Web Audio API**.
   - Zero external icon or font network requests. High-performance inline SVGs are used for all iconography, circular timer progress dials, barbell sleeve diagrams, and mobility trend charts.
2. **Local-First & Offline Resilience**:
   - The entire application runs client-side with 100% offline capability.
   - Real-time auto-saving to browser `LocalStorage` with schema versioning (`v1`), input debouncing, and JSON export/import backup functionality.
3. **Mathematical Optimality**:
   - The barbell plate loader utilizes an **exact 128-state subset-sum algorithm** tailored to the user's finite plate inventory (2x45, 2x35, 2x25, 2x10, 4x5, 2x2.5 lb plates, 45 lb bar, up to 300 lbs). This avoids the mathematical flaws of standard greedy change-making algorithms (which fail at 165, 170, 175, and 180 lbs).
4. **Zero Timer Drift in Background Tabs**:
   - Timers combine `performance.now()` timestamp deltas, `document.visibilitychange` synchronization, and an inline Web Worker (spawned from an in-memory `Blob` URL) to ensure rest countdowns never stall when mobile screens dim or user switches apps.
5. **Windows 11 Runtime Compliance**:
   - Standardized on Node.js v24 LTS and `npm.cmd` / `npx.cmd` to bypass Windows PowerShell script execution policy (`npm.ps1`) restrictions. Clean cross-platform scripts ensure seamless automated testing.

---

## 2. Technical Stack Evaluation & Recommendation

### 2.1 Evaluated Framework Candidates

| Metric | Option A: Vite + React 19 + TypeScript + Tailwind | Option B: Vite + Vanilla TypeScript + Scoped CSS | Option C: Next.js / Nuxt Fullstack |
|---|---|---|---|
| **Bundle Size** | ~45 KB gzipped | ~15 KB gzipped | >250 KB gzipped |
| **Component Modularity** | Excellent (declarative JSX, hooks, isolated modals) | Moderate (manual DOM templates or Web Components) | High, but bloated |
| **State Complexity Handling** | High (nested set/rep logs, timer modals, tabs) | Complex (manual state diffing or custom event bus) | High |
| **Automated Testing** | Superb (Vitest + React Testing Library + jsdom) | Good (Vitest + jsdom) | Complex (SSR setup) |
| **Offline / Static Deploy** | 100% static single-page app (SPA) | 100% static single-page app (SPA) | Requires node server or static export config |
| **Gym UX / Interactivity** | Reactive updates, immediate re-renders | Manual DOM manipulations | Hydration overhead |

### 2.2 Recommendation: Option A (Vite + React 19 + TypeScript + Tailwind CSS)
**Rationale**:
- The application requires multi-layered interactive state: active workout navigation, multi-tier timer engine, tempo metronome modal, plate calculator modal, cue card drawers, set/rep loggers, and a dedicated mobility tracker. React's declarative state model (`useState`, `useReducer`, `useEffect`, `useCallback`) prevents imperative DOM spaghetti and synchronization bugs.
- **Vite** delivers sub-second Hot Module Replacement (HMR) and instantaneous build times on the user's AMD Ryzen 9 9900X workstation.
- **Tailwind CSS** provides utility-first responsive styling with zero CSS runtime overhead, enabling high-contrast dark mode tailored for dim gym environments.
- **Vitest** shares Vite's configuration directly, providing fast automated unit and component testing.

### 2.3 Windows 11 Compatibility & Tooling Configuration
- **Node Environment**: Node v24.20.0, npm.cmd v11.19.0.
- **PowerShell Execution Workaround**: When running scripts on Windows PowerShell where `.ps1` execution is restricted, commands must call `npm.cmd run test`, `npm.cmd run build`, or configure `cross-env`.
- **Recommended `package.json` Scripts**:
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
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

---

## 3. Rest Interval Countdown Timer Engine

### 3.1 State Machine Specification
The countdown timer is modeled as a deterministic Finite State Machine (FSM):

```
       +---------------------------------------------+
       |                                             |
       v                                             |
   [ IDLE ] ---(START/PRESET)---> [ RUNNING ]        | (RESET)
       ^                               |   ^         |
       |                            (PAUSE)|(RESUME) |
       |                               v   |         |
       +-------(RESET)----------- [ PAUSED ]         |
       |                                             |
       |                                             |
 [ COMPLETED ] <---(TIME_REMAINING <= 0)-------------+
       |
       +---(RESET / NEW_PRESET)---> [ IDLE ]
```

#### States:
- `IDLE`: Initial state; display shows default or selected preset duration.
- `RUNNING`: Timer actively decrementing; audio tick pings enabled; circular progress ring updating.
- `PAUSED`: Ticking suspended; elapsed time frozen; resume capability.
- `COMPLETED`: Countdown reached zero; completion chime triggered; ring glows green/emerald; haptic vibration dispatched if supported.

#### State Transitions:
1. `START(seconds)`: Transitions from `IDLE` | `COMPLETED` | `PAUSED` $\rightarrow$ `RUNNING`. Sets `targetEndTime = performance.now() + (seconds * 1000)`.
2. `PAUSE`: Transitions from `RUNNING` $\rightarrow$ `PAUSED`. Calculates `remainingMs = targetEndTime - performance.now()`.
3. `RESUME`: Transitions from `PAUSED` $\rightarrow$ `RUNNING`. Sets `targetEndTime = performance.now() + remainingMs`.
4. `RESET`: Transitions from any state $\rightarrow$ `IDLE`.
5. `TICK`: Evaluates `remainingMs = targetEndTime - performance.now()`. If $\le 0$, transitions to `COMPLETED`.
6. `ADD_TIME(seconds)`: Extends `targetEndTime += seconds * 1000` (e.g. `+15s`, `+30s` quick-bump buttons).

### 3.2 Preset Tier Architecture
Preset intervals are directly mapped to the training stimulus prescribed by the creators and GZCL tiers:

| Tier / Category | Recommended Presets | Training Application & Creator Rationale |
|---|---|---|
| **Tier 1 Heavy Compounds** | `180s (3m)`, `240s (4m)`, `300s (5m)` | Full ATP-CP resynthesis and neural recovery for heavy Squats, Bench, Deadlifts, and OHP. |
| **Tier 2 Hypertrophy Compounds** | `120s (2m)`, `150s (2.5m)`, `180s (3m)` | Balanced mechanical tension and metabolic clearance for ATG Split Squats, Landmine Rows, Pull-Up ladders. |
| **Tier 3 Accessories & Mobility** | `60s (1m)`, `90s (1.5m)` | High-volume hypertrophy, rotator cuff work (Indian clubs), tibialis raises, and core endurance. |
| **Rest-Pause / Effective Reps** | `15s`, `30s` | Athlean-X 20-Effective-Reps clusters (brief 15-second intra-set resets to extend failure threshold). |
| **Custom Time Input** | Stepper `[ -15s | MM:SS | +15s ]` | Flexibility for custom user pacing. |

### 3.3 High-Precision Timing & Background Tab Handling
Mobile browsers throttle `setInterval` and `setTimeout` down to once per minute or suspend execution entirely when a tab loses focus or the phone screen turns off. To maintain 100% timing accuracy:
1. **Timestamp Delta Tracking**: The source of truth is always `targetEndTime - Date.now()`. The timer never relies on accumulated interval increments (`count--`).
2. **Page Visibility Synchronization**:
   ```typescript
   document.addEventListener('visibilitychange', () => {
     if (document.visibilityState === 'visible' && timerState === 'RUNNING') {
       syncTimerWithTarget();
     }
   });
   ```
3. **Zero-File Inline Web Worker**: An in-memory Web Worker created via a `Blob` URL is exempt from main-thread tab throttling, firing 100ms ticks continuously:
   ```typescript
   const workerBlob = new Blob([`
     let intervalId = null;
     self.onmessage = function(e) {
       if (e.data === 'start') {
         if (intervalId) clearInterval(intervalId);
         intervalId = setInterval(() => self.postMessage('tick'), 100);
       } else if (e.data === 'stop') {
         if (intervalId) clearInterval(intervalId);
         intervalId = null;
       }
     };
   `], { type: 'application/javascript' });
   const timerWorker = new Worker(URL.createObjectURL(workerBlob));
   ```

### 3.4 Circular SVG Progress Ring Architecture
The progress ring uses an SVG `<circle>` styled with CSS stroke dash attributes:
- Radius: $r = 110\text{px}$
- Circumference: $C = 2 \times \pi \times 110 \approx 691.15\text{px}$
- `strokeDasharray`: $691.15$
- `strokeDashoffset`: $C \times \left(1 - \frac{\text{remainingMs}}{\text{totalDurationMs}}\right)$
- Smooth interpolation via CSS: `transition: stroke-dashoffset 0.1s linear, stroke 0.3s ease;`
- **Dynamic Color Shifts**:
  - $100\% \rightarrow 50\%$: `#10B981` (Emerald green - rest phase initiated)
  - $50\% \rightarrow 20\%$: `#F59E0B` (Amber yellow - prepare for next set)
  - $20\% \rightarrow 0\%$: `#EF4444` (Crimson red - final 5-10s countdown)
  - Completion: `#3B82F6` (Electric cyan/blue pulse)

---

## 4. Web Audio API Sound Synthesizer

### 4.1 Programmatic Audio Architecture
To eliminate all external audio files and CDN failures, the app includes a dedicated `SoundEngine` service that generates audio waveforms directly via the browser's `AudioContext`.

```
[AudioContext]
     |
     +---> [OscillatorNode (Frequency / Waveform)]
                 |
                 v
           [GainNode (ADSR Volume Envelope)]
                 |
                 v
           [AudioContext.destination (Speakers / Headphones)]
```

### 4.2 Browser Autoplay & AudioContext Unlocking
Modern browsers block audio until a user gesture occurs. The `SoundEngine` implements automatic unlocking on the first user interaction:
```typescript
class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }
}
```

### 4.3 Synthesized Tone Specifications

| Sound Trigger | Waveform | Frequency | Envelope (Attack / Decay) | Purpose & Character |
|---|---|---|---|---|
| **Second Tick** | Sine | 800 Hz | Attack: 1ms, Decay: 20ms, Gain: 0.15 | Subtle woodblock-style tick during the final 5 seconds. |
| **Warning Ping (3s)** | Sine | 523.25 Hz (C5) | Attack: 2ms, Decay: 120ms, Gain: 0.30 | Pre-cue warning to return to bar. |
| **Warning Ping (2s)** | Sine | 587.33 Hz (D5) | Attack: 2ms, Decay: 120ms, Gain: 0.35 | Rising pitch indication. |
| **Warning Ping (1s)** | Sine | 659.25 Hz (E5) | Attack: 2ms, Decay: 120ms, Gain: 0.40 | Immediate set preparation. |
| **Completion Chime** | Dual Sine (Chord) | Fundamental: 880 Hz (A5), Harmonic: 1318.5 Hz (E6) | Attack: 5ms, Exponential Decay: 1600ms, Gain: 0.45 | Rich bell-like chime signaling rest period ended. |
| **Tempo Concentric Ping** | Triangle | 880 Hz (A5) | Attack: 1ms, Decay: 80ms, Gain: 0.4 | Crisp, snappy signal to explode concentric phase. |
| **Tempo Cadence Tick** | Sine | 440 Hz (A4) | Attack: 2ms, Decay: 40ms, Gain: 0.2 | Steady 1-second pacing metronome beat. |

#### Implementation of Dual-Harmonic Bell Chime:
```typescript
playCompletionChime() {
  if (this.isMuted) return;
  this.initContext();
  if (!this.ctx) return;

  const now = this.ctx.currentTime;
  const frequencies = [880, 1318.51, 1760]; // A5, E6, A6 overtone
  
  frequencies.forEach((freq, idx) => {
    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    
    // Gain envelope: fast attack, realistic exponential bell decay
    const initialVol = 0.35 / (idx + 1);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(initialVol, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);
    
    osc.connect(gain);
    gain.connect(this.ctx!.destination);
    
    osc.start(now);
    osc.stop(now + 1.8);
  });
}
```

---

## 5. Marcus Filly Tempo Metronome Engine

### 5.1 Marcus Filly Functional Bodybuilding 4-Digit Cadence
Marcus Filly's Functional Bodybuilding tempo prescription uses a standard 4-digit code:
$$\mathbf{[E][P_B][C][P_T]}$$
- **$E$ (Eccentric / Lowering)**: Duration in seconds to lengthen the muscle under control (e.g. `3` or `4` seconds). Critical for tendon remodeling and collagen hypertrophy (Yellow Dude / Ben Patrick).
- **$P_B$ (Pause Bottom / Lengthened Isometric)**: Duration in seconds paused at the bottom/inflection point (e.g. `0`, `1`, or `2` seconds). Eliminates stretch reflex and builds deep joint stability.
- **$C$ (Concentric / Lifting)**: Duration in seconds or `X` (`X` = explosive intent, moving the weight with maximal acceleration while maintaining form).
- **$P_T$ (Pause Top / Shortened Isometric)**: Duration in seconds holding the contraction at the top (e.g. `1` second squeeze).

#### Example: `30X1` (Prescribed for Upper B Single-Arm Kettlebell Press)
1. **3**: Lower the kettlebell from lockout to shoulder over **3 seconds**.
2. **0**: **0-second pause** at shoulder (immediate reversal without resting).
3. **X**: **Explode** overhead with maximal pressing velocity (~1 second).
4. **1**: Hold lockout overhead for **1 second** with lat and core engaged.
*Total Rep Duration*: 5 seconds per rep.

### 5.2 Metronome State Machine & Cadence Engine
The Metronome engine manages active rep counts and phase cycles:

```typescript
type TempoPhase = 'eccentric' | 'pause_bottom' | 'concentric' | 'pause_top';

interface TempoConfig {
  eccentric: number;      // e.g. 3
  pauseBottom: number;    // e.g. 0
  concentric: number | 'X'; // e.g. 'X' (treated as 1s explosive)
  pauseTop: number;       // e.g. 1
  targetReps: number;     // e.g. 8
}
```

- **Cadence Cycle Flow**:
  1. `Rep 1` begins $\rightarrow$ `eccentric` counts $3 \rightarrow 2 \rightarrow 1$ (440 Hz ticks).
  2. If `pauseBottom > 0`, holds with low 330 Hz pulse.
  3. `concentric` triggers explosive cue (880 Hz ping).
  4. If `pauseTop > 0`, holds with 659 Hz squeeze cue.
  5. Rep counter increments: `currentRep++`.
  6. If `currentRep < targetReps`, loop to `eccentric`. If `currentRep === targetReps`, play double completion chime and stop.

### 5.3 Visual Pacing UI
- **Pacing Ring / Expanding Bar**:
  - Eccentric: Ring contracts inward with a smooth blue gradient.
  - Pause Bottom: Ring pulses amber with a "HOLD STABLE" label.
  - Concentric: Ring explosively expands outward with an electric green gradient and "DRIVE!" label.
  - Pause Top: Ring locks out purple with a "SQUEEZE" badge.
- **Large Digital Countdown**: Large, easily visible second-by-second countdown with current rep display (`Rep 4 of 8`).

---

## 6. Barbell Plate Loading Calculator Algorithm

### 6.1 User Equipment Inventory & Mathematical Proof
The user possesses an exact home gym plate inventory:
- **Barbell**: Olympic Barbell = **45 lbs**.
- **Plates**:
  - $45\text{ lb}$: 2 plates (1 pair)
  - $35\text{ lb}$: 2 plates (1 pair)
  - $25\text{ lb}$: 2 plates (1 pair)
  - $10\text{ lb}$: 2 plates (1 pair)
  - $5\text{ lb}$: 4 plates (2 pairs)
  - $2.5\text{ lb}$: 2 plates (1 pair)
- **Total Possible Weight**:
  $$W_{\text{total}} = 45 + 2 \times (45 + 35 + 25 + 10 + 5 + 5 + 2.5) = 45 + 2 \times 127.5 = \mathbf{300\text{ lbs}}$$
- **Per-Side Plate Pool**:
  $$I_{\text{side}} = [45, 35, 25, 10, 5, 5, 2.5]$$
  Total available per side: $127.5\text{ lbs}$.

### 6.2 Mathematical Finding: Greedy Algorithm Failure Analysis
Standard greedy change-making algorithms (picking the largest plate that fits into the remaining weight) **fail to produce optimal plate counts** for this specific inventory.

Empirical verification shows:
- **Target Side $60\text{ lbs}$ (Barbell Total $165\text{ lbs}$)**:
  - *Greedy Output*: $45 + 10 + 5 = 60\text{ lbs}$ $\rightarrow$ **3 plates per side**.
  - *Optimal Output*: $35 + 25 = 60\text{ lbs}$ $\rightarrow$ **2 plates per side** ($\mathbf{33\%}$ reduction in plates to load).
- **Target Side $65\text{ lbs}$ (Barbell Total $175\text{ lbs}$)**:
  - *Greedy Output*: $45 + 10 + 5 + 5 = 65\text{ lbs}$ $\rightarrow$ **4 plates per side**.
  - *Optimal Output*: $35 + 25 + 5 = 65\text{ lbs}$ $\rightarrow$ **3 plates per side**.
- **Target Side $67.5\text{ lbs}$ (Barbell Total $180\text{ lbs}$)**:
  - *Greedy Output*: $45 + 10 + 5 + 5 + 2.5 = 67.5\text{ lbs}$ $\rightarrow$ **5 plates per side**.
  - *Optimal Output*: $35 + 25 + 5 + 2.5 = 67.5\text{ lbs}$ $\rightarrow$ **4 plates per side**.

### 6.3 Optimal Algorithm Specification (Exact Subset-Sum Search)
Because $|I_{\text{side}}| = 7$, the search space is bounded by $2^7 = 128$ states. Evaluating all 128 combinations takes $< 0.02\text{ ms}$ in JavaScript, guaranteeing:
1. **Minimal Plate Count**: Least total plates loaded per sleeve.
2. **Optimal Weight Distribution**: Tie-breaker favors larger plates closer to the collar for barbell physics and collar stability.
3. **100% Achievability**: Every 5 lb increment from 45 lbs to 300 lbs is fully achievable.

```typescript
export interface PlateCalculationResult {
  targetWeight: number;
  achievableWeight: number;
  barWeight: number;
  weightPerSide: number;
  platesPerSide: number[]; // sorted descending (inside to outside)
  isExact: boolean;
  message?: string;
}

export function calculatePlates(targetWeight: number): PlateCalculationResult {
  const BAR_WEIGHT = 45;
  const INVENTORY = [45, 35, 25, 10, 5, 5, 2.5]; // 7 plates per side

  if (targetWeight <= BAR_WEIGHT) {
    return {
      targetWeight,
      achievableWeight: BAR_WEIGHT,
      barWeight: BAR_WEIGHT,
      weightPerSide: 0,
      platesPerSide: [],
      isExact: targetWeight === BAR_WEIGHT,
      message: targetWeight < BAR_WEIGHT ? `Target below bar weight (45 lbs). Use empty bar.` : `Empty bar.`
    };
  }

  if (targetWeight > 300) {
    return {
      targetWeight,
      achievableWeight: 300,
      barWeight: BAR_WEIGHT,
      weightPerSide: 127.5,
      platesPerSide: [45, 35, 25, 10, 5, 5, 2.5],
      isExact: false,
      message: `Target exceeds max inventory capacity (300 lbs). Loaded max possible.`
    };
  }

  // Desired weight on each side
  const desiredSide = (targetWeight - BAR_WEIGHT) / 2;

  // Exact 128-state subset search
  const n = INVENTORY.length;
  let bestSubset: number[] | null = null;

  for (let mask = 0; mask < (1 << n); mask++) {
    let sum = 0;
    const subset: number[] = [];
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) {
        sum += INVENTORY[i];
        subset.push(INVENTORY[i]);
      }
    }

    if (sum === desiredSide) {
      if (!bestSubset || subset.length < bestSubset.length) {
        bestSubset = subset;
      }
    }
  }

  if (bestSubset) {
    // Sort descending: heaviest plates closest to sleeve collar
    bestSubset.sort((a, b) => b - a);
    return {
      targetWeight,
      achievableWeight: targetWeight,
      barWeight: BAR_WEIGHT,
      weightPerSide: desiredSide,
      platesPerSide: bestSubset,
      isExact: true
    };
  }

  // Non-exact weight handling (e.g. odd increments like 162 lbs)
  const nearestTarget = Math.round((targetWeight - BAR_WEIGHT) / 5) * 5 + BAR_WEIGHT;
  const clampedNearest = Math.min(300, Math.max(45, nearestTarget));
  const fallback = calculatePlates(clampedNearest);

  return {
    ...fallback,
    targetWeight,
    isExact: false,
    message: `${targetWeight} lbs cannot be loaded with 2.5 lb plates. Nearest: ${clampedNearest} lbs.`
  };
}
```

### 6.4 Visual Barbell Graphic Rendering
Plates are displayed on a rendered Olympic barbell sleeve arranged from inside (collar) to outside (sleeve tip):
- **45 lb Plate**: Diameter $450\text{mm}$, color `#EF4444` (Olympic Red or Deep Slate).
- **35 lb Plate**: Diameter $390\text{mm}$, color `#F59E0B` (Olympic Yellow).
- **25 lb Plate**: Diameter $340\text{mm}$, color `#10B981` (Olympic Green).
- **10 lb Plate**: Diameter $280\text{mm}$, color `#1E293B` (Black/Charcoal).
- **5 lb Plate**: Diameter $220\text{mm}$, color `#64748B` (Steel White/Silver).
- **2.5 lb Plate**: Diameter $180\text{mm}$, color `#94A3B8` (Light Chrome).
- **Spring Collar**: Retaining clamp rendered at the end of the loaded stack.

---

## 7. Dedicated Mobility & Flexibility Tracker Module

Per user requirements, the application incorporates a dedicated **Mobility & Flexibility Tracker** that tracks measurable progress over time for the 5 targeted biomechanical assessments.

### 7.1 Tracked Assessments & Benchmarks

| Assessment Name | Biomechanical Creator | Target Metric & Unit | Scale & Clinical Benchmarks | Target Goal |
|---|---|---|---|---|
| **ATG Elephant Walks** | Ben Patrick (ATG) | Hamstring Active Reach (Ordinal Level 1–5) | Level 1: Mid-Shin<br>Level 2: Ankles<br>Level 3: Fingertips to Toes<br>Level 4: Knuckles to Floor<br>Level 5: Palms Flat on Floor | **Level 5 (Palms Flat)** |
| **Knee-to-Wall Dorsiflexion** | Dr. Aaron Horschig (Squat University) | Distance from Wall (Inches or cm) (Left vs Right) | $< 3.0"$: High patellar tendon shear risk<br>$3.0" - 4.5"$: Functional<br>$\ge 5.0"$: Optimal foot tripod & squat depth | **$\ge 5.0"$ bilateral** (within 0.5" symmetry) |
| **ATG Split Squat Elevation** | Ben Patrick (ATG) | Front Foot Elevation (Inches off floor) (Left vs Right) | $12"$: High regression (pain-free entry)<br>$8"$: Moderate box elevation<br>$4"$: Single bumper plate<br>$2"$: Low plate<br>$0"$: Flat ground (Full hamstring-to-calf coverage) | **$0"$ (Flat Ground pain-free)** |
| **Biering-Sørensen Hold** | Dr. Stuart McGill | Posterior Chain Extensor Endurance (Seconds) | $< 60\text{s}$: High lumbar shear risk<br>$60 - 119\text{s}$: Average endurance<br>$\ge 120\text{s}$: McGill clinical spinal health standard | **$\ge 120\text{ seconds}$** |
| **Dead Hang Decompression** | Jeff Cavaliere (Athlean-X) | Grip & Spinal Decompression Hang Time (Seconds) | $< 30\text{s}$: Sub-optimal grip/shoulder stability<br>$30 - 59\text{s}$: Moderate decompression<br>$\ge 60\text{s}$: Full spinal decompression standard | **$\ge 60 - 90\text{ seconds}$** |

### 7.2 Data Schema for Mobility Tracker
```typescript
export type MobilityTestType = 
  | 'elephant_walk' 
  | 'knee_to_wall' 
  | 'split_squat_elevation' 
  | 'sorensen_hold' 
  | 'dead_hang';

export interface MobilityRecord {
  id: string;                    // UUID or timestamp string
  testType: MobilityTestType;
  date: string;                  // ISO 8601 string (e.g. '2026-10-13')
  value: number;                 // Numeric measurement or level (1-5)
  unit: 'level' | 'in' | 'cm' | 's';
  side?: 'left' | 'right' | 'bilateral'; // For unilateral tests
  notes?: string;
}
```

### 7.3 Progress Visualization
The UI renders a **zero-dependency SVG progress sparkline** and status badge for each assessment:
- Visual baseline line showing initial score vs latest score.
- Trend arrow ($\uparrow$ improving, $\rightarrow$ maintaining).
- Target benchmark threshold line (e.g. green dashed line at $5.0"$ or $120\text{s}$).

---

## 8. LocalStorage State Persistence & Data Schema

### 8.1 Schema Architecture & Versioning
To guarantee zero data loss during workouts, all state mutations persist to `window.localStorage` under versioned namespaces (`v1`).

```typescript
export interface AppStorageSchema {
  version: number; // 1
  activeSession: ActiveWorkoutSession | null;
  workoutHistory: CompletedWorkout[];
  mobilityHistory: MobilityRecord[];
  preferences: UserPreferences;
}

export interface ActiveWorkoutSession {
  sessionId: 'lower_a' | 'upper_a' | 'lower_b' | 'upper_b';
  startTime: string; // ISO 8601
  lastUpdated: string;
  exercises: {
    [exerciseId: string]: {
      completedSets: boolean[];
      loggedReps: number[];
      loggedWeight: number[];
      notes?: string;
    }
  };
}

export interface CompletedWorkout {
  id: string;
  sessionId: 'lower_a' | 'upper_a' | 'lower_b' | 'upper_b';
  sessionName: string;
  date: string;
  durationMinutes: number;
  totalVolumeLbs: number;
  exercisesCompleted: number;
  totalExercises: number;
  notes?: string;
}

export interface UserPreferences {
  soundEnabled: boolean;
  soundVolume: number; // 0.0 to 1.0
  vibrationEnabled: boolean;
  defaultBarWeight: number; // 45
  unit: 'lbs';
  darkMode: boolean;
}
```

### 8.2 Resilience & Debounce Engine
- **Debounced Writes**: State changes (e.g. typing weight or reps) debounce writes by $300\text{ms}$ to prevent storage thrashing. Checkbox toggles trigger immediate synchronous writes.
- **Corrupt Storage Fallback**: If `JSON.parse()` fails (e.g. quota exceeded or storage corrupted), the storage manager preserves raw text to a recovery key and initializes a clean schema without throwing runtime errors.
- **JSON Export / Import**: A one-click backup button enables users to download their entire training history and mobility records as a `.json` file and restore it on any device.

---

## 9. Component & Module Architecture

### 9.1 Module Boundaries (Clean Separation of Concerns)

```
C:\Users\lagoo\.gemini\antigravity\scratch\workout_program\
├── src/
│   ├── domain/               # PURE LOGIC (Zero DOM/UI dependencies, 100% testable)
│   │   ├── plate-calculator.ts    # Exact 128-state subset-sum algorithm
│   │   ├── timer-machine.ts       # FSM for countdown timer logic
│   │   ├── tempo-machine.ts       # Marcus Filly 4-digit cadence generator
│   │   ├── workout-data.ts        # 4-Day Upper/Lower routines & exercise definitions
│   │   └── mobility-data.ts       # 5 assessment definitions & benchmarks
│   │
│   ├── services/             # BROWSER SERVICES (Web APIs)
│   │   ├── sound-engine.ts        # Web Audio API oscillator synthesis
│   │   ├── storage-service.ts     # LocalStorage persistence & schema migrations
│   │   └── worker-timer.ts        # Background-proof Blob Web Worker
│   │
│   ├── components/           # REACT UI COMPONENTS
│   │   ├── common/
│   │   │   ├── Header.tsx         # App bar, session selector, quick links
│   │   │   ├── Modal.tsx          # Accessible modal dialog wrapper
│   │   │   └── TabNav.tsx         # Workout vs Mobility vs History tabs
│   │   ├── workout/
│   │   │   ├── RoutineNavigator.tsx # Switch between Lower A, Upper A, Lower B, Upper B
│   │   │   ├── ExerciseCard.tsx     # Exercise details, tier badge, cue cards
│   │   │   ├── SetTrackerTable.tsx  # Interactive sets, reps, weight inputs, checks
│   │   │   └── CueCardDrawer.tsx    # Expandable form & rehab cues (8 creators)
│   │   ├── timer/
│   │   │   ├── TimerModal.tsx       # Rest countdown overlay or floating bar
│   │   │   ├── CircularProgress.tsx # SVG circular animated countdown ring
│   │   │   └── PresetButtons.tsx    # 15s, 30s, 60s, 90s, 2m, 3m, 5m presets
│   │   ├── metronome/
│   │   │   ├── TempoModal.tsx       # Marcus Filly 30X1 interactive metronome
│   │   │   └── VisualPacer.tsx      # Contracting/expanding visual ring
│   │   ├── calculator/
│   │   │   ├── PlateModal.tsx       # Barbell weight input & calculation
│   │   │   └── BarbellVisual.tsx    # SVG rendering of loaded barbell sleeve
│   │   └── mobility/
│   │       ├── MobilityTracker.tsx  # 5 test assessment dashboard
│   │       ├── TestLoggerModal.tsx  # Log new test entry
│   │       └── SparklineChart.tsx   # SVG progress trend visualization
│   │
│   ├── styles/
│   │   └── index.css          # Tailwind directives & custom CSS variables
│   │
│   ├── App.tsx               # Root application coordinator
│   └── main.tsx              # DOM entry point
│
├── tests/
│   ├── unit/
│   │   ├── plate-calculator.test.ts # Exhaustive tests for all weights (45-300 lbs)
│   │   ├── timer-machine.test.ts    # FSM state transition & delta tests
│   │   ├── tempo-machine.test.ts    # Tempo cadence & phase progression
│   │   └── storage-service.test.ts  # Persistence & migration verification
│   └── components/
│       ├── RoutineNavigator.test.tsx
│       ├── SetTracker.test.tsx
│       └── MobilityTracker.test.tsx
│
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

---

## 10. Summary & Handoff Readiness

1. **Architecture Defined**: Vite + React 19 + TypeScript + Tailwind CSS delivers optimal responsiveness, zero runtime friction, and full testability.
2. **Audio Engine Solved**: Web Audio API generates all ticks, warning pings, and completion chimes with zero external sound files.
3. **Timer Drift Eliminated**: High-precision timestamp deltas combined with inline Blob Web Workers ensure continuous timing even during background tab throttling.
4. **Plate Loading Corrected**: Replaced flawed greedy coin-change heuristic with an exact 128-state subset-sum search algorithm, achieving 100% mathematical optimality for the user's specific plate inventory (2x45, 2x35, 2x25, 2x10, 4x5, 2x2.5 lbs).
5. **Mobility Tracking Structured**: Fully specified data schema, clinical benchmarks, and SVG progress visualization for the 5 targeted flexibility assessments.
6. **Persistence Ready**: LocalStorage schema with auto-save, debounce, corrupt-data fallback, and JSON export/import.
