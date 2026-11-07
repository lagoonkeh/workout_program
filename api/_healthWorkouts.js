// api/_healthWorkouts.js (underscore: helper module, not a Vercel endpoint)
// Exercise sessions from Life Dashboard Companion's Health Connect webhook (the "exercise" array),
// stored one row per session in the "Health Workouts" tab so the app can count training done outside it.
const localToday = (d, timeZone) =>
  new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

export const WORKOUT_SHEET = 'Health Workouts';
export const WORKOUT_HEADER = ['UUID', 'Date', 'Start', 'End', 'Minutes', 'Activity', 'Title', 'Avg HR', 'Max HR', 'Sets', 'Source', 'Updated'];
export const MAX_WORKOUTS_KEPT = 600;
const REST_SEGMENTS = new Set(['39', '44']); // pause, rest

const num = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * Sessions in a webhook payload, with average / max heart rate from the heart_rate samples that fall
 * inside each session (when the same payload carries them) and the working sets (rests dropped).
 */
export function workoutsFromLifeDashboard(payload, timeZone = 'America/Los_Angeles') {
  if (!payload || payload.source !== 'health_connect' || !Array.isArray(payload.exercise)) return [];
  const tz = typeof payload.timezone === 'string' && payload.timezone ? payload.timezone : timeZone;
  const hr = (Array.isArray(payload.heart_rate) ? payload.heart_rate : [])
    .map((s) => [Date.parse(s?.time), num(s?.bpm)])
    .filter(([t, b]) => Number.isFinite(t) && b !== null && b > 25 && b < 230);
  const out = [];
  for (const s of payload.exercise) {
    const start = Date.parse(s?.start_time);
    const end = Date.parse(s?.end_time);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
    const uuid = String(s.uuid || `${s.type}@${s.start_time}`);
    const inside = hr.filter(([t]) => t >= start && t <= end).map(([, b]) => b);
    const sets = (Array.isArray(s.segments) ? s.segments : [])
      .filter((g) => g && !REST_SEGMENTS.has(String(g.type)))
      .map((g) => ({ type: String(g.type), reps: num(g.repetitions) ?? undefined }))
      .slice(0, 200);
    const seconds = num(s.duration_seconds) ?? (end - start) / 1000;
    out.push({
      uuid,
      date: localToday(new Date(start), tz),
      start: new Date(start).toISOString(),
      end: new Date(end).toISOString(),
      minutes: Math.round(seconds / 60),
      activity: String(s.name || s.type || 'other_workout'),
      title: typeof s.title === 'string' ? s.title.slice(0, 120) : '',
      avgHr: inside.length >= 3 ? Math.round(inside.reduce((a, b) => a + b, 0) / inside.length) : null,
      maxHr: inside.length >= 3 ? Math.max(...inside) : null,
      sets,
      source: typeof s.source === 'string' ? s.source : '',
    });
  }
  return out;
}

/** uuids of exercise sessions deleted in Health Connect. */
export function deletedWorkoutIds(payload) {
  if (!payload || !Array.isArray(payload.deleted_records)) return [];
  return payload.deleted_records.filter((d) => d && d.type === 'exercise' && d.uuid).map((d) => String(d.uuid));
}

/** Upsert by uuid; a later copy keeps heart rate it had when the new one carries none. */
export function mergeWorkouts(existing, incoming, deleted = [], updatedAt = new Date().toISOString()) {
  const gone = new Set(deleted);
  const byId = new Map(existing.filter((w) => !gone.has(w.uuid)).map((w) => [w.uuid, w]));
  for (const w of incoming) {
    if (gone.has(w.uuid)) continue;
    const prev = byId.get(w.uuid);
    byId.set(w.uuid, {
      ...w,
      avgHr: w.avgHr ?? prev?.avgHr ?? null,
      maxHr: w.maxHr ?? prev?.maxHr ?? null,
      sets: w.sets?.length ? w.sets : prev?.sets || [],
      updated: updatedAt,
    });
  }
  return [...byId.values()].sort((a, b) => a.start.localeCompare(b.start)).slice(-MAX_WORKOUTS_KEPT);
}

export const workoutToRow = (w) => [
  w.uuid, w.date, w.start, w.end, w.minutes, w.activity, w.title || '',
  w.avgHr ?? '', w.maxHr ?? '', w.sets?.length ? JSON.stringify(w.sets.map((s) => (s.reps ? [s.type, s.reps] : [s.type]))) : '',
  w.source || '', w.updated || '',
];

export function rowToWorkout(r) {
  let sets = [];
  try {
    sets = r[9] ? JSON.parse(r[9]).map(([type, reps]) => ({ type: String(type), ...(reps ? { reps: Number(reps) } : {}) })) : [];
  } catch {
    sets = [];
  }
  return {
    uuid: String(r[0] || ''), date: String(r[1] || ''), start: String(r[2] || ''), end: String(r[3] || ''),
    minutes: num(r[4]) ?? 0, activity: String(r[5] || 'other_workout'), title: String(r[6] || ''),
    avgHr: num(r[7]), maxHr: num(r[8]), sets, source: String(r[10] || ''), updated: r[11] ? String(r[11]) : undefined,
  };
}
