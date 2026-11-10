// Extracted from src/App.tsx (WorkoutAppMain). Presentation only: state and handlers come in as props.
import { type Dispatch, type SetStateAction, Suspense } from 'react';
import { audioSynthesizer } from '../audio/audioSynthesizer';
import { type SetLogRecord } from '../components/ExerciseCard';
import { type AppViewMode } from '../components/Header';
import { type MobilityEntry } from '../domain/mobility';
import { type WorkoutExercise, type WorkoutSession } from '../domain/programData';
import { type WorkoutAdaptation } from '../domain/weeklyEvaluator';
import { AdaptationClocksWidget, AdaptiveBodyCoachWidget, AthleteProfileCard, CnsReadinessWidget, DailyReadinessWidget, GuideWidget, MobilityTrackerWidget, MuscleHeatmapWidget, ProgressChartWidget, QuarterlyAssessmentWidget, StrengthHeatmapWidget, StretchingRoutineWidget } from '../lazyView';
import { type CompletedWorkoutSession } from '../storage/storageManager';
import { ViewLoadingFallback } from './shared';

export interface SecondaryViewsProps {
  activeSession: WorkoutSession;
  activeSessionId: string;
  completedWorkouts: Record<string, CompletedWorkoutSession>;
  currentView: AppViewMode;
  guideSessions: WorkoutSession[];
  handleApplyWeeklyAdaptations: (selectedAdaptations: WorkoutAdaptation[]) => void;
  handleOpenCueCard: (exId: string) => void;
  handleResetWeeklyAdaptations: () => void;
  isMuted: boolean;
  mobilityHistory: MobilityEntry[];
  programAdaptations: Record<string, Partial<WorkoutExercise>>;
  setCurrentView: Dispatch<SetStateAction<AppViewMode>>;
  workoutLogs: Record<string, SetLogRecord[]>;
}

export function SecondaryViews({ activeSession, activeSessionId, completedWorkouts, currentView, guideSessions, handleApplyWeeklyAdaptations, handleOpenCueCard, handleResetWeeklyAdaptations, isMuted, mobilityHistory, programAdaptations, setCurrentView, workoutLogs }: SecondaryViewsProps) {
  return (
    <>
      {/* View: Daily Body Readiness & Recovery Check-In */}
      {currentView === 'readiness' && (
        <div className="px-1 sm:px-3 md:px-6 py-2.5 sm:py-6 w-full max-w-7xl mx-auto space-y-4 sm:space-y-6">
          <Suspense fallback={<ViewLoadingFallback />}>
            <AdaptiveBodyCoachWidget
              activeSession={activeSession}
              history={Object.values(completedWorkouts)}
              appliedAdaptations={programAdaptations}
              onApplyAdaptations={handleApplyWeeklyAdaptations}
              onResetAdaptations={handleResetWeeklyAdaptations}
              defaultExpanded={true}
            />
          </Suspense>
          <Suspense fallback={<ViewLoadingFallback />}>
            <DailyReadinessWidget
              activeSession={activeSession}
              onApplyAdaptations={handleApplyWeeklyAdaptations}
              onNavigateToWorkout={() => setCurrentView('workout')}
            />
          </Suspense>
        </div>
      )}

      {/* View: CNS readiness (tap test, reaction time, HRV / resting HR) */}
      {currentView === 'cns' && (
        <div className="px-1 sm:px-3 md:px-6 py-2.5 sm:py-6 w-full max-w-3xl mx-auto">
          <Suspense fallback={<ViewLoadingFallback />}>
            <CnsReadinessWidget onNavigateToWorkout={() => setCurrentView('workout')} history={Object.values(completedWorkouts)} />
          </Suspense>
        </div>
      )}

      {/* View 2: Mobility & Flexibility Tracker */}
      {currentView === 'mobility' && (
        <div className="px-1 sm:px-3 md:px-6 py-2.5 sm:py-6 w-full max-w-7xl mx-auto">
          <Suspense fallback={<ViewLoadingFallback />}>
            <MobilityTrackerWidget />
          </Suspense>
        </div>
      )}

      {/* View 3: Adaptive Stretching Routine (Based on 2-week workout comments & mobility data) */}
      {currentView === 'stretching' && (
        <div className="px-1 sm:px-3 md:px-6 py-2.5 sm:py-6 w-full max-w-7xl mx-auto">
          <Suspense fallback={<ViewLoadingFallback />}>
            <StretchingRoutineWidget
              workoutLogs={workoutLogs}
              mobilityHistory={mobilityHistory}
              onPlayChime={() => {
                if (!isMuted) audioSynthesizer.playTone('completion');
              }}
            />
          </Suspense>
        </div>
      )}

      {/* View 4: Progress Chart, Projections & Muscle Fatigue Heatmap */}
      {currentView === 'progress' && (
        <div className="px-1 sm:px-3 md:px-6 py-2.5 sm:py-6 w-full max-w-7xl mx-auto space-y-4 sm:space-y-6">
          <Suspense fallback={<ViewLoadingFallback />}>
            <MuscleHeatmapWidget
              history={Object.values(completedWorkouts)}
              activeLogs={workoutLogs}
            />
          </Suspense>
          <Suspense fallback={<ViewLoadingFallback />}>
            <ProgressChartWidget
              workoutLogs={workoutLogs}
              mobilityHistory={mobilityHistory}
              programAdaptations={programAdaptations}
              history={Object.values(completedWorkouts)}
            />
          </Suspense>
        </div>
      )}

      {/* View 5: Quarterly Fitness Assessment */}
      {currentView === 'assessment' && (
        <div className="px-1 sm:px-3 md:px-6 py-2.5 sm:py-6 w-full max-w-7xl mx-auto space-y-4 sm:space-y-6">
          <Suspense fallback={<ViewLoadingFallback />}>
            <AthleteProfileCard />
            <AdaptationClocksWidget />
            <StrengthHeatmapWidget history={Object.values(completedWorkouts)} />
            <QuarterlyAssessmentWidget />
          </Suspense>
        </div>
      )}

      {/* View 6: Guide (workout cue sheets + glossary) */}
      {currentView === 'guide' && (
        <div className="px-1 sm:px-3 md:px-6 py-2.5 sm:py-6 w-full max-w-3xl mx-auto">
          <Suspense fallback={<ViewLoadingFallback />}>
            <GuideWidget sessions={guideSessions} initialSessionId={activeSessionId} onOpenCueCard={handleOpenCueCard} />
          </Suspense>
        </div>
      )}
    </>
  );
}
