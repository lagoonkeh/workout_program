// Extracted from src/App.tsx (WorkoutAppMain). Presentation only: state and handlers come in as props.
import { Activity, X } from 'lucide-react';
import { type Dispatch, type SetStateAction, Suspense } from 'react';
import { type SetLogRecord } from '../components/ExerciseCard';
import { type SessionCompletionAudit, type SkippedExerciseAdjustment } from '../domain/adaptiveAdjustments';
import { type CueCard } from '../domain/cueCardTypes';
import { extractTargetReps, type WorkoutExercise, type WorkoutSession } from '../domain/programData';
import { type WeeklyEvaluationResult, type WorkoutAdaptation } from '../domain/weeklyEvaluator';
import { CueCardModal, MuscleHeatmapWidget, TempoMetronomeWidget, WeeklyEvaluationModal, WorkoutCompletionModal, WorkoutHistoryModal } from '../lazyView';
import { type CompletedWorkoutSession } from '../storage/storageManager';
import { ViewLoadingFallback } from './shared';

export interface AppOverlaysProps {
  activeCueCard: CueCard | null;
  activeCueCardTimed: boolean;
  activeSession: WorkoutSession;
  activeTempo: string | null;
  activeTempoExerciseId: string | null;
  activeTempoTargetReps: number | undefined;
  adaptedSessions: Record<string, WorkoutSession>;
  completedWorkouts: Record<string, CompletedWorkoutSession>;
  getExerciseLogs: (exercise: WorkoutExercise) => SetLogRecord[];
  handleApplyCompletionAdjustments: (selectedAdjustments: SkippedExerciseAdjustment[]) => void;
  handleApplyWeeklyAdaptations: (selectedAdaptations: WorkoutAdaptation[]) => void;
  handleCompleteWithoutAdjustments: () => void;
  handleResetAllAndStartFresh: () => void;
  handleResetWeeklyAdaptations: () => void;
  handleSaveCurrentSessionToHistory: () => void;
  handleScanLastWorkout: () => Promise<void>;
  handleTempoSetComplete: (completedReps: number) => void;
  isHeatmapModalOpen: boolean;
  isSavingAndAdvancing: boolean;
  isWeeklyModalOpen: boolean;
  isWorkoutCompletionModalOpen: boolean;
  isWorkoutHistoryModalOpen: boolean;
  programAdaptations: Record<string, Partial<WorkoutExercise>>;
  sessionAuditResult: SessionCompletionAudit | null;
  sessionExercises: WorkoutExercise[];
  setActiveCueCardId: Dispatch<SetStateAction<string | null>>;
  setActiveTempo: Dispatch<SetStateAction<string | null>>;
  setActiveTempoExerciseId: Dispatch<SetStateAction<string | null>>;
  setIsHeatmapModalOpen: Dispatch<SetStateAction<boolean>>;
  setIsWeeklyModalOpen: Dispatch<SetStateAction<boolean>>;
  setIsWorkoutCompletionModalOpen: Dispatch<SetStateAction<boolean>>;
  setIsWorkoutHistoryModalOpen: Dispatch<SetStateAction<boolean>>;
  setPhaseTasks: Dispatch<SetStateAction<Record<string, boolean>>>;
  setSessionAuditResult: Dispatch<SetStateAction<SessionCompletionAudit | null>>;
  weeklyEvaluation: WeeklyEvaluationResult;
  workoutLogs: Record<string, SetLogRecord[]>;
}

export function AppOverlays({ activeCueCard, activeCueCardTimed, activeSession, activeTempo, activeTempoExerciseId, activeTempoTargetReps, adaptedSessions, completedWorkouts, getExerciseLogs, handleApplyCompletionAdjustments, handleApplyWeeklyAdaptations, handleCompleteWithoutAdjustments, handleResetAllAndStartFresh, handleResetWeeklyAdaptations, handleSaveCurrentSessionToHistory, handleScanLastWorkout, handleTempoSetComplete, isHeatmapModalOpen, isSavingAndAdvancing, isWeeklyModalOpen, isWorkoutCompletionModalOpen, isWorkoutHistoryModalOpen, programAdaptations, sessionAuditResult, sessionExercises, setActiveCueCardId, setActiveTempo, setActiveTempoExerciseId, setIsHeatmapModalOpen, setIsWeeklyModalOpen, setIsWorkoutCompletionModalOpen, setIsWorkoutHistoryModalOpen, setPhaseTasks, setSessionAuditResult, weeklyEvaluation, workoutLogs }: AppOverlaysProps) {
  return (
    <>
      {/* Marcus Filly Tempo Metronome Modal (When Triggered) */}
      {activeTempo && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Marcus Filly Tempo Metronome"
        >
          <div className="max-w-2xl w-full my-auto">
            <Suspense fallback={<ViewLoadingFallback />}>
              <TempoMetronomeWidget
                initialTempo={activeTempo}
                initialTargetReps={(() => {
                  if (activeTempoTargetReps !== undefined) return activeTempoTargetReps;
                  if (!activeTempoExerciseId) return 10;
                  const allExs = [
                    ...Object.values(adaptedSessions).flatMap((s) => [
                      ...s.exercises,
                      ...(s.dailyCoreFinisher || []),
                    ]),
                    ...sessionExercises,
                    ...(activeSession.dailyCoreFinisher || []),
                  ];
                  const ex = allExs.find((e) => e.id === activeTempoExerciseId);
                  if (!ex) return 10;
                  const tempoLower = (ex.tempo || '').toLowerCase();
                  const targetRepsLower = (ex.targetReps || '').toLowerCase();
                  const isHold =
                    tempoLower.includes('hold') ||
                    tempoLower.includes('isometric') ||
                    tempoLower.startsWith('hold-') ||
                    targetRepsLower.includes('hold') ||
                    (targetRepsLower.includes('s') && (targetRepsLower.includes('–') || targetRepsLower.includes('-')));

                  if (isHold && !targetRepsLower.includes('reps')) {
                    return 1;
                  }
                  const currentLogs = getExerciseLogs(ex);
                  const nextUncompleted = currentLogs.find((s) => !s.isCompleted);
                  return extractTargetReps(nextUncompleted?.targetReps || ex.targetReps, 10);
                })()}
                exerciseId={activeTempoExerciseId || undefined}
                autoStart={true}
                onSetComplete={handleTempoSetComplete}
                onClose={() => {
                  setActiveTempo(null);
                  setActiveTempoExerciseId(null);
                }}
              />
            </Suspense>
          </div>
        </div>
      )}

      {/* Modals are separate chunks; nothing shows while one loads */}
      <Suspense fallback={null}>
      {/* Creator Cue Card Modal */}
      <CueCardModal
        cueCard={activeCueCard}
        isOpen={!!activeCueCard}
        onClose={() => setActiveCueCardId(null)}
        onLaunchTempo={
          activeCueCardTimed
            ? (tempo) => {
                setActiveTempo(tempo);
                setActiveTempoExerciseId(activeCueCard?.exerciseId || null);
              }
            : undefined
        }
        onPhaseTaskToggle={(phaseKey, isDone) => {
          setPhaseTasks((prev) => ({ ...prev, [phaseKey]: isDone }));
        }}
      />

      {/* Weekly Evaluation & AI Coach Modal */}
      <WeeklyEvaluationModal
        isOpen={isWeeklyModalOpen}
        onClose={() => setIsWeeklyModalOpen(false)}
        evaluation={weeklyEvaluation}
        onApplyAdaptations={handleApplyWeeklyAdaptations}
        onResetAdaptations={handleResetWeeklyAdaptations}
        hasAppliedAdaptations={Object.keys(programAdaptations).length > 0}
      />

      {/* Workout Session Completion & Skipped Exercise Auto-Regulation Modal */}
      {sessionAuditResult && (
        <WorkoutCompletionModal
          isOpen={isWorkoutCompletionModalOpen}
          session={activeSession}
          audit={sessionAuditResult}
          onApplyAdjustmentsAndComplete={handleApplyCompletionAdjustments}
          onCompleteWithoutAdjustments={handleCompleteWithoutAdjustments}
          isSaving={isSavingAndAdvancing}
          onClose={() => {
            if (isSavingAndAdvancing) return;
            setIsWorkoutCompletionModalOpen(false);
            setSessionAuditResult(null);
          }}
        />
      )}

      {/* Workout History & Past Session Log Editor Modal */}
      <WorkoutHistoryModal
        isOpen={isWorkoutHistoryModalOpen}
        onClose={() => setIsWorkoutHistoryModalOpen(false)}
        onSessionUpdated={() => {
          handleScanLastWorkout();
        }}
        activeSession={activeSession}
        workoutLogs={workoutLogs}
        onSaveCurrentSessionToHistory={handleSaveCurrentSessionToHistory}
        onResetAllAndStartFresh={handleResetAllAndStartFresh}
      />
      </Suspense>

      {/* 1-Tap Muscle Fatigue & Recovery Heatmap Modal */}
      {isHeatmapModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Muscle Fatigue Heatmap Modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in"
        >
          <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-3 sm:p-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base sm:text-lg font-bold text-white">Muscle Fatigue & Recovery Status</h3>
              </div>
              <button
                type="button"
                data-testid="close-heatmap-modal-btn"
                onClick={() => setIsHeatmapModalOpen(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                aria-label="Close Muscle Heatmap Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <Suspense fallback={<ViewLoadingFallback />}>
              <MuscleHeatmapWidget
                history={Object.values(completedWorkouts)}
                activeLogs={workoutLogs}
              />
            </Suspense>
          </div>
        </div>
      )}
    </>
  );
}
