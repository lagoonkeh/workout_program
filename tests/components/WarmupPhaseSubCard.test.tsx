// tests/components/WarmupPhaseSubCard.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WarmupPhaseSubCard, parseWarmupPhase } from '../../src/components/WarmupPhaseSubCard';
import { EXERCISE_VISUALS } from '../../src/domain/exerciseVisualsData';

describe('WarmupPhaseSubCard Component', () => {
  const mockInstruction = 'Phase 3 — 360° Nasal Inhale: Inhale 5s through nose, filling abdomen, obliques, and lower back.';
  const mockVisual = EXERCISE_VISUALS.w_lower_a_2;

  it('parses phase instruction, title, and duration correctly', () => {
    const parsed = parseWarmupPhase(mockInstruction, 2, 6);
    expect(parsed.phaseNumber).toBe(3);
    expect(parsed.title).toBe('360° Nasal Inhale');
    expect(parsed.details).toContain('Inhale 5s through nose');
    expect(parsed.timerSeconds).toBe(5);
    expect(parsed.timerLabel).toBe('5s Inhale');
    expect(parsed.focusType).toBe('breathing');
  });

  it('renders phase title, instruction, and timer button', () => {
    const onToggleDone = vi.fn();
    const onOpenDemoModal = vi.fn();
    const onStartTimer = vi.fn();

    render(
      <WarmupPhaseSubCard
        drillId="w_lower_a_2"
        drillName="Alyssa Lu 90/90 Positional Breathing + Bridge"
        phaseIndex={2}
        totalPhases={6}
        instruction={mockInstruction}
        isDone={false}
        onToggleDone={onToggleDone}
        drillVisual={mockVisual}
        onOpenDemoModal={onOpenDemoModal}
        onStartTimer={onStartTimer}
      />
    );

    expect(screen.getByText(/Phase 3/i)).toBeInTheDocument();
    expect(screen.getByText(/360° Nasal Inhale/i)).toBeInTheDocument();
    expect(screen.getByText(/Inhale 5s through nose/i)).toBeInTheDocument();
    expect(screen.getByText(/5s Inhale/i)).toBeInTheDocument();
    expect(screen.getByText(/Demo/i)).toBeInTheDocument();
  });

  it('triggers onToggleDone when clicking completion button', () => {
    const onToggleDone = vi.fn();
    const onOpenDemoModal = vi.fn();
    const onStartTimer = vi.fn();

    render(
      <WarmupPhaseSubCard
        drillId="w_lower_a_2"
        drillName="Alyssa Lu 90/90 Positional Breathing + Bridge"
        phaseIndex={2}
        totalPhases={6}
        instruction={mockInstruction}
        isDone={false}
        onToggleDone={onToggleDone}
        drillVisual={mockVisual}
        onOpenDemoModal={onOpenDemoModal}
        onStartTimer={onStartTimer}
      />
    );

    const toggleBtn = screen.getByRole('button', { name: /Mark Phase 3 as complete/i });
    fireEvent.click(toggleBtn);
    expect(onToggleDone).toHaveBeenCalledTimes(1);
  });

  it('triggers onStartTimer when clicking the quick-timer button', () => {
    const onToggleDone = vi.fn();
    const onOpenDemoModal = vi.fn();
    const onStartTimer = vi.fn();

    render(
      <WarmupPhaseSubCard
        drillId="w_lower_a_2"
        drillName="Alyssa Lu 90/90 Positional Breathing + Bridge"
        phaseIndex={2}
        totalPhases={6}
        instruction={mockInstruction}
        isDone={false}
        onToggleDone={onToggleDone}
        drillVisual={mockVisual}
        onOpenDemoModal={onOpenDemoModal}
        onStartTimer={onStartTimer}
      />
    );

    const timerBtn = screen.getByRole('button', { name: /Start 5s Inhale for 360° Nasal Inhale/i });
    fireEvent.click(timerBtn);
    expect(onStartTimer).toHaveBeenCalledWith(5, expect.stringContaining('360° Nasal Inhale'));
  });

  it('triggers onOpenDemoModal when clicking Demo button', () => {
    const onToggleDone = vi.fn();
    const onOpenDemoModal = vi.fn();
    const onStartTimer = vi.fn();

    render(
      <WarmupPhaseSubCard
        drillId="w_lower_a_2"
        drillName="Alyssa Lu 90/90 Positional Breathing + Bridge"
        phaseIndex={2}
        totalPhases={6}
        instruction={mockInstruction}
        isDone={false}
        onToggleDone={onToggleDone}
        drillVisual={mockVisual}
        onOpenDemoModal={onOpenDemoModal}
        onStartTimer={onStartTimer}
      />
    );

    const demoBtn = screen.getByRole('button', { name: /Open full visual demo/i });
    fireEvent.click(demoBtn);
    expect(onOpenDemoModal).toHaveBeenCalledTimes(1);
  });

  it('toggles inline diagram preview when clicking Diagram button', () => {
    const onToggleDone = vi.fn();
    const onOpenDemoModal = vi.fn();
    const onStartTimer = vi.fn();

    render(
      <WarmupPhaseSubCard
        drillId="w_lower_a_2"
        drillName="Alyssa Lu 90/90 Positional Breathing + Bridge"
        phaseIndex={2}
        totalPhases={6}
        instruction={mockInstruction}
        isDone={false}
        onToggleDone={onToggleDone}
        drillVisual={mockVisual}
        onOpenDemoModal={onOpenDemoModal}
        onStartTimer={onStartTimer}
      />
    );

    const diagramToggleBtn = screen.getByRole('button', { name: /Show visual diagram for Phase 3/i });
    fireEvent.click(diagramToggleBtn);

    expect(screen.getByText(/Visual Demo:/i)).toBeInTheDocument();
    expect(screen.getByText(/Biomechanical Cues:/i)).toBeInTheDocument();

    // Toggle hide
    fireEvent.click(screen.getByRole('button', { name: /Hide visual diagram for Phase 3/i }));
    expect(screen.queryByText(/Biomechanical Cues:/i)).not.toBeInTheDocument();
  });
});
