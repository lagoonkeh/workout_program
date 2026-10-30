// tests/e2e/next_set_rest_timer.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import WorkoutAppMain from '../../src/App';
import { restTimerSingleton } from '../../src/timer/restTimerSingleton';

describe('Automatic Rest Timer & Next Set Coach', () => {
  beforeEach(() => {
    localStorage.clear();
    restTimerSingleton.reset();
    vi.clearAllMocks();
  });

  it('automatically starts rest timer when a set is completed and announces the next upcoming set', () => {
    vi.useFakeTimers();
    const speakSpy = vi.spyOn(window.speechSynthesis, 'speak');

    render(<WorkoutAppMain />);

    // Find the first set's completion checkbox for Barbell Back Squat
    const set1DoneBtn = screen.getAllByRole('button', { name: /Mark set 1 as completed/i })[0];
    expect(set1DoneBtn).toBeInTheDocument();

    // User checks off Set 1
    act(() => {
      fireEvent.click(set1DoneBtn);
    });

    // 1. Rest timer automatically starts countdown (180s for T1 Back Squat)
    const banner = screen.getByTestId('rest-upcoming-target-banner');
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveTextContent(/Set 2 · Barbell Back Squat/i);
    expect(banner).toHaveTextContent(/Set 1\/5 Done/i);

    // 2. Voice announcement spoken for rest start with target set
    const spokenTexts = speakSpy.mock.calls.map((call) => (call[0] as any).text);
    const hasNextSetUpAnnouncement = spokenTexts.some(
      (txt) => txt.includes('Rest started') && txt.includes('Set 2 of Barbell Back Squat')
    );
    expect(hasNextSetUpAnnouncement).toBe(true);

    // 3. Fast-forward timer to completion (180s)
    speakSpy.mockClear();
    act(() => {
      vi.advanceTimersByTime(180000);
    });

    // 4. Time's up alert banner is displayed with next set guidance
    expect(screen.getByTestId('rest-completed-banner')).toBeInTheDocument();
    expect(screen.getByText(/Time to Start Next Set!/i)).toBeInTheDocument();
    expect(screen.getByText(/Ready for Set 2 of Barbell Back Squat/i)).toBeInTheDocument();

    // 5. Completion voice announcement informs user that it is time for Set 2
    const completionTexts = speakSpy.mock.calls.map((call) => (call[0] as any).text);
    const hasCompletionVoice = completionTexts.some(
      (txt) => txt.includes("Time's up!") && txt.includes('Set 2 of Barbell Back Squat')
    );
    expect(hasCompletionVoice).toBe(true);

    // 6. User clicks 1-tap "Start Set 2" button to transition
    const startSet2Btn = screen.getByRole('button', { name: /Start Set 2/i });
    act(() => {
      fireEvent.click(startSet2Btn);
    });

    expect(screen.queryByTestId('rest-completed-banner')).not.toBeInTheDocument();

    vi.useRealTimers();
  }, 15000);

  it('identifies and announces the next exercise when all sets of the current exercise are completed', () => {
    vi.useFakeTimers();
    const speakSpy = vi.spyOn(window.speechSynthesis, 'speak');

    render(<WorkoutAppMain />);

    // Check off all sets for Barbell Back Squat
    // T1 Back Squat has 5 sets in GZCL progression
    for (let setNum = 1; setNum <= 5; setNum++) {
      const setBtn = screen.getAllByRole('button', {
        name: new RegExp(`Mark set ${setNum} as completed`, 'i'),
      })[0];
      act(() => {
        fireEvent.click(setBtn);
      });
    }

    // On final set (Set 5), the rest timer identifies the NEXT exercise in Session Lower A (ATG Split Squat)
    expect(screen.getByTestId('rest-upcoming-target-banner')).toBeInTheDocument();
    expect(screen.getByTestId('rest-upcoming-target-banner')).toHaveTextContent(/ATG Split Squat/i);

    // Fast forward to rest completion
    speakSpy.mockClear();
    act(() => {
      vi.advanceTimersByTime(180000);
    });

    // Alert banner guides user directly to the next movement
    expect(screen.getByTestId('rest-completed-banner')).toBeInTheDocument();
    expect(screen.getByText(/Next Movement: ATG Split Squat/i)).toBeInTheDocument();

    const startNextExerciseBtn = screen.getByRole('button', { name: /Start ATG Split Squat/i });
    expect(startNextExerciseBtn).toBeInTheDocument();

    // Voice announcement explicitly speaks the next exercise
    const completionTexts = speakSpy.mock.calls.map((call) => (call[0] as any).text);
    const hasNextExerciseVoice = completionTexts.some(
      (txt) => txt.includes("Time's up!") && txt.includes('ATG Split Squat')
    );
    expect(hasNextExerciseVoice).toBe(true);

    vi.useRealTimers();
  }, 15000);
});
