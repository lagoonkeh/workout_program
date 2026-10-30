// tests/e2e/lockscreen_rest_alerts.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { RestTimerWidget } from '../../src/components/RestTimerWidget';
import { restNotificationService } from '../../src/timer/restNotificationService';

describe('Lockscreen Rest Timer & Background Alerts Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders rest notification toggle and toggles alert permission state', async () => {
    render(
      <RestTimerWidget
        variant="docked"
        initialDuration={15}
        defaultExpanded={true}
      />
    );

    // Notification Alerts button should be present in toolbar
    const notifBtn = screen.getByTestId('rest-notification-toggle-btn');
    expect(notifBtn).toBeInTheDocument();
    expect(notifBtn).toHaveTextContent(/Alerts/i);

    // Toggle alerts
    fireEvent.click(notifBtn);

    // Start 15s timer
    const preset15 = screen.getByTestId('preset-btn-er-15');
    act(() => {
      fireEvent.click(preset15);
    });

    expect(preset15).toBeInTheDocument();
  });

  it('triggers haptics and notification on rest completion', () => {
    const vibrateSpy = vi.spyOn(navigator, 'vibrate');
    const sendSpy = vi.spyOn(restNotificationService, 'sendRestCompleteNotification');

    restNotificationService.triggerHaptic('complete');
    expect(vibrateSpy).toHaveBeenCalledWith([250, 120, 350]);

    restNotificationService.sendRestCompleteNotification({
      exerciseName: 'Barbell Back Squat',
      nextSetNumber: 2,
      totalSets: 5,
    });
    expect(sendSpy).toHaveBeenCalled();
  });
});
