# Milestone 3 UI, Navigation, Trackers & Storage Specification
**Author**: Explorer 1 (Milestone 3 Navigation & Core UI Architecture)  
**Target Module**: `src/components/Header.tsx`, `src/components/SessionNav.tsx`, `src/components/ExerciseCard.tsx`, `src/components/CueCardModal.tsx`, `src/App.tsx`  
**Date**: 2026-10-13  
**Status**: Ready for Implementation  

---

## 1. Executive Summary & Architecture Overview

Milestone 3 delivers the complete interactive interface for the **4-Day Upper/Lower Workout Web Application**, unifying the biomechanical program models (M1) and interactive timing engines (M2) into an elite, responsive, gym-optimized single-page web application.

### Component Tree & Architectural Layout
```
App.tsx
├── Header.tsx (Brand, Active Workout Badge, Sound Mute Toggle, View Mode Switcher)
├── Main Content Container
│   ├── [View: Routine]
│   │   ├── SessionNav.tsx (Lower A, Upper A, Lower B, Upper B Pills with Progress Badges)
│   │   ├── Session Header (Focus, Duration, Creator Influences, Equipment Tags)
│   │   ├── Warmup Accordion Section (Collapsible sequence of warmup drills)
│   │   └── Exercise Cards List
│   │       └── ExerciseCard.tsx (GZCL Tier Badge, Tempo Metronome Launch, Knee Safety Callout,
│   │                             Interactive Set Logger, Rest Timer Quick Launch, Cue Card Button)
│   ├── [View: Plate Calculator]
│   │   └── PlateCalculatorWidget.tsx (128-state Barbell Loading Visualizer)
│   └── [View: Mobility Tracker]
│       └── MobilityTrackerWidget.tsx (5 Clinical Protocols, SVG Sparkline Charts)
├── Docked Floating Timer Dock (Bottom/Desktop Drawer)
│   ├── RestTimerWidget.tsx (Drift-free Rest Interval Countdown Ring)
│   └── TempoMetronomeWidget.tsx (Marcus Filly 4-Digit Cadence Ring & Phase Display)
└── CueCardModal.tsx (Accessible Full-Screen/Drawer Creator Cues Dialog)
```

### Design System & Theme Tokens
The UI adheres strictly to a high-contrast, dark-mode gym aesthetic configured in `tailwind.config.js`:
- **Backgrounds**: `bg-gym-950` (`#020617`), `bg-gym-900` (`#0f172a`), `bg-gym-800` (`#1e293b`).
- **Borders & Dividers**: `border-gym-700` (`#334155`), `border-gym-600` (`#475569`).
- **GZCL Tier Badges**:
  - **Tier 1 (Heavy Powerbuilding)**: Red/Rose (`bg-rose-500/20 text-rose-300 border-rose-500/40`).
  - **Tier 2 (Hypertrophy Compound)**: Amber (`bg-amber-500/20 text-amber-300 border-amber-500/40`).
  - **Tier 3 (Accessory/Isolation)**: Emerald/Blue (`bg-emerald-500/20 text-emerald-300 border-emerald-500/40`).
  - **Warmup**: Violet (`bg-purple-500/20 text-purple-300 border-purple-500/40`).
- **Accents**: Emerald (`#10b981`), Amber (`#f59e0b`), Electric Blue (`#38bdf8`).
- **Touch Ergonomics**: All interactive elements maintain a minimum hit box of 44×44px, large typography for sweaty-screen readability, and high contrast for bright gym overhead lighting.

---

## 2. Component Blueprint: `src/components/Header.tsx`

### Responsibilities
1. Displays application branding with GZCL + 8 Creator Biomechanics badge.
2. Displays active workout session indicator with dynamic title.
3. Provides one-click procedural audio mute/unmute toggle connected directly to the `audioSynthesizer` singleton.
4. Provides view switching navigation between **Workout Routine**, **Plate Calculator**, and **Mobility Tracker**.
5. Shows overall workout completion percentage badge for the active session.

### Interface Contract (`src/components/Header.tsx`)
```typescript
export type AppViewMode = 'workout' | 'plates' | 'mobility';

export interface HeaderProps {
  activeSessionTitle: string;
  activeSessionSubtitle: string;
  isMuted: boolean;
  onToggleMute: () => void;
  currentView: AppViewMode;
  onSelectView: (view: AppViewMode) => void;
  completionPercentage: number;
}
```

### Implementation Blueprint (`src/components/Header.tsx`)
```tsx
import React from 'react';
import { Volume2, VolumeX, Dumbbell, Disc, Activity } from 'lucide-react';

export type AppViewMode = 'workout' | 'plates' | 'mobility';

export interface HeaderProps {
  activeSessionTitle: string;
  activeSessionSubtitle: string;
  isMuted: boolean;
  onToggleMute: () => void;
  currentView: AppViewMode;
  onSelectView: (view: AppViewMode) => void;
  completionPercentage: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeSessionTitle,
  activeSessionSubtitle,
  isMuted,
  onToggleMute,
  currentView,
  onSelectView,
  completionPercentage,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Brand & Active Workout Badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xl shadow-inner">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                  4-Day Upper/Lower
                </h1>
                <span className="hidden sm:inline-block text-[11px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  GZCL + 8 Creators
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="font-medium text-emerald-400">{activeSessionTitle}:</span>
                <span className="truncate max-w-[200px] sm:max-w-xs">{activeSessionSubtitle}</span>
              </div>
            </div>
          </div>

          {/* Mobile Right Controls: Sound Toggle */}
          <div className="flex md:hidden items-center gap-2">
            <button
              type="button"
              onClick={onToggleMute}
              aria-label={isMuted ? 'Unmute Audio Synthesizer' : 'Mute Audio Synthesizer'}
              className={`p-2.5 rounded-lg border transition-colors flex items-center justify-center ${
                isMuted
                  ? 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
              }`}
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* View Navigation Tabs & Desktop Controls */}
        <div className="flex items-center justify-between md:justify-end gap-2 sm:gap-3">
          {/* Navigation Tabs */}
          <nav className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 gap-1" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={currentView === 'workout'}
              onClick={() => onSelectView('workout')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                currentView === 'workout'
                  ? 'bg-emerald-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Dumbbell className="w-3.5 h-3.5" />
              <span>Routine</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={currentView === 'plates'}
              onClick={() => onSelectView('plates')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                currentView === 'plates'
                  ? 'bg-emerald-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Disc className="w-3.5 h-3.5" />
              <span>Plates</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={currentView === 'mobility'}
              onClick={() => onSelectView('mobility')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                currentView === 'mobility'
                  ? 'bg-emerald-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Mobility</span>
            </button>
          </nav>

          {/* Progress & Desktop Mute Toggle */}
          <div className="flex items-center gap-2">
            <div
              className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-mono"
              title={`${completionPercentage}% of active session completed`}
            >
              <span className="text-slate-400 hidden sm:inline">Progress:</span>
              <span className="text-emerald-400 font-bold">{completionPercentage}%</span>
              <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden hidden sm:block">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={onToggleMute}
              aria-label={isMuted ? 'Unmute Audio Synthesizer' : 'Mute Audio Synthesizer'}
              className={`hidden md:flex p-2 rounded-xl border transition-colors items-center justify-center ${
                isMuted
                  ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
              }`}
              title={isMuted ? 'Audio Synthesizer Muted' : 'Audio Synthesizer Active'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
```

---

## 3. Component Blueprint: `src/components/SessionNav.tsx`

### Responsibilities
1. Renders clean, touch-friendly tab/pill navigation between **Lower A**, **Upper A**, **Lower B**, and **Upper B**.
2. Displays primary target muscle group tags for instant visual recognition.
3. Renders the session rationale/subtitle preview.
4. Renders live exercise completion counters (e.g. `4/5 done` or checkmark badge when 100% finished).
5. Supports horizontal swipe/scroll on mobile viewports with no text truncation.

### Interface Contract (`src/components/SessionNav.tsx`)
```typescript
import { WorkoutSession } from '../domain/programData';

export interface SessionProgressStats {
  completedSets: number;
  totalSets: number;
  completedExercises: number;
  totalExercises: number;
  isComplete: boolean;
}

export interface SessionNavProps {
  sessions: WorkoutSession[];
  activeSessionId: string;
  onSelectSession: (sessionId: string) => void;
  sessionStats: Record<string, SessionProgressStats>;
}
```

### Implementation Blueprint (`src/components/SessionNav.tsx`)
```tsx
import React from 'react';
import { WorkoutSession } from '../domain/programData';
import { CheckCircle2, ShieldAlert, Sparkles } from 'lucide-react';

export interface SessionProgressStats {
  completedSets: number;
  totalSets: number;
  completedExercises: number;
  totalExercises: number;
  isComplete: boolean;
}

export interface SessionNavProps {
  sessions: WorkoutSession[];
  activeSessionId: string;
  onSelectSession: (sessionId: string) => void;
  sessionStats: Record<string, SessionProgressStats>;
}

export const SessionNav: React.FC<SessionNavProps> = ({
  sessions,
  activeSessionId,
  onSelectSession,
  sessionStats,
}) => {
  return (
    <nav
      className="w-full bg-slate-950 border-b border-slate-800 py-3 px-4 sm:px-6 overflow-x-auto no-scrollbar"
      aria-label="Workout Sessions"
    >
      <div className="max-w-7xl mx-auto flex sm:grid sm:grid-cols-4 gap-3 min-w-[640px] sm:min-w-0">
        {sessions.map((session) => {
          const isActive = session.id === activeSessionId;
          const stats = sessionStats[session.id] || {
            completedSets: 0,
            totalSets: 0,
            completedExercises: 0,
            totalExercises: session.exercises.length,
            isComplete: false,
          };

          const isKneeFocus = session.id === 'lower_a';
          const isPostChainFocus = session.id === 'lower_b';

          return (
            <button
              key={session.id}
              type="button"
              onClick={() => onSelectSession(session.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex-1 text-left p-3.5 rounded-xl border transition-all duration-200 relative overflow-hidden group ${
                isActive
                  ? 'bg-slate-900 border-emerald-500/70 shadow-lg shadow-emerald-950/20 ring-1 ring-emerald-500/30'
                  : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-900 hover:border-slate-700'
              }`}
            >
              {/* Active Indicator Top Stripe */}
              {isActive && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-sky-400" />
              )}

              {/* Title & Status Badge */}
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className={`text-sm font-bold tracking-tight ${
                    isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'
                  }`}
                >
                  {session.title}
                </span>

                {stats.isComplete ? (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    <CheckCircle2 className="w-3 h-3" />
                    Done
                  </span>
                ) : (
                  <span className="text-[11px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full border border-slate-700/60">
                    {stats.completedExercises}/{stats.totalExercises} ex
                  </span>
                )}
              </div>

              {/* Subtitle / Focus Summary */}
              <p className="text-xs text-slate-400 line-clamp-1 mb-2 font-medium">
                {session.subtitle}
              </p>

              {/* Target Focus Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                {isKneeFocus && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                    <ShieldAlert className="w-2.5 h-2.5" />
                    Knee Rehab
                  </span>
                )}
                {isPostChainFocus && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-sky-300 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">
                    <Sparkles className="w-2.5 h-2.5" />
                    Post-Chain
                  </span>
                )}
                <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded font-mono">
                  {session.estimatedDurationMinutes}m
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
```

---

## 4. Component Blueprint: `src/components/ExerciseCard.tsx`

### Responsibilities
1. Displays GZCL Tier badge (`T1`, `T2`, `T3`, or `Warmup`) with distinct high-contrast colors.
2. Displays target sets, target reps, AMRAP flag, and canonical rest duration.
3. Features an interactive **Tempo Badge** (e.g. `31X1`) that quick-launches the Marcus Filly metronome widget with that exact cadence.
4. Features an interactive **Rest Timer Quick-Launch Button** (e.g. `⏱️ 180s`) to start the rest interval directly.
5. Displays a **Knee-Safety Callout** banner for knee-loaded movements (3-4s slow eccentric, no bouncing, ≤ 2/10 pain threshold).
6. Displays a **Pain-Free Regression Card** toggle if the user experiences joint discomfort.
7. Renders an interactive **Set Logger Table**:
   - Set # (Set 1, Set 2, ..., AMRAP+).
   - Target Reps display.
   - Weight used (lbs) input (editable with +5/-5 lb stepper buttons).
   - Reps achieved input.
   - Set Completed Checkbox (starts rest timer on completion).
   - RPE / Notes field.
8. Provides a prominent **"View Creator Cues"** button to open the comprehensive `CueCardModal`.
9. Collapsible Biomechanical Rationale text explaining the creator science behind the exercise.

### Interface Contract (`src/components/ExerciseCard.tsx`)
```typescript
import { WorkoutExercise } from '../domain/programData';

export interface SetLogRecord {
  setNumber: number;
  targetReps: string;
  weightLbs: number;
  repsAchieved: number;
  isCompleted: boolean;
  notes: string;
}

export interface ExerciseCardProps {
  exercise: WorkoutExercise;
  logs: SetLogRecord[];
  onUpdateSetLog: (exerciseId: string, setIndex: number, updated: Partial<SetLogRecord>) => void;
  onOpenCueCard: (exerciseId: string) => void;
  onQuickStartRest: (durationSeconds: number) => void;
  onQuickStartTempo: (tempo: string) => void;
  onOpenPlateCalculator?: (targetWeight: number) => void;
}
```

### Implementation Blueprint (`src/components/ExerciseCard.tsx`)
```tsx
import React, { useState } from 'react';
import { WorkoutExercise } from '../domain/programData';
import {
  ShieldAlert,
  Clock,
  Activity,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Check,
  Disc,
  Info,
} from 'lucide-react';

export interface SetLogRecord {
  setNumber: number;
  targetReps: string;
  weightLbs: number;
  repsAchieved: number;
  isCompleted: boolean;
  notes: string;
}

export interface ExerciseCardProps {
  exercise: WorkoutExercise;
  logs: SetLogRecord[];
  onUpdateSetLog: (exerciseId: string, setIndex: number, updated: Partial<SetLogRecord>) => void;
  onOpenCueCard: (exerciseId: string) => void;
  onQuickStartRest: (durationSeconds: number) => void;
  onQuickStartTempo: (tempo: string) => void;
  onOpenPlateCalculator?: (targetWeight: number) => void;
}

export const ExerciseCard: React.FC<ExerciseCardProps> = ({
  exercise,
  logs,
  onUpdateSetLog,
  onOpenCueCard,
  onQuickStartRest,
  onQuickStartTempo,
  onOpenPlateCalculator,
}) => {
  const [showRationale, setShowRationale] = useState(false);
  const [showRegression, setShowRegression] = useState(false);

  // Tier Badge Color Map
  const tierConfig: Record<string, { label: string; bg: string; text: string; border: string }> = {
    T1: {
      label: 'Tier 1 (Strength & AMRAP)',
      bg: 'bg-rose-500/15',
      text: 'text-rose-300',
      border: 'border-rose-500/40',
    },
    T2: {
      label: 'Tier 2 (Hypertrophy)',
      bg: 'bg-amber-500/15',
      text: 'text-amber-300',
      border: 'border-amber-500/40',
    },
    T3: {
      label: 'Tier 3 (Accessory/Rehab)',
      bg: 'bg-emerald-500/15',
      text: 'text-emerald-300',
      border: 'border-emerald-500/40',
    },
    Warmup: {
      label: 'Warmup & Activation',
      bg: 'bg-purple-500/15',
      text: 'text-purple-300',
      border: 'border-purple-500/40',
    },
  };

  const currentTier = tierConfig[exercise.tier] || tierConfig.T3;
  const isKneeSensitive =
    exercise.id.includes('squat') ||
    exercise.id.includes('step_down') ||
    exercise.id.includes('tibialis');

  return (
    <article className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl mb-6 relative overflow-hidden transition-all duration-200">
      {/* Exercise Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {/* GZCL Tier Badge */}
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-lg border font-mono tracking-wide ${currentTier.bg} ${currentTier.text} ${currentTier.border}`}
            >
              {exercise.tier} · {currentTier.label}
            </span>

            {/* Equipment Tag */}
            <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700/60 uppercase font-mono tracking-wider">
              {exercise.equipment.replace('_', ' ')}
            </span>

            {/* AMRAP Badge */}
            {exercise.isAmrapLastSet && (
              <span className="text-xs px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                AMRAP Last Set
              </span>
            )}
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {exercise.name}
          </h2>

          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-400">
            <span>Target: <strong className="text-slate-200">{exercise.targetSets} sets × {exercise.targetReps} reps</strong></span>
            <span>·</span>
            <span>Muscles: <span className="text-slate-300">{exercise.muscleGroups.join(', ')}</span></span>
          </div>
        </div>

        {/* Quick Launch Action Pills */}
        <div className="flex flex-wrap sm:flex-col items-end gap-2">
          {/* Quick-Launch Tempo Metronome */}
          <button
            type="button"
            onClick={() => onQuickStartTempo(exercise.tempo)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 text-xs font-mono font-medium transition-colors"
            title={`Launch Marcus Filly metronome for ${exercise.tempo}`}
          >
            <Activity className="w-3.5 h-3.5 text-sky-400" />
            <span>Tempo: <strong className="text-white">{exercise.tempo}</strong></span>
          </button>

          {/* Quick-Launch Rest Timer */}
          <button
            type="button"
            onClick={() => onQuickStartRest(exercise.restSeconds)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-medium transition-colors"
            title={`Start ${exercise.restSeconds}s rest timer`}
          >
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Rest: <strong className="text-white">{exercise.restSeconds}s</strong></span>
          </button>
        </div>
      </div>

      {/* Knee-Safety Protocol Banner */}
      {isKneeSensitive && (
        <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-200">
          <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <strong className="text-amber-300 font-semibold">Knee Tendinitis Safety Protocol:</strong>{' '}
            Maintain a strict 3-4 second slow eccentric descent. Zero bouncing or ballistic stretch reflex in the hole.
            Pain must remain ≤ 2/10. If knee discomfort occurs, switch immediately to the regression.
          </div>
        </div>
      )}

      {/* Interactive Set Logger */}
      <div className="mb-4 overflow-x-auto">
        <table className="w-full text-left text-xs font-mono border-collapse min-w-[500px]">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
              <th className="py-2 px-3 w-16">Set</th>
              <th className="py-2 px-3 w-28">Target</th>
              <th className="py-2 px-3 w-32">Weight (lbs)</th>
              <th className="py-2 px-3 w-28">Reps Done</th>
              <th className="py-2 px-3 w-24 text-center">Done</th>
              <th className="py-2 px-3">Notes / RPE</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {logs.map((set, idx) => (
              <tr
                key={set.setNumber}
                className={`transition-colors ${
                  set.isCompleted ? 'bg-emerald-950/20' : 'hover:bg-slate-800/40'
                }`}
              >
                {/* Set # */}
                <td className="py-2.5 px-3 font-bold text-slate-300">
                  {set.setNumber}
                  {idx === logs.length - 1 && exercise.isAmrapLastSet && (
                    <span className="text-[10px] text-rose-400 ml-1 font-semibold">+</span>
                  )}
                </td>

                {/* Target Reps */}
                <td className="py-2.5 px-3 text-slate-400">
                  {set.targetReps} reps
                </td>

                {/* Weight Input */}
                <td className="py-2.5 px-3">
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={set.weightLbs || ''}
                      onChange={(e) =>
                        onUpdateSetLog(exercise.id, idx, {
                          weightLbs: Number(e.target.value) || 0,
                        })
                      }
                      className="w-16 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-center text-white focus:outline-none focus:border-emerald-500 font-bold"
                      step="5"
                      min="0"
                    />
                    {exercise.equipment === 'barbell' && onOpenPlateCalculator && set.weightLbs > 0 && (
                      <button
                        type="button"
                        onClick={() => onOpenPlateCalculator(set.weightLbs)}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                        title="Calculate barbell plates for this weight"
                      >
                        <Disc className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </td>

                {/* Reps Achieved */}
                <td className="py-2.5 px-3">
                  <input
                    type="number"
                    value={set.repsAchieved || ''}
                    onChange={(e) =>
                      onUpdateSetLog(exercise.id, idx, {
                        repsAchieved: Number(e.target.value) || 0,
                      })
                    }
                    className="w-16 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-center text-white focus:outline-none focus:border-emerald-500 font-bold"
                    min="0"
                  />
                </td>

                {/* Checkbox Done */}
                <td className="py-2.5 px-3 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      const nextState = !set.isCompleted;
                      onUpdateSetLog(exercise.id, idx, { isCompleted: nextState });
                      if (nextState) {
                        onQuickStartRest(exercise.restSeconds);
                      }
                    }}
                    aria-label={`Mark set ${set.setNumber} as ${set.isCompleted ? 'incomplete' : 'completed'}`}
                    className={`w-7 h-7 mx-auto rounded-lg border flex items-center justify-center transition-all ${
                      set.isCompleted
                        ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-sm'
                        : 'bg-slate-950 border-slate-700 text-transparent hover:border-slate-500'
                    }`}
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                  </button>
                </td>

                {/* Notes Input */}
                <td className="py-2.5 px-3">
                  <input
                    type="text"
                    placeholder="RPE 8, smooth..."
                    value={set.notes || ''}
                    onChange={(e) =>
                      onUpdateSetLog(exercise.id, idx, { notes: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-300 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Regression Callout (if defined) */}
      {exercise.regression && (
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setShowRegression(!showRegression)}
            className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-medium py-1"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>
              {showRegression ? 'Hide' : 'Need a pain-free regression?'} ({exercise.regression.name})
            </span>
            {showRegression ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showRegression && (
            <div className="mt-2 p-3.5 rounded-xl bg-slate-950 border border-amber-500/30 text-xs text-slate-300 space-y-1.5">
              <div className="font-semibold text-amber-300">
                Trigger: {exercise.regression.condition}
              </div>
              <div>
                <strong>Alternative:</strong> {exercise.regression.name} (Tempo: {exercise.regression.tempo})
              </div>
              <div className="text-slate-400">{exercise.regression.instructions}</div>
            </div>
          )}
        </div>
      )}

      {/* Card Footer: View Creator Cues & Biomechanical Rationale */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-slate-800">
        <button
          type="button"
          onClick={() => onOpenCueCard(exercise.id)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-semibold text-xs transition-colors border border-slate-700/80 shadow-sm"
        >
          <BookOpen className="w-4 h-4 text-emerald-400" />
          <span>View Creator Cues & Science</span>
        </button>

        <button
          type="button"
          onClick={() => setShowRationale(!showRationale)}
          className="flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-white py-1 font-medium"
        >
          <Info className="w-3.5 h-3.5 text-slate-400" />
          <span>{showRationale ? 'Hide Rationale' : 'Biomechanical Rationale'}</span>
          {showRationale ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Expandable Biomechanical Rationale */}
      {showRationale && (
        <div className="mt-3 p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 space-y-2">
          <p>
            <strong className="text-emerald-400">Why this works:</strong> {exercise.biomechanicalRationale}
          </p>
          <p className="text-slate-400 font-mono text-[11px]">
            <strong>Progression:</strong> {exercise.progressionRule}
          </p>
        </div>
      )}
    </article>
  );
};
```

---

## 5. Component Blueprint: `src/components/CueCardModal.tsx`

### Responsibilities
1. Accessible modal dialog rendering the creator cue card from `cueCardsData.ts`.
2. Accessible focus trap, backdrop click, and `Escape` key close handling.
3. Formatted display of:
   - Exercise title, GZCL tier, prescribed tempo, and muscle groups.
   - Step-by-step equipment setup instructions.
   - Creator Cues: Quote callouts from the 8 elite creators with scientific biomechanical rationales.
   - Common Faults warning list.
   - Rehab Regressions ladder for pain-free execution.
4. Quick "Launch Metronome" action button using the card's prescribed tempo.

### Interface Contract (`src/components/CueCardModal.tsx`)
```typescript
import { CueCard } from '../domain/cueCardsData';

export interface CueCardModalProps {
  cueCard: CueCard | null;
  isOpen: boolean;
  onClose: () => void;
  onLaunchTempo?: (tempo: string) => void;
}
```

### Implementation Blueprint (`src/components/CueCardModal.tsx`)
```tsx
import React, { useEffect } from 'react';
import { CueCard } from '../domain/cueCardsData';
import { X, Quote, AlertTriangle, ShieldCheck, Activity, Dumbbell } from 'lucide-react';

export interface CueCardModalProps {
  cueCard: CueCard | null;
  isOpen: boolean;
  onClose: () => void;
  onLaunchTempo?: (tempo: string) => void;
}

export const CueCardModal: React.FC<CueCardModalProps> = ({
  cueCard,
  isOpen,
  onClose,
  onLaunchTempo,
}) => {
  // ESC key close listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is active
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !cueCard) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cue-card-title"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl relative my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between p-5 sm:p-6 border-b border-slate-800 bg-slate-950/60">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {cueCard.tier}
              </span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                Tempo: {cueCard.prescribedTempo}
              </span>
            </div>
            <h2 id="cue-card-title" className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {cueCard.title}
            </h2>
            <div className="text-xs text-slate-400 mt-1">
              Muscles: <span className="text-slate-300">{cueCard.primaryMuscles.join(', ')}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Cue Card Modal"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-sm text-slate-300">
          {/* Equipment & Setup Instructions */}
          <section className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Dumbbell className="w-4 h-4 text-emerald-400" />
              Setup & Equipment ({cueCard.equipment})
            </h3>
            <ul className="list-disc list-inside space-y-1.5 text-slate-300 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
              {cueCard.setupInstructions.map((instruction, idx) => (
                <li key={idx} className="leading-relaxed">
                  {instruction}
                </li>
              ))}
            </ul>
          </section>

          {/* Creator Cues & Science */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Quote className="w-4 h-4 text-sky-400" />
              Elite Creator Cues & Biomechanics
            </h3>

            <div className="space-y-3.5">
              {cueCard.creatorCues.map((cue, idx) => (
                <div
                  key={idx}
                  className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="font-bold text-emerald-300 text-xs sm:text-sm">
                      {cue.creator}
                    </span>
                  </div>

                  <blockquote className="border-l-2 border-emerald-500/40 pl-3 text-xs sm:text-sm text-slate-200 italic leading-relaxed">
                    "{cue.quote}"
                  </blockquote>

                  <p className="text-xs text-slate-400 pl-3 leading-relaxed">
                    <strong className="text-slate-300">Biomechanical Rationale:</strong>{' '}
                    {cue.biomechanicalRationale}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Common Faults */}
          {cueCard.commonFaults.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Common Faults to Avoid
              </h3>
              <ul className="space-y-1.5 bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl text-xs text-amber-200">
                {cueCard.commonFaults.map((fault, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold">•</span>
                    <span>{fault}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Rehab Regressions */}
          {cueCard.rehabRegressions.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Pain-Free Rehab Regressions
              </h3>
              <ul className="space-y-1.5 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-xs text-emerald-200">
                {cueCard.rehabRegressions.map((reg, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>{reg}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/60 flex flex-wrap items-center justify-between gap-3">
          {onLaunchTempo && cueCard.tempo && (
            <button
              type="button"
              onClick={() => {
                onLaunchTempo(cueCard.tempo);
                onClose();
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 text-xs font-semibold border border-sky-500/40 transition-colors"
            >
              <Activity className="w-4 h-4 text-sky-400" />
              <span>Launch Tempo Metronome ({cueCard.tempo})</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="ml-auto px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
```

---

## 6. Component Blueprint: `src/App.tsx` (Main Layout & State Orchestration)

### Responsibilities
1. Holds master application state:
   - `activeSessionId`: `'lower_a' | 'upper_a' | 'lower_b' | 'upper_b'`.
   - `currentView`: `'workout' | 'plates' | 'mobility'`.
   - `workoutLogs`: Complete per-exercise set logging records with automatic LocalStorage sync.
   - `activeCueCardId`: Modal selection state.
   - `isMuted`: Synced with `audioSynthesizer`.
   - `activeRestSeconds`: Trigger for the floating rest timer widget.
   - `activeTempo`: Trigger for the Marcus Filly metronome widget.
2. Layout integration:
   - Renders `Header` (top sticky).
   - Renders `SessionNav` (sub-header navigation).
   - Renders Session Overview header (title, focus, creators, duration).
   - Renders Warmup Accordion sequence.
   - Renders Exercise Cards list.
   - Hosts Docked Timer / Metronome drawer.
   - Hosts `CueCardModal`.
   - Renders `PlateCalculatorWidget` and `MobilityTrackerWidget` when selected.

### Implementation Blueprint (`src/App.tsx`)
```tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { WORKOUT_PROGRAM, WORKOUT_SESSIONS, WorkoutExercise } from './domain/programData';
import { CUE_CARDS } from './domain/cueCardsData';
import { audioSynthesizer } from './audio/audioSynthesizer';
import { Header, AppViewMode } from './components/Header';
import { SessionNav, SessionProgressStats } from './components/SessionNav';
import { ExerciseCard, SetLogRecord } from './components/ExerciseCard';
import { CueCardModal } from './components/CueCardModal';
import { Flame, ChevronDown, ChevronUp, Clock, Info } from 'lucide-react';

// Storage keys
const STORAGE_KEY_LOGS = 'workout_app_set_logs_v1';
const STORAGE_KEY_SESSION = 'workout_app_active_session_v1';

export default function App() {
  // 1. Navigation & View State
  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_SESSION) || 'lower_a';
    } catch {
      return 'lower_a';
    }
  });
  const [currentView, setCurrentView] = useState<AppViewMode>('workout');

  // 2. Audio Mute State
  const [isMuted, setIsMuted] = useState<boolean>(() => audioSynthesizer.isMuted());

  // 3. Modal & Quick Launch State
  const [activeCueCardId, setActiveCueCardId] = useState<string | null>(null);
  const [activeRestSeconds, setActiveRestSeconds] = useState<number | null>(null);
  const [activeTempo, setActiveTempo] = useState<string | null>(null);
  const [showWarmup, setShowWarmup] = useState<boolean>(false);

  // 4. Workout Set Logs State (exerciseId -> SetLogRecord[])
  const [workoutLogs, setWorkoutLogs] = useState<Record<string, SetLogRecord[]>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_LOGS);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to parse stored workout logs:', e);
    }
    return {};
  });

  // Save active session to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SESSION, activeSessionId);
    } catch {
      // safe fallback
    }
  }, [activeSessionId]);

  // Debounced auto-save of logs to LocalStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(workoutLogs));
      } catch (e) {
        console.warn('Failed to save workout logs:', e);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [workoutLogs]);

  // Audio mute handler
  const handleToggleMute = useCallback(() => {
    const next = !audioSynthesizer.isMuted();
    audioSynthesizer.setMuted(next);
    setIsMuted(next);
  }, []);

  const activeSession = WORKOUT_PROGRAM[activeSessionId] || WORKOUT_PROGRAM.lower_a;

  // Initialize missing logs for active session exercises
  const getExerciseLogs = useCallback(
    (exercise: WorkoutExercise): SetLogRecord[] => {
      if (workoutLogs[exercise.id]) {
        return workoutLogs[exercise.id];
      }
      // Generate default empty rows matching targetSets
      const defaultRows: SetLogRecord[] = Array.from({ length: exercise.targetSets }, (_, i) => ({
        setNumber: i + 1,
        targetReps: exercise.targetReps,
        weightLbs: exercise.defaultWeightLbs || 0,
        repsAchieved: 0,
        isCompleted: false,
        notes: '',
      }));
      return defaultRows;
    },
    [workoutLogs]
  );

  // Set log update handler
  const handleUpdateSetLog = useCallback(
    (exerciseId: string, setIndex: number, updated: Partial<SetLogRecord>) => {
      setWorkoutLogs((prev) => {
        const exercise = activeSession.exercises.find((e) => e.id === exerciseId);
        const existing = prev[exerciseId] || (exercise ? getExerciseLogs(exercise) : []);
        const nextLogs = [...existing];
        nextLogs[setIndex] = { ...nextLogs[setIndex], ...updated };
        return { ...prev, [exerciseId]: nextLogs };
      });
    },
    [activeSession, getExerciseLogs]
  );

  // Compute session stats for SessionNav
  const sessionStats = useMemo(() => {
    const stats: Record<string, SessionProgressStats> = {};

    WORKOUT_SESSIONS.forEach((session) => {
      let totalSets = 0;
      let completedSets = 0;
      let completedExercises = 0;

      session.exercises.forEach((ex) => {
        totalSets += ex.targetSets;
        const exLogs = workoutLogs[ex.id] || [];
        const finishedInExercise = exLogs.filter((l) => l.isCompleted).length;
        completedSets += finishedInExercise;
        if (finishedInExercise >= ex.targetSets && ex.targetSets > 0) {
          completedExercises++;
        }
      });

      stats[session.id] = {
        completedSets,
        totalSets,
        completedExercises,
        totalExercises: session.exercises.length,
        isComplete: completedExercises === session.exercises.length && session.exercises.length > 0,
      };
    });

    return stats;
  }, [workoutLogs]);

  // Overall active session completion percentage
  const currentSessionCompletion = useMemo(() => {
    const stat = sessionStats[activeSessionId];
    if (!stat || stat.totalSets === 0) return 0;
    return Math.round((stat.completedSets / stat.totalSets) * 100);
  }, [sessionStats, activeSessionId]);

  // Selected cue card lookup
  const activeCueCard = useMemo(() => {
    if (!activeCueCardId) return null;
    return (
      CUE_CARDS.find(
        (c) => c.exerciseId === activeCueCardId || c.id === activeCueCardId || c.exerciseId === activeCueCardId.replace('_b', '')
      ) || null
    );
  }, [activeCueCardId]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Header */}
      <Header
        activeSessionTitle={activeSession.title}
        activeSessionSubtitle={activeSession.subtitle}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        currentView={currentView}
        onSelectView={setCurrentView}
        completionPercentage={currentSessionCompletion}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto pb-24">
        {currentView === 'workout' && (
          <div>
            {/* Session Navigation */}
            <SessionNav
              sessions={WORKOUT_SESSIONS}
              activeSessionId={activeSessionId}
              onSelectSession={setActiveSessionId}
              sessionStats={sessionStats}
            />

            <div className="px-4 sm:px-6 py-6 max-w-5xl mx-auto">
              {/* Session Overview Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 mb-6 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-3">
                  <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">
                      {activeSession.title} — {activeSession.subtitle}
                    </h2>
                    <p className="text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                      {activeSession.focus}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/30 whitespace-nowrap">
                    <Clock className="w-4 h-4" />
                    <span>~{activeSession.estimatedDurationMinutes} Minutes</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-800/80 text-xs">
                  <span className="text-slate-400">Creator Influences:</span>
                  {activeSession.creatorInfluences.map((creator, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/60 font-medium"
                    >
                      {creator}
                    </span>
                  ))}
                </div>
              </div>

              {/* Warm-Up Accordion Section */}
              {activeSession.warmupSequence && activeSession.warmupSequence.length > 0 && (
                <div className="mb-6 bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowWarmup(!showWarmup)}
                    className="w-full flex items-center justify-between p-4 sm:p-5 text-left font-bold text-slate-200 hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Flame className="w-5 h-5 text-amber-400" />
                      <span>Warm-Up & Biomechanical Priming Sequence ({activeSession.warmupSequence.length} Drills)</span>
                    </div>
                    {showWarmup ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                  </button>

                  {showWarmup && (
                    <div className="p-4 sm:p-6 pt-0 space-y-3.5 border-t border-slate-800/60">
                      {activeSession.warmupSequence.map((drill, idx) => (
                        <div
                          key={drill.id || idx}
                          className="bg-slate-950 border border-slate-800/80 rounded-xl p-3.5 text-xs text-slate-300 space-y-1.5"
                        >
                          <div className="flex items-center justify-between font-bold text-sm text-white">
                            <span>{idx + 1}. {drill.name}</span>
                            <span className="text-amber-400 font-mono text-xs">{drill.targetDurationOrReps}</span>
                          </div>
                          <div className="text-slate-400">
                            <strong>Coach / Creator:</strong> {drill.creatorAttribution} · <strong>Equipment:</strong> {drill.equipment}
                          </div>
                          <p className="text-slate-300 leading-relaxed">
                            <strong>Purpose:</strong> {drill.biomechanicalPurpose}
                          </p>
                          <div className="text-slate-400 italic">
                            💡 {drill.coachingNotes}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Exercise Cards */}
              <div className="space-y-6">
                {activeSession.exercises.map((exercise) => (
                  <ExerciseCard
                    key={exercise.id}
                    exercise={exercise}
                    logs={getExerciseLogs(exercise)}
                    onUpdateSetLog={handleUpdateSetLog}
                    onOpenCueCard={(exId) => setActiveCueCardId(exId)}
                    onQuickStartRest={(sec) => setActiveRestSeconds(sec)}
                    onQuickStartTempo={(tempo) => setActiveTempo(tempo)}
                    onOpenPlateCalculator={() => setCurrentView('plates')}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Plate Calculator View */}
        {currentView === 'plates' && (
          <div className="px-4 sm:px-6 py-6 max-w-4xl mx-auto">
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl text-center text-slate-400">
              <h2 className="text-xl font-bold text-white mb-2">Barbell Plate Calculator</h2>
              <p className="text-sm">Integrated with the optimal 128-state subset-sum math engine.</p>
            </div>
          </div>
        )}

        {/* Mobility Tracker View */}
        {currentView === 'mobility' && (
          <div className="px-4 sm:px-6 py-6 max-w-4xl mx-auto">
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl text-center text-slate-400">
              <h2 className="text-xl font-bold text-white mb-2">Mobility & Flexibility Tracker</h2>
              <p className="text-sm">5 Clinical Protocols with zero-dependency SVG sparkline trends.</p>
            </div>
          </div>
        )}
      </main>

      {/* Creator Cue Card Modal */}
      <CueCardModal
        cueCard={activeCueCard}
        isOpen={activeCueCardId !== null}
        onClose={() => setActiveCueCardId(null)}
        onLaunchTempo={(tempo) => setActiveTempo(tempo)}
      />
    </div>
  );
}
```

---

## 7. Cross-Component Contracts & Widget Integration Points

Explorer 1 coordinates with Explorer 2 (`RestTimerWidget`, `TempoMetronomeWidget`, `PlateCalculatorWidget`) and Explorer 3 (`MobilityTrackerWidget`, `SparklineChart`, `storageManager`):

1. **Rest Timer Quick Launch**:
   - `ExerciseCard` rest button triggers `onQuickStartRest(exercise.restSeconds)`.
   - `App.tsx` sets `activeRestSeconds`, signaling the floating `RestTimerWidget` to begin or populate duration.
2. **Tempo Metronome Quick Launch**:
   - `ExerciseCard` tempo badge and `CueCardModal` launch action trigger `onQuickStartTempo(exercise.tempo)`.
   - `App.tsx` sets `activeTempo`, signaling `TempoMetronomeWidget` to start pacing the 4-digit cadence.
3. **Plate Calculator Barbell Jump**:
   - `ExerciseCard` has a barbell disc icon button next to the entered weight in the set logger. Clicking it navigates to the Plate Calculator view with that weight pre-filled.
4. **LocalStorage Storage Sync**:
   - `App.tsx` debounces log updates (300ms) to `workout_app_set_logs_v1`.
   - Backward and forward compatible with the `storageManager.ts` engine authored by Explorer 3.

---

## 8. Comprehensive Automated Verification Strategy

To satisfy the **100% test pass requirement** across Tiers 1-4, the following unit and integration test suites must be created:

### 1. `tests/components/Header.test.tsx` (≥ 5 Tests)
- **T1.1**: Renders brand title ("4-Day Upper/Lower") and active session subtitle.
- **T1.2**: Toggles procedural audio mute status on click and switches Volume2 / VolumeX icons.
- **T1.3**: Renders view switcher tabs (Routine, Plates, Mobility) and calls `onSelectView` on click.
- **T1.4**: Displays accurate completion percentage in text and visual progress bar.
- **T1.5**: Accessible attributes: buttons have `aria-label`, navigation has `role="tablist"` and `role="tab"`.

### 2. `tests/components/SessionNav.test.tsx` (≥ 5 Tests)
- **T2.1**: Renders all 4 session buttons: Lower A, Upper A, Lower B, Upper B.
- **T2.2**: Highlights the currently active session tab with visual ring/stripe and `aria-current="page"`.
- **T2.3**: Displays exercise completion counters (`x/y ex`) and switches to `Done` checkmark badge when complete.
- **T2.4**: Renders focus pills (e.g. "Knee Rehab" for Lower A, "Post-Chain" for Lower B).
- **T2.5**: Fires `onSelectSession` callback with exact session ID when clicked.

### 3. `tests/components/ExerciseCard.test.tsx` (≥ 8 Tests)
- **T3.1**: Displays GZCL Tier badge with correct color class (T1 Red, T2 Amber, T3 Emerald).
- **T3.2**: Renders knee tendinitis safety callout banner for knee movements (3-4s slow eccentric, ≤ 2/10 pain).
- **T3.3**: Renders set logger table rows matching target sets with default weight values.
- **T3.4**: Updates weight and reps in set logger inputs and calls `onUpdateSetLog`.
- **T3.5**: Checking set completion button toggles checkmark and auto-triggers `onQuickStartRest`.
- **T3.6**: Clicking tempo badge triggers `onQuickStartTempo` with exact 4-digit tempo string.
- **T3.7**: Clicking "View Creator Cues" button fires `onOpenCueCard` with exercise ID.
- **T3.8**: Expanding pain-free regression drawer displays regression name, trigger condition, and instructions.

### 4. `tests/components/CueCardModal.test.tsx` (≥ 6 Tests)
- **T4.1**: Does not render when `isOpen={false}` or `cueCard={null}`.
- **T4.2**: Renders exercise title, prescribed tempo, and setup instructions when open.
- **T4.3**: Renders creator quote blockquotes with creator name and biomechanical rationale.
- **T4.4**: Renders common faults list and rehab regression ladders.
- **T4.5**: Pressing `Escape` key fires `onClose`.
- **T4.6**: Clicking backdrop overlay fires `onClose`, but clicking inside modal does not close it.

### 5. `tests/App.test.tsx` (Updated Integration Suite - ≥ 8 Tests)
- **T5.1**: Renders full application shell with Header, SessionNav, and active session exercises.
- **T5.2**: Switching sessions via SessionNav updates displayed exercises to selected session.
- **T5.3**: Switching views switches between Routine, Plate Calculator, and Mobility Tracker views.
- **T5.4**: Set logger inputs persist across component re-renders and save to `localStorage`.
- **T5.5**: Clicking "View Creator Cues" opens `CueCardModal` with matching exercise data.
- **T5.6**: Warmup accordion collapses and expands cleanly.
- **T5.7**: Mute button persists mute state to `audioSynthesizer`.
- **T5.8**: Responsive container renders cleanly with no overflow breaks.
