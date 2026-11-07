// api/health.js
// Health Connect bridge. Tasker (with the Tasker Health Connect plugin) reads the phone's Health
// Connect data and POSTs a daily summary here; the app reads it back to pre-fill the readiness check-in.
//
//   POST /api/health   header  X-Health-Token: <HEALTH_INGEST_TOKEN>
//        body  {"date":"2026-11-06","sleepHours":7.4,"restingHr":56,"hrvMs":48,"weightLbs":181.2,"steps":9120}
//        (or {"days":[...]} for several days; sleepMinutes, weightKg and snake_case names are accepted)
//        Life Dashboard Companion's webhook payload (source "health_connect") is also accepted as is:
//        set its webhook URL to /api/health with the header X-Health-Token.
//   GET  /api/health   header  Authorization: Bearer <Firebase ID token>  ->  {days:[...]} (last 30 days)
//
// Stored in the "Health Metrics" tab of the workout spreadsheet, one row per date.
import crypto from 'node:crypto';
import { verifyRequest, getAccessToken, sheetsFetch, sheetsUrl, ensureSheets, spreadsheetIdFromEnv } from './sync.js';

const SHEET = 'Health Metrics';
const HEADER = ['Date', 'Sleep (h)', 'Resting HR (bpm)', 'HRV (ms)', 'Weight (lb)', 'Steps', 'Updated'];
const FIELDS = ['sleepHours', 'restingHr', 'hrvMs', 'weightLbs', 'steps'];
const MAX_DAYS_KEPT = 400;

const num = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const inRange = (v, lo, hi) => (v !== null && v >= lo && v <= hi ? v : null);
const round = (v, dp) => (v === null ? null : Math.round(v * 10 ** dp) / 10 ** dp);

/** "YYYY-MM-DD" for today in the user's time zone (the phone posts in local days). */
export function localToday(now = new Date(), timeZone = 'America/Los_Angeles') {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/** One day's metrics from a loosely-shaped payload; null if it has nothing usable. */
export function normalizeHealthDay(raw, now = new Date()) {
  if (!raw || typeof raw !== 'object') return null;
  const pick = (...keys) => {
    for (const k of keys) if (raw[k] !== undefined && raw[k] !== null && raw[k] !== '') return raw[k];
    return undefined;
  };
  const dateRaw = String(pick('date', 'day') ?? '');
  const date = /^\d{4}-\d{2}-\d{2}/.test(dateRaw) ? dateRaw.slice(0, 10) : localToday(now);

  let sleepHours = num(pick('sleepHours', 'sleep_hours', 'sleep'));
  const sleepMinutes = num(pick('sleepMinutes', 'sleep_minutes'));
  if (sleepHours === null && sleepMinutes !== null) sleepHours = sleepMinutes / 60;
  let weightLbs = num(pick('weightLbs', 'weight_lbs', 'weight'));
  const weightKg = num(pick('weightKg', 'weight_kg'));
  if (weightLbs === null && weightKg !== null) weightLbs = weightKg * 2.20462;

  const day = {
    date,
    sleepHours: round(inRange(sleepHours, 0, 16), 2),
    restingHr: round(inRange(num(pick('restingHr', 'resting_hr', 'resting_heart_rate', 'rhr')), 25, 200), 0),
    hrvMs: round(inRange(num(pick('hrvMs', 'hrv_ms', 'hrv')), 1, 300), 0),
    weightLbs: round(inRange(weightLbs, 50, 700), 1),
    steps: round(inRange(num(pick('steps')), 0, 150000), 0),
  };
  return FIELDS.some((f) => day[f] !== null) ? day : null;
}

const AWAKE_STAGES = new Set(['awake', 'out_of_bed', 'awake_in_bed']);
const LBS_PER_KG = 2.20462;

/**
 * Life Dashboard Companion webhook (source: "health_connect"): raw records grouped by type
 * (sleep, resting_heart_rate, heart_rate_variability, weight) plus daily_totals for steps.
 * Folded into one row per local day; sleep counts asleep stages only, credited to the wake-up day.
 */
export function daysFromLifeDashboard(payload, timeZone = 'America/Los_Angeles') {
  if (!payload || payload.source !== 'health_connect') return null;
  const dayOf = (iso) => {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : localToday(d, timeZone);
  };
  const days = new Map();
  const get = (date) => {
    if (!days.has(date)) days.set(date, { date, sleepSec: 0, rhr: null, rhrAt: '', hrv: [], kg: null, kgAt: '', steps: null });
    return days.get(date);
  };
  for (const s of Array.isArray(payload.sleep) ? payload.sleep : []) {
    const date = dayOf(s?.session_end_time || s?.end_time);
    if (!date) continue;
    const stages = Array.isArray(s.stages) ? s.stages : [];
    const asleep = stages.length
      ? stages.filter((st) => !AWAKE_STAGES.has(st?.stage)).reduce((t, st) => t + (Number(st.duration_seconds) || 0), 0)
      : Number(s.duration_seconds) || 0;
    get(date).sleepSec += asleep;
  }
  for (const r of Array.isArray(payload.resting_heart_rate) ? payload.resting_heart_rate : []) {
    const date = dayOf(r?.time);
    if (!date || !Number.isFinite(Number(r.bpm))) continue;
    const d = get(date);
    if (!d.rhrAt || r.time > d.rhrAt) Object.assign(d, { rhr: Number(r.bpm), rhrAt: r.time });
  }
  for (const r of Array.isArray(payload.heart_rate_variability) ? payload.heart_rate_variability : []) {
    const date = dayOf(r?.time);
    const v = Number(r?.heart_rate_variability_millis);
    if (date && Number.isFinite(v)) get(date).hrv.push(v);
  }
  for (const r of Array.isArray(payload.weight) ? payload.weight : []) {
    const date = dayOf(r?.time);
    if (!date || !Number.isFinite(Number(r.kilograms))) continue;
    const d = get(date);
    if (!d.kgAt || r.time > d.kgAt) Object.assign(d, { kg: Number(r.kilograms), kgAt: r.time });
  }
  for (const t of Array.isArray(payload.daily_totals) ? payload.daily_totals : []) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(t?.date || '') && Number.isFinite(Number(t.steps))) get(t.date).steps = Number(t.steps);
  }
  return [...days.values()]
    .map((d) =>
      normalizeHealthDay({
        date: d.date,
        sleepHours: d.sleepSec > 0 ? d.sleepSec / 3600 : undefined,
        restingHr: d.rhr ?? undefined,
        hrvMs: d.hrv.length ? d.hrv.reduce((a, b) => a + b, 0) / d.hrv.length : undefined,
        weightLbs: d.kg !== null ? d.kg * LBS_PER_KG : undefined,
        steps: d.steps ?? undefined,
      })
    )
    .filter(Boolean);
}

/** Merge new days into existing rows (a new value wins, a missing one keeps what was there). */
export function mergeHealthDays(existing, incoming, updatedAt = new Date().toISOString()) {
  const byDate = new Map(existing.map((d) => [d.date, { ...d }]));
  for (const d of incoming) {
    const prev = byDate.get(d.date) || { date: d.date };
    const next = { ...prev, updated: updatedAt };
    for (const f of FIELDS) if (d[f] !== null && d[f] !== undefined) next[f] = d[f];
    byDate.set(d.date, next);
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-MAX_DAYS_KEPT);
}

const rowToDay = (r) => ({
  date: String(r[0] || ''),
  sleepHours: num(r[1]),
  restingHr: num(r[2]),
  hrvMs: num(r[3]),
  weightLbs: num(r[4]),
  steps: num(r[5]),
  updated: r[6] ? String(r[6]) : undefined,
});
const dayToRow = (d) => [d.date, ...FIELDS.map((f) => (d[f] === null || d[f] === undefined ? '' : d[f])), d.updated || ''];

/** Constant-time token check (hashing first makes both sides the same length). */
export function tokenMatches(given, expected) {
  if (!given || !expected) return false;
  const a = crypto.createHash('sha256').update(String(given)).digest();
  const b = crypto.createHash('sha256').update(String(expected)).digest();
  return crypto.timingSafeEqual(a, b);
}

async function readDays(accessToken, spreadsheetId) {
  const res = await fetch(sheetsUrl(spreadsheetId, `/values/${encodeURIComponent(`'${SHEET}'!A2:G${MAX_DAYS_KEPT + 50}`)}`), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return []; // tab not created yet
  const data = await res.json();
  return (data.values || []).map(rowToDay).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d.date));
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  const spreadsheetId = spreadsheetIdFromEnv();

  if (req.method === 'GET') {
    try {
      const authError = await verifyRequest(req);
      if (authError) return res.status(401).json({ error: authError });
    } catch (err) {
      return res.status(502).json({ error: `Failed to verify identity: ${err.message}` });
    }
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) return res.status(200).json({ days: [], message: 'Missing OAuth credentials.' });
      const days = await readDays(accessToken, spreadsheetId);
      return res.status(200).json({ days: days.slice(-30) });
    } catch (err) {
      return res.status(502).json({ error: `Error reading health metrics: ${err.message}` });
    }
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const expected = process.env.HEALTH_INGEST_TOKEN;
  if (!expected) return res.status(503).json({ error: 'Health ingest is not configured (HEALTH_INGEST_TOKEN).' });
  const header = req.headers?.['x-health-token'] || (/^Bearer\s+(.+)$/i.exec(req.headers?.authorization || '') || [])[1];
  if (!tokenMatches(header, expected)) return res.status(401).json({ error: 'Invalid health token.' });

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  } catch {
    return res.status(400).json({ error: 'Body must be JSON.' });
  }
  const now = new Date();
  const fromApp = daysFromLifeDashboard(body);
  // Life Dashboard sends a sync even when nothing we use changed (e.g. only screen time): accept quietly
  if (fromApp && !fromApp.length) return res.status(200).json({ success: true, saved: [] });
  const list = Array.isArray(body.days) ? body.days.slice(0, 60) : [body];
  const incoming = fromApp || list.map((d) => normalizeHealthDay(d, now)).filter(Boolean);
  if (!incoming.length) {
    return res.status(400).json({ error: 'No usable metrics. Send sleepHours, restingHr, hrvMs, weightLbs or steps.' });
  }

  try {
    const accessToken = await getAccessToken();
    if (!accessToken) return res.status(500).json({ error: 'Missing Google OAuth credentials.' });
    await ensureSheets(accessToken, spreadsheetId, [SHEET]);
    const merged = mergeHealthDays(await readDays(accessToken, spreadsheetId), incoming, now.toISOString());
    await sheetsFetch(accessToken, sheetsUrl(spreadsheetId, '/values:batchClear'), {
      method: 'POST',
      body: JSON.stringify({ ranges: [`'${SHEET}'!A1:G${MAX_DAYS_KEPT + 50}`] }),
    });
    await sheetsFetch(accessToken, sheetsUrl(spreadsheetId, '/values:batchUpdate'), {
      method: 'POST',
      body: JSON.stringify({ valueInputOption: 'RAW', data: [{ range: `'${SHEET}'!A1`, values: [HEADER, ...merged.map(dayToRow)] }] }),
    });
    return res.status(200).json({ success: true, saved: incoming.map((d) => d.date) });
  } catch (err) {
    return res.status(502).json({ error: `Error saving health metrics: ${err.message}` });
  }
}
