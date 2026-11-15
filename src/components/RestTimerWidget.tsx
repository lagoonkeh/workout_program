import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRestTimer } from '../hooks/useRestTimer';
import { useStopClock } from '../hooks/useStopClock';
import { REST_PRESETS, type RestPreset } from '../timer/restTimer';
import {
  Play,
  Pause,
  RotateCcw,
  Plus,
  ChevronUp,
  ChevronDown,
  Clock,
  Timer,
  Volume2,
  VolumeX,
  X,
  Flag,
  Trash2,
  ExternalLink,
  Mic,
  MicOff,
  Bell,
  BellRing,
} from 'lucide-react';
import { audioSynthesizer } from '../audio/audioSynthesizer';
import { voiceAnnouncer } from '../audio/voiceAnnouncer';
import { restNotificationService, type NotificationSupportStatus } from '../timer/restNotificationService';
import type { NextSetInfo } from '../timer/watchCommands';

export type RestTimerVariant = 'docked' | 'modal' | 'inline';
export type TimerMode = 'countdown' | 'stopclock';

export interface CustomPreset {
  id: string;
  label: string;
  seconds: number;
  tier: 'Custom';
  description: string;
}

export interface RestTargetContext {
  exerciseName?: string;
  exerciseId?: string;
  completedSetNumber?: number;
  totalSets?: number;
  nextSetNumber?: number;
  nextExerciseName?: string;
  nextExerciseId?: string;
  isLastSet?: boolean;
  /** next set's exercise, set index, weight and reps: the rest-complete notification's "Set done" button */
  nextSet?: NextSetInfo | null;
}

export interface RestTimerWidgetProps {
  variant?: RestTimerVariant;
  initialDuration?: number;
  onComplete?: () => void;
  defaultExpanded?: boolean;
  className?: string;
  activePresetSeconds?: number | null;
  activeRestContext?: RestTargetContext | null;
  onClearActivePreset?: () => void;
  onClose?: () => void;
  onStartNextSet?: () => void;
}

const STORAGE_CUSTOM_PRESETS = 'workout_custom_presets_v1';
const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/18IDVdkxJnCLdC2hDYJQOcKc2OFrZCWK3bkc-N-p-3NA/edit';

export const RestTimerWidget: React.FC<RestTimerWidgetProps> = ({
  variant = 'docked',
  initialDuration = 60,
  onComplete,
  defaultExpanded = false,
  className = '',
  activePresetSeconds = null,
  activeRestContext = null,
  onClearActivePreset,
  onClose,
  onStartNextSet,
}) => {
  const { snapshot: countSnapshot, start: startCount, pause: pauseCount, resume: resumeCount, reset: resetCount, addTime } = useRestTimer();
  const { snapshot: stopSnapshot, start: startStop, pause: pauseStop, resume: resumeStop, reset: resetStop, lap: lapStop } = useStopClock();

  const [timerMode, setTimerMode] = useState<TimerMode>('countdown');
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded || variant !== 'docked');
  const [isMuted, setIsMuted] = useState<boolean>(() => audioSynthesizer.isMuted());
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(() => voiceAnnouncer.isEnabled());
  const [notifPermission, setNotifPermission] = useState<NotificationSupportStatus>(() =>
    restNotificationService.getPermission()
  );
  const spokenRestPointsRef = useRef<Set<number>>(new Set());
  const [currentRestContext, setCurrentRestContext] = useState<RestTargetContext | null>(activeRestContext ?? null);

  const handleToggleNotification = async () => {
    const res = await restNotificationService.requestPermission();
    setNotifPermission(res);
  };

  // Sync external rest context if updated
  useEffect(() => {
    if (activeRestContext) {
      setCurrentRestContext(activeRestContext);
    }
  }, [activeRestContext]);

  // Sync idle timer duration and context with the active exercise card's workout timer
  useEffect(() => {
    if (countSnapshot.state === 'IDLE' && initialDuration > 0) {
      resetCount(initialDuration);
      if (activeRestContext) {
        setCurrentRestContext(activeRestContext);
      }
    }
  }, [initialDuration, countSnapshot.state, resetCount, activeRestContext]);

  // Cleanup wake lock and document title on unmount
  useEffect(() => {
    return () => {
      restNotificationService.releaseWakeLock();
      restNotificationService.resetDocumentTitle();
    };
  }, []);

  // Voice countdown announcements, lock-screen notifications, haptics & wake-lock
  useEffect(() => {
    if (countSnapshot.state === 'RUNNING') {
      restNotificationService.acquireWakeLock();
      restNotificationService.updateDocumentTitle(countSnapshot.remainingSeconds, false);
      const s = countSnapshot.remainingSeconds;

      // Multi-stage haptic cues for mobile athletes
      if (s === 10) {
        restNotificationService.triggerHaptic('warning');
      } else if ([3, 2, 1].includes(s)) {
        restNotificationService.triggerHaptic('tick');
      }

      // Voice countdown announcements
      if (voiceEnabled && [30, 10, 3, 2, 1].includes(s) && !spokenRestPointsRef.current.has(s)) {
        spokenRestPointsRef.current.add(s);
        voiceAnnouncer.announceRestCountdown(s);
      }
    } else if (countSnapshot.state === 'COMPLETED') {
      restNotificationService.releaseWakeLock();
      restNotificationService.updateDocumentTitle(0, true);

      if (!spokenRestPointsRef.current.has(0)) {
        spokenRestPointsRef.current.add(0);
        if (voiceEnabled) {
          voiceAnnouncer.announceRestComplete(currentRestContext || undefined);
        }
        // Multi-frequency haptic feedback for mobile devices (e.g. Pixel 9 Pro XL)
        restNotificationService.triggerHaptic('complete');
        // Lock-Screen / Background System Notification
        restNotificationService.sendRestCompleteNotification(currentRestContext);
      }
    } else if (countSnapshot.state === 'IDLE') {
      spokenRestPointsRef.current.clear();
      restNotificationService.releaseWakeLock();
      restNotificationService.resetDocumentTitle();
    } else if (countSnapshot.state === 'PAUSED') {
      restNotificationService.releaseWakeLock();
    }
  }, [countSnapshot.state, countSnapshot.remainingSeconds, voiceEnabled, currentRestContext]);

  // Continuous Overtime tracking after countdown completion (keeps timer running until stopped)
  const [overtimeSeconds, setOvertimeSeconds] = useState<number>(0);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    if (countSnapshot.state === 'COMPLETED') {
      intervalId = setInterval(() => {
        setOvertimeSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setOvertimeSeconds(0);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [countSnapshot.state]);

  // Custom presets state
  const [customPresets, setCustomPresets] = useState<CustomPreset[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_CUSTOM_PRESETS);
      if (stored) return JSON.parse(stored);
    } catch {
      // safe fallback
    }
    return [];
  });

  const [isCreatingPreset, setIsCreatingPreset] = useState<boolean>(false);
  const [newPresetSeconds, setNewPresetSeconds] = useState<string>('45');
  const [newPresetLabel, setNewPresetLabel] = useState<string>('');

  // Handle external trigger (e.g. from ExerciseCard set completion)
  useEffect(() => {
    if (activePresetSeconds && activePresetSeconds > 0) {
      setTimerMode('countdown');
      spokenRestPointsRef.current.clear();
      const targetCtx = activeRestContext || currentRestContext;
      if (activeRestContext) {
        setCurrentRestContext(activeRestContext);
      }
      startCount(activePresetSeconds);
      if (voiceEnabled) {
        voiceAnnouncer.announceRestStart(activePresetSeconds, targetCtx || undefined);
      }
      setIsExpanded(true);
      onClearActivePreset?.();
    }
  }, [activePresetSeconds, activeRestContext, currentRestContext, startCount, voiceEnabled, onClearActivePreset]);

  // Handle completion notification
  useEffect(() => {
    if (countSnapshot.state === 'COMPLETED') {
      onComplete?.();
    }
  }, [countSnapshot.state, onComplete]);

  // Combined Presets
  const allPresets = useMemo(() => {
    return [...REST_PRESETS, ...customPresets];
  }, [customPresets]);

  const handleSaveCustomPreset = (e: React.FormEvent) => {
    e.preventDefault();
    const secs = parseInt(newPresetSeconds, 10);
    if (isNaN(secs) || secs <= 0) return;

    const label = newPresetLabel.trim() || `${secs}s`;
    const newPreset: CustomPreset = {
      id: `custom_${Date.now()}`,
      label,
      seconds: secs,
      tier: 'Custom',
      description: 'Custom saved preset timer',
    };

    const updated = [...customPresets, newPreset];
    setCustomPresets(updated);
    try {
      localStorage.setItem(STORAGE_CUSTOM_PRESETS, JSON.stringify(updated));
    } catch {
      // safe fallback
    }
    setIsCreatingPreset(false);
    setNewPresetLabel('');
    startCount(secs);
  };

  const handleDeleteCustomPreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = customPresets.filter((p) => p.id !== id);
    setCustomPresets(updated);
    try {
      localStorage.setItem(STORAGE_CUSTOM_PRESETS, JSON.stringify(updated));
    } catch {
      // safe fallback
    }
  };

  // SVG Constants for Countdown
  const RADIUS = 54;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS; // ~339.292
  const progressRatio =
    countSnapshot.durationSeconds > 0 ? countSnapshot.remainingSeconds / countSnapshot.durationSeconds : 0;
  const strokeDashoffset = CIRCUMFERENCE * (1 - progressRatio);

  const formatCountdown = (totalSeconds: number): string => {
    const mins = Math.floor(Math.max(0, totalSeconds) / 60);
    const secs = Math.max(0, totalSeconds) % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const formatStopClock = (totalMs: number): string => {
    const mins = Math.floor(totalMs / 60000);
    const secs = Math.floor((totalMs % 60000) / 1000);
    const tenths = Math.floor((totalMs % 1000) / 100);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${tenths}`;
  };

  const getRingColor = (): string => {
    switch (countSnapshot.state) {
      case 'RUNNING':
        return countSnapshot.remainingSeconds <= 3
          ? 'text-amber-400 stroke-amber-400'
          : 'text-cyan-400 stroke-cyan-400';
      case 'PAUSED':
        return 'text-amber-500 stroke-amber-500';
      case 'COMPLETED':
        return 'text-emerald-400 stroke-emerald-400';
      case 'IDLE':
      default:
        return 'text-slate-500 stroke-slate-500';
    }
  };

  const getStatusBadge = () => {
    if (timerMode === 'stopclock') {
      switch (stopSnapshot.state) {
        case 'RUNNING':
          return (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              Timing Hold
            </span>
          );
        case 'PAUSED':
          return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-300 border border-amber-800">
              Stop Clock Paused
            </span>
          );
        default:
          return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
              Stop Clock Ready
            </span>
          );
      }
    }

    switch (countSnapshot.state) {
      case 'RUNNING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-cyan-950/80 text-cyan-300 border border-cyan-800">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            Resting
          </span>
        );
      case 'PAUSED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-300 border border-amber-800">
            Paused
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800">
            {overtimeSeconds > 0 ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>Overtime: +{formatCountdown(overtimeSeconds)} (Running)</span>
              </>
            ) : (
              'Set Ready!'
            )}
          </span>
        );
      case 'IDLE':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            Ready
          </span>
        );
    }
  };

  const toggleMute = () => {
    const newMuted = !isMuted;
    audioSynthesizer.setMuted(newMuted);
    setIsMuted(newMuted);
  };

  const toggleVoice = () => {
    const nextVoice = !voiceEnabled;
    voiceAnnouncer.setEnabled(nextVoice);
    setVoiceEnabled(nextVoice);
  };

  const handlePresetSelect = (preset: RestPreset | CustomPreset) => {
    setTimerMode('countdown');
    spokenRestPointsRef.current.clear();
    startCount(preset.seconds);
    if (voiceEnabled) {
      voiceAnnouncer.announceRestStart(preset.seconds, currentRestContext || undefined);
    }
  };

  const handleStartNextSet = () => {
    resetCount();
    setOvertimeSeconds(0);
    setCurrentRestContext(null);
    onStartNextSet?.();
  };

  // Minimized bottom pill view (Docked mode only)
  if (variant === 'docked' && !isExpanded) {
    const isStopClockActive = timerMode === 'stopclock' || stopSnapshot.state !== 'IDLE';
    const isRunning = isStopClockActive ? stopSnapshot.state === 'RUNNING' : countSnapshot.state === 'RUNNING';
    const isPaused = isStopClockActive ? stopSnapshot.state === 'PAUSED' : countSnapshot.state === 'PAUSED';

    // Idle: a small start / expand button pair, so the timer doesn't cover the page when not in use
    if (!isStopClockActive && countSnapshot.state === 'IDLE') {
      return (
        <div
          data-testid="rest-timer-idle-pill"
          className={`fixed bottom-14 right-3 md:bottom-4 sm:right-4 z-40 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl p-1.5 flex items-center gap-1 ${className}`}
        >
          <span className="sr-only">Rest timer idle</span>
          <button
            onClick={() => startCount(initialDuration)}
            aria-label="Start Timer"
            title={`Start a ${formatCountdown(initialDuration)} rest`}
            className="p-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Clock className="w-4 h-4" />
            <span className="font-mono text-xs font-bold">{formatCountdown(initialDuration)}</span>
          </button>
          <button
            onClick={() => setIsExpanded(true)}
            aria-label="Expand Rest Timer"
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
        </div>
      );
    }

    return (
      <div
        className={`fixed bottom-14 right-3 md:bottom-4 sm:right-4 z-40 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl p-2 sm:p-2.5 flex items-center gap-2.5 sm:gap-3 transition-all duration-300 hover:border-slate-600 ${className}`}
      >
        {/* Mini progress or clock icon */}
        <div className="relative w-10 h-10 flex items-center justify-center">
          {isStopClockActive ? (
            <div className={`p-2 rounded-xl ${isRunning ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-slate-800 text-slate-400'}`}>
              <Timer className="w-5 h-5 animate-pulse" />
            </div>
          ) : (
            <svg className="w-10 h-10 -rotate-90 transform" viewBox="0 0 128 128">
              <circle
                cx="64"
                cy="64"
                r={RADIUS}
                fill="transparent"
                strokeWidth="12"
                className="stroke-slate-800"
              />
              <circle
                cx="64"
                cy="64"
                r={RADIUS}
                fill="transparent"
                strokeWidth="12"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className={`transition-all duration-150 ${getRingColor()}`}
              />
            </svg>
          )}
          {!isStopClockActive && <Clock className="w-4 h-4 text-slate-400 absolute" />}
        </div>

        {/* Digital Time & Status */}
        <div className="flex flex-col cursor-pointer" onClick={() => setIsExpanded(true)}>
          <span
            className={`font-mono text-lg font-bold tracking-wider ${
              countSnapshot.state === 'COMPLETED' ? 'text-emerald-400 animate-pulse' : 'text-slate-100'
            }`}
          >
            {isStopClockActive
              ? formatStopClock(stopSnapshot.elapsedMs).slice(0, 5)
              : countSnapshot.state === 'COMPLETED'
              ? overtimeSeconds > 0
                ? `+${formatCountdown(overtimeSeconds)}`
                : '00:00'
              : formatCountdown(countSnapshot.remainingSeconds)}
          </span>
          <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1 truncate max-w-[140px] sm:max-w-[200px]">
            {isStopClockActive ? (
              <span className="capitalize">Stop Clock ({stopSnapshot.state.toLowerCase()})</span>
            ) : countSnapshot.state === 'COMPLETED' ? (
              <span className="text-emerald-300 font-bold flex items-center gap-1 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
                <span className="truncate">
                  {currentRestContext?.nextExerciseName
                    ? `${currentRestContext.nextExerciseName} Ready!`
                    : currentRestContext?.nextSetNumber
                    ? `Set ${currentRestContext.nextSetNumber} Ready!`
                    : overtimeSeconds > 0
                    ? `Overtime (+${overtimeSeconds}s)`
                    : 'Set Ready!'}
                </span>
              </span>
            ) : countSnapshot.state === 'RUNNING' && currentRestContext?.nextExerciseName ? (
              <span className="text-cyan-300 truncate">
                Next: {currentRestContext.nextExerciseName}
              </span>
            ) : countSnapshot.state === 'RUNNING' && currentRestContext?.nextSetNumber ? (
              <span className="text-cyan-300 truncate">
                Next: Set {currentRestContext.nextSetNumber}
              </span>
            ) : (
              <span className="capitalize">{countSnapshot.state.toLowerCase()}</span>
            )}
          </span>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-1 pl-1 border-l border-slate-800">
          {isRunning ? (
            <button
              onClick={isStopClockActive ? pauseStop : pauseCount}
              aria-label="Pause Timer"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 transition-colors cursor-pointer"
            >
              <Pause className="w-4 h-4" />
            </button>
          ) : isPaused ? (
            <button
              onClick={isStopClockActive ? resumeStop : resumeCount}
              aria-label="Resume Timer"
              className="p-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white transition-colors cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
            </button>
          ) : (
            <button
              onClick={isStopClockActive ? startStop : () => startCount(initialDuration)}
              aria-label="Start Timer"
              className="p-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white transition-colors cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
            </button>
          )}

          <button
            onClick={() => setIsExpanded(true)}
            aria-label="Expand Rest Timer"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Expanded View (Full Docked Drawer, Modal, or Inline Widget)
  return (
    <div
      className={`
      ${
        variant === 'docked'
          ? 'fixed bottom-0 left-0 right-0 z-40 bg-slate-900/98 backdrop-blur-xl border-t border-slate-800 shadow-2xl p-3 sm:p-4 max-w-5xl mx-auto rounded-t-2xl sm:rounded-t-3xl transition-transform duration-300 max-h-[92vh] overflow-y-auto'
          : variant === 'modal'
          ? 'fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 max-h-screen overflow-y-auto'
          : 'bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-5 shadow-xl'
      } 
      ${className}
    `}
    >
      <div
        className={
          variant === 'modal'
            ? 'bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 max-w-xl w-full shadow-2xl'
            : 'w-full'
        }
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl border ${timerMode === 'stopclock' ? 'bg-emerald-950/60 border-emerald-800/50 text-emerald-400' : 'bg-cyan-950/60 border-cyan-800/50 text-cyan-400'}`}>
              {timerMode === 'stopclock' ? <Timer className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                {timerMode === 'stopclock' ? 'Stop Clock (Stopwatch)' : 'Rest Interval Timer'}
                {getStatusBadge()}
              </h3>
              <p className="text-xs text-slate-400">
                {timerMode === 'stopclock' ? 'Precision Isometric & Hold Timer' : 'GZCL Multi-Tier Precision Recovery'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Google Sheets Backup Link */}
            <a
              href={GOOGLE_SHEET_URL}
              target="_blank"
              rel="noopener noreferrer"
              title="Open Google Sheet Backup"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 transition-colors flex items-center gap-1 text-xs font-semibold px-2.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sheets</span>
            </a>

            {/* Voice Countdown Toggle */}
            <button
              type="button"
              onClick={toggleVoice}
              title={voiceEnabled ? 'Voice Countdown Active ("30s, 10s, 3, 2, 1, Next Set")' : 'Voice Countdown Muted'}
              aria-label={voiceEnabled ? 'Disable Voice Countdown' : 'Enable Voice Countdown'}
              className={`p-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold px-2.5 border ${
                voiceEnabled
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/20'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              {voiceEnabled ? (
                <Mic className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              ) : (
                <MicOff className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span className="hidden sm:inline">Voice {voiceEnabled ? 'ON' : 'OFF'}</span>
            </button>

            {/* Lock-Screen & Background Notifications Toggle */}
            {restNotificationService.isSupported() && (
              <button
                type="button"
                data-testid="rest-notification-toggle-btn"
                onClick={handleToggleNotification}
                title={
                  notifPermission === 'granted'
                    ? 'Background & lock-screen rest notifications active (Click to refresh)'
                    : 'Enable background & lock-screen rest notifications'
                }
                aria-label={notifPermission === 'granted' ? 'Disable Lock-Screen Notifications' : 'Enable Lock-Screen Notifications'}
                className={`p-2 min-h-[38px] rounded-xl transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold px-2.5 border ${
                  notifPermission === 'granted'
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/20'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                {notifPermission === 'granted' ? (
                  <BellRing className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Bell className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span className="hidden sm:inline">Alerts {notifPermission === 'granted' ? 'ON' : 'OFF'}</span>
              </button>
            )}

            <button
              onClick={toggleMute}
              title={isMuted ? 'Unmute Audio Pings' : 'Mute Audio Pings'}
              aria-label={isMuted ? 'Unmute Audio' : 'Mute Audio'}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-red-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-cyan-400" />
              )}
            </button>

            {variant === 'docked' ? (
              <button
                onClick={() => setIsExpanded(false)}
                aria-label="Minimize Timer"
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            ) : onClose ? (
              <button
                onClick={onClose}
                aria-label="Close Timer"
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            ) : null}
          </div>
        </div>

        {/* Mode Switch Tabs */}
        <div className="flex items-center justify-center mb-5">
          <div className="inline-flex p-1 bg-slate-950/80 rounded-2xl border border-slate-800">
            <button
              onClick={() => setTimerMode('countdown')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                timerMode === 'countdown'
                  ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-950/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clock className="w-4 h-4" /> Countdown Presets
            </button>
            <button
              onClick={() => setTimerMode('stopclock')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                timerMode === 'stopclock'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Timer className="w-4 h-4" /> Stop Clock
            </button>
          </div>
        </div>

        {/* MODE 1: STOP CLOCK (STOPWATCH) */}
        {timerMode === 'stopclock' ? (
          <div className="flex flex-col items-center">
            {/* Stopwatch Large Display */}
            <div className="w-full max-w-sm bg-slate-950/70 border border-slate-800/80 rounded-3xl p-6 text-center shadow-inner mb-5">
              <div className="font-mono text-4xl sm:text-5xl font-black text-emerald-400 tracking-wider select-none drop-shadow">
                {formatStopClock(stopSnapshot.elapsedMs)}
              </div>
              <p className="text-xs text-slate-400 mt-2 font-medium">
                Hold / Set Duration • Precision 1/10s
              </p>
            </div>

            {/* Stop Clock Controls */}
            <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
              {stopSnapshot.state === 'RUNNING' ? (
                <button
                  onClick={pauseStop}
                  className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 active:scale-95 text-white font-bold flex items-center gap-2 shadow-lg shadow-amber-950/40 transition-all cursor-pointer"
                >
                  <Pause className="w-4 h-4 fill-white" /> Pause
                </button>
              ) : stopSnapshot.state === 'PAUSED' ? (
                <button
                  onClick={resumeStop}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold flex items-center gap-2 shadow-lg shadow-emerald-950/40 transition-all cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-white" /> Resume
                </button>
              ) : (
                <button
                  onClick={startStop}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold flex items-center gap-2 shadow-lg shadow-emerald-950/40 transition-all cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-white" /> Start Clock
                </button>
              )}

              {/* Lap / Split Button */}
              <button
                onClick={lapStop}
                disabled={stopSnapshot.state === 'IDLE'}
                title="Record Lap / Hold Split"
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 font-semibold flex items-center gap-1.5 border border-slate-700 transition-all active:scale-95 cursor-pointer"
              >
                <Flag className="w-4 h-4 text-emerald-400" /> Lap
              </button>

              {/* Reset Button */}
              <button
                onClick={resetStop}
                title="Reset Stop Clock"
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 transition-all border border-slate-700 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Recorded Laps / Splits */}
            {stopSnapshot.laps.length > 0 && (
              <div className="w-full max-w-md bg-slate-950/60 rounded-2xl border border-slate-800/80 p-3 max-h-40 overflow-y-auto">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 block mb-2">
                  Recorded Splits / Laps ({stopSnapshot.laps.length})
                </span>
                <div className="space-y-1.5">
                  {stopSnapshot.laps.map((lap) => (
                    <div
                      key={lap.lapNumber}
                      className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800/50"
                    >
                      <span className="font-semibold text-slate-300">
                        Lap {lap.lapNumber}
                      </span>
                      <span className="font-mono text-emerald-400 font-bold">
                        +{lap.lapTimeSeconds}s
                      </span>
                      <span className="font-mono text-slate-400">
                        {lap.totalTimeSeconds}s total
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* MODE 2: COUNTDOWN TIMER & PRESET CREATOR */
          <div className="flex flex-col">
            {/* Rest Complete Next Set Ready Banner */}
            {countSnapshot.state === 'COMPLETED' && (
              <div
                data-testid="rest-completed-banner"
                className="w-full mb-5 p-4 rounded-2xl bg-gradient-to-r from-emerald-950/90 via-emerald-900/60 to-emerald-950/90 border-2 border-emerald-500/80 shadow-2xl shadow-emerald-950/60 flex flex-col sm:flex-row items-center justify-between gap-3 animate-pulse"
              >
                <div className="flex items-center gap-3 text-center sm:text-left">
                  <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0">
                    <Clock className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-emerald-300 font-black text-base flex items-center justify-center sm:justify-start gap-2">
                      <span>Time to Start Next Set!</span>
                      {overtimeSeconds > 0 && (
                        <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-900 text-emerald-200 border border-emerald-700">
                          +{formatCountdown(overtimeSeconds)}
                        </span>
                      )}
                    </div>
                    <p className="text-white text-xs font-semibold mt-0.5">
                      {currentRestContext?.nextExerciseName
                        ? `Next Movement: ${currentRestContext.nextExerciseName}`
                        : currentRestContext?.nextSetNumber && currentRestContext?.exerciseName
                        ? `Ready for Set ${currentRestContext.nextSetNumber} of ${currentRestContext.exerciseName}`
                        : currentRestContext?.exerciseName
                        ? `Ready for next set of ${currentRestContext.exerciseName}`
                        : 'Rest interval complete — ready for your next set.'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleStartNextSet}
                  className="w-full sm:w-auto px-5 py-2.5 min-h-[44px] rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-950/60 transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Play className="w-4 h-4 fill-slate-950 text-slate-950" />
                  {currentRestContext?.nextExerciseName
                    ? `Start ${currentRestContext.nextExerciseName}`
                    : currentRestContext?.nextSetNumber
                    ? `Start Set ${currentRestContext.nextSetNumber}`
                    : 'Start Next Set'}
                </button>
              </div>
            )}

            {/* Upcoming Next Set Pill during Rest */}
            {countSnapshot.state === 'RUNNING' && currentRestContext && (
              <div
                data-testid="rest-upcoming-target-banner"
                className="w-full mb-4 px-3.5 py-2 rounded-xl bg-cyan-950/50 border border-cyan-800/50 flex items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping shrink-0" />
                  <span className="text-slate-400 font-medium">Up Next:</span>
                  <span className="text-cyan-200 font-bold truncate">
                    {currentRestContext.nextExerciseName
                      ? `Next: ${currentRestContext.nextExerciseName}`
                      : currentRestContext.nextSetNumber && currentRestContext.exerciseName
                      ? `Set ${currentRestContext.nextSetNumber} · ${currentRestContext.exerciseName}`
                      : currentRestContext.exerciseName}
                  </span>
                </div>
                {currentRestContext.completedSetNumber && currentRestContext.totalSets && (
                  <span className="text-slate-400 font-mono text-[11px] whitespace-nowrap">
                    Set {currentRestContext.completedSetNumber}/{currentRestContext.totalSets} Done
                  </span>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              {/* Circular SVG & Digital Readout */}
              <div className="flex flex-col items-center justify-center">
                <div className="relative w-44 h-44 flex items-center justify-center">
                  <svg className="w-44 h-44 -rotate-90 transform" viewBox="0 0 128 128">
                    {/* Track background */}
                    <circle
                      cx="64"
                      cy="64"
                      r={RADIUS}
                      fill="transparent"
                      strokeWidth="8"
                      className="stroke-slate-800"
                    />
                    {/* Dynamic animated progress stroke */}
                    <circle
                      cx="64"
                      cy="64"
                      r={RADIUS}
                      fill="transparent"
                      strokeWidth="8"
                      strokeDasharray={CIRCUMFERENCE}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      className={`transition-[stroke-dashoffset] duration-150 ease-out ${getRingColor()}`}
                    />
                  </svg>

                  {/* Inner Center Display */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center select-none text-center px-2">
                    <span
                      data-testid="rest-timer-display"
                      className={`font-mono text-3xl font-extrabold tracking-wider drop-shadow-md transition-colors ${
                        countSnapshot.state === 'COMPLETED' && overtimeSeconds > 0
                          ? 'text-emerald-400 animate-pulse'
                          : 'text-white'
                      }`}
                    >
                      {countSnapshot.state === 'COMPLETED' && overtimeSeconds > 0
                        ? `+${formatCountdown(overtimeSeconds)}`
                        : formatCountdown(countSnapshot.remainingSeconds)}
                    </span>
                    <span className="text-xs text-slate-400 mt-1 font-medium">
                      {countSnapshot.state === 'COMPLETED' && overtimeSeconds > 0
                        ? 'Overtime: Running until stopped'
                        : countSnapshot.state === 'COMPLETED' && currentRestContext?.nextExerciseName
                        ? `Ready for ${currentRestContext.nextExerciseName}`
                        : countSnapshot.state === 'COMPLETED' && currentRestContext?.nextSetNumber
                        ? `Ready for Set ${currentRestContext.nextSetNumber}`
                        : `Total: ${countSnapshot.durationSeconds}s`}
                    </span>
                  </div>
                </div>

              {/* Primary Action Buttons */}
              <div className="flex items-center gap-3 mt-4">
                {countSnapshot.state === 'RUNNING' ? (
                  <button
                    onClick={pauseCount}
                    className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 active:scale-95 text-white font-semibold flex items-center gap-2 shadow-lg shadow-amber-950/40 transition-all cursor-pointer"
                  >
                    <Pause className="w-4 h-4 fill-white" /> Pause
                  </button>
                ) : countSnapshot.state === 'PAUSED' ? (
                  <button
                    onClick={resumeCount}
                    className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 active:scale-95 text-white font-semibold flex items-center gap-2 shadow-lg shadow-cyan-950/40 transition-all cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-white" /> Resume
                  </button>
                ) : (
                  <button
                    onClick={() => startCount(countSnapshot.durationSeconds || initialDuration)}
                    className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 active:scale-95 text-white font-semibold flex items-center gap-2 shadow-lg shadow-cyan-950/40 transition-all cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-white" /> Start
                  </button>
                )}

                <button
                  onClick={() => resetCount()}
                  title="Reset Timer"
                  aria-label="Reset Timer"
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 transition-all border border-slate-700 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                {/* Quick Time Bumpers */}
                <button
                  onClick={() => addTime(15)}
                  title="Add 15 Seconds"
                  aria-label="Add 15 Seconds"
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-all active:scale-95 flex items-center gap-0.5 cursor-pointer"
                >
                  <Plus className="w-3 h-3 text-cyan-400" /> 15s
                </button>

                <button
                  onClick={() => addTime(30)}
                  title="Add 30 Seconds"
                  aria-label="Add 30 Seconds"
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-all active:scale-95 flex items-center gap-0.5 cursor-pointer"
                >
                  <Plus className="w-3 h-3 text-cyan-400" /> 30s
                </button>
              </div>
            </div>

            {/* Presets Grid & Preset Creator */}
            <div className="flex flex-col gap-2.5">
              {/* Synced Current Exercise Card Timer */}
              {currentRestContext?.exerciseName && !currentRestContext.exerciseName.includes('TNT') && (
                <button
                  type="button"
                  data-testid="sync-current-exercise-timer-btn"
                  onClick={() => {
                    spokenRestPointsRef.current.clear();
                    startCount(initialDuration);
                    if (voiceEnabled) {
                      voiceAnnouncer.announceRestStart(initialDuration, currentRestContext || undefined);
                    }
                  }}
                  className="p-3 rounded-xl bg-gradient-to-r from-cyan-950/70 via-slate-900 to-cyan-950/50 border border-cyan-500/40 hover:border-cyan-400 text-left flex items-center justify-between gap-2.5 transition-all cursor-pointer group shadow-md"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        ⚡ Active Exercise Rest
                      </span>
                      <span className="text-xs font-bold text-white truncate">
                        {currentRestContext.exerciseName}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 truncate">
                      {currentRestContext.nextSetNumber
                        ? `Rest interval before Set ${currentRestContext.nextSetNumber}`
                        : `Prescribed recovery timer for ${currentRestContext.exerciseName}`}
                    </p>
                  </div>
                  <span className="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-mono text-xs font-black shadow-sm group-hover:scale-105 transition-transform shrink-0">
                    {initialDuration}s ({formatCountdown(initialDuration)})
                  </span>
                </button>
              )}

              {/* 1-Tap TNT Isometric Analgesia Protocol Banner */}
              <div
                data-testid="tnt-analgesia-protocol-banner"
                className="p-3 rounded-xl bg-gradient-to-r from-rose-950/60 via-slate-900 to-rose-950/40 border border-rose-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 shadow-md"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      🔬 TNT Protocol
                    </span>
                    <span className="text-xs font-bold text-white">
                      Tendon Isometric Analgesia (Dr. Ebonie Rio)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    5 × 45s holds @ 70 percent MVC + 2m rest induces ~45 min localized cortical pain relief.
                  </p>
                </div>
                <button
                  type="button"
                  data-testid="tnt-analgesia-quick-btn"
                  onClick={() => {
                    spokenRestPointsRef.current.clear();
                    setCurrentRestContext({
                      exerciseName: 'TNT Isometric Quadriceps / Patellar Hold',
                      completedSetNumber: 1,
                      totalSets: 5,
                      nextSetNumber: 2,
                    });
                    startCount(120);
                    if (voiceEnabled) {
                      voiceAnnouncer.announceRestStart(120, {
                        exerciseName: 'TNT Isometric Hold',
                        nextSetNumber: 2,
                      });
                    }
                  }}
                  className="w-full sm:w-auto px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 active:scale-95 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Play className="w-3.5 h-3.5 fill-white text-white" />
                  <span>1-Tap 2m TNT Rest</span>
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Presets ({allPresets.length})
                </span>
                <button
                  onClick={() => setIsCreatingPreset(!isCreatingPreset)}
                  className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {isCreatingPreset ? 'Cancel' : 'Create Preset'}
                </button>
              </div>

              {/* Inline Create Preset Form */}
              {isCreatingPreset && (
                <form
                  onSubmit={handleSaveCustomPreset}
                  className="p-3 rounded-xl bg-slate-950/90 border border-cyan-800/60 flex flex-col gap-2 shadow-lg"
                >
                  <span className="text-xs font-semibold text-cyan-300">New Custom Preset Timer</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Duration (Seconds)</label>
                      <input
                        type="number"
                        min="5"
                        max="1800"
                        value={newPresetSeconds}
                        onChange={(e) => setNewPresetSeconds(e.target.value)}
                        placeholder="e.g. 45"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Label (Optional)</label>
                      <input
                        type="text"
                        value={newPresetLabel}
                        onChange={(e) => setNewPresetLabel(e.target.value)}
                        placeholder="e.g. McGill Plank"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-1.5 mt-1 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-xs font-bold text-white transition-colors cursor-pointer"
                  >
                    Save & Start Preset
                  </button>
                </form>
              )}

              {/* Presets Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-60 overflow-y-auto pr-1">
                {allPresets.map((preset) => {
                  const isActive = countSnapshot.durationSeconds === preset.seconds;
                  let badgeClass = 'border-slate-700 text-slate-300 hover:bg-slate-800';

                  if (preset.tier === 'Custom') {
                    badgeClass = isActive
                      ? 'border-teal-500 bg-teal-950/60 text-teal-200 shadow-md shadow-teal-950/40'
                      : 'border-teal-800/40 text-teal-300/80 hover:bg-teal-950/30';
                  } else if (preset.tier === 'Effective Reps') {
                    badgeClass = isActive
                      ? 'border-purple-500 bg-purple-950/60 text-purple-200 shadow-md shadow-purple-950/40'
                      : 'border-purple-800/40 text-purple-300/80 hover:bg-purple-950/30';
                  } else if (preset.tier === 'Tier 3') {
                    badgeClass = isActive
                      ? 'border-emerald-500 bg-emerald-950/60 text-emerald-200 shadow-md shadow-emerald-950/40'
                      : 'border-emerald-800/40 text-emerald-300/80 hover:bg-emerald-950/30';
                  } else if (preset.tier === 'Tier 2') {
                    badgeClass = isActive
                      ? 'border-blue-500 bg-blue-950/60 text-blue-200 shadow-md shadow-blue-950/40'
                      : 'border-blue-800/40 text-blue-300/80 hover:bg-blue-950/30';
                  } else if (preset.tier === 'TNT Protocol') {
                    badgeClass = isActive
                      ? 'border-rose-500 bg-rose-950/60 text-rose-200 shadow-md shadow-rose-950/40'
                      : 'border-rose-800/40 text-rose-300/80 hover:bg-rose-950/30';
                  } else if (preset.tier === 'Tier 1') {
                    badgeClass = isActive
                      ? 'border-amber-500 bg-amber-950/60 text-amber-200 shadow-md shadow-amber-950/40'
                      : 'border-amber-800/40 text-amber-300/80 hover:bg-amber-950/30';
                  }

                  return (
                    <button
                      key={preset.id}
                      data-testid={`preset-btn-${preset.id}`}
                      aria-label={`Select ${preset.label} preset`}
                      onClick={() => handlePresetSelect(preset)}
                      className={`p-2.5 rounded-xl border text-left transition-all active:scale-95 flex flex-col justify-between cursor-pointer relative group ${badgeClass}`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-mono text-sm font-bold truncate">{preset.label}</span>
                        <span className="text-[9px] font-semibold uppercase px-1.5 py-0.2 rounded bg-slate-900/80 text-slate-400">
                          {preset.tier === 'Custom' ? 'Custom' : preset.tier === 'Effective Reps' ? 'ER' : preset.tier === 'TNT Protocol' ? 'TNT' : preset.tier.replace('Tier ', 'T')}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 truncate mt-1">
                        {preset.description}
                      </span>

                      {/* Delete icon for Custom presets */}
                      {preset.tier === 'Custom' && (
                        <div
                          onClick={(e) => handleDeleteCustomPreset(preset.id, e)}
                          title="Delete Custom Preset"
                          className="absolute top-1 right-1 p-1 rounded-md text-red-400 hover:bg-red-950/50 opacity-70 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3 h-3" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
);
};
