# Milestone 3 Specification: Interactive Widgets Engine
**Document**: `m3_widgets_spec.md`  
**Author**: Explorer 2 (Milestone 3 — Full UI, Navigation, Trackers & Storage)  
**Target Path**: `src/components/`  
**Target Date**: 2026-10-13  
**Status**: APPROVED SPECIFICATION FOR WORKER IMPLEMENTATION  

---

## 1. Executive Summary & Architecture Overview

Milestone 3 brings the verified domain engines from Milestones 1 and 2 to life with a modern, high-contrast, mobile-responsive user interface. This specification defines the complete blueprints for three interactive workout widgets:

1. **`RestTimerWidget.tsx`**: A dockable, floating timer featuring an SVG countdown progress ring, digital MM:SS readout, all 8 GZCL/creator rest interval presets, time bumpers (+15s/+30s), and seamless singleton Web Audio synthesis.
2. **`TempoMetronomeWidget.tsx`**: Marcus Filly Functional Bodybuilding (FBB) tempo metronome widget featuring 4-digit cadence visualization (e.g. `30X1`), phase-synchronized SVG pacing rings, real-time rep counting, target rep auto-stops, and procedural audio pings.
3. **`PlateCalculatorWidget.tsx`**: Olympic barbell loading calculator powered by the verified 128-state subset-sum algorithm (`calculatePlates`), featuring tactile sleeve rendering, Olympic color coding (45 Red, 35 Blue, 25 Yellow, 10 Green, 5 White, 2.5 Silver), quick presets, and plate summary badges.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           Milestone 3 Widget Suite                              │
├──────────────────────────┬───────────────────────────┬──────────────────────────┤
│    RestTimerWidget       │   TempoMetronomeWidget    │   PlateCalculatorWidget  │
│  - Floating / Docked     │  - 4-Digit Cadence Tiles  │  - 128-State Subset Sum  │
│  - SVG Circular Ring     │  - SVG Pacing Ring        │  - Olympic Color Plates  │
│  - 8 Multi-Tier Presets  │  - Rep & Target Tracker   │  - Tactile Sleeve Shaft  │
│  - +15s / +30s Bumpers   │  - Audio Ping Engine      │  - Weight Presets        │
│  - restTimer Singleton   │  - tempoMetronome Bridge  │  - Collar-to-Tip Order   │
└──────────────────────────┴───────────────────────────┴──────────────────────────┘
```

---

## 2. `RestTimerWidget.tsx` Blueprint

### 2.1 Component Overview & UX Modes
The `RestTimerWidget` provides workout rest interval management. Lifting in a home gym requires hands-free visibility and single-tap interactions:
- **Docked Mode (Bottom Sticky Bar)**: Pinned to the bottom of the viewport (`fixed bottom-0 left-0 right-0 z-40`), ensuring the timer is accessible from any workout tab without occluding exercise cues.
- **Floating / Expanded Modal Mode**: Displays the full circular SVG ring, quick preset matrix, and time bumpers.
- **Minimized Pill State**: When collapsed, shrinks to an unobtrusive pill displaying the circular ring, countdown time, play/pause toggle, and expand chevron.

### 2.2 Component Props & TypeScript Contract
```typescript
// src/components/RestTimerWidget.tsx

export type RestTimerVariant = 'docked' | 'modal' | 'inline';

export interface RestTimerWidgetProps {
  /** Optional variant: 'docked' (default bottom bar), 'modal' (overlay), or 'inline' (embedded) */
  variant?: RestTimerVariant;
  /** Initial preset duration in seconds (defaults to 60) */
  initialDuration?: number;
  /** Callback fired when timer completes countdown */
  onComplete?: () => void;
  /** Whether the widget starts in an expanded state */
  defaultExpanded?: boolean;
  /** Optional custom CSS classes for top-level container */
  className?: string;
  /** External trigger to launch a specific duration (e.g. from an Exercise Card) */
  activePresetSeconds?: number | null;
  /** Callback to clear the active external preset */
  onClearActivePreset?: () => void;
}
```

### 2.3 Shared Singleton Bridge & React Hook
To prevent multiple competing timers when switching views, the component bridges to a shared `RestTimer` instance:

```typescript
// src/timer/restTimerSingleton.ts
import { RestTimer } from './restTimer';
import { audioSynthesizer } from '../audio/audioSynthesizer';

export const restTimerSingleton = new RestTimer({
  audioSynthesizer,
});
```

#### React Hook: `useRestTimer`
```typescript
import { useState, useEffect, useCallback } from 'react';
import { restTimerSingleton } from '../timer/restTimerSingleton';
import type { TimerSnapshot } from '../timer/restTimer';

export function useRestTimer() {
  const [snapshot, setSnapshot] = useState<TimerSnapshot>(() => restTimerSingleton.getSnapshot());

  useEffect(() => {
    const unsubscribe = restTimerSingleton.subscribe((newSnapshot) => {
      setSnapshot(newSnapshot);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const start = useCallback((duration: number) => restTimerSingleton.start(duration), []);
  const pause = useCallback(() => restTimerSingleton.pause(), []);
  const resume = useCallback(() => restTimerSingleton.resume(), []);
  const reset = useCallback(() => restTimerSingleton.reset(), []);
  const addTime = useCallback((seconds: number) => restTimerSingleton.addTime(seconds), []);

  return {
    snapshot,
    start,
    pause,
    resume,
    reset,
    addTime,
    timer: restTimerSingleton,
  };
}
```

### 2.4 Circular SVG Progress Ring Architecture
- **Coordinate Space**: `viewBox="0 0 128 128"`, Center = `(64, 64)`, Radius $R = 54$.
- **Circumference**: $C = 2 \times \pi \times 54 \approx 339.292$.
- **Depletion Offset**:
  $$\text{strokeDashoffset} = C \times \left(1 - \frac{\text{remainingSeconds}}{\text{durationSeconds}}\right)$$
  - At start: $\text{offset} = 0$ (full ring).
  - At zero: $\text{offset} = C$ (empty ring).
- **Rotation**: `transform="rotate(-90 64 64)"` starts stroke at 12 o'clock.
- **Dynamic Color States**:
  - `RUNNING (> 3s)`: `stroke-cyan-400`
  - `RUNNING (<= 3s)`: `stroke-amber-400 animate-pulse`
  - `PAUSED`: `stroke-amber-500/70`
  - `COMPLETED`: `stroke-emerald-400`
  - `IDLE`: `stroke-slate-600`

### 2.5 8 Quick Presets Layout
All 8 presets defined in `REST_PRESETS` categorized by training tier:

| Category | Presets | Purpose | Visual Styling |
|---|---|---|---|
| **Effective Reps** | 15s, 30s | Athlean-X rest-pause clusters & intra-set resets | Border: `border-purple-500/50`, Text: `text-purple-300`, Hover: `hover:bg-purple-950/40` |
| **Tier 3 (Accessories)** | 60s, 90s | Core endurance, tibialis raises, isolation hypertrophy | Border: `border-emerald-500/50`, Text: `text-emerald-300`, Hover: `hover:bg-emerald-950/40` |
| **Tier 2 (Hypertrophy)** | 120s (2m), 180s (3m) | RDLs, Hack squats, Landmine presses | Border: `border-blue-500/50`, Text: `text-blue-300`, Hover: `hover:bg-blue-950/40` |
| **Tier 1 (Heavy Lifts)** | 240s (4m), 300s (5m) | Heavy Squat, Bench, Deadlift, OHP ATP-CP recovery | Border: `border-amber-500/50`, Text: `text-amber-300`, Hover: `hover:bg-amber-950/40` |

### 2.6 Full Component Blueprint: `RestTimerWidget.tsx`
```tsx
import React, { useState, useEffect } from 'react';
import { useRestTimer } from '../hooks/useRestTimer';
import { REST_PRESETS, type RestPreset } from '../timer/restTimer';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Plus, 
  ChevronUp, 
  ChevronDown, 
  Clock, 
  Volume2, 
  VolumeX,
  X 
} from 'lucide-react';
import { audioSynthesizer } from '../audio/audioSynthesizer';

export interface RestTimerWidgetProps {
  variant?: 'docked' | 'modal' | 'inline';
  initialDuration?: number;
  onComplete?: () => void;
  defaultExpanded?: boolean;
  className?: string;
  activePresetSeconds?: number | null;
  onClearActivePreset?: () => void;
  onClose?: () => void;
}

export const RestTimerWidget: React.FC<RestTimerWidgetProps> = ({
  variant = 'docked',
  initialDuration = 60,
  onComplete,
  defaultExpanded = false,
  className = '',
  activePresetSeconds = null,
  onClearActivePreset,
  onClose,
}) => {
  const { snapshot, start, pause, resume, reset, addTime } = useRestTimer();
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded || variant !== 'docked');
  const [isMuted, setIsMuted] = useState<boolean>(() => audioSynthesizer.isMuted());

  // Handle external trigger (e.g. from ExerciseCard)
  useEffect(() => {
    if (activePresetSeconds && activePresetSeconds > 0) {
      start(activePresetSeconds);
      setIsExpanded(true);
      onClearActivePreset?.();
    }
  }, [activePresetSeconds, start, onClearActivePreset]);

  // Handle completion notification
  useEffect(() => {
    if (snapshot.state === 'COMPLETED') {
      onComplete?.();
    }
  }, [snapshot.state, onComplete]);

  // SVG Constants
  const RADIUS = 54;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS; // ~339.292
  const progressRatio = snapshot.durationSeconds > 0 
    ? snapshot.remainingSeconds / snapshot.durationSeconds 
    : 0;
  const strokeDashoffset = CIRCUMFERENCE * (1 - progressRatio);

  const formatTime = (totalSeconds: number): string => {
    const mins = Math.floor(Math.max(0, totalSeconds) / 60);
    const secs = Math.max(0, totalSeconds) % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const getRingColor = (): string => {
    switch (snapshot.state) {
      case 'RUNNING':
        return snapshot.remainingSeconds <= 3 ? 'text-amber-400 stroke-amber-400' : 'text-cyan-400 stroke-cyan-400';
      case 'PAUSED':
        return 'text-amber-500 stroke-amber-500';
      case 'COMPLETED':
        return 'text-emerald-400 stroke-emerald-400';
      case 'IDLE':
      default:
        return 'text-slate-500 stroke-slate-500';
    }
  };

  const getStatusBadge = () => {
    switch (snapshot.state) {
      case 'RUNNING':
        return <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-cyan-950/80 text-cyan-300 border border-cyan-800"><span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />Resting</span>;
      case 'PAUSED':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-300 border border-amber-800">Paused</span>;
      case 'COMPLETED':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800">Set Ready!</span>;
      case 'IDLE':
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">Ready</span>;
    }
  };

  const toggleMute = () => {
    const newMuted = !isMuted;
    audioSynthesizer.setMuted(newMuted);
    setIsMuted(newMuted);
  };

  const handlePresetSelect = (preset: RestPreset) => {
    start(preset.seconds);
  };

  // Minimized bottom pill view (Docked mode only)
  if (variant === 'docked' && !isExpanded) {
    return (
      <div className={`fixed bottom-4 right-4 z-40 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl p-2.5 flex items-center gap-3 transition-all duration-300 hover:border-slate-600 ${className}`}>
        {/* Mini circular progress indicator */}
        <div className="relative w-10 h-10 flex items-center justify-center">
          <svg className="w-10 h-10 -rotate-90 transform" viewBox="0 0 128 128">
            <circle cx="64" cy="64" r={RADIUS} fill="transparent" strokeWidth="12" className="stroke-slate-800" />
            <circle 
              cx="64" cy="64" r={RADIUS} fill="transparent" strokeWidth="12" 
              strokeDasharray={CIRCUMFERENCE} strokeDashoffset={strokeDashoffset} 
              strokeLinecap="round" className={`transition-all duration-150 ${getRingColor()}`} 
            />
          </svg>
          <Clock className="w-4 h-4 text-slate-400 absolute" />
        </div>

        {/* Digital Time & Status */}
        <div className="flex flex-col cursor-pointer" onClick={() => setIsExpanded(true)}>
          <span className="font-mono text-lg font-bold text-slate-100 tracking-wider">
            {formatTime(snapshot.remainingSeconds)}
          </span>
          <span className="text-[10px] text-slate-400 font-medium capitalize">
            {snapshot.state.toLowerCase()}
          </span>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-1 pl-1 border-l border-slate-800">
          {snapshot.state === 'RUNNING' ? (
            <button 
              onClick={pause}
              aria-label="Pause Timer"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 transition-colors"
            >
              <Pause className="w-4 h-4" />
            </button>
          ) : snapshot.state === 'PAUSED' ? (
            <button 
              onClick={resume}
              aria-label="Resume Timer"
              className="p-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white transition-colors"
            >
              <Play className="w-4 h-4 fill-white" />
            </button>
          ) : (
            <button 
              onClick={() => start(initialDuration)}
              aria-label="Start Timer"
              className="p-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white transition-colors"
            >
              <Play className="w-4 h-4 fill-white" />
            </button>
          )}

          <button 
            onClick={() => setIsExpanded(true)}
            aria-label="Expand Rest Timer"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Expanded View (Full Docked Drawer, Modal, or Inline Widget)
  return (
    <div className={`
      ${variant === 'docked' 
        ? 'fixed bottom-0 left-0 right-0 z-40 bg-slate-900/98 backdrop-blur-xl border-t border-slate-800 shadow-2xl p-4 max-w-4xl mx-auto rounded-t-3xl transition-transform duration-300' 
        : variant === 'modal' 
          ? 'fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4' 
          : 'bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl'} 
      ${className}
    `}>
      <div className={variant === 'modal' ? 'bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl' : 'w-full'}>
        
        {/* Header Bar */}
        <div className="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-950/60 border border-cyan-800/50 text-cyan-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Rest Interval Timer
                {getStatusBadge()}
              </h3>
              <p className="text-xs text-slate-400">GZCL Multi-Tier Precision Recovery</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button 
              onClick={toggleMute}
              title={isMuted ? 'Unmute Audio Pings' : 'Mute Audio Pings'}
              aria-label={isMuted ? 'Unmute Audio' : 'Mute Audio'}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            </button>

            {variant === 'docked' ? (
              <button 
                onClick={() => setIsExpanded(false)}
                aria-label="Minimize Timer"
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            ) : onClose ? (
              <button 
                onClick={onClose}
                aria-label="Close Timer"
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            ) : null}
          </div>
        </div>

        {/* Center Ring & Controls Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          
          {/* Circular SVG & Digital Readout */}
          <div className="flex flex-col items-center justify-center">
            <div className="relative w-44 h-44 flex items-center justify-center">
              <svg className="w-44 h-44 -rotate-90 transform" viewBox="0 0 128 128">
                {/* Track background */}
                <circle 
                  cx="64" cy="64" r={RADIUS} 
                  fill="transparent" 
                  strokeWidth="8" 
                  className="stroke-slate-800" 
                />
                {/* Dynamic animated progress stroke */}
                <circle 
                  cx="64" cy="64" r={RADIUS} 
                  fill="transparent" 
                  strokeWidth="8" 
                  strokeDasharray={CIRCUMFERENCE} 
                  strokeDashoffset={strokeDashoffset} 
                  strokeLinecap="round" 
                  className={`transition-[stroke-dashoffset] duration-150 ease-out ${getRingColor()}`} 
                />
              </svg>

              {/* Inner Center Display */}
              <div className="absolute inset-0 flex flex-col items-center justify-center select-none">
                <span className="font-mono text-3xl font-extrabold text-white tracking-wider drop-shadow-md">
                  {formatTime(snapshot.remainingSeconds)}
                </span>
                <span className="text-xs text-slate-400 mt-1 font-medium">
                  Total: {snapshot.durationSeconds}s
                </span>
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="flex items-center gap-3 mt-4">
              {snapshot.state === 'RUNNING' ? (
                <button 
                  onClick={pause}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 active:scale-95 text-white font-semibold flex items-center gap-2 shadow-lg shadow-amber-950/40 transition-all"
                >
                  <Pause className="w-4 h-4 fill-white" /> Pause
                </button>
              ) : snapshot.state === 'PAUSED' ? (
                <button 
                  onClick={resume}
                  className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 active:scale-95 text-white font-semibold flex items-center gap-2 shadow-lg shadow-cyan-950/40 transition-all"
                >
                  <Play className="w-4 h-4 fill-white" /> Resume
                </button>
              ) : (
                <button 
                  onClick={() => start(snapshot.durationSeconds || initialDuration)}
                  className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 active:scale-95 text-white font-semibold flex items-center gap-2 shadow-lg shadow-cyan-950/40 transition-all"
                >
                  <Play className="w-4 h-4 fill-white" /> Start
                </button>
              )}

              <button 
                onClick={reset}
                title="Reset Timer"
                aria-label="Reset Timer"
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 transition-all border border-slate-700"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Quick Time Bumpers */}
              <button 
                onClick={() => addTime(15)}
                title="Add 15 Seconds"
                aria-label="Add 15 Seconds"
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-all active:scale-95 flex items-center gap-0.5"
              >
                <Plus className="w-3 h-3 text-cyan-400" /> 15s
              </button>

              <button 
                onClick={() => addTime(30)}
                title="Add 30 Seconds"
                aria-label="Add 30 Seconds"
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-all active:scale-95 flex items-center gap-0.5"
              >
                <Plus className="w-3 h-3 text-cyan-400" /> 30s
              </button>
            </div>
          </div>

          {/* Quick Presets Grid */}
          <div className="flex flex-col gap-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Quick Presets
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {REST_PRESETS.map((preset) => {
                const isActive = snapshot.durationSeconds === preset.seconds;
                let badgeClass = 'border-slate-700 text-slate-300 hover:bg-slate-800';
                
                if (preset.tier === 'Effective Reps') {
                  badgeClass = isActive 
                    ? 'border-purple-500 bg-purple-950/60 text-purple-200 shadow-md shadow-purple-950/40' 
                    : 'border-purple-800/40 text-purple-300/80 hover:bg-purple-950/30';
                } else if (preset.tier === 'Tier 3') {
                  badgeClass = isActive 
                    ? 'border-emerald-500 bg-emerald-950/60 text-emerald-200 shadow-md shadow-emerald-950/40' 
                    : 'border-emerald-800/40 text-emerald-300/80 hover:bg-emerald-950/30';
                } else if (preset.tier === 'Tier 2') {
                  badgeClass = isActive 
                    ? 'border-blue-500 bg-blue-950/60 text-blue-200 shadow-md shadow-blue-950/40' 
                    : 'border-blue-800/40 text-blue-300/80 hover:bg-blue-950/30';
                } else if (preset.tier === 'Tier 1') {
                  badgeClass = isActive 
                    ? 'border-amber-500 bg-amber-950/60 text-amber-200 shadow-md shadow-amber-950/40' 
                    : 'border-amber-800/40 text-amber-300/80 hover:bg-amber-950/30';
                }

                return (
                  <button
                    key={preset.id}
                    onClick={() => handlePresetSelect(preset)}
                    className={`p-2.5 rounded-xl border text-left transition-all active:scale-95 flex flex-col justify-between ${badgeClass}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-bold">{preset.label}</span>
                      <span className="text-[9px] font-semibold uppercase px-1.5 py-0.2 rounded bg-slate-900/80 text-slate-400">
                        {preset.tier === 'Effective Reps' ? 'ER' : preset.tier.replace('Tier ', 'T')}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 truncate mt-1">
                      {preset.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
```

---

## 3. `TempoMetronomeWidget.tsx` Blueprint

### 3.1 Component Overview & Marcus Filly FBB Principles
Marcus Filly's Functional Bodybuilding tempo system enforces strict eccentric deceleration, eliminates joint bounce, and maximizes tendon adaptation. For the user's knee tendinitis rehabilitation:
- 3–4 second eccentrics stimulate collagen remodeling in patellar tendons.
- 0–1 second pauses at the bottom eliminate patellar shear stress.
- Controlled concentric acceleration builds pain-free force.
- 1 second top isometric lock builds joint stability.

### 3.2 Component Props & TypeScript Contract
```typescript
// src/components/TempoMetronomeWidget.tsx

export interface TempoMetronomeWidgetProps {
  /** Initial 4-digit tempo cadence string (e.g. "30X1", "31X1", "4010") */
  initialTempo?: string;
  /** Initial target reps (0 = continuous) */
  initialTargetReps?: number;
  /** Whether the widget should automatically start running when mounted */
  autoStart?: boolean;
  /** Callback fired when a single rep is completed */
  onRepComplete?: (repNumber: number, targetReps: number) => void;
  /** Callback fired when the entire target set is achieved */
  onSetComplete?: (totalReps: number) => void;
  /** Optional close handler if opened in modal/drawer */
  onClose?: () => void;
  /** Optional custom CSS classes */
  className?: string;
}
```

### 3.3 Visual & Functional Specifications

#### A. 4-Digit Cadence Visualizer Tiles
The 4 tempo digits are presented as distinct, clickable cards:
1. **[E] Eccentric** (e.g. `3`s): Blue (`#3B82F6` / `border-blue-500 bg-blue-950/40 text-blue-200`) — "LOWER"
2. **[B] Pause Bottom** (e.g. `0`s): Amber (`#F59E0B` / `border-amber-500 bg-amber-950/40 text-amber-200`) — "HOLD BOTTOM"
3. **[C] Concentric** (e.g. `X` or `1`s): Emerald (`#10B981` / `border-emerald-500 bg-emerald-950/40 text-emerald-200`) — "DRIVE / EXPLODE"
4. **[T] Pause Top** (e.g. `1`s): Violet (`#8B5CF6` / `border-violet-500 bg-violet-950/40 text-violet-200`) — "SQUEEZE TOP"

When running, the tile corresponding to `snapshot.currentPhase` glows with an active ring (`ring-2 ring-offset-2 ring-offset-slate-900`) and scaling effect.

#### B. Animated SVG Pacing Ring
- Pacing circle: $R = 56$, Center = `(64, 64)`, Circumference $C = 2 \times \pi \times 56 \approx 351.858$.
- Phase countdown depletion:
  $$\text{strokeDashoffset} = C \times \left(1 - \text{snapshot.phaseProgressRatio}\right)$$
- Color matches `snapshot.phaseColor`:
  - Lower: `#3B82F6`
  - Hold Bottom: `#F59E0B`
  - Drive: `#10B981`
  - Squeeze: `#8B5CF6`
- Center readout displays the large phase second (e.g. `3`, `2`, `1`, `X`) and active label (`"LOWER (ECCENTRIC)"`).

#### C. Rep Counter & Target Rep Selector
- Large font rep badge: `"Rep 4 of 10"`.
- Target Rep Selector: `[Continuous, 5, 8, 10, 12, 15]`.
- Upon achieving `targetReps`:
  - Metronome stops.
  - Plays double-harmonic completion chime.
  - Shows celebratory green banner: `"Set Complete! Excellent Cadence Control!"`.

#### D. Presets & Custom Tempo Form
- **Presets**:
  - `30X1`: Marcus Filly FBB Standard (Session 4 Single-Arm KB Press)
  - `31X1`: Knee & Hip Tendon Loading (ATG Split Squat, RDL)
  - `4010`: Quad Eccentric Overload (Hack Squat / Goblet Squat)
  - `2011`: Hypertrophy Cadence
  - `3012`: Peak Isometric Contraction
- **Custom input**: Validates 4-digit regex `^[0-9][0-9][0-9Xx][0-9]$` using `tryParseTempo()`.

### 3.4 Full Component Blueprint: `TempoMetronomeWidget.tsx`
```tsx
import React, { useState, useEffect, useRef } from 'react';
import { TempoMetronome, tryParseTempo, type MetronomeSnapshot } from '../timer/tempoMetronome';
import { audioSynthesizer } from '../audio/audioSynthesizer';
import { Play, Pause, Square, Volume2, VolumeX, CheckCircle, Flame, X } from 'lucide-react';

export interface TempoMetronomeWidgetProps {
  initialTempo?: string;
  initialTargetReps?: number;
  autoStart?: boolean;
  onRepComplete?: (repNumber: number, targetReps: number) => void;
  onSetComplete?: (totalReps: number) => void;
  onClose?: () => void;
  className?: string;
}

const TEMPO_PRESETS = [
  { tempo: '30X1', name: 'Marcus Filly Standard', desc: '3s Lower, Explode Up, 1s Squeeze' },
  { tempo: '31X1', name: 'Knee & Tendon Rehab', desc: '3s Lower, 1s Bottom Pause, Explode Up' },
  { tempo: '4010', name: 'Eccentric Hypertrophy', desc: '4s Slow Lower, 1s Controlled Up' },
  { tempo: '2011', name: 'Fluid Hypertrophy', desc: '2s Lower, 1s Up, 1s Top Hold' },
  { tempo: '3012', name: 'Peak Contraction', desc: '3s Lower, 1s Up, 2s Peak Squeeze' },
];

export const TempoMetronomeWidget: React.FC<TempoMetronomeWidgetProps> = ({
  initialTempo = '30X1',
  initialTargetReps = 10,
  autoStart = false,
  onRepComplete,
  onSetComplete,
  onClose,
  className = '',
}) => {
  const metronomeRef = useRef<TempoMetronome | null>(null);
  const [snapshot, setSnapshot] = useState<MetronomeSnapshot | null>(null);
  const [customInput, setCustomInput] = useState<string>(initialTempo);
  const [inputError, setInputError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isCompletedSet, setIsCompletedSet] = useState<boolean>(false);

  useEffect(() => {
    const metronome = new TempoMetronome({
      audioSynthesizer,
      soundEnabled: true,
      tickIntervalMs: 50,
    });
    metronomeRef.current = metronome;

    const unsubState = metronome.subscribe((snap) => {
      setSnapshot(snap);
    });

    const unsubRep = metronome.onRepComplete((rep, target) => {
      onRepComplete?.(rep, target);
    });

    const unsubSet = metronome.onSetComplete((reps) => {
      setIsCompletedSet(true);
      onSetComplete?.(reps);
    });

    metronome.setTempo(initialTempo);
    metronome.setTargetReps(initialTargetReps);

    if (autoStart) {
      metronome.start(initialTempo, initialTargetReps);
    }

    return () => {
      unsubState();
      unsubRep();
      unsubSet();
      metronome.destroy();
    };
  }, [initialTempo, initialTargetReps, autoStart, onRepComplete, onSetComplete]);

  if (!snapshot) return null;

  // SVG Geometry
  const RADIUS = 56;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS; // ~351.858
  const strokeDashoffset = CIRCUMFERENCE * (1 - snapshot.phaseProgressRatio);

  const handleStart = () => {
    setIsCompletedSet(false);
    metronomeRef.current?.start(snapshot.tempo, snapshot.targetReps);
  };

  const handlePause = () => {
    metronomeRef.current?.pause();
  };

  const handleResume = () => {
    metronomeRef.current?.resume();
  };

  const handleStop = () => {
    setIsCompletedSet(false);
    metronomeRef.current?.stop();
  };

  const toggleSound = () => {
    const nextSound = !soundEnabled;
    metronomeRef.current?.setSoundEnabled(nextSound);
    setSoundEnabled(nextSound);
  };

  const handleTargetRepsChange = (reps: number) => {
    metronomeRef.current?.setTargetReps(reps);
  };

  const handleApplyPreset = (tempo: string) => {
    setCustomInput(tempo);
    setInputError(null);
    metronomeRef.current?.setTempo(tempo);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = tryParseTempo(customInput);
    if (result.success && result.data) {
      setInputError(null);
      metronomeRef.current?.setTempo(result.data.raw);
    } else {
      setInputError(result.error || 'Invalid 4-digit tempo cadence');
    }
  };

  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-slate-100 max-w-xl mx-auto ${className}`}>
      
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-950/60 border border-blue-800/50 text-blue-400">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              Marcus Filly Tempo Metronome
            </h3>
            <p className="text-xs text-slate-400">Functional Bodybuilding 4-Digit Cadence</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleSound}
            aria-label={soundEnabled ? 'Mute Metronome Audio' : 'Unmute Metronome Audio'}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-red-400" />}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              aria-label="Close Metronome"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 4-Digit Cadence Visualizer Strip */}
      <div className="grid grid-cols-4 gap-2 my-5">
        {/* Eccentric */}
        <div className={`p-3 rounded-2xl border text-center transition-all ${
          snapshot.currentPhase === 'eccentric' && snapshot.isRunning
            ? 'border-blue-400 bg-blue-950/80 shadow-lg shadow-blue-950/50 scale-105 ring-2 ring-blue-500'
            : 'border-slate-800 bg-slate-950/60'
        }`}>
          <span className="text-[10px] uppercase font-bold text-blue-400 block tracking-wider">Eccentric</span>
          <span className="font-mono text-2xl font-black text-white">{snapshot.parsedTempo.eccentric}s</span>
          <span className="text-[9px] text-slate-400 block mt-0.5">Lowering</span>
        </div>

        {/* Pause Bottom */}
        <div className={`p-3 rounded-2xl border text-center transition-all ${
          snapshot.currentPhase === 'pauseBottom' && snapshot.isRunning
            ? 'border-amber-400 bg-amber-950/80 shadow-lg shadow-amber-950/50 scale-105 ring-2 ring-amber-500'
            : 'border-slate-800 bg-slate-950/60'
        }`}>
          <span className="text-[10px] uppercase font-bold text-amber-400 block tracking-wider">Bottom</span>
          <span className="font-mono text-2xl font-black text-white">{snapshot.parsedTempo.pauseBottom}s</span>
          <span className="text-[9px] text-slate-400 block mt-0.5">Pause</span>
        </div>

        {/* Concentric */}
        <div className={`p-3 rounded-2xl border text-center transition-all ${
          snapshot.currentPhase === 'concentric' && snapshot.isRunning
            ? 'border-emerald-400 bg-emerald-950/80 shadow-lg shadow-emerald-950/50 scale-105 ring-2 ring-emerald-500'
            : 'border-slate-800 bg-slate-950/60'
        }`}>
          <span className="text-[10px] uppercase font-bold text-emerald-400 block tracking-wider">Concentric</span>
          <span className="font-mono text-2xl font-black text-white">
            {snapshot.parsedTempo.isConcentricExplosive ? 'X' : `${snapshot.parsedTempo.concentric}s`}
          </span>
          <span className="text-[9px] text-slate-400 block mt-0.5">Drive Up</span>
        </div>

        {/* Pause Top */}
        <div className={`p-3 rounded-2xl border text-center transition-all ${
          snapshot.currentPhase === 'pauseTop' && snapshot.isRunning
            ? 'border-violet-400 bg-violet-950/80 shadow-lg shadow-violet-950/50 scale-105 ring-2 ring-violet-500'
            : 'border-slate-800 bg-slate-950/60'
        }`}>
          <span className="text-[10px] uppercase font-bold text-violet-400 block tracking-wider">Top</span>
          <span className="font-mono text-2xl font-black text-white">{snapshot.parsedTempo.pauseTop}s</span>
          <span className="text-[9px] text-slate-400 block mt-0.5">Squeeze</span>
        </div>
      </div>

      {/* Circular SVG Pacing Display */}
      <div className="flex flex-col items-center justify-center my-4">
        <div className="relative w-48 h-48 flex items-center justify-center">
          <svg className="w-48 h-48 -rotate-90 transform" viewBox="0 0 128 128">
            <circle cx="64" cy="64" r={RADIUS} fill="transparent" strokeWidth="8" className="stroke-slate-800" />
            <circle 
              cx="64" cy="64" r={RADIUS} fill="transparent" strokeWidth="8" 
              strokeDasharray={CIRCUMFERENCE} strokeDashoffset={strokeDashoffset} 
              strokeLinecap="round" 
              style={{ stroke: snapshot.phaseColor }}
              className="transition-[stroke-dashoffset] duration-75 ease-linear" 
            />
          </svg>

          {/* Central Pacing Readout */}
          <div className="absolute inset-0 flex flex-col items-center justify-center select-none text-center px-4">
            <span className="font-mono text-4xl font-extrabold text-white tracking-wider">
              {snapshot.isExplosive ? 'EXPLODE' : `${snapshot.phaseRemainingSeconds}s`}
            </span>
            <span 
              className="text-xs font-bold uppercase tracking-wider mt-1 px-2.5 py-0.5 rounded-full"
              style={{ color: snapshot.phaseColor, backgroundColor: `${snapshot.phaseColor}20` }}
            >
              {snapshot.phaseLabel}
            </span>
            <span className="text-[11px] text-slate-400 font-mono mt-1">
              Rep {snapshot.currentRep} {snapshot.targetReps > 0 ? `of ${snapshot.targetReps}` : '(Cont.)'}
            </span>
          </div>
        </div>

        {/* Set Completion Banner */}
        {isCompletedSet && (
          <div className="mt-3 p-3 rounded-2xl bg-emerald-950/80 border border-emerald-600 text-emerald-200 text-center font-semibold text-xs flex items-center gap-2 animate-bounce">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            Target {snapshot.targetReps} reps completed with perfect cadence!
          </div>
        )}

        {/* Primary Controls */}
        <div className="flex items-center gap-3 mt-4">
          {snapshot.state === 'ACTIVE' ? (
            <button 
              onClick={handlePause}
              className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 active:scale-95 text-white font-semibold flex items-center gap-2 shadow-lg shadow-amber-950/40 transition-all"
            >
              <Pause className="w-4 h-4 fill-white" /> Pause
            </button>
          ) : snapshot.state === 'PAUSED' ? (
            <button 
              onClick={handleResume}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-semibold flex items-center gap-2 shadow-lg shadow-emerald-950/40 transition-all"
            >
              <Play className="w-4 h-4 fill-white" /> Resume
            </button>
          ) : (
            <button 
              onClick={handleStart}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-semibold flex items-center gap-2 shadow-lg shadow-emerald-950/40 transition-all"
            >
              <Play className="w-4 h-4 fill-white" /> Start Cadence
            </button>
          )}

          <button 
            onClick={handleStop}
            title="Stop / Reset"
            aria-label="Stop Metronome"
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 transition-all border border-slate-700"
          >
            <Square className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Target Rep Selector & Presets */}
      <div className="border-t border-slate-800 pt-4 mt-4 space-y-4">
        {/* Target Reps */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400">Target Reps:</span>
          <div className="flex items-center gap-1.5">
            {[0, 5, 8, 10, 12, 15].map((r) => (
              <button
                key={r}
                onClick={() => handleTargetRepsChange(r)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                  snapshot.targetReps === r
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {r === 0 ? 'Cont.' : r}
              </button>
            ))}
          </div>
        </div>

        {/* Presets List */}
        <div>
          <span className="text-xs font-semibold text-slate-400 block mb-2">FBB Presets:</span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {TEMPO_PRESETS.map((p) => (
              <button
                key={p.tempo}
                onClick={() => handleApplyPreset(p.tempo)}
                className={`p-2 rounded-xl border text-left transition-all ${
                  snapshot.tempo === p.tempo
                    ? 'border-blue-500 bg-blue-950/50 text-blue-200'
                    : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:bg-slate-800/60'
                }`}
              >
                <div className="font-mono text-xs font-bold text-white">{p.tempo}</div>
                <div className="text-[10px] text-slate-400 truncate">{p.name}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Input */}
        <form onSubmit={handleCustomSubmit} className="flex items-center gap-2 pt-1">
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value.toUpperCase())}
            placeholder="Custom 4-digit (e.g. 30X1)"
            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-blue-500 uppercase"
            maxLength={4}
          />
          <button
            type="submit"
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors"
          >
            Apply
          </button>
        </form>
        {inputError && <p className="text-[11px] text-red-400 mt-1">{inputError}</p>}
      </div>

    </div>
  );
};
```

---

## 4. `PlateCalculatorWidget.tsx` Blueprint

### 4.1 Component Overview & Equipment Profile
The user's home gym contains an Olympic barbell and an inventory of plates totaling up to 300 lbs:
- **Barbell**: 45 lb Olympic barbell.
- **Inventory**:
  - 45 lb $\times 2$ (1 pair)
  - 35 lb $\times 2$ (1 pair)
  - 25 lb $\times 2$ (1 pair)
  - 10 lb $\times 2$ (1 pair)
  - 5 lb $\times 4$ (2 pairs)
  - 2.5 lb $\times 2$ (1 pair)
  - Total Plate Weight: $2 \times (45 + 35 + 25 + 10 + 10 + 2.5) = 255$ lbs + 45 lb bar = **300 lbs total capacity**.

Greedy algorithms fail at weights such as 165 lbs (optimal: 35 + 25; greedy: 45 + 10 + 5) and 175 lbs. The verified `calculatePlates` function solves this with an exact 128-state subset-sum search.

### 4.2 Component Props & TypeScript Contract
```typescript
// src/components/PlateCalculatorWidget.tsx
import type { PlateInventory } from '../domain/plateCalculator';

export interface PlateCalculatorWidgetProps {
  /** Initial barbell target weight in pounds (default 135) */
  initialWeight?: number;
  /** Optional custom plate inventory (defaults to user 300 lb set) */
  inventory?: PlateInventory;
  /** Optional empty bar weight (default 45) */
  barWeight?: number;
  /** Callback fired when a target weight is adjusted or loaded */
  onWeightChange?: (weight: number) => void;
  /** Optional close handler if opened in modal/drawer */
  onClose?: () => void;
  /** Optional custom CSS class */
  className?: string;
}
```

### 4.3 Olympic Color Specification & Tailwind Tokens
Per the prompt and international Olympic barbell specifications:

| Plate Denomination | Olympic Color | Hex Code | Tailwind Background | Tailwind Border | Text Color |
|---|---|---|---|---|---|
| **45 lb** | Red | `#EF4444` | `bg-red-600` | `border-red-700` | `text-white font-bold` |
| **35 lb** | Blue | `#3B82F6` | `bg-blue-600` | `border-blue-700` | `text-white font-bold` |
| **25 lb** | Yellow | `#EAB308` | `bg-yellow-500` | `border-yellow-600` | `text-slate-950 font-bold` |
| **10 lb** | Green | `#22C55E` | `bg-green-600` | `border-green-700` | `text-white font-bold` |
| **5 lb** | White | `#F8FAFC` | `bg-slate-100` | `border-slate-300` | `text-slate-900 font-bold` |
| **2.5 lb** | Silver / Chrome | `#94A3B8` | `bg-slate-400` | `border-slate-500` | `text-slate-900 font-bold` |

### 4.4 Barbell Sleeve Visualization Architecture
The sleeve visualizer displays an authentic side view of a loaded barbell sleeve:
```
┌──────┬───┬───┬───┬───┬────────────────────────────────┐
│      │ 4 │ 3 │ 2 │ 1 │                                │
│COLLAR│ 5 │ 5 │ 5 │ 0 │        EMPTY SLEEVE TIP        │
│      │   │   │   │   │                                │
└──────┴───┴───┴───┴───┴────────────────────────────────┘
```
- **Sleeve Shaft**:
  - Inner Collar: Metallic chrome block (`w-5 h-36 bg-gradient-to-r from-slate-700 to-slate-500 rounded-l-md border-r-2 border-slate-800 shadow-lg`).
  - Bar Cylinder: Steel cylindrical axle (`h-7 bg-gradient-to-b from-slate-300 via-slate-400 to-slate-500 border-y border-slate-600 rounded-r-md`).
- **Plate Visual Sizing**:
  - 45 lb: Height 144px, Width 22px
  - 35 lb: Height 124px, Width 20px
  - 25 lb: Height 108px, Width 18px
  - 10 lb: Height 84px, Width 14px
  - 5 lb: Height 64px, Width 12px
  - 2.5 lb: Height 48px, Width 10px
- Plates are loaded flush against the collar from left to right in descending order (heaviest inside).

### 4.5 Full Component Blueprint: `PlateCalculatorWidget.tsx`
```tsx
import React, { useState, useMemo } from 'react';
import { 
  calculatePlates, 
  DEFAULT_PLATE_INVENTORY, 
  DEFAULT_BAR_WEIGHT, 
  type PlateInventory,
  type PlateCalculationResult
} from '../domain/plateCalculator';
import { Dumbbell, Plus, Minus, AlertCircle, CheckCircle2, Copy, Check, X } from 'lucide-react';

export interface PlateCalculatorWidgetProps {
  initialWeight?: number;
  inventory?: PlateInventory;
  barWeight?: number;
  onWeightChange?: (weight: number) => void;
  onClose?: () => void;
  className?: string;
}

// Strict Olympic Color Scheme Specification
const OLYMPIC_SPECS: Record<number, {
  colorHex: string;
  tailwindBg: string;
  tailwindBorder: string;
  textColor: string;
  heightPx: number;
  widthPx: number;
}> = {
  45: { colorHex: '#EF4444', tailwindBg: 'bg-red-600', tailwindBorder: 'border-red-700', textColor: 'text-white', heightPx: 144, widthPx: 22 },
  35: { colorHex: '#3B82F6', tailwindBg: 'bg-blue-600', tailwindBorder: 'border-blue-700', textColor: 'text-white', heightPx: 124, widthPx: 20 },
  25: { colorHex: '#EAB308', tailwindBg: 'bg-yellow-500', tailwindBorder: 'border-yellow-600', textColor: 'text-slate-950', heightPx: 108, widthPx: 18 },
  10: { colorHex: '#22C55E', tailwindBg: 'bg-green-600', tailwindBorder: 'border-green-700', textColor: 'text-white', heightPx: 84, widthPx: 14 },
  5: { colorHex: '#F8FAFC', tailwindBg: 'bg-slate-100', tailwindBorder: 'border-slate-300', textColor: 'text-slate-900', heightPx: 64, widthPx: 12 },
  2.5: { colorHex: '#94A3B8', tailwindBg: 'bg-slate-400', tailwindBorder: 'border-slate-500', textColor: 'text-slate-900', heightPx: 48, widthPx: 10 },
};

const PRESETS = [135, 185, 225, 275, 300];

export const PlateCalculatorWidget: React.FC<PlateCalculatorWidgetProps> = ({
  initialWeight = 135,
  inventory = DEFAULT_PLATE_INVENTORY,
  barWeight = DEFAULT_BAR_WEIGHT,
  onWeightChange,
  onClose,
  className = '',
}) => {
  const [targetWeight, setTargetWeight] = useState<number>(initialWeight);
  const [copied, setCopied] = useState<boolean>(false);

  const result: PlateCalculationResult = useMemo(() => {
    return calculatePlates(targetWeight, inventory, barWeight);
  }, [targetWeight, inventory, barWeight]);

  const updateWeight = (newWeight: number) => {
    const clamped = Math.max(0, newWeight);
    setTargetWeight(clamped);
    onWeightChange?.(clamped);
  };

  const handleCopySummary = () => {
    if (!result.platesPerSide.length) return;
    const text = `Barbell Load: ${result.achievableWeight} lbs (${barWeight} lb bar + [${result.platesPerSide.join(', ')}] per side)`;
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-slate-100 max-w-2xl mx-auto ${className}`}>
      
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-red-950/60 border border-red-800/50 text-red-400">
            <Dumbbell className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              Barbell Plate Loading Calculator
            </h3>
            <p className="text-xs text-slate-400">Optimal 128-State Subset-Sum (45–300 lbs)</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopySummary}
            title="Copy Plate Load to Clipboard"
            aria-label="Copy Plate Load"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-1.5 text-xs font-medium"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              aria-label="Close Plate Calculator"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Target Weight Controls */}
      <div className="my-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
        <div>
          <label htmlFor="target-weight-input" className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
            Target Barbell Load (lbs)
          </label>
          <div className="flex items-center gap-2">
            <input
              id="target-weight-input"
              type="number"
              value={targetWeight || ''}
              onChange={(e) => updateWeight(Number(e.target.value))}
              className="w-32 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xl font-mono font-bold text-white focus:outline-none focus:border-red-500 text-center"
              min="45"
              max="300"
              step="2.5"
            />
            <span className="text-slate-400 font-medium">lbs</span>
          </div>
        </div>

        {/* Step Increments */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => updateWeight(targetWeight - 5)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 active:scale-95 transition-all flex items-center gap-0.5"
          >
            <Minus className="w-3 h-3 text-red-400" /> 5 lb
          </button>
          <button
            onClick={() => updateWeight(targetWeight - 2.5)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 active:scale-95 transition-all flex items-center gap-0.5"
          >
            <Minus className="w-3 h-3 text-red-400" /> 2.5 lb
          </button>
          <button
            onClick={() => updateWeight(targetWeight + 2.5)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 active:scale-95 transition-all flex items-center gap-0.5"
          >
            <Plus className="w-3 h-3 text-emerald-400" /> 2.5 lb
          </button>
          <button
            onClick={() => updateWeight(targetWeight + 5)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 active:scale-95 transition-all flex items-center gap-0.5"
          >
            <Plus className="w-3 h-3 text-emerald-400" /> 5 lb
          </button>
        </div>
      </div>

      {/* Quick Presets Strip */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
        <span className="text-xs text-slate-400 font-semibold whitespace-nowrap">Presets:</span>
        {PRESETS.map((wt) => (
          <button
            key={wt}
            onClick={() => updateWeight(wt)}
            className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition-all ${
              targetWeight === wt
                ? 'bg-red-600 text-white shadow-md shadow-red-900/40'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            {wt} lb
          </button>
        ))}
      </div>

      {/* Barbell Sleeve Visualizer Container */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 mb-5 shadow-inner">
        <div className="flex items-center justify-between mb-3 text-xs">
          <span className="font-semibold text-slate-400">Barbell Sleeve Loading (Per Side)</span>
          <span className="font-mono text-slate-200 font-bold">
            Weight Per Side: <span className="text-emerald-400">{result.weightPerSide} lbs</span>
          </span>
        </div>

        {/* Tactile Sleeve Shaft Graphic */}
        <div className="relative h-44 flex items-center bg-slate-900/60 rounded-xl px-4 border border-slate-800/80 overflow-x-auto">
          {/* Inner Barbell Collar */}
          <div className="w-5 h-36 bg-gradient-to-r from-slate-700 via-slate-600 to-slate-500 rounded-l-md border-r-2 border-slate-900 shadow-xl flex-shrink-0 flex items-center justify-center">
            <span className="text-[8px] font-bold text-slate-400 -rotate-90">COLLAR</span>
          </div>

          {/* Plates Stack (Loaded from collar to tip) */}
          <div className="flex items-center gap-1 z-10 flex-shrink-0">
            {result.platesPerSide.map((plateWeight, index) => {
              const spec = OLYMPIC_SPECS[plateWeight] || {
                colorHex: '#64748B',
                tailwindBg: 'bg-slate-500',
                tailwindBorder: 'border-slate-600',
                textColor: 'text-white',
                heightPx: 80,
                widthPx: 16,
              };

              return (
                <div
                  key={`plate-${plateWeight}-${index}`}
                  style={{
                    height: `${spec.heightPx}px`,
                    width: `${spec.widthPx}px`,
                    backgroundColor: spec.colorHex,
                  }}
                  className={`rounded-md border shadow-lg flex items-center justify-center select-none transform transition-transform hover:scale-105 ${spec.tailwindBorder}`}
                  title={`${plateWeight} lb plate`}
                >
                  <span className={`text-[10px] font-black -rotate-90 tracking-tighter ${spec.textColor}`}>
                    {plateWeight}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Barbell Shaft Cylinder extending past plates */}
          <div className="flex-1 h-7 bg-gradient-to-b from-slate-300 via-slate-400 to-slate-500 border-y border-slate-600 rounded-r-md min-w-[80px] flex items-center justify-end pr-2 shadow-md">
            <span className="text-[9px] font-mono font-bold text-slate-700">45 LB BAR</span>
          </div>
        </div>

        {/* Empty Bar Notice */}
        {result.platesPerSide.length === 0 && (
          <p className="text-center text-xs text-slate-400 mt-2 font-medium">
            Empty Olympic Barbell (45 lbs). Zero plates loaded.
          </p>
        )}
      </div>

      {/* Breakdown Badges & Calculation Details */}
      <div className="space-y-3">
        {/* Status Callout Banner */}
        <div className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 ${
          result.isExact
            ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
            : 'bg-amber-950/40 border-amber-800 text-amber-300'
        }`}>
          {result.isExact ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          )}
          <span>{result.message}</span>
        </div>

        {/* Summary Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Total Load</span>
            <span className="font-mono text-base font-bold text-white">{result.achievableWeight} lbs</span>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Plates Per Side</span>
            <span className="font-mono text-base font-bold text-emerald-400">
              {result.platesPerSide.length > 0 ? `[${result.platesPerSide.join(', ')}]` : 'None'}
            </span>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Total Plates</span>
            <span className="font-mono text-base font-bold text-white">{result.totalPlatesUsed}</span>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Remainder</span>
            <span className="font-mono text-base font-bold text-slate-300">{result.remainder} lbs</span>
          </div>
        </div>

        {/* Color Legend */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-2 text-[10px] text-slate-400">
          <span className="font-semibold uppercase tracking-wider">Olympic Color Key:</span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block" /> 45</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" /> 35</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block" /> 25</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-600 inline-block" /> 10</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-slate-100 inline-block" /> 5</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block" /> 2.5</span>
          </div>
        </div>
      </div>

    </div>
  );
};
```

---

## 5. Global App Layout & Cross-Widget Integration

In `App.tsx`, these three widgets work in synergy with `SessionNav`, `ExerciseCard`, and `Header`:
1. **Persistent Bottom Bar Rest Timer**:
   - `RestTimerWidget` renders in docked mode at `fixed bottom-0` across all tabs.
   - Any completed set checkbox on an `ExerciseCard` can trigger the timer automatically according to the exercise's prescribed tier:
     - Tier 1 Squat/Bench set completed $\rightarrow$ Triggers 240s rest preset.
     - Tier 2 Compound set completed $\rightarrow$ Triggers 120s rest preset.
     - Tier 3 Accessory set completed $\rightarrow$ Triggers 60s rest preset.
     - Effective Reps set completed $\rightarrow$ Triggers 15s rest preset.
2. **Tempo Quick-Launch from Exercise Cards**:
   - When an exercise has a tempo tag (e.g. `Tempo: 30X1` on Marcus Filly Single-Arm KB Press), tapping the tempo badge opens `TempoMetronomeWidget` pre-configured to `30X1` with target reps matching the target set.
3. **Barbell Plate Calculator Drawer**:
   - Tapping any barbell weight badge (e.g. `225 lbs` on Box Squats) opens `PlateCalculatorWidget` initialized to that exact load, showing the lifter how to plate their barbell in seconds.

---

## 6. Comprehensive Automated Test Strategy

To achieve 100% test passing across the Vitest + React Testing Library test suite, the following three test files must be implemented in `tests/components/`:

### 6.1 `tests/components/RestTimerWidget.test.tsx`
- **Initial Render**:
  - Confirms circular SVG with `r=54` and correct `strokeDashoffset`.
  - Confirms digital `01:00` display for default 60s.
  - Confirms 8 quick presets render with correct labels (`15s`, `30s`, `60s`, `90s`, `120s`, `180s`, `240s`, `300s`).
- **Control Interactions**:
  - Clicking "Start" initiates countdown and updates status badge to "Resting".
  - Clicking "Pause" transitions state to "Paused" and freezes countdown.
  - Clicking "Resume" resumes countdown.
  - Clicking "Reset" restores duration to initial value and returns to "Ready".
- **Time Bumpers**:
  - Clicking `+15s` adds 15 seconds to remaining duration and updates digital display.
  - Clicking `+30s` adds 30 seconds to remaining duration.
- **Preset Selection**:
  - Clicking `15s` (Effective Reps) sets timer to 15s.
  - Clicking `240s` (Tier 1) sets timer to 240s (`04:00`).
- **Audio Dispatch**:
  - Verifies audioSynthesizer triggers `warning` at 3, 2, 1s and `completion` at 0s.
  - Mute button correctly calls `audioSynthesizer.setMuted(true)`.
- **Docking Toggle**:
  - Toggling expand/minimize correctly transitions between bottom pill and full control drawer.

### 6.2 `tests/components/TempoMetronomeWidget.test.tsx`
- **Initial Render & Parsing**:
  - Renders 4 cadence tiles for default `30X1`: `3s` (Eccentric), `0s` (Bottom), `X` (Concentric), `1s` (Top).
  - SVG circle renders with radius 56.
- **Phase Highlighting**:
  - Starting metronome highlights `eccentric` tile with blue color `#3B82F6`.
  - Advancing time transitions highlight to `concentric` with emerald color `#10B981`.
- **Rep Progression & Target Rep Auto-Stop**:
  - Completing a full cadence increments current rep count (`Rep 1 of 10` $\rightarrow$ `Rep 2 of 10`).
  - Reaching target reps stops ticker, triggers set complete callback, and renders green completion banner.
- **Custom Input Validation**:
  - Entering invalid tempo (`"99"` or `"ABCD"`) displays validation error message.
  - Entering valid tempo (`"4010"`) updates tiles to `4s`, `0s`, `1s`, `0s`.
- **Audio Toggle**:
  - Toggling sound button toggles internal soundEnabled state.

### 6.3 `tests/components/PlateCalculatorWidget.test.tsx`
- **Subset-Sum Verification**:
  - Default 135 lbs: Displays `45 lb` plate per side.
  - 165 lbs (greedy trap): Displays `[35, 25]` plates per side (not greedy `[45, 10, 5]`).
  - 185 lbs: Displays `[45, 25]` plates per side.
  - 225 lbs: Displays `[45, 35, 10]` plates per side.
  - 300 lbs: Displays maximum loaded sleeve `[45, 35, 25, 10, 5, 5, 2.5]`.
- **Olympic Colors Verification**:
  - 45s rendered with red `#EF4444`.
  - 35s rendered with blue `#3B82F6`.
  - 25s rendered with yellow `#EAB308`.
  - 10s rendered with green `#22C55E`.
  - 5s rendered with white `#F8FAFC`.
  - 2.5s rendered with silver `#94A3B8`.
- **Boundary Handling**:
  - Target weight $< 45$ lbs: Displays warning that target is below empty bar.
  - Target weight $> 300$ lbs: Displays warning that target exceeds maximum capacity.
- **Step Bumping**:
  - Clicking `+5 lb` increases weight by 5 lbs and re-computes sleeve.
  - Clicking `+2.5 lb` increases weight by 2.5 lbs and re-computes sleeve.
- **Clipboard Copy**:
  - Clicking "Copy" calls `navigator.clipboard.writeText` with summary string.

---

## 7. Deliverable Summary

All specifications in this document provide complete, copy-paste ready TypeScript blueprints and styling tokens. The implementer (Worker) can implement `RestTimerWidget.tsx`, `TempoMetronomeWidget.tsx`, and `PlateCalculatorWidget.tsx` directly against these specifications without ambiguity.
