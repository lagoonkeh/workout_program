// src/timer/restNotificationService.ts
import { formatMMSS } from '../domain/programData';

export type NotificationSupportStatus = 'granted' | 'denied' | 'default' | 'unsupported';

export interface RestNotificationContext {
  exerciseName?: string;
  completedSetNumber?: number;
  totalSets?: number;
  nextSetNumber?: number;
  nextExerciseName?: string;
  isLastSet?: boolean;
}

class RestNotificationService {
  private wakeLockSentinel: any = null;
  private defaultTitle: string = 'Workout Program | GZCL & Athletic Longevity';

  constructor() {
    if (typeof document !== 'undefined') {
      this.defaultTitle = document.title || this.defaultTitle;
    }
  }

  /**
   * Checks whether the Web Notification API is supported by the current browser environment.
   */
  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  /**
   * Retrieves the current notification permission state.
   */
  public getPermission(): NotificationSupportStatus {
    if (!this.isSupported()) return 'unsupported';
    return Notification.permission as NotificationSupportStatus;
  }

  /**
   * Requests permission to send desktop/mobile system notifications.
   */
  public async requestPermission(): Promise<NotificationSupportStatus> {
    if (!this.isSupported()) return 'unsupported';
    try {
      const result = await Notification.requestPermission();
      return result as NotificationSupportStatus;
    } catch {
      return 'denied';
    }
  }

  /**
   * Dispatches a lock-screen / background system notification when a rest interval completes.
   */
  public sendRestCompleteNotification(context?: RestNotificationContext | null): void {
    if (!this.isSupported() || this.getPermission() !== 'granted') return;

    try {
      let body = 'Rest period is complete! Time to get ready.';
      if (context) {
        if (context.isLastSet && context.nextExerciseName) {
          body = `All sets complete for ${context.exerciseName || 'this exercise'}! Up next: ${context.nextExerciseName}.`;
        } else if (context.nextSetNumber && context.exerciseName) {
          body = `Ready for Set ${context.nextSetNumber}${context.totalSets ? ` of ${context.totalSets}` : ''} of ${context.exerciseName}!`;
        } else if (context.exerciseName) {
          body = `Next set ready for ${context.exerciseName}!`;
        }
      }

      const options: any = {
        body,
        icon: '/favicon.ico',
        tag: 'workout-rest-timer',
        renotify: true,
        vibrate: [300, 100, 300, 100, 400],
      };
      const notification = new Notification("Rest Finished! ⏱️ Ready for Next Set", options);

      notification.onclick = () => {
        if (typeof window !== 'undefined' && window.focus) {
          window.focus();
        }
        notification.close();
      };
    } catch {
      // Fallback if notification constructor throws in strict security sandbox
    }
  }

  /**
   * Dispatches multi-stage haptic vibration feedback for mobile devices (e.g. Pixel 9 Pro XL).
   */
  public triggerHaptic(type: 'warning' | 'tick' | 'complete'): void {
    if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;

    try {
      if (type === 'warning') {
        // Gentle single pulse at 10s remaining
        navigator.vibrate([160]);
      } else if (type === 'tick') {
        // Crisp micro-tick at 3s, 2s, 1s
        navigator.vibrate([60]);
      } else if (type === 'complete') {
        // Distinctive double-buzz on timer completion
        navigator.vibrate([250, 120, 350]);
      }
    } catch {
      // Safe no-op if vibration API is restricted
    }
  }

  /**
   * Dynamically updates the browser tab / multitasking title with the countdown.
   */
  public updateDocumentTitle(remainingSeconds: number, isComplete: boolean): void {
    if (typeof document === 'undefined') return;

    if (isComplete) {
      document.title = `(🔔 TIME'S UP!) Rest Complete`;
    } else if (remainingSeconds > 0) {
      document.title = `(${formatMMSS(remainingSeconds)}) Rest Timer`;
    } else {
      document.title = this.defaultTitle;
    }
  }

  /**
   * Restores the canonical browser document title.
   */
  public resetDocumentTitle(): void {
    if (typeof document !== 'undefined') {
      document.title = this.defaultTitle;
    }
  }

  /**
   * Requests Screen Wake Lock so the mobile display remains awake during active rest intervals.
   */
  public async acquireWakeLock(): Promise<void> {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator) || this.wakeLockSentinel) {
      return;
    }

    try {
      // @ts-ignore
      this.wakeLockSentinel = await navigator.wakeLock.request('screen');
      this.wakeLockSentinel.addEventListener('release', () => {
        this.wakeLockSentinel = null;
      });
    } catch {
      this.wakeLockSentinel = null;
    }
  }

  /**
   * Releases Screen Wake Lock to conserve battery.
   */
  public async releaseWakeLock(): Promise<void> {
    if (this.wakeLockSentinel) {
      try {
        await this.wakeLockSentinel.release();
      } catch {
        // ignore release errors
      }
      this.wakeLockSentinel = null;
    }
  }
}

export const restNotificationService = new RestNotificationService();
