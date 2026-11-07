# Workout Program ("Gemini workout app")

Single-user 4-day Upper/Lower strength training web app (Lower A, Upper A, Lower B, Upper B, with Cycle A/B variations).
React 19 + TypeScript + Vite 6 + Tailwind 3, Firebase auth, deployed on Vercel (project `workout_program`).
GitHub: lagoonkeh/workout_program. Run `git log --oneline -15` for recent work.

## Working rules
- Deploy to Vercel when a piece of work is done.
- Single user only (email allowlist). No need for women's strength standards.
- Exercise motion demos default to showing BOTH views (side + front/back) on all screen sizes.
- App data must stay backed up to the user's Google Drive (via the Google Sheet below).
- Before finishing: `npx tsc --noEmit` and `npm test` (this is what CI runs).

## Commands
- `npm run dev` | `npm run build` (tsc && vite build) | `npm test` (vitest) | `npm run test:sim` (long simulation tests)

## Where things are
- `src/App.tsx` (~178 KB) - main app shell and state. Very large: search it, don't read it whole.
- `src/domain/` - program data (`programData.ts`), progression, deloads, readiness, mobility, strength standards,
  plate calculator, cue cards (`cueCardsData.ts`, ~160 KB), exercise variations.
  Motion demos: `motionLibrary.ts`, `motionRig.ts`, `frontalView.ts`, `exerciseVisualsData.ts`.
- `src/components/` - widgets and modals. `ExerciseCard.tsx` (~140 KB), `ExerciseDiagram.tsx` (renders motion demos).
- `src/services/` - `firebaseAuth`, `firestoreSyncService`, `sheetSyncService` + `appBackupService` (Google Sheet in Drive),
  `calendarSyncService` (logs workouts to a Google Calendar), `healthService`.
- `src/storage/`, `src/timer/` (rest timer, tempo metronome, watch commands), `src/audio/` (Web Audio synth, no media files).
- `api/` (Vercel functions):
  - `sync.js` - Sheets sync; verifies Firebase ID token + email allowlist.
  - `health.js` + `_healthWorkouts.js` - Health Connect bridge. Tasker / Life Dashboard Companion POST with header
    `X-Health-Token`; stored in the "Health Metrics" and "Health Workouts" sheet tabs; app GETs last 30 days.
- `tests/` - mirrors src areas (components, domain, services, timer, e2e, sim).
- Kettlebell loads match Bowflex SelectTech 840 notches (8, 12, 20, 25, 35, 40 lb).

## Environment variables (names only - never print values)
- Client (`.env`, see `.env.example`): `VITE_FIREBASE_*`, `VITE_ALLOWED_EMAILS`
- Server (Vercel): `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, `GOOGLE_SPREADSHEET_ID`,
  `HEALTH_INGEST_TOKEN`, `ALLOWED_EMAILS`, `FIREBASE_API_KEY`

## Skip when exploring (noise, large)
`node_modules/`, `dist/`, `coverage/`, `_sim/` (~3,800 simulation screenshots), `_archive/`, `.agents/` (old multi-agent build logs).
`.agents/teamwork/PROJECT.md` is the original spec and is OUTDATED (predates Firebase, Sheets sync and Health Connect).
`scripts/*.py` are one-off maintenance scripts.
