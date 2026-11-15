// Extracted from src/App.tsx (WorkoutAppMain). Presentation only: state and handlers come in as props.
import { Activity, BookOpen, Brain, ChevronDown, Dumbbell, HeartPulse, MoreHorizontal, Sparkles, TrendingUp, Trophy } from 'lucide-react';
import { useState, type Dispatch, type SetStateAction } from 'react';
import { type AppViewMode } from '../components/Header';
import { type WorkoutExercise } from '../domain/programData';

export interface BottomNavBarProps {
  currentView: AppViewMode;
  handleJumpToNextSet: () => void;
  nextOpenSet: { exercise: WorkoutExercise; setIndex: number; } | null;
  setCurrentView: Dispatch<SetStateAction<AppViewMode>>;
}

const PRIMARY_TABS = [
  { id: 'workout', label: 'Routine', icon: Dumbbell },
  { id: 'readiness', label: 'Check-In', icon: HeartPulse },
  { id: 'mobility', label: 'Mobility', icon: Activity },
  { id: 'progress', label: 'Progress', icon: TrendingUp },
] as const;

const MORE_TABS = [
  { id: 'cns', label: 'CNS', icon: Brain },
  { id: 'stretching', label: 'Stretch', icon: Sparkles },
  { id: 'assessment', label: 'Assess', icon: Trophy },
  { id: 'guide', label: 'Guide', icon: BookOpen },
] as const;

export function BottomNavBar({ currentView, handleJumpToNextSet, nextOpenSet, setCurrentView }: BottomNavBarProps) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const isMoreActive = MORE_TABS.some((tab) => tab.id === currentView);

  return (
    <>
      {/* Mobile Bottom Thumb-Zone Quick Navigation Bar (5 tabs: 4 primary + More) */}
      <nav
        aria-label="Mobile Thumb-Zone Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-slate-950/95 backdrop-blur-md border-t border-slate-800/90 px-1 pt-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] grid grid-cols-5 gap-0.5 shadow-2xl"
      >
        {PRIMARY_TABS.map(({ id, label, icon: Icon }) => {
          const isActive = currentView === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => {
                setCurrentView(id);
                setIsMoreOpen(false);
              }}
              aria-label={`Quick switch to ${label} view`}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center justify-center min-h-[44px] py-1 px-0.5 rounded-xl text-[9px] sm:text-[10px] font-semibold transition-all cursor-pointer active:scale-95 ${
                isActive
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 mb-0.5 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span className="truncate max-w-full">{label}</span>
            </button>
          );
        })}

        {/* More Tab Trigger */}
        <button
          type="button"
          onClick={() => setIsMoreOpen((prev) => !prev)}
          aria-label="More navigation views"
          aria-expanded={isMoreOpen}
          className={`flex flex-col items-center justify-center min-h-[44px] py-1 px-0.5 rounded-xl text-[9px] sm:text-[10px] font-semibold transition-all cursor-pointer active:scale-95 ${
            isMoreActive
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'text-slate-400 hover:text-slate-200 border border-transparent'
          }`}
        >
          <MoreHorizontal className={`w-3.5 h-3.5 mb-0.5 ${isMoreActive ? 'text-emerald-400' : 'text-slate-400'}`} />
          <span className="truncate max-w-full">More</span>
        </button>
      </nav>

      {/* More Options Popover */}
      <div
        aria-label="More navigation options"
        className={`md:hidden fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom))] right-2 z-40 bg-slate-900/98 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl p-2 min-w-[190px] flex flex-col gap-1 transition-all duration-200 ${
          isMoreOpen ? 'opacity-100 pointer-events-auto scale-100' : 'opacity-0 pointer-events-none scale-95'
        }`}
      >
        <div className="text-[10px] font-mono text-slate-400 px-2 py-0.5 uppercase tracking-wider border-b border-slate-800">
          Additional Views
        </div>
        {MORE_TABS.map(({ id, label, icon: Icon }) => {
          const isActive = currentView === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => {
                setCurrentView(id);
                setIsMoreOpen(false);
              }}
              aria-label={`Quick switch to ${label} view`}
              aria-current={isActive ? 'page' : undefined}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                isActive
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* Jump to the next unfinished set: the first lift sits a few screens below the warmups */}
      {currentView === 'workout' && nextOpenSet && (
        <button
          type="button"
          data-testid="jump-next-set-btn"
          onClick={handleJumpToNextSet}
          className="fixed bottom-14 left-3 md:bottom-4 z-40 max-w-[calc(100vw-11rem)] min-h-[48px] px-3 rounded-2xl bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-white shadow-2xl border border-emerald-400/50 flex items-center gap-2 text-left cursor-pointer"
          aria-label={`Jump to ${nextOpenSet.exercise.name}, set ${nextOpenSet.setIndex + 1}`}
        >
          <ChevronDown className="w-4 h-4 shrink-0" />
          <span className="min-w-0 leading-tight">
            <span className="block text-[11px] font-semibold opacity-90">Next · Set {nextOpenSet.setIndex + 1}</span>
            <span className="jump-next-name block text-sm font-bold truncate" data-name={nextOpenSet.exercise.name} />
          </span>
        </button>
      )}
    </>
  );
}
