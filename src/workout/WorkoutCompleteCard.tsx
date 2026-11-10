// Extracted from src/App.tsx (WorkoutAppMain). Presentation only: state and handlers come in as props.
import { Check, Trophy } from 'lucide-react';
import { type Dispatch, type SetStateAction } from 'react';
import { type AppViewMode } from '../components/Header';
import { type SessionProgressStats } from '../components/SessionNav';
import { type WorkoutExercise, type WorkoutSession } from '../domain/programData';

export interface WorkoutCompleteCardProps {
  activeSession: WorkoutSession;
  activeSessionId: string;
  currentSessionCompletion: number;
  handleToggleWorkoutCompleted: () => void;
  isSavingAndAdvancing: boolean;
  sessionExercises: WorkoutExercise[];
  sessionStats: Record<string, SessionProgressStats>;
  sessionTelemetry: { totalTonnageLbs: number; prCount: number; topE1RM: number; };
  setCurrentView: Dispatch<SetStateAction<AppViewMode>>;
}

export function WorkoutCompleteCard({ activeSession, activeSessionId, currentSessionCompletion, handleToggleWorkoutCompleted, isSavingAndAdvancing, sessionExercises, sessionStats, sessionTelemetry, setCurrentView }: WorkoutCompleteCardProps) {
  return (
    <>
      {/* Workout Completed Option Card at the End of All Exercise Cards */}
      <div
        data-testid="workout-completion-card"
        className="mt-6 p-4 sm:p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-emerald-950/30 to-slate-900 border border-emerald-500/40 shadow-2xl relative overflow-hidden space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-inner">
              <Trophy className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  {currentSessionCompletion === 100 ? '🎉 Workout Completed!' : '🏁 Workout Completion'}
                </h3>
                <span
                  data-testid="workout-completion-badge"
                  className={`text-xs font-bold font-mono px-2.5 py-0.5 rounded-full border ${
                              currentSessionCompletion === 100
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                                : 'bg-slate-800 text-slate-300 border-slate-700'
                            }`}
                >
                  Status: {currentSessionCompletion} / 100 Done
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                {activeSession.title} · {activeSession.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              data-testid="mark-workout-completed-btn"
              onClick={handleToggleWorkoutCompleted}
              disabled={isSavingAndAdvancing}
              className={`px-5 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg active:scale-95 ${
                          currentSessionCompletion === 100
                            ? 'bg-emerald-500/25 hover:bg-emerald-500/35 text-emerald-300 border border-emerald-500/50 ring-1 ring-emerald-500/30'
                            : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-950/50 hover:shadow-emerald-900/60'
                        } ${isSavingAndAdvancing ? 'opacity-80 cursor-wait' : ''}`}
              aria-label={currentSessionCompletion === 100 ? 'Workout Completed (100% Done)' : 'Mark Workout as Completed'}
            >
              {isSavingAndAdvancing ? (
                <>
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>Confirming & Saving Workout...</span>
                </>
              ) : (
                <>
                  <Check className="w-5 h-5 stroke-[3]" />
                  <span>
                    {currentSessionCompletion === 100
                      ? '✓ Complete & Save to History'
                      : '✓ Mark Workout as Completed'}
                  </span>
                </>
              )}
            </button>

          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="w-full bg-slate-800/80 rounded-full h-3 overflow-hidden border border-slate-700/60 p-0.5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 ease-out"
            style={{ width: `${currentSessionCompletion}%` }}
          />
        </div>

        {/* Session Telemetry Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col">
            <span className="text-slate-400 text-[11px]">Sets Completed</span>
            <span className="text-white font-mono font-bold text-sm">
              {sessionStats[activeSessionId]?.completedSets || 0} / {sessionStats[activeSessionId]?.totalSets || 0}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col">
            <span className="text-slate-400 text-[11px]">Total Volume</span>
            <span className="text-white font-mono font-bold text-sm">
              {sessionTelemetry.totalTonnageLbs.toLocaleString()} lbs
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col">
            <span className="text-slate-400 text-[11px]">Personal Records</span>
            <span className="text-amber-300 font-mono font-bold text-sm">
              {sessionTelemetry.prCount} PRs
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col">
            <span className="text-slate-400 text-[11px]">Exercises Done</span>
            <span className="text-emerald-300 font-mono font-bold text-sm">
              {sessionStats[activeSessionId]?.completedExercises || 0} / {sessionExercises.length}
            </span>
          </div>
        </div>

        {/* Post-Workout Recovery Quick Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
          <span className="text-xs text-slate-400 font-medium">Post-Workout Shortcuts:</span>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setCurrentView('stretching')}
              className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <span>🧘 Post-Workout Stretching ➔</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
