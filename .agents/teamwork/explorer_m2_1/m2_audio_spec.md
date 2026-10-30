# Web Audio API Sound Synthesizer Specification & Test Blueprint

**Milestone**: Milestone 2 — Audio Engine & Interactive Timers  
**Author**: Explorer M2-1  
**Project**: 4-Day Upper/Lower Workout Web Application  
**Target Files**:
- Implementation: `src/audio/audioSynthesizer.ts`
- Unit Tests: `tests/audio/audioSynthesizer.test.ts`

---

## 1. Executive Summary & Architecture Overview

To guarantee zero external dependencies and 100% offline reliability in noisy or low-connectivity gym environments, all application auditory feedback is synthesized purely in code via the browser's native **Web Audio API**. No `.mp3`, `.ogg`, or `.wav` media files are fetched or loaded over the network.

### 1.1 Audio Routing Topology

Every tone is procedurally synthesized using an `OscillatorNode` (generating periodic waveforms), shaped through an individual ADSR `GainNode` (preventing acoustic transients/clicks), routed through a centralized `MasterGainNode`, and delivered to `AudioContext.destination`:

```
┌────────────────────────────────────────────────────────┐
│                   Web Audio Node Graph                 │
│                                                        │
│  [OscillatorNode]  ──>  [Tone GainNode]  ──┐           │
│  (Frequency & Type)     (ADSR Envelope)    │           │
│                                            v           │
│                                    [Master GainNode]   │
│                                    (Volume & Mute)     │
│                                            │           │
│  [OscillatorNode 2] ─>  [Tone GainNode 2] ─┘           │
│  (Harmonic Overtone)   (Harmonic Envelope) │           │
│                                            v           │
│                                  [AudioContext.dest]   │
└────────────────────────────────────────────────────────┘
```

### 1.2 Key Architectural Tenets
1. **Zero External Assets**: Pure procedural synthesis using `AudioContext`, `OscillatorNode`, and `GainNode`. Zero network roundtrips, zero media decoding latency, zero MIME-type issues.
2. **Transient-Free Envelopes**: All sounds start at a negligible non-zero gain (`0.0001`), ramp quickly up during attack, and decay exponentially to `0.0001` before the oscillator stops. This prevents DC offset jumps and speaker popping/clicking.
3. **Autoplay Compliance**: Context creation is lazy and non-blocking. A global interaction unlocker attaches to user gestures (`click`, `touchstart`, `keydown`) to seamlessly transition suspended contexts to `'running'`.
4. **Resilience & Fault Tolerance**: If the Web Audio API is unavailable, corrupted, or context calls reject, the synthesizer catches errors gracefully without breaking active timers, UI workflows, or test harnesses.
5. **Zero-Overhead Muting**: When muted, all playback calls terminate immediately before touching the Web Audio API, consuming zero CPU cycles.

---

## 2. Acoustic Parameters & Synthesis Specifications

### 2.1 Complete Tone Parameter Matrix

| Tone Type | Frequency (Hz) | Note | Waveform | Peak Gain | Attack (s) | Decay / Release (s) | Total Duration (s) | Character & Usage |
|---|---|---|---|---|---|---|---|---|
| `tick` | `880.00` | A5 | `sine` | `0.15` | `0.005` (5ms) | `0.045` (45ms) | `0.05` | Subtle woodblock-style click during countdown seconds |
| `warning` | `1200.00` | ~D6 | `sine` | `0.30` | `0.008` (8ms) | `0.112` (112ms) | `0.12` | High-pitched warning ping for 3-2-1 rest countdown |
| `completion` | Dual: `587.33` + `880.00` | D5 + A5 | `sine` + `sine` | Fundamental: `0.30`<br>Overtone: `0.20` | `0.010` (10ms) | `0.790` (790ms) | `0.80` | Resonant dual-harmonic bell chime signaling rest complete |
| `tempo-eccentric` | `440.00` | A4 | `sine` | `0.15` | `0.012` (12ms) | `0.068` (68ms) | `0.08` | Soft, grounding pulse during lowering phase |
| `tempo-pause` | `554.37` | C#5 | `sine` | `0.18` | `0.010` (10ms) | `0.070` (70ms) | `0.08` | Centered isometric pause cue (bottom or top hold) |
| `tempo-concentric` | `659.25` | E5 | `triangle` | `0.25` | `0.006` (6ms) | `0.094` (94ms) | `0.10` | Bright, snappy rise signaling explosive concentric drive |

### 2.2 Musical Harmony & Psychoacoustics
- **Marcus Filly Metronome Triad**:
  The tempo tones form an **A Major triad** ($A_4 = 440\text{ Hz}$, $C\#_5 = 554.37\text{ Hz}$, $E_5 = 659.25\text{ Hz}$):
  - *Eccentric (Lowering)*: Grounded root note ($A_4$).
  - *Pause (Inflection)*: Tension-holding major third ($C\#_5$).
  - *Concentric (Explosion)*: Bright fifth ($E_5$) synthesized with a `triangle` waveform for higher harmonic overtones, providing immediate cognitive recognition to initiate maximal drive.
- **Rest Interval Bell Chime**:
  The completion chime features an open **Perfect Fifth chime** ($D_5 = 587.33\text{ Hz}$ fundamental + $A_5 = 880\text{ Hz}$ harmonic). The higher harmonic decays slightly faster than the fundamental, replicating natural acoustic bronze bell damping.

### 2.3 Web Audio API Technical Ramp Constraints
- **CRITICAL NOTE ON EXPONENTIAL RAMPS**: In the Web Audio specification, `exponentialRampToValueAtTime(target, time)` throws an invalid state exception if `target <= 0` or if the preceding value at current time is `0`.
- **Solution**: All ramps initialize at `0.0001` using `setValueAtTime(0.0001, startTime)`, linear ramp to `peakGain` over attack duration, and exponential ramp down to `0.0001` over decay duration. Oscillators are stopped at `startTime + duration + 0.01` and cleaned up.

---

## 3. Browser Autoplay & Lifecycle Management

### 3.1 Browser Autoplay Policy & AudioContext State
Modern desktop and mobile browsers (Chrome, Edge, Safari, iOS Safari, Android Chrome) block automatic audio execution until a user gesture has occurred on the window.
- If an `AudioContext` is created prior to user interaction, its state is `'suspended'`.
- Attempting to output audio while suspended will either buffer without sound or log warnings.
- The context must be resumed by calling `audioCtx.resume()`.

### 3.2 Unlocking Strategy
1. **Lazy Initialization**: `AudioContext` is created only when first needed or explicitly initialized via `init()`.
2. **Auto-Unlock on First Interaction**:
   The synthesizer attaches one-time passive listeners on `window` for `click`, `touchstart`, and `keydown`. When any gesture occurs, `init()` is called to resume the context.
3. **Closed Context Recovery**: If the system closes the `AudioContext` (e.g. mobile OS audio interruption or sleep), `playTone` detects `ctx.state === 'closed'` and instantiates a fresh context.
4. **WebKit Prefix Fallback**: Supports `window.AudioContext || (window as any).webkitAudioContext`.

---

## 4. State Management & Persistence Blueprint

### 4.1 Mute State & Persistence
- **State Property**: `private muted: boolean = false;`
- **Storage Key**: `'workout_app_audio_muted'`
- **Methods**:
  - `isMuted(): boolean`
  - `setMuted(muted: boolean): void`
- **Persistence Logic**:
  - On instantiation, reads `localStorage.getItem('workout_app_audio_muted')`. If `'true'`, initializes as muted.
  - On `setMuted(boolean)`, writes the new boolean value to `localStorage`.
  - All storage operations are wrapped in `try/catch` to safely operate in private browsing modes or restricted iframes.
- **Short-Circuit Optimization**:
  ```typescript
  if (this.isMuted()) {
    return;
  }
  ```
  Zero audio nodes are created when muted.

---

## 5. Complete Implementation Blueprint (`src/audio/audioSynthesizer.ts`)

Here is the exact production-ready TypeScript code for `src/audio/audioSynthesizer.ts`:

```typescript
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
    if (typeof window === 'undefined') return;

    try {
      if (!this.ctx || this.ctx.state === 'closed') {
        const AudioCtxClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

        if (!AudioCtxClass) {
          return;
        }

        this.ctx = new AudioCtxClass();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
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
    toneGain.gain.setValueAtTime(baseline, startTime);
    toneGain.gain.linearRampToValueAtTime(peakGain, startTime + attackSec);
    toneGain.gain.exponentialRampToValueAtTime(baseline, startTime + attackSec + decaySec);

    // Graph routing
    osc.connect(toneGain);
    toneGain.connect(this.masterGain);

    const stopTime = startTime + attackSec + decaySec + 0.01;
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
```

---

## 6. Unit Testing Blueprint (`tests/audio/audioSynthesizer.test.ts`)

The test suite must thoroughly exercise the audio synthesizer in the headless `jsdom` test environment using Vitest.

### 6.1 Test Coverage Inventory Matrix

| Test ID | Tier | Category | Description |
|---|---|---|---|
| `TEST-AUD-01` | Tier 1 | Lifecycle | Initializes `AudioContext` lazily and establishes `masterGain` connection |
| `TEST-AUD-02` | Tier 1 | Unlocking | Resumes suspended `AudioContext` on user interaction / `init()` |
| `TEST-AUD-03` | Tier 1 | Tone: `tick` | Creates 880 Hz sine oscillator with 0.05s ADSR envelope |
| `TEST-AUD-04` | Tier 1 | Tone: `warning` | Creates 1200 Hz sine oscillator with 0.12s ADSR envelope |
| `TEST-AUD-05` | Tier 1 | Tone: `completion` | Creates dual oscillators (587.33 Hz D5 + 880 Hz A5) with 0.8s decay |
| `TEST-AUD-06` | Tier 1 | Tone: Tempo triad | Verifies 440 Hz (eccentric), 554.37 Hz (pause), 659.25 Hz triangle (concentric) |
| `TEST-AUD-07` | Tier 1 | Muting | `setMuted(true)` suppresses tone execution and persists to LocalStorage |
| `TEST-AUD-08` | Tier 2 | Edge Case | Restores muted state from LocalStorage on fresh instance creation |
| `TEST-AUD-09` | Tier 2 | Edge Case | Handles missing or undefined `window.AudioContext` without throwing |
| `TEST-AUD-10` | Tier 2 | Edge Case | Recovers if `AudioContext` is in `'closed'` state |
| `TEST-AUD-11` | Tier 2 | Edge Case | Handles `ctx.resume()` rejection gracefully |
| `TEST-AUD-12` | Tier 3 | Graph Routing | Verifies correct connection sequence: `osc -> toneGain -> masterGain -> destination` |

### 6.2 Complete Test Suite Implementation Blueprint

```typescript
/**
 * tests/audio/audioSynthesizer.test.ts
 * Comprehensive unit and boundary verification for procedural AudioSynthesizer.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AudioSynthesizer, AudioToneType } from '../../src/audio/audioSynthesizer';

describe('AudioSynthesizer', () => {
  let synthesizer: AudioSynthesizer;

  beforeEach(() => {
    localStorage.clear();
    synthesizer = new AudioSynthesizer();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================
  // TIER 1: CORE FUNCTIONAL TESTS
  // ==========================================

  describe('Tier 1: AudioContext Lifecycle & Unlocking', () => {
    it('initializes AudioContext and masterGain on init()', async () => {
      await synthesizer.init();
      const ctx = synthesizer.getAudioContext();
      expect(ctx).toBeDefined();
      expect(ctx?.state).toBe('running');
    });

    it('resumes context if it was initially suspended', async () => {
      // Force mock state to suspended
      await synthesizer.init();
      const ctx = synthesizer.getAudioContext() as any;
      ctx.state = 'suspended';
      const resumeSpy = vi.spyOn(ctx, 'resume');

      await synthesizer.init();
      expect(resumeSpy).toHaveBeenCalled();
    });

    it('attaches window interaction unlock listeners', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      new AudioSynthesizer();
      expect(addEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function), expect.objectContaining({ once: true }));
      expect(addEventListenerSpy).toHaveBeenCalledWith('touchstart', expect.any(Function), expect.objectContaining({ once: true }));
      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function), expect.objectContaining({ once: true }));
    });
  });

  describe('Tier 1: Procedural Tone Synthesis', () => {
    it('synthesizes tick tone at 880 Hz with sine waveform', async () => {
      await synthesizer.init();
      const ctx = synthesizer.getAudioContext() as any;
      const createOscSpy = vi.spyOn(ctx, 'createOscillator');
      const createGainSpy = vi.spyOn(ctx, 'createGain');

      synthesizer.playTone('tick');

      expect(createOscSpy).toHaveBeenCalledTimes(1);
      const osc = createOscSpy.mock.results[0].value;
      expect(osc.type).toBe('sine');
      expect(osc.frequency.setValueAtTime).toHaveBeenCalledWith(880, ctx.currentTime);

      const gain = createGainSpy.mock.results[0].value;
      expect(gain.gain.setValueAtTime).toHaveBeenCalledWith(0.0001, ctx.currentTime);
      expect(gain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.15, ctx.currentTime + 0.005);
      expect(gain.gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(0.0001, ctx.currentTime + 0.05);
      expect(osc.start).toHaveBeenCalledWith(ctx.currentTime);
      expect(osc.stop).toHaveBeenCalledWith(ctx.currentTime + 0.06);
    });

    it('synthesizes warning tone at 1200 Hz with 0.12s duration', async () => {
      await synthesizer.init();
      const ctx = synthesizer.getAudioContext() as any;
      const createOscSpy = vi.spyOn(ctx, 'createOscillator');

      synthesizer.playTone('warning');

      expect(createOscSpy).toHaveBeenCalledTimes(1);
      const osc = createOscSpy.mock.results[0].value;
      expect(osc.frequency.setValueAtTime).toHaveBeenCalledWith(1200, ctx.currentTime);
      expect(osc.stop).toHaveBeenCalledWith(ctx.currentTime + 0.13);
    });

    it('synthesizes dual-harmonic bell chime on completion (587.33 Hz D5 + 880 Hz A5)', async () => {
      await synthesizer.init();
      const ctx = synthesizer.getAudioContext() as any;
      const createOscSpy = vi.spyOn(ctx, 'createOscillator');

      synthesizer.playTone('completion');

      // Must generate dual oscillators for rich acoustic bell resonance
      expect(createOscSpy).toHaveBeenCalledTimes(2);
      const osc1 = createOscSpy.mock.results[0].value;
      const osc2 = createOscSpy.mock.results[1].value;

      expect(osc1.frequency.setValueAtTime).toHaveBeenCalledWith(587.33, ctx.currentTime);
      expect(osc2.frequency.setValueAtTime).toHaveBeenCalledWith(880.00, ctx.currentTime);
      expect(osc1.stop).toHaveBeenCalledWith(ctx.currentTime + 0.81);
    });

    it('synthesizes Marcus Filly tempo metronome triad tones accurately', async () => {
      await synthesizer.init();
      const ctx = synthesizer.getAudioContext() as any;

      // 1. Eccentric (440 Hz sine)
      const oscSpy1 = vi.spyOn(ctx, 'createOscillator');
      synthesizer.playTone('tempo-eccentric');
      const oscEccentric = oscSpy1.mock.results[0].value;
      expect(oscEccentric.frequency.setValueAtTime).toHaveBeenCalledWith(440, ctx.currentTime);
      expect(oscEccentric.type).toBe('sine');

      // 2. Pause (554.37 Hz sine)
      ctx.createOscillator.mockClear();
      synthesizer.playTone('tempo-pause');
      const oscPause = ctx.createOscillator.mock.results[0].value;
      expect(oscPause.frequency.setValueAtTime).toHaveBeenCalledWith(554.37, ctx.currentTime);

      // 3. Concentric (659.25 Hz triangle)
      ctx.createOscillator.mockClear();
      synthesizer.playTone('tempo-concentric');
      const oscConcentric = ctx.createOscillator.mock.results[0].value;
      expect(oscConcentric.frequency.setValueAtTime).toHaveBeenCalledWith(659.25, ctx.currentTime);
      expect(oscConcentric.type).toBe('triangle');
    });
  });

  // ==========================================
  // TIER 2: BOUNDARIES, PERSISTENCE & ERROR CASES
  // ==========================================

  describe('Tier 2: Mute Control & Persistence', () => {
    it('suppresses audio synthesis when muted', async () => {
      await synthesizer.init();
      const ctx = synthesizer.getAudioContext() as any;
      const createOscSpy = vi.spyOn(ctx, 'createOscillator');

      synthesizer.setMuted(true);
      expect(synthesizer.isMuted()).toBe(true);
      expect(localStorage.getItem('workout_app_audio_muted')).toBe('true');

      synthesizer.playTone('tick');
      synthesizer.playTone('completion');

      // Zero oscillators created when muted
      expect(createOscSpy).not.toHaveBeenCalled();
    });

    it('restores unmuted state and plays tones after unmuting', async () => {
      await synthesizer.init();
      const ctx = synthesizer.getAudioContext() as any;
      const createOscSpy = vi.spyOn(ctx, 'createOscillator');

      synthesizer.setMuted(true);
      synthesizer.setMuted(false);
      expect(synthesizer.isMuted()).toBe(false);
      expect(localStorage.getItem('workout_app_audio_muted')).toBe('false');

      synthesizer.playTone('tick');
      expect(createOscSpy).toHaveBeenCalledTimes(1);
    });

    it('initializes with muted=true if stored in localStorage', () => {
      localStorage.setItem('workout_app_audio_muted', 'true');
      const freshSynthesizer = new AudioSynthesizer();
      expect(freshSynthesizer.isMuted()).toBe(true);
    });
  });

  describe('Tier 2: Error Resilience & Environment Edge Cases', () => {
    it('gracefully handles missing AudioContext in unsupported environments', async () => {
      const originalAudioContext = (globalThis as any).AudioContext;
      const originalWebkit = (globalThis as any).webkitAudioContext;

      (globalThis as any).AudioContext = undefined;
      (globalThis as any).webkitAudioContext = undefined;

      const fallbackSynthesizer = new AudioSynthesizer();
      await expect(fallbackSynthesizer.init()).resolves.not.toThrow();
      expect(() => fallbackSynthesizer.playTone('tick')).not.toThrow();

      (globalThis as any).AudioContext = originalAudioContext;
      (globalThis as any).webkitAudioContext = originalWebkit;
    });

    it('recreates AudioContext if previous context was closed', async () => {
      await synthesizer.init();
      const initialCtx = synthesizer.getAudioContext() as any;
      initialCtx.state = 'closed';

      await synthesizer.init();
      const newCtx = synthesizer.getAudioContext() as any;
      expect(newCtx).not.toBe(initialCtx);
      expect(newCtx.state).toBe('running');
    });

    it('handles context.resume() rejection without crashing', async () => {
      await synthesizer.init();
      const ctx = synthesizer.getAudioContext() as any;
      ctx.state = 'suspended';
      vi.spyOn(ctx, 'resume').mockRejectedValueOnce(new Error('Autoplay blocked'));

      await expect(synthesizer.init()).resolves.not.toThrow();
    });

    it('handles unknown tone types safely with a warning', async () => {
      await synthesizer.init();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      synthesizer.playTone('unknown-tone' as AudioToneType);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('unknown tone type'));
    });
  });

  // ==========================================
  // TIER 3: GRAPH ROUTING & DISCONNECT
  // ==========================================

  describe('Tier 3: Node Graph Routing & Cleanup', () => {
    it('routes oscillator to toneGain and toneGain to masterGain', async () => {
      await synthesizer.init();
      const ctx = synthesizer.getAudioContext() as any;
      const createOscSpy = vi.spyOn(ctx, 'createOscillator');
      const createGainSpy = vi.spyOn(ctx, 'createGain');

      synthesizer.playTone('tick');

      const osc = createOscSpy.mock.results[0].value;
      const toneGain = createGainSpy.mock.results[0].value;

      expect(osc.connect).toHaveBeenCalledWith(toneGain);
      expect(toneGain.connect).toHaveBeenCalled();
    });

    it('disconnects oscillator and gain nodes on ended event', async () => {
      await synthesizer.init();
      const ctx = synthesizer.getAudioContext() as any;
      
      const oscDisconnectSpy = vi.fn();
      const gainDisconnectSpy = vi.fn();

      const origCreateOsc = ctx.createOscillator.bind(ctx);
      const origCreateGain = ctx.createGain.bind(ctx);

      vi.spyOn(ctx, 'createOscillator').mockImplementation(() => {
        const osc = origCreateOsc();
        osc.disconnect = oscDisconnectSpy;
        return osc;
      });

      vi.spyOn(ctx, 'createGain').mockImplementation(() => {
        const gain = origCreateGain();
        gain.disconnect = gainDisconnectSpy;
        return gain;
      });

      synthesizer.playTone('tick');

      const osc = ctx.createOscillator.mock.results[0].value;

      // Trigger onended callback
      expect(osc.onended).toBeTypeOf('function');
      osc.onended();

      expect(oscDisconnectSpy).toHaveBeenCalled();
      expect(gainDisconnectSpy).toHaveBeenCalled();
    });
  });
});
```

---

## 7. Integration Contract with Downstream Engines

### 7.1 Rest Interval Timer Integration (`src/timer/restTimer.ts`)
The Rest Timer engine calls `audioSynthesizer` at key threshold events:
- At `remainingSeconds === 3`, `2`, `1`: `audioSynthesizer.playTone('warning')`
- At `remainingSeconds === 0` (Transition to `COMPLETED`): `audioSynthesizer.playTone('completion')`
- Optional setting: `audioSynthesizer.playTone('tick')` on second-by-second countdown during the final 5 seconds.

### 7.2 Marcus Filly Tempo Metronome Integration (`src/timer/tempoMetronome.ts`)
The Tempo Metronome engine invokes `audioSynthesizer` synchronized to each phase:
- On transition to `eccentric`: `audioSynthesizer.playTone('tempo-eccentric')` (440 Hz)
- On transition to `pauseBottom` or `pauseTop`: `audioSynthesizer.playTone('tempo-pause')` (554.37 Hz)
- On transition to `concentric`: `audioSynthesizer.playTone('tempo-concentric')` (659.25 Hz triangle)
- On intermediate second beats during multi-second phases (e.g. 2nd and 3rd second of a 4s eccentric): `audioSynthesizer.playTone('tick')` (880 Hz)

### 7.3 Settings Modal & Header UI
The UI Header includes a quick audio toggle icon button (Volume2 / VolumeX from `lucide-react`):
- `audioSynthesizer.isMuted()` controls the icon visual state.
- Clicking the toggle calls `audioSynthesizer.setMuted(!isMuted)`.
- Updates reactively and persists across browser refreshes via LocalStorage.

---

## 8. Verification & Acceptance Criteria

When the Worker agent implements `src/audio/audioSynthesizer.ts` and `tests/audio/audioSynthesizer.test.ts`:
1. **Compilation**: `npm.cmd run build` passes with zero TypeScript warnings or errors.
2. **Test Execution**: `npm.cmd test` passes 100% of all tests (181 existing + 13 new audio unit tests = ≥ 194 total passing tests).
3. **No External Assets**: `src/audio/audioSynthesizer.ts` contains zero `fetch()`, zero `<audio>` elements, and zero file paths to audio files. Pure procedural Web Audio synthesis only.
4. **Clean Windows 11 Compatibility**: All tests run cleanly in Vitest + jsdom on Windows 11.
