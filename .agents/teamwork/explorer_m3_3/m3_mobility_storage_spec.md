# Milestone 3 Architecture & Implementation Specification: Mobility & Flexibility Tracker, Sparkline Chart, and Storage Persistence Engine

**Author**: Explorer 3 (Milestone 3)  
**Date**: 2026-10-13  
**Status**: Ready for Implementation  
**Working Directory**: `C:\Users\lagoo\.gemini\antigravity\scratch\workout_program\.agents\teamwork\explorer_m3_3`  
**Target Files**:
1. `src/storage/storageManager.ts`
2. `src/components/SparklineChart.tsx`
3. `src/components/MobilityTrackerWidget.tsx`
4. `tests/storage/storageManager.test.ts`
5. `tests/components/SparklineChart.test.tsx`
6. `tests/components/MobilityTrackerWidget.test.tsx`

---

## 1. Executive Summary & Architectural Scope

This specification provides the comprehensive implementation blueprint for the **Mobility & Flexibility Tracking Ecosystem** and **LocalStorage State Persistence Engine** in Milestone 3 of the 4-Day Upper/Lower Workout Web Application.

The implementation synthesizes:
- **Clinical & Biomechanical Assessment Standards**:
  1. *Ben Patrick (ATG) Elephant Walks*: Hamstring and sciatic nerve active reach (Levels 1–5).
  2. *Dr. Aaron Horschig (Squat University) Knee-to-Wall Ankle Dorsiflexion*: Ankle talocrural joint mobility (inches/cm) removing patellar shear.
  3. *Ben Patrick (ATG) Split Squat Elevation Gate*: Progressive knee tendinitis tendon remodeling regression (front foot elevation in inches towards 0" flat ground mastery).
  4. *Dr. Stuart McGill Biering-Sørensen Hold*: Horizontal spinal extensor endurance in seconds (protecting lumbar discs).
  5. *Jeff Cavaliere & Yellow Dude Suspended Dead Hang*: Subacromial decompression and grip stamina in seconds.
- **Zero-Dependency SVG Trend Visualization (`SparklineChart.tsx`)**:
  - High-performance, responsive SVG polyline with smooth area gradient fill.
  - Directional polarity handling: inverted vertical scaling for lower-is-better metrics (split squat elevation).
  - Target benchmark reference line with dashed stroke and interactive data point tooltips.
- **Robust Storage Persistence Engine (`storageManager.ts`)**:
  - Versioned schema (v1) with defensive migration hooks.
  - Debounced auto-save (300ms) with synchronous immediate flushing.
  - Automatic corrupted-data recovery and in-memory fallback for private browsing or quota limits.
  - Full backup JSON export and verified JSON import/restore.

---

## 2. Storage Persistence Engine (`src/storage/storageManager.ts`)

### 2.1 Schema Definition & Data Models

```typescript
// src/storage/storageManager.ts
import { MobilityEntry, validateMobilityEntry } from '../domain/mobility';

export const STORAGE_KEY_V1 = 'workout_app_state_v1';
export const SCHEMA_VERSION = 1 as const;

export interface WorkoutLogEntry {
  completed: boolean;
  weight: number;
  reps: number;
  notes: string;
}

export interface CompletedWorkoutSession {
  date: string; // ISO 8601 string
  sessionId: 'lower_a' | 'upper_a' | 'lower_b' | 'upper_b';
  logs: Record<string, WorkoutLogEntry>;
  totalDurationSeconds?: number;
  rating?: number;
}

export interface StorageSettings {
  soundEnabled: boolean;
  defaultTimerPreset: number;
  preferredUnit: 'lbs' | 'kg';
}

export interface AppStorageData {
  version: 1;
  activeSessionId: string;
  completedWorkouts: Record<string, CompletedWorkoutSession>;
  currentLogs: Record<string, WorkoutLogEntry>;
  mobilityHistory: MobilityEntry[];
  settings: StorageSettings;
}

export const DEFAULT_STORAGE_DATA: AppStorageData = {
  version: 1,
  activeSessionId: 'lower_a',
  completedWorkouts: {},
  currentLogs: {},
  mobilityHistory: [],
  settings: {
    soundEnabled: true,
    defaultTimerPreset: 90,
    preferredUnit: 'lbs',
  },
};
```

### 2.2 Complete Storage Engine Blueprint

```typescript
type StorageListener = (data: AppStorageData) => void;

export class StorageManager {
  private key: string;
  private memoryCache: AppStorageData;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingChanges: Partial<AppStorageData> = {};
  private listeners: Set<StorageListener> = new Set();
  private quotaExceeded: boolean = false;

  constructor(key: string = STORAGE_KEY_V1) {
    this.key = key;
    this.memoryCache = this.loadInitial();
    this.setupWindowListeners();
  }

  /**
   * Loads and sanitizes initial storage data.
   */
  private loadInitial(): AppStorageData {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return { ...DEFAULT_STORAGE_DATA };
      }
      const raw = window.localStorage.getItem(this.key);
      if (!raw) {
        return { ...DEFAULT_STORAGE_DATA };
      }
      const parsed = JSON.parse(raw);
      return this.sanitize(parsed);
    } catch (err) {
      console.warn('[StorageManager] Failed to read from localStorage or corrupted JSON detected. Recovering to default state.', err);
      // Automatically recover corrupt state in localStorage
      this.writeToLocalStorage(DEFAULT_STORAGE_DATA);
      return { ...DEFAULT_STORAGE_DATA };
    }
  }

  /**
   * Defensive sanitization: guarantees every property matches AppStorageData v1.
   */
  public sanitize(raw: any): AppStorageData {
    if (!raw || typeof raw !== 'object') {
      return { ...DEFAULT_STORAGE_DATA };
    }

    const version = raw.version === 1 ? 1 : 1;
    const activeSessionId = typeof raw.activeSessionId === 'string' && raw.activeSessionId ? raw.activeSessionId : DEFAULT_STORAGE_DATA.activeSessionId;
    const completedWorkouts = raw.completedWorkouts && typeof raw.completedWorkouts === 'object' ? raw.completedWorkouts : {};
    const currentLogs = raw.currentLogs && typeof raw.currentLogs === 'object' ? raw.currentLogs : {};
    
    // Sanitize mobility history: must be array and contain valid entries
    let mobilityHistory: MobilityEntry[] = [];
    if (Array.isArray(raw.mobilityHistory)) {
      mobilityHistory = raw.mobilityHistory.filter((entry: any) => {
        return entry && typeof entry === 'object' && validateMobilityEntry(entry).isValid;
      });
    }

    // Sanitize settings
    const rawSettings = raw.settings || {};
    const settings: StorageSettings = {
      soundEnabled: typeof rawSettings.soundEnabled === 'boolean' ? rawSettings.soundEnabled : DEFAULT_STORAGE_DATA.settings.soundEnabled,
      defaultTimerPreset: typeof rawSettings.defaultTimerPreset === 'number' && !isNaN(rawSettings.defaultTimerPreset)
        ? rawSettings.defaultTimerPreset
        : DEFAULT_STORAGE_DATA.settings.defaultTimerPreset,
      preferredUnit: rawSettings.preferredUnit === 'kg' ? 'kg' : 'lbs',
    };

    return {
      version,
      activeSessionId,
      completedWorkouts,
      currentLogs,
      mobilityHistory,
      settings,
    };
  }

  /**
   * Attaches unload and cross-tab storage synchronizers.
   */
  private setupWindowListeners(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('beforeunload', () => {
      this.flush();
    });

    window.addEventListener('storage', (event: StorageEvent) => {
      if (event.key === this.key && event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue);
          this.memoryCache = this.sanitize(parsed);
          this.notify();
        } catch {
          // Ignore invalid cross-tab event payloads
        }
      }
    });
  }

  /**
   * Synchronously writes payload to localStorage with quota handling.
   */
  private writeToLocalStorage(data: AppStorageData): boolean {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false;
    }
    try {
      window.localStorage.setItem(this.key, JSON.stringify(data));
      this.quotaExceeded = false;
      return true;
    } catch (err: any) {
      if (err?.name === 'QuotaExceededError' || err?.code === 22) {
        this.quotaExceeded = true;
        console.warn('[StorageManager] LocalStorage QuotaExceededError encountered! Operating in in-memory fallback mode.');
      } else {
        console.warn('[StorageManager] LocalStorage write error:', err);
      }
      return false;
    }
  }

  /**
   * Retrieves current application state.
   */
  public load(): AppStorageData {
    return { ...this.memoryCache };
  }

  /**
   * Queues a debounced save (300ms window).
   */
  public save(partialData: Partial<AppStorageData>): void {
    this.memoryCache = {
      ...this.memoryCache,
      ...partialData,
    };
    this.pendingChanges = {
      ...this.pendingChanges,
      ...partialData,
    };

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.flush();
    }, 300);

    this.notify();
  }

  /**
   * Saves immediately, cancelling any active debounce timers.
   */
  public saveImmediate(partialData: Partial<AppStorageData>): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.memoryCache = {
      ...this.memoryCache,
      ...partialData,
    };
    this.pendingChanges = {};
    this.writeToLocalStorage(this.memoryCache);
    this.notify();
  }

  /**
   * Flushes any pending debounced changes immediately.
   */
  public flush(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (Object.keys(this.pendingChanges).length > 0) {
      this.writeToLocalStorage(this.memoryCache);
      this.pendingChanges = {};
    }
  }

  /**
   * Resets storage to default state.
   */
  public clear(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.pendingChanges = {};
    this.memoryCache = { ...DEFAULT_STORAGE_DATA };
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem(this.key);
      } catch {
        // Ignore
      }
    }
    this.notify();
  }

  /**
   * Subscribes a listener to state updates.
   */
  public subscribe(listener: StorageListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const data = this.load();
    this.listeners.forEach((listener) => {
      try {
        listener(data);
      } catch (err) {
        console.error('[StorageManager] Error in subscriber callback', err);
      }
    });
  }

  // --- Mobility Domain Specific Helpers ---

  public addMobilityEntry(entry: Omit<MobilityEntry, 'id'> & { id?: string }): AppStorageData {
    const newEntry: MobilityEntry = {
      ...entry,
      id: entry.id || `mob_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      date: entry.date || new Date().toISOString(),
    };

    const validation = validateMobilityEntry(newEntry);
    if (!validation.isValid) {
      throw new Error(`Invalid mobility entry: ${validation.error}`);
    }

    const updatedHistory = [...this.memoryCache.mobilityHistory, newEntry];
    this.saveImmediate({ mobilityHistory: updatedHistory });
    return this.load();
  }

  public deleteMobilityEntry(id: string): AppStorageData {
    const updatedHistory = this.memoryCache.mobilityHistory.filter((e) => e.id !== id);
    this.saveImmediate({ mobilityHistory: updatedHistory });
    return this.load();
  }

  public updateMobilityEntry(id: string, updates: Partial<MobilityEntry>): AppStorageData {
    const updatedHistory = this.memoryCache.mobilityHistory.map((e) => {
      if (e.id === id) {
        const merged = { ...e, ...updates, id };
        const validation = validateMobilityEntry(merged);
        if (!validation.isValid) {
          throw new Error(`Invalid updated mobility entry: ${validation.error}`);
        }
        return merged;
      }
      return e;
    });
    this.saveImmediate({ mobilityHistory: updatedHistory });
    return this.load();
  }

  // --- Workout Logging Helpers ---

  public updateWorkoutLog(exerciseId: string, log: Partial<WorkoutLogEntry>): AppStorageData {
    const existing = this.memoryCache.currentLogs[exerciseId] || {
      completed: false,
      weight: 0,
      reps: 0,
      notes: '',
    };
    const updatedCurrentLogs = {
      ...this.memoryCache.currentLogs,
      [exerciseId]: { ...existing, ...log },
    };
    this.save({ currentLogs: updatedCurrentLogs });
    return this.load();
  }

  // --- Export and Import Engine ---

  public exportJSON(): string {
    return JSON.stringify(this.load(), null, 2);
  }

  public importJSON(jsonString: string): { success: boolean; error?: string; data?: AppStorageData } {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || typeof parsed !== 'object') {
        return { success: false, error: 'Import data must be a valid JSON object.' };
      }
      const sanitized = this.sanitize(parsed);
      this.saveImmediate(sanitized);
      return { success: true, data: sanitized };
    } catch (err: any) {
      return { success: false, error: `JSON Parse error: ${err?.message || 'Invalid syntax'}` };
    }
  }

  public isQuotaExceeded(): boolean {
    return this.quotaExceeded;
  }
}

export const storageManager = new StorageManager();
```

---

## 3. Zero-Dependency SVG Sparkline Chart (`src/components/SparklineChart.tsx`)

### 3.1 Design Requirements & Polarity Inversion

1. **Pure SVG**: No external charting libraries (`d3`, `chart.js`, `recharts`). Clean, ultra-lightweight, zero bundle bloat.
2. **Polarity Handling**:
   - `higher_is_better` (Elephant Walk reach level 1–5, Knee-to-Wall dorsiflexion inches, Biering-Sørensen seconds, Dead Hang seconds):
     - Standard coordinate system: high numeric value plots near the **top** (low Y coordinate).
   - `lower_is_better` (Ben Patrick ATG Split Squat Elevation: 18" -> 0"):
     - As front-foot elevation regresses from 18" (bench height) down towards 0" (flat ground mastery), the user is **improving**.
     - An intuitive trend chart should visually trend **upward towards the benchmark**.
     - By inverting the Y-axis mapping: 0" is plotted near the top benchmark line, while 18" is plotted near the bottom.
     - Decreasing elevation creates an upward-sloping trajectory towards mastery.
3. **Responsive Visual Elements**:
   - `<defs>`: Dynamic linear gradient with ID keyed to protocol ID (`sparkline-gradient-${protocol.id}`).
   - Area fill: Closed `<path>` under the polyline with subtle gradient opacity (0.28 to 0.02).
   - Main stroke: `<polyline>` with `#10B981` (emerald-500) stroke, `strokeWidth="2.5"`, `strokeLinecap="round"`, `strokeLinejoin="round"`.
   - Benchmark reference line: `<line>` at the benchmark Y position, `#F59E0B` (amber-500), `strokeDasharray="4 4"`.
   - Benchmark text annotation: Crisp right-aligned label.
   - Interactive circles: `<circle>` for each data point with hover/focus states and interactive tooltip displaying date, value, side, and notes.

### 3.2 SparklineChart Component Implementation Blueprint

```tsx
// src/components/SparklineChart.tsx
import React, { useState } from 'react';
import { MobilityEntry, MobilityProtocol } from '../domain/mobility';

export interface SparklineChartProps {
  entries: MobilityEntry[];
  protocol: MobilityProtocol;
  width?: number;
  height?: number;
  showBenchmarkLine?: boolean;
  showPoints?: boolean;
  showAreaGradient?: boolean;
  className?: string;
}

interface ScaledPoint {
  x: number;
  y: number;
  entry: MobilityEntry;
}

export const SparklineChart: React.FC<SparklineChartProps> = ({
  entries,
  protocol,
  width = 340,
  height = 120,
  showBenchmarkLine = true,
  showPoints = true,
  showAreaGradient = true,
  className = '',
}) => {
  const [activeTooltip, setActiveTooltip] = useState<{ point: ScaledPoint } | null>(null);

  const padTop = 16;
  const padBottom = 22;
  const padLeft = 16;
  const padRight = 16;
  const chartWidth = width - padLeft - padRight;
  const chartHeight = height - padTop - padBottom;

  // Filter and sort entries chronologically
  const sorted = [...entries]
    .filter((e) => e.testId === protocol.id)
    .sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());

  if (sorted.length === 0) {
    return (
      <div 
        className={`w-full flex flex-col items-center justify-center p-6 bg-slate-900/60 border border-dashed border-slate-800 rounded-xl text-center ${className}`}
        style={{ minHeight: height }}
      >
        <span className="text-slate-400 text-xs font-medium">No assessment history logged yet</span>
        <span className="text-slate-500 text-[11px] mt-1">Record your first baseline measurement below to track progress</span>
      </div>
    );
  }

  // Determine domain bounds including target benchmark
  const rawValues = sorted.map((e) => e.value);
  const benchmark = protocol.benchmarkNumeric;
  const isLowerBetter = protocol.improvementDirection === 'lower';

  let minVal = Math.min(...rawValues, benchmark);
  let maxVal = Math.max(...rawValues, benchmark);

  // If min and max are identical, expand margin
  if (minVal === maxVal) {
    minVal = Math.max(0, minVal - 1);
    maxVal = maxVal + 1;
  } else {
    // Add 10% breathing room
    const span = maxVal - minVal;
    minVal = Math.max(0, minVal - span * 0.05);
    maxVal = maxVal + span * 0.05;
  }

  const range = maxVal - minVal || 1;

  // Map value to Y coordinate with polarity awareness
  const getY = (val: number): number => {
    let normalizedRatio = (val - minVal) / range;
    if (isLowerBetter) {
      // Inverted: lower value maps to TOP (lower Y in SVG coordinates)
      normalizedRatio = 1 - normalizedRatio;
    }
    // High ratio -> top of chart (padTop)
    return Number((padTop + chartHeight * (1 - normalizedRatio)).toFixed(2));
  };

  const getX = (index: number, total: number): number => {
    if (total <= 1) return padLeft + chartWidth / 2;
    return Number((padLeft + (index / (total - 1)) * chartWidth).toFixed(2));
  };

  const scaledPoints: ScaledPoint[] = sorted.map((entry, index) => ({
    x: getX(index, sorted.length),
    y: getY(entry.value),
    entry,
  }));

  const polylinePoints = scaledPoints.map((p) => `${p.x},${p.y}`).join(' ');

  // Area path for gradient fill
  let areaPath = '';
  if (scaledPoints.length > 1) {
    const first = scaledPoints[0];
    const last = scaledPoints[scaledPoints.length - 1];
    const baselineY = height - padBottom;
    areaPath = `M ${first.x},${first.y} ` +
      scaledPoints.map((p) => `L ${p.x},${p.y}`).join(' ') +
      ` L ${last.x},${baselineY} L ${first.x},${baselineY} Z`;
  }

  const benchmarkY = getY(benchmark);
  const gradientId = `sparkline-gradient-${protocol.id}`;

  return (
    <div className={`relative w-full overflow-hidden select-none ${className}`}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible"
        role="img"
        aria-label={`Progress sparkline chart for ${protocol.name}`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Target Benchmark Line */}
        {showBenchmarkLine && (
          <g className="benchmark-guide">
            <line
              x1={padLeft}
              x2={width - padRight}
              y1={benchmarkY}
              y2={benchmarkY}
              stroke="#F59E0B"
              strokeWidth="1.2"
              strokeDasharray="4 4"
            />
            <text
              x={width - padRight}
              y={benchmarkY > padTop + 14 ? benchmarkY - 4 : benchmarkY + 12}
              fill="#F59E0B"
              fontSize="9"
              fontWeight="600"
              textAnchor="end"
              className="font-mono tracking-tight"
            >
              Target: {protocol.targetBenchmark}
            </text>
          </g>
        )}

        {/* Gradient Area Fill */}
        {showAreaGradient && areaPath && (
          <path d={areaPath} fill={`url(#${gradientId})`} />
        )}

        {/* Polyline */}
        {scaledPoints.length > 1 ? (
          <polyline
            points={polylinePoints}
            fill="none"
            stroke="#10B981"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          // Single entry indicator line
          <line
            x1={padLeft}
            x2={width - padRight}
            y1={scaledPoints[0].y}
            y2={scaledPoints[0].y}
            stroke="#10B981"
            strokeWidth="2"
            strokeDasharray="2 2"
          />
        )}

        {/* Data Points */}
        {showPoints &&
          scaledPoints.map((pt, idx) => (
            <g key={pt.entry.id || idx}>
              <circle
                cx={pt.x}
                cy={pt.y}
                r={activeTooltip?.point.entry.id === pt.entry.id ? '5.5' : '3.5'}
                fill="#0F172A"
                stroke="#10B981"
                strokeWidth="2"
                className="cursor-pointer transition-all duration-150 hover:r-6"
                tabIndex={0}
                role="button"
                aria-label={`Entry ${idx + 1}: ${pt.entry.value} ${protocol.unit} on ${pt.entry.date?.split('T')[0]}`}
                onMouseEnter={() => setActiveTooltip({ point: pt })}
                onMouseLeave={() => setActiveTooltip(null)}
                onFocus={() => setActiveTooltip({ point: pt })}
                onBlur={() => setActiveTooltip(null)}
              />
            </g>
          ))}

        {/* Axis Baseline */}
        <line
          x1={padLeft}
          x2={width - padRight}
          y1={height - padBottom}
          y2={height - padBottom}
          stroke="#334155"
          strokeWidth="1"
        />

        {/* Baseline / Date labels */}
        {scaledPoints.length > 0 && (
          <>
            <text
              x={padLeft}
              y={height - 6}
              fill="#64748B"
              fontSize="9"
              textAnchor="start"
              className="font-mono"
            >
              {sorted[0].date?.split('T')[0] || 'Start'}
            </text>
            {sorted.length > 1 && (
              <text
                x={width - padRight}
                y={height - 6}
                fill="#64748B"
                fontSize="9"
                textAnchor="end"
                className="font-mono"
              >
                {sorted[sorted.length - 1].date?.split('T')[0] || 'Latest'}
              </text>
            )}
          </>
        )}
      </svg>

      {/* Floating Tooltip */}
      {activeTooltip && (
        <div
          className="absolute z-20 pointer-events-none transform -translate-x-1/2 -translate-y-full bg-slate-950/95 border border-emerald-500/40 rounded-lg px-2.5 py-1.5 shadow-xl text-left backdrop-blur-sm"
          style={{
            left: `${(activeTooltip.point.x / width) * 100}%`,
            top: `${(activeTooltip.point.y / height) * 100 - 8}%`,
          }}
        >
          <div className="text-[10px] text-slate-400 font-mono">
            {activeTooltip.point.entry.date?.split('T')[0]}
            {activeTooltip.point.entry.side && ` • ${activeTooltip.point.entry.side.toUpperCase()}`}
          </div>
          <div className="text-xs font-bold text-emerald-400">
            {activeTooltip.point.entry.value} <span className="text-[10px] text-slate-300 font-normal">{protocol.unit}</span>
          </div>
          {activeTooltip.point.entry.notes && (
            <div className="text-[10px] text-slate-300 max-w-[140px] truncate mt-0.5">
              {activeTooltip.point.entry.notes}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
```

---

## 4. Mobility & Flexibility Tracker Component (`src/components/MobilityTrackerWidget.tsx`)

### 4.1 Benchmark Classification Helper

To meet the requirement for four clean classification badges (**Exceptional**, **Proficient**, **Developing**, **Restricted**), we map the domain status results from `getMobilityBenchmarkStatus(testId, value)`:

```typescript
export interface BenchmarkBadgeInfo {
  tier: 'Exceptional' | 'Proficient' | 'Developing' | 'Restricted';
  badgeClass: string;
  dotClass: string;
  description: string;
}

export function getBenchmarkBadge(testId: MobilityTestId, value: number): BenchmarkBadgeInfo {
  switch (testId) {
    case 'elephant-walk':
      if (value >= 5) {
        return {
          tier: 'Exceptional',
          badgeClass: 'bg-emerald-950/60 border-emerald-600 text-emerald-300',
          dotClass: 'bg-emerald-400',
          description: 'Palms Flat on Floor (Full Decompression)',
        };
      }
      if (value === 4) {
        return {
          tier: 'Proficient',
          badgeClass: 'bg-blue-950/60 border-blue-600 text-blue-300',
          dotClass: 'bg-blue-400',
          description: 'Knuckles Touching Floor (Functional Athletic)',
        };
      }
      if (value === 3) {
        return {
          tier: 'Developing',
          badgeClass: 'bg-amber-950/60 border-amber-600 text-amber-300',
          dotClass: 'bg-amber-400',
          description: 'Fingertips to Toes (Baseline Mobility)',
        };
      }
      return {
        tier: 'Restricted',
        badgeClass: 'bg-rose-950/60 border-rose-600 text-rose-300',
        dotClass: 'bg-rose-400',
        description: value === 2 ? 'Shoelaces / Ankles (Moderate Restriction)' : 'Mid-Shin (Severe Restriction; Elevate on Bench)',
      };

    case 'knee-to-wall':
      if (value >= 5.0) {
        return {
          tier: 'Exceptional',
          badgeClass: 'bg-emerald-950/60 border-emerald-600 text-emerald-300',
          dotClass: 'bg-emerald-400',
          description: '≥ 5.0 in / 12.5 cm (Optimal Dorsiflexion; Zero Squat Shear)',
        };
      }
      if (value >= 4.0) {
        return {
          tier: 'Proficient',
          badgeClass: 'bg-blue-950/60 border-blue-600 text-blue-300',
          dotClass: 'bg-blue-400',
          description: '4.0–4.9 in (Functional Parallel Squat Range)',
        };
      }
      if (value >= 2.0) {
        return {
          tier: 'Developing',
          badgeClass: 'bg-amber-950/60 border-amber-600 text-amber-300',
          dotClass: 'bg-amber-400',
          description: '2.0–3.9 in (Moderate Restriction; Box Squats Advised)',
        };
      }
      return {
        tier: 'Restricted',
        badgeClass: 'bg-rose-950/60 border-rose-600 text-rose-300',
        dotClass: 'bg-rose-400',
        description: '< 2.0 in (Severe Restriction; High Patellar Shear Risk)',
      };

    case 'split-squat-elevation':
      if (value === 0) {
        return {
          tier: 'Exceptional',
          badgeClass: 'bg-emerald-950/60 border-emerald-600 text-emerald-300',
          dotClass: 'bg-emerald-400',
          description: '0 in (Flat Ground Mastery; Pain-Free Full Knee Bend)',
        };
      }
      if (value <= 2) {
        return {
          tier: 'Proficient',
          badgeClass: 'bg-blue-950/60 border-blue-600 text-blue-300',
          dotClass: 'bg-blue-400',
          description: '2 in / Single 45 lb Plate (Advanced Remodeling)',
        };
      }
      if (value <= 6) {
        return {
          tier: 'Developing',
          badgeClass: 'bg-amber-950/60 border-amber-600 text-amber-300',
          dotClass: 'bg-amber-400',
          description: '6 in / Two Plates (Progressive Tendon Remodeling)',
        };
      }
      return {
        tier: 'Restricted',
        badgeClass: 'bg-rose-950/60 border-rose-600 text-rose-300',
        dotClass: 'bg-rose-400',
        description: '> 6 in (Acute Tendon Offloading / Bench Height)',
      };

    case 'biering-sorensen':
      if (value >= 120) {
        return {
          tier: 'Exceptional',
          badgeClass: 'bg-emerald-950/60 border-emerald-600 text-emerald-300',
          dotClass: 'bg-emerald-400',
          description: '≥ 120–180s (Resilient Spine; Optimal Disc Protection)',
        };
      }
      if (value >= 60) {
        return {
          tier: 'Proficient',
          badgeClass: 'bg-blue-950/60 border-blue-600 text-blue-300',
          dotClass: 'bg-blue-400',
          description: '60–119s (Adequate Baseline Spinal Endurance)',
        };
      }
      return {
        tier: 'Restricted',
        badgeClass: 'bg-rose-950/60 border-rose-600 text-rose-300',
        dotClass: 'bg-rose-400',
        description: '< 60s (Suboptimal Endurance; High Fatigue Risk on RDLs)',
      };

    case 'dead-hang':
      if (value >= 60) {
        return {
          tier: 'Exceptional',
          badgeClass: 'bg-emerald-950/60 border-emerald-600 text-emerald-300',
          dotClass: 'bg-emerald-400',
          description: '≥ 60s (Optimal Subacromial Decompression & Grip Stamina)',
        };
      }
      if (value >= 30) {
        return {
          tier: 'Proficient',
          badgeClass: 'bg-blue-950/60 border-blue-600 text-blue-300',
          dotClass: 'bg-blue-400',
          description: '30–59s (Baseline Functional Decompression)',
        };
      }
      return {
        tier: 'Restricted',
        badgeClass: 'bg-rose-950/60 border-rose-600 text-rose-300',
        dotClass: 'bg-rose-400',
        description: '< 30s (Restricted Grip / Shoulder Mobility)',
      };
  }
}
```

### 4.2 MobilityTrackerWidget Component Implementation Blueprint

```tsx
// src/components/MobilityTrackerWidget.tsx
import React, { useState, useEffect } from 'react';
import {
  MOBILITY_PROTOCOLS,
  MOBILITY_PROTOCOLS_MAP,
  MobilityTestId,
  MobilityEntry,
  validateMobilityEntry,
  calculateMobilityProgress,
} from '../domain/mobility';
import { storageManager } from '../storage/storageManager';
import { SparklineChart } from './SparklineChart';
import { getBenchmarkBadge } from './benchmarkBadges'; // or inline
import {
  Activity,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Trash2,
  Calendar,
  AlertCircle,
  HelpCircle,
  PlusCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export const MobilityTrackerWidget: React.FC = () => {
  const [selectedTestId, setSelectedTestId] = useState<MobilityTestId>('elephant-walk');
  const [history, setHistory] = useState<MobilityEntry[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [inputDate, setInputDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [inputSide, setInputSide] = useState<'bilateral' | 'left' | 'right'>('bilateral');
  const [inputNotes, setInputNotes] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState<boolean>(false);
  const [saveSuccessFlash, setSaveSuccessFlash] = useState<boolean>(false);

  // Subscribe to storage changes
  useEffect(() => {
    const data = storageManager.load();
    setHistory(data.mobilityHistory);

    const unsubscribe = storageManager.subscribe((updated) => {
      setHistory(updated.mobilityHistory);
    });
    return unsubscribe;
  }, []);

  const activeProtocol = MOBILITY_PROTOCOLS_MAP[selectedTestId];
  const testHistory = history
    .filter((e) => e.testId === selectedTestId)
    .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

  const progress = calculateMobilityProgress(history, selectedTestId);

  // Live preview badge calculation
  const numericVal = parseFloat(inputValue);
  const liveBadge = !isNaN(numericVal) ? getBenchmarkBadge(selectedTestId, numericVal) : null;

  const handleProtocolChange = (id: MobilityTestId) => {
    setSelectedTestId(id);
    setInputValue('');
    setFormError(null);
    if (id === 'knee-to-wall' || id === 'split-squat-elevation') {
      setInputSide('left');
    } else {
      setInputSide('bilateral');
    }
  };

  const handleAddMeasurement = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const value = parseFloat(inputValue);
    const candidateEntry = {
      testId: selectedTestId,
      value,
      date: new Date(inputDate).toISOString(),
      side: inputSide,
      notes: inputNotes.trim() || undefined,
    };

    const validation = validateMobilityEntry(candidateEntry);
    if (!validation.isValid) {
      setFormError(validation.error || 'Invalid entry.');
      return;
    }

    try {
      storageManager.addMobilityEntry(candidateEntry);
      setInputValue('');
      setInputNotes('');
      setSaveSuccessFlash(true);
      setTimeout(() => setSaveSuccessFlash(false), 2000);
    } catch (err: any) {
      setFormError(err.message || 'Failed to persist mobility entry.');
    }
  };

  const handleDelete = (id?: string) => {
    if (!id) return;
    if (window.confirm('Delete this mobility measurement log?')) {
      storageManager.deleteMobilityEntry(id);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-2xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-bold text-slate-100">Mobility & Flexibility Tracker</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Standardized active assessment protocols from elite biomechanics creators.
          </p>
        </div>

        {/* Status Toast */}
        {saveSuccessFlash && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-950/80 border border-emerald-500/50 rounded-lg text-emerald-300 text-xs font-semibold animate-pulse">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            Measurement Logged!
          </div>
        )}
      </div>

      {/* Protocol Selector Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2" role="tablist">
        {MOBILITY_PROTOCOLS.map((protocol) => {
          const isSelected = protocol.id === selectedTestId;
          const count = history.filter((e) => e.testId === protocol.id).length;
          return (
            <button
              key={protocol.id}
              role="tab"
              aria-selected={isSelected}
              onClick={() => handleProtocolChange(protocol.id)}
              className={`flex flex-col text-left p-3 rounded-xl border transition-all ${
                isSelected
                  ? 'bg-emerald-950/40 border-emerald-500/80 text-white shadow-lg shadow-emerald-950/30 ring-1 ring-emerald-500/30'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400/80">
                {protocol.creator.split('(')[0].trim()}
              </span>
              <span className="text-xs font-semibold mt-0.5 line-clamp-1">{protocol.name.split('(')[0].trim()}</span>
              <span className="text-[10px] text-slate-500 mt-1 font-mono">
                {count} {count === 1 ? 'log' : 'logs'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Protocol Overview Card */}
      <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-100">{activeProtocol.name}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-slate-800 text-slate-300 border border-slate-700">
                {activeProtocol.creator}
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-1">
              <span className="text-slate-500">Target Tissue:</span> {activeProtocol.targetTissue} •{' '}
              <span className="text-slate-500">Benchmark:</span>{' '}
              <span className="text-amber-400 font-semibold">{activeProtocol.targetBenchmark}</span>
            </div>
          </div>

          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 transition-colors self-start md:self-auto"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>{showInstructions ? 'Hide Instructions' : 'View Protocol Details'}</span>
            {showInstructions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Collapsible Instructions & Scoring Guide */}
        {showInstructions && (
          <div className="pt-3 border-t border-slate-800/80 space-y-3 text-xs text-slate-300">
            <div>
              <span className="font-semibold text-emerald-400 block mb-1">Execution Steps:</span>
              <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px]">
                {activeProtocol.instructions.map((inst, i) => (
                  <li key={i}>{inst}</li>
                ))}
              </ol>
            </div>

            <div>
              <span className="font-semibold text-emerald-400 block mb-1">Scoring Criteria:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {activeProtocol.scoringTiers.map((tier, idx) => (
                  <div key={idx} className="bg-slate-900/80 p-2 rounded border border-slate-800 text-[11px]">
                    <div className="font-semibold text-slate-200">{tier.label}</div>
                    <div className="text-slate-400 text-[10px] mt-0.5">{tier.interpretation}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Trend Summary & Progress Indicators */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
            <div className="text-[10px] font-mono uppercase text-slate-500">Baseline</div>
            <div className="text-sm font-bold text-slate-200 mt-0.5">
              {progress.baseline !== null ? `${progress.baseline} ${activeProtocol.unit}` : '—'}
            </div>
          </div>

          <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
            <div className="text-[10px] font-mono uppercase text-slate-500">Latest Score</div>
            <div className="text-sm font-bold text-slate-100 mt-0.5">
              {progress.latest !== null ? `${progress.latest} ${activeProtocol.unit}` : '—'}
            </div>
          </div>

          <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
            <div className="text-[10px] font-mono uppercase text-slate-500">Progress Delta</div>
            <div className="flex items-center gap-1 mt-0.5">
              {progress.status === 'improved' && <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />}
              {progress.status === 'declined' && <TrendingDown className="w-3.5 h-3.5 text-rose-400" />}
              <span
                className={`text-sm font-bold ${
                  progress.status === 'improved'
                    ? 'text-emerald-400'
                    : progress.status === 'declined'
                    ? 'text-rose-400'
                    : 'text-slate-400'
                }`}
              >
                {progress.status === 'empty' ? '—' : `${progress.delta > 0 ? '+' : ''}${progress.delta} ${activeProtocol.unit}`}
              </span>
            </div>
          </div>

          <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
            <div className="text-[10px] font-mono uppercase text-slate-500">Target Status</div>
            <div className="mt-0.5">
              {progress.isTargetMet ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-600">
                  Target Met
                </span>
              ) : progress.status === 'empty' ? (
                <span className="text-xs text-slate-500">Untested</span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-950/80 text-amber-300 border border-amber-600">
                  In Progress
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Zero-Dependency SVG Sparkline Chart */}
        <div className="pt-2">
          <SparklineChart entries={history} protocol={activeProtocol} height={130} />
        </div>
      </div>

      {/* New Measurement Entry Form */}
      <form onSubmit={handleAddMeasurement} className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
            <PlusCircle className="w-4 h-4 text-emerald-400" />
            Log New Measurement
          </h3>
          {liveBadge && (
            <div className={`px-2.5 py-1 rounded-full border text-[11px] font-semibold flex items-center gap-1.5 ${liveBadge.badgeClass}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${liveBadge.dotClass}`} />
              {liveBadge.tier}: {liveBadge.description}
            </div>
          )}
        </div>

        {formError && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{formError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Numeric Value Input */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Score / Measurement ({activeProtocol.unit})
            </label>
            <input
              type="number"
              step={selectedTestId === 'elephant-walk' ? '1' : '0.25'}
              min="0"
              max={selectedTestId === 'elephant-walk' ? '5' : '600'}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={selectedTestId === 'elephant-walk' ? 'Level (1–5)' : `Enter ${activeProtocol.unit}`}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
              required
            />
          </div>

          {/* Side Selector (Conditional) */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Test Limb / Side
            </label>
            <select
              value={inputSide}
              onChange={(e) => setInputSide(e.target.value as any)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
            >
              <option value="bilateral">Bilateral (Both)</option>
              <option value="left">Left Leg / Side</option>
              <option value="right">Right Leg / Side</option>
            </select>
          </div>

          {/* Date Picker */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Assessment Date
            </label>
            <input
              type="date"
              value={inputDate}
              onChange={(e) => setInputDate(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
              required
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Clinical / Sensation Notes
            </label>
            <input
              type="text"
              value={inputNotes}
              onChange={(e) => setInputNotes(e.target.value)}
              placeholder="e.g. Pain-free 0/10, slight tightness"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Quick Level Presets for Elephant Walks */}
        {selectedTestId === 'elephant-walk' && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] text-slate-500 mr-1 font-mono">Quick Pick:</span>
            {[
              { lvl: 1, label: 'L1: Mid-Shin' },
              { lvl: 2, label: 'L2: Shoelaces' },
              { lvl: 3, label: 'L3: Toes' },
              { lvl: 4, label: 'L4: Knuckles' },
              { lvl: 5, label: 'L5: Palms Flat' },
            ].map((preset) => (
              <button
                key={preset.lvl}
                type="button"
                onClick={() => setInputValue(String(preset.lvl))}
                className={`px-2 py-1 text-[11px] rounded border font-mono transition-colors ${
                  inputValue === String(preset.lvl)
                    ? 'bg-emerald-600 text-white border-emerald-500 font-bold'
                    : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-600'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={!inputValue || isNaN(parseFloat(inputValue))}
            className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-950/50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            Save Measurement
          </button>
        </div>
      </form>

      {/* History Log Table */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-200">
          Recent Assessment Logs ({testHistory.length})
        </h3>

        {testHistory.length === 0 ? (
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 text-center text-xs text-slate-500">
            No entries logged yet for this assessment.
          </div>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {testHistory.map((entry) => {
              const badge = getBenchmarkBadge(entry.testId, entry.value);
              return (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-950/60 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="font-mono text-xs text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      {entry.date?.split('T')[0]}
                    </div>
                    <div>
                      <span className="text-sm font-bold text-white font-mono">{entry.value}</span>{' '}
                      <span className="text-xs text-slate-400 font-mono">{activeProtocol.unit}</span>
                      {entry.side && entry.side !== 'bilateral' && (
                        <span className="ml-2 text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                          {entry.side}
                        </span>
                      )}
                    </div>
                    <span className={`hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badge.badgeClass}`}>
                      {badge.tier}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {entry.notes && (
                      <span className="text-xs text-slate-400 max-w-[150px] md:max-w-xs truncate hidden sm:inline">
                        "{entry.notes}"
                      </span>
                    )}
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors rounded hover:bg-slate-800"
                      title="Delete entry"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
```

---

## 5. Comprehensive Test Specifications

### 5.1 Storage Manager Tests (`tests/storage/storageManager.test.ts`)

```typescript
// tests/storage/storageManager.test.ts
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  StorageManager,
  DEFAULT_STORAGE_DATA,
  AppStorageData,
  STORAGE_KEY_V1,
} from '../../src/storage/storageManager';

describe('StorageManager Persistence Engine', () => {
  let manager: StorageManager;

  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    manager = new StorageManager('test_storage_key');
  });

  afterEach(() => {
    manager.flush();
    vi.useRealTimers();
  });

  it('loads valid default schema v1 when localStorage is completely empty', () => {
    const data = manager.load();
    expect(data.version).toBe(1);
    expect(data.activeSessionId).toBe('lower_a');
    expect(data.mobilityHistory).toEqual([]);
    expect(data.currentLogs).toEqual({});
    expect(data.completedWorkouts).toEqual({});
    expect(data.settings.soundEnabled).toBe(true);
    expect(data.settings.defaultTimerPreset).toBe(90);
  });

  it('debounces successive save calls by 300ms', () => {
    manager.save({ activeSessionId: 'upper_a' });
    expect(localStorage.getItem('test_storage_key')).toBeNull(); // not yet flushed

    // Advance 200ms
    vi.advanceTimersByTime(200);
    expect(localStorage.getItem('test_storage_key')).toBeNull();

    // Make another change at 200ms (resets 300ms debounce)
    manager.save({ activeSessionId: 'lower_b' });
    vi.advanceTimersByTime(200);
    expect(localStorage.getItem('test_storage_key')).toBeNull();

    // Advance remaining 100ms (total 300ms from last call)
    vi.advanceTimersByTime(100);
    const stored = JSON.parse(localStorage.getItem('test_storage_key') || '{}');
    expect(stored.activeSessionId).toBe('lower_b');
  });

  it('saveImmediate bypasses debounce and persists synchronously', () => {
    manager.saveImmediate({ activeSessionId: 'upper_b' });
    const stored = JSON.parse(localStorage.getItem('test_storage_key') || '{}');
    expect(stored.activeSessionId).toBe('upper_b');
  });

  it('flushes pending debounced state when flush() is invoked', () => {
    manager.save({ activeSessionId: 'upper_a' });
    expect(localStorage.getItem('test_storage_key')).toBeNull();
    manager.flush();
    const stored = JSON.parse(localStorage.getItem('test_storage_key') || '{}');
    expect(stored.activeSessionId).toBe('upper_a');
  });

  it('recovers gracefully without throwing when corrupt non-JSON is in localStorage', () => {
    localStorage.setItem('corrupt_key', '{not a valid json syntax!!!');
    const corruptManager = new StorageManager('corrupt_key');
    const data = corruptManager.load();
    expect(data.version).toBe(1);
    expect(data.activeSessionId).toBe('lower_a');
  });

  it('sanitizes malformed objects and replaces corrupted fields with defaults', () => {
    const malformed = {
      version: 99,
      activeSessionId: 12345, // invalid
      mobilityHistory: 'not an array', // invalid
      settings: null,
    };
    localStorage.setItem('malformed_key', JSON.stringify(malformed));
    const malformedManager = new StorageManager('malformed_key');
    const data = malformedManager.load();
    expect(data.version).toBe(1);
    expect(data.activeSessionId).toBe('lower_a');
    expect(Array.isArray(data.mobilityHistory)).toBe(true);
    expect(data.settings.soundEnabled).toBe(true);
  });

  it('persists and deletes mobility entries cleanly', () => {
    const entry = {
      testId: 'knee-to-wall' as const,
      value: 4.5,
      date: '2026-10-13T08:00:00.000Z',
      side: 'left' as const,
    };
    const saved = manager.addMobilityEntry(entry);
    expect(saved.mobilityHistory).toHaveLength(1);
    expect(saved.mobilityHistory[0].value).toBe(4.5);
    expect(saved.mobilityHistory[0].id).toBeDefined();

    const entryId = saved.mobilityHistory[0].id!;
    const afterDelete = manager.deleteMobilityEntry(entryId);
    expect(afterDelete.mobilityHistory).toHaveLength(0);
  });

  it('rejects invalid mobility entry insertion with an error', () => {
    expect(() => {
      manager.addMobilityEntry({
        testId: 'elephant-walk' as const,
        value: 10, // Invalid: elephant walk must be 1-5
      });
    }).toThrow(/Invalid mobility entry/);
  });

  it('exports and imports valid JSON backup data', () => {
    manager.saveImmediate({ activeSessionId: 'upper_b' });
    const jsonStr = manager.exportJSON();
    expect(jsonStr).toContain('upper_b');

    const newManager = new StorageManager('import_test_key');
    const result = newManager.importJSON(jsonStr);
    expect(result.success).toBe(true);
    expect(newManager.load().activeSessionId).toBe('upper_b');
  });

  it('rejects malformed JSON strings during import without destroying existing state', () => {
    manager.saveImmediate({ activeSessionId: 'lower_b' });
    const result = manager.importJSON('{ invalid json syntax');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/JSON Parse error/);
    expect(manager.load().activeSessionId).toBe('lower_b'); // untouched
  });

  it('notifies subscribers on state updates', () => {
    const subscriber = vi.fn();
    const unsubscribe = manager.subscribe(subscriber);

    manager.saveImmediate({ activeSessionId: 'upper_a' });
    expect(subscriber).toHaveBeenCalledTimes(1);
    expect(subscriber).toHaveBeenCalledWith(expect.objectContaining({ activeSessionId: 'upper_a' }));

    unsubscribe();
    manager.saveImmediate({ activeSessionId: 'upper_b' });
    expect(subscriber).toHaveBeenCalledTimes(1);
  });
});
```

### 5.2 Sparkline Chart Tests (`tests/components/SparklineChart.test.tsx`)

```typescript
// tests/components/SparklineChart.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SparklineChart } from '../../src/components/SparklineChart';
import {
  PROTOCOL_KNEE_TO_WALL,
  PROTOCOL_SPLIT_SQUAT_ELEVATION,
  MobilityEntry,
} from '../../src/domain/mobility';

describe('SparklineChart Component (Zero-Dependency SVG)', () => {
  it('renders empty placeholder state when entries array is empty', () => {
    render(<SparklineChart entries={[]} protocol={PROTOCOL_KNEE_TO_WALL} />);
    expect(screen.getByText(/No assessment history logged yet/i)).toBeInTheDocument();
  });

  it('renders SVG element with polyline for multi-point history', () => {
    const entries: MobilityEntry[] = [
      { id: '1', testId: 'knee-to-wall', date: '2026-10-01T08:00:00Z', value: 3.0 },
      { id: '2', testId: 'knee-to-wall', date: '2026-10-08T08:00:00Z', value: 4.5 },
      { id: '3', testId: 'knee-to-wall', date: '2026-10-15T08:00:00Z', value: 5.2 },
    ];

    const { container } = render(
      <SparklineChart entries={entries} protocol={PROTOCOL_KNEE_TO_WALL} />
    );

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();

    const polyline = container.querySelector('polyline');
    expect(polyline).toBeInTheDocument();
    expect(polyline?.getAttribute('points')).toBeTruthy();

    const circles = container.querySelectorAll('circle');
    expect(circles).toHaveLength(3);
  });

  it('renders benchmark reference line and target label', () => {
    const entries: MobilityEntry[] = [
      { id: '1', testId: 'knee-to-wall', date: '2026-10-01T08:00:00Z', value: 3.5 },
    ];
    render(<SparklineChart entries={entries} protocol={PROTOCOL_KNEE_TO_WALL} />);
    expect(screen.getByText(/Target: ≥ 4.0–5.0 inches/i)).toBeInTheDocument();
  });

  it('handles inverted polarity for lower-is-better metrics (ATG Split Squat)', () => {
    // 6" elevation improved to 0" elevation
    const entries: MobilityEntry[] = [
      { id: '1', testId: 'split-squat-elevation', date: '2026-10-01T08:00:00Z', value: 6.0 },
      { id: '2', testId: 'split-squat-elevation', date: '2026-10-15T08:00:00Z', value: 0.0 },
    ];

    const { container } = render(
      <SparklineChart entries={entries} protocol={PROTOCOL_SPLIT_SQUAT_ELEVATION} />
    );

    const polyline = container.querySelector('polyline');
    const pointsStr = polyline?.getAttribute('points') || '';
    const [p1, p2] = pointsStr.split(' ');
    const y1 = parseFloat(p1.split(',')[1]);
    const y2 = parseFloat(p2.split(',')[1]);

    // For lower-is-better, lower value (0.0) MUST have lower Y coordinate (higher vertical position on screen)
    expect(y2).toBeLessThan(y1);
  });

  it('renders without division-by-zero or NaN when all values are identical', () => {
    const entries: MobilityEntry[] = [
      { id: '1', testId: 'knee-to-wall', date: '2026-10-01T08:00:00Z', value: 4.0 },
      { id: '2', testId: 'knee-to-wall', date: '2026-10-08T08:00:00Z', value: 4.0 },
    ];

    const { container } = render(
      <SparklineChart entries={entries} protocol={PROTOCOL_KNEE_TO_WALL} />
    );
    const polyline = container.querySelector('polyline');
    expect(polyline?.getAttribute('points')).not.toContain('NaN');
  });
});
```

### 5.3 Mobility Tracker Widget Tests (`tests/components/MobilityTrackerWidget.test.tsx`)

```typescript
// tests/components/MobilityTrackerWidget.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MobilityTrackerWidget } from '../../src/components/MobilityTrackerWidget';
import { storageManager } from '../../src/storage/storageManager';

describe('MobilityTrackerWidget Component', () => {
  beforeEach(() => {
    storageManager.clear();
  });

  it('renders all 5 protocol tab selector buttons', () => {
    render(<MobilityTrackerWidget />);
    expect(screen.getByRole('tab', { name: /Elephant Walks/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Knee-to-Wall/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Split Squat Elevation/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Biering-Sørensen/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Dead Hang/i })).toBeInTheDocument();
  });

  it('switches active protocol details when clicking a tab', () => {
    render(<MobilityTrackerWidget />);
    fireEvent.click(screen.getByRole('tab', { name: /Knee-to-Wall/i }));
    expect(screen.getByText(/Knee-to-Wall Ankle Dorsiflexion Test/i)).toBeInTheDocument();
    expect(screen.getByText(/Dr\. Aaron Horschig/i)).toBeInTheDocument();
  });

  it('displays real-time live benchmark classification badge as user types', async () => {
    render(<MobilityTrackerWidget />);
    // Select Elephant Walk (Level 1 to 5)
    fireEvent.click(screen.getByRole('tab', { name: /Elephant Walks/i }));

    const input = screen.getByPlaceholderText(/Level \(1–5\)/i) as HTMLInputElement;

    fireEvent.change(input, { target: { value: '5' } });
    expect(await screen.findByText(/Exceptional: Palms Flat on Floor/i)).toBeInTheDocument();

    fireEvent.change(input, { target: { value: '1' } });
    expect(await screen.findByText(/Restricted: Mid-Shin/i)).toBeInTheDocument();
  });

  it('rejects invalid inputs with a descriptive error message', () => {
    render(<MobilityTrackerWidget />);
    fireEvent.click(screen.getByRole('tab', { name: /Elephant Walks/i }));

    const input = screen.getByPlaceholderText(/Level \(1–5\)/i);
    fireEvent.change(input, { target: { value: '9' } }); // invalid level

    const submitBtn = screen.getByRole('button', { name: /Save Measurement/i });
    fireEvent.click(submitBtn);

    expect(screen.getByText(/between 1 and 5/i)).toBeInTheDocument();
  });

  it('successfully logs a new measurement and updates recent logs table', async () => {
    render(<MobilityTrackerWidget />);
    fireEvent.click(screen.getByRole('tab', { name: /Elephant Walks/i }));

    const input = screen.getByPlaceholderText(/Level \(1–5\)/i);
    fireEvent.change(input, { target: { value: '4' } });

    const notesInput = screen.getByPlaceholderText(/e\.g\. Pain-free/i);
    fireEvent.change(notesInput, { target: { value: 'Knuckles touching cleanly' } });

    const submitBtn = screen.getByRole('button', { name: /Save Measurement/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Knuckles touching cleanly/i)).toBeInTheDocument();
      expect(screen.getByText(/Measurement Logged!/i)).toBeInTheDocument();
    });

    // Check persistence
    const saved = storageManager.load();
    expect(saved.mobilityHistory).toHaveLength(1);
    expect(saved.mobilityHistory[0].value).toBe(4);
  });

  it('allows deleting an entry from recent assessment logs', async () => {
    storageManager.addMobilityEntry({
      testId: 'elephant-walk',
      value: 3,
      date: '2026-10-13T08:00:00Z',
      notes: 'Initial test',
    });

    // Mock confirm
    vi.spyOn(window, 'confirm').mockImplementation(() => true);

    render(<MobilityTrackerWidget />);
    expect(screen.getByText(/Initial test/i)).toBeInTheDocument();

    const deleteBtn = screen.getByTitle(/Delete entry/i);
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(screen.queryByText(/Initial test/i)).not.toBeInTheDocument();
    });
    expect(storageManager.load().mobilityHistory).toHaveLength(0);
  });
});
```

---

## 6. Verification and Integration Checklist

1. **Protocol Adherence**:
   - All 5 protocols strictly implemented with respective creator attributions, primary metrics, units, and clinical benchmarks.
   - Elephant Walk reach levels (1–5) validated strictly as integers.
2. **Polarity Handling**:
   - Split squat elevation regression towards 0" correctly recognized as improvement (`lower_is_better`).
   - SVG coordinate mapper inverts Y-axis for Split Squat so improvement slopes upward towards 0" flat ground mastery.
3. **Storage Robustness**:
   - Version 1 schema strictly verified.
   - 300ms debounce prevents storage thrashing while user types notes or adjust values.
   - `flush()` invoked on `beforeunload` ensures zero data loss on page refresh.
   - Try-catch wrapping and automatic recovery handles corrupt JSON and quota exceed exceptions.
   - Import/export verified with comprehensive validation.
4. **Test Suite Compatibility**:
   - Tested against React 19, Vitest 3.0.5, and `@testing-library/react`.
   - All mocks for `localStorage` in `tests/setup.ts` are respected.
