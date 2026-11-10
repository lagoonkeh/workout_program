// Extracted from src/App.tsx (WorkoutAppMain). Presentation only: state and handlers come in as props.
import { type Dispatch, type SetStateAction } from 'react';
import { type AppViewMode } from '../components/Header';

export interface SessionCompletionToastProps {
  sessionCompletionToast: { completedTitle: string; completedId: string; nextTitle: string; nextId: string; durationSeconds?: number; calendarLogged?: boolean; calendarEventLink?: string; } | null;
  setActiveSessionId: Dispatch<SetStateAction<string>>;
  setCurrentView: Dispatch<SetStateAction<AppViewMode>>;
  setSessionCompletionToast: Dispatch<SetStateAction<{ completedTitle: string; completedId: string; nextTitle: string; nextId: string; durationSeconds?: number; calendarLogged?: boolean; calendarEventLink?: string; } | null>>;
}

export function SessionCompletionToast({ sessionCompletionToast, setActiveSessionId, setCurrentView, setSessionCompletionToast }: SessionCompletionToastProps) {
  return (
    <>
      {/* Session Completion Celebration Toast */}
      {sessionCompletionToast && (
        <aside
          role="status"
          aria-live="polite"
          data-testid="session-completion-toast"
          className="w-full px-3 sm:px-6 py-2.5 bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 border-b border-emerald-500/50 text-white shadow-xl flex items-center justify-between gap-3 text-xs sm:text-sm animate-in fade-in slide-in-from-top-2"
        >
          <div className="max-w-7xl mx-auto w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg">🎉</span>
              <div>
                <span className="font-bold text-white">
                  {sessionCompletionToast.completedTitle} Completed!
                </span>{' '}
                {sessionCompletionToast.durationSeconds !== undefined && sessionCompletionToast.durationSeconds > 0 && (
                  <span className="font-semibold text-cyan-300 mr-1.5">
                    ({Math.max(1, Math.round(sessionCompletionToast.durationSeconds / 60))} min) ·
                  </span>
                )}
                <span className="text-emerald-300">
                  Card hidden & automatically moved to {sessionCompletionToast.nextTitle}.
                </span>
                {sessionCompletionToast.calendarLogged && (
                  <span
                    data-testid="toast-calendar-logged-badge"
                    className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-semibold"
                  >
                    📅 Logged to 'Workouts' Calendar
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => {
                  setActiveSessionId(sessionCompletionToast.completedId);
                  setSessionCompletionToast(null);
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 cursor-pointer"
              >
                View {sessionCompletionToast.completedTitle}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCurrentView('stretching');
                  setSessionCompletionToast(null);
                }}
                className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold cursor-pointer"
              >
                Stretching ➔
              </button>
              <button
                type="button"
                onClick={() => setSessionCompletionToast(null)}
                aria-label="Dismiss completion notification"
                className="text-slate-400 hover:text-white px-1.5 py-0.5 rounded cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>
        </aside>
      )}
    </>
  );
}
