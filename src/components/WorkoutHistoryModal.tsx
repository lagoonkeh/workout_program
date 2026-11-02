// src/components/WorkoutHistoryModal.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  History,
  Trash2,
  Edit3,
  Check,
  CheckCircle2,
  Plus,
  FastForward,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Calendar,
  CalendarPlus,
  Clock,
  Dumbbell,
  Save,
  CloudDownload,
} from 'lucide-react';
import { storageManager, CompletedWorkoutSession } from '../storage/storageManager';
import {
  fetchWorkoutHistoryFromSheets,
  clearRemoteWorkoutHistory,
  STORAGE_KEY_LAST_SCANNED_WORKOUT,
} from '../services/sheetSyncService';
import { getGoogleCalendarUrl, getLoggedCalendarEventsMap } from '../services/calendarSyncService';
import type { WorkoutSession } from '../domain/programData';
import type { SetLogRecord } from './ExerciseCard';
import { ALL_APP_SESSIONS } from '../domain/programData';
import { applyWorkoutEdit, exerciseDisplayName, getWhen, setsOf } from '../domain/historyEdit';
import { replaceWorkoutInSheets } from '../services/sheetSyncService';

export interface WorkoutHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSessionUpdated?: () => void;
  activeSession?: WorkoutSession;
  workoutLogs?: Record<string, SetLogRecord[]>;
  onSaveCurrentSessionToHistory?: () => void;
  onResetAllAndStartFresh?: () => void;
}

export const WorkoutHistoryModal: React.FC<WorkoutHistoryModalProps> = ({
  isOpen,
  onClose,
  onSessionUpdated,
  activeSession,
  workoutLogs: _workoutLogs,
  onSaveCurrentSessionToHistory,
  onResetAllAndStartFresh,
}) => {
  const [sessionsMap, setSessionsMap] = useState<Record<string, CompletedWorkoutSession>>({});
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingLogs, setEditingLogs] = useState<Record<string, any>>({});
  const [editingWhen, setEditingWhen] = useState<{ date: string; time: string; durationMin: number } | null>(null);
  const [originalWhen, setOriginalWhen] = useState<{ date: string; time: string; durationMin: number } | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<CompletedWorkoutSession | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const [isSyncingSheets, setIsSyncingSheets] = useState<boolean>(false);
  const [syncStatusMessage, setSyncStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const hasAutoSyncedRef = useRef<boolean>(false);

  // Load completed sessions from storage
  const reloadSessions = () => {
    const records = storageManager.getCompletedWorkouts();
    setSessionsMap({ ...records });
  };

  const handleSyncFromSheets = async (silent: boolean = false) => {
    setIsSyncingSheets(true);
    if (!silent) {
      setSyncStatusMessage({ type: 'info', text: 'Pulling workout history from Google Sheets...' });
    }
    try {
      const res = await fetchWorkoutHistoryFromSheets();
      if (res.success) {
        reloadSessions();
        onSessionUpdated?.();
        if (!silent || res.importedCount > 0) {
          setSyncStatusMessage({
            type: 'success',
            text: res.message,
          });
        }
      } else {
        if (!silent) {
          setSyncStatusMessage({
            type: 'error',
            text: res.message,
          });
        }
      }
    } catch (err: any) {
      if (!silent) {
        setSyncStatusMessage({
          type: 'error',
          text: `Sync error: ${err.message || 'Unknown network error'}`,
        });
      }
    } finally {
      setIsSyncingSheets(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      reloadSessions();
      setEditingSessionId(null);
      setSessionToDelete(null);
      setShowClearConfirm(false);

      // Attempt automatic initial pull from Google Sheets if local history is empty
      const current = storageManager.getCompletedWorkouts();
      if (Object.keys(current).length === 0 && !hasAutoSyncedRef.current) {
        hasAutoSyncedRef.current = true;
        handleSyncFromSheets(true);
      }
    }
  }, [isOpen]);

  // Live storage synchronization
  useEffect(() => {
    if (!isOpen) return;
    const unsubscribe = storageManager.subscribe((data) => {
      if (data.completedWorkouts) {
        setSessionsMap({ ...data.completedWorkouts });
      }
    });
    return () => unsubscribe();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (sessionToDelete) {
          setSessionToDelete(null);
        } else if (editingSessionId) {
          setEditingSessionId(null);
        } else if (showClearConfirm) {
          setShowClearConfirm(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, sessionToDelete, editingSessionId, showClearConfirm, onClose]);

  const sortedSessions = useMemo(() => {
    const list = Object.values(sessionsMap);
    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (selectedFilter === 'all') return list;
    return list.filter((s) => s.sessionId === selectedFilter);
  }, [sessionsMap, selectedFilter]);

  if (!isOpen) return null;

  // Handle deleting a completed workout session
  const handleDeleteSession = (sessionId: string) => {
    storageManager.deleteCompletedWorkout(sessionId);
    reloadSessions();
    setSessionToDelete(null);
    onSessionUpdated?.();
  };

  // Handle clearing all history and starting completely fresh
  const handleClearAllHistory = async (alsoStartFresh: boolean = true) => {
    setIsSyncingSheets(true);
    storageManager.clearCompletedWorkouts();
    try {
      localStorage.removeItem(STORAGE_KEY_LAST_SCANNED_WORKOUT);
    } catch {
      // safe fallback
    }

    if (alsoStartFresh && onResetAllAndStartFresh) {
      onResetAllAndStartFresh();
    }

    try {
      await clearRemoteWorkoutHistory();
    } catch {
      // non-blocking
    }

    reloadSessions();
    setShowClearConfirm(false);
    setIsSyncingSheets(false);
    onSessionUpdated?.();
    setSyncStatusMessage({
      type: 'info',
      text: 'All previous workout history deleted. Fresh start initialized.',
    });
  };

  // Start editing a workout session's logs
  const handleStartEditing = (session: CompletedWorkoutSession) => {
    setEditingSessionId(session.id || session.date);
    setEditingLogs(JSON.parse(JSON.stringify(session.logs || {})));
    const when = getWhen(session);
    setEditingWhen(when);
    setOriginalWhen(when);
    setExpandedSessionId(session.id || session.date);
  };

  const updateEditingSets = (exKey: string, fn: (sets: any[]) => any[]) => {
    setEditingLogs((prev) => ({ ...prev, [exKey]: fn([...setsOf(prev[exKey])]) }));
  };

  // Save edited logs for a session
  const handleSaveEditedSession = (session: CompletedWorkoutSession) => {
    const recordId = session.id || session.date;
    const previous = storageManager.getCompletedWorkouts()[recordId] || session;
    const whenChanged =
      !!editingWhen && JSON.stringify(editingWhen) !== JSON.stringify(originalWhen);
    const updated = applyWorkoutEdit(previous, editingLogs, whenChanged ? editingWhen! : undefined);
    storageManager.updateCompletedWorkout(recordId, updated);
    reloadSessions();
    setEditingSessionId(null);
    onSessionUpdated?.();

    // Keep the Google Sheets copy in step, so a later pull from Sheets doesn't undo the edit
    if (import.meta.env.MODE !== 'test') {
      setSyncStatusMessage({ type: 'info', text: 'Saved. Updating Google Sheets...' });
      replaceWorkoutInSheets(updated, previous).then((r) =>
        setSyncStatusMessage(
          r.success
            ? { type: 'success', text: 'Workout saved and updated in Google Sheets.' }
            : { type: 'error', text: `Workout saved on this device, but Google Sheets wasn't updated: ${r.message}` }
        )
      );
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds || seconds <= 0) return null;
    const mins = Math.round(seconds / 60);
    if (mins < 60) {
      return `${mins}m`;
    }
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return remainingMins > 0 ? `${hrs}h ${remainingMins}m` : `${hrs}h`;
  };

  const formatTimeRange = (startIso?: string, endIso?: string) => {
    if (!startIso || !endIso) return null;
    try {
      const s = new Date(startIso);
      const e = new Date(endIso);
      const timeOptions: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };
      return `${s.toLocaleTimeString('en-US', timeOptions)} – ${e.toLocaleTimeString('en-US', timeOptions)}`;
    } catch {
      return null;
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="workout-history-title"
      data-testid="workout-history-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in"
    >
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <History className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <h2
                id="workout-history-title"
                className="text-base sm:text-xl font-bold text-white truncate"
              >
                Workout History & Log Editor
              </h2>
              <p className="text-xs text-slate-400 truncate mt-0.5">
                Review past sessions, edit logged sets and weights, or edit out workouts from history
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="header-pull-sheets-history-btn"
              onClick={() => handleSyncFromSheets(false)}
              disabled={isSyncingSheets}
              className="min-h-[44px] px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Pull and restore past workout sessions from Google Sheets"
            >
              <CloudDownload className={`w-3.5 h-3.5 ${isSyncingSheets ? 'animate-bounce' : ''}`} />
              <span className="hidden sm:inline">{isSyncingSheets ? 'Syncing...' : 'Pull Sheets History'}</span>
            </button>

            {onSaveCurrentSessionToHistory && (
              <button
                type="button"
                data-testid="header-save-active-history-btn"
                onClick={() => {
                  onSaveCurrentSessionToHistory();
                  reloadSessions();
                }}
                className="min-h-[44px] px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Save your current in-progress workout session to history"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Log Current Session</span>
              </button>
            )}

            <button
              type="button"
              data-testid="clear-all-history-btn"
              onClick={() => setShowClearConfirm(true)}
              className="min-h-[44px] px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 border border-slate-700/80 hover:border-rose-500/40 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Delete all previous workout history and start fresh"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {sortedSessions.length > 0 ? 'Clear History' : 'Start Fresh'}
              </span>
            </button>

            <button
              type="button"
              data-testid="close-history-modal-btn"
              onClick={onClose}
              aria-label="Close Workout History modal"
              className="min-h-[44px] min-w-[44px] p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700/80 transition-colors flex items-center justify-center cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sync Status Banner */}
        {syncStatusMessage && (
          <div
            data-testid="sync-status-banner"
            className={`px-4 py-2 text-xs flex items-center justify-between border-b ${
              syncStatusMessage.type === 'success'
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
                : syncStatusMessage.type === 'error'
                ? 'bg-rose-950/40 text-rose-300 border-rose-500/30'
                : 'bg-cyan-950/40 text-cyan-300 border-cyan-500/30'
            }`}
          >
            <div className="flex items-center gap-2">
              <CloudDownload className="w-3.5 h-3.5 shrink-0" />
              <span>{syncStatusMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setSyncStatusMessage(null)}
              className="text-slate-400 hover:text-white ml-2 text-xs font-bold px-1.5 py-0.5 rounded"
            >
              ×
            </button>
          </div>
        )}

        {/* Filter Pills */}
        <div className="px-4 py-2.5 border-b border-slate-800/80 bg-slate-900/90 flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: 'all', label: 'All Sessions' },
            { id: 'lower_a', label: 'Lower A' },
            { id: 'upper_a', label: 'Upper A' },
            { id: 'lower_b', label: 'Lower B' },
            { id: 'upper_b', label: 'Upper B' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              data-testid={`filter-history-${tab.id}`}
              onClick={() => setSelectedFilter(tab.id)}
              className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedFilter === tab.id
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
          <span className="ml-auto text-xs font-mono text-slate-400 shrink-0 pl-2">
            {sortedSessions.length} {sortedSessions.length === 1 ? 'session' : 'sessions'}
          </span>
        </div>

        {/* Sessions List */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {sortedSessions.length === 0 ? (
            <div
              data-testid="empty-history-state"
              className="p-8 sm:p-12 text-center rounded-2xl bg-slate-950/40 border border-slate-800/80 flex flex-col items-center justify-center space-y-4"
            >
              <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400">
                <Dumbbell className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white">No Completed Workouts Yet</h3>
                <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto mt-1">
                  Finish your active session from the Routine tab to see completed workout logs, tonnage, and adherence records here.
                </p>
              </div>

              {/* Informative Card: Pull Uploaded History */}
              <div className="w-full max-w-md p-4 rounded-xl bg-cyan-950/30 border border-cyan-800/40 text-left space-y-2.5">
                <div className="flex items-center gap-2 text-cyan-300 font-semibold text-xs sm:text-sm">
                  <CloudDownload className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Looking for your previous uploaded history?</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  If you previously uploaded workouts or synced logs to Google Sheets, tap below to pull and restore all your sessions into this device.
                </p>
                <button
                  type="button"
                  data-testid="pull-uploaded-history-btn"
                  onClick={() => handleSyncFromSheets(false)}
                  disabled={isSyncingSheets}
                  className="w-full py-2.5 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow"
                >
                  <CloudDownload className={`w-3.5 h-3.5 ${isSyncingSheets ? 'animate-bounce' : ''}`} />
                  <span>{isSyncingSheets ? 'Pulling History from Google Sheets...' : 'Pull Uploaded History from Google Sheets'}</span>
                </button>
              </div>

              {activeSession && onSaveCurrentSessionToHistory && (
                <button
                  type="button"
                  data-testid="save-active-to-history-btn"
                  onClick={() => {
                    onSaveCurrentSessionToHistory();
                    reloadSessions();
                  }}
                  className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg cursor-pointer transition-all active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                  <span>Log Current {activeSession.title} to History</span>
                </button>
              )}
            </div>
          ) : (
            sortedSessions.map((session) => {
              const recordId = session.id || session.date;
              const isExpanded = expandedSessionId === recordId;
              const isEditing = editingSessionId === recordId;
              const skippedCount = session.skippedExercises?.length || 0;
              const adherence = session.adherencePercentage ?? (skippedCount === 0 ? 100 : 80);

              // Gather exercise entries from logs
              const exerciseIds = Object.keys(isEditing ? editingLogs : session.logs || {});

              return (
                <div
                  key={recordId}
                  data-testid={`history-session-card-${session.sessionId}`}
                  className="rounded-xl sm:rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-slate-700/90 transition-all overflow-hidden shadow-lg"
                >
                  {/* Session Card Header */}
                  <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 font-mono font-bold text-xs shrink-0">
                        {session.sessionId.split('_')[0].charAt(0).toUpperCase()}
                        {session.sessionId.split('_')[1]?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm sm:text-base font-bold text-white truncate">
                            {session.sessionTitle || session.sessionId.replace('_', ' ').toUpperCase()}
                          </h4>
                          <span
                            className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full border ${
                              adherence === 100
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            }`}
                          >
                            {adherence}% Adherence
                          </span>
                          {skippedCount > 0 && (
                            <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                              {skippedCount} Skipped
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-500" />
                            <span>{formatDate(session.date)}</span>
                          </span>
                          {(session.startedAt && session.completedAt) ? (
                            <>
                              <span>·</span>
                              <span className="flex items-center gap-1 font-mono text-cyan-300">
                                <Clock className="w-3 h-3 text-cyan-400 shrink-0" />
                                <span>{formatTimeRange(session.startedAt, session.completedAt)}</span>
                                {session.totalDurationSeconds !== undefined && session.totalDurationSeconds > 0 && (
                                  <span className="text-slate-400 font-sans text-[11px]">
                                    ({formatDuration(session.totalDurationSeconds)})
                                  </span>
                                )}
                              </span>
                            </>
                          ) : session.totalDurationSeconds ? (
                            <>
                              <span>·</span>
                              <span className="flex items-center gap-1 font-mono text-cyan-300">
                                <Clock className="w-3 h-3 text-cyan-400 shrink-0" />
                                <span>{formatDuration(session.totalDurationSeconds)}</span>
                              </span>
                            </>
                          ) : null}
                          {session.totalVolumeLbs !== undefined && session.totalVolumeLbs > 0 && (
                            <>
                              <span>·</span>
                              <span className="font-mono text-emerald-400 font-semibold">
                                {session.totalVolumeLbs.toLocaleString()} lbs
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Controls for Workout */}
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      {!isEditing ? (
                        <button
                          type="button"
                          data-testid={`edit-logs-btn-${session.sessionId}`}
                          onClick={() => handleStartEditing(session)}
                          className="min-h-[44px] px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Edit this workout: date, time, sets, weights, reps and notes"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Edit</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          data-testid={`save-logs-btn-${session.sessionId}`}
                          onClick={() => handleSaveEditedSession(session)}
                          className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                        >
                          <Save className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Save Changes</span>
                        </button>
                      )}

                      <a
                        href={getGoogleCalendarUrl(session)}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-testid={`add-to-calendar-${session.sessionId}`}
                        className="min-h-[44px] px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        title={
                          session.calendarEventId || getLoggedCalendarEventsMap()[session.id || session.date]
                            ? 'View or edit this event on Google Calendar'
                            : 'Add this workout to Google Calendar'
                        }
                        aria-label={`Open ${session.sessionTitle || session.sessionId} workout on Google Calendar`}
                      >
                        <CalendarPlus className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="hidden sm:inline">
                          {session.calendarEventId || getLoggedCalendarEventsMap()[session.id || session.date]
                            ? 'Cal Event ✓'
                            : 'Add to Cal'}
                        </span>
                      </a>

                      <button
                        type="button"
                        data-testid={`delete-workout-btn-${session.sessionId}`}
                        onClick={() => setSessionToDelete(session)}
                        className="min-h-[44px] min-w-[44px] p-2 rounded-xl bg-slate-800/80 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/40 transition-colors flex items-center justify-center cursor-pointer"
                        title="Edit out / delete this workout from history"
                        aria-label={`Edit out ${session.sessionTitle || session.sessionId} workout`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        data-testid={`toggle-expand-session-${session.sessionId}`}
                        onClick={() => setExpandedSessionId(isExpanded ? null : recordId)}
                        className="min-h-[44px] min-w-[44px] p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors flex items-center justify-center cursor-pointer"
                        aria-label={isExpanded ? 'Collapse session details' : 'Expand session details'}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Skipped Exercises Summary Banner */}
                  {skippedCount > 0 && (
                    <div className="px-4 py-2 bg-amber-950/20 border-t border-b border-amber-500/20 text-xs space-y-1">
                      <span className="font-bold text-amber-300 flex items-center gap-1.5">
                        <FastForward className="w-3.5 h-3.5 text-amber-400" />
                        <span>Skipped Exercises in this session:</span>
                      </span>
                      <div className="flex flex-wrap gap-2 pt-0.5">
                        {session.skippedExercises?.map((sk, idx) => (
                          <span
                            key={idx}
                            data-testid={`history-skipped-tag-${sk.exerciseId}`}
                            className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-200 text-[11px] font-medium"
                          >
                            <strong>{sk.exerciseName}</strong>
                            {sk.reason ? ` — "${sk.reason}"` : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Expanded Logs Details */}
                  {isExpanded && (
                    <div className="p-4 border-t border-slate-800/80 space-y-4 bg-slate-950/40">
                      {isEditing && (
                        <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/40 text-cyan-200 text-xs flex items-center justify-between gap-2">
                          <span>
                            <strong>Editing Mode Active:</strong> Change the date, sets, weights, reps or notes, then tap Save Changes.
                          </span>
                          <button
                            type="button"
                            onClick={() => setEditingSessionId(null)}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      )}

                      {isEditing && editingWhen && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs" data-testid="edit-workout-when">
                          <label className="col-span-2 sm:col-span-1 flex flex-col gap-1 text-slate-400">
                            <span>Date</span>
                            <input
                              type="date"
                              aria-label="Workout date"
                              value={editingWhen.date}
                              onChange={(e) => setEditingWhen({ ...editingWhen, date: e.target.value })}
                              className="min-h-[40px] w-full bg-slate-900 border border-slate-700 rounded-lg px-2 text-slate-200"
                            />
                          </label>
                          <label className="flex flex-col gap-1 text-slate-400">
                            <span>Start time</span>
                            <input
                              type="time"
                              aria-label="Start time"
                              value={editingWhen.time}
                              onChange={(e) => setEditingWhen({ ...editingWhen, time: e.target.value })}
                              className="min-h-[40px] w-full bg-slate-900 border border-slate-700 rounded-lg px-2 text-slate-200"
                            />
                          </label>
                          <label className="flex flex-col gap-1 text-slate-400">
                            <span>Minutes</span>
                            <input
                              type="number"
                              inputMode="numeric"
                              min={0}
                              aria-label="Duration in minutes"
                              value={editingWhen.durationMin}
                              onChange={(e) =>
                                setEditingWhen({ ...editingWhen, durationMin: Math.max(0, Number(e.target.value) || 0) })
                              }
                              className="min-h-[40px] w-full bg-slate-900 border border-slate-700 rounded-lg px-2 text-slate-200 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            />
                          </label>
                        </div>
                      )}

                      {exerciseIds.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No exercise log entries recorded.</p>
                      ) : (
                        <div className="space-y-3">
                          {exerciseIds.map((exKey) => {
                            const rawLog = (isEditing ? editingLogs : session.logs)[exKey];
                            const sets: any[] = Array.isArray(rawLog) ? rawLog : [rawLog];

                            return (
                              <div
                                key={exKey}
                                className="p-3 rounded-xl bg-slate-900 border border-slate-800/80 space-y-2"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-slate-200 uppercase font-mono">
                                    {exerciseDisplayName(exKey)}
                                  </span>
                                  <span className="text-[11px] font-mono text-slate-400">
                                    {sets.filter((s) => s?.isCompleted || s?.completed).length}/{sets.length} sets completed
                                  </span>
                                </div>

                                {/* Sets table */}
                                <div className="space-y-1.5">
                                  {sets.map((setObj, setIdx) => {
                                    const isDone = !!(setObj?.isCompleted || setObj?.completed);
                                    const weight = setObj?.weightLbs ?? setObj?.weight ?? 0;
                                    const reps = setObj?.repsAchieved ?? setObj?.reps ?? 0;
                                    const notes = setObj?.notes ?? '';
                                    const isNotDoneNote = notes.includes('[NOT DONE]');

                                    if (isEditing) {
                                      const patchSet = (patch: Record<string, unknown>) =>
                                        updateEditingSets(exKey, (list) => {
                                          list[setIdx] = { ...list[setIdx], ...patch };
                                          return list;
                                        });
                                      return (
                                        <div
                                          key={setIdx}
                                          data-testid={`edit-set-row-${exKey}-${setIdx + 1}`}
                                          className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-2"
                                        >
                                          <div className="flex items-center gap-1.5">
                                            <span className="font-mono font-bold text-slate-400 w-6 shrink-0">#{setIdx + 1}</span>
                                            <input
                                              type="number"
                                              inputMode="decimal"
                                              aria-label={`Set ${setIdx + 1} weight`}
                                              value={weight}
                                              onChange={(e) => {
                                                const val = Number(e.target.value) || 0;
                                                patchSet({ weightLbs: val, weight: val });
                                              }}
                                              className="min-h-[40px] w-full min-w-0 flex-1 bg-slate-900 border border-slate-700 rounded-lg px-1 text-slate-200 text-sm text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                              placeholder="lbs"
                                            />
                                            <span className="text-slate-500 shrink-0" aria-hidden="true">lbs ×</span>
                                            <input
                                              type="number"
                                              inputMode="numeric"
                                              aria-label={`Set ${setIdx + 1} reps`}
                                              value={reps}
                                              onChange={(e) => {
                                                const val = Number(e.target.value) || 0;
                                                patchSet({ repsAchieved: val, reps: val });
                                              }}
                                              className="min-h-[40px] w-full min-w-0 flex-1 bg-slate-900 border border-slate-700 rounded-lg px-1 text-slate-200 text-sm text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                              placeholder="reps"
                                            />
                                            <button
                                              type="button"
                                              aria-label={`Set ${setIdx + 1} ${isDone ? 'done' : 'not done'}`}
                                              aria-pressed={isDone}
                                              onClick={() => patchSet({ isCompleted: !isDone, completed: !isDone })}
                                              className={`w-9 h-10 rounded-lg border flex items-center justify-center shrink-0 cursor-pointer ${
                                                isDone
                                                  ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                                                  : 'bg-slate-900 border-slate-700 text-slate-600'
                                              }`}
                                            >
                                              <Check className="w-4 h-4 stroke-[3]" />
                                            </button>
                                            <button
                                              type="button"
                                              aria-label={`Remove set ${setIdx + 1}`}
                                              onClick={() => updateEditingSets(exKey, (list) => list.filter((_, i) => i !== setIdx))}
                                              className="w-9 h-10 rounded-lg border border-slate-700 bg-slate-900 text-slate-400 hover:text-rose-400 hover:border-rose-500/40 flex items-center justify-center shrink-0 cursor-pointer"
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </button>
                                          </div>
                                          <input
                                            type="text"
                                            aria-label={`Set ${setIdx + 1} notes`}
                                            value={notes}
                                            onChange={(e) => patchSet({ notes: e.target.value })}
                                            className="min-h-[36px] w-full bg-slate-900 border border-slate-700 rounded-lg px-2 text-slate-200"
                                            placeholder="Notes"
                                          />
                                        </div>
                                      );
                                    }

                                    return (
                                      <div
                                        key={setIdx}
                                        className="flex items-center justify-between text-xs py-1 px-2.5 rounded bg-slate-950/60 border border-slate-800/60"
                                      >
                                        <div className="flex items-center gap-2">
                                          <span className="font-mono text-slate-400">Set {setIdx + 1}:</span>
                                          <span className="font-mono font-bold text-white">
                                            {weight > 0 ? `${weight} lbs` : 'Bodyweight'} × {reps} reps
                                          </span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                          {notes && (
                                            <span
                                              className={`text-[11px] truncate max-w-[180px] sm:max-w-xs ${
                                                isNotDoneNote ? 'text-amber-300 font-semibold' : 'text-slate-400'
                                              }`}
                                              title={notes}
                                            >
                                              {notes}
                                            </span>
                                          )}
                                          <span
                                            className={`w-4 h-4 rounded flex items-center justify-center text-[10px] ${
                                              isDone
                                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                                : isNotDoneNote
                                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                                : 'bg-slate-800 text-slate-500 border border-slate-700'
                                            }`}
                                          >
                                            {isDone ? '✓' : '—'}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                                {isEditing && sets.length === 0 && (
                                  <p className="text-[11px] text-amber-300">No sets left: this exercise is removed when you save.</p>
                                )}
                                {isEditing && (
                                  <button
                                    type="button"
                                    data-testid={`add-set-btn-${exKey}`}
                                    onClick={() =>
                                      updateEditingSets(exKey, (list) => {
                                        const last = list[list.length - 1] || {};
                                        return [
                                          ...list,
                                          {
                                            ...last,
                                            setNumber: list.length + 1,
                                            isCompleted: true,
                                            completed: true,
                                            notes: '',
                                            loggedAt: undefined,
                                          },
                                        ];
                                      })
                                    }
                                    className="min-h-[40px] w-full rounded-lg border border-dashed border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Add set</span>
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {isEditing && (() => {
                        const program = ALL_APP_SESSIONS.find((x) => x.id === session.sessionId);
                        const missing = program
                          ? [...program.exercises, ...(program.dailyCoreFinisher || [])].filter((ex) => !editingLogs[ex.id])
                          : [];
                        if (missing.length === 0) return null;
                        return (
                          <select
                            aria-label="Add an exercise"
                            data-testid="add-exercise-select"
                            value=""
                            onChange={(e) => {
                              const ex = missing.find((m) => m.id === e.target.value);
                              if (!ex) return;
                              setEditingLogs((prev) => ({
                                ...prev,
                                [ex.id]: [
                                  {
                                    setNumber: 1,
                                    targetReps: ex.targetReps,
                                    weightLbs: ex.defaultWeightLbs || ex.defaultWeight || 0,
                                    repsAchieved: 0,
                                    isCompleted: true,
                                    notes: '',
                                  },
                                ],
                              }));
                            }}
                            className="min-h-[44px] w-full bg-slate-900 border border-slate-700 rounded-xl px-3 text-xs text-slate-200"
                          >
                            <option value="">+ Add an exercise you did</option>
                            {missing.map((ex) => (
                              <option key={ex.id} value={ex.id}>
                                {ex.name}
                              </option>
                            ))}
                          </select>
                        );
                      })()}

                      {isEditing && (
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingSessionId(null)}
                            className="min-h-[44px] px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            data-testid={`save-logs-bottom-btn-${session.sessionId}`}
                            onClick={() => handleSaveEditedSession(session)}
                            className="min-h-[44px] px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                          >
                            <Save className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>Save Changes</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Delete Confirmation Prompt Modal */}
        {sessionToDelete && (
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-delete-title"
            data-testid="confirm-delete-dialog"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
          >
            <div className="w-full max-w-md bg-slate-900 border border-rose-500/40 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="confirm-delete-title" className="text-base sm:text-lg font-bold text-white">
                    Edit Out Workout Session?
                  </h3>
                  <p className="text-xs text-slate-400">
                    {sessionToDelete.sessionTitle || sessionToDelete.sessionId} on {formatDate(sessionToDelete.date)}
                  </p>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-300">
                Are you sure you want to remove this completed workout from your history? This session record will be permanently deleted from your logs and volume tracking.
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  data-testid="cancel-delete-workout-btn"
                  onClick={() => setSessionToDelete(null)}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs sm:text-sm cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  data-testid={`confirm-delete-workout-btn-${sessionToDelete.sessionId}`}
                  onClick={() => handleDeleteSession(sessionToDelete.id || sessionToDelete.date)}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-lg shadow-rose-950/50 cursor-pointer transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Yes, Delete Workout</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Clear All History Confirmation Modal */}
        {showClearConfirm && (
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-clear-title"
            data-testid="confirm-clear-dialog"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
          >
            <div className="w-full max-w-md bg-slate-900 border border-rose-500/40 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3
                    id="confirm-clear-title"
                    data-testid="confirm-clear-title"
                    className="text-base sm:text-lg font-bold text-white"
                  >
                    Delete All History & Start Fresh?
                  </h3>
                  <p className="text-xs text-slate-400">All completed sessions and cloud logs will be erased</p>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-300">
                Are you sure you want to permanently erase all past completed workouts from your history and start fresh? This will reset all historical sessions, clear cloud logs in Google Sheets, and restart clean from Day 1.
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  data-testid="cancel-clear-all-btn"
                  onClick={() => setShowClearConfirm(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs sm:text-sm cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  data-testid="confirm-clear-all-btn"
                  onClick={() => handleClearAllHistory(true)}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-lg shadow-rose-950/50 cursor-pointer transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Yes, Delete All History & Start Fresh</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
