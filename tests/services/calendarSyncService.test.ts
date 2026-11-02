// tests/services/calendarSyncService.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  WORKOUTS_CALENDAR_ID,
  buildCalendarEventPayload,
  getGoogleCalendarUrl,
  autoLogWorkoutToGoogleCalendar,
  getLoggedCalendarEventsMap,
  markSessionLoggedToCalendar,
} from '../../src/services/calendarSyncService';
import { CompletedWorkoutSession } from '../../src/storage/storageManager';

describe('Google Calendar Sync Service', () => {
  const mockSession: CompletedWorkoutSession = {
    id: 'completed_lower_a_12345',
    date: '2026-11-01T15:48:49.000Z',
    sessionId: 'lower_a',
    sessionTitle: 'Lower A (Quad & Knee Bulletproofing)',
    startedAt: '2026-11-01T15:00:00.000Z',
    completedAt: '2026-11-01T15:48:49.000Z',
    totalDurationSeconds: 2929,
    totalVolumeLbs: 14500,
    adherencePercentage: 100,
    completedExercisesCount: 8,
    totalExercisesCount: 8,
    logs: {},
  };

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('targets the dedicated Workouts Google Calendar ID', () => {
    expect(WORKOUTS_CALENDAR_ID).toBe(
      'f9b8d2847324743fc078081d1d421e4660bc06f309ee836ea06f17b20afc86eb@group.calendar.google.com'
    );
  });

  it('builds calendar event payload with first completed task as start and finished click as end time', () => {
    const payload = buildCalendarEventPayload(mockSession);

    expect(payload.summary).toContain('Lower A (Quad & Knee Bulletproofing)');
    expect(payload.start.dateTime).toBe('2026-11-01T15:00:00.000Z');
    expect(payload.end.dateTime).toBe('2026-11-01T15:48:49.000Z');
    expect(payload.description).toContain('14,500 lbs');
    expect(payload.description).toContain('Adherence: 100%');
    expect(payload.description).toContain('Exercises: 8/8');
    expect(payload.description).toContain('Bulletproof Athlete PWA');
  });

  it('constructs a Google Calendar web fallback URL with calendar targeting', () => {
    const url = getGoogleCalendarUrl(mockSession);

    expect(url).toContain('https://calendar.google.com/calendar/render?action=TEMPLATE');
    expect(url).toContain(encodeURIComponent('Workout: Lower A (Quad & Knee Bulletproofing)'));
    expect(url).toContain(encodeURIComponent(WORKOUTS_CALENDAR_ID));
  });

  it('automatically logs workout and records event in storage map', async () => {
    const result = await autoLogWorkoutToGoogleCalendar(mockSession);

    expect(result.success).toBe(true);
    expect(result.eventId).toBeDefined();

    const loggedMap = getLoggedCalendarEventsMap();
    expect(loggedMap[mockSession.id!]).toBeDefined();
  });

  it('deduplicates and prevents double-logging if already recorded', async () => {
    markSessionLoggedToCalendar(mockSession.id!, 'existing_gcal_evt_999');

    const result = await autoLogWorkoutToGoogleCalendar(mockSession);

    expect(result.success).toBe(true);
    expect(result.eventId).toBe('existing_gcal_evt_999');
    expect(result.source).toBe('stored_cache');
  });
});
