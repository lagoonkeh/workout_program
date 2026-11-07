// src/timer/watchCommands.ts
/**
 * Controls that work from a Wear OS watch (or a Tasker tile) without opening the app.
 *
 * Android mirrors the phone's notifications to the watch, including their buttons, so the
 * rest-complete notification carries "Set N done" and "+30s rest" buttons. A tap reaches the
 * service worker (public/sw.js), which forwards it to the open app as a WATCH_COMMAND_MESSAGE, or
 * opens the app with ?cmd=... when it is closed. Tasker can use the same URLs directly:
 *   /?cmd=set-done            tick the next unfinished set and start its rest
 *   /?cmd=rest&sec=90         start a rest timer
 */

export const WATCH_COMMAND_MESSAGE = 'WORKOUT_WATCH_COMMAND';

export interface NextSetTarget {
  exerciseId: string;
  setIndex: number;
}

export interface NextSetInfo extends NextSetTarget {
  exerciseName: string;
  setNumber: number;
  totalSets: number;
  weightLbs: number;
  targetReps: string;
}

export type WatchCommand =
  | { cmd: 'set-done'; target: NextSetTarget | null }
  | { cmd: 'rest'; sec: number };

const clampRest = (n: number) => Math.min(900, Math.max(10, Math.round(n)));

/** ?cmd=set-done[&ex=..&set=..] | ?cmd=rest[&sec=..] */
export function parseWatchCommand(search: string): WatchCommand | null {
  const p = new URLSearchParams(search);
  const cmd = p.get('cmd');
  if (cmd === 'set-done') {
    const ex = p.get('ex');
    const set = Number(p.get('set'));
    return { cmd, target: ex && Number.isInteger(set) && set >= 0 ? { exerciseId: ex, setIndex: set } : null };
  }
  if (cmd === 'rest') {
    const sec = Number(p.get('sec'));
    return { cmd, sec: Number.isFinite(sec) && sec > 0 ? clampRest(sec) : 90 };
  }
  return null;
}

/** Message posted by the service worker for a notification button tap. */
export function commandFromMessage(data: unknown): WatchCommand | null {
  if (!data || typeof data !== 'object' || (data as { type?: string }).type !== WATCH_COMMAND_MESSAGE) return null;
  const d = data as { cmd?: string; sec?: number; target?: NextSetTarget | null };
  if (d.cmd === 'set-done') {
    const t = d.target;
    const ok = t && typeof t.exerciseId === 'string' && Number.isInteger(t.setIndex) && t.setIndex >= 0;
    return { cmd: 'set-done', target: ok ? { exerciseId: t!.exerciseId, setIndex: t!.setIndex } : null };
  }
  if (d.cmd === 'rest') return { cmd: 'rest', sec: clampRest(Number(d.sec) || 30) };
  return null;
}

/** The set "Set done" should tick: the requested one if it's still open, else the first open set in session order. */
export function resolveSetTarget<E extends { id: string }>(
  requested: NextSetTarget | null,
  exercises: E[],
  logsFor: (ex: E) => { isCompleted: boolean }[]
): { exercise: E; setIndex: number } | null {
  if (requested) {
    const ex = exercises.find((e) => e.id === requested.exerciseId);
    const set = ex ? logsFor(ex)[requested.setIndex] : undefined;
    if (ex && set && !set.isCompleted) return { exercise: ex, setIndex: requested.setIndex };
  }
  for (const ex of exercises) {
    const idx = logsFor(ex).findIndex((s) => !s.isCompleted);
    if (idx >= 0) return { exercise: ex, setIndex: idx };
  }
  return null;
}

/** Notification text for the next set: "Set 3 of 5 · Barbell Back Squat · 195 lb × 3". */
export function nextSetLine(n: NextSetInfo): string {
  const load = n.weightLbs > 0 ? ` · ${n.weightLbs} lb × ${n.targetReps}` : ` · ${n.targetReps}`;
  return `Set ${n.setNumber} of ${n.totalSets} · ${n.exerciseName}${load}`;
}
