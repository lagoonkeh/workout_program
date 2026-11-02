// tests/sim/twoMonthSim.test.tsx
// Opt-in (npm run test:sim): simulates two months of training through the real app, day by day, and
// writes any problems to _sim/report.json. It fails if anything was found.
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { render, screen, fireEvent, cleanup, act, within } from '@testing-library/react';
import fs from 'fs';
import path from 'path';
import App from '../../src/App';
import { storageManager } from '../../src/storage/storageManager';
import { STORAGE_KEY_SESSION, STORAGE_KEY_LOGS } from '../../src/storage/appStorageKeys';
import { WORKOUT_SESSIONS } from '../../src/domain/programData';

type Finding = { day: string; where: string; issue: string };
const findings: Finding[] = [];
const consoleMsgs = new Map<string, { count: number; day: string }>();
let today = '';
const note = (where: string, issue: string) => findings.push({ day: today, where, issue });

const ROTATION: string[] = WORKOUT_SESSIONS.map((s) => s.id);
const titleOf = (id: string) => WORKOUT_SESSIONS.find((s) => (s.id as string) === id)?.title || id;

let clock = new Date(2026, 8, 7, 18, 0, 0);
const setClock = (d: Date) => {
  clock = new Date(d);
  vi.setSystemTime(clock);
};
const tick = (min: number) => setClock(new Date(clock.getTime() + min * 60000));

const flush = async () => {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
};

function checkDom(where: string) {
  const text = document.body.textContent || '';
  for (const bad of ['NaN', 'undefined', 'Infinity', '[object Object]', 'Invalid Date']) {
    const esc = bad.replace(/[[\]]/g, '\\$&');
    const re = new RegExp(`(^|[^A-Za-z])${esc}([^A-Za-z]|$)`);
    const i = text.search(re);
    if (i >= 0) note(where, `screen shows "${bad}": …${text.slice(Math.max(0, i - 70), i + 50).replace(/\s+/g, ' ')}…`);
  }
}

async function openApp() {
  render(<App />);
  await flush();
  checkDom('open');
}
const closeApp = () => cleanup();

const activeId = () => localStorage.getItem(STORAGE_KEY_SESSION) || 'lower_a';
const historyList = () => Object.values(storageManager.getCompletedWorkouts());
const doneSetButtons = () => screen.queryAllByRole('button', { name: /^Mark set \d+ as incomplete$/ });
const savedTicks = (id: string) => {
  const logs = JSON.parse(localStorage.getItem(STORAGE_KEY_LOGS) || '{}');
  const ses = WORKOUT_SESSIONS.find((x) => (x.id as string) === id)!;
  return [...ses.exercises, ...(ses.dailyCoreFinisher || [])].reduce((n, e) => n + (logs[e.id] || []).filter((l: any) => l.isCompleted).length, 0);
};
const openSetButtons = () => screen.queryAllByRole('button', { name: /^Mark set \d+ as completed$/ });

async function tickWarmups() {
  for (let i = 0; i < 40; i++) {
    const b = screen.queryAllByRole('button', { name: /^Mark drill .* as completed$/ })[0];
    if (!b) break;
    fireEvent.click(b);
    tick(1);
    await flush();
  }
}

async function tickSets(opts: { limit?: number; skipFirstExercise?: boolean; weightBump?: number } = {}) {
  let n = 0;
  if (opts.weightBump) {
    const w = screen.queryAllByLabelText(/^Set 1 Weight \(lbs\)$/)[0] as HTMLInputElement | undefined;
    if (w) fireEvent.change(w, { target: { value: String((Number(w.value) || 0) + opts.weightBump) } });
  }
  const skipCard = opts.skipFirstExercise ? openSetButtons()[0]?.closest('[data-testid="exercise-card"]') : null;
  for (let i = 0; i < 300; i++) {
    const btns = openSetButtons().filter((b) => !skipCard || !skipCard.contains(b));
    if (btns.length === 0) break;
    if (opts.limit !== undefined && n >= opts.limit) break;
    fireEvent.click(btns[0]);
    n++;
    tick(2);
    await flush();
  }
  return n;
}

async function finishWorkout(expectSkips = false) {
  const btn = screen.queryByTestId('mark-workout-completed-btn');
  if (!btn) {
    note('finish', 'no "Mark workout completed" button on the workout screen');
    return;
  }
  fireEvent.click(btn);
  await flush();
  const modal = screen.queryByTestId('workout-completion-modal');
  if (modal) {
    if (!expectSkips) note('finish', 'completion modal asked about skipped exercises although every set was ticked');
    fireEvent.click(screen.getByTestId('confirm-completion-adjustments-btn'));
    await flush();
  } else if (expectSkips) {
    note('finish', 'skipped an exercise but no skipped-exercise review appeared');
  }
}

let expectedHistory = 0;
let expectedActive = 'lower_a';
const nextInRotation = (id: string) => ROTATION[(ROTATION.indexOf(id) + 1) % ROTATION.length];

function checkState(where: string, opts: { allowMarks?: boolean } = {}) {
  const h = historyList();
  if (h.length !== expectedHistory) {
    const list = h
      .map((w) => `${w.sessionId}@${new Date(w.completedAt || w.date).toLocaleString()}`)
      .sort((a, b) => +new Date(a.split('@')[1]) - +new Date(b.split('@')[1]));
    note(where, `history has ${h.length} workouts, expected ${expectedHistory}. Latest: ${list.slice(-3).join(' | ')}`);
    expectedHistory = h.length;
  }
  if (activeId() !== expectedActive) {
    note(where, `active session is ${activeId()}, expected ${expectedActive}`);
    expectedActive = activeId();
  }
  if (!opts.allowMarks) {
    const marked = Math.max(doneSetButtons().length, savedTicks(activeId()));
    if (marked > 0) note(where, `${titleOf(activeId())} opened with ${marked} set(s) already ticked`);
  }
}

async function doWorkout(opts: { skip?: boolean; weightBump?: number; manualPick?: string } = {}) {
  await openApp();
  if (opts.manualPick) {
    const title = titleOf(opts.manualPick).split(':')[0];
    const pill =
      screen.queryByTestId(`session-nav-pill-${opts.manualPick}`) ||
      screen.queryAllByRole('button').find((b) => (b.textContent || '').trim().startsWith(title) && b.closest('nav, [class*="border-b"]'));
    if (!pill) {
      const ids = Array.from(document.querySelectorAll('[data-testid^="session-nav-"]')).map((e) => e.getAttribute('data-testid')).join(',');
      const logs = JSON.parse(localStorage.getItem(STORAGE_KEY_LOGS) || '{}');
      const ses = WORKOUT_SESSIONS.find((x) => (x.id as string) === opts.manualPick)!;
      const marked = ses.exercises.map((e) => `${e.id}:${(logs[e.id] || []).filter((l: any) => l.isCompleted).length}/${(logs[e.id] || []).length}:${(logs[e.id] || []).map((l: any) => l.notes).join('|')}`).join(' ');
      const toggle = screen.queryByTestId('toggle-hide-completed-sessions-btn')?.textContent || screen.queryByTestId('toggle-hide-completed-pills-btn')?.textContent;
      note('pick session', `no way to open ${opts.manualPick} from the session bar. nav=${ids} toggle=${toggle} logs=${marked} starts=${localStorage.getItem('workout_session_start_times_v1')}`);
    }
    else {
      fireEvent.click(pill);
      await flush();
      expectedActive = opts.manualPick;
    }
  }
  checkState('workout start');
  const id = activeId();
  await tickWarmups();
  const ticked = await tickSets({ skipFirstExercise: opts.skip, weightBump: opts.weightBump });
  if (ticked === 0) note('workout', `${titleOf(id)} had no sets to tick`);
  checkDom('workout done');
  tick(5);
  await finishWorkout(!!opts.skip);
  expectedHistory += 1;
  expectedActive = nextInRotation(id);
  checkState('after finish', { allowMarks: true });
  if (!screen.queryByTestId('session-completion-toast')) note('after finish', 'no completion toast');
  closeApp();
}

async function visitEverything() {
  await openApp();
  checkState('sunday open');
  for (const label of ['Check-In', 'Mobility', 'Stretch', 'Progress', 'Assess', 'Routine']) {
    const b = screen.queryByRole('button', { name: `Quick switch to ${label} view` });
    if (!b) {
      note('views', `no ${label} tab`);
      continue;
    }
    fireEvent.click(b);
    await flush();
    await flush();
    checkDom(`${label} view`);
  }
  const hb = screen.queryByTestId('open-workout-history-btn') || screen.queryByTestId('mobile-open-history-btn');
  if (hb) {
    fireEvent.click(hb);
    await flush();
    const modal = screen.queryByTestId('workout-history-modal');
    if (!modal) note('history', 'history did not open');
    else {
      const cards = within(modal).queryAllByTestId(/^history-session-card-/).length;
      if (cards !== expectedHistory) note('history', `history shows ${cards} workouts, expected ${expectedHistory}`);
      checkDom('history');
      fireEvent.click(screen.getByTestId('close-history-modal-btn'));
      await flush();
    }
  } else note('history', 'no history button');
  const heat = screen.queryByTestId('session-overview-heatmap-btn');
  if (heat) {
    fireEvent.click(heat);
    await flush();
    checkDom('heatmap');
    const close = screen.queryByTestId('close-heatmap-modal-btn');
    if (close) fireEvent.click(close);
  }
  closeApp();
}

async function editLastWorkout() {
  await openApp();
  fireEvent.click(screen.queryByTestId('open-workout-history-btn') || screen.getByTestId('mobile-open-history-btn'));
  await flush();
  const modal = screen.getByTestId('workout-history-modal');
  const edit = within(modal).queryAllByTestId(/^edit-logs-btn-/)[0];
  if (!edit) {
    note('edit history', 'no Edit button on the latest workout');
    closeApp();
    return;
  }
  const latest = historyList().sort((a, b) => +new Date(b.completedAt || b.date) - +new Date(a.completedAt || a.date))[0];
  fireEvent.click(edit);
  await flush();
  const w = within(modal).queryAllByLabelText('Set 1 weight')[0] as HTMLInputElement | undefined;
  if (w) fireEvent.change(w, { target: { value: String((Number(w.value) || 0) + 10) } });
  fireEvent.click(within(modal).queryAllByTestId(/^save-logs-bottom-btn-/)[0]);
  await flush();
  if (!storageManager.getCompletedWorkouts()[latest.id!]) note('edit history', 'edited workout vanished');
  if (historyList().length !== expectedHistory) note('edit history', 'editing changed the number of workouts');
  checkDom('history after edit');
  closeApp();
}

describe.skipIf(!process.env.RUN_SIM)('two-month simulation', () => {
  beforeAll(() => {
    vi.useFakeTimers({ toFake: ['Date'], shouldAdvanceTime: true });
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}), text: async () => '' })));
    for (const kind of ['error', 'warn'] as const) {
      vi.spyOn(console, kind).mockImplementation((...args: unknown[]) => {
        const msg = `${kind}: ${args.map((a) => (a instanceof Error ? a.message : String(a))).join(' ')}`.slice(0, 240);
        const e = consoleMsgs.get(msg);
        if (e) e.count++;
        else consoleMsgs.set(msg, { count: 1, day: today });
      });
    }
    localStorage.clear();
    storageManager.clear();
  });

  afterAll(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    const out = path.resolve(__dirname, '../../_sim');
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(
      path.join(out, 'report.json'),
      JSON.stringify(
        {
          findings,
          console: [...consoleMsgs.entries()].map(([m, v]) => ({ msg: m, ...v })).sort((a, b) => b.count - a.count),
          history: historyList()
            .map((w) => ({
              s: w.sessionId,
              at: new Date(w.completedAt || w.date).toLocaleString(),
              t: +new Date(w.completedAt || w.date),
              adh: w.adherencePercentage,
              vol: w.totalVolumeLbs,
              min: Math.round((w.totalDurationSeconds || 0) / 60),
            }))
            .sort((a, b) => a.t - b.t),
          logs: JSON.parse(localStorage.getItem(STORAGE_KEY_LOGS) || '{}'),
        },
        null,
        1
      )
    );
  });

  it('runs 61 days of training', async () => {
    const start = new Date(2026, 8, 7);
    for (let d = 0; d < 61; d++) {
      const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + d);
      today = day.toDateString();
      const dow = day.getDay();
      const week = Math.floor(d / 7) + 1;
      setClock(new Date(day.getFullYear(), day.getMonth(), day.getDate(), 18, 0));

      if (week === 4 && dow >= 1 && dow <= 5) continue; // vacation week

      if (dow === 0) {
        await visitEverything();
        continue;
      }
      if (dow === 3 && week === 7) {
        await openApp();
        checkState('rest day open');
        closeApp();
        continue;
      }
      if (![1, 2, 4, 5].includes(dow)) continue;

      if (week === 2 && dow === 4) {
        await openApp();
        checkState('partial start');
        const id = activeId();
        await tickWarmups();
        await tickSets({ limit: 6 });
        closeApp();
        tick(40);
        await openApp();
        if (savedTicks(id) < 6) note('resume', `came back to ${titleOf(id)}: only ${savedTicks(id)} of 6 ticked sets were kept`);
        checkState('resume', { allowMarks: true });
        await tickSets();
        await finishWorkout();
        expectedHistory += 1;
        expectedActive = nextInRotation(id);
        checkState('after resumed finish', { allowMarks: true });
        closeApp();
        continue;
      }
      if (week === 6 && dow === 5) {
        setClock(new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 30));
        await openApp();
        checkState('late start');
        const id = activeId();
        await tickWarmups();
        await tickSets({ limit: 8 });
        setClock(new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1, 0, 20));
        closeApp();
        await openApp();
        if (savedTicks(id) < 8) note('past midnight', `after midnight only ${savedTicks(id)} of 8 ticked sets were kept`);
        checkState('past midnight', { allowMarks: true });
        await tickSets();
        await finishWorkout();
        expectedHistory += 1;
        expectedActive = nextInRotation(id);
        checkState('after late finish', { allowMarks: true });
        closeApp();
        continue;
      }
      await doWorkout({
        skip: week === 3 && dow === 2,
        weightBump: dow === 1 ? 5 : 0,
        manualPick: week === 8 && dow === 2 ? nextInRotation(nextInRotation(expectedActive)) : undefined,
      });
      if (week === 5 && dow === 1) await editLastWorkout();
    }
    today = 'final';
    for (const w of historyList()) {
      const ses = WORKOUT_SESSIONS.find((x) => (x.id as string) === w.sessionId);
      if (!ses) continue;
      const own = new Set([...ses.exercises, ...(ses.dailyCoreFinisher || [])].flatMap((e) => [e.id, e.id + '__side_left', e.id + '__side_right']));
      const foreign = Object.keys(w.logs || {}).filter((k) => !own.has(k));
      if (foreign.length) note('history record', `${w.sessionId} on ${new Date(w.completedAt || w.date).toDateString()} stores ${foreign.length} other-session exercises`);
      if (w.adherencePercentage !== undefined && w.adherencePercentage < 80) note('history record', `${w.sessionId} on ${new Date(w.completedAt || w.date).toDateString()} shows ${w.adherencePercentage}% adherence`);
    }
    const dump: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)!;
      dump[k] = localStorage.getItem(k)!;
    }
    fs.mkdirSync(path.resolve(__dirname, '../../_sim'), { recursive: true });
    fs.writeFileSync(path.resolve(__dirname, '../../_sim/storage.json'), JSON.stringify(dump));
    expect(findings).toEqual([]);
  }, 1800000);
});
