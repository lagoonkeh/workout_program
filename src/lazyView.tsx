// src/lazyView.tsx
import { ComponentType, lazy } from 'react';

export type PreloadableView<P extends object> = ComponentType<P> & { preload: () => Promise<unknown> };

/**
 * React.lazy with a preload hook: once the chunk has loaded, the component renders synchronously
 * (no Suspense fallback flash), and preload() lets the app fetch it in the background after first paint.
 */
export function lazyView<P extends object>(load: () => Promise<ComponentType<P>>): PreloadableView<P> {
  let Loaded: ComponentType<P> | null = null;
  let pending: Promise<ComponentType<P>> | null = null;

  const preload = () => {
    if (!pending) {
      pending = load().then((component) => {
        Loaded = component;
        return component;
      });
    }
    return pending;
  };

  const Lazy = lazy(() => preload().then((component) => ({ default: component })));

  const View = ((props: P) => (Loaded ? <Loaded {...props} /> : <Lazy {...props} />)) as PreloadableView<P>;
  View.preload = preload;
  return View;
}

// Secondary app views, split out of the initial bundle
export const MobilityTrackerWidget = lazyView(() =>
  import('./components/MobilityTrackerWidget').then((m) => m.MobilityTrackerWidget)
);
export const StretchingRoutineWidget = lazyView(() =>
  import('./components/StretchingRoutineWidget').then((m) => m.StretchingRoutineWidget)
);
export const ProgressChartWidget = lazyView(() =>
  import('./components/ProgressChartWidget').then((m) => m.ProgressChartWidget)
);
export const QuarterlyAssessmentWidget = lazyView(() =>
  import('./components/QuarterlyAssessmentWidget').then((m) => m.QuarterlyAssessmentWidget)
);

export const StrengthHeatmapWidget = lazyView(() =>
  import('./components/StrengthHeatmapWidget').then((m) => m.StrengthHeatmapWidget)
);

export const AthleteProfileCard = lazyView(() =>
  import('./components/AthleteProfileCard').then((m) => m.AthleteProfileCard)
);

export const AdaptationClocksWidget = lazyView(() =>
  import('./components/AdaptationClocksWidget').then((m) => m.AdaptationClocksWidget)
);

export const PostureAssessmentWidget = lazyView(() =>
  import('./components/PostureAssessmentWidget').then((m) => m.PostureAssessmentWidget)
);

export const GuideWidget = lazyView(() => import('./components/GuideWidget').then((m) => m.GuideWidget));

export const DailyReadinessWidget = lazyView(() =>
  import('./components/DailyReadinessWidget').then((m) => m.DailyReadinessWidget)
);

export const CnsReadinessWidget = lazyView(() =>
  import('./components/CnsReadinessWidget').then((m) => m.CnsReadinessWidget)
);

// Pieces only shown after a tap (tabs, dialogs, the tempo player, the bar-view loader)
export const AdaptiveBodyCoachWidget = lazyView(() =>
  import('./components/AdaptiveBodyCoachWidget').then((m) => m.AdaptiveBodyCoachWidget)
);
export const MuscleHeatmapWidget = lazyView(() =>
  import('./components/MuscleHeatmapWidget').then((m) => m.MuscleHeatmapWidget)
);
export const TempoMetronomeWidget = lazyView(() =>
  import('./components/TempoMetronomeWidget').then((m) => m.TempoMetronomeWidget)
);
export const RatingDefinitionsModal = lazyView(() =>
  import('./components/RatingDefinitionsModal').then((m) => m.RatingDefinitionsModal)
);
export const SkipExerciseReasonModal = lazyView(() =>
  import('./components/SkipExerciseReasonModal').then((m) => m.SkipExerciseReasonModal)
);
export const PlateCalculatorWidget = lazyView(() =>
  import('./components/PlateCalculatorWidget').then((m) => m.PlateCalculatorWidget)
);

// Modals that are closed on first paint
export const CueCardModal = lazyView(() => import('./components/CueCardModal').then((m) => m.CueCardModal));
export const WeeklyEvaluationModal = lazyView(() =>
  import('./components/WeeklyEvaluationModal').then((m) => m.WeeklyEvaluationModal)
);
export const WorkoutCompletionModal = lazyView(() =>
  import('./components/WorkoutCompletionModal').then((m) => m.WorkoutCompletionModal)
);
export const WorkoutHistoryModal = lazyView(() =>
  import('./components/WorkoutHistoryModal').then((m) => m.WorkoutHistoryModal)
);

const LAZY_VIEWS = [
  MobilityTrackerWidget,
  StretchingRoutineWidget,
  ProgressChartWidget,
  QuarterlyAssessmentWidget,
  PostureAssessmentWidget,
  StrengthHeatmapWidget,
  AthleteProfileCard,
  DailyReadinessWidget,
  CnsReadinessWidget,
  GuideWidget,
  CueCardModal,
  WeeklyEvaluationModal,
  WorkoutCompletionModal,
  WorkoutHistoryModal,
  AdaptiveBodyCoachWidget,
  MuscleHeatmapWidget,
  TempoMetronomeWidget,
  RatingDefinitionsModal,
  SkipExerciseReasonModal,
  PlateCalculatorWidget,
];

export const preloadLazyViews = () =>
  Promise.all(LAZY_VIEWS.map((view) => view.preload())).catch(() => {
    // Offline or chunk fetch failed: the view retries when opened
  });
