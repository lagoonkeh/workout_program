/**
 * tests/timer/restTimer.test.ts
 * Comprehensive Vitest unit test suite for RestTimer engine.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RestTimer, REST_PRESETS } from '../../src/timer/restTimer';

describe('RestTimer Engine', () => {
  let timer: RestTimer;
  let mockWarning: ReturnType<typeof vi.fn>;
  let mockComplete: ReturnType<typeof vi.fn>;
  let mockPlayTone: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockWarning = vi.fn();
    mockComplete = vi.fn();
    mockPlayTone = vi.fn();

    timer = new RestTimer({
      callbacks: {
        onWarning: mockWarning,
        onComplete: mockComplete,
      },
      audioSynthesizer: {
        playTone: mockPlayTone,
      },
    });
  });

  afterEach(() => {
    timer.destroy();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('1. Preset Taxonomy & Initial State', () => {
    it('initializes in IDLE state with default values', () => {
      const snapshot = timer.getSnapshot();
      expect(snapshot.state).toBe('IDLE');
      expect(snapshot.durationSeconds).toBe(60);
      expect(snapshot.remainingSeconds).toBe(60);
      expect(snapshot.progressRatio).toBe(0.0);
    });

    it('contains all required GZCL, TNT, and creator presets with valid seconds', () => {
      expect(REST_PRESETS).toHaveLength(9);
      const expectedIds = [
        'er-15', 'er-30', 't3-60', 't3-90',
        'tnt-120', 't2-120', 't2-180', 't1-240', 't1-300'
      ];
      expectedIds.forEach((id) => {
        const found = REST_PRESETS.find((p) => p.id === id);
        expect(found).toBeDefined();
        expect(found!.seconds).toBeGreaterThan(0);
      });
    });

    it('throws error when starting with zero or negative duration', () => {
      expect(() => timer.start(0)).toThrow(/greater than 0/);
      expect(() => timer.start(-10)).toThrow(/greater than 0/);
    });
  });

  describe('2. State Transitions & Countdown Lifecycle', () => {
    it('transitions from IDLE to RUNNING on start()', () => {
      timer.start(90);
      const snapshot = timer.getSnapshot();
      expect(snapshot.state).toBe('RUNNING');
      expect(snapshot.durationSeconds).toBe(90);
      expect(snapshot.remainingSeconds).toBe(90);
      expect(snapshot.progressRatio).toBe(0.0);
    });

    it('accurately decrements remainingSeconds as time advances', () => {
      timer.start(10);
      vi.advanceTimersByTime(2000); // 2s elapsed

      const snapshot = timer.getSnapshot();
      expect(snapshot.state).toBe('RUNNING');
      expect(snapshot.remainingSeconds).toBe(8);
      expect(snapshot.progressRatio).toBeCloseTo(0.2, 2);
    });

    it('transitions to COMPLETED when duration elapses', () => {
      timer.start(5);
      vi.advanceTimersByTime(5000);

      const snapshot = timer.getSnapshot();
      expect(snapshot.state).toBe('COMPLETED');
      expect(snapshot.remainingSeconds).toBe(0);
      expect(snapshot.progressRatio).toBe(1.0);
    });

    it('transitions to IDLE on reset() from any state', () => {
      timer.start(30);
      vi.advanceTimersByTime(10000);
      timer.reset();

      const snapshot = timer.getSnapshot();
      expect(snapshot.state).toBe('IDLE');
      expect(snapshot.remainingSeconds).toBe(30);
      expect(snapshot.progressRatio).toBe(0.0);
    });

    it('invokes optional onTick callback on every timer tick', () => {
      const mockTick = vi.fn();
      const customTimer = new RestTimer({
        callbacks: {
          onTick: mockTick,
        },
      });

      customTimer.start(10);
      vi.advanceTimersByTime(1000);
      expect(mockTick).toHaveBeenCalledWith(
        expect.objectContaining({ remainingSeconds: 9, state: 'RUNNING' })
      );
      customTimer.destroy();
    });
  });

  describe('3. Pause, Resume, and Time Preservation', () => {
    it('freezes remaining time on pause()', () => {
      timer.start(60);
      vi.advanceTimersByTime(25000); // 25s elapsed, 35s remaining

      timer.pause();
      const pausedSnap = timer.getSnapshot();
      expect(pausedSnap.state).toBe('PAUSED');
      expect(pausedSnap.remainingSeconds).toBe(35);

      // Advance time while paused
      vi.advanceTimersByTime(15000);
      const stillPausedSnap = timer.getSnapshot();
      expect(stillPausedSnap.remainingSeconds).toBe(35);
      expect(stillPausedSnap.state).toBe('PAUSED');
    });

    it('resumes countdown from exact frozen remaining duration', () => {
      timer.start(60);
      vi.advanceTimersByTime(20000); // 40s remaining
      timer.pause();
      vi.advanceTimersByTime(5000); // idle in pause

      timer.resume();
      expect(timer.getSnapshot().state).toBe('RUNNING');
      expect(timer.getSnapshot().remainingSeconds).toBe(40);

      vi.advanceTimersByTime(10000); // 10s elapsed
      expect(timer.getSnapshot().remainingSeconds).toBe(30);
    });

    it('safely ignores redundant pause() when not running', () => {
      timer.pause(); // in IDLE
      expect(timer.getSnapshot().state).toBe('IDLE');
    });

    it('safely ignores redundant resume() when not paused', () => {
      timer.resume(); // in IDLE
      expect(timer.getSnapshot().state).toBe('IDLE');
    });
  });

  describe('4. Drift-Free Timestamp Delta Precision', () => {
    it('handles sudden time jumps (simulating background tab throttling) without lag', () => {
      timer.start(120);

      // Advance time directly by 45 seconds in a single jump
      vi.advanceTimersByTime(45000);

      const snapshot = timer.getSnapshot();
      expect(snapshot.remainingSeconds).toBe(75);
      expect(snapshot.progressRatio).toBeCloseTo(0.375, 2);
    });

    it('re-synchronizes on document visibilitychange event', () => {
      timer.start(60);
      vi.advanceTimersByTime(20000);

      // Simulate visibilitychange event
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));

      expect(timer.getSnapshot().remainingSeconds).toBe(40);
    });
  });

  describe('5. Quick-Bump Time Adjustments (addTime)', () => {
    it('extends remaining time and total duration when addTime(+15) is called while RUNNING', () => {
      timer.start(30);
      vi.advanceTimersByTime(10000); // 20s remaining

      timer.addTime(15);
      const snapshot = timer.getSnapshot();
      expect(snapshot.remainingSeconds).toBe(35);
      expect(snapshot.durationSeconds).toBe(45);
    });

    it('reduces remaining time when addTime(-10) is called', () => {
      timer.start(30);
      vi.advanceTimersByTime(5000); // 25s remaining

      timer.addTime(-10);
      const snapshot = timer.getSnapshot();
      expect(snapshot.remainingSeconds).toBe(15);
      expect(snapshot.durationSeconds).toBe(20);
    });

    it('transitions directly to COMPLETED if negative addTime exceeds remaining time', () => {
      timer.start(30);
      vi.advanceTimersByTime(25000); // 5s remaining

      timer.addTime(-10);
      const snapshot = timer.getSnapshot();
      expect(snapshot.state).toBe('COMPLETED');
      expect(snapshot.remainingSeconds).toBe(0);
      expect(mockComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('6. Audio Event Synchronization & Deduplication', () => {
    it('fires warning callbacks at exactly 3, 2, and 1 seconds, and completion at 0', () => {
      timer.start(5);

      vi.advanceTimersByTime(1000); // 4s left
      expect(mockWarning).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1000); // 3s left
      expect(mockWarning).toHaveBeenCalledWith(3);
      expect(mockPlayTone).toHaveBeenCalledWith('warning');

      vi.advanceTimersByTime(1000); // 2s left
      expect(mockWarning).toHaveBeenCalledWith(2);

      vi.advanceTimersByTime(1000); // 1s left
      expect(mockWarning).toHaveBeenCalledWith(1);

      vi.advanceTimersByTime(1000); // 0s left
      expect(mockComplete).toHaveBeenCalledTimes(1);
      expect(mockPlayTone).toHaveBeenCalledWith('completion');
    });

    it('never fires duplicate warnings for the same second across 100ms ticks', () => {
      timer.start(5);

      // Advance by 2.0s -> reaches 3s mark
      vi.advanceTimersByTime(2000);
      expect(mockWarning).toHaveBeenCalledWith(3);
      expect(mockWarning).toHaveBeenCalledTimes(1);

      // Advance by 300ms (still within 3s window)
      vi.advanceTimersByTime(300);
      expect(mockWarning).toHaveBeenCalledTimes(1); // No duplicate trigger
    });

    it('does not re-fire warning triggers after pause and resume', () => {
      timer.start(5);
      vi.advanceTimersByTime(2000); // 3s warning fired
      expect(mockWarning).toHaveBeenCalledWith(3);
      expect(mockWarning).toHaveBeenCalledTimes(1);

      timer.pause();
      vi.advanceTimersByTime(1000); // idle in pause
      timer.resume();

      vi.advanceTimersByTime(200); // still in 3s window
      expect(mockWarning).toHaveBeenCalledTimes(1); // 3s warning not duplicated
    });
  });

  describe('7. Subscriber Pub/Sub Model', () => {
    it('immediately emits current snapshot upon subscription', () => {
      const listener = vi.fn();
      const unsubscribe = timer.subscribe(listener);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({ state: 'IDLE' }));
      unsubscribe();
    });

    it('delivers synchronized snapshot updates to multiple subscribers', () => {
      const sub1 = vi.fn();
      const sub2 = vi.fn();

      const unsub1 = timer.subscribe(sub1);
      const unsub2 = timer.subscribe(sub2);

      timer.start(10);
      vi.advanceTimersByTime(1000);

      expect(sub1).toHaveBeenLastCalledWith(expect.objectContaining({ remainingSeconds: 9 }));
      expect(sub2).toHaveBeenLastCalledWith(expect.objectContaining({ remainingSeconds: 9 }));

      unsub1();
      unsub2();
    });

    it('stops emitting to unsubscribed listeners', () => {
      const listener = vi.fn();
      const unsubscribe = timer.subscribe(listener);

      unsubscribe();
      timer.start(10);
      vi.advanceTimersByTime(1000);

      // Only the initial mount snapshot call was made
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('8. Lifecycle & Cleanup', () => {
    it('cleans up worker, listeners, and intervals on destroy()', () => {
      const listener = vi.fn();
      timer.subscribe(listener);

      timer.start(10);
      timer.destroy();

      vi.advanceTimersByTime(5000);
      // No errors thrown and no further listener dispatches
      expect(listener).not.toHaveBeenCalledWith(expect.objectContaining({ remainingSeconds: 5 }));
    });
  });
});
