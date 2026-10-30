// tests/timer/stopClock.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { StopClock } from '../../src/timer/stopClock';

describe('StopClock Engine', () => {
  let mockTime = 1000;
  const timeProvider = () => mockTime;
  let stopClock: StopClock;

  beforeEach(() => {
    mockTime = 1000;
    stopClock = new StopClock(timeProvider);
  });

  it('initializes in IDLE state with 0 elapsed time', () => {
    const snap = stopClock.getSnapshot();
    expect(snap.state).toBe('IDLE');
    expect(snap.elapsedSeconds).toBe(0);
    expect(snap.elapsedMs).toBe(0);
    expect(snap.laps).toHaveLength(0);
  });

  it('starts and calculates elapsed time accurately from timestamp deltas', () => {
    stopClock.start();
    expect(stopClock.getSnapshot().state).toBe('RUNNING');

    mockTime = 3500; // +2500ms
    const snap = stopClock.getSnapshot();
    expect(snap.elapsedSeconds).toBe(2);
    expect(snap.elapsedMs).toBe(2500);
  });

  it('pauses and preserves accumulated time across multiple resumes', () => {
    stopClock.start();
    mockTime = 2000; // +1000ms
    stopClock.pause();

    expect(stopClock.getSnapshot().state).toBe('PAUSED');
    expect(stopClock.getSnapshot().elapsedMs).toBe(1000);

    // Time passes while paused
    mockTime = 5000;
    expect(stopClock.getSnapshot().elapsedMs).toBe(1000);

    // Resume
    stopClock.resume();
    expect(stopClock.getSnapshot().state).toBe('RUNNING');
    mockTime = 7000; // +2000ms more
    expect(stopClock.getSnapshot().elapsedMs).toBe(3000);
    expect(stopClock.getSnapshot().elapsedSeconds).toBe(3);
  });

  it('records laps/splits with delta calculation', () => {
    stopClock.start();
    mockTime = 2500; // 1.5s in
    const lap1 = stopClock.lap();
    expect(lap1).not.toBeNull();
    expect(lap1?.lapNumber).toBe(1);
    expect(lap1?.lapTimeSeconds).toBe(1.5);
    expect(lap1?.totalTimeSeconds).toBe(1.5);

    mockTime = 5000; // another 2.5s
    const lap2 = stopClock.lap();
    expect(lap2?.lapNumber).toBe(2);
    expect(lap2?.lapTimeSeconds).toBe(2.5);
    expect(lap2?.totalTimeSeconds).toBe(4.0);

    const snap = stopClock.getSnapshot();
    expect(snap.laps).toHaveLength(2);
  });

  it('resets completely back to IDLE with 0 laps', () => {
    stopClock.start();
    mockTime = 4000;
    stopClock.lap();
    stopClock.reset();

    const snap = stopClock.getSnapshot();
    expect(snap.state).toBe('IDLE');
    expect(snap.elapsedSeconds).toBe(0);
    expect(snap.elapsedMs).toBe(0);
    expect(snap.laps).toHaveLength(0);
  });
});
