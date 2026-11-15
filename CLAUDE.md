# Workout Program ("Gemini workout app")

Single-user 4-day Upper/Lower strength training web app (Lower A, Upper A, Lower B, Upper B, with Cycle A/B variations).
React 19 + TypeScript + Vite 6 + Tailwind 3, Firebase auth, deployed on Vercel (project `workout_program`).
GitHub: lagoonkeh/workout_program. Run `git log --oneline -15` for recent work.

## Working rules
- Deploy to Vercel when a piece of work is done.
- Single user only (email allowlist). No need for women's strength standards.
- Exercise motion demos open in the camera angle that shows the exercise best (front 3/4 by default, rear 3/4 for
  pulls and hinges, top-down for rotation / foot placement). Side / Front / Both stay available as buttons.
- App data must stay backed up to the user's Google Drive (via the Google Sheet below).
- Before finishing: `npx tsc --noEmit` and `npm test` (this is what CI runs).

## Commands
- `npm run dev` | `npm run build` (tsc && vite build) | `npm test` (vitest) | `npm run test:sim` (long simulation tests)

## Where things are
- `src/App.tsx` (~52 KB) - `WorkoutAppMain`: core state (session, logs, variations, deload, progression) and wiring.
  Search it rather than reading it whole.
- `src/workout/` - pieces split out of App.tsx (props in, no own state):
  `SessionOverviewCard`, `WarmupSection`, `ExerciseTierSections`, `WorkoutCompleteCard`, `SessionCompletionToast`,
  `MobilityReminderBanner`, `SyncToastBanner`, `SecondaryViews` (readiness/mobility/stretching/progress/assessment/guide tabs),
  `BottomNavBar`, `AppOverlays` (tempo modal, cue card/weekly/completion/history modals, heatmap). Helpers in `shared.tsx`.
- `src/workout/hooks/` - state logic split out of App.tsx: `useWarmupProgress`, `useSetLogging`, `useTempoAndWatchControls`,
  `useSessionStats`, `useAutoCompleteSession`, `useSessionCompletion` (finish/save/reset flows), `useActiveCueCard`,
  `useMobilityCheckIn`. Called from WorkoutAppMain in the original order; keep hook order unchanged.
- `src/domain/` - program data (`programData.ts`), progression, deloads, readiness, mobility, strength standards,
  plate calculator, cue cards (`cueCardsData.ts`, ~160 KB), exercise variations.
  Motion demos: `motionLibrary.ts`, `motionRig.ts`, `frontalView.ts`, `exerciseVisualsData.ts`.
  Core finishers: `sixPackData.ts` (21 ab drills: exercise, demo caption and cue card each; 5–6 per session, 30 s intervals,
  no mountain climbers) and `sixPackMotions.ts` (their demos). Movements follow the Six Pack Promise app's videos; cues are our own words.
- `src/components/` - widgets and modals. `ExerciseCard.tsx` (~140 KB), `ExerciseDiagram.tsx` (renders motion demos).
- `src/services/` - `firebaseAuth`, `firestoreSyncService`, `sheetSyncService` + `appBackupService` (Google Sheet in Drive),
  `calendarSyncService` (logs workouts to a Google Calendar), `healthService`.
- `src/storage/`, `src/timer/` (rest timer, tempo metronome, watch commands), `src/audio/` (Web Audio synth, no media files).
- `api/` (Vercel functions):
  - `sync.js` - Sheets sync; verifies Firebase ID token + email allowlist.
  - `health.js` + `_healthWorkouts.js` - Health Connect bridge. Tasker / Life Dashboard Companion POST with header
    `X-Health-Token`; stored in the "Health Metrics" and "Health Workouts" sheet tabs; app GETs last 30 days.
  - `bjj.js` + `_bjj.js` - "BJJ Trained" calendar events -> Google Health calories + readiness ("BJJ Sessions" tab).
    POST from the app (Firebase token) and a nightly Vercel cron (GET with `CRON_SECRET`, see `vercel.json`).
- `tests/` - mirrors src areas (components, domain, services, timer, e2e, sim).
- Kettlebell loads match Bowflex SelectTech 840 notches (8, 12, 20, 25, 35, 40 lb).

## Environment variables (names only - never print values)
- Client (`.env`, see `.env.example`): `VITE_FIREBASE_*`, `VITE_ALLOWED_EMAILS`
- Server (Vercel): `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, `GOOGLE_SPREADSHEET_ID`,
  `HEALTH_INGEST_TOKEN`, `ALLOWED_EMAILS`, `FIREBASE_API_KEY`, `CRON_SECRET` (nightly BJJ job),
  `GOOGLE_HEALTH_CLIENT_ID`, `GOOGLE_HEALTH_CLIENT_SECRET`, `GOOGLE_HEALTH_REFRESH_TOKEN` (scripts/google-health-token.mjs:
  Google Health write + calendar.events; used by /api/bjj and /api/sync?action=log-calendar)

## Skip when exploring (noise, large)
`node_modules/`, `dist/`, `coverage/`, `_sim/` (~3,800 simulation screenshots), `_archive/`, `.agents/` (old multi-agent build logs).
`.agents/teamwork/PROJECT.md` is the original spec and is OUTDATED (predates Firebase, Sheets sync and Health Connect).
`scripts/*.py` are one-off maintenance scripts.
