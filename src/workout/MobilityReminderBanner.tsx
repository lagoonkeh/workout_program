// Extracted from src/App.tsx (WorkoutAppMain). Presentation only: state and handlers come in as props.
import { Activity } from 'lucide-react';
import { type Dispatch, type SetStateAction } from 'react';
import { type AppViewMode } from '../components/Header';
import { type MobilityCheckInStatus } from '../domain/mobility';

export interface MobilityReminderBannerProps {
  currentView: AppViewMode;
  handleDismissMobilityPrompt: () => void;
  handleSnoozeMobilityPrompt: () => void;
  mobilityCheckInStatus: MobilityCheckInStatus;
  setCurrentView: Dispatch<SetStateAction<AppViewMode>>;
}

export function MobilityReminderBanner({ currentView, handleDismissMobilityPrompt, handleSnoozeMobilityPrompt, mobilityCheckInStatus, setCurrentView }: MobilityReminderBannerProps) {
  return (
    <>
      {/* Bi-Weekly Mobility Assessment Reminder Banner */}
      {mobilityCheckInStatus.isDue && currentView !== 'mobility' && (
        <aside
          role="region"
          aria-label="Bi-Weekly Mobility Check-In Prompt"
          data-testid="biweekly-mobility-prompt"
          className="w-full bg-gradient-to-r from-emerald-950 via-slate-900 to-sky-950 border-b border-emerald-500/40 px-2.5 sm:px-6 py-2 sm:py-3 text-white shadow-lg animate-in fade-in slide-in-from-top-2"
        >
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0">
                <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <h3 className="font-bold text-xs sm:text-base text-white truncate">
                    🗓 Bi-Weekly Mobility Assessment Due
                  </h3>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0">
                    {mobilityCheckInStatus.daysSinceLastAssessment !== null
                      ? `${mobilityCheckInStatus.daysSinceLastAssessment} days since last test`
                      : 'Initial Baseline Needed'}
                  </span>
                </div>
                <p className="hidden md:block text-xs text-slate-300 mt-0.5 leading-relaxed">
                  Every 2 weeks, assess your 5 mobility benchmarks (Ankle Dorsiflexion, Elephant Walk Hamstring Reach, Split Squat Elevation, Biering-Sørensen Lumbar Endurance, and Dead Hang) to measure how your warm-ups and adaptive stretching are restoring joint mobility.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 self-end sm:self-center">
              <button
                type="button"
                data-testid="biweekly-mobility-log-now-btn"
                onClick={() => setCurrentView('mobility')}
                className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1 cursor-pointer shadow-md transition-all active:scale-95"
              >
                <span>Log Mobility Now</span>
                <span>➔</span>
              </button>
              <button
                type="button"
                data-testid="biweekly-mobility-snooze-btn"
                onClick={handleSnoozeMobilityPrompt}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold cursor-pointer transition-colors"
                title="Remind me again in 2 days"
              >
                Snooze 2 Days
              </button>
              <button
                type="button"
                data-testid="biweekly-mobility-dismiss-btn"
                onClick={handleDismissMobilityPrompt}
                aria-label="Dismiss mobility reminder"
                className="text-slate-400 hover:text-white p-1 rounded cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
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
