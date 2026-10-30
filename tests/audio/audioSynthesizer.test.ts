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
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      await synthesizer.init();
      const ctx = synthesizer.getAudioContext() as any;
      ctx.state = 'suspended';
      vi.spyOn(ctx, 'resume').mockRejectedValueOnce(new Error('Autoplay blocked'));

      await expect(synthesizer.init()).resolves.not.toThrow();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('AudioSynthesizer init failed'),
        expect.any(Error)
      );
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
