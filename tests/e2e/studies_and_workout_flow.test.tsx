import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import App from '../../src/App';
import { storageManager } from '../../src/storage/storageManager';

import { STORAGE_KEY_LOGS } from '../../src/storage/appStorageKeys';

describe('Comprehensive End-to-End Test: Workout Studies & Complete Flow', () => {
  beforeEach(() => {
    storageManager.clear();
    localStorage.clear();
  });

  it('verifies LLP mode on eligible lifts, toggling lengthened partials and saving to storage', async () => {
    render(<App />);

    // Switch to Upper A where Single-Arm Kettlebell Row (T2) is LLP eligible
    const upperATab = screen.getByRole('button', { name: /Upper A/i });
    fireEvent.click(upperATab);

    // Locate the Single-Arm Row exercise card
    const saRowTitle = await screen.findByText(/Single-Arm Kettlebell Row/i);
    expect(saRowTitle).toBeInTheDocument();

    const saCard = saRowTitle.closest('article')!;
    expect(saCard).toBeInTheDocument();
    const exerciseId = saCard.id.replace('exercise-card-', '');

    // Verify LLP banner is present within the card
    const banner = within(saCard).getByTestId('llp-protocol-banner');
    expect(banner).toBeInTheDocument();

    // Toggle science explanation
    const guideToggle = within(banner).getByTestId('toggle-llp-guide-btn');
    fireEvent.click(guideToggle);
    expect(within(banner).getByText(/What the research shows/i)).toBeInTheDocument();

    // +LLPs is offered on the final set only
    expect(within(saCard).queryByTestId('llp-toggle-btn-0')).not.toBeInTheDocument();
    const toggleCount = within(saCard).getAllByRole('button', { name: /Toggle lengthened partials for set/i }).length;
    expect(toggleCount).toBe(1);
    const llpSetBtn = within(saCard).getByRole('button', { name: /Toggle lengthened partials for set 3/i });
    fireEvent.click(llpSetBtn);

    // Verify button updates to show LLPs logged
    expect(within(saCard).getByText('🔥 +LLPs')).toBeInTheDocument();

    // Mark set 3 complete
    const set3Check = within(saCard).getByRole('button', { name: /Mark set 3 as completed/i });
    fireEvent.click(set3Check);

    // Verify storage received the updated log with llpPerformed
    await waitFor(() => {
      const rawLogs = localStorage.getItem(STORAGE_KEY_LOGS) || '{}';
      const logs = JSON.parse(rawLogs);
      const exerciseLogs = logs[exerciseId];
      expect(exerciseLogs).toBeDefined();
      expect(exerciseLogs[2].llpPerformed).toBe(true);
      expect(exerciseLogs[2].notes).toContain('+3–5 LLPs');
    });
  });

  it('navigates to Mobility view and logs Range of Strength Feats (German Hang & Head-to-Toe Fold)', async () => {
    render(<App />);

    // Switch to mobility view
    const mobilityNavBtn = screen.getByRole('button', { name: /Quick switch to Mobility view/i });
    fireEvent.click(mobilityNavBtn);

    // Filter to Lucas Hardie Feats of Range
    const featsFilterBtn = await screen.findByRole('button', { name: /Lucas Hardie Feats of Range/i });
    fireEvent.click(featsFilterBtn);

    // Click German Hang tab
    const germanHangTab = screen.getByRole('tab', { name: /German Hang/i });
    fireEvent.click(germanHangTab);

    expect(screen.getAllByText(/Lucas Hardie German Hang/i).length).toBeGreaterThanOrEqual(1);

    // Enter 45 seconds measurement
    const valueInput = screen.getByPlaceholderText(/Enter seconds/i);
    fireEvent.change(valueInput, { target: { value: '45' } });

    // Submit measurement using the "Save Measurement" button
    const saveBtn = screen.getByRole('button', { name: /Save Measurement/i });
    fireEvent.click(saveBtn);

    // Verify measurement is saved to storageManager
    await waitFor(() => {
      const mobilityHistory = storageManager.load().mobilityHistory;
      expect(mobilityHistory.some((m) => m.testId === 'german-hang' && m.value === 45)).toBe(true);
    });
  });

  it('navigates to Assessment view and verifies AdaptationClocksWidget and Yellow Dude advisory', async () => {
    render(<App />);

    // Switch to assessment view
    const assessNavBtn = screen.getByRole('button', { name: /Quick switch to Assess view/i });
    fireEvent.click(assessNavBtn);

    // Verify Yellow Dude advisory in AthleteProfileCard
    const advisory = await screen.findByTestId('profile-tendon-clock-advisory');
    expect(advisory).toBeInTheDocument();
    expect(screen.getByText(/Tendon Adaptation Clock/i)).toBeInTheDocument();

    // Verify AdaptationClocksWidget is rendered
    const clocksWidget = await screen.findByTestId('adaptation-clocks-widget');
    expect(clocksWidget).toBeInTheDocument();

    // Switch to progression ladders tab
    const ladderTab = screen.getByTestId('tab-ladders');
    fireEvent.click(ladderTab);
    expect(screen.getByText(/Go in order/i)).toBeInTheDocument();
  });
});
