# Project: 4-Day Upper/Lower Workout Web Application

## Architecture
A high-performance, responsive, zero-external-media web application built with React 19, TypeScript, Tailwind CSS, and Vitest. The application runs entirely client-side, using the Web Audio API for audio synthesis (eliminating external audio asset loading failures) and LocalStorage for state persistence.

### Data Flow & Module Architecture
```
┌────────────────────────────────────────────────────────────────────────┐
│                          User Interface (React)                        │
│ ┌──────────────┐ ┌───────────────┐ ┌──────────────┐ ┌────────────────┐ │
│ │ Session Nav  │ │ Routine View  │ │ Cue Cards    │ │ Plate Calc UI  │ │
│ └──────────────┘ └───────────────┘ └──────────────┘ └────────────────┘ │
│ ┌──────────────┐ ┌───────────────┐ ┌──────────────┐ ┌────────────────┐ │
│ │ Rest Timer UI│ │ Metronome UI  │ │ Set/Rep Logs │ │ Mobility View  │ │
│ └──────┬───────┘ └───────┬───────┘ └──────┬───────┘ └───────┬────────┘ │
└────────┼─────────────────┼────────────────┼─────────────────┼──────────┘
         │                 │                │                 │
┌────────▼─────────────────▼────────┐ ┌─────▼─────────────────▼──────────┐
│      Interactive Engines          │ │      Persistence & State         │
│ - RestTimerEngine (Worker/Delta)  │ │ - LocalStorage Manager (v1 deb.) │
│ - TempoMetronome (Marcus Filly)   │ │ - WorkoutStateStore              │
│ - WebAudioSynthesizer (Osc/Gain)  │ │ - MobilityHistoryStore           │
└───────────────────────────────────┘ └──────────────────────────────────┘
         │                                  │
┌────────▼──────────────────────────────────▼────────────────────────────┐
│                       Core Domain Logic & Data                         │
│ - WorkoutProgramData (Lower A, Upper A, Lower B, Upper B)              │
│ - Creator Cue Encyclopedia (8 Creators + McGill)                       │
│ - BarbellPlateCalculator (Optimal 128-state subset-sum algorithm)      │
│ - MobilityProtocolDefinitions (5 Clinically-backed assessments)        │
└────────────────────────────────────────────────────────────────────────┘
```

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | Multi-Creator Biomechanics Synthesis | 4-Day GZCL routine (Lower A, Upper A, Lower B, Upper B) incorporating all 8 creators + McGill | M1 | Survey 1 |
| F2 | Knee Tendinitis Protocols | Backward walking/sled, tibialis raises, Patrick step-downs, ATG split squat regressions, 3-4s eccentrics | M1 | Survey 1 |
| F3 | Posterior Chain Pre-Fatigue | Eugene Teo calf/hamstring pre-fatigue, ATG elephant walks, Alyssa Lu hip resets prior to squat loading | M1 | Survey 1 |
| F4 | Creator Cue Cards Encyclopedia | 13 detailed cue cards covering Squat U 360 brace, Eugene Teo line-of-pull, Athlean-X scapular depression, etc. | M1 | Survey 1 |
| F5 | Barbell Plate Loading Algorithm | Optimal 128-state subset-sum solving exact plate counts for 45-300 lbs across user's inventory (no greedy flaws) | M1 | Survey 2 & 3 |
| F6 | Web Audio API Sound Synthesizer | Procedural ticks (880Hz), warning pings (1200Hz), and dual-harmonic completion chimes (587/880Hz) | M2 | Survey 2 |
| F7 | Rest Interval Countdown Timer Engine | Multi-tier presets (15-30s, 60-90s, 2-3m, 3-5m), SVG circular ring, drift-free timestamp delta + worker | M2 | Survey 2 |
| F8 | Marcus Filly Tempo Metronome | 4-digit tempo cadence engine (e.g. 30X1) with visual ring/phase pacing and synchronized audio pings | M2 | Survey 2 |
| F9 | Routine Navigator & Session Selector | Clean switching between Lower A, Upper A, Lower B, Upper B with exercise details, rationale, and target muscles | M3 | Survey 2 |
| F10 | Set & Rep Tracker | Interactive logging of completed sets, target/actual reps, loads used, and RPE/RIR | M3 | Survey 2 |
| F11 | Mobility & Flexibility Tracker | Logging and progress tracking for Elephant Walks, Knee-to-Wall, Split Squats, Biering-Sørensen, Dead Hang | M3 | Survey 1 & 2 |
| F12 | Mobility Progress Visualization | Zero-dependency SVG sparkline charts displaying trend metrics over time | M3 | Survey 2 |
| F13 | LocalStorage Persistence & Backup | Auto-debounced state persistence, corrupted-state fallback, and JSON export/import | M3 | Survey 2 |
| F14 | Responsive Mobile-First Layout | Adaptive UI with zero truncation, high contrast, dark mode aesthetics, and touch-friendly controls | M3 | Survey 2 |
| F15 | Comprehensive E2E Verification | 100% pass of 4-tier test suite (Tiers 1-4) plus Tier 5 adversarial hardening | M4 | Survey 3 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Core Domain Models & Algorithms | Project setup (Vite, TS, Tailwind), program data models, plate math algorithm, cue encyclopedia, mobility specs | none | DONE |
| M2 | Audio Engine & Interactive Timers | Web Audio API synthesizer, drift-free Rest Timer engine, Marcus Filly tempo metronome engine | M1 | DONE |
| M3 | Full UI, Navigation, Trackers & Storage | Session views, cue cards UI, set/rep logging, plate calc UI, mobility tracker with SVG sparklines, LocalStorage | M1, M2 | DONE |
| M4 | Final Milestone: 100% Test Pass & Hardening | Dual-track integration, 100% pass of Tiers 1-4 tests, Tier 5 adversarial stress testing | M1, M2, M3 | DONE |

## Interface Contracts

### 1. Plate Calculator Contract (`src/domain/plateCalculator.ts`)
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
  platesPerSide: number[]; // e.g. [45, 35]
  achievableWeight: number;
  isExact: boolean;
  totalPlatesUsed: number;
  remainder: number;
}

export function calculatePlates(targetWeight: number, inventory?: PlateInventory): PlateCalculationResult;
```

### 2. Audio Engine Contract (`src/audio/audioSynthesizer.ts`)
```typescript
export type AudioToneType = 'tick' | 'warning' | 'completion' | 'tempo-eccentric' | 'tempo-pause' | 'tempo-concentric';

export interface IAudioSynthesizer {
  init(): Promise<void>;
  playTone(type: AudioToneType): void;
  setMuted(muted: boolean): void;
  isMuted(): boolean;
}
```

### 3. Rest Timer Contract (`src/timer/restTimer.ts`)
```typescript
export type TimerState = 'IDLE' | 'RUNNING' | 'PAUSED' | 'COMPLETED';

export interface TimerSnapshot {
  state: TimerState;
  durationSeconds: number;
  remainingSeconds: number;
  progressRatio: number; // 0.0 to 1.0
}

export interface IRestTimer {
  start(durationSeconds: number): void;
  pause(): void;
  resume(): void;
  reset(): void;
  subscribe(listener: (snapshot: TimerSnapshot) => void): () => void;
  destroy(): void;
}
```

### 4. Tempo Metronome Contract (`src/timer/tempoMetronome.ts`)
```typescript
export type TempoPhase = 'eccentric' | 'pauseBottom' | 'concentric' | 'pauseTop';

export interface TempoParsed {
  eccentric: number;
  pauseBottom: number;
  concentric: number; // explosive 'X' treated as 1s active drive
  pauseTop: number;
  totalDuration: number;
}

export interface MetronomeSnapshot {
  isRunning: boolean;
  tempo: string; // e.g. "30X1"
  currentPhase: TempoPhase;
  phaseRemainingSeconds: number;
  phaseTotalSeconds: number;
  currentRep: number;
}
```

### 5. Mobility Tracker Contract (`src/domain/mobility.ts`)
```typescript
export type MobilityTestId = 'elephant-walk' | 'knee-to-wall' | 'split-squat-elevation' | 'biering-sorensen' | 'dead-hang';

export interface MobilityEntry {
  id: string;
  testId: MobilityTestId;
  date: string; // ISO
  value: number; // metric (e.g. inches, seconds, tier 1-5)
  notes?: string;
}

export interface MobilitySummary {
  testId: MobilityTestId;
  name: string;
  creator: string;
  unit: string;
  targetBenchmark: string;
  latestValue: number | null;
  history: MobilityEntry[];
}
```

### 6. Storage Contract (`src/storage/storageManager.ts`)
```typescript
export interface AppStorageData {
  version: 1;
  activeSessionId: string;
  completedWorkouts: Record<string, { date: string; logs: Record<string, any> }>;
  currentLogs: Record<string, { completed: boolean; weight: number; reps: number; notes: string }>;
  mobilityHistory: MobilityEntry[];
  settings: { soundEnabled: boolean; defaultTimerPreset: number };
}
```

## Code Layout
```
C:\Users\lagoo\.gemini\antigravity\scratch\workout_program\
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── index.html
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css
│   ├── domain/
│   │   ├── programData.ts        # Lower A, Upper A, Lower B, Upper B data
│   │   ├── cueCardsData.ts       # Creator cue cards encyclopedia
│   │   ├── plateCalculator.ts    # 128-state optimal plate math
│   │   └── mobility.ts           # 5 Mobility protocols & metric types
│   ├── timer/
│   │   ├── restTimer.ts          # Drift-free rest timer engine
│   │   └── tempoMetronome.ts     # Marcus Filly tempo metronome
│   ├── audio/
│   │   └── audioSynthesizer.ts   # Web Audio API procedural sound engine
│   ├── storage/
│   │   └── storageManager.ts     # LocalStorage v1 manager with debounce
│   └── components/
│       ├── Header.tsx
│       ├── SessionNav.tsx
│       ├── ExerciseCard.tsx
│       ├── CueCardModal.tsx
│       ├── RestTimerWidget.tsx
│       ├── TempoMetronomeWidget.tsx
│       ├── PlateCalculatorWidget.tsx
│       ├── MobilityTrackerWidget.tsx
│       └── SparklineChart.tsx
└── tests/
    ├── setup.ts
    ├── domain/
    │   ├── plateCalculator.test.ts
    │   ├── programData.test.ts
    │   └── mobility.test.ts
    ├── timer/
    │   ├── restTimer.test.ts
    │   └── tempoMetronome.test.ts
    ├── audio/
    │   └── audioSynthesizer.test.ts
    ├── storage/
    │   └── storageManager.test.ts
    └── e2e/
        ├── tier1_features.test.tsx
        ├── tier2_boundaries.test.tsx
        ├── tier3_combinations.test.tsx
        └── tier4_application.test.tsx
```
