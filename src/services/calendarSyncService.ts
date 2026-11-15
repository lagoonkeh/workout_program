// src/services/calendarSyncService.ts
import { CompletedWorkoutSession, storageManager } from '../storage/storageManager';
import { isTestEnvironment, getIdToken } from './firebaseAuth';
import { STORAGE_KEY_CALENDAR_LOGGED_EVENTS } from '../storage/appStorageKeys';

export const WORKOUTS_CALENDAR_ID =
  'f9b8d2847324743fc078081d1d421e4660bc06f309ee836ea06f17b20afc86eb@group.calendar.google.com';

export interface CalendarEventPayload {
  summary: string;
  description: string;
  start: { dateTime: string; timeZone?: string };
  end: { dateTime: string; timeZone?: string };
  transparency?: 'opaque';
}

export interface CalendarSyncResult {
  success: boolean;
  eventId?: string;
  eventLink?: string;
  source: 'direct_api' | 'sync_endpoint' | 'stored_cache' | 'fallback_url';
  message?: string;
  fallbackUrl?: string;
}

export const getLoggedCalendarEventsMap = (): Record<string, string> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CALENDAR_LOGGED_EVENTS);
    const map: Record<string, string> = raw ? JSON.parse(raw) : {};
    // Older versions stored "pending_<time>" when logging failed; those never reached the calendar
    for (const id of Object.keys(map)) if (String(map[id]).startsWith('pending_')) delete map[id];
    return map;
  } catch {
    return {};
  }
};

export const markSessionLoggedToCalendar = (sessionRecordId: string, eventId: string): void => {
  try {
    const current = getLoggedCalendarEventsMap();
    current[sessionRecordId] = eventId;
    localStorage.setItem(STORAGE_KEY_CALENDAR_LOGGED_EVENTS, JSON.stringify(current));
  } catch {
    // non-blocking
  }
};

export const buildCalendarEventPayload = (
  session: CompletedWorkoutSession,
  timeZone: string = 'America/Los_Angeles'
): CalendarEventPayload => {
  const title = session.sessionTitle || (session.sessionId ? session.sessionId.toUpperCase() : 'SESSION');
  const summary = `Workout: ${title}`;

  // Start time: first completed task timestamp or session date
  const startDate = session.startedAt ? new Date(session.startedAt) : new Date(session.date);
  // End time: completion click timestamp or start + duration (default 1 hr)
  const endDate = session.completedAt
    ? new Date(session.completedAt)
    : new Date(
        startDate.getTime() +
          (session.totalDurationSeconds ? session.totalDurationSeconds * 1000 : 3600 * 1000)
      );

  const durationMin = session.totalDurationSeconds
    ? Math.round(session.totalDurationSeconds / 60)
    : Math.round((endDate.getTime() - startDate.getTime()) / 60000);

  const lines = [
    `Workout Session: ${title}`,
    session.totalVolumeLbs ? `Total Volume: ${session.totalVolumeLbs.toLocaleString()} lbs` : '',
    session.adherencePercentage !== undefined ? `Adherence: ${session.adherencePercentage}%` : '',
    session.completedExercisesCount !== undefined && session.totalExercisesCount !== undefined
      ? `Exercises: ${session.completedExercisesCount}/${session.totalExercisesCount}`
      : '',
    durationMin > 0 ? `Duration: ${durationMin} min` : '',
    session.startedAt && session.completedAt
      ? `Recorded Time: ${new Date(session.startedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} – ${new Date(session.completedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
      : '',
    session.notes ? `Notes: ${session.notes}` : '',
    'Logged automatically via Bulletproof Athlete PWA',
  ].filter(Boolean);

  return {
    summary,
    description: lines.join('\n'),
    start: {
      dateTime: startDate.toISOString(),
      timeZone,
    },
    end: {
      dateTime: endDate.toISOString(),
      timeZone,
    },
    transparency: 'opaque',
  };
};

export const getGoogleCalendarUrl = (session: CompletedWorkoutSession): string => {
  const payload = buildCalendarEventPayload(session);
  const startDate = new Date(payload.start.dateTime);
  const endDate = new Date(payload.end.dateTime);

  const formatGCalDate = (d: Date) =>
    d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  const datesParam = `${formatGCalDate(startDate)}/${formatGCalDate(endDate)}`;

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    payload.summary
  )}&dates=${datesParam}&details=${encodeURIComponent(payload.description)}&add=${encodeURIComponent(
    WORKOUTS_CALENDAR_ID
  )}`;
};

/**
 * Automatically logs completed workout to the user's "Workouts" Google Calendar.
 * Uses direct Google Calendar API (if client access token exists), or the /api/sync endpoint.
 * Fallbacks to calendar template URL if unauthenticated.
 */
export const autoLogWorkoutToGoogleCalendar = async (
  session: CompletedWorkoutSession
): Promise<CalendarSyncResult> => {
  const recordId = session.id || session.date;
  const alreadyLoggedMap = getLoggedCalendarEventsMap();

  // If already logged to calendar, avoid duplicating
  if (alreadyLoggedMap[recordId]) {
    return {
      success: true,
      eventId: alreadyLoggedMap[recordId],
      source: 'stored_cache',
      message: 'Already logged to Workouts calendar.',
    };
  }

  const payload = buildCalendarEventPayload(session);
  const fallbackUrl = getGoogleCalendarUrl(session);

  if (isTestEnvironment()) {
    markSessionLoggedToCalendar(recordId, `test_event_${Date.now()}`);
    return {
      success: true,
      eventId: `test_event_${recordId}`,
      source: 'direct_api',
      message: 'Test environment: simulated calendar event creation.',
    };
  }

  // 1. Try direct Google Calendar API if client has calendar token
  try {
    const clientToken = localStorage.getItem('workout_app_gcal_access_token');
    if (clientToken) {
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
          WORKOUTS_CALENDAR_ID
        )}/events`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${clientToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );
      if (res.ok) {
        const data = await res.json();
        const eventId = data.id;
        const eventLink = data.htmlLink;
        markSessionLoggedToCalendar(recordId, eventId);
        storageManager.updateCompletedWorkout(recordId, {
          calendarEventId: eventId,
          calendarLoggedAt: new Date().toISOString(),
        });
        return {
          success: true,
          eventId,
          eventLink,
          source: 'direct_api',
          message: "Logged directly to 'Workouts' Google Calendar.",
        };
      }
    }
  } catch (err) {
    console.warn('Direct Google Calendar API dispatch failed:', err);
  }

  // 2. Try serverless sync endpoint /api/sync?action=log-calendar
  try {
    const idToken = await getIdToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (idToken) {
      headers.Authorization = `Bearer ${idToken}`;
    }

    const res = await fetch('/api/sync?action=log-calendar', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        calendarId: WORKOUTS_CALENDAR_ID,
        event: payload,
        sessionRecordId: recordId,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.eventId) {
        markSessionLoggedToCalendar(recordId, data.eventId);
        storageManager.updateCompletedWorkout(recordId, {
          calendarEventId: data.eventId,
          calendarLoggedAt: new Date().toISOString(),
        });
        return {
          success: true,
          eventId: data.eventId,
          eventLink: data.eventLink,
          source: 'sync_endpoint',
          message: "Logged to 'Workouts' Google Calendar via cloud sync.",
        };
      }
    }
  } catch (err) {
    console.warn('Sync endpoint calendar dispatch failed:', err);
  }

  // 3. Fallback: return fallbackUrl so UI can offer 1-tap add if background permissions required.
  // Nothing is recorded as logged, so the next attempt tries again and history shows "Add to Cal".
  return {
    success: false,
    source: 'fallback_url',
    fallbackUrl,
    message: "Workout ready to add to 'Workouts' calendar.",
  };
};
