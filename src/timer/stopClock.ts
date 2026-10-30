/**
 * src/timer/stopClock.ts
 * Drift-free Stop Clock / Stopwatch engine with lap recording.
 * Powered by performance.now() high-resolution timestamp deltas.
 */

export type StopClockState = 'IDLE' | 'RUNNING' | 'PAUSED';

export interface StopClockLap {
  lapNumber: number;
  lapTimeSeconds: number;
  totalTimeSeconds: number;
}

export interface StopClockSnapshot {
  state: StopClockState;
  elapsedSeconds: number;
  elapsedMs: number;
  laps: StopClockLap[];
}

export interface StopClockCallbacks {
  onTick?: (snapshot: StopClockSnapshot) => void;
  onLap?: (lap: StopClockLap) => void;
}

export class StopClock {
  private state: StopClockState = 'IDLE';
  private accumulatedMs: number = 0;
  private startTimestamp: number | null = null;
  private laps: StopClockLap[] = [];
  private lastLapTotalMs: number = 0;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private listeners: Set<(snapshot: StopClockSnapshot) => void> = new Set();
  private timeProvider: () => number;

  constructor(timeProvider: () => number = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())) {
    this.timeProvider = timeProvider;
  }

  public getSnapshot(): StopClockSnapshot {
    let currentTotalMs = this.accumulatedMs;
    if (this.state === 'RUNNING' && this.startTimestamp !== null) {
      currentTotalMs += this.timeProvider() - this.startTimestamp;
    }
    const elapsedSeconds = Math.floor(currentTotalMs / 1000);
    return {
      state: this.state,
      elapsedSeconds,
      elapsedMs: Math.floor(currentTotalMs),
      laps: [...this.laps],
    };
  }

  public start(): void {
    if (this.state === 'RUNNING') return;
    this.state = 'RUNNING';
    this.startTimestamp = this.timeProvider();
    this.startInterval();
    this.notify();
  }

  public pause(): void {
    if (this.state !== 'RUNNING') return;
    if (this.startTimestamp !== null) {
      this.accumulatedMs += this.timeProvider() - this.startTimestamp;
      this.startTimestamp = null;
    }
    this.state = 'PAUSED';
    this.stopInterval();
    this.notify();
  }

  public resume(): void {
    if (this.state !== 'PAUSED') return;
    this.state = 'RUNNING';
    this.startTimestamp = this.timeProvider();
    this.startInterval();
    this.notify();
  }

  public reset(): void {
    this.state = 'IDLE';
    this.accumulatedMs = 0;
    this.startTimestamp = null;
    this.laps = [];
    this.lastLapTotalMs = 0;
    this.stopInterval();
    this.notify();
  }

  public lap(): StopClockLap | null {
    if (this.state === 'IDLE') return null;
    const snap = this.getSnapshot();
    const currentMs = snap.elapsedMs;
    const lapMs = currentMs - this.lastLapTotalMs;
    this.lastLapTotalMs = currentMs;

    const newLap: StopClockLap = {
      lapNumber: this.laps.length + 1,
      lapTimeSeconds: Math.round((lapMs / 1000) * 10) / 10,
      totalTimeSeconds: Math.round((currentMs / 1000) * 10) / 10,
    };

    this.laps.unshift(newLap); // newest first
    this.notify();
    return newLap;
  }

  public subscribe(listener: (snapshot: StopClockSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private startInterval(): void {
    this.stopInterval();
    this.intervalId = setInterval(() => {
      this.notify();
    }, 50); // 20 updates per second for smooth 1/10s timer
  }

  private stopInterval(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private notify(): void {
    const snap = this.getSnapshot();
    this.listeners.forEach((l) => {
      try {
        l(snap);
      } catch (e) {
        console.error('[StopClock] Listener error:', e);
      }
    });
  }

  public destroy(): void {
    this.stopInterval();
    this.listeners.clear();
  }
}

export const stopClockSingleton = new StopClock();
