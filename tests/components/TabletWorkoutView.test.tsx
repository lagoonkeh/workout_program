// tests/components/TabletWorkoutView.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TabletWorkoutView, TabletWorkoutViewProps } from '../../src/components/tablet/TabletWorkoutView';
import { SESSION_LOWER_A } from '../../src/domain/programData';

describe('TabletWorkoutView Component (Samsung Galaxy Tab A9+ Custom UI)', () => {
  const mockOnSelectSession = vi.fn();
  const mockOnUpdateSetLog = vi.fn();
  const mockOnResetExercise = vi.fn();
  const mockOnResetSessionLogs = vi.fn();
  const mockOnToggleWarmupDrill = vi.fn();
  const mockOnToggleSplitSides = vi.fn();
  const mockOnSwitchToPairedSide = vi.fn();
  const mockOnOpenCueCard = vi.fn();
  const mockOnQuickStartRest = vi.fn();
  const mockOnClearActivePreset = vi.fn();
  const mockOnStartNextSet = vi.fn();
  const mockOnQuickStartTempo = vi.fn();
  const mockOnApplyAdaptations = vi.fn();
  const mockOnResetAdaptations = vi.fn();
  const mockOnCompleteWorkout = vi.fn();
  const mockOnToggleFocusMode = vi.fn();
  const mockOnToggleExpandCollapseAll = vi.fn();

  const defaultProps: TabletWorkoutViewProps = {
    activeSession: SESSION_LOWER_A,
    activeSessionId: 'lower_a',
    onSelectSession: mockOnSelectSession,
    sessionStats: {
      lower_a: { completedSets: 4, totalSets: 16, completedExercises: 1, totalExercises: 5, isComplete: false },
      upper_a: { completedSets: 0, totalSets: 14, completedExercises: 0, totalExercises: 4, isComplete: false },
    },
    sessionTelemetry: { totalTonnageLbs: 6400, prCount: 1, topE1RM: 245 },
    sessionExercises: SESSION_LOWER_A.exercises,
    getExerciseLogs: () => [
      { isCompleted: true, repsAchieved: 5, weightLbs: 225, targetReps: '5', setNumber: 1, rpe: 8, notes: '' },
      { isCompleted: false, repsAchieved: 0, weightLbs: 225, targetReps: '5', setNumber: 2, notes: '' },
      { isCompleted: false, repsAchieved: 0, weightLbs: 225, targetReps: '5+', setNumber: 3, notes: '' },
    ],
    completedWarmups: { w_lower_1: true },
    onToggleWarmupDrill: mockOnToggleWarmupDrill,
    splitSidesExercises: {},
    onToggleSplitSides: mockOnToggleSplitSides,
    onSwitchToPairedSide: mockOnSwitchToPairedSide,
    onOpenCueCard: mockOnOpenCueCard,
    activeRestSeconds: 90,
    activeRestContext: { exerciseId: 't1_bb_squat', completedSetNumber: 1, isLastSet: false },
    onQuickStartRest: mockOnQuickStartRest,
    onClearActivePreset: mockOnClearActivePreset,
    onStartNextSet: mockOnStartNextSet,
    onQuickStartTempo: mockOnQuickStartTempo,
    onUpdateSetLog: mockOnUpdateSetLog,
    onResetExercise: mockOnResetExercise,
    onResetSessionLogs: mockOnResetSessionLogs,
    onApplyAdaptations: mockOnApplyAdaptations,
    onResetAdaptations: mockOnResetAdaptations,
    onCompleteWorkout: mockOnCompleteWorkout,
    currentSessionCompletion: 25,
    sessionStartTime: '2026-11-01T15:00:00.000Z',
    isFocusMode: false,
    onToggleFocusMode: mockOnToggleFocusMode,
    bulkCollapseState: null,
    collapseRevision: 0,
    onToggleExpandCollapseAll: mockOnToggleExpandCollapseAll,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the dual-pane tablet workout dashboard with glanceable HUD and exercise stage', () => {
    render(<TabletWorkoutView {...defaultProps} />);

    // Dashboard root container
    expect(screen.getByTestId('tablet-workout-dashboard')).toBeInTheDocument();

    // Left HUD Telemetry
    expect(screen.getByText('Volume Lifted')).toBeInTheDocument();
    expect(screen.getByText('6,400 lbs')).toBeInTheDocument();
    expect(screen.getByText('Sets Completed')).toBeInTheDocument();
    expect(screen.getByText('4 / 16')).toBeInTheDocument();
    expect(screen.getByText('25% Complete')).toBeInTheDocument();
    expect(screen.getByText('1 PRs')).toBeInTheDocument();

    // Rest & Tempo Console (HUD)
    expect(screen.getByTestId('tablet-rest-timer-deck')).toBeInTheDocument();
    expect(screen.getByText('Rest & Tempo Console')).toBeInTheDocument();

    // Quick rest preset buttons
    expect(screen.getByText('45s')).toBeInTheDocument();
    expect(screen.getByText('90s')).toBeInTheDocument();
    expect(screen.getByText('2:00')).toBeInTheDocument();
    expect(screen.getByText('3:00')).toBeInTheDocument();

    // Exercise Jump Rail
    expect(screen.getByText('Exercise Jump Rail')).toBeInTheDocument();
    expect(screen.getAllByText('Barbell Back Squat').length).toBeGreaterThanOrEqual(2);

    // Completion Card
    expect(screen.getByTestId('tablet-workout-completion-card')).toBeInTheDocument();
  });

  it('allows switching sessions from tablet session strip', () => {
    render(<TabletWorkoutView {...defaultProps} />);

    const upperABtn = screen.getByRole('button', { name: /Upper A/i });
    fireEvent.click(upperABtn);

    expect(mockOnSelectSession).toHaveBeenCalledWith('upper_a');
  });

  it('triggers quick rest presets when tapped from the tablet rest deck', () => {
    render(<TabletWorkoutView {...defaultProps} />);

    const preset2mBtn = screen.getByRole('button', { name: '2:00' });
    fireEvent.click(preset2mBtn);

    expect(mockOnQuickStartRest).toHaveBeenCalledWith(120);
  });

  it('triggers start next set shortcut from tablet HUD', () => {
    render(<TabletWorkoutView {...defaultProps} />);

    const nextSetBtn = screen.getByRole('button', { name: /Start Next Set/i });
    fireEvent.click(nextSetBtn);

    expect(mockOnStartNextSet).toHaveBeenCalled();
  });

  it('triggers workout completion when clicking finish button on tablet stage', () => {
    render(<TabletWorkoutView {...defaultProps} />);

    const completeBtn = screen.getByTestId('mark-workout-completed-btn');
    fireEvent.click(completeBtn);

    expect(mockOnCompleteWorkout).toHaveBeenCalled();
  });
});
