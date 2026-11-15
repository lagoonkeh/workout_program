/**
 * src/timer/restTimer.ts
 * High-performance, drift-free rest interval countdown timer engine.
 * Powered by performance.now() timestamp deltas and an inline Blob Web Worker ticker.
 */

export type TimerState = 'IDLE' | 'RUNNING' | 'PAUSED' | 'COMPLETED';

export interface TimerSnapshot {
  state: TimerState;
  durationSeconds: number;
  remainingSeconds: number;
  progressRatio: number; // 0.0 to 1.0 (monotonic progress towards completion)
}

export interface RestTimerCallbacks {
  onWarning?: (secondsLeft: number) => void;
  onComplete?: () => void;
  onTick?: (snapshot: TimerSnapshot) => void;
}

export interface RestTimerAudioDelegate {
  playTone: (type: 'warning' | 'completion' | 'tick') => void;
}

export interface RestTimerOptions {
  callbacks?: RestTimerCallbacks;
  audioSynthesizer?: RestTimerAudioDelegate;
  timeProvider?: () => number;
}

export interface IRestTimer {
  start(durationSeconds: number): void;
  pause(): void;
  resume(): void;
  reset(durationSeconds?: number): void;
  addTime(seconds: number): void;
  getSnapshot(): TimerSnapshot;
  subscribe(listener: (snapshot: TimerSnapshot) => void): () => void;
  destroy(): void;
}

export interface RestPreset {
  id: string;
  label: string;
  seconds: number;
  tier: 'Effective Reps' | 'Tier 3' | 'Tier 2' | 'Tier 1' | 'Custom' | 'TNT Protocol';
  description: string;
}

export const REST_PRESETS: readonly RestPreset[] = [
  { id: 'er-15', label: '15s', seconds: 15, tier: 'Effective Reps', description: '20-Effective-Reps rest-pause cluster reset' },
  { id: 'er-30', label: '30s', seconds: 30, tier: 'Effective Reps', description: 'Extended cluster reset / short accessory' },
  { id: 't3-60', label: '60s', seconds: 60, tier: 'Tier 3', description: 'Tier 3 accessory & mobility pacing' },
  { id: 't3-90', label: '90s', seconds: 90, tier: 'Tier 3', description: 'High-volume hypertrophy & core stability' },
  { id: 'tnt-120', label: '120s (TNT Rest)', seconds: 120, tier: 'TNT Protocol', description: 'Tendon Neuroplastic Training 2-minute inter-hold recovery (5x45s protocol)' },
  { id: 't2-120', label: '120s (2m)', seconds: 120, tier: 'Tier 2', description: 'Standard Tier 2 hypertrophy compound recovery' },
  { id: 't2-180', label: '180s (3m)', seconds: 180, tier: 'Tier 2', description: 'Heavy Tier 2 compound recovery' },
  { id: 't1-240', label: '240s (4m)', seconds: 240, tier: 'Tier 1', description: 'Sub-maximal heavy powerbuilding rest (GZCL T1)' },
  { id: 't1-300', label: '300s (5m)', seconds: 300, tier: 'Tier 1', description: 'Maximal effort ATP-CP resynthesis' },
] as const;

const WORKER_SCRIPT = `
let timerId = null;
self.onmessage = function(e) {
  if (e.data === 'start') {
    if (timerId) clearInterval(timerId);
    timerId = setInterval(function() {
      self.postMessage('tick');
    }, 100);
  } else if (e.data === 'stop') {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
  }
};
`;

function createTimerWorker(): Worker | null {
  if (
    typeof window === 'undefined' ||
    typeof Worker === 'undefined' ||
    typeof Blob === 'undefined' ||
    typeof URL === 'undefined' ||
    typeof URL.createObjectURL !== 'function'
  ) {
    return null;
  }
  try {
    const blob = new Blob([WORKER_SCRIPT], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);
    URL.revokeObjectURL(url);
    return worker;
  } catch {
    return null;
  }
}

export class RestTimer implements IRestTimer {
  private state: TimerState = 'IDLE';
  private durationSeconds: number = 60;
  private remainingMs: number = 60000;
  private remainingSeconds: number = 60;
  private targetEndTime: number | null = null;

  private worker: Worker | null = null;
  private fallbackIntervalId: ReturnType<typeof setInterval> | null = null;
  private isDestroyed: boolean = false;

  private readonly listeners: Set<(snapshot: TimerSnapshot) => void> = new Set();
  private readonly firedWarnings: Set<number> = new Set();
  private hasFiredComplete: boolean = false;

  private readonly callbacks: RestTimerCallbacks;
  private readonly audioSynthesizer?: RestTimerAudioDelegate;
  private readonly now: () => number;

  constructor(options: RestTimerOptions = {}) {
    this.callbacks = options.callbacks || {};
    this.audioSynthesizer = options.audioSynthesizer;
    this.now = options.timeProvider || (() => (typeof performance !== 'undefined' ? performance.now() : Date.now()));

    this.worker = createTimerWorker();
    if (this.worker) {
      this.worker.onmessage = (event: MessageEvent) => {
        if (event.data === 'tick' && this.state === 'RUNNING') {
          this.evaluateTick();
        }
      };
    }

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }

  public start(durationSeconds: number): void {
    if (this.isDestroyed) return;
    if (durationSeconds <= 0) {
      throw new Error(`Timer duration must be greater than 0, received ${durationSeconds}`);
    }

    this.durationSeconds = durationSeconds;
    this.remainingMs = durationSeconds * 1000;
    this.remainingSeconds = durationSeconds;
    this.targetEndTime = this.now() + this.remainingMs;

    this.firedWarnings.clear();
    this.hasFiredComplete = false;
    this.state = 'RUNNING';

    this.startTicker();
    this.notify();
  }

  public pause(): void {
    if (this.isDestroyed || this.state !== 'RUNNING') return;

    if (this.targetEndTime !== null) {
      this.remainingMs = Math.max(0, this.targetEndTime - this.now());
      this.remainingSeconds = Math.ceil(this.remainingMs / 1000);
      this.targetEndTime = null;
    }

    this.stopTicker();
    this.state = 'PAUSED';
    this.notify();
  }

  public resume(): void {
    if (this.isDestroyed || this.state !== 'PAUSED') return;

    if (this.remainingMs <= 0) {
      this.complete();
      return;
    }

    this.targetEndTime = this.now() + this.remainingMs;
    this.state = 'RUNNING';

    this.startTicker();
    this.notify();
  }

  public reset(durationSeconds?: number): void {
    if (this.isDestroyed) return;

    this.stopTicker();
    this.state = 'IDLE';
    this.targetEndTime = null;
    if (typeof durationSeconds === 'number' && durationSeconds > 0) {
      this.durationSeconds = durationSeconds;
    }
    this.remainingMs = this.durationSeconds * 1000;
    this.remainingSeconds = this.durationSeconds;
    this.firedWarnings.clear();
    this.hasFiredComplete = false;

    this.notify();
  }

  public addTime(seconds: number): void {
    if (this.isDestroyed) return;

    const newDuration = Math.max(1, this.durationSeconds + seconds);
    this.durationSeconds = newDuration;

    if (this.state === 'RUNNING') {
      if (this.targetEndTime !== null) {
        this.targetEndTime += seconds * 1000;
        this.evaluateTick();
      }
    } else if (this.state === 'PAUSED') {
      this.remainingMs = Math.max(0, this.remainingMs + seconds * 1000);
      this.remainingSeconds = Math.ceil(this.remainingMs / 1000);
      if (this.remainingMs <= 0) {
        this.complete();
      } else {
        if (this.remainingSeconds > 3) {
          this.firedWarnings.clear();
        }
        this.notify();
      }
    } else if (this.state === 'COMPLETED' || this.state === 'IDLE') {
      this.remainingMs = this.durationSeconds * 1000;
      this.remainingSeconds = this.durationSeconds;
      this.notify();
    }
  }

  public getSnapshot(): TimerSnapshot {
    return {
      state: this.state,
      durationSeconds: this.durationSeconds,
      remainingSeconds: this.remainingSeconds,
      progressRatio: this.calculateProgressRatio(),
    };
  }

  public subscribe(listener: (snapshot: TimerSnapshot) => void): () => void {
    if (this.isDestroyed) return () => {};
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public destroy(): void {
    if (this.isDestroyed) return;
    this.isDestroyed = true;

    this.stopTicker();

    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }

    this.listeners.clear();
  }

  private evaluateTick(): void {
    if (this.state !== 'RUNNING' || this.targetEndTime === null) return;

    const currentNow = this.now();
    this.remainingMs = Math.max(0, this.targetEndTime - currentNow);
    const calculatedSeconds = Math.ceil(this.remainingMs / 1000);
    this.remainingSeconds = calculatedSeconds;

    if (calculatedSeconds > 3 && this.firedWarnings.size > 0) {
      this.firedWarnings.clear();
    }

    // Check warning triggers (3, 2, 1)
    if ([3, 2, 1].includes(calculatedSeconds)) {
      if (!this.firedWarnings.has(calculatedSeconds)) {
        this.firedWarnings.add(calculatedSeconds);
        this.callbacks.onWarning?.(calculatedSeconds);
        this.audioSynthesizer?.playTone('warning');
      }
    }

    // Check completion trigger
    if (this.remainingMs <= 0) {
      this.complete();
      return;
    }

    this.notify();
    this.callbacks.onTick?.(this.getSnapshot());
  }

  private complete(): void {
    this.stopTicker();
    this.state = 'COMPLETED';
    this.remainingMs = 0;
    this.remainingSeconds = 0;
    this.targetEndTime = null;

    if (!this.hasFiredComplete) {
      this.hasFiredComplete = true;
      this.callbacks.onComplete?.();
      this.audioSynthesizer?.playTone('completion');
    }

    this.notify();
    this.callbacks.onTick?.(this.getSnapshot());
  }

  private calculateProgressRatio(): number {
    if (this.state === 'IDLE') return 0.0;
    if (this.state === 'COMPLETED') return 1.0;
    if (this.durationSeconds <= 0) return 0.0;

    const totalMs = this.durationSeconds * 1000;
    const elapsedMs = totalMs - this.remainingMs;
    const ratio = elapsedMs / totalMs;
    return Math.min(1.0, Math.max(0.0, Number(ratio.toFixed(4))));
  }

  private startTicker(): void {
    if (this.worker) {
      this.worker.postMessage('start');
    } else {
      if (this.fallbackIntervalId) clearInterval(this.fallbackIntervalId);
      this.fallbackIntervalId = setInterval(() => {
        if (this.state === 'RUNNING') {
          this.evaluateTick();
        }
      }, 100);
    }
  }

  private stopTicker(): void {
    if (this.worker) {
      this.worker.postMessage('stop');
    }
    if (this.fallbackIntervalId) {
      clearInterval(this.fallbackIntervalId);
      this.fallbackIntervalId = null;
    }
  }

  private handleVisibilityChange = (): void => {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      if (this.state === 'RUNNING') {
        this.evaluateTick();
      }
    }
  };

  private notify(): void {
    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}
