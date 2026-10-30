/**
 * src/timer/tempoMetronome.ts
 * Marcus Filly Functional Bodybuilding Tempo Metronome Engine.
 * Supports 4-digit tempos (e.g. 30X1, 31X1, 4010, 2011, 3012, 2112).
 */

import type { IAudioSynthesizer, AudioToneType } from '../audio/audioSynthesizer';
import type { IVoiceAnnouncer } from '../audio/voiceAnnouncer';

export type { IAudioSynthesizer, AudioToneType, IVoiceAnnouncer };

export type TempoPhase = 'eccentric' | 'pauseBottom' | 'concentric' | 'pauseTop';
export type TempoState = 'STOPPED' | 'ACTIVE' | 'PAUSED';

export interface TempoParsed {
  eccentric: number;
  pauseBottom: number;
  concentric: number;
  pauseTop: number;
  totalDuration: number;
  isConcentricExplosive: boolean;
  raw: string;
  isIsometricHold?: boolean;
  holdDurationSeconds?: number;
}

export interface MetronomeSnapshot {
  state: TempoState;
  isRunning: boolean;
  tempo: string;
  parsedTempo: TempoParsed;
  currentPhase: TempoPhase;
  phaseRemainingSeconds: number;
  phaseRemainingSecondsExact: number;
  phaseTotalSeconds: number;
  phaseProgressRatio: number;
  currentRep: number;
  targetReps: number;
  isExplosive: boolean;
  repProgressRatio: number;
  phaseLabel: string;
  phaseColor: string;
  totalElapsedSeconds?: number;
  formattedPhaseMMSS?: string;
  formattedElapsedMMSS?: string;
}

export type MetronomeSubscriber = (snapshot: MetronomeSnapshot) => void;
export type PhaseChangeCallback = (phase: TempoPhase, rep: number, snapshot: MetronomeSnapshot) => void;
export type RepCompleteCallback = (completedRep: number, targetReps: number) => void;
export type SetCompleteCallback = (totalRepsCompleted: number) => void;

export interface TempoMetronomeOptions {
  audioSynthesizer?: IAudioSynthesizer | null;
  soundEnabled?: boolean;
  tickIntervalMs?: number;
  voiceAnnouncer?: IVoiceAnnouncer | null;
  voiceEnabled?: boolean;
}

export interface ITempoMetronome {
  start(tempo?: string, targetReps?: number): void;
  pause(): void;
  resume(): void;
  stop(): void;
  reset(): void;
  setTempo(tempo: string): void;
  setTargetReps(reps: number): void;
  setSoundEnabled(enabled: boolean): void;
  isSoundEnabled(): boolean;
  setAudioSynthesizer(synth: IAudioSynthesizer | null): void;
  setVoiceEnabled(enabled: boolean): void;
  isVoiceEnabled(): boolean;
  setVoiceAnnouncer(announcer: IVoiceAnnouncer | null): void;
  getSnapshot(): MetronomeSnapshot;
  subscribe(listener: MetronomeSubscriber): () => void;
  onPhaseChange(callback: PhaseChangeCallback): () => void;
  onRepComplete(callback: RepCompleteCallback): () => void;
  onSetComplete(callback: SetCompleteCallback): () => void;
  destroy(): void;
}

const DEFAULT_TEMPO = '30X1';
const DEFAULT_TICK_INTERVAL_MS = 50;

/**
 * Validates and parses Marcus Filly 4-digit tempo cadence strings or isometric hold durations.
 * e.g. "30X1", "31X1", "4010", "2011", "3012", "2112", "5083", "4040", "4083", "HOLD-10", "Isometric 10s Holds"
 * Handles strings with trailing descriptions like "5083 (5s Inhale / 8s Exhale / 3s Pause)".
 */
export function parseTempo(tempoStr: string, targetRepsStr?: string): TempoParsed {
  if (!tempoStr || typeof tempoStr !== 'string') {
    throw new Error('Tempo string cannot be empty');
  }

  const rawTrimmed = tempoStr.trim();
  const rawLower = rawTrimmed.toLowerCase();

  // 1. Isometric Hold detection (e.g. "Isometric 10s Holds", "HOLD-10", "HOLD-60", "Isometric Hold (45–60s)", "45s dead hang", "0010", "0030")
  const isExplicitHoldAlias =
    rawLower.includes('isometric') ||
    rawLower.includes('hold') ||
    rawLower.includes('hang') ||
    rawLower.startsWith('hold-') ||
    rawLower === '0010' ||
    rawLower === '0030';

  if (isExplicitHoldAlias) {
    let holdDuration = 10;
    let matchedRange = false;

    // Check specific known ranges first in tempo string
    if (rawLower.includes('45–60') || rawLower.includes('45-60') || rawLower.includes('60s') || rawLower.includes('60 s')) {
      holdDuration = 60;
      matchedRange = true;
    } else if (rawLower.includes('45s') || rawLower.includes('45 s')) {
      holdDuration = 45;
      matchedRange = true;
    } else if (rawLower.includes('30–45') || rawLower.includes('30-45')) {
      holdDuration = 45;
      matchedRange = true;
    } else if (rawLower.includes('25–35') || rawLower.includes('25-35') || rawLower.includes('35s') || rawLower.includes('35 s')) {
      holdDuration = 35;
      matchedRange = true;
    } else if (rawLower.includes('20–30') || rawLower.includes('20-30') || rawLower.includes('30s') || rawLower.includes('30 s') || rawLower === '0030') {
      holdDuration = 30;
      matchedRange = true;
    } else if (rawLower.includes('15–25') || rawLower.includes('15-25') || rawLower.includes('25s') || rawLower.includes('25 s')) {
      holdDuration = 25;
      matchedRange = true;
    } else if (rawLower.includes('20s') || rawLower.includes('20 s')) {
      holdDuration = 20;
      matchedRange = true;
    } else if (rawLower.includes('10s') || rawLower.includes('10 s') || rawLower === '0010') {
      holdDuration = 10;
      matchedRange = true;
    } else if (rawLower.includes('5s') || rawLower.includes('5 s')) {
      holdDuration = 5;
      matchedRange = true;
    }

    // If no range found in tempo string, extract from targetRepsStr if provided
    if (!matchedRange && targetRepsStr) {
      const repsLower = targetRepsStr.toLowerCase();
      if (repsLower.includes('45–60') || repsLower.includes('45-60') || repsLower.includes('60s') || repsLower.includes('60 s')) {
        holdDuration = 60;
        matchedRange = true;
      } else if (repsLower.includes('45s') || repsLower.includes('45 s')) {
        holdDuration = 45;
        matchedRange = true;
      } else if (repsLower.includes('30–45') || repsLower.includes('30-45')) {
        holdDuration = 45;
        matchedRange = true;
      } else if (repsLower.includes('25–35') || repsLower.includes('25-35') || repsLower.includes('35s') || repsLower.includes('35 s')) {
        holdDuration = 35;
        matchedRange = true;
      } else if (repsLower.includes('20–30') || repsLower.includes('20-30') || repsLower.includes('30s') || repsLower.includes('30 s')) {
        holdDuration = 30;
        matchedRange = true;
      } else if (repsLower.includes('15–25') || repsLower.includes('15-25') || repsLower.includes('25s') || repsLower.includes('25 s')) {
        holdDuration = 25;
        matchedRange = true;
      } else if (repsLower.includes('20s') || repsLower.includes('20 s')) {
        holdDuration = 20;
        matchedRange = true;
      } else if (repsLower.includes('10s') || repsLower.includes('10 s')) {
        holdDuration = 10;
        matchedRange = true;
      } else if (repsLower.includes('5s') || repsLower.includes('5 s')) {
        holdDuration = 5;
        matchedRange = true;
      }
    }

    if (!matchedRange) {
      // General regex search for duration e.g. "HOLD-45" or "12s"
      const matchNum = rawLower.match(/(?:hold[-_\s]*)?(\d+)(?:\s*s)?/);
      if (matchNum && matchNum[1]) {
        const val = parseInt(matchNum[1], 10);
        if (!isNaN(val) && val > 0) {
          holdDuration = val;
        }
      } else if (targetRepsStr) {
        const matchRepNum = targetRepsStr.toLowerCase().match(/(?:hold[-_\s]*)?(\d+)(?:\s*s)?/);
        if (matchRepNum && matchRepNum[1]) {
          const val = parseInt(matchRepNum[1], 10);
          if (!isNaN(val) && val > 0) {
            holdDuration = val;
          }
        }
      }
    }

    return {
      eccentric: 0,
      pauseBottom: holdDuration,
      concentric: 0,
      pauseTop: 0,
      totalDuration: holdDuration,
      isConcentricExplosive: false,
      raw: `HOLD-${holdDuration}`,
      isIsometricHold: true,
      holdDurationSeconds: holdDuration,
    };
  }

  // 2. Semantic aliases for non-isometric non-4-digit exercise cadences
  let candidate = tempoStr;
  if (
    rawLower.includes('controlled') ||
    rawLower.includes('walk') ||
    rawLower.includes('step') ||
    rawLower.includes('rhythm') ||
    rawLower.includes('flush') ||
    rawLower.includes('consistent') ||
    rawLower.includes('spm') ||
    rawLower.includes('cadence')
  ) {
    candidate = '2020'; // 2s rhythm cadence
  } else if (rawLower.includes('positional') || rawLower.includes('reset')) {
    candidate = '4040'; // 4s breathing / positional reset cadence
  } else if (rawLower.includes('cluster') || rawLower.includes('effective')) {
    candidate = '2010';
  }

  // Strip trailing notes in parentheses or brackets e.g. "5083 (5s Inhale / 8s Exhale)" -> "5083"
  const beforeParens = candidate.split(/[\(\[\{]/)[0].trim();
  const sanitized = beforeParens.replace(/[\s-]/g, '');

  // 3. Delimited 4-part formats e.g. "0-10-0-0", "1/0/1/5", "4:0:4:0"
  const delimitedParts = beforeParens.split(/[\s\-_/:]+/).filter(Boolean);
  if (delimitedParts.length === 4) {
    const p1 = parseInt(delimitedParts[0], 10);
    const p2 = parseInt(delimitedParts[1], 10);
    const p3Raw = delimitedParts[2].toUpperCase();
    const isP3X = p3Raw === 'X';
    const p3 = isP3X ? 1 : parseInt(p3Raw, 10);
    const p4 = parseInt(delimitedParts[3], 10);

    if (!isNaN(p1) && !isNaN(p2) && (!isNaN(p3) || isP3X) && !isNaN(p4)) {
      const tot = p1 + p2 + p3 + p4;
      if (tot > 0) {
        const isHold = p1 === 0 && p3 === 0 && (p2 >= 5 || p4 >= 5);
        const holdSec = isHold ? (p2 >= 5 ? p2 : p4) : undefined;
        return {
          eccentric: p1,
          pauseBottom: p2,
          concentric: p3,
          pauseTop: p4,
          totalDuration: tot,
          isConcentricExplosive: isP3X,
          raw: `${p1}${p2}${isP3X ? 'X' : p3}${p4}`,
          isIsometricHold: isHold,
          holdDurationSeconds: holdSec,
        };
      }
    }
  }

  // 4. Standard Marcus Filly 4-character notation e.g. "30X1", "31X1", "4010", "5083", "4040", "1015"
  const match = sanitized.match(/^([0-9])([0-9])([0-9xX])([0-9])$/);
  if (!match) {
    throw new Error(
      `Invalid tempo format "${tempoStr}". Must be 4 characters matching [0-9][0-9][0-9X][0-9] (e.g. "30X1", "31X1", "4010", "5083")`
    );
  }

  const eccentric = parseInt(match[1], 10);
  const pauseBottom = parseInt(match[2], 10);
  const concentricRaw = match[3].toUpperCase();
  const isConcentricExplosive = concentricRaw === 'X';
  const concentric = isConcentricExplosive ? 1 : parseInt(concentricRaw, 10);
  const pauseTop = parseInt(match[4], 10);

  const totalDuration = eccentric + pauseBottom + concentric + pauseTop;
  if (totalDuration === 0) {
    throw new Error('Tempo total duration must be greater than 0 seconds');
  }

  return {
    eccentric,
    pauseBottom,
    concentric,
    pauseTop,
    totalDuration,
    isConcentricExplosive,
    raw: sanitized.toUpperCase(),
  };
}

/**
 * Safe parsing helper for UI inputs without throwing exceptions.
 */
export function tryParseTempo(
  tempoStr: string,
  targetRepsStr?: string
): { success: boolean; data?: TempoParsed; error?: string } {
  try {
    const data = parseTempo(tempoStr, targetRepsStr);
    return { success: true, data };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export class TempoMetronome implements ITempoMetronome {
  private state: TempoState = 'STOPPED';
  private tempoRaw: string = DEFAULT_TEMPO;
  private parsed: TempoParsed = parseTempo(DEFAULT_TEMPO);

  private currentPhase: TempoPhase = 'eccentric';
  private phaseDurationSeconds: number = 3;
  private phaseDurationMs: number = 3000;
  private phaseStartTime: number = 0;
  private phaseElapsedPausedMs: number = 0;
  private lastBeatSecond: number = 0;
  private sessionStartTime: number = 0;
  private totalPausedElapsedMs: number = 0;

  private currentRep: number = 1;
  private targetReps: number = 0; // 0 = continuous

  private tickerId: ReturnType<typeof setInterval> | null = null;
  private readonly tickIntervalMs: number = DEFAULT_TICK_INTERVAL_MS;

  private audioSynthesizer: IAudioSynthesizer | null = null;
  private soundEnabled: boolean = true;
  private voiceAnnouncer: IVoiceAnnouncer | null = null;
  private voiceEnabled: boolean = true;

  private subscribers: Set<MetronomeSubscriber> = new Set();
  private phaseChangeCallbacks: Set<PhaseChangeCallback> = new Set();
  private repCompleteCallbacks: Set<RepCompleteCallback> = new Set();
  private setCompleteCallbacks: Set<SetCompleteCallback> = new Set();

  constructor(options?: TempoMetronomeOptions) {
    if (options?.audioSynthesizer) {
      this.audioSynthesizer = options.audioSynthesizer;
    }
    if (options?.soundEnabled !== undefined) {
      this.soundEnabled = options.soundEnabled;
    }
    if (options?.voiceAnnouncer) {
      this.voiceAnnouncer = options.voiceAnnouncer;
    }
    if (options?.voiceEnabled !== undefined) {
      this.voiceEnabled = options.voiceEnabled;
    }
    if (options?.tickIntervalMs && options.tickIntervalMs > 0) {
      this.tickIntervalMs = options.tickIntervalMs;
    }
  }

  // --- Public Control Methods ---

  public start(tempo?: string, targetReps?: number): void {
    if (tempo) {
      this.parsed = parseTempo(tempo);
      this.tempoRaw = this.parsed.raw;
    }
    if (targetReps !== undefined) {
      this.targetReps = Math.max(0, targetReps);
    }

    this.stopTicker();

    this.state = 'ACTIVE';
    this.currentRep = 1;
    this.phaseElapsedPausedMs = 0;
    this.sessionStartTime = performance.now();
    this.totalPausedElapsedMs = 0;

    // Start on first non-zero phase
    const initialPhase = this.findFirstNonZeroPhase();
    this.activatePhase(initialPhase, this.getPhaseDuration(initialPhase), true);

    this.startTicker();
    this.emit();
  }

  public pause(): void {
    if (this.state !== 'ACTIVE') return;

    this.voiceAnnouncer?.cancel();
    const now = performance.now();
    this.phaseElapsedPausedMs = now - this.phaseStartTime;
    this.totalPausedElapsedMs = now - this.sessionStartTime;
    this.stopTicker();
    this.state = 'PAUSED';
    this.emit();
  }

  public resume(): void {
    if (this.state !== 'PAUSED') return;

    const now = performance.now();
    this.state = 'ACTIVE';
    this.phaseStartTime = now - this.phaseElapsedPausedMs;
    this.sessionStartTime = now - this.totalPausedElapsedMs;
    this.startTicker();
    this.emit();
  }

  public stop(): void {
    this.reset();
  }

  public reset(): void {
    this.voiceAnnouncer?.cancel();
    this.stopTicker();
    this.state = 'STOPPED';
    this.currentRep = 1;
    this.phaseElapsedPausedMs = 0;
    this.sessionStartTime = 0;
    this.totalPausedElapsedMs = 0;
    this.currentPhase = this.findFirstNonZeroPhase();
    this.phaseDurationSeconds = this.getPhaseDuration(this.currentPhase);
    this.phaseDurationMs = this.phaseDurationSeconds * 1000;
    this.lastBeatSecond = 0;
    this.emit();
  }

  public setTempo(tempo: string): void {
    const parsed = parseTempo(tempo);
    this.parsed = parsed;
    this.tempoRaw = parsed.raw;

    if (this.state === 'STOPPED') {
      this.currentPhase = this.findFirstNonZeroPhase();
      this.phaseDurationSeconds = this.getPhaseDuration(this.currentPhase);
      this.phaseDurationMs = this.phaseDurationSeconds * 1000;
      this.emit();
    }
  }

  public setTargetReps(reps: number): void {
    this.targetReps = Math.max(0, reps);
    this.emit();
  }

  public setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
  }

  public isSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  public setVoiceEnabled(enabled: boolean): void {
    this.voiceEnabled = enabled;
  }

  public isVoiceEnabled(): boolean {
    return this.voiceEnabled;
  }

  public setVoiceAnnouncer(announcer: IVoiceAnnouncer | null): void {
    this.voiceAnnouncer = announcer;
  }

  public setAudioSynthesizer(synth: IAudioSynthesizer | null): void {
    this.audioSynthesizer = synth;
  }

  public getSnapshot(): MetronomeSnapshot {
    const isRunning = this.state === 'ACTIVE';
    let elapsedMs = 0;

    if (this.state === 'ACTIVE') {
      elapsedMs = Math.max(0, performance.now() - this.phaseStartTime);
    } else if (this.state === 'PAUSED') {
      elapsedMs = this.phaseElapsedPausedMs;
    }

    const remainingMs = Math.max(0, this.phaseDurationMs - elapsedMs);
    const phaseProgressRatio =
      this.phaseDurationMs > 0
        ? Math.min(1.0, Math.max(0.0, elapsedMs / this.phaseDurationMs))
        : 1.0;

    const phaseRemainingSecondsExact = remainingMs / 1000;
    const phaseRemainingSeconds =
      remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0;

    const repElapsedMs = this.calculateRepElapsedMs(elapsedMs);
    const repProgressRatio =
      this.parsed.totalDuration > 0
        ? Math.min(1.0, Math.max(0.0, repElapsedMs / (this.parsed.totalDuration * 1000)))
        : 1.0;

    const isExplosive =
      this.currentPhase === 'concentric' && this.parsed.isConcentricExplosive;

    let totalElapsedMs = 0;
    if (this.state === 'ACTIVE') {
      totalElapsedMs = Math.max(0, performance.now() - this.sessionStartTime);
    } else if (this.state === 'PAUSED') {
      totalElapsedMs = this.totalPausedElapsedMs;
    }
    const totalElapsedSeconds = Math.floor(totalElapsedMs / 1000);

    const formatMMSSLocal = (sec: number) => {
      const safe = Math.max(0, Math.floor(sec));
      const m = Math.floor(safe / 60);
      const s = safe % 60;
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    return {
      state: this.state,
      isRunning,
      tempo: this.tempoRaw,
      parsedTempo: this.parsed,
      currentPhase: this.currentPhase,
      phaseRemainingSeconds,
      phaseRemainingSecondsExact,
      phaseTotalSeconds: this.phaseDurationSeconds,
      phaseProgressRatio,
      currentRep: this.currentRep,
      targetReps: this.targetReps,
      isExplosive,
      repProgressRatio,
      phaseLabel: this.getPhaseLabel(this.currentPhase, isExplosive),
      phaseColor: this.getPhaseColor(this.currentPhase),
      totalElapsedSeconds,
      formattedPhaseMMSS: formatMMSSLocal(phaseRemainingSeconds),
      formattedElapsedMMSS: formatMMSSLocal(totalElapsedSeconds),
    };
  }

  // --- Subscriptions & Callbacks ---

  public subscribe(listener: MetronomeSubscriber): () => void {
    this.subscribers.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.subscribers.delete(listener);
    };
  }

  public onPhaseChange(callback: PhaseChangeCallback): () => void {
    this.phaseChangeCallbacks.add(callback);
    return () => {
      this.phaseChangeCallbacks.delete(callback);
    };
  }

  public onRepComplete(callback: RepCompleteCallback): () => void {
    this.repCompleteCallbacks.add(callback);
    return () => {
      this.repCompleteCallbacks.delete(callback);
    };
  }

  public onSetComplete(callback: SetCompleteCallback): () => void {
    this.setCompleteCallbacks.add(callback);
    return () => {
      this.setCompleteCallbacks.delete(callback);
    };
  }

  public destroy(): void {
    this.voiceAnnouncer?.cancel();
    this.voiceAnnouncer = null;
    this.stopTicker();
    this.subscribers.clear();
    this.phaseChangeCallbacks.clear();
    this.repCompleteCallbacks.clear();
    this.setCompleteCallbacks.clear();
    this.audioSynthesizer = null;
  }

  // --- Private Execution Logic ---

  private startTicker(): void {
    this.stopTicker();
    this.tickerId = setInterval(() => this.tick(), this.tickIntervalMs);
  }

  private stopTicker(): void {
    if (this.tickerId !== null) {
      clearInterval(this.tickerId);
      this.tickerId = null;
    }
  }

  private tick(): void {
    if (this.state !== 'ACTIVE') return;

    const now = performance.now();
    const elapsedMs = now - this.phaseStartTime;

    // Check cadence beat ticks (whole seconds)
    const currentSecond = Math.floor(elapsedMs / 1000);
    if (currentSecond > this.lastBeatSecond && currentSecond < this.phaseDurationSeconds) {
      this.playTone('tick');
      this.lastBeatSecond = currentSecond;
    }

    // Check phase completion
    if (elapsedMs >= this.phaseDurationMs) {
      this.advancePhase();
    } else {
      this.emit();
    }
  }

  private activatePhase(phase: TempoPhase, durationSec: number, isInitialStart = false): void {
    this.currentPhase = phase;
    this.phaseDurationSeconds = durationSec;
    this.phaseDurationMs = durationSec * 1000;
    this.phaseStartTime = performance.now();
    this.lastBeatSecond = 0;

    // Trigger phase entry audio tone
    this.playPhaseAudioTone(phase);

    // Trigger phase entry voice announcement
    if (this.voiceEnabled && this.voiceAnnouncer) {
      this.voiceAnnouncer.announcePhase(phase, {
        isBreathing: this.isBreathing(),
        isExplosive: this.parsed.isConcentricExplosive,
        isIsometric: Boolean(this.parsed.isIsometricHold || this.parsed.raw === '0010' || this.parsed.raw?.startsWith('HOLD-')),
        tempo: this.tempoRaw,
      });
    }

    const snapshot = this.getSnapshot();
    this.phaseChangeCallbacks.forEach((cb) => {
      try {
        cb(phase, this.currentRep, snapshot);
      } catch (err) {
        console.error('Error in onPhaseChange callback:', err);
      }
    });

    if (!isInitialStart) {
      this.emit();
    }
  }

  private advancePhase(): void {
    const phaseOrder: TempoPhase[] = ['eccentric', 'pauseBottom', 'concentric', 'pauseTop'];
    let idx = phaseOrder.indexOf(this.currentPhase);

    while (true) {
      idx = (idx + 1) % 4;

      if (idx === 0) {
        // Completed full rep
        const completedRep = this.currentRep;
        this.currentRep++;

        this.repCompleteCallbacks.forEach((cb) => {
          try {
            cb(completedRep, this.targetReps);
          } catch (err) {
            console.error('Error in onRepComplete callback:', err);
          }
        });

        // Check target reps completion
        if (this.targetReps > 0 && completedRep >= this.targetReps) {
          this.finishSet(completedRep);
          return;
        }

        if (this.voiceEnabled && this.voiceAnnouncer) {
          this.voiceAnnouncer.announceRep(completedRep, this.targetReps);
        }
      }

      const nextPhase = phaseOrder[idx];
      const durationSec = this.getPhaseDuration(nextPhase);

      if (durationSec > 0) {
        this.activatePhase(nextPhase, durationSec);
        break;
      }
    }
  }

  private finishSet(completedReps: number): void {
    this.stopTicker();
    this.state = 'STOPPED';
    this.currentRep = completedReps; // keep final rep on display

    this.playTone('completion');

    if (this.voiceEnabled && this.voiceAnnouncer) {
      this.voiceAnnouncer.announceSetComplete();
    }

    this.setCompleteCallbacks.forEach((cb) => {
      try {
        cb(completedReps);
      } catch (err) {
        console.error('Error in onSetComplete callback:', err);
      }
    });

    this.emit();
  }

  private isBreathing(): boolean {
    const raw = (this.tempoRaw || '').toLowerCase();
    return raw === '5083' || raw.includes('inhale') || raw.includes('exhale') || raw.includes('breath');
  }

  private playPhaseAudioTone(phase: TempoPhase): void {
    switch (phase) {
      case 'eccentric':
        this.playTone('tempo-eccentric');
        break;
      case 'pauseBottom':
      case 'pauseTop':
        this.playTone('tempo-pause');
        break;
      case 'concentric':
        this.playTone('tempo-concentric');
        break;
    }
  }

  private playTone(tone: AudioToneType): void {
    if (!this.soundEnabled || !this.audioSynthesizer) return;
    try {
      this.audioSynthesizer.playTone(tone);
    } catch {
      // Audio errors must never interrupt timing logic
    }
  }

  private findFirstNonZeroPhase(): TempoPhase {
    const phaseOrder: TempoPhase[] = ['eccentric', 'pauseBottom', 'concentric', 'pauseTop'];
    for (const phase of phaseOrder) {
      if (this.getPhaseDuration(phase) > 0) {
        return phase;
      }
    }
    return 'eccentric';
  }

  private getPhaseDuration(phase: TempoPhase): number {
    switch (phase) {
      case 'eccentric':
        return this.parsed.eccentric;
      case 'pauseBottom':
        return this.parsed.pauseBottom;
      case 'concentric':
        return this.parsed.concentric;
      case 'pauseTop':
        return this.parsed.pauseTop;
    }
  }

  private calculateRepElapsedMs(currentPhaseElapsedMs: number): number {
    let priorSec = 0;
    const phaseOrder: TempoPhase[] = ['eccentric', 'pauseBottom', 'concentric', 'pauseTop'];
    for (const phase of phaseOrder) {
      if (phase === this.currentPhase) break;
      priorSec += this.getPhaseDuration(phase);
    }
    return priorSec * 1000 + currentPhaseElapsedMs;
  }

  private getPhaseLabel(phase: TempoPhase, isExplosive: boolean): string {
    if (this.parsed.isIsometricHold) {
      return `ISOMETRIC HOLD (${this.parsed.holdDurationSeconds || this.parsed.totalDuration}s)`;
    }
    if (this.isBreathing()) {
      switch (phase) {
        case 'eccentric':
          return 'INHALE (BELLY 360°)';
        case 'pauseBottom':
          return 'HOLD BREATH';
        case 'concentric':
          return 'EXHALE (VACUUM BRACE)';
        case 'pauseTop':
          return 'PAUSE VACUUM';
      }
    }
    switch (phase) {
      case 'eccentric':
        return 'LOWER (ECCENTRIC)';
      case 'pauseBottom':
        return 'HOLD BOTTOM';
      case 'concentric':
        return isExplosive ? 'EXPLODE UP! (X)' : 'DRIVE UP';
      case 'pauseTop':
        return 'SQUEEZE TOP';
    }
  }

  private getPhaseColor(phase: TempoPhase): string {
    if (this.parsed.isIsometricHold) {
      return '#10B981'; // Emerald
    }
    if (this.isBreathing()) {
      switch (phase) {
        case 'eccentric':
          return '#06B6D4'; // Cyan
        case 'pauseBottom':
          return '#F59E0B'; // Amber
        case 'concentric':
          return '#3B82F6'; // Blue
        case 'pauseTop':
          return '#8B5CF6'; // Violet
      }
    }
    switch (phase) {
      case 'eccentric':
        return '#3B82F6'; // Blue
      case 'pauseBottom':
        return '#F59E0B'; // Amber
      case 'concentric':
        return '#10B981'; // Emerald
      case 'pauseTop':
        return '#8B5CF6'; // Violet
    }
  }

  private emit(): void {
    const snapshot = this.getSnapshot();
    this.subscribers.forEach((listener) => {
      try {
        listener(snapshot);
      } catch (err) {
        console.error('Error in metronome subscriber listener:', err);
      }
    });
  }
}
