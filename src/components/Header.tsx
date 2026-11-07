import React from 'react';
import { Volume2, VolumeX, Dumbbell, Activity, Cloud, Loader2, Check, Sparkles, TrendingUp, HeartPulse, LogOut, Trophy, History, BookOpen } from 'lucide-react';
import { AppLogo } from './AppLogo';
import { useAuth } from '../context/AuthContext';

export type AppViewMode = 'workout' | 'readiness' | 'mobility' | 'stretching' | 'progress' | 'assessment' | 'guide';

export interface HeaderProps {
  activeSessionTitle: string;
  activeSessionSubtitle: string;
  isMuted: boolean;
  onToggleMute: () => void;
  currentView: AppViewMode;
  onSelectView: (view: AppViewMode) => void;
  completionPercentage: number;
  isSyncing?: boolean;
  syncSuccessFlash?: boolean;
  lastSyncedTime?: string | null;
  onSync?: () => void;
  onOpenWeeklyEvaluation?: () => void;
  weeklyAdaptationCount?: number;
  onOpenWorkoutHistory?: () => void;
}

const HeaderComponent: React.FC<HeaderProps> = ({
  activeSessionTitle,
  activeSessionSubtitle,
  isMuted,
  onToggleMute,
  currentView,
  onSelectView,
  completionPercentage,
  isSyncing = false,
  syncSuccessFlash = false,
  lastSyncedTime = null,
  onSync,
  onOpenWeeklyEvaluation,
  weeklyAdaptationCount = 0,
  onOpenWorkoutHistory,
}) => {
  const { user, isGuestBypassed, isFirebaseReady, logout, cloudSyncStatus, lastCloudSyncedTime } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 px-2 sm:px-4 md:px-6 py-2 sm:py-2.5 w-full max-w-full overflow-x-hidden">
      <div className="w-full max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-2 sm:gap-3 min-w-0">
        {/* Brand & Active Workout Badge */}
        <div className="flex items-center justify-between w-full md:w-auto gap-2 min-w-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <AppLogo size={34} className="transform hover:scale-105 transition-transform shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* 14px clipped to "4-Day Upper/Lo…" on a 375px phone; 13px fits, and phones narrower than 375px drop "4-Day" */}
                <h1 className="text-[13px] min-[400px]:text-sm sm:text-lg md:text-xl font-bold tracking-tight text-white truncate">
                  <span className="max-[374px]:hidden">4-Day Upper/Lower</span>
                  <span className="hidden max-[374px]:inline" aria-hidden="true">Upper/Lower</span>
                </h1>
                <span className="hidden sm:inline-block text-[11px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                  GZCL + 9 Creators
                </span>
              </div>
              {/* Active workout subtitle: displayed cleanly on desktop workout view; hidden on mobile & non-routine views where it is redundant */}
              <div className={`items-center gap-1.5 text-xs text-slate-400 min-w-0 ${currentView === 'workout' ? 'hidden md:flex' : 'hidden'}`}>
                <span className="font-medium text-emerald-400 shrink-0">{activeSessionTitle}:</span>
                <span className="truncate max-w-[140px] xs:max-w-[200px] sm:max-w-xs">{activeSessionSubtitle}</span>
              </div>
            </div>
          </div>

          {/* Mobile Right Controls: Sync & Sound Toggle */}
          <div className="flex md:hidden items-center gap-1 sm:gap-1.5 shrink-0 overflow-x-auto no-scrollbar py-0.5">
            {onSync && (
              <button
                type="button"
                onClick={onSync}
                disabled={isSyncing}
                aria-label="Sync to Google Sheets"
                className={`p-2 min-h-[44px] min-w-[44px] rounded-xl border transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95 ${
                  syncSuccessFlash
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
                    : isSyncing
                    ? 'bg-slate-800 border-slate-700 text-slate-400 opacity-70'
                    : 'bg-emerald-950/70 border-emerald-600/70 text-emerald-300 hover:bg-emerald-900'
                }`}
                title={lastSyncedTime ? `Last synced: ${lastSyncedTime}` : 'Sync logs to Google Sheets'}
              >
                {isSyncing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                ) : syncSuccessFlash ? (
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                ) : (
                  <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                )}
                <span className="hidden sm:inline text-[10px] font-semibold">
                  {isSyncing ? '...' : syncSuccessFlash ? 'Synced' : 'Sync'}
                </span>
              </button>
            )}

            {onOpenWeeklyEvaluation && (
              <button
                type="button"
                onClick={onOpenWeeklyEvaluation}
                aria-label="Open Weekly Evaluation"
                className="p-2 min-h-[44px] min-w-[44px] rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                title="Weekly AI Evaluation & Adaptations"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline text-[10px] font-semibold">Review</span>
              </button>
            )}

            {onOpenWorkoutHistory && (
              <button
                type="button"
                data-testid="mobile-open-history-btn"
                onClick={onOpenWorkoutHistory}
                aria-label="Open Workout History & Log Editor"
                className="p-2 min-h-[44px] min-w-[44px] rounded-xl border border-slate-700 bg-slate-800/80 text-slate-300 hover:text-white transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                title="Workout History & Log Editor"
              >
                <History className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline text-[10px] font-semibold">History</span>
              </button>
            )}

            {user && (
              <div
                data-testid="mobile-cloud-sync-indicator"
                className="p-2 min-h-[44px] min-w-[44px] rounded-xl border border-slate-800 bg-slate-900/90 flex items-center justify-center text-xs"
                title={
                  lastCloudSyncedTime
                    ? `Cloud Synced at ${new Date(lastCloudSyncedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : 'Cloud Real-Time Sync'
                }
              >
                {cloudSyncStatus === 'syncing' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                ) : (
                  <Cloud className={`w-3.5 h-3.5 ${cloudSyncStatus === 'synced' ? 'text-cyan-400' : 'text-slate-400'}`} />
                )}
              </div>
            )}

            <button
              type="button"
              onClick={onToggleMute}
              aria-label={isMuted ? 'Unmute Audio Synthesizer' : 'Mute Audio Synthesizer'}
              className={`p-2 min-h-[44px] min-w-[44px] rounded-xl border transition-colors flex items-center justify-center cursor-pointer active:scale-95 ${
                isMuted
                  ? 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
              }`}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>

            {user && (
              <button
                type="button"
                onClick={logout}
                aria-label="Sign Out"
                title={`Signed in as ${user.email} (Click to Sign Out)`}
                className="p-2 min-h-[44px] min-w-[44px] rounded-xl border border-slate-700 bg-slate-800/80 text-slate-400 hover:text-rose-400 transition-colors flex items-center justify-center cursor-pointer active:scale-95"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* View Navigation Tabs & Desktop Controls */}
        <div className="w-full md:w-auto flex items-center justify-between md:justify-end gap-2 sm:gap-3 min-w-0">
          {/* Navigation Tabs - Desktop view tabs (mobile uses the bottom thumb-zone nav) */}
          <nav
            className="hidden md:flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 gap-0.5 sm:gap-1 w-full md:w-auto min-w-0"
            role="tablist"
            aria-label="Application Views"
          >
            <button
              type="button"
              role="tab"
              aria-selected={currentView === 'workout'}
              onClick={() => onSelectView('workout')}
              className={`flex items-center justify-center gap-1 sm:gap-1.5 px-1 sm:px-2.5 py-1.5 min-h-[44px] rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap min-w-0 ${
                currentView === 'workout'
                  ? 'bg-emerald-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Dumbbell className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Routine</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={currentView === 'readiness'}
              onClick={() => onSelectView('readiness')}
              className={`flex items-center justify-center gap-1 sm:gap-1.5 px-1 sm:px-2.5 py-1.5 min-h-[44px] rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap min-w-0 ${
                currentView === 'readiness'
                  ? 'bg-emerald-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <HeartPulse className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Check-In</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={currentView === 'mobility'}
              onClick={() => onSelectView('mobility')}
              className={`flex items-center justify-center gap-1 sm:gap-1.5 px-1 sm:px-2.5 py-1.5 min-h-[44px] rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap min-w-0 ${
                currentView === 'mobility'
                  ? 'bg-emerald-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Activity className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Mobility</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={currentView === 'stretching'}
              onClick={() => onSelectView('stretching')}
              className={`flex items-center justify-center gap-1 sm:gap-1.5 px-1 sm:px-2.5 py-1.5 min-h-[44px] rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap min-w-0 ${
                currentView === 'stretching'
                  ? 'bg-emerald-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Stretch</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={currentView === 'progress'}
              onClick={() => onSelectView('progress')}
              className={`flex items-center justify-center gap-1 sm:gap-1.5 px-1 sm:px-2.5 py-1.5 min-h-[44px] rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap min-w-0 ${
                currentView === 'progress'
                  ? 'bg-emerald-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Progress</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={currentView === 'assessment'}
              onClick={() => onSelectView('assessment')}
              className={`flex items-center justify-center gap-1 sm:gap-1.5 px-1 sm:px-2.5 py-1.5 min-h-[44px] rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap min-w-0 ${
                currentView === 'assessment'
                  ? 'bg-emerald-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Trophy className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Assess</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={currentView === 'guide'}
              onClick={() => onSelectView('guide')}
              className={`flex items-center justify-center gap-1 sm:gap-1.5 px-1 sm:px-2.5 py-1.5 min-h-[44px] rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap min-w-0 ${
                currentView === 'guide'
                  ? 'bg-emerald-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Guide</span>
            </button>
          </nav>

          {/* Desktop Controls (Sync, Review, Progress %, Mute) */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            {/* Real-time Cloud Firestore Sync Pill */}
            {user && (
              <div
                data-testid="cloud-sync-pill"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all shadow-sm ${
                  cloudSyncStatus === 'synced'
                    ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                    : cloudSyncStatus === 'syncing'
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 animate-pulse'
                    : cloudSyncStatus === 'error'
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
                title={
                  lastCloudSyncedTime
                    ? `Cloud Synced at ${new Date(lastCloudSyncedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : 'Real-time Cloud Firestore Sync'
                }
              >
                {cloudSyncStatus === 'syncing' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                ) : cloudSyncStatus === 'synced' ? (
                  <Check className="w-3.5 h-3.5 text-cyan-400 stroke-[3]" />
                ) : (
                  <Cloud className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span>
                  {cloudSyncStatus === 'syncing'
                    ? 'Syncing Cloud...'
                    : cloudSyncStatus === 'synced'
                    ? 'Cloud Synced'
                    : cloudSyncStatus === 'error'
                    ? 'Sync Error'
                    : 'Cloud Idle'}
                </span>
              </div>
            )}

            {onSync && (
              <button
                type="button"
                onClick={onSync}
                disabled={isSyncing}
                aria-label="Sync to Google Sheets"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-60 ${
                  syncSuccessFlash
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
                    : isSyncing
                    ? 'bg-slate-900 border-slate-800 text-slate-400'
                    : 'bg-emerald-950/70 border-emerald-600/70 text-emerald-300 hover:bg-emerald-900'
                }`}
                title={lastSyncedTime ? `Last synced: ${lastSyncedTime}` : 'Sync logs to Google Sheets'}
              >
                {isSyncing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                ) : syncSuccessFlash ? (
                  <Check className="w-3.5 h-3.5 text-slate-950 stroke-[3]" />
                ) : (
                  <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                )}
                <span>{isSyncing ? 'Syncing...' : syncSuccessFlash ? 'Synced!' : 'Sync to Sheet'}</span>
              </button>
            )}

            {onOpenWeeklyEvaluation && (
              <button
                type="button"
                onClick={onOpenWeeklyEvaluation}
                aria-label="Open Weekly Evaluation"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-semibold transition-all cursor-pointer shadow-sm active:scale-95"
                title="Evaluate weekly data and comments to adapt workouts"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Weekly Review</span>
                {weeklyAdaptationCount !== undefined && weeklyAdaptationCount > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-bold">
                    {weeklyAdaptationCount}
                  </span>
                )}
              </button>
            )}

            {onOpenWorkoutHistory && (
              <button
                type="button"
                data-testid="open-workout-history-btn"
                onClick={onOpenWorkoutHistory}
                aria-label="Open Workout History & Log Editor"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all cursor-pointer shadow-sm active:scale-95"
                title="Review and edit completed workout logs or delete sessions"
              >
                <History className="w-3.5 h-3.5 text-cyan-400" />
                <span>History</span>
              </button>
            )}

            <div
              className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-mono shrink-0"
              title={`${completionPercentage}% of active session completed`}
            >
              <span className="text-slate-400 hidden sm:inline">Progress:</span>
              <span className="text-emerald-400 font-bold">{completionPercentage}%</span>
              <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden hidden sm:block">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={onToggleMute}
              aria-label={isMuted ? 'Unmute Audio Synthesizer' : 'Mute Audio Synthesizer'}
              className={`p-2 rounded-xl border transition-colors items-center justify-center cursor-pointer ${
                isMuted
                  ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
              }`}
              title={isMuted ? 'Audio Synthesizer Muted' : 'Audio Synthesizer Active'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Athlete Profile & Sign Out (Desktop) */}
            {user ? (
              <div
                data-testid="header-athlete-profile"
                className="flex items-center gap-2 pl-2 border-l border-slate-800 shrink-0"
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Athlete'}
                    className="w-7 h-7 rounded-full border border-emerald-500/50 object-cover shrink-0"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-xs border border-emerald-500/30 shrink-0">
                    {user.email?.charAt(0).toUpperCase() || 'A'}
                  </div>
                )}
                <div className="hidden xl:flex flex-col text-left">
                  <span className="text-[11px] font-bold text-slate-200 leading-none truncate max-w-[120px]">
                    {user.displayName || user.email?.split('@')[0]}
                  </span>
                  <span className="text-[9px] text-emerald-400 font-mono">Athlete Verified</span>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  aria-label="Sign Out"
                  title={`Signed in as ${user.email} (Click to Sign Out)`}
                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-400 border border-slate-800 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : isGuestBypassed && isFirebaseReady ? (
              <div
                data-testid="header-guest-badge"
                className="flex items-center gap-1.5 pl-2 border-l border-slate-800 shrink-0"
              >
                <span className="text-[10px] text-amber-400/80 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  Guest
                </span>
                <button
                  type="button"
                  onClick={logout}
                  aria-label="Lock App / Exit Guest Mode"
                  title="Lock App / Exit Guest Mode"
                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors cursor-pointer text-[10px]"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
};

export const Header = React.memo(HeaderComponent);
