// api/_bjj.js (underscore: helper module, not a Vercel endpoint)
// BJJ sessions logged on Google Calendar as "BJJ Trained" events: turned into training minutes,
// active calories and a Google Health exercise session. Pure functions only (tested in tests/api/bjj.test.ts).

export const BJJ_EVENT_TITLE = 'BJJ Trained';
export const BJJ_SHEET = 'BJJ Sessions';
export const BJJ_HEADER = ['Event ID', 'Date', 'Start', 'End', 'Minutes', 'Weight (lb)', 'Active kcal', 'Google Health ID', 'Status', 'Updated'];
export const MAX_BJJ_KEPT = 600;
/** Status of a session a run is about to send to Google Health; other runs leave it alone for CLAIM_MS. */
export const WRITING = 'writing';
export const CLAIM_MS = 10 * 60 * 1000;

/** Mixed class (drilling + rolling). Compendium of Physical Activities puts martial arts at 5.3-10.3 MET. */
export const BJJ_MET = 7.5;
/** Shorter than this is a mis-tap; longer than this is a broken event (one exists dated year 5326). */
export const MIN_MINUTES = 10;
export const MAX_MINUTES = 360;
const LBS_PER_KG = 2.20462;

const localDay = (d, timeZone) =>
  new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

const num = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export const isBjjTitle = (summary) => String(summary || '').trim().toLowerCase() === BJJ_EVENT_TITLE.toLowerCase();

/**
 * Calendar events -> sessions. Keeps exact "BJJ Trained" titles with a real start and end time
 * (not all-day), a plausible length, and that have already finished.
 */
export function sessionsFromEvents(events, now = new Date(), timeZone = 'America/Los_Angeles') {
  const out = [];
  const nowMs = now.getTime();
  for (const e of Array.isArray(events) ? events : []) {
    if (!e || e.status === 'cancelled' || !isBjjTitle(e.summary)) continue;
    const start = Date.parse(e.start?.dateTime);
    const end = Date.parse(e.end?.dateTime);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end > nowMs) continue;
    const minutes = Math.round((end - start) / 60000);
    if (minutes < MIN_MINUTES || minutes > MAX_MINUTES) continue;
    out.push({
      eventId: String(e.id),
      date: localDay(new Date(start), timeZone),
      start: new Date(start).toISOString(),
      end: new Date(end).toISOString(),
      minutes,
    });
  }
  return out.sort((a, b) => a.start.localeCompare(b.start));
}

/** Active calories (excludes resting burn, as Google Health expects): (MET - 1) x kg x hours. */
export function activeCalories(minutes, weightLbs, met = BJJ_MET) {
  if (!(minutes > 0) || !(weightLbs > 0)) return 0;
  return Math.round((met - 1) * (weightLbs / LBS_PER_KG) * (minutes / 60));
}

/** "+-HH:MM" style offset of a time zone at an instant, as Google's Duration string ("-28800s"). */
export function utcOffsetSeconds(iso, timeZone = 'America/Los_Angeles') {
  const d = new Date(iso);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(d).map((p) => [p.type, p.value])
  );
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return `${Math.round((asUtc - Math.floor(d.getTime() / 1000) * 1000) / 1000)}s`;
}

/** Body for POST https://health.googleapis.com/v4/users/me/dataTypes/exercise/dataPoints */
export function healthExerciseBody(session, kcal, timeZone = 'America/Los_Angeles') {
  return {
    dataSource: { recordingMethod: 'MANUAL' },
    exercise: {
      interval: {
        startTime: session.start,
        startUtcOffset: utcOffsetSeconds(session.start, timeZone),
        endTime: session.end,
        endUtcOffset: utcOffsetSeconds(session.end, timeZone),
      },
      exerciseType: 'MARTIAL_ARTS',
      displayName: 'BJJ',
      activeDuration: `${session.minutes * 60}s`,
      metricsSummary: { caloriesKcal: kcal },
      notes: `From Google Calendar "${BJJ_EVENT_TITLE}" via the workout app (${BJJ_MET} MET mixed class)`,
    },
  };
}

/** Data point name from a create response (an Operation, or the DataPoint itself). */
export function dataPointName(resp) {
  return String(resp?.response?.name || resp?.name || '');
}

/**
 * A session the watch already recorded: an outside workout (not one we added from the calendar)
 * that overlaps at least half of the BJJ session. Writing it again would double the calories.
 */
export function recordedElsewhere(session, workouts) {
  const s = Date.parse(session.start);
  const e = Date.parse(session.end);
  const len = e - s;
  return (workouts || []).some((w) => {
    if (!w || w.source === 'calendar') return false;
    const ws = Date.parse(w.start);
    const we = Date.parse(w.end);
    if (!Number.isFinite(ws) || !Number.isFinite(we)) return false;
    return Math.min(e, we) - Math.max(s, ws) >= len / 2;
  });
}

/** Sessions that still need a Google Health write (new, or an earlier attempt that failed). */
export function needsHealthWrite(session, stored, nowMs = Date.now()) {
  if (!stored) return true;
  if (stored.status === WRITING) {
    // another run claimed it; take over only if that run died without finishing
    const at = Date.parse(stored.updated);
    return !Number.isFinite(at) || nowMs - at > CLAIM_MS;
  }
  return stored.status !== 'synced' && stored.status !== 'recorded by watch';
}

/** Outside-workout row for the "Health Workouts" tab, so readiness and the heatmap count the session. */
export const workoutFromSession = (s) => ({
  uuid: `gcal:${s.eventId}`,
  date: s.date,
  start: s.start,
  end: s.end,
  minutes: s.minutes,
  activity: 'martial_arts',
  title: 'BJJ',
  avgHr: null,
  maxHr: null,
  sets: [],
  source: 'calendar',
});

export const bjjToRow = (r) => [
  r.eventId, r.date, r.start, r.end, r.minutes, r.weightLbs ?? '', r.kcal ?? '', r.healthId || '', r.status || '', r.updated || '',
];

export const rowToBjj = (r) => ({
  eventId: String(r[0] || ''), date: String(r[1] || ''), start: String(r[2] || ''), end: String(r[3] || ''),
  minutes: num(r[4]) ?? 0, weightLbs: num(r[5]), kcal: num(r[6]), healthId: String(r[7] || ''),
  status: String(r[8] || ''), updated: r[9] ? String(r[9]) : '',
});

/** Most recent plausible weight from the "Health Metrics" days, else null. */
export function latestWeight(days) {
  const w = [...(days || [])].filter((d) => num(d?.weightLbs) && d.weightLbs >= 70 && d.weightLbs <= 500).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  return w.length ? w[w.length - 1].weightLbs : null;
}
