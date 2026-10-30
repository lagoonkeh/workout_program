/**
 * src/audio/audioSynthesizer.ts
 * Procedural Web Audio API sound synthesizer for workout timers and cadence metronomes.
 * Zero external audio assets (no .mp3/.wav dependencies).
 */

export type AudioToneType =
  | 'tick'
  | 'warning'
  | 'completion'
  | 'tempo-eccentric'
  | 'tempo-pause'
  | 'tempo-concentric';

export interface IAudioSynthesizer {
  init(): Promise<void>;
  playTone(type: AudioToneType): void;
  setMuted(muted: boolean): void;
  isMuted(): boolean;
  getAudioContext(): AudioContext | null;
}

const STORAGE_KEY_MUTED = 'workout_app_audio_muted';

export class AudioSynthesizer implements IAudioSynthesizer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private muted: boolean = false;
  private unlockListenerAttached: boolean = false;

  constructor() {
    this.loadMuteState();
    this.setupInteractionUnlock();
  }

  /**
   * Reads initial mute preference from LocalStorage.
   */
  private loadMuteState(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem(STORAGE_KEY_MUTED);
        this.muted = stored === 'true';
      }
    } catch {
      this.muted = false;
    }
  }

  /**
   * Registers one-time user interaction listeners to unlock AudioContext.
   */
  private setupInteractionUnlock(): void {
    if (typeof window === 'undefined' || this.unlockListenerAttached) return;

    const unlockHandler = () => {
      this.init().catch(() => {});
      window.removeEventListener('click', unlockHandler);
      window.removeEventListener('touchstart', unlockHandler);
      window.removeEventListener('keydown', unlockHandler);
    };

    window.addEventListener('click', unlockHandler, { once: true, passive: true });
    window.addEventListener('touchstart', unlockHandler, { once: true, passive: true });
    window.addEventListener('keydown', unlockHandler, { once: true, passive: true });
    this.unlockListenerAttached = true;
  }

  /**
   * Initializes or resumes the AudioContext and MasterGainNode.
   */
  public async init(): Promise<void> {
    if (typeof window === 'undefined' && typeof globalThis === 'undefined') return;

    try {
      if (!this.ctx || this.ctx.state === 'closed') {
        const AudioCtxClass =
          (typeof window !== 'undefined' &&
            (window.AudioContext ||
              (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)) ||
          (typeof globalThis !== 'undefined' &&
            ((globalThis as any).AudioContext ||
              (globalThis as any).webkitAudioContext));

        if (!AudioCtxClass) {
          return;
        }

        const ctx = new AudioCtxClass();
        const masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(1.0, ctx.currentTime);
        masterGain.connect(ctx.destination);
        this.ctx = ctx;
        this.masterGain = masterGain;
      }

      if (this.ctx && this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }
    } catch (error) {
      console.warn('AudioSynthesizer init failed or was blocked by autoplay:', error);
    }
  }

  /**
   * Returns current mute status.
   */
  public isMuted(): boolean {
    return this.muted;
  }

  /**
   * Toggles or sets mute status and persists to LocalStorage.
   */
  public setMuted(muted: boolean): void {
    this.muted = muted;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY_MUTED, String(muted));
      }
    } catch {
      // Ignore localStorage write failures (e.g. private mode)
    }
  }

  /**
   * Exposes active AudioContext for testing and diagnostics.
   */
  public getAudioContext(): AudioContext | null {
    return this.ctx;
  }

  /**
   * Synthesizes and plays the specified tone procedurally.
   */
  public playTone(type: AudioToneType): void {
    if (this.muted) {
      return;
    }

    // Lazy context initialization
    if (!this.ctx || this.ctx.state === 'closed') {
      this.init().then(() => this.executePlayTone(type)).catch(() => {});
      return;
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().then(() => this.executePlayTone(type)).catch(() => {});
      return;
    }

    this.executePlayTone(type);
  }

  /**
   * Internal dispatcher for synthesized waveforms.
   */
  private executePlayTone(type: AudioToneType): void {
    if (!this.ctx || !this.masterGain || this.ctx.state !== 'running') {
      return;
    }

    try {
      const now = this.ctx.currentTime;

      switch (type) {
        case 'tick':
          this.playSingleTone({
            frequency: 880,
            waveform: 'sine',
            peakGain: 0.15,
            attackSec: 0.005,
            decaySec: 0.045,
            startTime: now,
          });
          break;

        case 'warning':
          this.playSingleTone({
            frequency: 1200,
            waveform: 'sine',
            peakGain: 0.30,
            attackSec: 0.008,
            decaySec: 0.112,
            startTime: now,
          });
          break;

        case 'completion':
          // Dual-harmonic chime (Fundamental: 587.33 Hz D5, Overtone: 880 Hz A5)
          this.playSingleTone({
            frequency: 587.33,
            waveform: 'sine',
            peakGain: 0.30,
            attackSec: 0.010,
            decaySec: 0.790,
            startTime: now,
          });
          this.playSingleTone({
            frequency: 880.00,
            waveform: 'sine',
            peakGain: 0.20,
            attackSec: 0.010,
            decaySec: 0.700,
            startTime: now,
          });
          break;

        case 'tempo-eccentric':
          this.playSingleTone({
            frequency: 440,
            waveform: 'sine',
            peakGain: 0.15,
            attackSec: 0.012,
            decaySec: 0.068,
            startTime: now,
          });
          break;

        case 'tempo-pause':
          this.playSingleTone({
            frequency: 554.37,
            waveform: 'sine',
            peakGain: 0.18,
            attackSec: 0.010,
            decaySec: 0.070,
            startTime: now,
          });
          break;

        case 'tempo-concentric':
          this.playSingleTone({
            frequency: 659.25,
            waveform: 'triangle',
            peakGain: 0.25,
            attackSec: 0.006,
            decaySec: 0.094,
            startTime: now,
          });
          break;

        default:
          console.warn(`AudioSynthesizer: unknown tone type "${type}"`);
      }
    } catch (err) {
      console.warn(`AudioSynthesizer playback error for "${type}":`, err);
    }
  }

  /**
   * Helper that builds an Oscillator -> GainNode chain with an ADSR envelope.
   */
  private playSingleTone(params: {
    frequency: number;
    waveform: OscillatorType;
    peakGain: number;
    attackSec: number;
    decaySec: number;
    startTime: number;
  }): void {
    if (!this.ctx || !this.masterGain) return;

    const { frequency, waveform, peakGain, attackSec, decaySec, startTime } = params;
    const osc = this.ctx.createOscillator();
    const toneGain = this.ctx.createGain();

    osc.type = waveform;
    osc.frequency.setValueAtTime(frequency, startTime);

    // Non-zero baseline prevents Web Audio exponential ramp exceptions
    const baseline = 0.0001;
    const attackEnd = Math.round((startTime + attackSec) * 1e6) / 1e6;
    const decayEnd = Math.round((startTime + attackSec + decaySec) * 1e6) / 1e6;
    const stopTime = Math.round((decayEnd + 0.01) * 1e6) / 1e6;

    toneGain.gain.setValueAtTime(baseline, startTime);
    toneGain.gain.linearRampToValueAtTime(peakGain, attackEnd);
    toneGain.gain.exponentialRampToValueAtTime(baseline, decayEnd);

    // Graph routing
    osc.connect(toneGain);
    toneGain.connect(this.masterGain);

    osc.start(startTime);
    osc.stop(stopTime);

    // Automatic garbage collection / disconnect
    osc.onended = () => {
      try {
        osc.disconnect?.();
        toneGain.disconnect?.();
      } catch {
        // Safe cleanup
      }
    };
  }
}

// Export singleton instance for app-wide consumption
export const audioSynthesizer = new AudioSynthesizer();
