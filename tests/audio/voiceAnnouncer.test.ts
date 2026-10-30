/**
 * tests/audio/voiceAnnouncer.test.ts
 * Unit tests for the Web Speech API VoiceAnnouncer engine.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VoiceAnnouncer } from '../../src/audio/voiceAnnouncer';

describe('VoiceAnnouncer', () => {
  let announcer: VoiceAnnouncer;

  beforeEach(() => {
    localStorage.clear();
    announcer = new VoiceAnnouncer();
  });

  describe('Initialization & Support', () => {
    it('detects Web Speech API support in browser environment', () => {
      expect(announcer.isSupported()).toBe(true);
    });

    it('defaults to enabled', () => {
      expect(announcer.isEnabled()).toBe(true);
    });

    it('toggles enabled state and persists to localStorage', () => {
      announcer.setEnabled(false);
      expect(announcer.isEnabled()).toBe(false);
      expect(localStorage.getItem('workout_app_voice_announcements_v1')).toBe('false');

      announcer.setEnabled(true);
      expect(announcer.isEnabled()).toBe(true);
      expect(localStorage.getItem('workout_app_voice_announcements_v1')).toBe('true');
    });
  });

  describe('Resistance Lifting Movement Cues', () => {
    it('announces "Down" during eccentric lowering', () => {
      const speakSpy = vi.spyOn(window.speechSynthesis, 'speak');
      announcer.announcePhase('eccentric', { tempo: '30X1', isExplosive: true });

      expect(speakSpy).toHaveBeenCalled();
      const utterance = speakSpy.mock.calls[0][0] as any;
      expect(utterance.text).toBe('Down');
    });

    it('announces "Hold" during bottom pause', () => {
      const speakSpy = vi.spyOn(window.speechSynthesis, 'speak');
      announcer.announcePhase('pauseBottom', { tempo: '31X1' });

      expect(speakSpy).toHaveBeenCalled();
      const utterance = speakSpy.mock.calls[0][0] as any;
      expect(utterance.text).toBe('Hold');
    });

    it('announces "Up!" during explosive concentric movement (X)', () => {
      const speakSpy = vi.spyOn(window.speechSynthesis, 'speak');
      announcer.announcePhase('concentric', { tempo: '30X1', isExplosive: true });

      expect(speakSpy).toHaveBeenCalled();
      const utterance = speakSpy.mock.calls[0][0] as any;
      expect(utterance.text).toBe('Up!');
    });

    it('announces "Drive" during controlled concentric movement', () => {
      const speakSpy = vi.spyOn(window.speechSynthesis, 'speak');
      announcer.announcePhase('concentric', { tempo: '4010', isExplosive: false });

      expect(speakSpy).toHaveBeenCalled();
      const utterance = speakSpy.mock.calls[0][0] as any;
      expect(utterance.text).toBe('Drive');
    });
  });

  describe('Diaphragmatic Breathing Cadence Cues (Alyssa Lu 5083)', () => {
    it('announces "Breathe in" during eccentric inhale phase', () => {
      const speakSpy = vi.spyOn(window.speechSynthesis, 'speak');
      announcer.announcePhase('eccentric', { tempo: '5083', isBreathing: true });

      expect(speakSpy).toHaveBeenCalled();
      const utterance = speakSpy.mock.calls[0][0] as any;
      expect(utterance.text).toBe('Breathe in');
    });

    it('announces "Breathe out" during concentric exhale phase', () => {
      const speakSpy = vi.spyOn(window.speechSynthesis, 'speak');
      announcer.announcePhase('concentric', { tempo: '5083', isBreathing: true });

      expect(speakSpy).toHaveBeenCalled();
      const utterance = speakSpy.mock.calls[0][0] as any;
      expect(utterance.text).toBe('Breathe out');
    });

    it('announces "Hold" and "Pause" during breathing breath-holds', () => {
      const speakSpy = vi.spyOn(window.speechSynthesis, 'speak');
      announcer.announcePhase('pauseBottom', { tempo: '5083', isBreathing: true });
      expect((speakSpy.mock.calls[0][0] as any).text).toBe('Hold');

      speakSpy.mockClear();
      announcer.announcePhase('pauseTop', { tempo: '5083', isBreathing: true });
      expect((speakSpy.mock.calls[0][0] as any).text).toBe('Pause');
    });
  });

  describe('Isometric & Cadence Walk Cues', () => {
    it('announces "Hold" for isometric protocols (0010)', () => {
      const speakSpy = vi.spyOn(window.speechSynthesis, 'speak');
      announcer.announcePhase('concentric', { tempo: '0010', isIsometric: true });

      expect(speakSpy).toHaveBeenCalled();
      expect((speakSpy.mock.calls[0][0] as any).text).toBe('Hold');
    });

    it('announces "Step" for rhythmic cadence walking (2020)', () => {
      const speakSpy = vi.spyOn(window.speechSynthesis, 'speak');
      announcer.announcePhase('eccentric', { tempo: '2020' });

      expect(speakSpy).toHaveBeenCalled();
      expect((speakSpy.mock.calls[0][0] as any).text).toBe('Step');
    });
  });

  describe('Rep, Set & Rest Timer Announcements', () => {
    it('announces regular rep number', () => {
      const speakSpy = vi.spyOn(window.speechSynthesis, 'speak');
      announcer.announceRep(3, 8);

      expect(speakSpy).toHaveBeenCalled();
      expect((speakSpy.mock.calls[0][0] as any).text).toBe('Rep 3');
    });

    it('announces final rep when target is met', () => {
      const speakSpy = vi.spyOn(window.speechSynthesis, 'speak');
      announcer.announceRep(5, 5);

      expect(speakSpy).toHaveBeenCalled();
      expect((speakSpy.mock.calls[0][0] as any).text).toContain('final rep');
    });

    it('announces set completion message', () => {
      const speakSpy = vi.spyOn(window.speechSynthesis, 'speak');
      announcer.announceSetComplete();

      expect(speakSpy).toHaveBeenCalled();
      expect((speakSpy.mock.calls[0][0] as any).text).toContain('Set complete');
    });

    it('announces rest intervals and final countdown', () => {
      const speakSpy = vi.spyOn(window.speechSynthesis, 'speak');

      announcer.announceRestCountdown(30);
      expect((speakSpy.mock.calls[0][0] as any).text).toContain('30 seconds');

      speakSpy.mockClear();
      announcer.announceRestCountdown(10);
      expect((speakSpy.mock.calls[0][0] as any).text).toContain('10 seconds');

      speakSpy.mockClear();
      announcer.announceRestCountdown(3);
      expect((speakSpy.mock.calls[0][0] as any).text).toBe('3');

      speakSpy.mockClear();
      announcer.announceRestComplete();
      expect((speakSpy.mock.calls[0][0] as any).text.toLowerCase()).toContain('next set');

      speakSpy.mockClear();
      announcer.announceRestStart(180, { exerciseName: 'Barbell Back Squat', nextSetNumber: 2 });
      expect((speakSpy.mock.calls[0][0] as any).text).toContain('Rest started, 180 seconds. Next up: Set 2 of Barbell Back Squat.');

      speakSpy.mockClear();
      announcer.announceRestComplete({ exerciseName: 'Barbell Back Squat', nextSetNumber: 2 });
      expect((speakSpy.mock.calls[0][0] as any).text).toBe("Time's up! Ready for Set 2 of Barbell Back Squat.");

      speakSpy.mockClear();
      announcer.announceRestComplete({ nextExerciseName: 'ATG Split Squat' });
      expect((speakSpy.mock.calls[0][0] as any).text).toBe("Time's up! Ready for next exercise: ATG Split Squat.");
    });
  });

  describe('Form Cue Narration', () => {
    it('narrates exercise title and primary biomechanical cues', () => {
      const speakSpy = vi.spyOn(window.speechSynthesis, 'speak');
      announcer.announceCues('Barbell Back Squat', [
        'Root the foot tripod',
        'Create 360-degree abdominal brace',
      ]);

      expect(speakSpy).toHaveBeenCalled();
      const text = (speakSpy.mock.calls[0][0] as any).text;
      expect(text).toContain('Barbell Back Squat');
      expect(text).toContain('Root the foot tripod');
    });
  });

  describe('Disabled State Behavior', () => {
    it('does not speak when voice announcements are disabled', () => {
      announcer.setEnabled(false);
      const speakSpy = vi.spyOn(window.speechSynthesis, 'speak');

      announcer.announcePhase('eccentric', { tempo: '30X1' });
      announcer.announceRep(1, 5);
      announcer.announceSetComplete();

      expect(speakSpy).not.toHaveBeenCalled();
    });
  });
});
