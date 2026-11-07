// tests/e2e/progression_ui.test.tsx
// Next-weight pre-fill, "last time" numbers, undo and planned deload weeks, through the real app.
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import App from '../../src/App';
import { storageManager, CompletedWorkoutSession } from '../../src/storage/storageManager';
import { restTimerSingleton } from '../../src/timer/restTimerSingleton';
import { WORKOUT_PROGRAM } from '../../src/domain/programData';
import { weekStart, deloadSets } from '../../src/domain/progression';

const squat = WORKOUT_PROGRAM.lower_a.exercises.find((e) => e.id === 't1_bb_squat')!;
const reps = parseInt(squat.targetReps, 10);
const day = (offsetDays: number, hour = 18) => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + offsetDays, hour).toISOString();
};
const squatSets = (w: number) =>
  Array.from({ length: squat.targetSets }, (_, i) => ({
    setNumber: i + 1,
    targetReps: squat.targetReps,
    weightLbs: w,
    repsAchieved: reps,
    isCompleted: true,
    notes: i === 0 ? '@RPE 8' : '',
  }));
const record = (id: string, sessionId: string, date: string, logs: Record<string, unknown> = {}): CompletedWorkoutSession => ({
  id,
  sessionId,
  date,
  completedAt: date,
  logs,
  adherencePercentage: 100,
});

function seed(history: CompletedWorkoutSession[]) {
  localStorage.clear();
  restTimerSingleton.reset();
  storageManager.saveImmediate({
    activeSessionId: 'lower_a',
    currentLogs: {},
    mobilityHistory: [],
    completedWorkouts: Object.fromEntries(history.map((h) => [h.id!, h])),
  });
}

const squatCard = () => within(screen.getByTestId('progression-panel-t1_bb_squat').parentElement!);

describe('progression in the workout screen', { timeout: 20000 }, () => {
  beforeEach(() => seed([]));

  it('pre-fills the next weight, shows last time per set, and can undo', async () => {
    // Lower A done 4 days ago at 185 for every rep; Upper B yesterday, so Lower A is up next
    seed([
      record('la', 'lower_a', day(-4), { t1_bb_squat: squatSets(185) }),
      record('ub', 'upper_b', day(-1)),
    ]);
    render(<App />);

    const banner = await screen.findByTestId('load-suggestion-t1_bb_squat');
    expect(banner).toHaveTextContent('Up to 195 lb (+10)');
    expect(screen.getByTestId('last-time-set-t1_bb_squat-1')).toHaveTextContent(`185×${reps}`);
    await waitFor(() => expect(squatCard().getByLabelText('Set 1 Weight (lbs)')).toHaveValue(195));
    expect(squatCard().getByLabelText(`Set ${squat.targetSets} Weight (lbs)`)).toHaveValue(195);

    fireEvent.click(screen.getByTestId('undo-load-suggestion-t1_bb_squat'));
    await waitFor(() => expect(squatCard().getByLabelText('Set 1 Weight (lbs)')).toHaveValue(185));
    expect(screen.queryByTestId('load-suggestion-t1_bb_squat')).not.toBeInTheDocument();
  });

  it('does not pre-fill again for the same workout after a reload', async () => {
    seed([record('la', 'lower_a', day(-4), { t1_bb_squat: squatSets(185) }), record('ub', 'upper_b', day(-1))]);
    const first = render(<App />);
    await waitFor(() => expect(squatCard().getByLabelText('Set 1 Weight (lbs)')).toHaveValue(195));
    fireEvent.change(squatCard().getByLabelText('Set 1 Weight (lbs)'), { target: { value: '190' } });
    await new Promise((r) => setTimeout(r, 400)); // let the debounced log save run
    first.unmount();
    render(<App />);
    await waitFor(() => expect(squatCard().getByLabelText('Set 1 Weight (lbs)')).toHaveValue(190));
  });

  it('shows the block position, and a deload week cuts sets and weight', async () => {
    const thisMonday = weekStart(new Date());
    const history: CompletedWorkoutSession[] = [];
    for (let w = 4; w >= 1; w--) {
      const mon = new Date(thisMonday);
      mon.setDate(mon.getDate() - 7 * w);
      const at = (d: number) => new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + d, 18).toISOString();
      history.push(record(`la${w}`, 'lower_a', at(0), { t1_bb_squat: squatSets(200) }));
      history.push(record(`ub${w}`, 'upper_b', at(2)));
    }
    seed(history);
    render(<App />);

    expect(await screen.findByTestId('deload-banner')).toHaveTextContent('Deload week');
    expect(await screen.findByTestId('load-suggestion-t1_bb_squat')).toHaveTextContent('Deload: 170 lb');
    const sets = deloadSets(squat.targetSets);
    await waitFor(() => expect(squatCard().getByLabelText(`Set ${sets} Weight (lbs)`)).toHaveValue(170));
    expect(squatCard().queryByLabelText(`Set ${sets + 1} Weight (lbs)`)).not.toBeInTheDocument();

    // pushing it back restores the normal plan for this week
    fireEvent.click(screen.getByTestId('deload-postpone-btn'));
    await waitFor(() => expect(screen.getByTestId('deload-banner')).toHaveTextContent('Deload pushed back'));
    await waitFor(() => expect(squatCard().getByLabelText(`Set ${squat.targetSets} Weight (lbs)`)).toBeInTheDocument());
  });

  it('a fresh start shows week 1 and no suggestion', async () => {
    render(<App />);
    expect(await screen.findByTestId('deload-banner')).toHaveTextContent('Week 1 of 5');
    expect(screen.queryByTestId('load-suggestion-t1_bb_squat')).not.toBeInTheDocument();
  });
});
