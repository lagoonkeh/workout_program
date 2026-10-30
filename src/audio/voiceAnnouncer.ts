/**
 * src/audio/voiceAnnouncer.ts
 * Real-time procedural voice announcement coach using Web Speech API (speechSynthesis).
 * Zero external audio assets, works offline, provides crisp audible cues ("Down", "Hold", "Up!", "Breathe In", "Breathe Out").
 */

export type TempoVoicePhase = 'eccentric' | 'pauseBottom' | 'concentric' | 'pauseTop';

export interface PhaseVoiceContext {
  isBreathing?: boolean;
  isExplosive?: boolean;
  isIsometric?: boolean;
  tempo?: string;
}

export interface VoiceOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  priority?: boolean;
  onEnd?: () => void;
}

export interface IVoiceAnnouncer {
  speak(text: string, options?: VoiceOptions): void;
  announcePhase(phase: TempoVoicePhase, context?: PhaseVoiceContext): void;
  announceRep(repNumber: number, targetReps?: number): void;
  announceSetComplete(): void;
  announceRestCountdown(remainingSeconds: number): void;
  announceRestStart(
    durationSeconds: number,
    context?: { exerciseName?: string; nextSetNumber?: number; nextExerciseName?: string }
  ): void;
  announceRestComplete(
    context?: { exerciseName?: string; nextSetNumber?: number; nextExerciseName?: string }
  ): void;
  announceAmrapPrompt(exerciseName?: string): void;
  announceCues(title: string, cues: string[], options?: VoiceOptions): void;
  cancel(): void;
  setEnabled(enabled: boolean): void;
  isEnabled(): boolean;
  isSupported(): boolean;
  getIsSpeaking(): boolean;
}

const STORAGE_KEY_VOICE_ENABLED = 'workout_app_voice_announcements_v1';

export class VoiceAnnouncer implements IVoiceAnnouncer {
  private enabled: boolean = true;
  private isSpeaking: boolean = false;

  constructor() {
    this.loadState();
  }

  private loadState(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem(STORAGE_KEY_VOICE_ENABLED);
        if (stored !== null) {
          this.enabled = stored === 'true';
        }
      }
    } catch {
      this.enabled = true;
    }
  }

  public isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'speechSynthesis' in window &&
      typeof (window as any).SpeechSynthesisUtterance !== 'undefined'
    );
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public getIsSpeaking(): boolean {
    return this.isSpeaking;
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY_VOICE_ENABLED, String(enabled));
      }
    } catch {
      // Safe fallback for quota or private mode
    }
    if (!enabled) {
      this.cancel();
    }
  }

  public cancel(): void {
    if (this.isSupported()) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Safe fallback
      }
    }
    this.isSpeaking = false;
  }

  public speak(text: string, options: VoiceOptions = {}): void {
    if (!this.enabled || !this.isSupported() || !text.trim()) {
      return;
    }

    try {
      const synth = window.speechSynthesis;
      // Fitness pacing requires zero backlog latency: always cancel stale utterances
      synth.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = options.rate ?? 1.18; // Crisp, prompt cadence
      utterance.pitch = options.pitch ?? 1.0;
      utterance.volume = options.volume ?? 1.0;
      utterance.lang = 'en-US';

      utterance.onstart = () => {
        this.isSpeaking = true;
      };

      utterance.onend = () => {
        this.isSpeaking = false;
        options.onEnd?.();
      };

      utterance.onerror = () => {
        this.isSpeaking = false;
        options.onEnd?.();
      };

      synth.speak(utterance);
    } catch (err) {
      // Speech errors must never interrupt application execution
      console.warn('Voice announcement error:', err);
    }
  }

  /**
   * Dispatches audible directional cues based on movement or breathing cadence.
   */
  public announcePhase(phase: TempoVoicePhase, context: PhaseVoiceContext = {}): void {
    if (!this.enabled) return;

    const tempoStr = (context.tempo || '').toLowerCase();
    const isBreathing =
      context.isBreathing ||
      tempoStr === '5083' ||
      tempoStr.includes('inhale') ||
      tempoStr.includes('exhale') ||
      tempoStr.includes('breath');

    const isIsometric =
      context.isIsometric ||
      tempoStr === '0010' ||
      tempoStr === '0030' ||
      tempoStr.startsWith('hold-') ||
      tempoStr.includes('isometric') ||
      tempoStr.includes('hold') ||
      tempoStr.includes('hang');

    const isCadenceWalk = tempoStr === '2020' || tempoStr.includes('walk') || tempoStr.includes('step');

    if (isBreathing) {
      switch (phase) {
        case 'eccentric':
          this.speak('Breathe in');
          break;
        case 'pauseBottom':
          this.speak('Hold');
          break;
        case 'concentric':
          this.speak('Breathe out');
          break;
        case 'pauseTop':
          this.speak('Pause');
          break;
      }
      return;
    }

    if (isIsometric) {
      switch (phase) {
        case 'eccentric':
        case 'concentric':
        case 'pauseBottom':
        case 'pauseTop':
          this.speak('Hold');
          break;
      }
      return;
    }

    if (isCadenceWalk) {
      switch (phase) {
        case 'eccentric':
        case 'concentric':
          this.speak('Step');
          break;
        case 'pauseBottom':
        case 'pauseTop':
          this.speak('Hold');
          break;
      }
      return;
    }

    // Standard Resistance Compound Lifting (e.g. 30X1, 31X1, 4010, 2011)
    switch (phase) {
      case 'eccentric':
        this.speak('Down');
        break;
      case 'pauseBottom':
        this.speak('Hold');
        break;
      case 'concentric':
        this.speak(context.isExplosive ? 'Up!' : 'Drive');
        break;
      case 'pauseTop':
        this.speak('Hold');
        break;
    }
  }

  public announceRep(repNumber: number, targetReps?: number): void {
    if (!this.enabled || repNumber <= 0) return;

    if (targetReps && targetReps > 0 && repNumber === targetReps) {
      this.speak(`Rep ${repNumber}, final rep!`);
    } else {
      this.speak(`Rep ${repNumber}`);
    }
  }

  public announceSetComplete(): void {
    if (!this.enabled) return;
    this.speak('Set complete! Great work.');
  }

  public announceRestStart(
    durationSeconds: number,
    context?: { exerciseName?: string; nextSetNumber?: number; nextExerciseName?: string }
  ): void {
    if (!this.enabled) return;
    if (context?.nextExerciseName) {
      this.speak(`Rest started, ${durationSeconds} seconds. Next up: ${context.nextExerciseName}.`);
    } else if (context?.nextSetNumber && context?.exerciseName) {
      this.speak(`Rest started, ${durationSeconds} seconds. Next up: Set ${context.nextSetNumber} of ${context.exerciseName}.`);
    } else {
      this.speak(`Rest started, ${durationSeconds} seconds.`);
    }
  }

  public announceRestCountdown(remainingSeconds: number): void {
    if (!this.enabled) return;

    if (remainingSeconds === 30) {
      this.speak('30 seconds remaining');
    } else if (remainingSeconds === 10) {
      this.speak('10 seconds');
    } else if (remainingSeconds === 3) {
      this.speak('3');
    } else if (remainingSeconds === 2) {
      this.speak('2');
    } else if (remainingSeconds === 1) {
      this.speak('1');
    }
  }

  public announceRestComplete(
    context?: { exerciseName?: string; nextSetNumber?: number; nextExerciseName?: string }
  ): void {
    if (!this.enabled) return;
    if (context?.nextExerciseName) {
      this.speak(`Time's up! Ready for next exercise: ${context.nextExerciseName}.`);
    } else if (context?.nextSetNumber && context?.exerciseName) {
      this.speak(`Time's up! Ready for Set ${context.nextSetNumber} of ${context.exerciseName}.`);
    } else {
      this.speak("Time's up! Ready for next set.");
    }
  }

  public announceAmrapPrompt(exerciseName?: string): void {
    if (!this.enabled) return;
    const namePhrase = exerciseName ? ` for ${exerciseName}` : '';
    this.speak(`Final set${namePhrase}: As many reps as possible! Push hard with clean form.`);
  }

  public announceCues(title: string, cues: string[], options: VoiceOptions = {}): void {
    if (!this.enabled || !title) return;
    const cuesText = cues.length > 0 ? cues.slice(0, 3).join('. ') : 'Follow prescribed form.';
    this.speak(`Key cues for ${title}: ${cuesText}`, { rate: 1.1, ...options });
  }
}

export const voiceAnnouncer = new VoiceAnnouncer();
