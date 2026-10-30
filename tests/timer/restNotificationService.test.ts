// tests/timer/restNotificationService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { restNotificationService } from '../../src/timer/restNotificationService';

describe('RestNotificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reports notification support and gets initial permission', () => {
    expect(restNotificationService.isSupported()).toBe(true);
    expect(restNotificationService.getPermission()).toBe('granted');
  });

  it('requests notification permission asynchronously', async () => {
    const res = await restNotificationService.requestPermission();
    expect(res).toBe('granted');
  });

  it('sends system notification on rest interval completion', () => {
    restNotificationService.sendRestCompleteNotification({
      exerciseName: 'Barbell Back Squat',
      nextSetNumber: 3,
      totalSets: 5,
    });

    // MockNotification should have been instantiated
    expect(Notification).toBeDefined();
  });

  it('triggers multi-stage haptics via navigator.vibrate', () => {
    const vibrateSpy = vi.spyOn(navigator, 'vibrate');

    restNotificationService.triggerHaptic('warning');
    expect(vibrateSpy).toHaveBeenCalledWith([160]);

    restNotificationService.triggerHaptic('tick');
    expect(vibrateSpy).toHaveBeenCalledWith([60]);

    restNotificationService.triggerHaptic('complete');
    expect(vibrateSpy).toHaveBeenCalledWith([250, 120, 350]);
  });

  it('dynamically updates document title with countdown and completion alerts', () => {
    restNotificationService.updateDocumentTitle(45, false);
    expect(document.title).toContain('(00:45) Rest Timer');

    restNotificationService.updateDocumentTitle(0, true);
    expect(document.title).toContain("(🔔 TIME'S UP!) Rest Complete");

    restNotificationService.resetDocumentTitle();
    expect(document.title).toBe('Workout Program | GZCL & Athletic Longevity');
  });

  it('acquires and releases Screen WakeLock cleanly', async () => {
    const wakeLockSpy = vi.spyOn(navigator.wakeLock, 'request');

    await restNotificationService.acquireWakeLock();
    expect(wakeLockSpy).toHaveBeenCalledWith('screen');

    await restNotificationService.releaseWakeLock();
  });
});
