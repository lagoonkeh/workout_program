import React, { useState, useMemo, useCallback, useEffect, useRef, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { WorkoutExercise, isUnilateralExercise, isTimedPrescription, formatMMSS, extractTargetReps, getEffectiveExerciseTempo, BOWFLEX_840_KETTLEBELL_SETTINGS, isLLPEligible } from '../domain/programData';
import { LazyExerciseDiagram as ExerciseDiagram } from './LazyExerciseDiagram';
import { EXERCISE_VISUALS, ExerciseVisual, DiagramType } from '../domain/exerciseVisualsData';
import { useCueCardLookup } from '../domain/cueCardStore';
import {
  ShieldAlert,
  Clock,
  Activity,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Check,
  Disc,
  Info,
  AlertCircle,
  ListOrdered,
  RotateCcw,
  Flame,
  Trophy,
  ArrowLeftRight,
  Tag,
  Play,
  Pause,
  Mic,
  FastForward,
  Copy,
  Layers,
  TrendingUp,
  TrendingDown,
  Minus,
  Video,
  Undo2,
} from 'lucide-react';
import type { LastPerformance, LoadSuggestion } from '../domain/progression';
import { demoVideoFor, youtubeUrl } from '../domain/demoVideos';
import { getExerciseVariations, ExerciseVariation, saveCustomVariation, WorkoutCycle } from '../domain/exerciseVariations';
import { ExerciseVariationModal } from './ExerciseVariationModal';
import { voiceAnnouncer } from '../audio/voiceAnnouncer';
import { TempoMetronome, MetronomeSnapshot } from '../timer/tempoMetronome';
import { audioSynthesizer } from '../audio/audioSynthesizer';
import { PlateLoadStrip, platesPerSideText } from './PlateLoadStrip';
import type { RatingCategoryTab } from './RatingDefinitionsModal';
import { PlateCalculatorWidget, RatingDefinitionsModal, SkipExerciseReasonModal } from '../lazyView';

const QUICK_LOG_CHIPS = [
  '@RPE 7',
  '@RPE 8',
  '@RPE 9',
  'Pain-Free 0/10',
  'Knee Pain 2/10',
  'Tight Hamstrings',
] as const;

export interface McGillDrill {
  id: 'curl_up' | 'side_bridge' | 'bird_dog';
  name: string;
  targetHold: string;
  cue: string;
}

export const MCGILL_DRILLS: McGillDrill[] = [
  {
    id: 'curl_up',
    name: '1. Modified Curl-Up',
    targetHold: '10s Hold (Neutral Spine)',
    cue: 'Hands under lumbar arch to preserve curve. 1 leg bent, 1 straight. Lift head and chest 1–2" without flexing neck or flattening lumbar spine.',
  },
  {
    id: 'side_bridge',
    name: '2. Side Bridge / Plank',
    targetHold: '10s Hold (Left & Right)',
    cue: 'Elbow directly under shoulder, hips elevated into rigid diagonal line. Top hand on opposite shoulder or hip. Locks quadratus lumborum and obliques.',
  },
  {
    id: 'bird_dog',
    name: '3. Quadruped Bird-Dog',
    targetHold: '10s Hold (Left & Right)',
    cue: 'Hands under shoulders, knees under hips. Clench fists, sweep opposite arm and leg parallel to floor without allowing pelvis to tilt or back to hyperextend.',
  },
];

export interface DeadHangClubDrill {
  id: 'dead_hang' | 'club_casts_left' | 'club_casts_right';
  name: string;
  targetHold: string;
  holdSeconds: number;
  cue: string;
}

export const DEAD_HANG_CLUB_DRILLS: DeadHangClubDrill[] = [
  {
    id: 'dead_hang',
    name: '1. Active Scapular Overhead Dead Hang',
    targetHold: '45s Decompression Hold',
    holdSeconds: 45,
    cue: 'Overhead grip on pull-up bar. Depress scapulae (pull shoulder blades down away from ears) and engage core. Full passive-to-active gravitational traction to decompress subacromial space.',
  },
  {
    id: 'club_casts_left',
    name: '2. Indian Club Casts (Left Arm)',
    targetHold: '10 Casts / Heart Casts (2–5 lb)',
    holdSeconds: 30,
    cue: 'Order position in front of shoulder with 2–5 lb club. Cast smoothly over shoulder behind head, keeping elbow high and pointed forward. Lubricates glenohumeral capsule and mobilizes rotators.',
  },
  {
    id: 'club_casts_right',
    name: '3. Indian Club Casts (Right Arm)',
    targetHold: '10 Casts / Heart Casts (2–5 lb)',
    holdSeconds: 30,
    cue: 'Order position with right arm. Cast smoothly behind head and return to order with zero rib flare or torso twisting. Restores reciprocal shoulder rotation without impingement.',
  },
];

export const MCGILL_DRILL_DIAGRAM_MAP: Record<McGillDrill['id'], DiagramType> = {
  curl_up: 'curl_up',
  side_bridge: 'side_bridge',
  bird_dog: 'core_mcgill',
};

export const DEAD_HANG_DRILL_DIAGRAM_MAP: Record<DeadHangClubDrill['id'], DiagramType> = {
  dead_hang: 'dead_hang',
  club_casts_left: 'warmup_club',
  club_casts_right: 'warmup_club',
};

// Pre-computed O(1) lookup map for Cue Cards by ID, exerciseId, exerciseName, and title

// Pre-computed O(1) lookup map for Exercise Visuals by ID and lowercase name
const VISUAL_BY_NAME_LOOKUP = new Map<string, ExerciseVisual>();
const VISUAL_VALUES = Object.values(EXERCISE_VISUALS);
for (const visual of VISUAL_VALUES) {
  VISUAL_BY_NAME_LOOKUP.set(visual.exerciseName.toLowerCase(), visual);
}

// Static Tier Badge Color Map
const TIER_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  T1: {
    label: 'Tier 1 (Strength & AMRAP)',
    bg: 'bg-rose-500/15',
    text: 'text-rose-300',
    border: 'border-rose-500/40',
  },
  T2: {
    label: 'Tier 2 (Hypertrophy)',
    bg: 'bg-amber-500/15',
    text: 'text-amber-300',
    border: 'border-amber-500/40',
  },
  T3: {
    label: 'Tier 3 (Accessory/Rehab)',
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-300',
    border: 'border-emerald-500/40',
  },
  Warmup: {
    label: 'Warmup & Activation',
    bg: 'bg-purple-500/15',
    text: 'text-purple-300',
    border: 'border-purple-500/40',
  },
};

export interface SetLogRecord {
  setNumber: number;
  targetReps: string;
  weightLbs: number;
  repsAchieved: number;
  isCompleted: boolean;
  notes: string;
  /** ISO timestamp of when the set was first logged */
  loggedAt?: string;
  /** Whether lengthened partials (LLPs) were performed on this set */
  llpPerformed?: boolean;
  /** Whether the left side was completed on a unilateral exercise */
  leftCompleted?: boolean;
  /** Whether the right side was completed on a unilateral exercise */
  rightCompleted?: boolean;
}

export interface ExerciseCardProps {
  exercise: WorkoutExercise;
  logs: SetLogRecord[];
  onUpdateSetLog: (exerciseId: string, setIndex: number, updated: Partial<SetLogRecord>) => void;
  onOpenCueCard: (exerciseId: string) => void;
  onQuickStartRest: (durationSeconds: number) => void;
  onQuickStartTempo: (tempo: string, exerciseId?: string) => void;
  onOpenPlateCalculator?: (targetWeight: number) => void;
  onResetExercise?: (exerciseId: string) => void;
  defaultCollapsed?: boolean;
  collapseRevision?: number;
  onToggleSplitSides?: (exerciseId: string) => void;
  onSwitchToPairedSide?: (targetSideExerciseId: string) => void;
  isSideSplitActive?: boolean;
  onSelectVariation?: (baseExerciseId: string, variation: ExerciseVariation) => void;
  currentCycle?: WorkoutCycle;
  /** most recent finished workout's sets for this exercise ("last time" beside each set) */
  lastTime?: LastPerformance | null;
  /** next-weight suggestion that was pre-filled into this card's sets */
  loadSuggestion?: (LoadSuggestion & { undone?: boolean; fromWeightLbs?: number }) | null;
  onUndoSuggestion?: (exerciseId: string) => void;
}

const lastTimeDate = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
};

const ExerciseCardComponent: React.FC<ExerciseCardProps> = ({
  exercise,
  logs,
  onUpdateSetLog,
  onOpenCueCard,
  onQuickStartRest,
  onQuickStartTempo,
  onOpenPlateCalculator,
  onResetExercise,
  defaultCollapsed,
  collapseRevision,
  onToggleSplitSides,
  onSwitchToPairedSide,
  isSideSplitActive,
  onSelectVariation,
  currentCycle = 'A',
  lastTime = null,
  loadSuggestion = null,
  onUndoSuggestion,
}) => {
  const [showRationale, setShowRationale] = useState(false);
  const [showRegression, setShowRegression] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showKneeSafety, setShowKneeSafety] = useState(false);
  const [showWarmupRamp, setShowWarmupRamp] = useState(false);
  const [completedWarmupStages, setCompletedWarmupStages] = useState<Record<number, boolean>>({});
  const [isSwappedToRegression, setIsSwappedToRegression] = useState(false);
  const preRegressionLogsRef = useRef<Record<number, { weightLbs: number; targetReps: string }> | null>(null);
  const [isManuallyCollapsed, setIsManuallyCollapsed] = useState<boolean | null>(null);
  const [isVariationModalOpen, setIsVariationModalOpen] = useState(false);

  const baseExerciseKey = exercise.baseExerciseId || exercise.id;
  const availableVariations = useMemo(
    () => getExerciseVariations(baseExerciseKey),
    [baseExerciseKey]
  );

  const handleSelectVariation = useCallback(
    (variation: ExerciseVariation) => {
      if (onSelectVariation) {
        onSelectVariation(baseExerciseKey, variation);
      }
      saveCustomVariation(baseExerciseKey, variation.id);
    },
    [baseExerciseKey, onSelectVariation]
  );
  const [isSkipModalOpen, setIsSkipModalOpen] = useState(false);

  // Barbell Plate Loading Calculator Drawer state (strictly for barbell equipment)
  const isBarbell = exercise.equipment === 'barbell';
  const [showPlateCalculator, setShowPlateCalculator] = useState<boolean>(false);
  const [plateCalcWeight, setPlateCalcWeight] = useState<number>(() => {
    return logs[0]?.weightLbs && logs[0].weightLbs > 0
      ? logs[0].weightLbs
      : exercise.defaultWeightLbs || 135;
  });

  useEffect(() => {
    if (logs[0]?.weightLbs && logs[0].weightLbs > 0 && !showPlateCalculator) {
      setPlateCalcWeight(logs[0].weightLbs);
    }
  }, [logs[0]?.weightLbs, showPlateCalculator]);

  // Working weights on this card (in set order), shown with their plates per side
  const plateWeights = React.useMemo(() => {
    const ws = Array.from(new Set(logs.map((l) => l.weightLbs).filter((w) => w > 0)));
    return ws.length ? ws : exercise.defaultWeightLbs ? [exercise.defaultWeightLbs] : [];
  }, [logs, exercise.defaultWeightLbs]);
  const toggleBarView = (w: number) => {
    if (showPlateCalculator && plateCalcWeight === w) {
      setShowPlateCalculator(false);
      return;
    }
    setPlateCalcWeight(w);
    setShowPlateCalculator(true);
    onOpenPlateCalculator?.(w);
  };

  const handleToggleRegression = useCallback((forceSwap?: boolean) => {
    const nextSwap = forceSwap !== undefined ? forceSwap : !isSwappedToRegression;
    if (!exercise.regression) return;

    if (nextSwap) {
      // Snapshot current set logs before regression swap
      const snapshot: Record<number, { weightLbs: number; targetReps: string }> = {};
      logs.forEach((s, idx) => {
        snapshot[idx] = { weightLbs: s.weightLbs, targetReps: s.targetReps };
      });
      preRegressionLogsRef.current = snapshot;

      // Determine target regression weight and reps
      const regWeight = exercise.regression.defaultWeightLbs ?? 0;
      const regReps = exercise.regression.targetReps ?? exercise.targetReps;

      logs.forEach((_, idx) => {
        onUpdateSetLog(exercise.id, idx, {
          weightLbs: regWeight,
          targetReps: regReps,
        });
      });

      if (isBarbell && regWeight > 0) {
        setPlateCalcWeight(regWeight);
      }
      setIsSwappedToRegression(true);
      setShowRegression(true);
    } else {
      // Restore primary lift sets
      const saved = preRegressionLogsRef.current;
      logs.forEach((_, idx) => {
        const restoredWeight = saved?.[idx]?.weightLbs ?? (exercise.defaultWeightLbs ?? exercise.defaultWeight ?? 0);
        const restoredReps = saved?.[idx]?.targetReps ?? exercise.targetReps;
        onUpdateSetLog(exercise.id, idx, {
          weightLbs: restoredWeight,
          targetReps: restoredReps,
        });
      });

      if (isBarbell) {
        const primaryWeight = saved?.[0]?.weightLbs ?? (exercise.defaultWeightLbs ?? exercise.defaultWeight ?? 135);
        setPlateCalcWeight(primaryWeight);
      }
      preRegressionLogsRef.current = null;
      setIsSwappedToRegression(false);
    }
  }, [exercise, isSwappedToRegression, logs, onUpdateSetLog, isBarbell]);

  // Dr. Stuart McGill Big 3 state & 10s isometric hold countdown
  const isMcGillBig3 = exercise.id === 't3_mcgill_big_3' || exercise.name.toLowerCase().includes('mcgill');
  const [mcgillCompletedDrills, setMcgillCompletedDrills] = useState<Record<number, Record<string, boolean>>>({
    0: { curl_up: false, side_bridge: false, bird_dog: false },
    1: { curl_up: false, side_bridge: false, bird_dog: false },
    2: { curl_up: false, side_bridge: false, bird_dog: false },
  });
  const [mcgillDrillSides, setMcgillDrillSides] = useState<Record<number, Record<string, boolean>>>({
    0: { side_bridge_left: false, side_bridge_right: false, bird_dog_left: false, bird_dog_right: false },
    1: { side_bridge_left: false, side_bridge_right: false, bird_dog_left: false, bird_dog_right: false },
    2: { side_bridge_left: false, side_bridge_right: false, bird_dog_left: false, bird_dog_right: false },
  });
  const [activeMcGillRound, setActiveMcGillRound] = useState<number>(0);
  const [mcgillHoldSeconds, setMcgillHoldSeconds] = useState<number>(10);
  const [isMcgillHolding, setIsMcgillHolding] = useState<boolean>(false);
  const [activeHoldingDrill, setActiveHoldingDrill] = useState<string | null>(null);
  const mcgillTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync McGill drill completion with existing set logs
  useEffect(() => {
    if (!isMcGillBig3) return;
    setMcgillCompletedDrills((prev) => {
      const next = { ...prev };
      logs.forEach((set, idx) => {
        if (set.isCompleted) {
          next[idx] = { curl_up: true, side_bridge: true, bird_dog: true };
        }
      });
      return next;
    });
    setMcgillDrillSides((prev) => {
      const next = { ...prev };
      logs.forEach((set, idx) => {
        if (set.isCompleted) {
          next[idx] = { side_bridge_left: true, side_bridge_right: true, bird_dog_left: true, bird_dog_right: true };
        }
      });
      return next;
    });
  }, [isMcGillBig3, logs]);

  // Clean up McGill timer on unmount
  useEffect(() => {
    return () => {
      if (mcgillTimerRef.current) {
        clearInterval(mcgillTimerRef.current);
        mcgillTimerRef.current = null;
      }
    };
  }, []);

  const handleToggleMcGillDrillSide = useCallback(
    (roundIdx: number, drillId: 'side_bridge' | 'bird_dog' | string, side: 'left' | 'right') => {
      setMcgillDrillSides((prevSides) => {
        const roundSides = { ...(prevSides[roundIdx] || {}) };
        const sideKey = `${drillId}_${side}`;
        const isCurrentlyDone = mcgillCompletedDrills[roundIdx]?.[drillId] || false;
        const currentSideVal = roundSides[sideKey] ?? isCurrentlyDone;
        const nextSideVal = !currentSideVal;
        roundSides[sideKey] = nextSideVal;

        const otherSide = side === 'left' ? 'right' : 'left';
        const otherSideKey = `${drillId}_${otherSide}`;
        const otherSideVal = roundSides[otherSideKey] ?? isCurrentlyDone;
        const allSidesDone = nextSideVal && otherSideVal;

        setMcgillCompletedDrills((prevDrills) => {
          const roundDrills = { ...(prevDrills[roundIdx] || { curl_up: false, side_bridge: false, bird_dog: false }) };
          roundDrills[drillId] = allSidesDone;
          const nextState = { ...prevDrills, [roundIdx]: roundDrills };

          const completedDrillsCount = Object.values(roundDrills).filter(Boolean).length;
          const allCompleted = completedDrillsCount === 3;

          onUpdateSetLog(exercise.id, roundIdx, {
            isCompleted: allCompleted,
            repsAchieved: completedDrillsCount,
            weightLbs: 0,
            notes: allCompleted ? '3/3 Drills Complete · McGill Tri-Set' : `${completedDrillsCount}/3 Drills Done`,
          });

          if (allCompleted && exercise.restSeconds > 0) {
            onQuickStartRest(exercise.restSeconds);
          }

          return nextState;
        });

        return { ...prevSides, [roundIdx]: roundSides };
      });
    },
    [exercise, mcgillCompletedDrills, onUpdateSetLog, onQuickStartRest]
  );

  const handleToggleMcGillDrill = useCallback(
    (roundIdx: number, drillId: string) => {
      setMcgillCompletedDrills((prev) => {
        const roundDrills = { ...(prev[roundIdx] || { curl_up: false, side_bridge: false, bird_dog: false }) };
        const nextVal = !roundDrills[drillId];
        roundDrills[drillId] = nextVal;
        const nextState = { ...prev, [roundIdx]: roundDrills };

        setMcgillDrillSides((prevSides) => {
          const roundSides = { ...(prevSides[roundIdx] || {}) };
          if (drillId === 'side_bridge' || drillId === 'bird_dog') {
            roundSides[`${drillId}_left`] = nextVal;
            roundSides[`${drillId}_right`] = nextVal;
          }
          return { ...prevSides, [roundIdx]: roundSides };
        });

        const completedDrillsCount = Object.values(roundDrills).filter(Boolean).length;
        const allCompleted = completedDrillsCount === 3;

        onUpdateSetLog(exercise.id, roundIdx, {
          isCompleted: allCompleted,
          repsAchieved: completedDrillsCount,
          weightLbs: 0,
          notes: allCompleted ? '3/3 Drills Complete · McGill Tri-Set' : `${completedDrillsCount}/3 Drills Done`,
        });

        if (allCompleted && exercise.restSeconds > 0) {
          onQuickStartRest(exercise.restSeconds);
        }

        return nextState;
      });
    },
    [exercise, onUpdateSetLog, onQuickStartRest]
  );

  const handleToggleMcGillRoundComplete = useCallback(
    (roundIdx: number) => {
      const currentLog = logs[roundIdx];
      const isCurrentlyDone = !!currentLog?.isCompleted;
      const targetDone = !isCurrentlyDone;

      setMcgillCompletedDrills((prev) => ({
        ...prev,
        [roundIdx]: {
          curl_up: targetDone,
          side_bridge: targetDone,
          bird_dog: targetDone,
        },
      }));

      setMcgillDrillSides((prevSides) => ({
        ...prevSides,
        [roundIdx]: {
          side_bridge_left: targetDone,
          side_bridge_right: targetDone,
          bird_dog_left: targetDone,
          bird_dog_right: targetDone,
        },
      }));

      onUpdateSetLog(exercise.id, roundIdx, {
        isCompleted: targetDone,
        repsAchieved: targetDone ? 3 : 0,
        weightLbs: 0,
        notes: targetDone ? '3/3 Drills Complete · McGill Tri-Set' : '',
      });

      if (targetDone && exercise.restSeconds > 0) {
        onQuickStartRest(exercise.restSeconds);
      }
    },
    [logs, exercise, onUpdateSetLog, onQuickStartRest]
  );

  const handleStartMcGillHold = useCallback(
    (drillId: string, roundIdx: number) => {
      if (mcgillTimerRef.current) {
        clearInterval(mcgillTimerRef.current);
        mcgillTimerRef.current = null;
      }

      setIsMcgillHolding(true);
      setActiveHoldingDrill(drillId);
      setMcgillHoldSeconds(10);

      mcgillTimerRef.current = setInterval(() => {
        setMcgillHoldSeconds((prev) => {
          if (prev <= 1) {
            if (mcgillTimerRef.current) {
              clearInterval(mcgillTimerRef.current);
              mcgillTimerRef.current = null;
            }
            setIsMcgillHolding(false);
            setActiveHoldingDrill(null);

            // Play completion chime
            if (!audioSynthesizer.isMuted()) {
              audioSynthesizer.playTone('completion');
            }
            voiceAnnouncer.announceRestComplete();

            // Mark this drill as completed
            handleToggleMcGillDrill(roundIdx, drillId);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    },
    [handleToggleMcGillDrill]
  );

  // Active Dead Hang & Indian Club Arm Casts state & countdown hold timers
  const isDeadHangClubMills =
    exercise.id === 't3_dead_hang_club_mills' ||
    (exercise.name.toLowerCase().includes('dead hang') && exercise.name.toLowerCase().includes('club'));
  const [deadHangCompletedDrills, setDeadHangCompletedDrills] = useState<Record<number, Record<string, boolean>>>({
    0: { dead_hang: false, club_casts_left: false, club_casts_right: false },
    1: { dead_hang: false, club_casts_left: false, club_casts_right: false },
    2: { dead_hang: false, club_casts_left: false, club_casts_right: false },
  });
  const [activeDeadHangRound, setActiveDeadHangRound] = useState<number>(0);
  const [deadHangHoldSeconds, setDeadHangHoldSeconds] = useState<number>(45);
  const [isDeadHangTiming, setIsDeadHangTiming] = useState<boolean>(false);
  const [activeTimingDeadHangDrill, setActiveTimingDeadHangDrill] = useState<string | null>(null);
  const deadHangTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync Dead Hang & Club Casts drill completion with existing set logs
  useEffect(() => {
    if (!isDeadHangClubMills) return;
    setDeadHangCompletedDrills((prev) => {
      const next = { ...prev };
      logs.forEach((set, idx) => {
        if (set.isCompleted) {
          next[idx] = { dead_hang: true, club_casts_left: true, club_casts_right: true };
        }
      });
      return next;
    });
  }, [isDeadHangClubMills, logs]);

  // Clean up Dead Hang timer on unmount
  useEffect(() => {
    return () => {
      if (deadHangTimerRef.current) {
        clearInterval(deadHangTimerRef.current);
        deadHangTimerRef.current = null;
      }
    };
  }, []);

  const handleToggleDeadHangDrill = useCallback(
    (roundIdx: number, drillId: string) => {
      setDeadHangCompletedDrills((prev) => {
        const roundDrills = { ...(prev[roundIdx] || { dead_hang: false, club_casts_left: false, club_casts_right: false }) };
        const nextVal = !roundDrills[drillId];
        roundDrills[drillId] = nextVal;
        const nextState = { ...prev, [roundIdx]: roundDrills };

        const completedDrillsCount = Object.values(roundDrills).filter(Boolean).length;
        const allCompleted = completedDrillsCount === 3;

        onUpdateSetLog(exercise.id, roundIdx, {
          isCompleted: allCompleted,
          repsAchieved: completedDrillsCount,
          weightLbs: 0,
          notes: allCompleted ? '3/3 Drills Complete · Hang & Club Casts' : `${completedDrillsCount}/3 Drills Done`,
        });

        if (allCompleted && exercise.restSeconds > 0) {
          onQuickStartRest(exercise.restSeconds);
        }

        return nextState;
      });
    },
    [exercise, onUpdateSetLog, onQuickStartRest]
  );

  const handleToggleDeadHangRoundComplete = useCallback(
    (roundIdx: number) => {
      const currentLog = logs[roundIdx];
      const isCurrentlyDone = !!currentLog?.isCompleted;
      const targetDone = !isCurrentlyDone;

      setDeadHangCompletedDrills((prev) => ({
        ...prev,
        [roundIdx]: {
          dead_hang: targetDone,
          club_casts_left: targetDone,
          club_casts_right: targetDone,
        },
      }));

      onUpdateSetLog(exercise.id, roundIdx, {
        isCompleted: targetDone,
        repsAchieved: targetDone ? 3 : 0,
        weightLbs: 0,
        notes: targetDone ? '3/3 Drills Complete · Hang & Club Casts' : '',
      });

      if (targetDone && exercise.restSeconds > 0) {
        onQuickStartRest(exercise.restSeconds);
      }
    },
    [logs, exercise, onUpdateSetLog, onQuickStartRest]
  );

  const handleStartDeadHangTimer = useCallback(
    (drill: DeadHangClubDrill, roundIdx: number) => {
      if (deadHangTimerRef.current) {
        clearInterval(deadHangTimerRef.current);
        deadHangTimerRef.current = null;
      }

      setIsDeadHangTiming(true);
      setActiveTimingDeadHangDrill(drill.id);
      setDeadHangHoldSeconds(drill.holdSeconds);

      deadHangTimerRef.current = setInterval(() => {
        setDeadHangHoldSeconds((prev) => {
          if (prev <= 1) {
            if (deadHangTimerRef.current) {
              clearInterval(deadHangTimerRef.current);
              deadHangTimerRef.current = null;
            }
            setIsDeadHangTiming(false);
            setActiveTimingDeadHangDrill(null);

            // Play completion chime
            if (!audioSynthesizer.isMuted()) {
              audioSynthesizer.playTone('completion');
            }
            voiceAnnouncer.announceRestComplete();

            // Mark this drill as completed
            handleToggleDeadHangDrill(roundIdx, drill.id);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    },
    [handleToggleDeadHangDrill]
  );


  // Inline Marcus Filly Tempo Metronome state & ref
  const inlineMetronomeRef = useRef<TempoMetronome | null>(null);
  const [inlineTempoSnapshot, setInlineTempoSnapshot] = useState<MetronomeSnapshot | null>(null);
  const [isInlineTempoActive, setIsInlineTempoActive] = useState(false);
  const [inlineTempoTargetSet, setInlineTempoTargetSet] = useState<number | null>(null);

  // Clean up inline metronome on unmount
  useEffect(() => {
    return () => {
      inlineMetronomeRef.current?.destroy();
      inlineMetronomeRef.current = null;
    };
  }, []);

  const activeTempo = isSwappedToRegression && exercise.regression
    ? exercise.regression.tempo
    : exercise.tempo;

  const effectiveTempo = useMemo(
    () => getEffectiveExerciseTempo(activeTempo, exercise.targetReps),
    [activeTempo, exercise.targetReps]
  );
  // Tempo / hold timers only on exercises prescribed by time; rep-based lifts keep just the rest timer
  const needsTimer = useMemo(() => isTimedPrescription(exercise.targetReps, effectiveTempo), [exercise.targetReps, effectiveTempo]);

  const handleStartInlineTempo = useCallback(
    (targetSetIdx?: number) => {
      const setIdx =
        targetSetIdx !== undefined
          ? targetSetIdx
          : logs.findIndex((s) => !s.isCompleted);
      const targetIndex = setIdx !== -1 ? setIdx : 0;
      setInlineTempoTargetSet(targetIndex);

      const currentSet = logs[targetIndex];
      const tempoLower = (effectiveTempo || activeTempo || '').toLowerCase();
      const targetRepsLower = (exercise.targetReps || '').toLowerCase();
      const isHold =
        tempoLower.includes('hold') ||
        tempoLower.includes('isometric') ||
        tempoLower.includes('hang') ||
        tempoLower.startsWith('hold-') ||
        tempoLower === '0010' ||
        tempoLower === '0030' ||
        targetRepsLower.includes('hold') ||
        (targetRepsLower.includes('s') && (targetRepsLower.includes('–') || targetRepsLower.includes('-')));

      let targetReps = extractTargetReps(currentSet?.targetReps || exercise.targetReps, 10);
      if (isHold) {
        if (targetRepsLower.includes('reps')) {
          targetReps = extractTargetReps(currentSet?.targetReps || exercise.targetReps, 4);
        } else {
          targetReps = 1; // Single sustained hold per set
        }
      }

      if (!inlineMetronomeRef.current) {
        inlineMetronomeRef.current = new TempoMetronome({
          audioSynthesizer,
          soundEnabled: !audioSynthesizer.isMuted(),
          voiceAnnouncer,
          voiceEnabled: !audioSynthesizer.isMuted(),
        });
      }

      const metronome = inlineMetronomeRef.current;
      metronome.subscribe((snap) => {
        setInlineTempoSnapshot(snap);
        setIsInlineTempoActive(snap.state !== 'STOPPED');
      });

      metronome.onSetComplete((completedReps) => {
        const targetSet = logs[targetIndex];
        const isNoWeight =
          exercise.equipment === 'bodyweight' ||
          !targetSet ||
          targetSet.weightLbs === 0 ||
          (!exercise.defaultWeightLbs && !exercise.defaultWeight);

        const setTargetReps = isHold && !targetRepsLower.includes('reps') ? 1 : extractTargetReps(targetSet?.targetReps || exercise.targetReps, 10);
        const repsAchieved = completedReps > 0 ? completedReps : setTargetReps;

        if (targetSet && !targetSet.isCompleted) {
          const workingWeight = isNoWeight
            ? 0
            : targetSet.weightLbs > 0
            ? targetSet.weightLbs
            : exercise.defaultWeightLbs || exercise.defaultWeight || 0;

          const tempoNote = isHold ? 'Isometric Hold' : 'Tempo Cadence';
          onUpdateSetLog(exercise.id, targetIndex, {
            isCompleted: true,
            repsAchieved,
            weightLbs: workingWeight,
            notes: targetSet.notes ? `${targetSet.notes} · ${tempoNote}` : tempoNote,
          });
          if (exercise.restSeconds > 0) {
            onQuickStartRest(exercise.restSeconds);
          }
        } else if (targetSet && targetSet.repsAchieved === 0) {
          onUpdateSetLog(exercise.id, targetIndex, {
            repsAchieved,
          });
        }
      });

      metronome.start(effectiveTempo, targetReps);
      setIsInlineTempoActive(true);
    },
    [exercise, logs, activeTempo, effectiveTempo, onUpdateSetLog, onQuickStartRest]
  );

  const handlePauseInlineTempo = useCallback(() => {
    inlineMetronomeRef.current?.pause();
  }, []);

  const handleResumeInlineTempo = useCallback(() => {
    inlineMetronomeRef.current?.resume();
  }, []);

  const handleStopInlineTempo = useCallback(() => {
    inlineMetronomeRef.current?.stop();
    setIsInlineTempoActive(false);
    setInlineTempoSnapshot(null);
  }, []);

  const handleInlineLogSetDone = useCallback(() => {
    const setIdx =
      inlineTempoTargetSet !== null
        ? inlineTempoTargetSet
        : logs.findIndex((s) => !s.isCompleted);
    const targetIndex = setIdx !== -1 ? setIdx : 0;
    const targetSet = logs[targetIndex];
    const targetReps = extractTargetReps(targetSet?.targetReps || exercise.targetReps, 10);
    const reps = inlineTempoSnapshot?.currentRep || targetReps;

    if (targetSet) {
      const workingWeight =
        exercise.equipment === 'bodyweight'
          ? 0
          : targetSet.weightLbs > 0
          ? targetSet.weightLbs
          : exercise.defaultWeightLbs || exercise.defaultWeight || 0;

      onUpdateSetLog(exercise.id, targetIndex, {
        isCompleted: true,
        repsAchieved: reps > 0 ? reps : targetReps,
        weightLbs: workingWeight,
        notes: targetSet.notes ? `${targetSet.notes} · Tempo Cadence` : 'Tempo Cadence',
      });
      if (exercise.restSeconds > 0) {
        onQuickStartRest(exercise.restSeconds);
      }
    }
    handleStopInlineTempo();
  }, [exercise, logs, inlineTempoTargetSet, inlineTempoSnapshot, onUpdateSetLog, onQuickStartRest, handleStopInlineTempo]);


  useEffect(() => {
    setIsManuallyCollapsed(null);
  }, [defaultCollapsed, collapseRevision]);

  const CUE_CARD_LOOKUP = useCueCardLookup();
  const matchingCueCard = useMemo(
    () =>
      CUE_CARD_LOOKUP.get(exercise.id) ||
      CUE_CARD_LOOKUP.get(exercise.name.toLowerCase()),
    [exercise.id, exercise.name, CUE_CARD_LOOKUP]
  );

  const currentTier = TIER_CONFIG[exercise.tier] || TIER_CONFIG.T3;
  const isLLP = isLLPEligible(exercise);
  const [showLLPGuide, setShowLLPGuide] = useState(false);
  const isKneeSensitive =
    exercise.id.includes('squat') ||
    exercise.id.includes('step_down') ||
    exercise.id.includes('tibialis');

  const isExerciseCompleted = logs.length > 0 && logs.every((l) => l.isCompleted);
  const completedSetsCount = useMemo(() => logs.filter((l) => l.isCompleted).length, [logs]);

  // Live e1RM (Epley formula), Total Volume (tonnage), and PR Detection (inspired by Hevy & Strong)
  const { bestE1RM, totalVolumeLbs, isNewPR } = useMemo(() => {
    const baseWeight = exercise.defaultWeightLbs || exercise.defaultWeight || 0;
    const baseTargetReps = parseInt(exercise.targetReps, 10) || 5;
    const baselineE1RM =
      baseWeight > 0 ? Math.round(baseWeight * (1 + Math.min(baseTargetReps, 15) / 30)) : 0;

    let maxE1RM = 0;
    let volume = 0;
    let prDetected = false;

    for (const s of logs) {
      const w = s.weightLbs || 0;
      const r = s.repsAchieved || 0;
      if (w > 0 && r > 0) {
        const e1rm = Math.round(w * (1 + Math.min(r, 15) / 30));
        if (e1rm > maxE1RM) maxE1RM = e1rm;
        if (s.isCompleted && ((baselineE1RM > 0 && e1rm > baselineE1RM) || r > baseTargetReps)) {
          prDetected = true;
        }
      }
      if (s.isCompleted && w > 0 && r > 0) {
        volume += w * r;
      }
    }

    return {
      bestE1RM: maxE1RM || baselineE1RM,
      totalVolumeLbs: volume,
      isNewPR: prDetected,
    };
  }, [logs, exercise.defaultWeightLbs, exercise.defaultWeight, exercise.targetReps]);

  // Progressive Barbell Warm-Up Ramp Generator (inspired by Hevy Pro & Boostcamp)
  const warmupRampStages = useMemo(() => {
    if (exercise.equipment !== 'barbell') return [];
    const workingWeight =
      logs[0]?.weightLbs || exercise.defaultWeightLbs || exercise.defaultWeight || 135;
    const round5 = (val: number) => Math.max(45, Math.round(val / 5) * 5);
    return [
      { stage: 1, label: 'Empty Bar Groove', pct: 'Bar', weightLbs: 45, reps: 10 },
      { stage: 2, label: '50% Acclimation', pct: '50%', weightLbs: round5(workingWeight * 0.5), reps: 5 },
      { stage: 3, label: '70% Force Prep', pct: '70%', weightLbs: round5(workingWeight * 0.7), reps: 3 },
      { stage: 4, label: '85% CNS Primer', pct: '85%', weightLbs: round5(workingWeight * 0.85), reps: 1 },
    ];
  }, [exercise.equipment, exercise.defaultWeightLbs, exercise.defaultWeight, logs]);

  // Active set index for 1-Tap RPE & Knee Pain Quick-Chips
  const [isRatingModalOpen, setIsRatingModalOpen] = useState<boolean>(false);
  const [initialRatingTab, setInitialRatingTab] = useState<RatingCategoryTab>('rpe');
  const activeChipSetIndex = useMemo(() => {
    if (logs.length === 0) return 0;
    const firstUncompleted = logs.findIndex((l) => !l.isCompleted);
    return firstUncompleted !== -1 ? firstUncompleted : logs.length - 1;
  }, [logs]);

  const handleToggleQuickChip = useCallback(
    (chip: string) => {
      const targetSet = logs[activeChipSetIndex];
      if (!targetSet) return;
      const currentNotes = targetSet.notes || '';
      const hasChip = currentNotes.includes(chip);
      const nextNotes = hasChip
        ? currentNotes
            .replace(chip, '')
            .replace(/\s*·\s*·\s*/g, ' · ')
            .replace(/^\s*·\s*|\s*·\s*$/g, '')
            .trim()
        : currentNotes.trim()
        ? `${currentNotes.trim()} · ${chip}`
        : chip;
      onUpdateSetLog(exercise.id, activeChipSetIndex, { notes: nextNotes });
    },
    [logs, activeChipSetIndex, onUpdateSetLog, exercise.id]
  );

  const isUnilateral = isUnilateralExercise(exercise);
  const baseExerciseId = exercise.baseExerciseId || exercise.id;
  const baseExerciseName = exercise.name
    .replace(/\s*\((Left|Right)\s*(Leg|Arm|Side)\)/i, '')
    .trim();
  const pairedSideId = exercise.side === 'left'
    ? `${baseExerciseId}__side_right`
    : exercise.side === 'right'
    ? `${baseExerciseId}__side_left`
    : undefined;

  const activeExerciseName =
    isSwappedToRegression && exercise.regression ? exercise.regression.name : exercise.name;

  const isDailyAbsFinisher = useMemo(() => {
    const checkId = exercise.baseExerciseId || exercise.id;
    return (
      checkId.startsWith('t3_athlean_') &&
      checkId !== 't3_athlean_face_pull' &&
      checkId !== 't3_athlean_face_pull_alternative'
    );
  }, [exercise.id, exercise.baseExerciseId]);

  // Auto-collapse when completed or when controlled by Focus Mode / Collapse All, unless user explicitly toggled it
  const baseCollapsed = defaultCollapsed !== undefined ? defaultCollapsed : isExerciseCompleted;
  const isCollapsed = isManuallyCollapsed !== null ? isManuallyCollapsed : baseCollapsed;

  const handleToggleCardCollapse = useCallback(() => {
    setIsManuallyCollapsed((prev) => !(prev !== null ? prev : baseCollapsed));
  }, [baseCollapsed]);

  const visualData = useMemo(() => {
    if (isSwappedToRegression && exercise.regression) {
      const regDirect = EXERCISE_VISUALS[exercise.regression.exerciseId];
      if (regDirect) return regDirect;
      const regByName = VISUAL_BY_NAME_LOOKUP.get(exercise.regression.name.toLowerCase());
      if (regByName) return regByName;
    }
    const direct = EXERCISE_VISUALS[exercise.id] || EXERCISE_VISUALS[baseExerciseId];
    if (direct) return direct;
    const lowerName = activeExerciseName.toLowerCase();
    const byExactName = VISUAL_BY_NAME_LOOKUP.get(lowerName);
    if (byExactName) return byExactName;
    const byBaseName = VISUAL_BY_NAME_LOOKUP.get(baseExerciseName.toLowerCase());
    if (byBaseName) return byBaseName;
    return VISUAL_VALUES.find((v) => lowerName.includes(v.exerciseName.toLowerCase()) || baseExerciseName.toLowerCase().includes(v.exerciseName.toLowerCase()));
  }, [exercise.id, baseExerciseId, exercise.regression, isSwappedToRegression, activeExerciseName, baseExerciseName]);

  const demoVideo = useMemo(() => demoVideoFor(visualData?.diagramType), [visualData]);

  const handleOpenDiagramZoom = useCallback(() => {
    onOpenCueCard(exercise.id);
  }, [onOpenCueCard, exercise.id]);

  const handleToggleEntireExercise = useCallback(() => {
    const nextCompleted = !isExerciseCompleted;
    setIsManuallyCollapsed(nextCompleted);
    logs.forEach((_, idx) => {
      onUpdateSetLog(exercise.id, idx, {
        isCompleted: nextCompleted,
        ...(isUnilateral && !exercise.side
          ? { leftCompleted: nextCompleted, rightCompleted: nextCompleted }
          : {}),
      });
    });
  }, [isExerciseCompleted, logs, onUpdateSetLog, exercise.id, isUnilateral, exercise.side]);

  const handleReset = useCallback(() => {
    setIsManuallyCollapsed(false);
    handleStopInlineTempo();
    if (onResetExercise) {
      onResetExercise(exercise.id);
    } else {
      logs.forEach((_, idx) => {
        onUpdateSetLog(exercise.id, idx, {
          isCompleted: false,
          repsAchieved: 0,
          notes: '',
        });
      });
    }
  }, [onResetExercise, exercise.id, logs, onUpdateSetLog, handleStopInlineTempo]);

  // Copy Set 1 working weight down to all subsequent sets (Sets 2..N)
  const [copyWeightFlash, setCopyWeightFlash] = useState<boolean>(false);
  const handleCopySet1WeightToAll = useCallback(() => {
    const rawSet1 = logs[0]?.weightLbs;
    const fallbackDefault = exercise.defaultWeightLbs || 0;
    const targetWeight = rawSet1 !== undefined && rawSet1 > 0 ? rawSet1 : fallbackDefault;

    if (targetWeight <= 0 && (!rawSet1 || rawSet1 <= 0)) {
      return;
    }

    // If Set 1 was empty or 0 and we fell back to defaultWeightLbs, also fill Set 1
    if ((!rawSet1 || rawSet1 <= 0) && targetWeight > 0) {
      onUpdateSetLog(exercise.id, 0, { weightLbs: targetWeight });
    }

    // Fill all subsequent sets (e.g. Set 2 through Set 5)
    for (let idx = 1; idx < logs.length; idx++) {
      onUpdateSetLog(exercise.id, idx, { weightLbs: targetWeight });
    }

    setCopyWeightFlash(true);
    setTimeout(() => {
      setCopyWeightFlash(false);
    }, 1800);
  }, [logs, exercise.id, exercise.defaultWeightLbs, onUpdateSetLog]);

  // Copy Set 1 reps down to the sets not yet done (a finished set keeps the reps it was logged with)
  const [copyRepsFlash, setCopyRepsFlash] = useState<boolean>(false);
  const handleCopySet1RepsToAll = useCallback(() => {
    const rawSet1 = logs[0]?.repsAchieved;
    const targetReps = rawSet1 && rawSet1 > 0 ? rawSet1 : extractTargetReps(logs[0]?.targetReps ?? '', 0);
    if (targetReps <= 0) return;

    if (!rawSet1 || rawSet1 <= 0) {
      onUpdateSetLog(exercise.id, 0, { repsAchieved: targetReps });
    }
    for (let idx = 1; idx < logs.length; idx++) {
      if (!logs[idx].isCompleted) onUpdateSetLog(exercise.id, idx, { repsAchieved: targetReps });
    }

    setCopyRepsFlash(true);
    setTimeout(() => {
      setCopyRepsFlash(false);
    }, 1800);
  }, [logs, exercise.id, onUpdateSetLog]);

  const isExerciseSkipped = useMemo(() => {
    return logs.some((l) => l.notes?.includes('[NOT DONE]'));
  }, [logs]);

  const skippedReason = useMemo(() => {
    const match = logs.find((l) => l.notes?.includes('[NOT DONE]'))?.notes?.match(/\[NOT DONE\](?:\s*Skipped:\s*([^·\n]+))?/i);
    return match?.[1]?.trim() || '';
  }, [logs]);

  const handleConfirmSkip = useCallback(
    (_exId: string, reason: string) => {
      const todayStr = new Date().toISOString().split('T')[0];
      const reasonPart = reason ? ` Skipped: ${reason} ·` : '';
      logs.forEach((set, idx) => {
        if (!set.isCompleted) {
          const cleanNote = set.notes ? set.notes.replace(/\s*·?\s*\[NOT DONE\][^\n]*/g, '').trim() : '';
          const newNote = cleanNote
            ? `${cleanNote} · [NOT DONE on ${todayStr}]${reason ? ` (Skipped: ${reason})` : ''}`
            : `[NOT DONE]${reasonPart} Skipped on ${todayStr}`;
          onUpdateSetLog(exercise.id, idx, {
            isCompleted: false,
            notes: newNote,
          });
        }
      });
      setIsManuallyCollapsed(true);
    },
    [logs, exercise.id, onUpdateSetLog]
  );

  const handleUnskipExercise = useCallback(
    (_exId: string) => {
      logs.forEach((set, idx) => {
        if (set.notes?.includes('[NOT DONE]')) {
          const cleanNote = set.notes.replace(/\s*·?\s*\[NOT DONE\][^\n]*/g, '').trim();
          onUpdateSetLog(exercise.id, idx, {
            notes: cleanNote,
          });
        }
      });
      setIsManuallyCollapsed(false);
    },
    [logs, exercise.id, onUpdateSetLog]
  );

  return (
    <article
      id={`exercise-card-${exercise.id}`}
      data-testid="exercise-card"
      className={`cv-card rounded-xl sm:rounded-2xl ${
        isCollapsed ? 'p-3 sm:p-4' : 'p-2.5 sm:p-5 md:p-6'
      } shadow-xl mb-3 sm:mb-4 relative overflow-hidden transition-all duration-200 ${
        isSwappedToRegression
          ? 'bg-gradient-to-b from-slate-900 via-amber-950/15 to-slate-900 border-amber-500/50 ring-1 ring-amber-500/30'
          : exercise.side === 'left'
          ? 'border-blue-500/50 ring-1 ring-blue-500/25 bg-gradient-to-b from-slate-900 via-blue-950/10 to-slate-900'
          : exercise.side === 'right'
          ? 'border-purple-500/50 ring-1 ring-purple-500/25 bg-gradient-to-b from-slate-900 via-purple-950/10 to-slate-900'
          : isExerciseCompleted
          ? 'border-emerald-500/60 ring-1 ring-emerald-500/30 bg-gradient-to-b from-slate-900 to-emerald-950/20'
          : 'bg-slate-900 border-slate-800'
      }`}
    >
      {isCollapsed ? (
        /* Sleek Collapsed Summary Card */
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {visualData && (
              <ExerciseDiagram
                diagramType={visualData.diagramType}
                exerciseName={activeExerciseName}
                compact={true}
                onOpenZoom={handleOpenDiagramZoom}
              />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span
                  className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded border font-mono tracking-wide ${currentTier.bg} ${currentTier.text} ${currentTier.border}`}
                >
                  {exercise.tier}
                </span>
                <h3 className="text-sm sm:text-base font-bold text-white truncate">
                  {activeExerciseName}
                </h3>
                {isDailyAbsFinisher && (
                  <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    Daily Abs
                  </span>
                )}
                {isSwappedToRegression && (
                  <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    Regression
                  </span>
                )}
                {(exercise.priorityBadge || exercise.missedLastSession) && (
                  <span
                    data-testid="collapsed-priority-badge"
                    className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/25 text-amber-300 border border-amber-500/50 flex items-center gap-1"
                  >
                    <span>⚡ Priority</span>
                  </span>
                )}
                {logs.some((l) => l.llpPerformed) && (
                  <span
                    data-testid="collapsed-llp-badge"
                    className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-purple-500/25 text-purple-300 border border-purple-500/50 flex items-center gap-1"
                  >
                    <span>🔥 +LLPs</span>
                  </span>
                )}
                {exercise.side && (
                  <span
                    data-testid={`side-badge-${exercise.side}`}
                    className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full border ${
                      exercise.side === 'left'
                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                        : 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                    }`}
                  >
                    {exercise.side === 'left' ? 'Left Side' : 'Right Side'}
                  </span>
                )}
                {isExerciseSkipped ? (
                  <span
                    data-testid="collapsed-skipped-badge"
                    className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1"
                    title={skippedReason ? `Skipped: ${skippedReason}` : 'Skipped'}
                  >
                    <FastForward className="w-3 h-3 text-amber-400" />
                    <span className="truncate max-w-[120px]">{skippedReason ? `Skipped: ${skippedReason}` : 'Skipped'}</span>
                  </span>
                ) : isExerciseCompleted ? (
                  <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                    <Check className="w-3 h-3 stroke-[3]" />
                    <span>Done ({completedSetsCount}/{exercise.targetSets})</span>
                  </span>
                ) : (
                  <span className="text-[10px] sm:text-xs font-mono text-slate-400">
                    {completedSetsCount}/{exercise.targetSets} sets
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400 truncate mt-0.5">
                Target: {exercise.targetSets} × {exercise.targetReps} · {exercise.equipment.replaceAll('_', ' ')} · Tempo {activeTempo}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-stretch sm:self-center justify-end shrink-0 pt-1.5 sm:pt-0 border-t border-slate-800/60 sm:border-t-0">
            {availableVariations.length > 1 && (
              <button
                type="button"
                data-testid={`collapsed-variations-btn-${exercise.id}`}
                onClick={() => setIsVariationModalOpen(true)}
                aria-label={`View variations for ${activeExerciseName}`}
                title={`Browse ${availableVariations.length} science-verified variations`}
                className="p-2 min-h-[44px] min-w-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-300 border border-slate-700/80 transition-colors cursor-pointer flex items-center justify-center"
              >
                <Layers className="w-3.5 h-3.5 text-blue-400" />
              </button>
            )}

            <button
              type="button"
              onClick={handleReset}
              aria-label={`Reset ${activeExerciseName} sets`}
              title={`Reset ${activeExerciseName} sets`}
              className="p-2 min-h-[44px] min-w-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700/80 transition-colors cursor-pointer flex items-center justify-center"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              data-testid={`skip-exercise-btn-${exercise.id}`}
              onClick={() => setIsSkipModalOpen(true)}
              aria-label={isExerciseSkipped ? `Edit skip reason for ${activeExerciseName}` : `Mark ${activeExerciseName} as skipped`}
              title={isExerciseSkipped ? `Skipped: ${skippedReason || 'No reason specified'} (Click to edit)` : 'Mark exercise as skipped'}
              className={`flex items-center justify-center gap-1 px-3 py-1.5 min-h-[44px] rounded-xl border text-xs font-bold transition-all cursor-pointer select-none active:scale-95 ${
                isExerciseSkipped
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-700/80 hover:border-slate-600'
              }`}
            >
              <FastForward className="w-3.5 h-3.5 text-amber-400" />
              <span>{isExerciseSkipped ? 'Skipped' : 'Skip'}</span>
            </button>

            <button
              type="button"
              onClick={handleToggleEntireExercise}
              aria-label={`Mark entire exercise ${exercise.name} as ${isExerciseCompleted ? 'incomplete' : 'complete'}`}
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 min-h-[44px] rounded-xl border text-xs font-bold transition-all cursor-pointer select-none active:scale-95 ${
                isExerciseCompleted
                  ? 'bg-emerald-500/25 text-emerald-300 border-emerald-500/50'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
              }`}
            >
              <div
                className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-all ${
                  isExerciseCompleted
                    ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                    : 'border-slate-500 bg-slate-950'
                }`}
              >
                {isExerciseCompleted && <Check className="w-2.5 h-2.5 stroke-[3]" />}
              </div>
              <span>{isExerciseCompleted ? 'Done' : 'Check Off'}</span>
            </button>

            <button
              type="button"
              onClick={handleToggleCardCollapse}
              aria-label={`Expand ${exercise.name}`}
              className="flex items-center justify-center gap-1 px-3 py-1.5 min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80 text-xs font-medium cursor-pointer transition-colors"
            >
              <span>Expand</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>
      ) : (
        /* Expanded Exercise Card */
        <>
      {/* Exercise Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {/* GZCL Tier Badge */}
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-lg border font-mono tracking-wide ${currentTier.bg} ${currentTier.text} ${currentTier.border}`}
            >
              {exercise.tier} · {currentTier.label}
            </span>

            {/* Equipment Tag */}
            <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700/60 uppercase font-mono tracking-wider">
              {exercise.equipment.replaceAll('_', ' ')}
            </span>

            {/* Athlean-X Daily Core Finisher Badge */}
            {isDailyAbsFinisher && (
              <span
                data-testid="daily-core-badge"
                className="text-xs px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold tracking-wide flex items-center gap-1"
              >
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>Athlean-X Daily Core Finisher</span>
              </span>
            )}

            {/* AMRAP Badge */}
            {exercise.isAmrapLastSet && (
              <span className="text-xs px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                AMRAP Last Set
              </span>
            )}

            {/* Live e1RM Badge (Hevy / Strong Inspiration) */}
            {bestE1RM > 0 && (
              <span
                className="text-xs px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-300 font-mono font-semibold border border-cyan-500/30"
                title="Estimated 1-Rep Max (Epley Formula)"
              >
                e1RM: {bestE1RM} lbs
              </span>
            )}

            {/* Live Tonnage / Volume Badge */}
            {totalVolumeLbs > 0 && (
              <span
                className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono border border-slate-700"
                title="Total Completed Volume (Weight × Reps)"
              >
                Vol: {totalVolumeLbs.toLocaleString()} lbs
              </span>
            )}

            {/* Live Personal Record (PR) Badge */}
            {isNewPR && (
              <span
                data-testid="pr-badge"
                className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-amber-500/25 text-amber-300 font-bold border border-amber-400/50 shadow-sm animate-pulse"
              >
                <Trophy className="w-3 h-3 text-amber-400" />
                <span>New PR!</span>
              </span>
            )}

            {/* High Priority Focus Badge */}
            {(exercise.priorityBadge || exercise.missedLastSession) && (
              <span
                data-testid="priority-catchup-badge"
                className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-amber-500/25 text-amber-300 border border-amber-400/50 font-bold tracking-wide shadow-sm"
              >
                <span>⚡ High Priority</span>
              </span>
            )}

            {/* Jeff Nippard LLP Protocol Badge */}
            {isLLP && (
              <span
                data-testid="expanded-llp-badge"
                className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-400/40 font-bold tracking-wide shadow-sm"
              >
                <Flame className="w-3.5 h-3.5 text-purple-400" />
                <span>LLP Protocol</span>
              </span>
            )}

            {/* Skipped Badge */}
            {isExerciseSkipped && (
              <span
                data-testid="expanded-skipped-badge"
                className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold tracking-wide shadow-sm"
              >
                <FastForward className="w-3.5 h-3.5 text-amber-400" />
                <span>Skipped{skippedReason ? `: ${skippedReason}` : ''}</span>
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            {/* 44x44px Exercise Visual Motion Thumbnail */}
            {visualData && (
              <ExerciseDiagram
                diagramType={visualData.diagramType}
                exerciseName={activeExerciseName}
                compact={true}
                onOpenZoom={handleOpenDiagramZoom}
              />
            )}

            <div className="flex flex-col min-w-[11rem] flex-1">
              <h2 className="text-lg sm:text-2xl font-bold text-white tracking-tight break-words">
                {activeExerciseName}
              </h2>

              <div className="flex items-center gap-1.5 flex-wrap mt-1">
                {demoVideo && (
                  <a
                    href={youtubeUrl(demoVideo)}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid={`demo-video-link-${exercise.id}`}
                    title={`${demoVideo.title} (${demoVideo.channel}, YouTube)`}
                    className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-xl bg-red-500/15 text-red-300 border border-red-500/40 hover:bg-red-500/25 min-h-[32px]"
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>Demo · {demoVideo.channel}</span>
                  </a>
                )}
                {isSwappedToRegression && exercise.regression && (
                  <span
                    data-testid="active-regression-badge"
                    className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5 text-amber-400" />
                    <span>Swapped: {exercise.regression.name}</span>
                  </span>
                )}

                {exercise.side && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      data-testid={`side-badge-${exercise.side}`}
                      className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-xl border ${
                        exercise.side === 'left'
                          ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                          : 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full animate-pulse ${exercise.side === 'left' ? 'bg-blue-400' : 'bg-purple-400'}`} />
                      <span>{exercise.side === 'left' ? 'Left Side Workout' : 'Right Side Workout'}</span>
                    </span>

                    {pairedSideId && (
                      <button
                        type="button"
                        data-testid="switch-to-paired-side-btn"
                        onClick={() => {
                          onSwitchToPairedSide?.(pairedSideId);
                          const el = document.getElementById(`exercise-card-${pairedSideId}`);
                          if (el) el.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer"
                        title={`Switch to ${exercise.side === 'left' ? 'Right Side' : 'Left Side'} Workout`}
                        aria-label={`Switch to ${exercise.side === 'left' ? 'Right Side' : 'Left Side'} Workout`}
                      >
                        <span>Switch to {exercise.side === 'left' ? 'Right Side' : 'Left Side'} ➜</span>
                      </button>
                    )}

                    {onToggleSplitSides && (
                      <button
                        type="button"
                        data-testid="merge-sides-btn"
                        onClick={() => onToggleSplitSides(baseExerciseId)}
                        className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700/60 transition-colors cursor-pointer"
                        title="Merge Left and Right workouts back into a single card"
                        aria-label="Merge Left and Right workouts"
                      >
                        <span>Merge Sides</span>
                      </button>
                    )}
                  </div>
                )}

                {!exercise.side && onToggleSplitSides && (
                  <button
                    type="button"
                    data-testid="split-sides-btn"
                    onClick={() => onToggleSplitSides(exercise.id)}
                    className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-xl border transition-all cursor-pointer ${
                      isSideSplitActive
                        ? 'bg-blue-500/25 text-blue-200 border-blue-400 shadow-sm ring-1 ring-blue-400/40'
                        : isUnilateral
                        ? 'bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border-blue-500/40 shadow-sm'
                        : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700/80'
                    }`}
                    title="If you need to switch left or right sides, create its own workout to be completed also"
                    aria-label={`Split ${exercise.name} into separate Left and Right workouts`}
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5 text-blue-400" />
                    <span>{isSideSplitActive ? 'Split L/R Workouts (Active)' : isUnilateral ? 'Switch Sides: Create L/R Workouts' : 'Split L/R Workouts'}</span>
                  </button>
                )}
              </div>
              {isSwappedToRegression && (
                <span className="text-xs text-amber-300/80 font-mono mt-0.5">
                  Regressed from primary: {exercise.name}
                </span>
              )}
            </div>

            {/* Prominent Exercise-Level Completion Checkbox */}
            <button
              type="button"
              onClick={handleToggleEntireExercise}
              aria-label={`Mark entire exercise ${exercise.name} as ${isExerciseCompleted ? 'incomplete' : 'complete'}`}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer select-none active:scale-95 ${
                isExerciseCompleted
                  ? 'bg-emerald-500/25 text-emerald-300 border-emerald-500/50 shadow-sm shadow-emerald-950/60'
                  : 'bg-slate-800/90 hover:bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
              }`}
            >
              <div
                className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                  isExerciseCompleted
                    ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                    : 'border-slate-500 bg-slate-950'
                }`}
              >
                {isExerciseCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
              <span>
                {isExerciseCompleted
                  ? 'Completed ✓'
                  : `Mark Complete (${completedSetsCount}/${exercise.targetSets})`}
              </span>
            </button>

            {/* Skip Exercise Button */}
            <button
              type="button"
              data-testid={`skip-exercise-btn-${exercise.id}`}
              onClick={() => setIsSkipModalOpen(true)}
              aria-label={isExerciseSkipped ? `Edit skip reason for ${activeExerciseName}` : `Mark ${activeExerciseName} as skipped`}
              className={`flex items-center gap-2 px-3 py-1.5 min-h-[44px] rounded-xl border text-xs font-bold transition-all cursor-pointer select-none active:scale-95 ${
                isExerciseSkipped
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm shadow-amber-950/40'
                  : 'bg-slate-800/90 hover:bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
              }`}
            >
              <FastForward className={`w-3.5 h-3.5 ${isExerciseSkipped ? 'text-amber-400' : 'text-slate-400'}`} />
              <span>
                {isExerciseSkipped
                  ? (skippedReason ? `Skipped: ${skippedReason}` : 'Skipped ⏭️')
                  : 'Skip'}
              </span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-slate-400">
            <span>
              Target:{' '}
              <strong className="text-slate-200">
                {exercise.targetSets} {exercise.targetSets === 1 ? 'set' : 'sets'} × {exercise.targetReps}
                {/reps?|s$|sec|min|rounds?|ladders?|feet|ft|pulses?|hold|hang|cycles?|casts?|circles?|\//i.test(exercise.targetReps.trim()) ? '' : ' reps'}
              </strong>
            </span>
            <span>·</span>
            <span>
              Muscles: <span className="text-slate-300">{exercise.muscleGroups.join(', ')}</span>
            </span>
          </div>
        </div>

        {/* Quick Launch Action Pills & Card Collapse / Reset */}
        <div className="flex flex-wrap sm:flex-col items-end gap-2">
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {exercise.equipment === 'barbell' && (
              <button
                type="button"
                onClick={() => setShowWarmupRamp((prev) => !prev)}
                aria-expanded={showWarmupRamp}
                aria-label={`Toggle warm-up ramp for ${exercise.name}`}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-xl border text-xs font-medium cursor-pointer transition-colors ${
                  showWarmupRamp
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                    : 'bg-slate-800/80 hover:bg-slate-700 text-amber-300/90 border-slate-700/80'
                }`}
                title="Generate progressive barbell warm-up sets"
              >
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>Warm-Up Ramp</span>
              </button>
            )}


            {availableVariations.length > 1 && (
              <button
                type="button"
                data-testid={`exercise-variations-btn-${exercise.id}`}
                onClick={() => setIsVariationModalOpen(true)}
                aria-label={`View variations for ${activeExerciseName}`}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-blue-300 border border-slate-700/80 text-xs font-medium cursor-pointer transition-colors"
                title={`Browse ${availableVariations.length} science-verified variations`}
              >
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                <span>Variations ({availableVariations.length})</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleReset}
              aria-label={`Reset ${exercise.name} sets`}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700/80 text-xs font-medium cursor-pointer transition-colors"
              title={`Reset ${exercise.name} sets`}
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Reset</span>
            </button>

            <button
              type="button"
              onClick={handleToggleCardCollapse}
              aria-label={`Collapse ${exercise.name}`}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700/80 text-xs font-medium cursor-pointer transition-colors"
              title={`Collapse ${exercise.name} card`}
            >
              <span>Collapse</span>
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          </div>
          {/* Quick-Launch Inline Tempo / Hold Timer & Fullscreen Metronome (timed exercises only) */}
          {needsTimer && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              data-testid="inline-tempo-header-btn"
              onClick={() => {
                if (isInlineTempoActive) {
                  if (inlineTempoSnapshot?.state === 'PAUSED') {
                    handleResumeInlineTempo();
                  } else {
                    handlePauseInlineTempo();
                  }
                } else {
                  handleStartInlineTempo();
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] sm:min-h-[38px] rounded-xl text-xs font-mono font-bold transition-all cursor-pointer active:scale-95 ${
                isInlineTempoActive
                  ? inlineTempoSnapshot?.state === 'PAUSED'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-emerald-500 text-slate-950 border border-emerald-400 shadow-md shadow-emerald-950/40 animate-pulse'
                  : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40'
              }`}
              title={
                isInlineTempoActive
                  ? inlineTempoSnapshot?.state === 'PAUSED'
                    ? 'Resume inline tempo'
                    : 'Pause inline tempo'
                  : `Start tempo ${effectiveTempo} on card`
              }
              aria-label={
                isInlineTempoActive
                  ? inlineTempoSnapshot?.state === 'PAUSED'
                    ? 'Resume inline tempo'
                    : 'Pause inline tempo'
                  : `Start tempo ${effectiveTempo} on card`
              }
            >
              {isInlineTempoActive ? (
                inlineTempoSnapshot?.state === 'PAUSED' ? (
                  <Play className="w-3.5 h-3.5 fill-amber-300" />
                ) : (
                  <Pause className="w-3.5 h-3.5 fill-slate-950" />
                )
              ) : (
                <Play className="w-3.5 h-3.5 fill-emerald-300" />
              )}
              <span>
                {isInlineTempoActive
                  ? inlineTempoSnapshot?.state === 'PAUSED'
                    ? inlineTempoSnapshot?.parsedTempo.isIsometricHold ? 'Resume Hold' : 'Resume'
                    : inlineTempoSnapshot?.parsedTempo.isIsometricHold
                    ? `Holding: ${inlineTempoSnapshot?.phaseRemainingSeconds || 0}s`
                    : `Rep ${inlineTempoSnapshot?.currentRep || 1}/${inlineTempoSnapshot?.targetReps || 10}`
                  : effectiveTempo.startsWith('HOLD-')
                  ? `Start ${effectiveTempo.replace('HOLD-', '')}s Hold`
                  : activeTempo.startsWith('HOLD-')
                  ? `Start ${activeTempo.replace('HOLD-', '')}s Hold`
                  : activeTempo.toLowerCase().includes('hold')
                  ? 'Start Hold Clock'
                  : `Start Tempo: ${activeTempo}`}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onQuickStartTempo(effectiveTempo, exercise.id)}
              className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 min-h-[44px] sm:min-h-[38px] min-w-[44px] rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 text-xs font-mono font-medium transition-colors cursor-pointer"
              title={`Launch Marcus Filly metronome for ${effectiveTempo}`}
              aria-label={`Launch Marcus Filly metronome for ${effectiveTempo}`}
            >
              <Activity className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">Visualizer</span>
            </button>
          </div>
          )}

          {/* Quick-Launch Rest Timer */}
          <button
            type="button"
            onClick={() => onQuickStartRest(exercise.restSeconds)}
            className="flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] sm:min-h-[38px] rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-medium transition-colors cursor-pointer"
            title={`Start ${exercise.restSeconds}s rest timer`}
          >
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Rest: <strong className="text-white">{exercise.restSeconds}s ({formatMMSS(exercise.restSeconds)})</strong></span>
          </button>
        </div>
      </div>

      {/* Priority Catch-Up / Auto-Regulation Banner */}
      {(exercise.priorityBadge || exercise.missedLastSession) && (
        <div
          data-testid="missed-exercise-priority-banner"
          className="mb-3.5 p-3 sm:p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 flex items-start gap-2.5 text-xs sm:text-sm"
        >
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="font-bold text-amber-300 flex items-center gap-2 flex-wrap">
              <span>{exercise.priorityBadge || '⚡ High Priority Focus'}</span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-950/60 border border-amber-500/30 text-amber-300">
                Auto-Regulated: {exercise.targetSets} Sets
              </span>
            </div>
            <p className="text-amber-200/90 text-xs mt-1 leading-relaxed">
              This exercise was marked not done in your previous session. Volume has been auto-regulated to {exercise.targetSets} sets to restore consistency safely.
            </p>
          </div>
        </div>
      )}

      {/* Jeff Nippard Long-Length Partials (LLP) Protocol Banner */}
      {isLLP && (
        <div
          data-testid="llp-protocol-banner"
          className="mb-3.5 p-3 sm:p-3.5 rounded-xl bg-purple-950/40 border border-purple-500/40 text-purple-200 flex flex-col gap-2 text-xs sm:text-sm"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-bold text-purple-300">
              <Flame className="w-4 h-4 text-purple-400 shrink-0" />
              <span>Lengthened Partials (LLPs, Jeff Nippard)</span>
            </div>
            <button
              type="button"
              data-testid="toggle-llp-guide-btn"
              onClick={() => setShowLLPGuide((prev) => !prev)}
              className="text-[11px] font-mono text-purple-300 hover:text-white underline cursor-pointer shrink-0"
            >
              {showLLPGuide ? 'Hide Science Cue' : '🔬 Science Cue & Protocol'}
            </button>
          </div>
          <p className="text-purple-200/90 text-xs leading-relaxed">
            {exercise.llpProtocolNotes || 'On the final set, when full reps run out, add a few controlled partials in the stretched half of the range.'}
          </p>
          {showLLPGuide && (
            <div className="pt-2 border-t border-purple-800/40 text-[11px] text-purple-200 space-y-1.5 animate-in fade-in duration-150">
              <p>
                <strong>What the research shows:</strong> Training at long muscle lengths tends to beat training at short lengths. Compared with full reps, lengthened partials give similar growth in trained lifters (Wolf et al. 2025, co-authored by Nippard). They extend a set; they don&apos;t beat full reps.
              </p>
              <p>
                <strong>How:</strong> No bouncing; control the bottom. Log them with the <span className="font-mono bg-purple-900/60 px-1 py-0.5 rounded border border-purple-400/50">+LLPs</span> button on your last set.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Prominent Active Regression Card Banner */}
      {isSwappedToRegression && exercise.regression && (
        <div
          data-testid="active-regression-card-banner"
          className="mb-3.5 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-200 shadow-md space-y-2"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                <ArrowLeftRight className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-bold text-white text-sm sm:text-base">
                    Active Regression: {exercise.regression.name}
                  </h4>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
                    Tempo: {exercise.regression.tempo}
                  </span>
                </div>
                <p className="text-xs text-amber-200/90 mt-1 leading-relaxed">
                  <strong>Trigger Reason:</strong> {exercise.regression.condition}
                </p>
                <p className="text-xs text-slate-200 mt-1 leading-relaxed">
                  <strong>Form & Setup Protocol:</strong> {exercise.regression.instructions}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleToggleRegression(false)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 text-xs font-semibold shrink-0 cursor-pointer transition-colors"
              title={`Restore primary exercise ${exercise.name}`}
              aria-label={`Restore primary exercise ${exercise.name}`}
            >
              Restore Primary Lift
            </button>
          </div>
        </div>
      )}

      {/* Knee-Safety Protocol Banner (Compact Collapsible Pill) */}
      {isKneeSensitive && (
        <div className="mb-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 overflow-hidden transition-all">
          <button
            type="button"
            onClick={() => setShowKneeSafety((prev) => !prev)}
            aria-expanded={showKneeSafety}
            aria-label={showKneeSafety ? 'Collapse Knee Safety Protocol' : 'Expand Knee Safety Protocol'}
            className="w-full px-3 py-2 flex items-center justify-between gap-2 text-left hover:bg-amber-500/15 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 min-w-0">
              <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span className="truncate">
                <strong className="text-amber-300 font-semibold">Knee Tendinitis Safety Protocol:</strong>{' '}
                <span className="text-amber-200/90 font-mono text-[11px]">3-4s Eccentric · Pain ≤ 2/10</span>
              </span>
            </div>
            <span className="flex items-center gap-1 text-[11px] text-amber-300/90 font-medium shrink-0">
              <span>{showKneeSafety ? 'Hide' : 'Details'}</span>
              {showKneeSafety ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </span>
          </button>
          <div className={showKneeSafety ? 'px-3 pb-2.5 pt-0.5 text-amber-200/95 border-t border-amber-500/20 leading-relaxed' : 'sr-only'}>
            Maintain a strict 3-4 second slow eccentric descent. Zero bouncing or ballistic stretch reflex in the hole.
            Pain must remain ≤ 2/10. If knee discomfort occurs, switch immediately to the regression.
          </div>
        </div>
      )}

      {/* Progressive Barbell Warm-Up Ramp Generator (Hevy & Boostcamp Inspiration) */}
      {showWarmupRamp && warmupRampStages.length > 0 && (
        <div
          data-testid="warmup-ramp-panel"
          className="mb-3 p-3 rounded-xl bg-slate-950/90 border border-amber-500/30 text-xs space-y-2"
        >
          <div className="flex items-center justify-between text-amber-300 font-semibold">
            <span className="flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>Progressive Barbell Warm-Up Ramp (Working Load: {logs[0]?.weightLbs || exercise.defaultWeightLbs || 135} lbs)</span>
            </span>
            <button
              type="button"
              onClick={() => setShowWarmupRamp(false)}
              className="text-[11px] text-slate-400 hover:text-white cursor-pointer"
            >
              Hide
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {warmupRampStages.map((wStage) => {
              const isStageDone = !!completedWarmupStages[wStage.stage];
              return (
                <div
                  key={wStage.stage}
                  className={`p-2 rounded-lg border flex flex-col justify-between gap-1.5 transition-all ${
                    isStageDone
                      ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-200'
                      : 'bg-slate-900 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-mono uppercase text-amber-400 font-bold">
                      W{wStage.stage} · {wStage.pct}
                    </span>
                  </div>
                  <div className="font-mono font-bold text-sm text-white">
                    {wStage.weightLbs} lbs × {wStage.reps}
                  </div>
                  {isBarbell && (
                    <div className="text-[10px] font-mono text-slate-400" data-testid={`warmup-plates-${wStage.stage}`}>
                      per side: {platesPerSideText(wStage.weightLbs)}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      const nextDone = !isStageDone;
                      setCompletedWarmupStages((prev) => ({ ...prev, [wStage.stage]: nextDone }));
                      if (nextDone) onQuickStartRest(60);
                    }}
                    aria-label={`Mark warm-up stage ${wStage.stage} as ${isStageDone ? 'incomplete' : 'completed'}`}
                    className={`w-full py-1 rounded text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                      isStageDone
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    {isStageDone && <Check className="w-3 h-3 stroke-[3]" />}
                    <span>{isStageDone ? 'Done (60s)' : 'Log Warm-Up'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isBarbell && (
        <PlateLoadStrip
          exerciseId={exercise.id}
          weights={plateWeights}
          openWeight={showPlateCalculator ? plateCalcWeight : null}
          onToggleVisual={toggleBarView}
        />
      )}

      {/* Bowflex SelectTech 840 Quick Dial Selector (For Kettlebell Movements) */}
      {exercise.equipment === 'kettlebell' && (
        <div
          data-testid={`bowflex-840-dial-${exercise.id}`}
          className="mb-3 p-2.5 sm:p-3 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm shadow-red-500/50" />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white tracking-tight flex items-center gap-1">
                Bowflex 840 Dial Setting
              </span>
              <span className="text-[10px] text-slate-400">1-tap select working weight</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {BOWFLEX_840_KETTLEBELL_SETTINGS.map((weight) => {
              const currentSet1Weight = logs[0]?.weightLbs || exercise.defaultWeightLbs;
              const isSelected = currentSet1Weight === weight;
              return (
                <button
                  key={weight}
                  type="button"
                  data-testid={`bowflex-dial-btn-${exercise.id}-${weight}`}
                  onClick={() => {
                    for (let idx = 0; idx < logs.length; idx++) {
                      onUpdateSetLog(exercise.id, idx, { weightLbs: weight });
                    }
                  }}
                  title={`Set all sets to ${weight} lbs (Bowflex SelectTech 840 setting)`}
                  aria-label={`Select ${weight} lbs Bowflex kettlebell setting`}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                    isSelected
                      ? 'bg-red-500/25 text-red-200 border border-red-500/60 shadow-md shadow-red-950/40 ring-1 ring-red-500/40'
                      : 'bg-slate-950/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 hover:border-slate-600'
                  }`}
                >
                  {weight} lbs
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Inline Barbell Plate Loading Calculator Drawer (Only for Barbell Movements) */}
      {isBarbell && showPlateCalculator && (
        <div
          data-testid={`inline-plate-calculator-${exercise.id}`}
          className="mb-4 p-2 sm:p-3 rounded-2xl bg-slate-950/90 border border-red-500/40 shadow-xl space-y-2 animate-fadeIn"
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30">
                <Disc className="w-4 h-4 text-red-400" />
              </div>
              <div>
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Barbell Plate Loader: <span className="text-red-400 font-mono">{exercise.name}</span>
                </span>
                <p className="text-[11px] text-slate-400">
                  Target Load: <strong className="text-white font-mono">{plateCalcWeight} lbs</strong> · 45 lb Olympic Bar
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowPlateCalculator(false)}
              aria-label="Close Plate Calculator"
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer transition-colors"
            >
              Close
            </button>
          </div>
          <Suspense fallback={null}>
          <PlateCalculatorWidget
            initialWeight={plateCalcWeight}
            onWeightChange={(newWeight) => {
              setPlateCalcWeight(newWeight);
            }}
            onClose={() => setShowPlateCalculator(false)}
            className="w-full bg-slate-900 border border-slate-800 p-3 sm:p-4 shadow-none"
          />
          </Suspense>
        </div>
      )}

      {/* AMRAP Final Set Reminder Banner */}
      {exercise.isAmrapLastSet && (
        <div
          data-testid="amrap-reminder-banner"
          className="mb-3 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-rose-950/50 via-slate-900 to-rose-950/40 border border-rose-500/40 text-rose-100 shadow-lg"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 sm:p-2.5 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 shrink-0 mt-0.5 sm:mt-0">
                <Flame className="w-5 h-5 text-rose-400 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-bold text-white text-sm sm:text-base tracking-tight">
                    Final Set: As Many Reps As Possible (AMRAP)!
                  </h4>
                  <span className="text-[10px] sm:text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase">
                    GZCL Tier 1
                  </span>
                </div>
                <p className="text-xs text-rose-200/90 mt-1 leading-relaxed">
                  Push for max reps on Set {logs.length}. Leave 1 rep in reserve (1 RIR) — never sacrifice clean form.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
              <button
                type="button"
                onClick={() => voiceAnnouncer.announceAmrapPrompt(exercise.name)}
                className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 text-xs font-medium border border-rose-500/30 flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Play AMRAP voice cue"
                aria-label="Play AMRAP voice prompt"
              >
                <Mic className="w-3.5 h-3.5 text-rose-400" />
                <span>Voice Cue</span>
              </button>

            </div>
          </div>

        </div>
      )}

      {/* Live Interactive Marcus Filly Inline Tempo Cadence Panel */}
      {isInlineTempoActive && inlineTempoSnapshot && (
        <div
          data-testid="inline-tempo-panel"
          className="mb-3 p-3 sm:p-3.5 rounded-xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-emerald-950/30 border border-emerald-500/40 text-xs shadow-lg space-y-2.5 transition-all"
        >
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="font-bold text-white text-sm">
                Tempo Cadence ({effectiveTempo || activeTempo})
              </span>
              <span
                className="px-2 py-0.5 rounded-md font-mono font-bold text-[11px] uppercase border"
                style={{
                  backgroundColor: `${inlineTempoSnapshot.phaseColor}20`,
                  color: inlineTempoSnapshot.phaseColor,
                  borderColor: `${inlineTempoSnapshot.phaseColor}50`,
                }}
              >
                {inlineTempoSnapshot.phaseLabel} ({inlineTempoSnapshot.formattedPhaseMMSS || formatMMSS(inlineTempoSnapshot.phaseRemainingSeconds)})
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-mono text-emerald-300 font-bold text-xs">
                Time {inlineTempoSnapshot.formattedElapsedMMSS || formatMMSS(inlineTempoSnapshot.totalElapsedSeconds || 0)} · Set {(inlineTempoTargetSet !== null ? inlineTempoTargetSet + 1 : 1)} · Rep {inlineTempoSnapshot.currentRep}/{inlineTempoSnapshot.targetReps}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className="h-full transition-all duration-100 ease-linear"
              style={{
                width: `${inlineTempoSnapshot.phaseProgressRatio * 100}%`,
                backgroundColor: inlineTempoSnapshot.phaseColor,
              }}
            />
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                data-testid="inline-tempo-pause-resume-btn"
                onClick={() =>
                  inlineTempoSnapshot.state === 'PAUSED'
                    ? handleResumeInlineTempo()
                    : handlePauseInlineTempo()
                }
                className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                {inlineTempoSnapshot.state === 'PAUSED' ? (
                  <>
                    <Play className="w-3 h-3 fill-emerald-300" />
                    <span>Resume</span>
                  </>
                ) : (
                  <>
                    <Pause className="w-3 h-3 fill-amber-300" />
                    <span>Pause</span>
                  </>
                )}
              </button>

              <button
                type="button"
                data-testid="inline-tempo-log-done-btn"
                onClick={handleInlineLogSetDone}
                className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
              >
                <Check className="w-3 h-3 stroke-[3]" />
                <span>Log Set Done</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                data-testid="inline-tempo-stop-btn"
                onClick={handleStopInlineTempo}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700/80 text-xs cursor-pointer"
              >
                Reset
              </button>

              <button
                type="button"
                data-testid="inline-tempo-expand-btn"
                onClick={() => onQuickStartTempo(effectiveTempo, exercise.id)}
                className="px-2.5 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 text-xs flex items-center gap-1 cursor-pointer"
                title="Open full-screen tempo visualizer modal"
              >
                <Activity className="w-3 h-3" />
                <span>Visualizer</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* McGill Big 3 Tri-Set Protocol Panel */}
      {isMcGillBig3 && (
        <div
          data-testid="mcgill-big3-protocol"
          className="mb-4 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-slate-900 via-emerald-950/20 to-slate-900 border border-emerald-500/40 shadow-lg space-y-3"
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-500/20 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <ShieldAlert className="w-4 h-4 text-emerald-400" />
              </span>
              <div>
                <h4 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
                  <span>Dr. McGill Big 3 Core Endurance Protocol</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    Tri-Set
                  </span>
                </h4>
                <p className="text-[11px] text-slate-300">
                  Each round performs all 3 isometric stability drills without lumbar flexion. 10s hold per drill.
                </p>
              </div>
            </div>

            {/* Hold Timer Status */}
            {isMcgillHolding && (
              <div className="flex items-center gap-2 bg-emerald-950/80 border border-emerald-500/50 px-3 py-1 rounded-xl text-xs font-mono text-emerald-300 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Hold: {formatMMSS(mcgillHoldSeconds)}</span>
              </div>
            )}
          </div>

          {/* Round Selector Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1">
            {[0, 1, 2].map((rIdx) => {
              const roundNumber = rIdx + 1;
              const roundSet = logs[rIdx];
              const isRoundComplete = roundSet?.isCompleted;
              const drills = mcgillCompletedDrills[rIdx] || {};
              const completedCount = Object.values(drills).filter(Boolean).length;
              const isSelected = activeMcGillRound === rIdx;

              return (
                <button
                  key={rIdx}
                  type="button"
                  data-testid={`mcgill-round-tab-${roundNumber}`}
                  onClick={() => setActiveMcGillRound(rIdx)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all border ${
                    isSelected
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md font-bold'
                      : isRoundComplete
                      ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/30'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                  }`}
                >
                  <span>Round {roundNumber}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isSelected
                        ? 'bg-slate-950/20 text-slate-950 font-mono font-bold'
                        : isRoundComplete
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-slate-700 text-slate-400'
                    }`}
                  >
                    {isRoundComplete ? 'Done ✓' : `${completedCount}/3`}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Round Drill Cards */}
          <div className="space-y-2 pt-1">
            {MCGILL_DRILLS.map((drill) => {
              const isDrillDone = !!mcgillCompletedDrills[activeMcGillRound]?.[drill.id] || !!logs[activeMcGillRound]?.isCompleted;
              const isCurrentlyHoldingThisDrill = isMcgillHolding && activeHoldingDrill === drill.id;

              return (
                <div
                  key={drill.id}
                  data-testid={`mcgill-drill-${drill.id}`}
                  className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isDrillDone
                      ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
                      : 'bg-slate-950/60 border-slate-800 text-slate-200'
                  }`}
                >
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    <button
                      type="button"
                      data-testid={`mcgill-toggle-drill-${drill.id}`}
                      onClick={() => handleToggleMcGillDrill(activeMcGillRound, drill.id)}
                      className={`mt-0.5 w-5 h-5 rounded-lg flex items-center justify-center border transition-all cursor-pointer shrink-0 ${
                        isDrillDone
                          ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                          : 'border-slate-600 bg-slate-900 hover:border-emerald-500'
                      }`}
                      aria-label={`Toggle ${drill.name} completion for Round ${activeMcGillRound + 1}`}
                    >
                      {isDrillDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </button>

                    {/* Drill Diagram Animation */}
                    <ExerciseDiagram
                      diagramType={MCGILL_DRILL_DIAGRAM_MAP[drill.id]}
                      exerciseName={drill.name}
                      compact={true}
                      onOpenZoom={handleOpenDiagramZoom}
                      className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-xl"
                    />

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h5 className="font-bold text-white text-xs sm:text-sm">
                          {drill.name}
                        </h5>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {drill.targetHold}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                        {drill.cue}
                      </p>
                    </div>
                  </div>

                  {/* Drill Actions: 10s Hold Timer & Mark Done (with L & R for unilateral drills) */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0 flex-wrap sm:flex-nowrap">
                    <button
                      type="button"
                      data-testid={`mcgill-hold-timer-btn-${drill.id}`}
                      onClick={() => handleStartMcGillHold(drill.id, activeMcGillRound)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-mono font-medium flex items-center gap-1.5 cursor-pointer transition-all ${
                        isCurrentlyHoldingThisDrill
                          ? 'bg-emerald-500 text-slate-950 font-bold border border-emerald-400 animate-pulse'
                          : 'bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700'
                      }`}
                      title="Run 10-second isometric hold countdown"
                    >
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      <span>
                        {isCurrentlyHoldingThisDrill
                          ? `Holding: ${formatMMSS(mcgillHoldSeconds)}`
                          : '⏱ Start 10s Hold'}
                      </span>
                    </button>

                    {drill.id === 'curl_up' ? (
                      <button
                        type="button"
                        data-testid={`mcgill-drill-done-${drill.id}`}
                        onClick={() => handleToggleMcGillDrill(activeMcGillRound, drill.id)}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                          isDrillDone
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                        }`}
                      >
                        {isDrillDone ? 'Completed ✓' : 'Mark Done'}
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          data-testid={`mcgill-${drill.id}-left-btn`}
                          onClick={() => handleToggleMcGillDrillSide(activeMcGillRound, drill.id, 'left')}
                          aria-label={`Mark ${drill.name} Left side as ${mcgillDrillSides[activeMcGillRound]?.[`${drill.id}_left`] ?? isDrillDone ? 'incomplete' : 'complete'}`}
                          className={`px-2 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-all border ${
                            (mcgillDrillSides[activeMcGillRound]?.[`${drill.id}_left`] ?? isDrillDone)
                              ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-sm'
                              : 'bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700'
                          }`}
                        >
                          <span>Left</span>
                          {(mcgillDrillSides[activeMcGillRound]?.[`${drill.id}_left`] ?? isDrillDone) && (
                            <Check className="w-3 h-3 stroke-[3]" />
                          )}
                        </button>

                        <button
                          type="button"
                          data-testid={`mcgill-${drill.id}-right-btn`}
                          onClick={() => handleToggleMcGillDrillSide(activeMcGillRound, drill.id, 'right')}
                          aria-label={`Mark ${drill.name} Right side as ${mcgillDrillSides[activeMcGillRound]?.[`${drill.id}_right`] ?? isDrillDone ? 'incomplete' : 'complete'}`}
                          className={`px-2 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-all border ${
                            (mcgillDrillSides[activeMcGillRound]?.[`${drill.id}_right`] ?? isDrillDone)
                              ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-sm'
                              : 'bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700'
                          }`}
                        >
                          <span>Right</span>
                          {(mcgillDrillSides[activeMcGillRound]?.[`${drill.id}_right`] ?? isDrillDone) && (
                            <Check className="w-3 h-3 stroke-[3]" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 1-Tap Round Completion Bar */}
          <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-800">
            <span className="text-xs text-slate-400">
              Round {activeMcGillRound + 1} Status:{' '}
              <strong className="text-emerald-300">
                {logs[activeMcGillRound]?.isCompleted ? 'Completed (3/3 Drills)' : `${Object.values(mcgillCompletedDrills[activeMcGillRound] || {}).filter(Boolean).length}/3 Drills Checked`}
              </strong>
            </span>

            <button
              type="button"
              data-testid={`mcgill-round-${activeMcGillRound + 1}-complete-btn`}
              onClick={() => handleToggleMcGillRoundComplete(activeMcGillRound)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                logs[activeMcGillRound]?.isCompleted
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md'
              }`}
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>
                {logs[activeMcGillRound]?.isCompleted
                  ? `Round ${activeMcGillRound + 1} Done ✓`
                  : `Mark Round ${activeMcGillRound + 1} Complete`}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Active Dead Hang & Indian Club Arm Casts Protocol Panel */}
      {isDeadHangClubMills && (
        <div
          data-testid="deadhang-club-protocol"
          className="mb-4 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-slate-900 via-sky-950/20 to-slate-900 border border-sky-500/40 shadow-lg space-y-3"
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-sky-500/20 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/30">
                <ShieldAlert className="w-4 h-4 text-sky-400" />
              </span>
              <div>
                <h4 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
                  <span>Active Dead Hang & Indian Club Casts Protocol</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40">
                    Joint Restoration
                  </span>
                </h4>
                <p className="text-[11px] text-slate-300">
                  Decompress subacromial space with 45s dead hang hold, followed by reciprocal 10-cast arm circles with 2–5 lb Indian clubs.
                </p>
              </div>
            </div>

            {/* Hold Timer Status */}
            {isDeadHangTiming && (
              <div className="flex items-center gap-2 bg-sky-950/80 border border-sky-500/50 px-3 py-1 rounded-xl text-xs font-mono text-sky-300 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                <span>Timer: {formatMMSS(deadHangHoldSeconds)}</span>
              </div>
            )}
          </div>

          {/* Round Selector Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1">
            {[0, 1].map((rIdx) => {
              const roundNumber = rIdx + 1;
              const roundSet = logs[rIdx];
              const isRoundComplete = roundSet?.isCompleted;
              const drills = deadHangCompletedDrills[rIdx] || {};
              const completedCount = Object.values(drills).filter(Boolean).length;
              const isSelected = activeDeadHangRound === rIdx;

              return (
                <button
                  key={rIdx}
                  type="button"
                  data-testid={`deadhang-round-tab-${roundNumber}`}
                  onClick={() => setActiveDeadHangRound(rIdx)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all border ${
                    isSelected
                      ? 'bg-sky-500 text-slate-950 border-sky-400 shadow-md font-bold'
                      : isRoundComplete
                      ? 'bg-sky-950/40 text-sky-300 border-sky-500/40 hover:bg-sky-900/30'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                  }`}
                >
                  <span>Round {roundNumber}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isSelected
                        ? 'bg-slate-950/20 text-slate-950 font-mono font-bold'
                        : isRoundComplete
                        ? 'bg-sky-500/20 text-sky-300'
                        : 'bg-slate-700 text-slate-400'
                    }`}
                  >
                    {isRoundComplete ? 'Done ✓' : `${completedCount}/3`}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Round Drill Cards */}
          <div className="space-y-2 pt-1">
            {DEAD_HANG_CLUB_DRILLS.map((drill) => {
              const isDrillDone =
                !!deadHangCompletedDrills[activeDeadHangRound]?.[drill.id] ||
                !!logs[activeDeadHangRound]?.isCompleted;
              const isCurrentlyTimingThisDrill =
                isDeadHangTiming && activeTimingDeadHangDrill === drill.id;

              return (
                <div
                  key={drill.id}
                  data-testid={`deadhang-drill-${drill.id}`}
                  className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isDrillDone
                      ? 'bg-sky-950/20 border-sky-500/40 text-sky-200'
                      : 'bg-slate-950/60 border-slate-800 text-slate-200'
                  }`}
                >
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    <button
                      type="button"
                      data-testid={`deadhang-toggle-drill-${drill.id}`}
                      onClick={() => handleToggleDeadHangDrill(activeDeadHangRound, drill.id)}
                      className={`mt-0.5 w-5 h-5 rounded-lg flex items-center justify-center border transition-all cursor-pointer shrink-0 ${
                        isDrillDone
                          ? 'bg-sky-500 border-sky-400 text-slate-950'
                          : 'border-slate-600 bg-slate-900 hover:border-sky-500'
                      }`}
                      aria-label={`Toggle ${drill.name} completion for Round ${activeDeadHangRound + 1}`}
                    >
                      {isDrillDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </button>

                    {/* Drill Diagram Animation */}
                    <ExerciseDiagram
                      diagramType={DEAD_HANG_DRILL_DIAGRAM_MAP[drill.id]}
                      exerciseName={drill.name}
                      compact={true}
                      onOpenZoom={handleOpenDiagramZoom}
                      className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-xl"
                    />

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h5 className="font-bold text-white text-xs sm:text-sm">
                          {drill.name}
                        </h5>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {drill.targetHold}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                        {drill.cue}
                      </p>
                    </div>
                  </div>

                  {/* Drill Actions: Countdown Hold/Pacing Timer & Mark Done */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      type="button"
                      data-testid={`deadhang-timer-btn-${drill.id}`}
                      onClick={() => handleStartDeadHangTimer(drill, activeDeadHangRound)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-mono font-medium flex items-center gap-1.5 cursor-pointer transition-all ${
                        isCurrentlyTimingThisDrill
                          ? 'bg-sky-500 text-slate-950 font-bold border border-sky-400 animate-pulse'
                          : 'bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700'
                      }`}
                      title={`Run ${drill.holdSeconds}-second countdown timer`}
                    >
                      <Clock className="w-3.5 h-3.5 text-sky-400" />
                      <span>
                        {isCurrentlyTimingThisDrill
                          ? `Timing: ${formatMMSS(deadHangHoldSeconds)}`
                          : `⏱ Start ${drill.holdSeconds}s Hold`}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleDeadHangDrill(activeDeadHangRound, drill.id)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                        isDrillDone
                          ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {isDrillDone ? 'Completed ✓' : 'Mark Done'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 1-Tap Round Completion Bar */}
          <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-800">
            <span className="text-xs text-slate-400">
              Round {activeDeadHangRound + 1} Status:{' '}
              <strong className="text-sky-300">
                {logs[activeDeadHangRound]?.isCompleted
                  ? 'Completed (3/3 Drills)'
                  : `${Object.values(deadHangCompletedDrills[activeDeadHangRound] || {}).filter(Boolean).length}/3 Drills Checked`}
              </strong>
            </span>

            <button
              type="button"
              data-testid={`deadhang-round-${activeDeadHangRound + 1}-complete-btn`}
              onClick={() => handleToggleDeadHangRoundComplete(activeDeadHangRound)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                logs[activeDeadHangRound]?.isCompleted
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                  : 'bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-md'
              }`}
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>
                {logs[activeDeadHangRound]?.isCompleted
                  ? `Round ${activeDeadHangRound + 1} Done ✓`
                  : `Mark Round ${activeDeadHangRound + 1} Complete`}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Next-weight suggestion (pre-filled into the sets) and last time's date */}
      {!isMcGillBig3 && !isDeadHangClubMills && (loadSuggestion || lastTime) && (
        <div className="mb-2 space-y-1.5" data-testid={`progression-panel-${exercise.id}`}>
          {loadSuggestion && !loadSuggestion.undone && (
            <div
              data-testid={`load-suggestion-${exercise.id}`}
              className={`flex items-start gap-2 p-2 rounded-lg border text-xs ${
                loadSuggestion.change === 'increase'
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-100'
                  : loadSuggestion.change === 'decrease'
                  ? 'bg-amber-950/40 border-amber-500/40 text-amber-100'
                  : loadSuggestion.change === 'deload'
                  ? 'bg-sky-950/40 border-sky-500/40 text-sky-100'
                  : 'bg-slate-900/70 border-slate-700 text-slate-200'
              }`}
            >
              {loadSuggestion.change === 'increase' ? (
                <TrendingUp className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              ) : loadSuggestion.change === 'hold' ? (
                <Minus className="w-4 h-4 shrink-0 text-slate-400 mt-0.5" />
              ) : (
                <TrendingDown className={`w-4 h-4 shrink-0 mt-0.5 ${loadSuggestion.change === 'deload' ? 'text-sky-400' : 'text-amber-400'}`} />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-bold">
                  {loadSuggestion.change === 'increase'
                    ? `Up to ${loadSuggestion.weightLbs} lb (+${loadSuggestion.weightLbs - loadSuggestion.previousWeightLbs})`
                    : loadSuggestion.change === 'decrease'
                    ? `Back off to ${loadSuggestion.weightLbs} lb (−${loadSuggestion.previousWeightLbs - loadSuggestion.weightLbs})`
                    : loadSuggestion.change === 'deload'
                    ? `Deload: ${loadSuggestion.weightLbs} lb`
                    : `Stay at ${loadSuggestion.weightLbs} lb`}
                </div>
                <div className="opacity-80">{loadSuggestion.reason}</div>
              </div>
              {onUndoSuggestion && loadSuggestion.change !== 'hold' && !logs.some((s) => s.isCompleted) && (
                <button
                  type="button"
                  data-testid={`undo-load-suggestion-${exercise.id}`}
                  onClick={() => onUndoSuggestion(exercise.id)}
                  className="shrink-0 inline-flex items-center gap-1 px-2 min-h-[36px] rounded-lg border border-slate-600 bg-slate-900/80 text-slate-200 hover:bg-slate-800 cursor-pointer"
                  title={`Go back to ${loadSuggestion.fromWeightLbs ?? loadSuggestion.previousWeightLbs} lb`}
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  <span>{loadSuggestion.fromWeightLbs ?? loadSuggestion.previousWeightLbs} lb</span>
                </button>
              )}
            </div>
          )}
          {lastTime && (
            <div className="text-[10px] font-mono text-slate-400 px-0.5" data-testid={`last-time-${exercise.id}`}>
              Grey numbers under each goal = last time ({lastTimeDate(lastTime.date)}
              {lastTime.deload ? ', a deload' : ''})
            </div>
          )}
        </div>
      )}

      {/* Interactive Set Logger Header / Action Toolbar */}
      {logs.length > 1 && !isMcGillBig3 && !isDeadHangClubMills && (
        <div className="flex items-center justify-between pb-1.5 px-0.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
              Sets ({logs.filter((s) => s.isCompleted).length}/{logs.length})
            </span>
            {copyWeightFlash && (
              <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-full animate-fadeIn">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
                <span>Copied to Sets 2–{logs.length}!</span>
              </span>
            )}
          </div>
          <button
            type="button"
            data-testid={`copy-set1-weight-action-${exercise.id}`}
            onClick={handleCopySet1WeightToAll}
            title={`Copy Set 1 weight (${logs[0]?.weightLbs || exercise.defaultWeightLbs || 0} lbs) down to all sets`}
            aria-label="Replicate set 1 load down to all sets"
            className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg border transition-all cursor-pointer active:scale-95 ${
              copyWeightFlash
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold shadow-sm'
                : 'bg-slate-900 hover:bg-emerald-950/70 text-slate-300 hover:text-emerald-300 border-slate-700 hover:border-emerald-500/40'
            }`}
          >
            {copyWeightFlash ? (
              <>
                <Check className="w-3 h-3 stroke-[3]" />
                <span>Copied to Sets 2–{logs.length}!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-emerald-400" />
                <span>Copy Set 1 Weight to Sets 2–{logs.length}</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Interactive Set Logger */}
      <div className="mb-2.5 w-full max-w-full overflow-x-auto no-scrollbar">
        <table className="w-full table-fixed text-center text-xs font-mono border-collapse min-w-[300px]">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px] sm:text-xs">
              <th className="py-1 px-0.5 text-center w-8 sm:w-9 whitespace-nowrap">
                {isMcGillBig3 || isDeadHangClubMills ? 'Round' : 'Set'}
              </th>
              <th className="py-1 px-0.5 text-center w-11 sm:w-12">
                <span className="sr-only">Goal</span>
                <div aria-hidden="true" className="flex flex-col items-center justify-center leading-tight">
                  <span className="tracking-wide">Goal</span>
                  <span className="text-[8px] sm:text-[9px] text-slate-400 font-medium -mt-0.5">
                    {isMcGillBig3 || isDeadHangClubMills ? 'Drills' : 'Reps'}
                  </span>
                </div>
              </th>
              <th className="py-1 px-0.5 text-center w-14 sm:w-16 whitespace-nowrap">
                {isMcGillBig3 || isDeadHangClubMills ? (
                  'Type'
                ) : (
                  <div className="flex items-center justify-center gap-1">
                    <span>LBS</span>
                    {logs.length > 1 && (
                      <button
                        type="button"
                        data-testid={`copy-set1-weight-th-${exercise.id}`}
                        onClick={handleCopySet1WeightToAll}
                        title={`Copy Set 1 weight (${logs[0]?.weightLbs || exercise.defaultWeightLbs || 0} lbs) down to all sets`}
                        aria-label="Replicate set 1 load down to all sets"
                        className={`text-[9px] px-1 py-0.5 rounded border transition-colors flex items-center gap-0.5 cursor-pointer font-sans normal-case tracking-normal active:scale-95 ${
                          copyWeightFlash
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
                            : 'bg-slate-800 hover:bg-emerald-950/70 border-slate-700 hover:border-emerald-500/50 text-slate-300 hover:text-emerald-300'
                        }`}
                      >
                        {copyWeightFlash ? (
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        ) : (
                          <Copy className="w-2.5 h-2.5" />
                        )}
                        <span>↓ all</span>
                      </button>
                    )}
                  </div>
                )}
              </th>
              <th className="py-1 px-0.5 text-center w-11 sm:w-12">
                <span className="sr-only">Reps Done</span>
                <div aria-hidden="true" className="flex flex-col items-center justify-center leading-tight">
                  <span className="tracking-wide">{isMcGillBig3 || isDeadHangClubMills ? 'Drills' : 'Reps'}</span>
                  <span className="text-[8px] sm:text-[9px] text-slate-400 font-medium -mt-0.5">Done</span>
                </div>
                {!isMcGillBig3 && !isDeadHangClubMills && logs.length > 1 && (
                  <button
                    type="button"
                    data-testid={`copy-set1-reps-th-${exercise.id}`}
                    onClick={handleCopySet1RepsToAll}
                    title="Copy Set 1 reps down to the sets not done yet"
                    aria-label="Copy set 1 reps down to all sets"
                    className={`mx-auto mt-0.5 text-[9px] px-1 py-0.5 rounded border transition-colors flex items-center gap-0.5 cursor-pointer font-sans normal-case tracking-normal active:scale-95 ${
                      copyRepsFlash
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
                        : 'bg-slate-800 hover:bg-emerald-950/70 border-slate-700 hover:border-emerald-500/50 text-slate-300 hover:text-emerald-300'
                    }`}
                  >
                    {copyRepsFlash ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : <Copy className="w-2.5 h-2.5" />}
                    <span aria-hidden="true">↓</span>
                  </button>
                )}
              </th>
              <th className="py-1 px-0.5 text-center min-w-[50px] whitespace-nowrap">
                {isUnilateral && !exercise.side && !isMcGillBig3 && !isDeadHangClubMills ? 'Done (L / R)' : 'Done'}
              </th>
              <th className="py-1 px-1 text-center w-auto whitespace-nowrap">
                <div className="flex items-center justify-center gap-1">
                  <span>Notes / RPE</span>
                  <button
                    type="button"
                    data-testid="info-rpe-rating-btn"
                    onClick={() => {
                      setInitialRatingTab('rpe');
                      setIsRatingModalOpen(true);
                    }}
                    title="Define RPE and Rating Terms"
                    aria-label="Define RPE and Rating Terms"
                    className="p-1 min-h-[32px] min-w-[32px] -m-1 text-slate-400 hover:text-cyan-400 transition-colors inline-flex items-center justify-center cursor-pointer"
                  >
                    <Info className="w-3 h-3 text-slate-400 hover:text-cyan-400" />
                  </button>
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y border-slate-800/60">
            {logs.map((set, idx) => {
              const isLastSet = idx === logs.length - 1;
              const isAmrapRow = isLastSet && exercise.isAmrapLastSet;
              return (
              <tr
                key={set.setNumber}
                className={`transition-colors ${
                  set.isCompleted
                    ? 'bg-emerald-950/20'
                    : isAmrapRow
                    ? 'bg-rose-950/20 hover:bg-rose-950/30'
                    : 'hover:bg-slate-800/40'
                }`}
              >
                {/* Set # */}
                <td className="py-1 px-0.5 font-bold text-slate-300 text-center whitespace-nowrap text-[11px] sm:text-xs">
                  <div className="flex items-center justify-center gap-0.5 sm:gap-1">
                    {needsTimer && (
                    <button
                      type="button"
                      data-testid={`start-tempo-set-${set.setNumber}`}
                      onClick={() => handleStartInlineTempo(idx)}
                      className={`p-1 min-h-[36px] min-w-[32px] rounded transition-colors cursor-pointer flex items-center justify-center ${
                        isInlineTempoActive && inlineTempoTargetSet === idx
                          ? 'bg-emerald-500 text-slate-950 shadow-sm animate-pulse'
                          : 'text-slate-400 hover:text-emerald-300 hover:bg-slate-800'
                      }`}
                      title={`Start tempo cadence for Set ${set.setNumber}`}
                      aria-label={`Start tempo cadence for Set ${set.setNumber}`}
                    >
                      {isInlineTempoActive && inlineTempoTargetSet === idx ? (
                        <Activity className="w-3.5 h-3.5 text-slate-950" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-current" />
                      )}
                    </button>
                    )}
                    <span>{isMcGillBig3 || isDeadHangClubMills ? `R${set.setNumber}` : set.setNumber}</span>
                    {isAmrapRow && (
                      <span className="text-[10px] text-rose-400 ml-0.5 font-semibold">+</span>
                    )}
                  </div>
                </td>

                {/* Target Reps */}
                <td className="py-1 px-0.5 text-center text-slate-400 text-[11px] sm:text-xs whitespace-nowrap font-medium">
                  {isMcGillBig3 ? (
                    <span className="font-semibold text-emerald-300">3 Drills</span>
                  ) : isDeadHangClubMills ? (
                    <span className="font-semibold text-sky-300">3 Drills</span>
                  ) : isAmrapRow ? (
                    <span className="font-bold text-rose-400 inline-flex items-center gap-0.5" title="As Many Reps As Possible (AMRAP)">
                      <span>{set.targetReps}+</span>
                      <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-rose-500/20 text-rose-300">MAX</span>
                    </span>
                  ) : (
                    set.targetReps
                  )}
                  {(() => {
                    if (isMcGillBig3 || isDeadHangClubMills || !lastTime) return null;
                    const prev = lastTime.sets.find((s) => s.setNumber === set.setNumber);
                    if (!prev) return null;
                    return (
                      <span
                        data-testid={`last-time-set-${exercise.id}-${set.setNumber}`}
                        title={`Last time: ${prev.weightLbs > 0 ? `${prev.weightLbs} lb × ` : ''}${prev.repsAchieved} reps`}
                        className="block text-[10px] leading-tight text-slate-400 font-normal mt-0.5"
                      >
                        {prev.weightLbs > 0 ? `${prev.weightLbs}×${prev.repsAchieved}` : `×${prev.repsAchieved}`}
                      </span>
                    );
                  })()}
                </td>

                {/* Weight Input */}
                <td className="py-1 px-0.5 text-center">
                  {isMcGillBig3 ? (
                    <span className="text-[11px] font-bold text-slate-400">BW</span>
                  ) : isDeadHangClubMills ? (
                    <span className="text-[11px] font-bold text-sky-300">BW / Clubs</span>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-0.5 mx-auto">
                      <input
                        type="number"
                        aria-label={`Set ${set.setNumber} Weight (lbs)`}
                        value={set.weightLbs || ''}
                        onChange={(e) =>
                          onUpdateSetLog(exercise.id, idx, {
                            weightLbs: Number(e.target.value) || 0,
                          })
                        }
                        className="w-11 sm:w-13 min-h-[36px] bg-slate-950 border border-slate-700 rounded px-1 py-1 text-center text-white focus:outline-none focus:border-emerald-500 font-bold text-xs"
                        step="5"
                        min="0"
                      />
                      {idx === 0 && logs.length > 1 && (
                        <button
                          type="button"
                          data-testid={`copy-set1-weight-btn-${exercise.id}`}
                          onClick={handleCopySet1WeightToAll}
                          title={`Copy Set 1 weight (${logs[0]?.weightLbs || exercise.defaultWeightLbs || 0} lbs) down to all sets (Sets 2–${logs.length})`}
                          aria-label="Replicate set 1 load down to all sets"
                          className={`text-[9px] font-semibold px-1 py-0.5 rounded border transition-all cursor-pointer flex items-center justify-center gap-0.5 whitespace-nowrap active:scale-95 -mt-0.5 ${
                            copyWeightFlash
                              ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold shadow-sm'
                              : 'bg-slate-900 hover:bg-emerald-950/70 border-slate-700 hover:border-emerald-500/50 text-slate-400 hover:text-emerald-300'
                          }`}
                        >
                          {copyWeightFlash ? (
                            <>
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-2.5 h-2.5" />
                              <span>copy ↓</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </td>

                {/* Reps Achieved */}
                <td className="py-1 px-0.5 text-center">
                  {isMcGillBig3 ? (
                    <span className="text-[11px] font-mono font-bold text-emerald-400">
                      {set.repsAchieved || (set.isCompleted ? 3 : 0)}/3
                    </span>
                  ) : isDeadHangClubMills ? (
                    <span className="text-[11px] font-mono font-bold text-sky-400">
                      {set.repsAchieved || (set.isCompleted ? 3 : 0)}/3
                    </span>
                  ) : (
                    <input
                      type="number"
                      aria-label={`Set ${set.setNumber} Reps Done`}
                      placeholder={String(extractTargetReps(set.targetReps, 10))}
                      value={set.repsAchieved || ''}
                      onChange={(e) =>
                        onUpdateSetLog(exercise.id, idx, {
                          repsAchieved: Number(e.target.value) || 0,
                        })
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !set.isCompleted) {
                          const autoReps = set.repsAchieved > 0 ? set.repsAchieved : extractTargetReps(set.targetReps, 10);
                          onUpdateSetLog(exercise.id, idx, {
                            isCompleted: true,
                            ...(isUnilateral && !exercise.side
                              ? { leftCompleted: true, rightCompleted: true }
                              : {}),
                            ...(set.repsAchieved === 0 && autoReps > 0 ? { repsAchieved: autoReps } : {}),
                          });
                          onQuickStartRest(exercise.restSeconds);
                        }
                      }}
                      className="w-10 sm:w-12 min-h-[36px] mx-auto bg-slate-950 border border-slate-700 rounded px-1 py-1 text-center text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 font-bold text-xs block"
                      min="0"
                    />
                  )}
                  {!isMcGillBig3 && !isDeadHangClubMills && idx === 0 && logs.length > 1 && (
                    <button
                      type="button"
                      data-testid={`copy-set1-reps-btn-${exercise.id}`}
                      onClick={handleCopySet1RepsToAll}
                      title={`Copy Set 1 reps down to the sets not done yet (Sets 2–${logs.length})`}
                      aria-label="Copy set 1 reps down to all sets"
                      className={`mx-auto mt-0.5 text-[9px] font-semibold px-1 py-0.5 rounded border transition-all cursor-pointer flex items-center justify-center gap-0.5 whitespace-nowrap active:scale-95 ${
                        copyRepsFlash
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold shadow-sm'
                          : 'bg-slate-900 hover:bg-emerald-950/70 border-slate-700 hover:border-emerald-500/50 text-slate-400 hover:text-emerald-300'
                      }`}
                    >
                      {copyRepsFlash ? (
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      ) : (
                        <>
                          <Copy className="w-2.5 h-2.5" />
                          <span aria-hidden="true">↓</span>
                        </>
                      )}
                    </button>
                  )}
                </td>

                {/* Checkbox Done (Master Checkbox + Separate L & R for Unilateral Workouts) */}
                <td className="py-1 px-0.5 text-center">
                  {isUnilateral && !exercise.side && !isMcGillBig3 && !isDeadHangClubMills ? (
                    <div className="flex items-center justify-center gap-1.5 flex-wrap sm:flex-nowrap">
                      {/* Master complete button for accessibility & 1-tap set completion */}
                      <button
                        type="button"
                        onClick={() => {
                          const nextState = !set.isCompleted;
                          onUpdateSetLog(exercise.id, idx, {
                            isCompleted: nextState,
                            leftCompleted: nextState,
                            rightCompleted: nextState,
                          });
                          if (nextState) {
                            onQuickStartRest(exercise.restSeconds);
                          }
                        }}
                        aria-label={`Mark set ${set.setNumber} as ${set.isCompleted ? 'incomplete' : 'completed'}`}
                        className={`w-7 h-7 sm:w-8 sm:h-8 min-h-[36px] min-w-[36px] rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                          set.isCompleted
                            ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-sm'
                            : 'bg-slate-950 border-slate-700 text-transparent hover:border-slate-500'
                        }`}
                      >
                        {set.isCompleted && <Check className="w-4 h-4 stroke-[3]" />}
                      </button>

                      {/* Separate Left and Right checkboxes */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          data-testid={`set-${set.setNumber}-left-done-btn`}
                          onClick={() => {
                            const currentLeft = set.leftCompleted ?? !!set.isCompleted;
                            const currentRight = set.rightCompleted ?? !!set.isCompleted;
                            const nextLeft = !currentLeft;
                            const allDone = nextLeft && currentRight;
                            onUpdateSetLog(exercise.id, idx, {
                              leftCompleted: nextLeft,
                              rightCompleted: currentRight,
                              isCompleted: allDone,
                            });
                            if (allDone && !set.isCompleted) {
                              onQuickStartRest(exercise.restSeconds);
                            }
                          }}
                          aria-label={`Mark set ${set.setNumber} Left side as ${set.leftCompleted ?? set.isCompleted ? 'incomplete' : 'completed'}`}
                          className={`px-1.5 py-1 min-h-[32px] min-w-[28px] rounded-lg border text-[11px] font-bold flex items-center justify-center gap-0.5 transition-all cursor-pointer ${
                            (set.leftCompleted ?? set.isCompleted)
                              ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-sm'
                              : 'bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                          }`}
                        >
                          <span>L</span>
                          {(set.leftCompleted ?? set.isCompleted) && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </button>

                        <button
                          type="button"
                          data-testid={`set-${set.setNumber}-right-done-btn`}
                          onClick={() => {
                            const currentLeft = set.leftCompleted ?? !!set.isCompleted;
                            const currentRight = set.rightCompleted ?? !!set.isCompleted;
                            const nextRight = !currentRight;
                            const allDone = currentLeft && nextRight;
                            onUpdateSetLog(exercise.id, idx, {
                              leftCompleted: currentLeft,
                              rightCompleted: nextRight,
                              isCompleted: allDone,
                            });
                            if (allDone && !set.isCompleted) {
                              onQuickStartRest(exercise.restSeconds);
                            }
                          }}
                          aria-label={`Mark set ${set.setNumber} Right side as ${set.rightCompleted ?? set.isCompleted ? 'incomplete' : 'completed'}`}
                          className={`px-1.5 py-1 min-h-[32px] min-w-[28px] rounded-lg border text-[11px] font-bold flex items-center justify-center gap-0.5 transition-all cursor-pointer ${
                            (set.rightCompleted ?? set.isCompleted)
                              ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-sm'
                              : 'bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                          }`}
                        >
                          <span>R</span>
                          {(set.rightCompleted ?? set.isCompleted) && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        if (isMcGillBig3) {
                          handleToggleMcGillRoundComplete(idx);
                        } else if (isDeadHangClubMills) {
                          handleToggleDeadHangRoundComplete(idx);
                        } else {
                          const nextState = !set.isCompleted;
                          onUpdateSetLog(exercise.id, idx, {
                            isCompleted: nextState,
                          });
                          if (nextState) {
                            onQuickStartRest(exercise.restSeconds);
                          }
                        }
                      }}
                      aria-label={`Mark set ${set.setNumber} as ${set.isCompleted ? 'incomplete' : 'completed'}`}
                      className={`w-7 h-7 sm:w-8 sm:h-8 min-h-[44px] min-w-[44px] mx-auto rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                        set.isCompleted
                          ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-sm'
                          : 'bg-slate-950 border-slate-700 text-transparent hover:border-slate-500'
                      }`}
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                    </button>
                  )}
                </td>

                {/* Notes Input & Optional LLP Quick-Log */}
                <td className="py-1 px-1 text-center">
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      aria-label={`Set ${set.setNumber} Notes`}
                      placeholder={isMcGillBig3 ? 'Tri-Set Notes...' : isDeadHangClubMills ? 'Drill Notes...' : 'Notes...'}
                      value={set.notes || ''}
                      onChange={(e) =>
                        onUpdateSetLog(exercise.id, idx, { notes: e.target.value })
                      }
                      className="w-full min-h-[36px] bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-300 text-[11px] sm:text-xs focus:outline-none focus:border-emerald-500 text-center placeholder:text-center"
                    />
                    {isLLP && (idx === logs.length - 1 || set.llpPerformed) && (
                      <button
                        type="button"
                        data-testid={`llp-toggle-btn-${idx}`}
                        onClick={() => {
                          const nextState = !set.llpPerformed;
                          const currentNotes = set.notes || '';
                          let updatedNotes = currentNotes;
                          if (nextState && !currentNotes.includes('LLP')) {
                            updatedNotes = currentNotes ? `${currentNotes} · +3–5 LLPs` : '+3–5 LLPs (Nippard)';
                          } else if (!nextState && currentNotes.includes('+3–5 LLPs')) {
                            updatedNotes = currentNotes.replace(/(\s*·\s*)?\+3–5 LLPs(\s*\(Nippard\))?/, '').trim();
                          }
                          onUpdateSetLog(exercise.id, idx, {
                            llpPerformed: nextState,
                            notes: updatedNotes,
                          });
                        }}
                        title={set.llpPerformed ? 'Lengthened partials logged on this set' : 'Mark 3–5 lengthened partials performed (Nippard stretch protocol)'}
                        aria-label={`Toggle lengthened partials for set ${set.setNumber}`}
                        className={`px-1.5 py-1 rounded min-h-[36px] text-[10px] font-mono font-bold whitespace-nowrap border transition-all cursor-pointer ${
                          set.llpPerformed
                            ? 'bg-purple-900/70 border-purple-400 text-purple-200 shadow-sm ring-1 ring-purple-400/50'
                            : 'bg-slate-950/80 border-slate-700 text-slate-400 hover:text-purple-300 hover:border-purple-600'
                        }`}
                      >
                        {set.llpPerformed ? '🔥 +LLPs' : '+LLPs'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
          </tbody>
        </table>
      </div>

      {/* 1-Tap RPE & Knee Pain Quick-Chips (RP Hypertrophy & Prehab Guys Inspiration) */}
      <div className="mb-3.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-slate-400 shrink-0">
          <Tag className="w-3 h-3 text-emerald-400" />
          <span>Set {(logs[activeChipSetIndex]?.setNumber) || 1} Tags:</span>
          <button
            type="button"
            data-testid="info-quick-chips-btn"
            onClick={() => {
              setInitialRatingTab('rpe');
              setIsRatingModalOpen(true);
            }}
            title="Define RPE and Pain Rating Terms"
            aria-label="Define RPE and Pain Rating Terms"
            className="p-1 -m-1 text-slate-400 hover:text-cyan-400 transition-colors inline-flex items-center justify-center cursor-pointer"
          >
            <Info className="w-3 h-3 text-slate-400 hover:text-cyan-400" />
          </button>
        </span>
        {QUICK_LOG_CHIPS.map((chip) => {
          const isSelected = (logs[activeChipSetIndex]?.notes || '').includes(chip);
          return (
            <button
              key={chip}
              type="button"
              onClick={() => handleToggleQuickChip(chip)}
              aria-pressed={isSelected}
              aria-label={`Quick tag ${chip} for ${exercise.name}`}
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border whitespace-nowrap transition-all cursor-pointer active:scale-95 ${
                isSelected
                  ? 'bg-emerald-500/25 text-emerald-300 border-emerald-500/50 font-bold'
                  : 'bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-800'
              }`}
            >
              {chip}
            </button>
          );
        })}
      </div>

      {/* Regression Callout & 1-Tap Exercise Swap (ATG Steadfast & Prehab Guys Inspiration) */}
      {exercise.regression && (
        <div className="mb-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setShowRegression(!showRegression)}
              className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-medium py-1 cursor-pointer"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>
                {showRegression ? 'Hide' : 'Need a pain-free regression?'} ({exercise.regression.name})
              </span>
              {showRegression ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={() => handleToggleRegression()}
              aria-pressed={isSwappedToRegression}
              aria-label={
                isSwappedToRegression
                  ? `Restore primary exercise ${exercise.name}`
                  : `Swap ${exercise.name} to regression ${exercise.regression.name}`
              }
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-semibold transition-all cursor-pointer active:scale-95 ${
                isSwappedToRegression
                  ? 'bg-amber-500/25 text-amber-200 border-amber-400/60'
                  : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700'
              }`}
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-amber-400" />
              <span>{isSwappedToRegression ? 'Restore Primary Lift' : 'Swap to Regression'}</span>
            </button>
          </div>

          {showRegression && (
            <div className="mt-2 p-3.5 rounded-xl bg-slate-950 border border-amber-500/30 text-xs text-slate-300 space-y-1.5">
              <div className="font-semibold text-amber-300">
                Trigger: {exercise.regression.condition}
              </div>
              <div>
                <strong>Alternative:</strong> {exercise.regression.name} (Tempo: {exercise.regression.tempo})
              </div>
              <div className="text-slate-400">{exercise.regression.instructions}</div>
            </div>
          )}
        </div>
      )}

      {/* Card Footer: View Creator Cues, Instructions & Biomechanical Rationale */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-slate-800">
        <button
          type="button"
          onClick={() => onOpenCueCard(exercise.id)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-semibold text-xs transition-colors border border-slate-700/80 shadow-sm cursor-pointer"
        >
          <BookOpen className="w-4 h-4 text-emerald-400" />
          <span>View Creator Cues & Science</span>
        </button>

        <div className="flex flex-wrap items-center gap-3">
          {matchingCueCard?.setupInstructions && matchingCueCard.setupInstructions.length > 0 && (
            <button
              type="button"
              onClick={() => setShowInstructions(!showInstructions)}
              className="flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-white py-1 font-medium cursor-pointer"
            >
              <ListOrdered className="w-3.5 h-3.5 text-emerald-400" />
              <span>{showInstructions ? 'Hide Instructions' : 'Step-by-Step Instructions'}</span>
              {showInstructions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowRationale(!showRationale)}
            className="flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-white py-1 font-medium cursor-pointer"
          >
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span>{showRationale ? 'Hide Rationale' : 'Biomechanical Rationale'}</span>
            {showRationale ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expandable Step-by-Step Instructions */}
      {showInstructions && matchingCueCard?.setupInstructions && (
        <div className="mt-3 p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 text-xs text-slate-300 space-y-2.5 animate-in fade-in duration-200">
          <div className="font-bold text-slate-200 flex items-center justify-between pb-1.5 border-b border-slate-800/80">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <ListOrdered className="w-4 h-4" />
              <span>Step-by-Step Execution Protocol</span>
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              Tempo: {matchingCueCard.prescribedTempo || exercise.tempo}
            </span>
          </div>
          <div className="space-y-2 pt-0.5">
            {matchingCueCard.setupInstructions.map((instruction, idx) => {
              const colonIndex = instruction.indexOf(':');
              const hasPrefix = colonIndex > 0 && colonIndex < 45;
              const prefix = hasPrefix ? instruction.substring(0, colonIndex).trim() : null;
              const body = hasPrefix ? instruction.substring(colonIndex + 1).trim() : instruction;

              return (
                <div key={idx} className="flex items-start gap-2.5 leading-relaxed bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
                  <span className="flex-shrink-0 w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold flex items-center justify-center mt-0.5">
                    {idx + 1}
                  </span>
                  <div>
                    {prefix && <strong className="text-slate-200 font-semibold block text-[11px] text-emerald-400/90">{prefix}</strong>}
                    <span className="text-slate-300">{body}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Expandable Biomechanical Rationale */}
      {showRationale && (
        <div className="mt-3 p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 space-y-2">
          <p>
            <strong className="text-emerald-400">Why this works:</strong> {exercise.biomechanicalRationale}
          </p>
          <p className="text-slate-400 font-mono text-[11px]">
            <strong>Progression:</strong> {exercise.progressionRule}
          </p>
        </div>
      )}
        </>
      )}

      {/* Dialogs render at the page level: the card skips rendering while off-screen (content-visibility),
          which would otherwise trap a full-screen overlay inside it */}
      {/* Interactive Rating Scale Definitions Modal */}
      {isRatingModalOpen && createPortal(
      <Suspense fallback={null}>
      <RatingDefinitionsModal
        isOpen={isRatingModalOpen}
        onClose={() => setIsRatingModalOpen(false)}
        initialTab={initialRatingTab}
      />
      </Suspense>,
      document.body
      )}

      {/* Skip Exercise Reason Modal */}
      {isSkipModalOpen && createPortal(
      <Suspense fallback={null}>
      <SkipExerciseReasonModal
        isOpen={isSkipModalOpen}
        onClose={() => setIsSkipModalOpen(false)}
        exerciseId={exercise.id}
        exerciseName={activeExerciseName}
        exerciseTier={exercise.tier}
        isCurrentlySkipped={isExerciseSkipped}
        initialReason={skippedReason}
        onConfirmSkip={handleConfirmSkip}
        onUnskip={handleUnskipExercise}
      />
      </Suspense>,
      document.body
      )}

      {/* Exercise Variation Selector Modal */}
      {isVariationModalOpen && createPortal(
        <ExerciseVariationModal
          isOpen={isVariationModalOpen}
          onClose={() => setIsVariationModalOpen(false)}
          baseExercise={exercise}
          variations={availableVariations}
          activeVariationId={exercise.id}
          onSelectVariation={handleSelectVariation}
          currentCycle={currentCycle}
        />,
        document.body
      )}
    </article>
  );
};

export const ExerciseCard = React.memo(
  ExerciseCardComponent,
  (prev, next) =>
    prev.exercise === next.exercise &&
    prev.logs === next.logs &&
    prev.defaultCollapsed === next.defaultCollapsed &&
    prev.collapseRevision === next.collapseRevision &&
    prev.onUpdateSetLog === next.onUpdateSetLog &&
    prev.onResetExercise === next.onResetExercise &&
    prev.currentCycle === next.currentCycle &&
    prev.onSelectVariation === next.onSelectVariation &&
    prev.lastTime === next.lastTime &&
    prev.loadSuggestion === next.loadSuggestion &&
    prev.onUndoSuggestion === next.onUndoSuggestion
);
