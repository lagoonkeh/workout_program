import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { GuideWidget } from '../../src/components/GuideWidget';
import { WORKOUT_PROGRAM } from '../../src/domain/programData';
import { GLOSSARY, explainTempo, searchGlossary } from '../../src/domain/glossary';
import { loadCueCards } from '../../src/domain/cueCardStore';

const sessions = Object.values(WORKOUT_PROGRAM);

describe('glossary', () => {
  it('has unique terms, each with a definition', () => {
    const terms = GLOSSARY.map((g) => g.term.toLowerCase());
    expect(new Set(terms).size).toBe(terms.length);
    GLOSSARY.forEach((g) => expect(g.definition.length).toBeGreaterThan(20));
  });

  it('finds terms by name, alias and meaning, best match first', () => {
    expect(searchGlossary('rpe')[0].term).toBe('RPE');
    expect(searchGlossary('reps in reserve').map((g) => g.term)).toContain('RIR');
    expect(searchGlossary('KOT')[0].term).toBe('ATG');
    expect(searchGlossary('', 'In this app').every((g) => g.category === 'In this app')).toBe(true);
  });

  it('decodes tempo codes into plain steps', () => {
    expect(explainTempo('31X1')).toBe('3 s down · 1 s pause at the bottom · drive up explosively · 1 s pause at the top');
    expect(explainTempo('3012')).toBe('3 s down · no pause at the bottom · 1 s up · 2 s pause at the top');
    expect(explainTempo('HOLD-30')).toBe('Hold the position for 30 s');
    expect(explainTempo('Fluid circles')).toBeNull();
  });
});

describe('Guide tab', () => {
  it('lists the selected workout in order with cues, and opens the full cue card', async () => {
    await loadCueCards();
    const onOpen = vi.fn();
    render(<GuideWidget sessions={sessions} initialSessionId="lower_b" onOpenCueCard={onOpen} />);
    expect(screen.getByTestId('guide-session-lower_b')).toHaveAttribute('aria-selected', 'true');
    // warmups first, including the new around-the-world, then the T1 lift
    const atw = screen.getByTestId('guide-exercise-w_lower_b_4');
    const rdl = screen.getByTestId('guide-exercise-t1_bb_rdl');
    expect(atw.compareDocumentPosition(rdl) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(within(rdl).getByRole('button', { name: /Barbell Romanian Deadlift/ }));
    expect(within(rdl).getByText('Cues')).toBeInTheDocument();
    expect(within(rdl).getByText('Avoid')).toBeInTheDocument();
    fireEvent.click(within(rdl).getByTestId('guide-open-card-t1_bb_rdl'));
    expect(onOpen).toHaveBeenCalledWith('t1_bb_rdl');
  });

  it('switches workouts and expands everything at once', () => {
    render(<GuideWidget sessions={sessions} initialSessionId="lower_a" />);
    fireEvent.click(screen.getByTestId('guide-session-upper_b'));
    expect(screen.getByTestId('guide-exercise-t1_bb_ohp')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('guide-expand-all'));
    expect(screen.getAllByText('Cues').length).toBeGreaterThan(3);
  });

  it('jumps from a tier badge to its glossary entry, and searches the glossary', async () => {
    render(<GuideWidget sessions={sessions} initialSessionId="lower_a" />);
    const squat = screen.getByTestId('guide-exercise-t1_bb_squat');
    fireEvent.click(within(squat).getByRole('button', { name: /Barbell Back Squat/ }));
    fireEvent.click(within(squat).getByRole('button', { name: 'What is T1?' }));
    expect(screen.getByTestId('guide-tab-glossary')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('glossary-search')).toHaveValue('T1 (Tier 1)');
    expect(screen.getByTestId('glossary-entry-t1-tier-1')).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('glossary-search'), { target: { value: 'deload' } });
    await waitFor(() => expect(screen.getByTestId('glossary-entry-deload')).toBeInTheDocument());
    expect(screen.getByTestId('glossary-entry-deload')).toHaveTextContent('85%');
  });

  it('plays a movement demo from a glossary term', async () => {
    render(<GuideWidget sessions={sessions} initialSessionId="lower_a" />);
    fireEvent.click(screen.getByTestId('guide-tab-glossary'));
    fireEvent.change(screen.getByTestId('glossary-search'), { target: { value: 'hip hinge' } });
    const watch = await screen.findByTestId('glossary-watch-hip-hinge');
    fireEvent.click(watch);
    expect(watch).toHaveAttribute('aria-expanded', 'true');
    const player = screen.getByTestId('glossary-demo-player-hip-hinge');
    await waitFor(() => expect(within(player).getByTestId('exercise-diagram')).toBeInTheDocument());
    fireEvent.click(watch);
    expect(screen.queryByTestId('glossary-demo-player-hip-hinge')).not.toBeInTheDocument();
  });

  it('lists every exercise demo on its own chip and finds demos when searching', async () => {
    render(<GuideWidget sessions={sessions} initialSessionId="lower_a" />);
    fireEvent.click(screen.getByTestId('guide-tab-glossary'));
    fireEvent.click(screen.getByRole('button', { name: 'Exercise demos' }));
    expect(screen.getByTestId('glossary-count')).toHaveTextContent(/\d+ exercise demos/);
    const curl = screen.getByTestId('glossary-demo-athlean-x-2-second-peak-squeeze-floor-curl-up');
    fireEvent.click(curl);
    await waitFor(() => expect(screen.getAllByTestId('exercise-diagram').length).toBe(1));

    fireEvent.click(screen.getByRole('button', { name: 'All' }));
    fireEvent.change(screen.getByTestId('glossary-search'), { target: { value: 'corkscrew' } });
    expect(await screen.findByTestId('glossary-demo-athlean-x-hanging-corkscrews')).toBeInTheDocument();
  });
});

describe('glossary demos', () => {
  it('only links terms that exist, to animations that exist', async () => {
    const { GLOSSARY_DEMOS, searchExerciseDemos } = await import('../../src/domain/glossary');
    const { MOTIONS } = await import('../../src/domain/motionLibrary');
    Object.entries(GLOSSARY_DEMOS).forEach(([term, type]) => {
      expect(GLOSSARY.some((g) => g.term === term), term).toBe(true);
      expect(MOTIONS[type], type).toBeDefined();
    });
    const all = searchExerciseDemos('');
    expect(new Set(all.map((d) => d.name.toLowerCase())).size).toBe(all.length);
    expect(all.find((d) => /Serratus Elbow-to-Knee Plank/.test(d.name))?.type).toBe('plank_knee');
    expect(all.find((d) => /Vacuum Brace/.test(d.name))?.type).toBe('curl_up');
  });
});
