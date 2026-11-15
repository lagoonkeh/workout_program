// tests/components/RestTimerWidget.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { RestTimerWidget } from '../../src/components/RestTimerWidget';
import { restTimerSingleton } from '../../src/timer/restTimerSingleton';
import { stopClockSingleton } from '../../src/timer/stopClock';
import { audioSynthesizer } from '../../src/audio/audioSynthesizer';

describe('RestTimerWidget Component', () => {
  beforeEach(() => {
    restTimerSingleton.reset(60);
    stopClockSingleton.reset();
    localStorage.clear();
  });

  it('renders SVG progress ring and default duration readout in inline variant', () => {
    const { container } = render(
      <RestTimerWidget variant="inline" initialDuration={60} />
    );

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();

    const circles = container.querySelectorAll('circle');
    expect(circles.length).toBeGreaterThanOrEqual(2);

    expect(screen.getByText('01:00')).toBeInTheDocument();
    expect(screen.getByText('Total: 60s')).toBeInTheDocument();
  });

  it('renders all quick presets with expected labels including 120s TNT Rest', () => {
    render(<RestTimerWidget variant="inline" />);

    expect(screen.getAllByText('15s').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('30s').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('60s')).toBeInTheDocument();
    expect(screen.getByText('90s')).toBeInTheDocument();
    expect(screen.getByText('120s (TNT Rest)')).toBeInTheDocument();
    expect(screen.getByText('120s (2m)')).toBeInTheDocument();
    expect(screen.getByText('180s (3m)')).toBeInTheDocument();
    expect(screen.getByText('240s (4m)')).toBeInTheDocument();
    expect(screen.getByText('300s (5m)')).toBeInTheDocument();
  });

  it('renders 1-Tap TNT Isometric Analgesia Protocol banner and starts 120s recovery on click', () => {
    render(<RestTimerWidget variant="inline" />);

    expect(screen.getByTestId('tnt-analgesia-protocol-banner')).toBeInTheDocument();
    expect(screen.getByText(/Tendon Isometric Analgesia \(Dr. Ebonie Rio\)/i)).toBeInTheDocument();

    const tntBtn = screen.getByTestId('tnt-analgesia-quick-btn');
    fireEvent.click(tntBtn);

    expect(screen.getByText('02:00')).toBeInTheDocument();
    expect(screen.getByText(/Resting/i)).toBeInTheDocument();
    expect(screen.getByTestId('rest-upcoming-target-banner')).toBeInTheDocument();
    expect(screen.getByText(/TNT Isometric Quadriceps \/ Patellar Hold/i)).toBeInTheDocument();
  });

  it('starts countdown, transitions status, and supports pause/resume/reset', () => {
    render(<RestTimerWidget variant="inline" initialDuration={60} />);

    // Start timer
    const startBtn = screen.getByRole('button', { name: /^Start$/i });
    fireEvent.click(startBtn);

    expect(screen.getByText(/Resting/i)).toBeInTheDocument();

    // Pause timer
    const pauseBtn = screen.getByRole('button', { name: /^Pause$/i });
    fireEvent.click(pauseBtn);
    expect(screen.getByText(/Paused/i)).toBeInTheDocument();

    // Resume timer
    const resumeBtn = screen.getByRole('button', { name: /^Resume$/i });
    fireEvent.click(resumeBtn);
    expect(screen.getByText(/Resting/i)).toBeInTheDocument();

    // Reset timer
    const resetBtn = screen.getByRole('button', { name: /Reset Timer/i });
    fireEvent.click(resetBtn);
    expect(screen.getByText(/Ready/i)).toBeInTheDocument();
  });

  it('adds time via bumpers (+15s and +30s)', () => {
    render(<RestTimerWidget variant="inline" initialDuration={60} />);

    const add15Btn = screen.getByRole('button', { name: /Add 15 Seconds/i });
    fireEvent.click(add15Btn);
    expect(screen.getByText('01:15')).toBeInTheDocument();

    const add30Btn = screen.getByRole('button', { name: /Add 30 Seconds/i });
    fireEvent.click(add30Btn);
    expect(screen.getByText('01:45')).toBeInTheDocument();
  });

  it('switches preset on click', () => {
    render(<RestTimerWidget variant="inline" />);

    const presetBtn = screen.getByText('Athlean-X 20-Effective-Reps rest-pause cluster reset').closest('button')!;
    fireEvent.click(presetBtn);

    expect(screen.getByText('00:15')).toBeInTheDocument();
    expect(screen.getByText('Total: 15s')).toBeInTheDocument();
  });

  it('toggles audio synthesizer mute status', () => {
    const setMutedSpy = vi.spyOn(audioSynthesizer, 'setMuted');
    render(<RestTimerWidget variant="inline" />);

    const muteBtn = screen.getByRole('button', { name: /Audio/i });
    fireEvent.click(muteBtn);

    expect(setMutedSpy).toHaveBeenCalled();
  });

  it('handles activePresetSeconds external trigger', () => {
    const onClear = vi.fn();
    render(
      <RestTimerWidget
        variant="inline"
        activePresetSeconds={180}
        onClearActivePreset={onClear}
      />
    );

    expect(screen.getByText('03:00')).toBeInTheDocument();
    expect(onClear).toHaveBeenCalled();
  });

  it('switches to Stop Clock mode and controls stopwatch with laps', () => {
    render(<RestTimerWidget variant="inline" />);

    const stopClockTab = screen.getByRole('button', { name: /Stop Clock/i });
    fireEvent.click(stopClockTab);

    expect(screen.getByText('Stop Clock (Stopwatch)')).toBeInTheDocument();
    expect(screen.getByText(/00:00\.0/i)).toBeInTheDocument();

    // Start stop clock
    const startClockBtn = screen.getByRole('button', { name: /Start Clock/i });
    fireEvent.click(startClockBtn);
    expect(screen.getByText(/Timing Hold/i)).toBeInTheDocument();

    // Record lap
    const lapBtn = screen.getByRole('button', { name: /Lap/i });
    fireEvent.click(lapBtn);
    expect(screen.getByText(/Recorded Splits \/ Laps/i)).toBeInTheDocument();

    // Pause stop clock
    const pauseBtn = screen.getByRole('button', { name: /^Pause$/i });
    fireEvent.click(pauseBtn);
    expect(screen.getByText(/Stop Clock Paused/i)).toBeInTheDocument();

    // Reset stop clock
    const resetBtn = screen.getByRole('button', { name: /Reset Stop Clock/i });
    fireEvent.click(resetBtn);
    expect(screen.getByText(/Stop Clock Ready/i)).toBeInTheDocument();
  });

  it('creates and saves a custom preset timer', () => {
    render(<RestTimerWidget variant="inline" />);

    const createPresetBtn = screen.getByRole('button', { name: /Create Preset/i });
    fireEvent.click(createPresetBtn);

    expect(screen.getByText('New Custom Preset Timer')).toBeInTheDocument();

    const secondsInput = screen.getByPlaceholderText('e.g. 45');
    fireEvent.change(secondsInput, { target: { value: '45' } });

    const labelInput = screen.getByPlaceholderText('e.g. McGill Plank');
    fireEvent.change(labelInput, { target: { value: 'McGill Hold' } });

    const saveBtn = screen.getByRole('button', { name: /Save & Start Preset/i });
    fireEvent.click(saveBtn);

    // Should create preset and start it
    expect(screen.getByText('McGill Hold')).toBeInTheDocument();
    expect(screen.getByText('00:45')).toBeInTheDocument();
  });

  it('keeps the rest timer running in overtime past 00:00 until stopped or reset', () => {
    vi.useFakeTimers();
    render(<RestTimerWidget variant="inline" />);

    // Start 15s preset
    const presetBtn = screen.getByText('Athlean-X 20-Effective-Reps rest-pause cluster reset').closest('button')!;
    act(() => {
      fireEvent.click(presetBtn);
    });

    // Advance 15s countdown to completion
    act(() => {
      vi.advanceTimersByTime(15000);
    });

    // Advance 3s overtime
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // Shows overtime +00:03 and label "Overtime: Running until stopped"
    expect(screen.getByTestId('rest-timer-display')).toHaveTextContent('+00:03');
    expect(screen.getByText(/Overtime: Running until stopped/i)).toBeInTheDocument();

    // Resetting clears overtime back to Ready
    const resetBtn = screen.getByRole('button', { name: /Reset Timer/i });
    act(() => {
      fireEvent.click(resetBtn);
    });
    expect(screen.getByText(/Ready/i)).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('displays contextual upcoming next set banner during rest and notifies next set readiness on completion', () => {
    vi.useFakeTimers();
    const onStartNextSet = vi.fn();

    render(
      <RestTimerWidget
        variant="inline"
        activePresetSeconds={15}
        activeRestContext={{
          exerciseId: 't1_bb_squat',
          exerciseName: 'Barbell Back Squat',
          completedSetNumber: 1,
          totalSets: 4,
          nextSetNumber: 2,
        }}
        onStartNextSet={onStartNextSet}
      />
    );

    // During rest countdown, upcoming target banner displays the next set
    expect(screen.getByTestId('rest-upcoming-target-banner')).toBeInTheDocument();
    expect(screen.getByText(/Up Next:/i)).toBeInTheDocument();
    expect(screen.getByText(/Set 2 · Barbell Back Squat/i)).toBeInTheDocument();
    expect(screen.getByText(/Set 1\/4 Done/i)).toBeInTheDocument();

    // Advance 15s to rest completion
    act(() => {
      vi.advanceTimersByTime(15000);
    });

    // On completion, prominent alert banner notifies user to start the next set
    expect(screen.getByTestId('rest-completed-banner')).toBeInTheDocument();
    expect(screen.getByText(/Time to Start Next Set!/i)).toBeInTheDocument();
    expect(screen.getByText(/Ready for Set 2 of Barbell Back Squat/i)).toBeInTheDocument();

    const startNextSetBtn = screen.getByRole('button', { name: /Start Set 2/i });
    expect(startNextSetBtn).toBeInTheDocument();

    // Clicking start next set invokes callback and resets
    act(() => {
      fireEvent.click(startNextSetBtn);
    });
    expect(onStartNextSet).toHaveBeenCalled();
    expect(screen.queryByTestId('rest-completed-banner')).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it('renders contextual set status in docked minimized view', () => {
    vi.useFakeTimers();

    render(
      <RestTimerWidget
        variant="docked"
        activePresetSeconds={15}
        activeRestContext={{
          exerciseId: 't1_bb_squat',
          exerciseName: 'Barbell Back Squat',
          completedSetNumber: 2,
          totalSets: 3,
          nextSetNumber: 3,
        }}
      />
    );

    // Minimize timer to see bottom pill view
    const minimizeBtn = screen.getByRole('button', { name: /Minimize Timer/i });
    act(() => {
      fireEvent.click(minimizeBtn);
    });

    // Minimized pill displays Next: Set 3 during countdown
    expect(screen.getByText(/Next: Set 3/i)).toBeInTheDocument();

    // Advance to completion
    act(() => {
      vi.advanceTimersByTime(15000);
    });

    // Minimized pill displays Set 3 Ready! with emerald indicator
    expect(screen.getByText(/Set 3 Ready!/i)).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('syncs idle timer duration and displays Active Exercise Rest button for the working card', () => {
    render(
      <RestTimerWidget
        variant="docked"
        initialDuration={180}
        activeRestContext={{
          exerciseId: 't1_bb_squat',
          exerciseName: 'Barbell Back Squat',
          completedSetNumber: 1,
          totalSets: 3,
          nextSetNumber: 2,
        }}
      />
    );

    // Idle pill displays synced 180s duration (03:00)
    expect(screen.getByText('03:00')).toBeInTheDocument();

    // Expand docked widget
    const expandBtn = screen.getByRole('button', { name: /Expand Rest Timer/i });
    fireEvent.click(expandBtn);

    // Active Exercise Rest button is rendered with exercise name and duration
    const syncBtn = screen.getByTestId('sync-current-exercise-timer-btn');
    expect(syncBtn).toBeInTheDocument();
    expect(screen.getByText('Barbell Back Squat')).toBeInTheDocument();
    expect(screen.getByText('180s (03:00)')).toBeInTheDocument();

    // Clicking Active Exercise Rest starts the synced 180s timer
    fireEvent.click(syncBtn);
    expect(screen.getByText(/Resting/i)).toBeInTheDocument();
  });
});
