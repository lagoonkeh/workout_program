import React, { useState, useEffect, useRef } from 'react';
import { TempoMetronome, tryParseTempo, type MetronomeSnapshot } from '../timer/tempoMetronome';
import { audioSynthesizer } from '../audio/audioSynthesizer';
import { voiceAnnouncer } from '../audio/voiceAnnouncer';
import { ExerciseDiagram } from './ExerciseDiagram';
import { EXERCISE_VISUALS, type DiagramType } from '../domain/exerciseVisualsData';
import { Play, Pause, Square, Volume2, VolumeX, CheckCircle, Flame, X, Mic, MicOff } from 'lucide-react';

export interface TempoMetronomeWidgetProps {
  initialTempo?: string;
  initialTargetReps?: number;
  autoStart?: boolean;
  exerciseId?: string;
  diagramType?: DiagramType;
  onRepComplete?: (repNumber: number, targetReps: number) => void;
  onSetComplete?: (totalReps: number) => void;
  onClose?: () => void;
  className?: string;
}

const TEMPO_PRESETS = [
  { tempo: '30X1', name: 'Standard Controlled', desc: '3s Lower, Explode Up, 1s Squeeze' },
  { tempo: '31X1', name: 'Knee & Tendon Rehab', desc: '3s Lower, 1s Bottom Pause, Explode Up' },
  { tempo: '5083', name: '90/90 Diaphragmatic Breathing', desc: '5s Inhale, 0s, 8s Exhale, 3s Hold' },
  { tempo: '4010', name: 'Eccentric Hypertrophy', desc: '4s Slow Lower, 1s Controlled Up' },
  { tempo: '2011', name: 'Fluid Hypertrophy', desc: '2s Lower, 1s Up, 1s Top Hold' },
  { tempo: '3012', name: 'Peak Contraction', desc: '3s Lower, 1s Up, 2s Peak Squeeze' },
  { tempo: 'HOLD-10', name: '10s Isometric Hold', desc: 'Bird-Dog & Core Stiffness (10s)' },
  { tempo: 'HOLD-25', name: 'L-Sit Compression', desc: '15–25s Core Compression Hold' },
  { tempo: 'HOLD-45', name: 'TNT Isometric Analgesia', desc: '5x45s Holds — Auditory Paced Tendon Pain Relief' },
  { tempo: 'HOLD-60', name: 'Biering-Sørensen Extensor', desc: '45–60s Back Extensor Endurance' },
];

export const TempoMetronomeWidget: React.FC<TempoMetronomeWidgetProps> = ({
  initialTempo = '30X1',
  initialTargetReps = 10,
  autoStart = false,
  exerciseId,
  diagramType,
  onRepComplete,
  onSetComplete,
  onClose,
  className = '',
}) => {
  const metronomeRef = useRef<TempoMetronome | null>(null);
  const [snapshot, setSnapshot] = useState<MetronomeSnapshot | null>(null);
  const [customInput, setCustomInput] = useState<string>(initialTempo);
  const [inputError, setInputError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(() => voiceAnnouncer.isEnabled());
  const [isCompletedSet, setIsCompletedSet] = useState<boolean>(false);

  useEffect(() => {
    const metronome = new TempoMetronome({
      audioSynthesizer,
      soundEnabled: true,
      voiceAnnouncer,
      voiceEnabled,
      tickIntervalMs: 50,
    });
    metronomeRef.current = metronome;

    const unsubState = metronome.subscribe((snap) => {
      setSnapshot(snap);
    });

    const unsubRep = metronome.onRepComplete((rep, target) => {
      onRepComplete?.(rep, target);
    });

    const unsubSet = metronome.onSetComplete((reps) => {
      setIsCompletedSet(true);
      onSetComplete?.(reps);
    });

    // Safely parse initialTempo with fallback
    const parsedInit = tryParseTempo(initialTempo);
    const safeTempo = parsedInit.success && parsedInit.data ? parsedInit.data.raw : '30X1';

    metronome.setTempo(safeTempo);
    metronome.setTargetReps(initialTargetReps);

    if (autoStart) {
      audioSynthesizer.init().catch(() => {});
      metronome.start(safeTempo, initialTargetReps);
    }

    return () => {
      unsubState();
      unsubRep();
      unsubSet();
      metronome.destroy();
    };
  }, [initialTempo, initialTargetReps, autoStart, onRepComplete, onSetComplete]);

  if (!snapshot) return null;

  // SVG Geometry
  const RADIUS = 56;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS; // ~351.858
  const strokeDashoffset = CIRCUMFERENCE * (1 - snapshot.phaseProgressRatio);

  const handleStart = () => {
    audioSynthesizer.init().catch(() => {});
    setIsCompletedSet(false);
    metronomeRef.current?.start(snapshot.tempo, snapshot.targetReps);
  };

  const handlePause = () => {
    metronomeRef.current?.pause();
  };

  const handleResume = () => {
    metronomeRef.current?.resume();
  };

  const handleStop = () => {
    setIsCompletedSet(false);
    metronomeRef.current?.stop();
  };

  const toggleSound = () => {
    const nextSound = !soundEnabled;
    metronomeRef.current?.setSoundEnabled(nextSound);
    setSoundEnabled(nextSound);
  };

  const toggleVoice = () => {
    const nextVoice = !voiceEnabled;
    voiceAnnouncer.setEnabled(nextVoice);
    metronomeRef.current?.setVoiceEnabled(nextVoice);
    setVoiceEnabled(nextVoice);
  };

  const handleTargetRepsChange = (reps: number) => {
    metronomeRef.current?.setTargetReps(reps);
  };

  const handleApplyPreset = (tempo: string) => {
    setCustomInput(tempo);
    setInputError(null);
    metronomeRef.current?.setTempo(tempo);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = tryParseTempo(customInput);
    if (result.success && result.data) {
      setInputError(null);
      metronomeRef.current?.setTempo(result.data.raw);
    } else {
      setInputError(result.error || 'Invalid 4-digit tempo cadence');
    }
  };

  return (
    <div
      className={`bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 shadow-2xl text-slate-100 max-w-2xl w-full mx-auto ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-950/60 border border-blue-800/50 text-blue-400">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              {snapshot.parsedTempo.isIsometricHold ? 'Isometric Tension Metronome' : 'Tempo Metronome'}
            </h3>
            <p className="text-xs text-slate-400">
              {snapshot.parsedTempo.isIsometricHold
                ? `Static Isometric Hold (${snapshot.parsedTempo.holdDurationSeconds}s)`
                : 'Prescribed 4-Digit Cadence'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Voice Coach Toggle */}
          <button
            type="button"
            onClick={toggleVoice}
            aria-label={voiceEnabled ? 'Disable Voice Coach' : 'Enable Voice Coach'}
            title={voiceEnabled ? 'Voice Coach Active ("Down, Hold, Up, Breathe In...")' : 'Voice Coach Muted'}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
              voiceEnabled
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/20'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-750'
            }`}
          >
            {voiceEnabled ? (
              <Mic className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            ) : (
              <MicOff className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span>Voice {voiceEnabled ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={toggleSound}
            aria-label={soundEnabled ? 'Mute Metronome Audio' : 'Unmute Metronome Audio'}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-red-400" />
            )}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              aria-label="Close Metronome"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 4-Digit Cadence Visualizer Strip or Isometric Static Hold Banner */}
      {snapshot.parsedTempo.isIsometricHold ? (
        <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-emerald-500/50 bg-emerald-950/40 my-4 sm:my-5 shadow-lg shadow-emerald-950/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full bg-emerald-400 ${snapshot.isRunning ? 'animate-ping' : ''}`} />
              <span className="text-xs sm:text-sm font-bold text-emerald-300 uppercase tracking-wider">
                ⚡ Isometric Tension Hold Protocol
              </span>
            </div>
            <span className="font-mono text-xs sm:text-sm font-bold text-emerald-300 bg-emerald-900/60 px-2.5 py-0.5 rounded-lg border border-emerald-700/60">
              {snapshot.phaseRemainingSeconds}s remaining
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            Maintain active 360° core stiffness and tendon tension with steady nasal diaphragmatic breathing.
          </p>
          <div className="w-full bg-slate-900 rounded-full h-2 mt-2.5 overflow-hidden border border-emerald-900/80">
            <div
              className="bg-emerald-500 h-2 rounded-full transition-all duration-100 ease-linear"
              style={{ width: `${Math.round(snapshot.phaseProgressRatio * 100)}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2 my-4 sm:my-5">
          {/* Eccentric */}
          <div
            className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl border text-center transition-all ${
              snapshot.currentPhase === 'eccentric' && snapshot.isRunning
                ? 'border-blue-400 bg-blue-950/80 shadow-lg shadow-blue-950/50 scale-105 ring-2 ring-blue-500'
                : 'border-slate-800 bg-slate-950/60'
            }`}
          >
            <span className="text-[10px] uppercase font-bold text-blue-400 block tracking-wider">
              Eccentric
            </span>
            <span className="font-mono text-xl sm:text-2xl font-black text-white">
              {`${snapshot.parsedTempo.eccentric}s`}
            </span>
            <span className="text-[9px] text-slate-400 block mt-0.5">Lowering</span>
          </div>

          {/* Pause Bottom */}
          <div
            className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl border text-center transition-all ${
              snapshot.currentPhase === 'pauseBottom' && snapshot.isRunning
                ? 'border-amber-400 bg-amber-950/80 shadow-lg shadow-amber-950/50 scale-105 ring-2 ring-amber-500'
                : 'border-slate-800 bg-slate-950/60'
            }`}
          >
            <span className="text-[10px] uppercase font-bold text-amber-400 block tracking-wider">
              Bottom
            </span>
            <span className="font-mono text-xl sm:text-2xl font-black text-white">
              {`${snapshot.parsedTempo.pauseBottom}s`}
            </span>
            <span className="text-[9px] text-slate-400 block mt-0.5">Pause</span>
          </div>

          {/* Concentric */}
          <div
            className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl border text-center transition-all ${
              snapshot.currentPhase === 'concentric' && snapshot.isRunning
                ? 'border-emerald-400 bg-emerald-950/80 shadow-lg shadow-emerald-950/50 scale-105 ring-2 ring-emerald-500'
                : 'border-slate-800 bg-slate-950/60'
            }`}
          >
            <span className="text-[10px] uppercase font-bold text-emerald-400 block tracking-wider">
              Concentric
            </span>
            <span className="font-mono text-xl sm:text-2xl font-black text-white">
              {snapshot.parsedTempo.isConcentricExplosive
                ? 'X'
                : `${snapshot.parsedTempo.concentric}s`}
            </span>
            <span className="text-[9px] text-slate-400 block mt-0.5">Drive Up</span>
          </div>

          {/* Pause Top */}
          <div
            className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl border text-center transition-all ${
              snapshot.currentPhase === 'pauseTop' && snapshot.isRunning
                ? 'border-violet-400 bg-violet-950/80 shadow-lg shadow-violet-950/50 scale-105 ring-2 ring-violet-500'
                : 'border-slate-800 bg-slate-950/60'
            }`}
          >
            <span className="text-[10px] uppercase font-bold text-violet-400 block tracking-wider">
              Top
            </span>
            <span className="font-mono text-xl sm:text-2xl font-black text-white">
              {`${snapshot.parsedTempo.pauseTop}s`}
            </span>
            <span className="text-[9px] text-slate-400 block mt-0.5">Squeeze</span>
          </div>
        </div>
      )}

      {/* Circular SVG Pacing Display */}
      <div className="flex flex-col items-center justify-center my-4">
        <div className="relative w-48 h-48 flex items-center justify-center">
          <svg className="w-48 h-48 -rotate-90 transform" viewBox="0 0 128 128">
            <circle
              cx="64"
              cy="64"
              r={RADIUS}
              fill="transparent"
              strokeWidth="8"
              className="stroke-slate-800"
            />
            <circle
              cx="64"
              cy="64"
              r={RADIUS}
              fill="transparent"
              strokeWidth="8"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{ stroke: snapshot.phaseColor }}
              className="transition-[stroke-dashoffset] duration-75 ease-linear"
            />
          </svg>

          {/* Central Pacing Readout */}
          <div className="absolute inset-0 flex flex-col items-center justify-center select-none text-center px-4">
            <span className="font-mono text-3xl sm:text-4xl font-extrabold text-white tracking-wider">
              {snapshot.isExplosive ? 'EXPLODE' : snapshot.formattedPhaseMMSS || `${snapshot.phaseRemainingSeconds}s`}
            </span>
            <span
              className="text-xs font-bold uppercase tracking-wider mt-1 px-2.5 py-0.5 rounded-full"
              style={{ color: snapshot.phaseColor, backgroundColor: `${snapshot.phaseColor}20` }}
            >
              {snapshot.phaseLabel}
            </span>
            <div className="flex items-center gap-2 mt-1 font-mono text-[11px] text-slate-300">
              <span>{`Rep ${snapshot.currentRep} ${snapshot.targetReps > 0 ? `of ${snapshot.targetReps}` : '(Cont.)'}`}</span>
              <span>·</span>
              <span className="text-emerald-400 font-bold" title="Total Set Time Under Tension in MM:SS">
                {`TUT ${snapshot.formattedElapsedMMSS || '00:00'}`}
              </span>
            </div>
          </div>
        </div>

        {/* Synchronized Biomechanical Form Visualizer */}
        <div className="w-full mt-3 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <ExerciseDiagram
              diagramType={diagramType || (exerciseId && EXERCISE_VISUALS[exerciseId]?.diagramType) || 'squat'}
              forcedPhase={
                snapshot.currentPhase === 'eccentric' || snapshot.currentPhase === 'pauseBottom'
                  ? 'bottom'
                  : 'start'
              }
              compact={true}
            />
            <div className="text-left">
              <span className="text-xs font-bold text-slate-200 block">
                {snapshot.currentPhase === 'eccentric'
                  ? '3-4s Slow Eccentric Descent'
                  : snapshot.currentPhase === 'pauseBottom'
                  ? 'Deep Stretch Contraction Hold'
                  : snapshot.currentPhase === 'concentric'
                  ? 'Explosive Concentric Drive'
                  : 'Lockout & Diaphragmatic Reset'}
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                Synchronized with {snapshot.phaseLabel}
              </span>
            </div>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/80 whitespace-nowrap">
            {snapshot.currentPhase === 'eccentric' || snapshot.currentPhase === 'pauseBottom'
              ? 'Phase: Bottom'
              : 'Phase: Lockout'}
          </span>
        </div>

        {/* Set Completion Banner */}
        {isCompletedSet && (
          <div className="mt-3 p-3 rounded-2xl bg-emerald-950/80 border border-emerald-600 text-emerald-200 text-center font-semibold text-xs flex items-center justify-between gap-2 animate-bounce">
            <span className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>Target {snapshot.targetReps} reps completed with perfect cadence! (Logged as complete)</span>
            </span>
          </div>
        )}

        {/* Primary Controls */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
          {snapshot.state === 'ACTIVE' ? (
            <button
              onClick={handlePause}
              className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 active:scale-95 text-white font-semibold flex items-center gap-2 shadow-lg shadow-amber-950/40 transition-all cursor-pointer"
            >
              <Pause className="w-4 h-4 fill-white" /> Pause
            </button>
          ) : snapshot.state === 'PAUSED' ? (
            <button
              onClick={handleResume}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-semibold flex items-center gap-2 shadow-lg shadow-emerald-950/40 transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" /> Resume
            </button>
          ) : (
            <button
              onClick={handleStart}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-semibold flex items-center gap-2 shadow-lg shadow-emerald-950/40 transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" /> Start Cadence
            </button>
          )}

          {onSetComplete && (
            <button
              type="button"
              onClick={() => {
                const reps = snapshot.currentRep > 0 ? snapshot.currentRep : (snapshot.targetReps || 10);
                setIsCompletedSet(true);
                onSetComplete(reps);
              }}
              aria-label="Mark set complete"
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-semibold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-950/40 transition-all cursor-pointer"
            >
              <CheckCircle className="w-4 h-4 text-white" />
              <span>Log Set Complete</span>
            </button>
          )}

          <button
            onClick={handleStop}
            title="Stop / Reset"
            aria-label="Stop Metronome"
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 transition-all border border-slate-700 cursor-pointer"
          >
            <Square className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Target Rep Selector & Presets */}
      <div className="border-t border-slate-800 pt-4 mt-4 space-y-4">
        {/* Target Reps */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs font-semibold text-slate-400">Target Reps:</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {Array.from(new Set([0, 3, 5, 8, 10, 12, 15, 20, initialTargetReps]))
              .filter((n) => typeof n === 'number' && !isNaN(n) && n >= 0)
              .sort((a, b) => a - b)
              .map((r) => (
                <button
                  key={r}
                  onClick={() => handleTargetRepsChange(r)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                    snapshot.targetReps === r
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {r === 0 ? 'Cont.' : r}
                </button>
              ))}
          </div>
        </div>

        {/* 1-Tap TNT Isometric Analgesia Protocol Launcher */}
        <div
          data-testid="tnt-metronome-banner"
          className="p-3 rounded-xl bg-gradient-to-r from-rose-950/60 via-slate-900 to-rose-950/40 border border-rose-800/40 space-y-2"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
                🔬 TNT Protocol
              </span>
              <span className="text-xs font-bold text-white">
                Tendon Neuroplastic Training (TNT)
              </span>
            </div>
            <button
              type="button"
              data-testid="tnt-metronome-quick-btn"
              onClick={() => {
                handleApplyPreset('HOLD-45');
                handleTargetRepsChange(5);
              }}
              className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 active:scale-95 text-white text-[11px] font-bold transition-all shadow-md flex items-center gap-1 cursor-pointer"
            >
              <Play className="w-3 h-3 fill-white text-white" />
              <span>Load 5×45s TNT</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            Metronome audio pacing stimulates the primary motor cortex to down-regulate cortical inhibition, relieving patellar tendon pain for ~45 min (Rio & Cook, BJSM).
          </p>
        </div>

        {/* Presets List */}
        <div>
          <span className="text-xs font-semibold text-slate-400 block mb-2">FBB Presets:</span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {TEMPO_PRESETS.map((p) => (
              <button
                key={p.tempo}
                onClick={() => handleApplyPreset(p.tempo)}
                className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                  snapshot.tempo === p.tempo
                    ? 'border-blue-500 bg-blue-950/50 text-blue-200'
                    : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:bg-slate-800/60'
                }`}
              >
                <div className="font-mono text-xs font-bold text-white">{p.tempo}</div>
                <div className="text-[10px] text-slate-400 truncate">{p.name}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Input */}
        <form onSubmit={handleCustomSubmit} className="flex items-center gap-2 pt-1">
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value.toUpperCase())}
            placeholder="Custom 4-digit (e.g. 30X1)"
            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-blue-500 uppercase"
            maxLength={4}
          />
          <button
            type="submit"
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors cursor-pointer"
          >
            Apply
          </button>
        </form>
        {inputError && <p className="text-[11px] text-red-400 mt-1">{inputError}</p>}
      </div>
    </div>
  );
};
