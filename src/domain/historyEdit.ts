// src/domain/historyEdit.ts
/**
 * Editing a past workout: resolving exercise names, recalculating totals after an edit, moving the
 * workout's date / start time / duration, and building the rows that replace it in Google Sheets.
 */
import { ALL_APP_SESSIONS, type WorkoutExercise } from './programData';
import type { CompletedWorkoutSession } from '../storage/storageManager';

export type HistorySet = Record<string, any>;

const SIDE_RE = /__side_(left|right)$/;
// keys pulled back from Google Sheets are the exercise name in snake case, e.g. "..._left_side"
const SHEET_SIDE_RE = /_(left|right)_side$/;
const sideOf = (key: string) => SIDE_RE.exec(key)?.[1] || SHEET_SIDE_RE.exec(key)?.[1];
const baseKey = (key: string) => key.replace(SIDE_RE, '').replace(SHEET_SIDE_RE, '');
const normName = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

let exerciseIndex: { byId: Map<string, WorkoutExercise>; byName: Map<string, WorkoutExercise> } | null = null;
function index() {
  if (!exerciseIndex) {
    const byId = new Map<string, WorkoutExercise>();
    const byName = new Map<string, WorkoutExercise>();
    ALL_APP_SESSIONS.forEach((s) =>
      [...s.exercises, ...(s.dailyCoreFinisher || [])].forEach((e) => {
        if (!byId.has(e.id)) byId.set(e.id, e);
        if (!byName.has(normName(e.name))) byName.set(normName(e.name), e);
      })
    );
    exerciseIndex = { byId, byName };
  }
  return exerciseIndex;
}

/** Program exercise for a log key (by id, with or without a side suffix, or by its name). */
export function findExercise(key: string): WorkoutExercise | undefined {
  const base = baseKey(key);
  const { byId, byName } = index();
  return byId.get(base) || byName.get(normName(base));
}

/** Exercises no longer in the program that may still appear in past workouts */
const RETIRED_NAMES: Record<string, string> = {
  t2_landmine_meadows_row: 'Landmine Meadows Row',
};

/** Readable name for a log key, e.g. "Bulgarian Split Squat (Left Side)". */
export function exerciseDisplayName(key: string): string {
  const side = sideOf(key);
  const ex = findExercise(key);
  const base = ex
    ? ex.name
    : RETIRED_NAMES[baseKey(key)]
    ? RETIRED_NAMES[baseKey(key)]
    : baseKey(key).split('_').filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  return side ? `${base} (${side === 'left' ? 'Left' : 'Right'} Side)` : base;
}

export const setsOf = (raw: unknown): HistorySet[] => (Array.isArray(raw) ? raw : raw ? [raw as HistorySet] : []);
const isDone = (s: HistorySet) => !!(s?.isCompleted || s?.completed);
const weightOf = (s: HistorySet) => Number(s?.weightLbs ?? s?.weight ?? 0) || 0;
const repsOf = (s: HistorySet) => Number(s?.repsAchieved ?? s?.reps ?? 0) || 0;

/** Set notes as the athlete wrote them: older workouts stamped "Workout Completed" on every set */
export const setNotes = (s: HistorySet): string => {
  const n = String(s?.notes ?? '');
  return n.trim() === 'Workout Completed' ? '' : n;
};

/** Parse a stored date; a bare "YYYY-MM-DD" (from Sheets) is a local calendar day, not UTC midnight. */
export function parseWorkoutDate(value?: string): Date {
  if (!value) return new Date(NaN);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0);
  return new Date(value);
}

const pad = (n: number) => String(n).padStart(2, '0');
export const localDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const localTimeStr = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** Date / start time / duration as shown in the editor. */
export function getWhen(rec: CompletedWorkoutSession): { date: string; time: string; durationMin: number } {
  const start = parseWorkoutDate(rec.startedAt || rec.date);
  const fallback = parseWorkoutDate(rec.date);
  const d = isNaN(start.getTime()) ? fallback : start;
  const safe = isNaN(d.getTime()) ? new Date() : d;
  return {
    date: localDateStr(safe),
    time: localTimeStr(safe),
    durationMin: Math.max(0, Math.round((rec.totalDurationSeconds || 0) / 60)),
  };
}

/** Apply an edit: new logs, and optionally a new date / start time / duration. Totals are recalculated. */
export function applyWorkoutEdit(
  rec: CompletedWorkoutSession,
  logs: Record<string, any>,
  when?: { date: string; time: string; durationMin: number }
): CompletedWorkoutSession {
  const cleanLogs: Record<string, HistorySet[]> = {};
  Object.entries(ownWorkoutLogs({ sessionId: rec.sessionId, logs })).forEach(([k, v]) => {
    const sets = setsOf(v).map((s, i) => ({ ...s, setNumber: i + 1 }));
    if (sets.length > 0) cleanLogs[k] = sets;
  });

  let volume = 0;
  const fullyDone = new Set<string>();
  Object.entries(cleanLogs).forEach(([k, sets]) => {
    sets.forEach((s) => {
      if (isDone(s)) volume += weightOf(s) * repsOf(s);
    });
    if (sets.every(isDone)) fullyDone.add(k);
  });
  const total = Object.keys(cleanLogs).length;
  const completed = fullyDone.size;

  const next: CompletedWorkoutSession = {
    ...rec,
    logs: cleanLogs,
    totalVolumeLbs: Math.round(volume),
    completedExercisesCount: completed,
    totalExercisesCount: total,
    adherencePercentage: total > 0 ? Math.round((completed / total) * 100) : rec.adherencePercentage,
    skippedExercises: (rec.skippedExercises || []).filter(
      (sk) => cleanLogs[sk.exerciseId] && !fullyDone.has(sk.exerciseId)
    ),
  };

  if (when && /^\d{4}-\d{2}-\d{2}$/.test(when.date) && /^\d{2}:\d{2}$/.test(when.time)) {
    const [y, mo, d] = when.date.split('-').map(Number);
    const [h, mi] = when.time.split(':').map(Number);
    const start = new Date(y, mo - 1, d, h, mi, 0);
    const durationSec = Math.max(0, Math.round((when.durationMin || 0) * 60));
    const end = new Date(start.getTime() + durationSec * 1000);
    next.startedAt = start.toISOString();
    next.completedAt = end.toISOString();
    next.date = end.toISOString();
    next.totalDurationSeconds = durationSec;
  }
  return next;
}

/** Google Sheets rows for one workout (same columns the normal sync writes). */
export function buildSheetRowsForWorkout(rec: CompletedWorkoutSession) {
  const day = localDateStr(parseWorkoutDate(rec.completedAt || rec.date));
  const session = rec.sessionTitle || rec.sessionId;
  const rows: Record<string, unknown>[] = [];
  Object.entries(ownWorkoutLogs(rec)).forEach(([key, raw]) => {
    const ex = findExercise(key);
    setsOf(raw).forEach((s, i) => {
      if (!isDone(s) && weightOf(s) <= 0 && repsOf(s) <= 0) return;
      const notes = setNotes(s);
      const rpe = /RPE\s*(\d+(?:\.\d+)?)/i.exec(notes);
      const pain = Array.from(notes.matchAll(/Pain(?:-Free)?\s*(\d+(?:\.\d+)?)\s*\/\s*10/gi), (m) => parseFloat(m[1]));
      rows.push({
        date: day,
        session,
        exerciseName: exerciseDisplayName(key),
        tier: ex?.tier || '',
        setNumber: i + 1,
        targetReps: s?.targetReps || ex?.targetReps || '',
        weight: weightOf(s),
        reps: repsOf(s),
        isAmrap: ex?.tier === 'T1' && i + 1 === 3,
        kneePain: pain.length ? Math.max(...pain) : 0,
        rpe: rpe ? parseFloat(rpe[1]) : 0,
        notes,
      });
    });
  });
  return { day, session, rows };
}

/**
 * Logs that belong to the workout's own session. Older records stored every session's logs; the
 * other sessions' exercises are left out when a workout is shown, edited or sent to Sheets.
 */
export function ownWorkoutLogs(rec: { sessionId: string; logs?: Record<string, any> }): Record<string, any> {
  const logs = rec.logs || {};
  const program = ALL_APP_SESSIONS.find((s) => s.id === rec.sessionId);
  if (!program) return logs;
  const ids = new Set([...program.exercises, ...(program.dailyCoreFinisher || [])].map((e) => e.id));
  return Object.fromEntries(
    Object.entries(logs).filter(([k]) => {
      const ex = findExercise(k);
      return !ex || ids.has(ex.id);
    })
  );
}
