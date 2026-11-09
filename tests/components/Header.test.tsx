// tests/components/Header.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Header } from '../../src/components/Header';

describe('Header Component', () => {
  it('renders brand title and active session subtitle', () => {
    render(
      <Header
        activeSessionTitle="Lower A"
        activeSessionSubtitle="Quad & Knee Bulletproofing Focus"
        isMuted={false}
        onToggleMute={vi.fn()}
        currentView="workout"
        onSelectView={vi.fn()}
        completionPercentage={40}
      />
    );

    expect(screen.getByText(/4-Day Upper\/Lower/i)).toBeInTheDocument();
    expect(screen.getByText(/GZCL \+ 9 Creators/i)).toBeInTheDocument();
    expect(screen.getByText(/Lower A:/i)).toBeInTheDocument();
    expect(screen.getByText(/Quad & Knee Bulletproofing Focus/i)).toBeInTheDocument();
  });

  it('toggles audio mute status and invokes onToggleMute on click', () => {
    const toggleMock = vi.fn();
    const { rerender } = render(
      <Header
        activeSessionTitle="Lower A"
        activeSessionSubtitle="Focus"
        isMuted={false}
        onToggleMute={toggleMock}
        currentView="workout"
        onSelectView={vi.fn()}
        completionPercentage={0}
      />
    );

    const muteBtn = screen.getAllByRole('button', { name: /Mute Audio Synthesizer/i })[0];
    fireEvent.click(muteBtn);
    expect(toggleMock).toHaveBeenCalledTimes(1);

    rerender(
      <Header
        activeSessionTitle="Lower A"
        activeSessionSubtitle="Focus"
        isMuted={true}
        onToggleMute={toggleMock}
        currentView="workout"
        onSelectView={vi.fn()}
        completionPercentage={0}
      />
    );

    expect(screen.getAllByRole('button', { name: /Unmute Audio Synthesizer/i })[0]).toBeInTheDocument();
  });

  it('renders view switcher tabs and calls onSelectView', () => {
    const selectViewMock = vi.fn();
    render(
      <Header
        activeSessionTitle="Lower A"
        activeSessionSubtitle="Focus"
        isMuted={false}
        onToggleMute={vi.fn()}
        currentView="workout"
        onSelectView={selectViewMock}
        completionPercentage={25}
      />
    );

    const checkInTab = screen.getByRole('tab', { name: /Check-In/i });
    fireEvent.click(checkInTab);
    expect(selectViewMock).toHaveBeenCalledWith('readiness');

    // Plates tab is removed from header navigation
    const platesTab = screen.queryByRole('tab', { name: /Plates/i });
    expect(platesTab).not.toBeInTheDocument();

    const mobilityTab = screen.getByRole('tab', { name: /Mobility/i });
    fireEvent.click(mobilityTab);
    expect(selectViewMock).toHaveBeenCalledWith('mobility');

    const stretchTab = screen.getByRole('tab', { name: /Stretch/i });
    fireEvent.click(stretchTab);
    expect(selectViewMock).toHaveBeenCalledWith('stretching');

    const progressTab = screen.getByRole('tab', { name: /Progress/i });
    fireEvent.click(progressTab);
    expect(selectViewMock).toHaveBeenCalledWith('progress');

    const assessTab = screen.getByRole('tab', { name: /Assess/i });
    fireEvent.click(assessTab);
    expect(selectViewMock).toHaveBeenCalledWith('assessment');
  });

  it('displays accurate completion percentage in text', () => {
    render(
      <Header
        activeSessionTitle="Lower A"
        activeSessionSubtitle="Focus"
        isMuted={false}
        onToggleMute={vi.fn()}
        currentView="workout"
        onSelectView={vi.fn()}
        completionPercentage={85}
      />
    );

    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  it('has accessible roles and aria attributes', () => {
    render(
      <Header
        activeSessionTitle="Lower A"
        activeSessionSubtitle="Focus"
        isMuted={false}
        onToggleMute={vi.fn()}
        currentView="workout"
        onSelectView={vi.fn()}
        completionPercentage={10}
      />
    );

    const tablist = screen.getByRole('tablist');
    expect(tablist).toBeInTheDocument();

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(8);
    expect(screen.getByRole('tab', { name: /Guide/i })).toBeInTheDocument();
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[1]).toHaveAttribute('aria-selected', 'false');
  });

  it('renders sync button and triggers onSync callback', () => {
    const onSyncMock = vi.fn();
    render(
      <Header
        activeSessionTitle="Lower A"
        activeSessionSubtitle="Focus"
        isMuted={false}
        onToggleMute={vi.fn()}
        currentView="workout"
        onSelectView={vi.fn()}
        completionPercentage={50}
        onSync={onSyncMock}
        lastSyncedTime="10:30 PM"
      />
    );

    const syncBtns = screen.getAllByRole('button', { name: /Sync to Google Sheets/i });
    expect(syncBtns.length).toBeGreaterThan(0);
    fireEvent.click(syncBtns[0]);
    expect(onSyncMock).toHaveBeenCalledTimes(1);
  });

  it('shows syncing state when isSyncing is true', () => {
    render(
      <Header
        activeSessionTitle="Lower A"
        activeSessionSubtitle="Focus"
        isMuted={false}
        onToggleMute={vi.fn()}
        currentView="workout"
        onSelectView={vi.fn()}
        completionPercentage={50}
        onSync={vi.fn()}
        isSyncing={true}
      />
    );

    expect(screen.getAllByText(/Syncing\.\.\./i).length).toBeGreaterThan(0);
    const syncBtns = screen.getAllByRole('button', { name: /Sync to Google Sheets/i });
    expect(syncBtns[0]).toBeDisabled();
  });

  it('renders athletic emerald brand emblem logo with glowing vector shield', () => {
    render(
      <Header
        activeSessionTitle="Lower A"
        activeSessionSubtitle="Focus"
        isMuted={false}
        onToggleMute={vi.fn()}
        currentView="workout"
        onSelectView={vi.fn()}
        completionPercentage={0}
      />
    );

    const logo = screen.getByRole('img', { name: /Workout Program Athletic Emerald Logo/i });
    expect(logo).toBeInTheDocument();
  });
});

