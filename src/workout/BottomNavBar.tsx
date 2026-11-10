// Extracted from src/App.tsx (WorkoutAppMain). Presentation only: state and handlers come in as props.
import { Activity, BookOpen, Brain, ChevronDown, Dumbbell, HeartPulse, Sparkles, TrendingUp, Trophy } from 'lucide-react';
import { type Dispatch, type SetStateAction } from 'react';
import { type AppViewMode } from '../components/Header';
import { type WorkoutExercise } from '../domain/programData';

export interface BottomNavBarProps {
  currentView: AppViewMode;
  handleJumpToNextSet: () => void;
  nextOpenSet: { exercise: WorkoutExercise; setIndex: number; } | null;
  setCurrentView: Dispatch<SetStateAction<AppViewMode>>;
}

export function BottomNavBar({ currentView, handleJumpToNextSet, nextOpenSet, setCurrentView }: BottomNavBarProps) {
  return (
    <>
      {/* Mobile Bottom Thumb-Zone Quick Navigation Bar (Optimized for Pixel 9 Pro XL 20:9 screen) */}
      <nav
        aria-label="Mobile Thumb-Zone Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-slate-950/95 backdrop-blur-md border-t border-slate-800/90 px-1 pt-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] grid grid-cols-8 gap-0.5 shadow-2xl"
      >
        {(
          [
            { id: 'workout', label: 'Routine', icon: Dumbbell },
            { id: 'readiness', label: 'Check-In', icon: HeartPulse },
            { id: 'cns', label: 'CNS', icon: Brain },
            { id: 'mobility', label: 'Mobility', icon: Activity },
            { id: 'stretching', label: 'Stretch', icon: Sparkles },
            { id: 'progress', label: 'Progress', icon: TrendingUp },
            { id: 'assessment', label: 'Assess', icon: Trophy },
            { id: 'guide', label: 'Guide', icon: BookOpen },
          ] as const
        ).map(({ id, label, icon: Icon }) => {
          const isActive = currentView === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setCurrentView(id)}
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
      </nav>

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
