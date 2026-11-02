// src/domain/nextSession.ts
/**
 * Which workout to open when the app loads: the session after the most recently finished one in the
 * Lower A → Upper A → Lower B → Upper B rotation, unless a workout is in progress (resume it).
 * Finished workouts come from local history and from the last workout in Google Sheets, so a workout
 * finished on another device is picked up too. Recovery / conditioning sessions don't move the rotation.
 */
import { parseWorkoutDate } from './historyEdit';

export const ROTATION = ['lower_a', 'upper_a', 'lower_b', 'upper_b'] as const;
const IN_ROTATION = new Set<string>(ROTATION);

/** A workout started less than this long ago (and not finished) is treated as in progress. */
export const IN_PROGRESS_WINDOW_MS = 18 * 60 * 60 * 1000;

export interface FinishedWorkout {
  sessionId: string;
  date: string;
  completedAt?: string;
}

export function nextInRotation(sessionId: string): string {
  const i = ROTATION.indexOf(sessionId as (typeof ROTATION)[number]);
  return i < 0 ? ROTATION[0] : ROTATION[(i + 1) % ROTATION.length];
}

/** The most recently finished rotation workout, from any of the given sources. */
export function lastFinishedRotationWorkout(workouts: FinishedWorkout[]): { sessionId: string; at: number } | null {
  let best: { sessionId: string; at: number } | null = null;
  for (const w of workouts) {
    if (!w || !IN_ROTATION.has(w.sessionId)) continue;
    const at = parseWorkoutDate(w.completedAt || w.date).getTime();
    if (isNaN(at)) continue;
    // a later time wins; a date-only record (noon) never beats a timed one from the same day
    if (!best || at > best.at) best = { sessionId: w.sessionId, at };
  }
  return best;
}

/** A session with a recent, unfinished start time, if any (most recent first). */
export function sessionInProgress(
  startTimes: Record<string, string>,
  isKnownSession: (id: string) => boolean,
  now: number = Date.now()
): string | null {
  let best: { id: string; t: number } | null = null;
  for (const [id, iso] of Object.entries(startTimes || {})) {
    const t = new Date(iso).getTime();
    if (!isKnownSession(id) || isNaN(t) || now - t > IN_PROGRESS_WINDOW_MS || t > now + 60000) continue;
    if (!best || t > best.t) best = { id, t };
  }
  return best ? best.id : null;
}

/** Session to open on load; null means "no history yet, keep what was open". */
export function sessionToOpen(opts: {
  finished: FinishedWorkout[];
  startTimes: Record<string, string>;
  isKnownSession: (id: string) => boolean;
  now?: number;
}): string | null {
  const resume = sessionInProgress(opts.startTimes, opts.isKnownSession, opts.now);
  if (resume) return resume;
  const last = lastFinishedRotationWorkout(opts.finished);
  return last ? nextInRotation(last.sessionId) : null;
}
