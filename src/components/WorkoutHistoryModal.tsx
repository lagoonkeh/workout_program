// src/components/WorkoutHistoryModal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  History,
  Trash2,
  Edit3,
  Check,
  FastForward,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Calendar,
  Dumbbell,
  Save,
} from 'lucide-react';
import { storageManager, CompletedWorkoutSession } from '../storage/storageManager';

export interface WorkoutHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSessionUpdated?: () => void;
}

export const WorkoutHistoryModal: React.FC<WorkoutHistoryModalProps> = ({
  isOpen,
  onClose,
  onSessionUpdated,
}) => {
  const [sessionsMap, setSessionsMap] = useState<Record<string, CompletedWorkoutSession>>({});
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingLogs, setEditingLogs] = useState<Record<string, any>>({});
  const [sessionToDelete, setSessionToDelete] = useState<CompletedWorkoutSession | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);

  // Load completed sessions from storage
  const reloadSessions = () => {
    const records = storageManager.getCompletedWorkouts();
    setSessionsMap({ ...records });
  };

  useEffect(() => {
    if (isOpen) {
      reloadSessions();
      setEditingSessionId(null);
      setSessionToDelete(null);
      setShowClearConfirm(false);
    }
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

  // Handle clearing all history
  const handleClearAllHistory = () => {
    storageManager.clearCompletedWorkouts();
    reloadSessions();
    setShowClearConfirm(false);
    onSessionUpdated?.();
  };

  // Start editing a workout session's logs
  const handleStartEditing = (session: CompletedWorkoutSession) => {
    setEditingSessionId(session.id || session.date);
    setEditingLogs(JSON.parse(JSON.stringify(session.logs || {})));
    setExpandedSessionId(session.id || session.date);
  };

  // Save edited logs for a session
  const handleSaveEditedSession = (session: CompletedWorkoutSession) => {
    const recordId = session.id || session.date;
    storageManager.updateCompletedWorkout(recordId, {
      logs: editingLogs,
    });
    reloadSessions();
    setEditingSessionId(null);
    onSessionUpdated?.();
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
            {sortedSessions.length > 0 && (
              <button
                type="button"
                data-testid="clear-all-history-btn"
                onClick={() => setShowClearConfirm(true)}
                className="min-h-[44px] px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 border border-slate-700/80 hover:border-rose-500/40 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Clear all completed workout history"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear History</span>
              </button>
            )}

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
              className="p-8 sm:p-12 text-center rounded-2xl bg-slate-950/40 border border-slate-800/80 flex flex-col items-center justify-center space-y-3"
            >
              <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400">
                <Dumbbell className="w-7 h-7" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white">No Completed Workouts Yet</h3>
              <p className="text-xs sm:text-sm text-slate-400 max-w-sm">
                Finish your active session from the Routine tab to see completed workout logs, tonnage, and adherence records here.
              </p>
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
                          title="Edit set reps, weights, and notes"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Edit Logs</span>
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
                            <strong>Editing Mode Active:</strong> Modify weights, reps, or notes below, then click Save Changes.
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
                                    {exKey.replaceAll('_', ' ')}
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
                                      return (
                                        <div
                                          key={setIdx}
                                          className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs"
                                        >
                                          <div className="col-span-2 sm:col-span-1 font-mono font-bold text-slate-400">
                                            #{setIdx + 1}
                                          </div>
                                          <div className="col-span-3 sm:col-span-2">
                                            <input
                                              type="number"
                                              aria-label={`Set ${setIdx + 1} weight`}
                                              value={weight}
                                              onChange={(e) => {
                                                const val = Number(e.target.value) || 0;
                                                setEditingLogs((prev) => {
                                                  const next = { ...prev };
                                                  const exSets = [...(Array.isArray(next[exKey]) ? next[exKey] : [next[exKey]])];
                                                  exSets[setIdx] = { ...exSets[setIdx], weightLbs: val, weight: val };
                                                  next[exKey] = exSets;
                                                  return next;
                                                });
                                              }}
                                              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs text-center"
                                              placeholder="lbs"
                                            />
                                          </div>
                                          <div className="col-span-3 sm:col-span-2">
                                            <input
                                              type="number"
                                              aria-label={`Set ${setIdx + 1} reps`}
                                              value={reps}
                                              onChange={(e) => {
                                                const val = Number(e.target.value) || 0;
                                                setEditingLogs((prev) => {
                                                  const next = { ...prev };
                                                  const exSets = [...(Array.isArray(next[exKey]) ? next[exKey] : [next[exKey]])];
                                                  exSets[setIdx] = { ...exSets[setIdx], repsAchieved: val, reps: val };
                                                  next[exKey] = exSets;
                                                  return next;
                                                });
                                              }}
                                              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs text-center"
                                              placeholder="reps"
                                            />
                                          </div>
                                          <div className="col-span-4 sm:col-span-7 flex items-center gap-2">
                                            <input
                                              type="text"
                                              aria-label={`Set ${setIdx + 1} notes`}
                                              value={notes}
                                              onChange={(e) => {
                                                const val = e.target.value;
                                                setEditingLogs((prev) => {
                                                  const next = { ...prev };
                                                  const exSets = [...(Array.isArray(next[exKey]) ? next[exKey] : [next[exKey]])];
                                                  exSets[setIdx] = { ...exSets[setIdx], notes: val };
                                                  next[exKey] = exSets;
                                                  return next;
                                                });
                                              }}
                                              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs"
                                              placeholder="Notes / comments"
                                            />
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const nextDone = !isDone;
                                                setEditingLogs((prev) => {
                                                  const next = { ...prev };
                                                  const exSets = [...(Array.isArray(next[exKey]) ? next[exKey] : [next[exKey]])];
                                                  exSets[setIdx] = { ...exSets[setIdx], isCompleted: nextDone, completed: nextDone };
                                                  next[exKey] = exSets;
                                                  return next;
                                                });
                                              }}
                                              className={`w-7 h-7 rounded border flex items-center justify-center shrink-0 cursor-pointer ${
                                                isDone
                                                  ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                                                  : 'bg-slate-900 border-slate-700 text-slate-600'
                                              }`}
                                            >
                                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                                            </button>
                                          </div>
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
                              </div>
                            );
                          })}
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
                  <h3 id="confirm-clear-title" className="text-base sm:text-lg font-bold text-white">
                    Clear Entire Workout History?
                  </h3>
                  <p className="text-xs text-slate-400">All completed sessions will be deleted</p>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-300">
                Are you sure you want to permanently erase all past completed workouts from your local history? This action cannot be reversed.
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs sm:text-sm cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  data-testid="confirm-clear-all-btn"
                  onClick={handleClearAllHistory}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-lg shadow-rose-950/50 cursor-pointer transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Yes, Clear All History</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
