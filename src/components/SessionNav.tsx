// src/components/SessionNav.tsx
import React, { useState, useCallback } from 'react';
import { WorkoutSession } from '../domain/programData';
import { CheckCircle2, ShieldAlert, Sparkles, ChevronUp, ChevronDown } from 'lucide-react';

export interface SessionProgressStats {
  completedSets: number;
  totalSets: number;
  completedExercises: number;
  totalExercises: number;
  isComplete: boolean;
}

export interface SessionNavProps {
  sessions: WorkoutSession[];
  extraSessions?: WorkoutSession[];
  activeSessionId: string;
  onSelectSession: (sessionId: string) => void;
  sessionStats: Record<string, SessionProgressStats>;
  autoHideCompleted?: boolean;
  onToggleAutoHideCompleted?: () => void;
}

const STORAGE_KEY_SESSION_NAV_COLLAPSED = 'workout_session_nav_collapsed_v1';

const SessionNavComponent: React.FC<SessionNavProps> = ({
  sessions,
  extraSessions = [],
  activeSessionId,
  onSelectSession,
  sessionStats,
  autoHideCompleted = false,
  onToggleAutoHideCompleted,
}) => {
  const [isNavCollapsed, setIsNavCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_SESSION_NAV_COLLAPSED) === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleNavCollapse = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsNavCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY_SESSION_NAV_COLLAPSED, String(next));
      } catch {
        // safe fallback
      }
      return next;
    });
  }, []);

  const completedCount = sessions.filter((s) => sessionStats[s.id]?.isComplete).length;
  const allCompleted = completedCount === sessions.length;
  const visibleSessions =
    autoHideCompleted && !allCompleted
      ? sessions.filter((s) => !sessionStats[s.id]?.isComplete)
      : sessions;

  return (
    <nav
      className="w-full max-w-full bg-slate-950 border-b border-slate-800 py-2 sm:py-3 px-2 sm:px-4 md:px-6 overflow-x-hidden"
      aria-label="Workout Sessions"
    >
      <div className="w-full max-w-7xl mx-auto">
        {allCompleted && (
          <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-300 mb-2">
            <span className="flex items-center gap-1.5 font-bold">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              All 4 Workout Sessions Completed for this Cycle!
            </span>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              4/4 Done
            </span>
          </div>
        )}

        {isNavCollapsed ? (
          /* Collapsed Single-Row Session Pill Bar */
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {visibleSessions.map((session) => {
                const isActive = session.id === activeSessionId;
                const stats = sessionStats[session.id] || {
                  completedSets: 0,
                  totalSets: 0,
                  completedExercises: 0,
                  totalExercises: session.exercises.length,
                  isComplete: false,
                };
                return (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => onSelectSession(session.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      isActive
                        ? 'bg-slate-900 border-emerald-500/70 text-white ring-1 ring-emerald-500/30'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    <span>{session.title}</span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {stats.completedExercises}/{stats.totalExercises}
                    </span>
                  </button>
                );
              })}

              {extraSessions.length > 0 && (
                <>
                  <div className="h-4 w-px bg-slate-800 shrink-0 mx-0.5" />
                  {extraSessions.map((session) => {
                    const isActive = session.id === activeSessionId;
                    const stats = sessionStats[session.id] || {
                      completedSets: 0,
                      totalSets: 0,
                      completedExercises: 0,
                      totalExercises: session.exercises.length,
                      isComplete: false,
                    };
                    const isRun = session.id === 'run_conditioning';
                    const isBjj = session.id === 'post_bjj_recovery';
                    const isAbs = session.id === 'daily_abs';
                    return (
                      <button
                        key={session.id}
                        type="button"
                        data-testid={`session-nav-pill-${session.id}`}
                        onClick={() => onSelectSession(session.id)}
                        aria-current={isActive ? 'page' : undefined}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                          isActive
                            ? isRun
                              ? 'bg-slate-900 border-sky-500/70 text-sky-200 ring-1 ring-sky-500/30'
                              : isBjj
                              ? 'bg-slate-900 border-purple-500/70 text-purple-200 ring-1 ring-purple-500/30'
                              : 'bg-slate-900 border-amber-500/70 text-amber-200 ring-1 ring-amber-500/30'
                            : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                        }`}
                      >
                        <span>{isRun ? '🏃 ' : isBjj ? '🥋 ' : isAbs ? '🔥 ' : ''}{session.title}</span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {stats.completedExercises}/{stats.totalExercises}
                        </span>
                      </button>
                    );
                  })}
                </>
              )}

              {completedCount > 0 && !allCompleted && onToggleAutoHideCompleted && (
                <button
                  type="button"
                  data-testid="toggle-hide-completed-pills-btn"
                  onClick={onToggleAutoHideCompleted}
                  className="px-2 py-1 rounded-xl border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white text-[10px] font-mono cursor-pointer shrink-0"
                >
                  {autoHideCompleted ? `+${completedCount} Done` : 'Hide Done'}
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleToggleNavCollapse}
              aria-expanded={false}
              aria-label="Expand session selector cards"
              className="flex items-center gap-1 px-2.5 py-1.5 min-h-[44px] sm:min-h-[38px] rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium cursor-pointer transition-colors shrink-0"
            >
              <span>Expand</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        ) : (
          /* Expanded Session Cards */
          <div className="space-y-2">
            <div className="flex items-center justify-between px-0.5">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                  Select Workout Session
                </span>
                {completedCount > 0 && !allCompleted && onToggleAutoHideCompleted && (
                  <button
                    type="button"
                    data-testid="toggle-hide-completed-sessions-btn"
                    onClick={onToggleAutoHideCompleted}
                    className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer transition-colors"
                  >
                    {autoHideCompleted ? `Show Completed (${completedCount})` : `Hide Completed (${completedCount})`}
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={handleToggleNavCollapse}
                aria-expanded={true}
                aria-label="Collapse session selector cards"
                className="flex items-center gap-1 px-2.5 py-1 min-h-[44px] sm:min-h-[38px] rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[11px] font-medium cursor-pointer transition-colors"
              >
                <span>Collapse</span>
                <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 w-full min-w-0">
              {visibleSessions.map((session) => {
                const isActive = session.id === activeSessionId;
                const stats = sessionStats[session.id] || {
                  completedSets: 0,
                  totalSets: 0,
                  completedExercises: 0,
                  totalExercises: session.exercises.length,
                  isComplete: false,
                };

                const isKneeFocus = session.id === 'lower_a';
                const isPostChainFocus = session.id === 'lower_b';

                return (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => onSelectSession(session.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`w-full min-w-0 text-left p-2.5 sm:p-3.5 rounded-xl border transition-all duration-200 relative overflow-hidden group cursor-pointer ${
                      isActive
                        ? 'bg-slate-900 border-emerald-500/70 shadow-lg shadow-emerald-950/20 ring-1 ring-emerald-500/30'
                        : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-900 hover:border-slate-700'
                    }`}
                  >
                    {/* Active Indicator Top Stripe */}
                    {isActive && (
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-sky-400" />
                    )}

                    {/* Title & Status Badge */}
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={`text-sm font-bold tracking-tight ${
                          isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'
                        }`}
                      >
                        {session.title}
                      </span>

                      {stats.isComplete ? (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" />
                          Done
                        </span>
                      ) : (
                        <span className="text-[11px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full border border-slate-700/60">
                          {stats.completedExercises}/{stats.totalExercises} ex
                        </span>
                      )}
                    </div>

                    {/* Subtitle / Focus Summary */}
                    <p className="text-xs text-slate-400 line-clamp-1 mb-2 font-medium">
                      {session.subtitle}
                    </p>

                    {/* Target Focus Pills */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {isKneeFocus && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                          <ShieldAlert className="w-2.5 h-2.5" />
                          Knee Rehab
                        </span>
                      )}
                      {isPostChainFocus && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-sky-300 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">
                          <Sparkles className="w-2.5 h-2.5" />
                          Post-Chain
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded font-mono">
                        {session.estimatedDurationMinutes}m
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Extra Conditioning & Sport Recovery Protocols (Run & Post-BJJ) */}
            {extraSessions.length > 0 && (
              <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                <div className="flex items-center justify-between px-0.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    Conditioning & Recovery Protocols
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {extraSessions.length} Additional Protocols
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 w-full min-w-0">
                  {extraSessions.map((session) => {
                    const isActive = session.id === activeSessionId;
                    const stats = sessionStats[session.id] || {
                      completedSets: 0,
                      totalSets: 0,
                      completedExercises: 0,
                      totalExercises: session.exercises.length,
                      isComplete: false,
                    };
                    const isRun = session.id === 'run_conditioning';
                    const isBjj = session.id === 'post_bjj_recovery';
                    const isAbs = session.id === 'daily_abs';

                    return (
                      <button
                        key={session.id}
                        type="button"
                        data-testid={`session-nav-card-${session.id}`}
                        onClick={() => onSelectSession(session.id)}
                        aria-current={isActive ? 'page' : undefined}
                        className={`w-full min-w-0 text-left p-2.5 sm:p-3.5 rounded-xl border transition-all duration-200 relative overflow-hidden group cursor-pointer ${
                          isActive
                            ? isRun
                              ? 'bg-slate-900 border-sky-500/70 shadow-lg shadow-sky-950/20 ring-1 ring-sky-500/30'
                              : isBjj
                              ? 'bg-slate-900 border-purple-500/70 shadow-lg shadow-purple-950/20 ring-1 ring-purple-500/30'
                              : 'bg-slate-900 border-amber-500/70 shadow-lg shadow-amber-950/20 ring-1 ring-amber-500/30'
                            : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-900 hover:border-slate-700'
                        }`}
                      >
                        {isActive && (
                          <div
                            className={`absolute top-0 left-0 right-0 h-1 ${
                              isRun
                                ? 'bg-gradient-to-r from-sky-400 to-emerald-400'
                                : isBjj
                                ? 'bg-gradient-to-r from-purple-400 to-indigo-400'
                                : 'bg-gradient-to-r from-amber-400 to-rose-400'
                            }`}
                          />
                        )}
                        <div className="flex items-center justify-between mb-1.5">
                          <span
                            className={`text-sm font-bold tracking-tight ${
                              isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'
                            }`}
                          >
                            {isRun ? '🏃 ' : isBjj ? '🥋 ' : isAbs ? '🔥 ' : ''}{session.title}
                          </span>
                          {stats.isComplete ? (
                            <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3" />
                              Done
                            </span>
                          ) : (
                            <span className="text-[11px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full border border-slate-700/60">
                              {stats.completedExercises}/{stats.totalExercises} ex
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-1 mb-2 font-medium">
                          {session.subtitle}
                        </p>
                        <div className="flex items-center gap-1.5 text-[10px] font-mono">
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 font-bold text-slate-300">
                            {session.estimatedDurationMinutes}m
                          </span>
                          <span className="text-slate-400 truncate">
                            {isRun
                              ? 'Pre-Run Priming + Post-Run Flush'
                              : isBjj
                              ? 'Spinal Traction, Neck & Grip Reset'
                              : 'Bottom-Up ➔ Rotational ➔ Top-Down ➔ Plank'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export const SessionNav = React.memo(SessionNavComponent);

