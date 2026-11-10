// scripts/google-health-token.mjs
// One-time: get a refresh token that lets /api/bjj write BJJ sessions to Google Health.
//
//   1. Google Cloud console (same project as GOOGLE_CLIENT_ID): enable "Google Health API",
//      and on the OAuth consent screen add the scope .../auth/googlehealth.activity_and_fitness
//      (and your Gmail as a test user if the app is still in Testing).
//   2. The OAuth client must allow http://localhost:5179/callback as a redirect URI
//      (a "Desktop app" client allows any localhost port; a "Web" client needs it added).
//   3. PowerShell:
//        $env:GOOGLE_CLIENT_ID="..."; $env:GOOGLE_CLIENT_SECRET="..."; node scripts/google-health-token.mjs
//   4. Sign in in the browser tab that opens. Put the printed token in Vercel as GOOGLE_HEALTH_REFRESH_TOKEN
//      (and GOOGLE_HEALTH_CLIENT_ID / GOOGLE_HEALTH_CLIENT_SECRET if you used a different client), then redeploy.
import http from 'node:http';
import { exec } from 'node:child_process';

const clientId = process.env.GOOGLE_HEALTH_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_HEALTH_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
if (!clientId || !clientSecret) {
  console.error('Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET first.');
  process.exit(1);
}
const PORT = 5179;
const redirectUri = `http://localhost:${PORT}/callback`;
const scope = 'https://www.googleapis.com/auth/googlehealth.activity_and_fitness';
const authUrl =
  'https://accounts.google.com/o/oauth2/v2/auth?' +
  new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, response_type: 'code', scope, access_type: 'offline', prompt: 'consent' });

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, redirectUri);
  if (url.pathname !== '/callback') return res.writeHead(404).end();
  const code = url.searchParams.get('code');
  if (!code) {
    res.end(`No code: ${url.searchParams.get('error') || 'unknown error'}`);
    return server.close();
  }
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
  });
  const data = await r.json();
  if (!data.refresh_token) {
    console.error('No refresh token returned:', JSON.stringify(data));
    res.end('Failed - see the terminal.');
  } else {
    console.log('\nGOOGLE_HEALTH_REFRESH_TOKEN=' + data.refresh_token + '\n');
    res.end('Done - copy the token from the terminal. You can close this tab.');
  }
  server.close();
});

server.listen(PORT, () => {
  console.log('Opening Google sign-in...\nIf nothing opens, visit:\n' + authUrl);
  const opener = process.platform === 'win32' ? `start "" "${authUrl}"` : process.platform === 'darwin' ? `open "${authUrl}"` : `xdg-open "${authUrl}"`;
  exec(opener);
});
