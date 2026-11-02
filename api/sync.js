// api/sync.js
// Vercel Serverless Function to synchronize client localStorage data with Google Sheets

const FIREBASE_API_KEY =
  process.env.FIREBASE_API_KEY ||
  process.env.VITE_FIREBASE_API_KEY ||
  'AIzaSyBnt9G-PWwXGE-CBetSenpQ9hHshDmXWBY';

// Mirrors the client allowlist in src/services/firebaseAuth.ts
function getAllowedEmails() {
  const list = ['lagoonkeh@gmail.com'];
  const envEmails = process.env.ALLOWED_EMAILS || process.env.VITE_ALLOWED_EMAILS || '';
  envEmails.split(',').forEach((e) => {
    const trimmed = e.trim().toLowerCase();
    if (trimmed && !list.includes(trimmed)) list.push(trimmed);
  });
  return list;
}

/**
 * Verifies the Firebase ID token from the Authorization header via the Identity Toolkit
 * lookup endpoint (rejects invalid/expired tokens) and checks the email allowlist.
 * Returns null on success, or an error message.
 */
async function verifyRequest(req) {
  const header = req.headers?.authorization || '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) return 'Missing Firebase ID token.';

  const lookupRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: match[1] }),
    }
  );
  if (!lookupRes.ok) return 'Invalid or expired Firebase ID token.';

  const lookupData = await lookupRes.json();
  const user = lookupData.users && lookupData.users[0];
  const email = (user?.email || '').toLowerCase();
  if (!email || !user.emailVerified || !getAllowedEmails().includes(email)) {
    return 'This account is not authorized to sync.';
  }
  return null;
}

// Prevents user-supplied text from being evaluated as a formula under USER_ENTERED
function sanitizeCell(value) {
  const str = String(value ?? '');
  return /^[=+\-@]/.test(str) ? `'${str}` : str;
}

// ---------------------------------------------------------------------------
// App backup: profile, weigh-ins and quarterly assessments (device-only data)
// ---------------------------------------------------------------------------

const BACKUP_SHEET = 'App Backup';
const BODY_SHEET = 'Body Metrics';
const ASSESSMENT_SHEET = 'Quarterly Assessments';
const MAX_BACKUP_CHARS = 45000; // a Sheets cell holds 50,000 characters

async function getAccessToken() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) return null;
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  if (!tokenRes.ok) throw new Error(`Failed to refresh Google OAuth token: ${await tokenRes.text()}`);
  return (await tokenRes.json()).access_token;
}

// ---------------------------------------------------------------------------
// Edited workouts: replace every row of one workout (date + session) with its edited sets
// ---------------------------------------------------------------------------

/** "2026-10-28", "2026-10-28T…" or "10/28/2026" -> "2026-10-28" */
function normSheetDate(value) {
  const s = String(value ?? '').trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (m) return `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
  return s;
}

/** Text read back from the sheet that would turn into a formula when written again */
function protectReadCell(value) {
  const str = String(value ?? '');
  return /^[=+@]/.test(str) || /^-(?!\d)/.test(str) ? `'${str}` : str;
}

function workoutRowValues(log) {
  return [
    sanitizeCell(log.date || new Date().toISOString().split('T')[0]),
    sanitizeCell(log.session || log.sessionTitle || ''),
    sanitizeCell(log.exerciseName || ''),
    sanitizeCell(log.tier || ''),
    String(log.setNumber || 1),
    String(log.targetReps || ''),
    String(log.weight !== undefined ? log.weight : 0),
    String(log.reps !== undefined ? log.reps : 0),
    log.isAmrap ? 'Yes' : 'No',
    String(log.kneePain !== undefined ? log.kneePain : 0),
    String(log.rpe !== undefined ? log.rpe : ''),
    sanitizeCell(log.notes || ''),
  ];
}

async function replaceWorkoutRows(accessToken, spreadsheetId, targets, logs) {
  const keys = new Set(
    targets
      .filter((t) => t && t.date && t.session)
      .map((t) => `${normSheetDate(t.date)}__${String(t.session).trim().toLowerCase()}`)
  );
  if (keys.size === 0) throw new Error('No workout to replace');
  const range = "'Workout Logs'!A5:L";
  const existing = await sheetsFetch(accessToken, sheetsUrl(spreadsheetId, `/values/${encodeURIComponent(range)}`));
  const rows = existing.values || [];
  const keep = rows.filter(
    (r) => !(r && r[0] && keys.has(`${normSheetDate(r[0])}__${String(r[1] || '').trim().toLowerCase()}`))
  );
  const added = logs.map(workoutRowValues);
  const next = [...keep.map((r) => r.map(protectReadCell)), ...added].map((r) => {
    const a = [...r];
    while (a.length < 12) a.push('');
    return a.slice(0, 12);
  });
  await sheetsFetch(accessToken, sheetsUrl(spreadsheetId, '/values:batchClear'), {
    method: 'POST',
    body: JSON.stringify({ ranges: [range] }),
  });
  if (next.length > 0) {
    await sheetsFetch(accessToken, sheetsUrl(spreadsheetId, '/values:batchUpdate'), {
      method: 'POST',
      body: JSON.stringify({ valueInputOption: 'USER_ENTERED', data: [{ range: "'Workout Logs'!A5", values: next }] }),
    });
  }
  return { removed: rows.length - keep.length, added: added.length };
}

function sheetsUrl(spreadsheetId, path) {
  return `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}${path}`;
}

async function sheetsFetch(accessToken, url, init = {}) {
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  if (!res.ok) throw new Error(`Google Sheets ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

async function ensureSheets(accessToken, spreadsheetId, titles) {
  const meta = await sheetsFetch(accessToken, sheetsUrl(spreadsheetId, '?fields=sheets.properties.title'));
  const have = new Set((meta.sheets || []).map((s) => s.properties.title));
  const missing = titles.filter((t) => !have.has(t));
  if (missing.length) {
    await sheetsFetch(accessToken, sheetsUrl(spreadsheetId, ':batchUpdate'), {
      method: 'POST',
      body: JSON.stringify({ requests: missing.map((title) => ({ addSheet: { properties: { title } } })) }),
    });
  }
}

/** Basic shape check; the client re-sanitizes on restore. */
export function validateAppBackup(b) {
  if (!b || typeof b !== 'object') return 'Backup must be an object.';
  if (typeof b.savedAt !== 'string' || Number.isNaN(Date.parse(b.savedAt))) return 'Backup needs a savedAt timestamp.';
  if (!b.profile || typeof b.profile !== 'object') return 'Backup needs a profile.';
  if (!Array.isArray(b.assessments)) return 'Backup needs an assessments list.';
  if (JSON.stringify(b).length > MAX_BACKUP_CHARS) return 'Backup is too large for one cell.';
  return null;
}

export function backupTables(b) {
  const weighIns = Array.isArray(b.profile.weighIns) ? b.profile.weighIns : [];
  const byDate = new Map();
  b.assessments.forEach((a) => {
    if (a && a.date && a.bodyweightLbs) byDate.set(String(a.date).slice(0, 10), [String(a.date).slice(0, 10), a.bodyweightLbs, 'Quarterly test']);
  });
  weighIns.forEach((w) => byDate.set(w.date, [w.date, w.lbs, 'Weigh-in']));
  const body = [['Date', 'Bodyweight (lb)', 'Source'], ...[...byDate.values()].sort((x, y) => String(x[0]).localeCompare(String(y[0])))];

  const cols = [
    ['Quarter', (a) => a.quarterLabel],
    ['Date', (a) => a.date],
    ['Age', (a) => a.age],
    ['Bodyweight (lb)', (a) => a.bodyweightLbs],
    ['Squat 1RM', (a) => a.scores?.squat1rmLbs],
    ['Deadlift 1RM', (a) => a.scores?.deadlift1rmLbs],
    ['Bench 1RM', (a) => a.scores?.bench1rmLbs],
    ['OHP 1RM', (a) => a.scores?.ohp1rmLbs],
    ['Pull-ups', (a) => a.scores?.strictPullupsReps],
    ['Push-ups', (a) => a.scores?.pushupsReps],
    ['2k row (s)', (a) => a.scores?.row2kSeconds],
    ['Cooper (mi)', (a) => a.scores?.cooperRunMiles],
    ['Dead hang (s)', (a) => a.scores?.deadHangSec],
    ['Notes', (a) => a.notes],
  ];
  const assessments = [
    cols.map((c) => c[0]),
    ...[...b.assessments]
      .sort((x, y) => String(x.date).localeCompare(String(y.date)))
      // written RAW, so nothing is evaluated as a formula
      .map((a) => cols.map((c) => c[1](a) ?? '')),
  ];
  return { body, assessments };
}

async function writeAppBackup(accessToken, spreadsheetId, backup) {
  await ensureSheets(accessToken, spreadsheetId, [BACKUP_SHEET, BODY_SHEET, ASSESSMENT_SHEET]);
  const { body, assessments } = backupTables(backup);
  await sheetsFetch(accessToken, sheetsUrl(spreadsheetId, '/values:batchClear'), {
    method: 'POST',
    body: JSON.stringify({ ranges: [`'${BODY_SHEET}'!A1:C2000`, `'${ASSESSMENT_SHEET}'!A1:N500`] }),
  });
  await sheetsFetch(accessToken, sheetsUrl(spreadsheetId, '/values:batchUpdate'), {
    method: 'POST',
    body: JSON.stringify({
      valueInputOption: 'RAW',
      data: [
        {
          range: `'${BACKUP_SHEET}'!A1:B4`,
          values: [
            ['Last saved', backup.savedAt],
            ['Format', `workout-app-backup v${backup.version || 1}`],
            ['Data (used by the app to restore — do not edit)', JSON.stringify(backup)],
            ['Readable copies', `See the '${BODY_SHEET}' and '${ASSESSMENT_SHEET}' tabs`],
          ],
        },
        { range: `'${BODY_SHEET}'!A1`, values: body },
        { range: `'${ASSESSMENT_SHEET}'!A1`, values: assessments },
      ],
    }),
  });
}

async function readAppBackup(accessToken, spreadsheetId) {
  const res = await fetch(
    sheetsUrl(spreadsheetId, `/values/${encodeURIComponent(`'${BACKUP_SHEET}'!B3`)}`),
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) return null; // tab not created yet
  const data = await res.json();
  const raw = data.values && data.values[0] && data.values[0][0];
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return validateAppBackup(parsed) ? null : parsed;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    const authError = await verifyRequest(req);
    if (authError) {
      return res.status(401).json({ error: authError });
    }
  } catch (err) {
    return res.status(502).json({ error: `Failed to verify identity: ${err.message}` });
  }

  if (req.method === 'GET') {
    const action =
      req.query?.action ||
      (req.url ? new URL(req.url, 'http://localhost').searchParams.get('action') : null);

    if (action === 'backup') {
      try {
        const spreadsheetId =
          process.env.GOOGLE_SPREADSHEET_ID || '18IDVdkxJnCLdC2hDYJQOcKc2OFrZCWK3bkc-N-p-3NA';
        const accessToken = await getAccessToken();
        if (!accessToken) return res.status(200).json({ status: 'ok', backup: null, message: 'Missing OAuth credentials.' });
        const backup = await readAppBackup(accessToken, spreadsheetId);
        return res.status(200).json({ status: 'ok', backup });
      } catch (err) {
        return res.status(502).json({ error: `Error reading backup: ${err.message}` });
      }
    }

    if (action === 'clear-history' || action === 'reset-history') {
      try {
        const spreadsheetId =
          process.env.GOOGLE_SPREADSHEET_ID || '18IDVdkxJnCLdC2hDYJQOcKc2OFrZCWK3bkc-N-p-3NA';
        const accessToken = await getAccessToken();
        if (accessToken) {
          await sheetsFetch(accessToken, sheetsUrl(spreadsheetId, '/values:batchClear'), {
            method: 'POST',
            body: JSON.stringify({ ranges: ["'Workout Logs'!A5:L2000"] }),
          });
        }
        return res.status(200).json({
          status: 'ok',
          message: 'Workout history cleared from Google Sheets.',
        });
      } catch (err) {
        return res.status(500).json({ error: `Error clearing workout history: ${err.message}` });
      }
    }

    if (action === 'last-workout' || action === 'scan' || action === 'history') {
      try {
        const spreadsheetId =
          process.env.GOOGLE_SPREADSHEET_ID || '18IDVdkxJnCLdC2hDYJQOcKc2OFrZCWK3bkc-N-p-3NA';
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

        if (!clientId || !clientSecret || !refreshToken) {
          return res.status(200).json({
            status: 'ok',
            lastWorkout: null,
            allWorkouts: [],
            suggestedNextSession: { id: 'lower_a', title: 'Lower A (Quad & Knee Bulletproofing)' },
            message: 'Missing OAuth credentials.',
          });
        }

        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
          }),
        });

        if (!tokenRes.ok) {
          const errBody = await tokenRes.text();
          return res.status(502).json({
            error: `Failed to refresh Google OAuth token: ${errBody}`,
          });
        }

        const tokenData = await tokenRes.json();
        const accessToken = tokenData.access_token;

        const existingLogsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
          'Workout Logs'
        )}!A5:L500`;

        const existingRes = await fetch(existingLogsUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        let existingRows = [];
        if (existingRes.ok) {
          const existingData = await existingRes.json();
          existingRows = existingData.values || [];
        }

        if (existingRows.length === 0) {
          return res.status(200).json({
            status: 'ok',
            lastWorkout: null,
            allWorkouts: [],
            suggestedNextSession: { id: 'lower_a', title: 'Lower A (Quad & Knee Bulletproofing)' },
            message: 'No workout logs recorded yet in Google Sheet.',
          });
        }

        // Group rows by Date + Session
        const sessionsByDate = new Map();
        for (const r of existingRows) {
          if (!r || r.length < 3 || !r[0]) continue;
          const date = r[0].trim();
          const sessionTitle = (r[1] || '').trim();
          const exercise = (r[2] || '').trim();
          const tier = (r[3] || '').trim();
          const setNumber = (r[4] || '1').trim();
          const targetReps = (r[5] || '').trim();
          const weight = parseFloat(r[6]) || 0;
          const reps = parseInt(r[7], 10) || 0;
          const kneePain = parseInt(r[9], 10) || 0;
          const notes = (r[11] || '').trim();

          const key = `${date}___${sessionTitle}`;
          if (!sessionsByDate.has(key)) {
            sessionsByDate.set(key, {
              date,
              sessionTitle,
              exercises: new Set(),
              completedSets: 0,
              totalVolumeLbs: 0,
              maxKneePain: 0,
              notes: [],
              logs: {},
            });
          }
          const entry = sessionsByDate.get(key);
          if (exercise) entry.exercises.add(exercise);
          entry.completedSets += 1;
          entry.totalVolumeLbs += weight * reps;
          if (kneePain > entry.maxKneePain) entry.maxKneePain = kneePain;
          if (notes && !entry.notes.includes(notes)) entry.notes.push(notes);

          const exKey = exercise.toLowerCase().replace(/[^a-z0-9]+/g, '_');
          if (!entry.logs[exKey]) {
            entry.logs[exKey] = [];
          }
          entry.logs[exKey].push({
            setNumber: parseInt(setNumber, 10) || (entry.logs[exKey].length + 1),
            targetReps: targetReps || `${reps}`,
            weightLbs: weight,
            repsAchieved: reps,
            isCompleted: true,
            notes: notes ? (kneePain > 0 ? `${notes} (Knee Pain: ${kneePain}/10)` : notes) : (kneePain > 0 ? `Knee Pain: ${kneePain}/10` : ''),
          });
        }

        const sortedSessions = Array.from(sessionsByDate.values()).sort((a, b) =>
          b.date.localeCompare(a.date)
        );

        const latest = sortedSessions[0] || null;

        const resolveSessionId = (title) => {
          const t = (title || '').toLowerCase();
          if (t.includes('lower a')) return 'lower_a';
          if (t.includes('upper a')) return 'upper_a';
          if (t.includes('lower b')) return 'lower_b';
          if (t.includes('upper b')) return 'upper_b';
          if (t.includes('daily abs') || t.includes('abs')) return 'daily_abs';
          if (t.includes('run')) return 'run_conditioning';
          if (t.includes('bjj')) return 'post_bjj_recovery';
          return 'lower_a';
        };

        const allWorkouts = sortedSessions.map((s, idx) => {
          const sessId = resolveSessionId(s.sessionTitle);
          const dateStr = s.date.includes('T') ? s.date : `${s.date}T12:00:00.000Z`;
          return {
            id: `sheet_${s.date}_${sessId}_${idx}`,
            date: dateStr,
            sessionId: sessId,
            sessionTitle: s.sessionTitle,
            exercises: Array.from(s.exercises),
            completedSets: s.completedSets,
            totalVolumeLbs: Math.round(s.totalVolumeLbs),
            maxKneePain: s.maxKneePain,
            notes: s.notes.join('; '),
            completedExercisesCount: s.exercises.size,
            totalExercisesCount: s.exercises.size,
            adherencePercentage: 100,
            logs: s.logs,
          };
        });

        let suggestedNextSession = { id: 'lower_a', title: 'Lower A (Quad & Knee Bulletproofing)' };
        if (latest) {
          const titleLower = latest.sessionTitle.toLowerCase();
          if (titleLower.includes('lower a')) {
            suggestedNextSession = { id: 'upper_a', title: 'Upper A (Horizontal Push/Pull & Shoulder Health)' };
          } else if (titleLower.includes('upper a')) {
            suggestedNextSession = { id: 'lower_b', title: 'Lower B (Posterior Chain & Hamstring Restoration)' };
          } else if (titleLower.includes('lower b')) {
            suggestedNextSession = { id: 'upper_b', title: 'Upper B (Vertical Push/Pull & Functional Calisthenics)' };
          } else if (titleLower.includes('upper b')) {
            suggestedNextSession = { id: 'lower_a', title: 'Lower A (Quad & Knee Bulletproofing)' };
          }
        }

        return res.status(200).json({
          status: 'ok',
          lastWorkout: latest
            ? {
                date: latest.date,
                sessionTitle: latest.sessionTitle,
                exercises: Array.from(latest.exercises),
                completedSets: latest.completedSets,
                totalVolumeLbs: latest.totalVolumeLbs,
                maxKneePain: latest.maxKneePain,
                notes: latest.notes.join('; '),
              }
            : null,
          suggestedNextSession,
          historyCount: sortedSessions.length,
          allWorkouts,
        });
      } catch (err) {
        return res.status(500).json({ error: `Error scanning last workout: ${err.message}` });
      }
    }

    return res.status(200).json({
      status: 'ok',
      service: 'workout-sheets-sync',
      spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID || '18IDVdkxJnCLdC2hDYJQOcKc2OFrZCWK3bkc-N-p-3NA',
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const spreadsheetId =
      process.env.GOOGLE_SPREADSHEET_ID || '18IDVdkxJnCLdC2hDYJQOcKc2OFrZCWK3bkc-N-p-3NA';
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !refreshToken) {
      return res.status(500).json({
        error: 'Missing Google OAuth credentials in environment configuration.',
      });
    }

    // 1. Refresh Google OAuth Access Token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      return res.status(502).json({
        error: `Failed to refresh Google OAuth token: ${errBody}`,
      });
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // Parse payload
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const workoutLogs = Array.isArray(body.workoutLogs) ? body.workoutLogs : [];
    const mobilityEntries = Array.isArray(body.mobilityEntries) ? body.mobilityEntries : [];

    const actionParam =
      req.query?.action ||
      (req.url ? new URL(req.url, 'http://localhost').searchParams.get('action') : null) ||
      body.action;

    if (actionParam === 'clear-history' || actionParam === 'reset-history') {
      await sheetsFetch(accessToken, sheetsUrl(spreadsheetId, '/values:batchClear'), {
        method: 'POST',
        body: JSON.stringify({ ranges: ["'Workout Logs'!A5:L2000"] }),
      });
      return res.status(200).json({
        status: 'ok',
        message: 'Workout history cleared from Google Sheets.',
      });
    }

    // 1d. Replace one edited workout's rows (date and/or sets changed)
    if (actionParam === 'replace-workout') {
      try {
        const result = await replaceWorkoutRows(accessToken, spreadsheetId, body.replace || [], workoutLogs);
        return res.status(200).json({ success: true, ...result });
      } catch (err) {
        return res.status(500).json({ success: false, error: `Error updating workout: ${err.message}` });
      }
    }

    // 1c. Log Workout to Google Calendar
    if (actionParam === 'log-calendar') {
      try {
        const calendarId =
          body.calendarId ||
          'f9b8d2847324743fc078081d1d421e4660bc06f309ee836ea06f17b20afc86eb@group.calendar.google.com';
        const eventPayload = body.event;
        if (!eventPayload) {
          return res.status(400).json({ error: 'Missing calendar event payload.' });
        }

        const calRes = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(eventPayload),
          }
        );

        if (calRes.ok) {
          const created = await calRes.json();
          return res.status(200).json({
            success: true,
            eventId: created.id,
            eventLink: created.htmlLink,
            message: "Successfully logged workout to 'Workouts' calendar.",
          });
        }

        const errData = await calRes.text();
        return res.status(200).json({
          success: false,
          status: calRes.status,
          error: errData,
          message: `Calendar API returned status ${calRes.status}`,
        });
      } catch (calErr) {
        return res.status(200).json({
          success: false,
          error: calErr.message,
          message: 'Failed to dispatch to Google Calendar API.',
        });
      }
    }

    let syncedWorkouts = 0;
    let syncedMobility = 0;
    let backedUpProfile = false;

    // 1b. Back up profile, weigh-ins and quarterly assessments (new tabs are created on first use)
    if (body.appBackup) {
      const problem = validateAppBackup(body.appBackup);
      if (problem) return res.status(400).json({ error: `Backup rejected: ${problem}` });
      await writeAppBackup(accessToken, spreadsheetId, body.appBackup);
      backedUpProfile = true;
    }

    // 2. Synchronize Workout Logs (Deduplicated by Date + Exercise + Set #)
    if (workoutLogs.length > 0) {
      // Fetch existing rows in Workout Logs to find update coordinates
      const existingLogsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
        'Workout Logs'
      )}!A5:E500`;

      const existingRes = await fetch(existingLogsUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      let existingRows = [];
      if (existingRes.ok) {
        const existingData = await existingRes.json();
        existingRows = existingData.values || [];
      }

      // Map existing: `${date}__${exercise}__${setNumber}` -> rowNumber (5-indexed)
      const existingKeyToRow = new Map();
      existingRows.forEach((r, idx) => {
        if (r && r.length >= 5) {
          const key = `${r[0]}__${r[2]}__${r[4]}`.trim().toLowerCase();
          existingKeyToRow.set(key, idx + 5);
        }
      });

      const rowsToAppend = [];
      const updates = [];

      for (const log of workoutLogs) {
        const dateStr = log.date || new Date().toISOString().split('T')[0];
        const exerciseName = log.exerciseName || '';
        const setNum = String(log.setNumber || 1);
        const rowVals = [
          sanitizeCell(dateStr),
          sanitizeCell(log.session || log.sessionTitle || ''),
          sanitizeCell(exerciseName),
          sanitizeCell(log.tier || ''),
          setNum,
          String(log.targetReps || ''),
          String(log.weight !== undefined ? log.weight : 0),
          String(log.reps !== undefined ? log.reps : 0),
          log.isAmrap ? 'Yes' : 'No',
          String(log.kneePain !== undefined ? log.kneePain : 0),
          String(log.rpe !== undefined ? log.rpe : ''),
          sanitizeCell(log.notes || ''),
        ];

        const lookupKey = `${dateStr}__${exerciseName}__${setNum}`.trim().toLowerCase();
        if (existingKeyToRow.has(lookupKey)) {
          // Update in-place
          const rowNumber = existingKeyToRow.get(lookupKey);
          updates.push({
            range: `'Workout Logs'!A${rowNumber}:L${rowNumber}`,
            values: [rowVals],
          });
        } else {
          rowsToAppend.push(rowVals);
        }
      }

      // Perform batch updates for matching rows
      if (updates.length > 0) {
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              valueInputOption: 'USER_ENTERED',
              data: updates,
            }),
          }
        );
        syncedWorkouts += updates.length;
      }

      // Perform append for new rows
      if (rowsToAppend.length > 0) {
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
            'Workout Logs'
          )}!A5:L:append?valueInputOption=USER_ENTERED`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              values: rowsToAppend,
            }),
          }
        );
        syncedWorkouts += rowsToAppend.length;
      }
    }

    // 3. Synchronize Mobility Tracker (Benchmark Rows 5 to 9 & History Log Rows 15+)
    if (mobilityEntries.length > 0) {
      // Protocol metadata mapping
      const protocolInfo = {
        'knee-to-wall': {
          row: 5,
          name: 'Knee-to-Wall Ankle Test',
          target: '5.0 in (Optimal)',
          formatScore: (v) => `${v} in`,
          formatStatus: (v) => (v >= 5 ? 'Target Met (5.0 in)' : `${v} in / 5.0 in`),
        },
        'elephant-walk': {
          row: 6,
          name: 'ATG Elephant Walk Reach',
          target: 'Level 5 (Palms Flat)',
          formatScore: (v) => `Level ${v}`,
          formatStatus: (v) => (v >= 5 ? 'Target Met (Full)' : `Level ${v} / 5`),
        },
        'split-squat-elevation': {
          row: 7,
          name: 'ATG Split Squat Elevation',
          target: '0.0 in (Flat Ground)',
          formatScore: (v) => `${v} in`,
          formatStatus: (v) => (v === 0 ? 'Target Met (Flat)' : `${v} in elevation`),
        },
        'biering-sorensen': {
          row: 8,
          name: 'Biering-Sorensen Back Hold',
          target: '180s (3 mins)',
          formatScore: (v) => `${v}s`,
          formatStatus: (v) => (v >= 180 ? 'Target Met (180s)' : `${v}s / 180s`),
        },
        'dead-hang': {
          row: 9,
          name: 'Active Dead Hang Hold',
          target: '120s (2 mins)',
          formatScore: (v) => `${v}s`,
          formatStatus: (v) => (v >= 120 ? 'Target Met (120s)' : `${v}s / 120s`),
        },
      };

      // Group entries by testId
      const byTest = new Map();
      for (const entry of mobilityEntries) {
        const id = entry.testId;
        if (!byTest.has(id)) byTest.set(id, []);
        byTest.get(id).push(entry);
      }

      const benchmarkUpdates = [];

      // A. Update Top Benchmark Table (Rows 5 to 9: Col H to M)
      for (const [testId, entries] of byTest.entries()) {
        const info = protocolInfo[testId];
        if (!info) continue;
        const rowNumber = info.row;

        // Sort descending by date
        entries.sort(
          (a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
        );
        const latest = entries[0];
        const dateStr = sanitizeCell(String(latest.date || new Date().toISOString()).split('T')[0]);

        const leftEntry = entries.find((e) => e.side === 'left');
        const rightEntry = entries.find((e) => e.side === 'right');

        let leftVal = leftEntry ? sanitizeCell(`${leftEntry.value} in`) : '';
        let rightVal = rightEntry ? sanitizeCell(`${rightEntry.value} in`) : '';
        const latestFormatted = sanitizeCell(info.formatScore(latest.value));
        const statusText = sanitizeCell(info.formatStatus(latest.value));
        const noteText = sanitizeCell(latest.notes || 'Logged via Web PWA One-Tap Sync');

        // Read current row to preserve Col H/I if not updated in this entry
        const readRowUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
          'Mobility Tracker'
        )}!H${rowNumber}:I${rowNumber}`;
        const rowRes = await fetch(readRowUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (rowRes.ok) {
          const rowData = await rowRes.json();
          const currentVals = (rowData.values && rowData.values[0]) || ['', ''];
          if (!leftVal && currentVals[0]) leftVal = currentVals[0];
          if (!rightVal && currentVals[1]) rightVal = currentVals[1];
        }

        benchmarkUpdates.push({
          range: `'Mobility Tracker'!H${rowNumber}:M${rowNumber}`,
          values: [[leftVal, rightVal, latestFormatted, dateStr, statusText, noteText]],
        });
        syncedMobility++;
      }

      // B. Update / Append to Chronological Mobility History Log (Rows 15+)
      const historyReadUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
        'Mobility Tracker'
      )}!A15:C500`;
      const historyRes = await fetch(historyReadUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      let existingHistoryRows = [];
      if (historyRes.ok) {
        const histData = await historyRes.json();
        existingHistoryRows = histData.values || [];
      }

      // Map `${date}__${protocolName}__${side}` -> row index (15-indexed)
      const existingHistoryMap = new Map();
      existingHistoryRows.forEach((r, idx) => {
        if (r && r.length >= 2) {
          const key = `${r[0]}__${r[1]}__${r[2] || 'Bilateral'}`.trim().toLowerCase();
          existingHistoryMap.set(key, idx + 15);
        }
      });

      const historyRowsToAppend = [];

      for (const entry of mobilityEntries) {
        const info = protocolInfo[entry.testId];
        if (!info) continue;

        const dateStr = sanitizeCell(String(entry.date || new Date().toISOString()).split('T')[0]);
        const sideStr =
          entry.side === 'left' ? 'Left' : entry.side === 'right' ? 'Right' : 'Bilateral';
        const formattedScore = sanitizeCell(info.formatScore(entry.value));
        const statusText = sanitizeCell(info.formatStatus(entry.value));
        const noteText = sanitizeCell(entry.notes || 'Logged via Web PWA One-Tap Sync');

        const historyRowVals = [
          dateStr,
          info.name,
          sideStr,
          formattedScore,
          info.target,
          statusText,
          noteText,
        ];

        const lookupKey = `${dateStr}__${info.name}__${sideStr}`.trim().toLowerCase();
        if (existingHistoryMap.has(lookupKey)) {
          const existingRowIdx = existingHistoryMap.get(lookupKey);
          benchmarkUpdates.push({
            range: `'Mobility Tracker'!A${existingRowIdx}:G${existingRowIdx}`,
            values: [historyRowVals],
          });
        } else {
          historyRowsToAppend.push(historyRowVals);
        }
      }

      // Execute all updates in batch
      if (benchmarkUpdates.length > 0) {
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              valueInputOption: 'USER_ENTERED',
              data: benchmarkUpdates,
            }),
          }
        );
      }

      // Append new history rows if any
      if (historyRowsToAppend.length > 0) {
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
            'Mobility Tracker'
          )}!A15:G:append?valueInputOption=USER_ENTERED`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              values: historyRowsToAppend,
            }),
          }
        );
      }
    }

    return res.status(200).json({
      success: true,
      syncedWorkouts,
      syncedMobility,
      backedUpProfile,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error during Google Sheets synchronization:', err);
    return res.status(500).json({
      error: err.message || 'Internal server error during synchronization.',
    });
  }
}
