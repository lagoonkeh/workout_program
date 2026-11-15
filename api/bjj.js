// api/bjj.js
// Scans the main and "Workouts" Google Calendars for "BJJ Trained" events and, for each finished session:
//  - works out active calories from its length and body weight (see _bjj.js),
//  - writes it to Google Health as a Martial Arts exercise session with those calories,
//  - adds it to the "Health Workouts" tab so CNS readiness and the heatmap count it,
//  - records what happened in the "BJJ Sessions" tab (so nothing is written twice).
//
//   POST /api/bjj   Authorization: Bearer <Firebase ID token>   body {"weightLbs":181,"days":30}
//   GET  /api/bjj   Authorization: Bearer <CRON_SECRET>          (Vercel cron, nightly)
//
// Calendar and Sheets use GOOGLE_REFRESH_TOKEN. Google Health needs its own consent
// (googlehealth.activity_and_fitness.writeonly): GOOGLE_HEALTH_REFRESH_TOKEN, made with scripts/google-health-token.mjs.
// Without it, sessions are still logged here and sent to Google Health once it is connected.
import { verifyRequest, getAccessToken, ensureSheets, spreadsheetIdFromEnv, sheetsUrl } from './sync.js';
import { readDays, readWorkouts, writeTab, tokenMatches } from './health.js';
import { WORKOUT_SHEET, WORKOUT_HEADER, mergeWorkouts, workoutToRow } from './_healthWorkouts.js';
import {
  BJJ_EVENT_TITLE, BJJ_SHEET, BJJ_HEADER, MAX_BJJ_KEPT, sessionsFromEvents, activeCalories, healthExerciseBody,
  dataPointName, recordedElsewhere, needsHealthWrite, workoutFromSession, bjjToRow, rowToBjj, latestWeight, WRITING,
} from './_bjj.js';

const HEALTH_URL = 'https://health.googleapis.com/v4/users/me/dataTypes/exercise/dataPoints';

const HEALTH_SCOPE = 'https://www.googleapis.com/auth/googlehealth.activity_and_fitness.writeonly';
const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';

/**
 * Access token from the Google Health sign-in, narrowed to one scope: Google Health refuses tokens
 * that also carry other scopes (calendar), so each API gets its own.
 */
async function healthAccessToken(scope = HEALTH_SCOPE) {
  const refreshToken = process.env.GOOGLE_HEALTH_REFRESH_TOKEN;
  const clientId = process.env.GOOGLE_HEALTH_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_HEALTH_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
  if (!refreshToken || !clientId || !clientSecret) return { token: null, error: 'Google Health not connected' };
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token', scope }),
  });
  if (!r.ok) return { token: null, error: `Google Health sign-in failed (${r.status}) - run scripts/google-health-token.mjs again` };
  return { token: (await r.json()).access_token, error: null };
}

/** Calendars scanned for "BJJ Trained": the main one and the app's "Workouts" calendar. */
export const BJJ_CALENDARS = (process.env.BJJ_CALENDAR_IDS || 'primary,f9b8d2847324743fc078081d1d421e4660bc06f309ee836ea06f17b20afc86eb@group.calendar.google.com')
  .split(',').map((s) => s.trim()).filter(Boolean);

async function listBjjEvents(accessToken, timeMin, timeMax) {
  const byId = new Map();
  for (const calendarId of BJJ_CALENDARS) {
    let pageToken = '';
    for (let page = 0; page < 5; page++) {
      const qs = new URLSearchParams({ q: BJJ_EVENT_TITLE, timeMin, timeMax, singleEvents: 'true', maxResults: '250', orderBy: 'startTime' });
      if (pageToken) qs.set('pageToken', pageToken);
      const r = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${qs}`, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!r.ok) throw new Error(`Google Calendar ${r.status} (${calendarId === 'primary' ? 'main' : 'Workouts'} calendar): ${(await r.text()).slice(0, 200)}`);
      const data = await r.json();
      for (const e of data.items || []) if (e?.id) byId.set(e.id, e);
      pageToken = data.nextPageToken || '';
      if (!pageToken) break;
    }
  }
  return [...byId.values()];
}

async function readBjj(accessToken, spreadsheetId) {
  const r = await fetch(sheetsUrl(spreadsheetId, `/values/${encodeURIComponent(`'${BJJ_SHEET}'!A2:J${MAX_BJJ_KEPT + 50}`)}`), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!r.ok) return [];
  const data = await r.json();
  return (data.values || []).map(rowToBjj).filter((s) => s.eventId);
}

async function authorize(req) {
  const cronSecret = process.env.CRON_SECRET;
  const bearer = (/^Bearer\s+(.+)$/i.exec(req.headers?.authorization || '') || [])[1];
  if (req.method === 'GET') return cronSecret && tokenMatches(bearer, cronSecret) ? null : 'Not authorized.';
  return verifyRequest(req);
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const authError = await authorize(req);
    if (authError) return res.status(401).json({ error: authError });
  } catch (err) {
    return res.status(502).json({ error: `Failed to verify identity: ${err.message}` });
  }

  let body = {};
  try {
    body = req.method === 'POST' ? (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}) : {};
  } catch {
    return res.status(400).json({ error: 'Body must be JSON.' });
  }
  const days = Math.min(400, Math.max(1, Math.round(Number(body.days) || 30)));
  const now = new Date();
  const spreadsheetId = spreadsheetIdFromEnv();

  try {
    const accessToken = await getAccessToken();
    if (!accessToken) return res.status(500).json({ error: 'Missing Google OAuth credentials.' });

    const timeMin = new Date(now.getTime() - days * 86400000).toISOString();
    // The Google Health sign-in also carries calendar.readonly (the main token has no calendar access)
    const [health, calendar] = await Promise.all([healthAccessToken(HEALTH_SCOPE), healthAccessToken(CALENDAR_SCOPE)]);
    const sessions = sessionsFromEvents(await listBjjEvents(calendar.token || accessToken, timeMin, now.toISOString()), now);

    await ensureSheets(accessToken, spreadsheetId, [BJJ_SHEET, WORKOUT_SHEET]);
    const [stored, workouts, healthDays] = await Promise.all([
      readBjj(accessToken, spreadsheetId),
      readWorkouts(accessToken, spreadsheetId),
      readDays(accessToken, spreadsheetId),
    ]);

    const given = Number(body.weightLbs);
    const envWeight = Number(process.env.BJJ_WEIGHT_LBS);
    const weightLbs = given >= 70 && given <= 500 ? given : latestWeight(healthDays) ?? (envWeight >= 70 ? envWeight : null);

    let byId = new Map(stored.map((s) => [s.eventId, s]));
    const stamp = now.toISOString();
    const nowMs = now.getTime();
    let written = 0;
    const sortedRows = (map) => [...map.values()].sort((a, b) => a.start.localeCompare(b.start)).slice(-MAX_BJJ_KEPT);

    // Claim the sessions this run will send to Google Health before sending any, so a second run
    // at the same moment (nightly job + the app, or two devices) does not post the same calories twice
    const willPost = (s, map) =>
      needsHealthWrite(s, map.get(s.eventId), nowMs) && !recordedElsewhere(s, workouts) && !!weightLbs && !!health.token;
    if (sessions.some((s) => willPost(s, byId))) {
      byId = new Map((await readBjj(accessToken, spreadsheetId)).map((s) => [s.eventId, s]));
      const claims = sessions.filter((s) => willPost(s, byId));
      if (claims.length) {
        for (const s of claims) byId.set(s.eventId, { ...byId.get(s.eventId), ...s, status: WRITING, updated: stamp });
        await writeTab(accessToken, spreadsheetId, BJJ_SHEET, 'J', [BJJ_HEADER, ...sortedRows(byId).map(bjjToRow)]);
      }
    }
    const mine = new Set(); // sessions whose row this run decided

    for (const s of sessions) {
      const prev = byId.get(s.eventId);
      const kcal = weightLbs ? activeCalories(s.minutes, weightLbs) : null;
      const claimedHere = prev?.status === WRITING && prev.updated === stamp;
      if (!claimedHere && !needsHealthWrite(s, prev, nowMs)) {
        byId.set(s.eventId, { ...prev, ...s, updated: prev.updated }); // already done; keep its calories and id
        continue;
      }
      let status;
      let healthId = '';
      if (recordedElsewhere(s, workouts)) status = 'recorded by watch';
      else if (!kcal) status = 'no body weight';
      else if (!health.token) status = health.error || 'Google Health not connected';
      else {
        const r = await fetch(HEALTH_URL, {
          method: 'POST',
          headers: { Authorization: `Bearer ${health.token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(healthExerciseBody(s, kcal)),
        });
        if (r.ok) {
          healthId = dataPointName(await r.json()) || 'created';
          status = 'synced';
          written += 1;
        } else {
          status = `Google Health error ${r.status}: ${(await r.text()).slice(0, 120)}`;
        }
      }
      byId.set(s.eventId, { ...s, weightLbs, kcal, healthId, status, updated: stamp });
      mine.add(s.eventId);
    }

    // Rows this run did not decide come from the sheet as it is now, so a run that finished
    // meanwhile keeps its result instead of being overwritten with what was read at the start
    for (const row of await readBjj(accessToken, spreadsheetId)) {
      if (!mine.has(row.eventId) && row.status !== byId.get(row.eventId)?.status) byId.set(row.eventId, row);
    }

    // Health Workouts tab: calendar sessions in the window replace earlier copies (an edited or deleted
    // event updates the readiness data too); ones the watch recorded are left to the watch's copy
    const windowStart = timeMin;
    const fromCalendar = sessions.filter((s) => !recordedElsewhere(s, workouts)).map(workoutFromSession);
    const staleIds = workouts.filter((w) => w.source === 'calendar' && w.start >= windowStart).map((w) => w.uuid);
    const mergedW = mergeWorkouts(workouts, fromCalendar, staleIds.filter((id) => !fromCalendar.some((w) => w.uuid === id)), stamp);

    const rows = sortedRows(byId);
    await writeTab(accessToken, spreadsheetId, BJJ_SHEET, 'J', [BJJ_HEADER, ...rows.map(bjjToRow)]);
    await writeTab(accessToken, spreadsheetId, WORKOUT_SHEET, 'L', [WORKOUT_HEADER, ...mergedW.map(workoutToRow)]);

    const recent = rows.filter((r) => r.start >= windowStart);
    return res.status(200).json({
      success: true,
      weightLbs,
      healthConnected: !!process.env.GOOGLE_HEALTH_REFRESH_TOKEN,
      sessions: recent.map(({ eventId, date, start, end, minutes, kcal, status }) => ({ eventId, date, start, end, minutes, kcal, status })),
      written,
    });
  } catch (err) {
    return res.status(502).json({ error: `BJJ sync failed: ${err.message}` });
  }
}
