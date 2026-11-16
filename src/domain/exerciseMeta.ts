/**
 * Per-exercise metadata for this program: which muscles an exercise loads and how hard
 * (primary / secondary / tertiary), its movement pattern, and whether it is compound or isolation.
 * Muscle ids are the ones in MUSCLE_GROUPS (muscleHeatmap.ts).
 */
export type MuscleRole = 'primary' | 'secondary' | 'tertiary';
export type MovementPattern =
  | 'upper_push'
  | 'upper_pull'
  | 'squat'
  | 'hinge'
  | 'core'
  | 'carry'
  | 'conditioning'
  | 'other';
export type Mechanic = 'compound' | 'isolation';

/** Share of one logged set credited to a muscle in each role. */
export const ROLE_WEIGHT: Record<MuscleRole, number> = { primary: 1, secondary: 0.5, tertiary: 0.25 };

export interface ExerciseMeta {
  primary: string[];
  secondary: string[];
  tertiary: string[];
  pattern: MovementPattern;
  mechanic: Mechanic;
}

const meta = (
  pattern: MovementPattern,
  mechanic: Mechanic,
  primary: string[],
  secondary: string[] = [],
  tertiary: string[] = []
): ExerciseMeta => ({ primary, secondary, tertiary, pattern, mechanic });

export const EXERCISE_META: Record<string, ExerciseMeta> = {
  // Lower A
  t1_bb_squat: meta('squat', 'compound', ['quads', 'glutes'], [], ['core']),
  t1_squat: meta('squat', 'compound', ['quads', 'glutes'], [], ['core']),
  t2_atg_split_squat: meta('squat', 'compound', ['quads'], ['glutes']),
  t3_bulgarian_split_squat: meta('squat', 'compound', ['quads'], ['glutes']),
  t3_tibialis_wall_raise: meta('other', 'isolation', ['calves']),
  t3_patrick_step_down: meta('squat', 'isolation', ['quads'], [], ['calves']),
  t3_mcgill_big_3: meta('core', 'isolation', ['core'], ['lower_back']),
  t3_loaded_horse_stance: meta('squat', 'compound', ['quads'], ['glutes'], ['core']),

  // Upper A
  t1_bb_ohp: meta('upper_push', 'compound', ['shoulders'], ['triceps'], ['traps']),
  t1_ohp: meta('upper_push', 'compound', ['shoulders'], ['triceps'], ['traps']),
  t2_pullup_ladders: meta('upper_pull', 'compound', ['lats'], ['biceps'], ['traps']),
  t2_pullup: meta('upper_pull', 'compound', ['lats'], ['biceps'], ['traps']),
  t3_filly_kb_z_press: meta('upper_push', 'compound', ['shoulders'], ['core', 'triceps']),
  t3_yellow_dude_lsit: meta('core', 'isolation', ['core']),
  t3_kb_arm_superset: meta('other', 'isolation', ['biceps', 'triceps']),
  t3_german_hang_prep: meta('other', 'isolation', ['shoulders'], ['lats'], ['biceps']),

  // Lower B
  t1_bb_rdl: meta('hinge', 'compound', ['hamstrings', 'glutes'], ['lower_back'], ['lats']),
  t1_deadlift: meta('hinge', 'compound', ['hamstrings', 'glutes'], ['lower_back'], ['lats']),
  t1_rdl: meta('hinge', 'compound', ['hamstrings', 'glutes'], ['lower_back'], ['lats']),
  t2_kb_good_morning: meta('hinge', 'compound', ['hamstrings'], ['glutes', 'lower_back']),
  t3_patrick_step_down_b: meta('squat', 'isolation', ['quads'], [], ['calves']),
  t3_biering_sorensen: meta('hinge', 'isolation', ['lower_back'], ['glutes', 'hamstrings']),
  t3_kb_suitcase_carry: meta('carry', 'compound', ['core'], ['shoulders']),
  t3_jefferson_curl: meta('hinge', 'isolation', ['hamstrings', 'lower_back']),

  // Upper B
  t1_bb_bench_press: meta('upper_push', 'compound', ['chest'], ['shoulders', 'triceps']),
  t1_bench_press: meta('upper_push', 'compound', ['chest'], ['shoulders', 'triceps']),
  t2_barbell_row: meta('upper_pull', 'compound', ['lats'], ['traps', 'biceps']),
  t2_incline_dumbbell_press: meta('upper_push', 'compound', ['chest'], ['shoulders', 'triceps']),
  t2_kb_single_arm_row: meta('upper_pull', 'compound', ['lats'], ['traps', 'biceps']),
  t3_kb_floor_press_er: meta('upper_push', 'compound', ['chest'], ['triceps', 'shoulders']),
  t3_push_up: meta('upper_push', 'compound', ['chest'], ['triceps', 'shoulders']),
  t3_athlean_face_pull: meta('upper_pull', 'isolation', ['shoulders'], ['traps']),
  t3_dead_hang_club_mills: meta('other', 'isolation', ['shoulders'], ['lats'], ['core']),

  // Abs & finishers
  core_hanging_leg_raise: meta('core', 'isolation', ['core']),
  t3_athlean_hanging_knee_raise: meta('core', 'isolation', ['core']),
  t3_athlean_hanging_corkscrew: meta('core', 'isolation', ['core']),
  t3_athlean_hollow_body_hold: meta('core', 'isolation', ['core']),
  t3_athlean_cross_mountain_climber: meta('core', 'isolation', ['core'], [], ['shoulders']),
  t3_athlean_iso_crunch: meta('core', 'isolation', ['core']),
  t3_athlean_serratus_plank: meta('core', 'isolation', ['core'], ['shoulders']),

  // Conditioning & recovery (never "hard sets": everything is secondary)
  t1_run_zone2: meta('conditioning', 'compound', [], ['quads', 'hamstrings', 'calves']),
  t1_run_norwegian_4x4: meta('conditioning', 'compound', [], ['quads', 'hamstrings', 'calves']),
  t2_backward_locomotion: meta('conditioning', 'compound', [], ['quads', 'calves']),
  t3_rowing_metabolic_flush: meta('conditioning', 'compound', [], ['quads', 'hamstrings', 'lats']),
};

/** Metadata for an exercise id; the left/right suffix of a split exercise is ignored. */
export function getExerciseMeta(exerciseId: string): ExerciseMeta | undefined {
  return EXERCISE_META[exerciseId.replace(/__side_(left|right)$/i, '')];
}

/**
 * Split left/right exercises log a full set count per side. Each side counts at half,
 * so 3 sets per leg is 3 sets for the muscle group, not 6.
 */
export function sideFactor(exerciseId: string): number {
  return /__side_(left|right)$/i.test(exerciseId) ? 0.5 : 1;
}

/** muscle id -> share of a set, inserted primary first, then secondary, then tertiary. */
export function muscleWeightsOf(m: ExerciseMeta): Record<string, number> {
  const weights: Record<string, number> = {};
  const put = (ids: string[], role: MuscleRole) =>
    ids.forEach((id) => {
      if (weights[id] === undefined) weights[id] = ROLE_WEIGHT[role];
    });
  put(m.primary, 'primary');
  put(m.secondary, 'secondary');
  put(m.tertiary, 'tertiary');
  return weights;
}

/**
 * Maps a free-text muscle label from programData ("Posterior Deltoid", "Lower Back") to a heatmap muscle id.
 * Order matters: "Lateral Deltoid" must hit shoulders before the lats rule, "Biceps Femoris" must hit
 * hamstrings before biceps, and "Lower Back" must hit lower_back before the generic "back" rule.
 */
export function muscleIdForLabel(label: string): string | null {
  const s = String(label || '').toLowerCase();
  if (s.includes('chest') || s.includes('pectoral')) return 'chest';
  if (s.includes('deltoid') || s.includes('shoulder') || s.includes('rotator')) return 'shoulders';
  if (s.includes('biceps femoris') || s.includes('hamstring') || s.includes('posterior chain')) return 'hamstrings';
  if (s.includes('glute')) return 'glutes';
  if (s.includes('quad') || s.includes('vmo') || s.includes('rectus femoris')) return 'quads';
  if (s.includes('tricep')) return 'triceps';
  if (s.includes('bicep') || s.includes('brachialis') || s.includes('forearm') || s.includes('grip')) return 'biceps';
  if (s.includes('lower back') || s.includes('erector') || s.includes('lumbar')) return 'lower_back';
  if (s.includes('trap')) return 'traps';
  if (/\blats?\b/.test(s) || s.includes('latissimus') || s.includes('rhomboid') || s.includes('back')) return 'lats';
  if (/\babs?\b/.test(s) || s.includes('abdom') || s.includes('core') || s.includes('oblique')) return 'core';
  if (s.includes('calf') || s.includes('calves') || s.includes('tibialis') || s.includes('soleus')) return 'calves';
  return null;
}
