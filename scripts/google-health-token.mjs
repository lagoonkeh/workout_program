// scripts/google-health-token.mjs
// One-time: let /api/bjj write BJJ sessions to Google Health.
//
//   node scripts/google-health-token.mjs <path to the OAuth client JSON> [--vercel]
//
// The client JSON is the "Download JSON" file of a Desktop OAuth client in a Google Cloud project with
// the Google Health API enabled and the googlehealth.activity_and_fitness.writeonly scope on its consent
// screen. Sign in in the browser tab that opens. With --vercel the client ID, client secret and refresh
// token go straight into the Vercel project's production env (GOOGLE_HEALTH_CLIENT_ID,
// GOOGLE_HEALTH_CLIENT_SECRET, GOOGLE_HEALTH_REFRESH_TOKEN) without being printed; then redeploy.
// Without --vercel the refresh token is printed for you to add by hand.
import http from 'node:http';
import fs from 'node:fs';
import { exec, spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const toVercel = args.includes('--vercel');
const file = args.find((a) => !a.startsWith('--'));
let clientId = process.env.GOOGLE_HEALTH_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
let clientSecret = process.env.GOOGLE_HEALTH_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
if (file) {
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  const c = j.installed || j.web || j;
  clientId = c.client_id;
  clientSecret = c.client_secret;
}
if (!clientId || !clientSecret) {
  console.error('Pass the OAuth client JSON file, or set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.');
  process.exit(1);
}
const PORT = 5179;
const redirectUri = `http://localhost:${PORT}/callback`;
// Health write for the sessions, plus calendar read so /api/bjj can find the "BJJ Trained" events
const scope = 'https://www.googleapis.com/auth/googlehealth.activity_and_fitness.writeonly https://www.googleapis.com/auth/calendar.readonly';
const authUrl =
  'https://accounts.google.com/o/oauth2/v2/auth?' +
  new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, response_type: 'code', scope, access_type: 'offline', prompt: 'consent' });

function setVercelEnv(name, value) {
  const opts = { input: value, encoding: 'utf8', shell: true };
  spawnSync('vercel', ['env', 'rm', name, 'production', '-y'], { ...opts, input: '' });
  const r = spawnSync('vercel', ['env', 'add', name, 'production'], opts);
  if (r.status !== 0) throw new Error(`vercel env add ${name} failed: ${(r.stderr || '').slice(-300)}`);
  console.log(`Saved ${name} to Vercel (production).`);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, redirectUri);
  if (url.pathname !== '/callback') return res.writeHead(404).end();
  const code = url.searchParams.get('code');
  if (!code) {
    console.error(`Sign-in returned no code: ${url.searchParams.get('error') || 'unknown error'}`);
    res.end('Sign-in failed - see the terminal.');
    return server.close();
  }
  try {
    const r = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
    });
    const data = await r.json();
    if (!data.refresh_token) throw new Error(`No refresh token returned (${data.error || r.status}: ${data.error_description || ''})`);
    if (toVercel) {
      setVercelEnv('GOOGLE_HEALTH_CLIENT_ID', clientId);
      setVercelEnv('GOOGLE_HEALTH_CLIENT_SECRET', clientSecret);
      setVercelEnv('GOOGLE_HEALTH_REFRESH_TOKEN', data.refresh_token);
      console.log('DONE - redeploy to pick up the new values.');
    } else {
      console.log('\nGOOGLE_HEALTH_REFRESH_TOKEN=' + data.refresh_token + '\n');
    }
    res.end('Done - you can close this tab and go back to Claude.');
  } catch (err) {
    console.error(String(err.message || err));
    res.end('Failed - see the terminal.');
  }
  server.close();
});

server.listen(PORT, () => {
  console.log('WAITING_FOR_SIGN_IN ' + authUrl);
  if (!process.env.NO_BROWSER) {
    const opener = process.platform === 'win32' ? `start "" "${authUrl}"` : process.platform === 'darwin' ? `open "${authUrl}"` : `xdg-open "${authUrl}"`;
    exec(opener);
  }
});
