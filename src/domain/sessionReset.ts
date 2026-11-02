// src/domain/sessionReset.ts
/**
 * Every workout starts unmarked: once a session is finished, its set check-offs, warmup drills and
 * phase tasks are cleared so the next time that session comes up in the rotation it starts fresh.
 * Logged weights are kept so the next workout starts from the last working weight.
 */
import type { SetLogRecord } from '../components/ExerciseCard';

interface SessionLike {
  exercises: { id: string }[];
  dailyCoreFinisher?: { id: string }[];
  warmup?: { id: string }[];
  warmupSequence?: { id: string }[];
}

export interface SessionMarks {
  logs: Record<string, SetLogRecord[]>;
  warmups: Record<string, boolean>;
  phases: Record<string, boolean>;
}

/** Log keys a session can own (including split left/right sides). */
export function sessionLogKeys(session: SessionLike): string[] {
  const base = [...session.exercises, ...(session.dailyCoreFinisher || [])].map((e) => e.id);
  return base.flatMap((id) => [id, `${id}__side_left`, `${id}__side_right`]);
}

function sessionTaskIds(session: SessionLike): string[] {
  return [
    ...(session.warmupSequence || []),
    ...(session.warmup || []),
    ...session.exercises,
    ...(session.dailyCoreFinisher || []),
  ].map((x) => x.id);
}

/** True if anything in the session is checked off. */
export function sessionHasMarks(session: SessionLike, marks: SessionMarks): boolean {
  if (sessionLogKeys(session).some((k) => (marks.logs[k] || []).some((s) => s.isCompleted))) return true;
  const ids = sessionTaskIds(session);
  if (ids.some((id) => marks.warmups[id])) return true;
  return Object.keys(marks.phases).some((k) => marks.phases[k] && ids.some((id) => k.startsWith(`${id}_phase_`)));
}

/** Uncheck everything in one session; weights are kept, reps / notes / timestamps are cleared. */
export function clearSessionMarks(session: SessionLike, marks: SessionMarks): SessionMarks {
  const logs = { ...marks.logs };
  for (const k of sessionLogKeys(session)) {
    if (!logs[k]) continue;
    logs[k] = logs[k].map((s) => ({
      ...s,
      isCompleted: false,
      repsAchieved: 0,
      notes: '',
      loggedAt: undefined,
    }));
  }
  const ids = sessionTaskIds(session);
  const warmups = { ...marks.warmups };
  ids.forEach((id) => delete warmups[id]);
  const phases: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(marks.phases)) {
    if (!ids.some((id) => k.startsWith(`${id}_phase_`))) phases[k] = v;
  }
  return { logs, warmups, phases };
}

/**
 * True when the session's check-offs are left over from a workout finished on an earlier day:
 * it has marks, its most recent finish was before today, it has no running start time, and no set
 * was ticked after that finish. Such marks are cleared so the next workout starts unmarked.
 */
export function isLeftoverFromEarlierDay(
  session: SessionLike & { id: string },
  marks: SessionMarks,
  history: { sessionId: string; completedAt?: string; date: string }[],
  startedAt: string | undefined,
  startOfToday: number
): boolean {
  if (startedAt || !sessionHasMarks(session, marks)) return false;
  let doneAt = 0;
  for (const w of history) {
    if (w.sessionId !== session.id) continue;
    const t = new Date(w.completedAt || w.date).getTime();
    if (!isNaN(t) && t > doneAt) doneAt = t;
  }
  if (!doneAt || doneAt >= startOfToday) return false;
  const tickedSince = sessionLogKeys(session).some((k) =>
    (marks.logs[k] || []).some(
      (s) => s.isCompleted && s.loggedAt && new Date(s.loggedAt).getTime() > doneAt + 60000
    )
  );
  return !tickedSince;
}

const sameLocalDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/**
 * The history record saved automatically when this session reached 100% today (local day), if any.
 * Tapping "Complete & Save" afterwards updates that record instead of logging the workout twice.
 */
export function findAutoSavedToday<T extends { id?: string; sessionId: string; date: string; completedAt?: string; autoSaved?: boolean }>(
  history: T[],
  sessionId: string,
  now: Date = new Date()
): T | undefined {
  return history.find(
    (w) => w.sessionId === sessionId && w.autoSaved && sameLocalDay(new Date(w.completedAt || w.date), now)
  );
}

/** True if this session already has any history record finished today (local day). */
export function finishedToday(history: { sessionId: string; date: string; completedAt?: string }[], sessionId: string, now: Date = new Date()): boolean {
  return history.some((w) => w.sessionId === sessionId && sameLocalDay(new Date(w.completedAt || w.date), now));
}

/** Only the logs that belong to this session (the app keeps every session's logs side by side). */
export function pickSessionLogs<T>(session: SessionLike, logs: Record<string, T>): Record<string, T> {
  const keys = new Set(sessionLogKeys(session));
  return Object.fromEntries(Object.entries(logs).filter(([k]) => keys.has(k)));
}
