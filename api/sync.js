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

    if (action === 'last-workout' || action === 'scan') {
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
            });
          }
          const entry = sessionsByDate.get(key);
          if (exercise) entry.exercises.add(exercise);
          entry.completedSets += 1;
          entry.totalVolumeLbs += weight * reps;
          if (kneePain > entry.maxKneePain) entry.maxKneePain = kneePain;
          if (notes && !entry.notes.includes(notes)) entry.notes.push(notes);
        }

        const sortedSessions = Array.from(sessionsByDate.values()).sort((a, b) =>
          b.date.localeCompare(a.date)
        );

        const latest = sortedSessions[0] || null;

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

    let syncedWorkouts = 0;
    let syncedMobility = 0;

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
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error during Google Sheets synchronization:', err);
    return res.status(500).json({
      error: err.message || 'Internal server error during synchronization.',
    });
  }
}
