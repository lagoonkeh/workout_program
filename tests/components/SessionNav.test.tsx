// tests/components/SessionNav.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SessionNav } from '../../src/components/SessionNav';
import { WORKOUT_SESSIONS } from '../../src/domain/programData';

describe('SessionNav Component', () => {
  const dummyStats = {
    lower_a: { completedSets: 2, totalSets: 10, completedExercises: 1, totalExercises: 5, isComplete: false },
    upper_a: { completedSets: 10, totalSets: 10, completedExercises: 5, totalExercises: 5, isComplete: true },
    lower_b: { completedSets: 0, totalSets: 10, completedExercises: 0, totalExercises: 5, isComplete: false },
    upper_b: { completedSets: 0, totalSets: 10, completedExercises: 0, totalExercises: 5, isComplete: false },
  };

  it('renders all 4 workout session buttons', () => {
    render(
      <SessionNav
        sessions={WORKOUT_SESSIONS}
        activeSessionId="lower_a"
        onSelectSession={vi.fn()}
        sessionStats={dummyStats}
      />
    );

    expect(screen.getByText('Lower A')).toBeInTheDocument();
    expect(screen.getByText('Upper A')).toBeInTheDocument();
    expect(screen.getByText('Lower B')).toBeInTheDocument();
    expect(screen.getByText('Upper B')).toBeInTheDocument();
  });

  it('highlights currently active session with aria-current="page"', () => {
    render(
      <SessionNav
        sessions={WORKOUT_SESSIONS}
        activeSessionId="lower_a"
        onSelectSession={vi.fn()}
        sessionStats={dummyStats}
      />
    );

    const lowerABtn = screen.getByText('Lower A').closest('button')!;
    expect(lowerABtn).toHaveAttribute('aria-current', 'page');

    const upperABtn = screen.getByText('Upper A').closest('button')!;
    expect(upperABtn).not.toHaveAttribute('aria-current');
  });

  it('displays exercise completion counters and switches to Done badge when complete', () => {
    render(
      <SessionNav
        sessions={WORKOUT_SESSIONS}
        activeSessionId="lower_a"
        onSelectSession={vi.fn()}
        sessionStats={dummyStats}
      />
    );

    expect(screen.getByText('1/5 ex')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('renders focus badges for knee rehab and posterior chain', () => {
    render(
      <SessionNav
        sessions={WORKOUT_SESSIONS}
        activeSessionId="lower_a"
        onSelectSession={vi.fn()}
        sessionStats={dummyStats}
      />
    );

    expect(screen.getByText(/Knee Rehab/i)).toBeInTheDocument();
    expect(screen.getByText(/Post-Chain/i)).toBeInTheDocument();
  });

  it('fires onSelectSession callback with exact session ID on click', () => {
    const selectMock = vi.fn();
    render(
      <SessionNav
        sessions={WORKOUT_SESSIONS}
        activeSessionId="lower_a"
        onSelectSession={selectMock}
        sessionStats={dummyStats}
      />
    );

    const upperBBtn = screen.getByText('Upper B').closest('button')!;
    fireEvent.click(upperBBtn);

    expect(selectMock).toHaveBeenCalledWith('upper_b');
  });

  it('supports collapsing session selector into a single-row pill switcher and expanding back', () => {
    localStorage.clear();
    render(
      <SessionNav
        sessions={WORKOUT_SESSIONS}
        activeSessionId="lower_a"
        onSelectSession={vi.fn()}
        sessionStats={dummyStats}
      />
    );

    // Initially expanded
    expect(screen.getByText(/Select Workout Session/i)).toBeInTheDocument();
    expect(screen.getByText(/Knee Rehab/i)).toBeInTheDocument();

    // Collapse session nav
    const collapseBtn = screen.getByRole('button', { name: /Collapse session selector cards/i });
    fireEvent.click(collapseBtn);

    expect(screen.queryByText(/Select Workout Session/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Knee Rehab/i)).not.toBeInTheDocument();
    expect(localStorage.getItem('workout_session_nav_collapsed_v1')).toBe('true');

    // Expand session nav
    const expandBtn = screen.getByRole('button', { name: /Expand session selector cards/i });
    fireEvent.click(expandBtn);

    expect(screen.getByText(/Select Workout Session/i)).toBeInTheDocument();
    expect(screen.getByText(/Knee Rehab/i)).toBeInTheDocument();
    expect(localStorage.getItem('workout_session_nav_collapsed_v1')).toBe('false');
  });

  it('automatically hides completed session cards when autoHideCompleted is true', () => {
    const onToggleMock = vi.fn();
    render(
      <SessionNav
        sessions={WORKOUT_SESSIONS}
        activeSessionId="lower_a"
        onSelectSession={vi.fn()}
        sessionStats={dummyStats}
        autoHideCompleted={true}
        onToggleAutoHideCompleted={onToggleMock}
      />
    );

    // Incomplete sessions are visible
    expect(screen.getByText('Lower A')).toBeInTheDocument();
    expect(screen.getByText('Lower B')).toBeInTheDocument();
    expect(screen.getByText('Upper B')).toBeInTheDocument();

    // Completed Upper A is hidden
    expect(screen.queryByText('Upper A')).not.toBeInTheDocument();

    // Toggle button is present showing count
    const toggleBtn = screen.getByTestId('toggle-hide-completed-sessions-btn');
    expect(toggleBtn).toHaveTextContent(/Show Completed \(1\)/i);

    fireEvent.click(toggleBtn);
    expect(onToggleMock).toHaveBeenCalledTimes(1);
  });

  it('displays cycle completion banner and shows all sessions when all 4 sessions are completed', () => {
    const allDoneStats = {
      lower_a: { completedSets: 10, totalSets: 10, completedExercises: 5, totalExercises: 5, isComplete: true },
      upper_a: { completedSets: 10, totalSets: 10, completedExercises: 5, totalExercises: 5, isComplete: true },
      lower_b: { completedSets: 10, totalSets: 10, completedExercises: 5, totalExercises: 5, isComplete: true },
      upper_b: { completedSets: 10, totalSets: 10, completedExercises: 5, totalExercises: 5, isComplete: true },
    };

    render(
      <SessionNav
        sessions={WORKOUT_SESSIONS}
        activeSessionId="lower_a"
        onSelectSession={vi.fn()}
        sessionStats={allDoneStats}
        autoHideCompleted={true}
      />
    );

    expect(screen.getByText(/All 4 Workout Sessions Completed for this Cycle!/i)).toBeInTheDocument();
    expect(screen.getByText('Lower A')).toBeInTheDocument();
    expect(screen.getByText('Upper A')).toBeInTheDocument();
    expect(screen.getByText('Lower B')).toBeInTheDocument();
    expect(screen.getByText('Upper B')).toBeInTheDocument();
  });
});


