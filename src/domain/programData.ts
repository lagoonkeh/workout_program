// src/domain/programData.ts

/**
 * Official weight dial settings for the Bowflex SelectTech 840 Adjustable Kettlebell.
 * Settings are strictly: 8, 12, 20, 25, 35, 40 lbs.
 */
export const BOWFLEX_840_KETTLEBELL_SETTINGS = [8, 12, 20, 25, 35, 40] as const;
export type BowflexKettlebellWeight = typeof BOWFLEX_840_KETTLEBELL_SETTINGS[number];

export type GZCLTier = 'T1' | 'T2' | 'T3' | 'Warmup';

export type EquipmentType = 
  | 'barbell'
  | 'rack'
  | 'pull_up_bar'
  | 'kettlebell'
  | 'indian_clubs'
  | 'rowing_machine'
  | 'bodyweight'
  | 'bench'
  | 'plates';

export interface ExerciseRegression {
  condition: string;
  exerciseId: string;
  name: string;
  instructions: string;
  tempo: string;
}

export interface WarmupExercise {
  id: string;
  name: string;
  targetDurationOrReps: string;
  tempo?: string;
  creatorAttribution: string;
  equipment: EquipmentType;
  biomechanicalPurpose: string;
  coachingNotes: string;
  setupInstructions?: string[];
}

export type ExerciseSide = 'left' | 'right';

export interface WorkoutExercise {
  id: string;
  name: string;
  tier: GZCLTier;
  targetSets: number;
  targetReps: string; // e.g. "3", "8-10", "15-20", "20 Effective Reps"
  isAmrapLastSet: boolean;
  tempo: string; // Marcus Filly 4-digit notation e.g. "31X1", "30X1", "4010"
  restSeconds: number; // Canonical rest duration
  equipment: EquipmentType;
  defaultWeight?: number;
  defaultWeightLbs?: number;
  muscleGroups: string[];
  biomechanicalRationale: string;
  progressionRule: string;
  regression?: ExerciseRegression;
  isUnilateral?: boolean;
  side?: ExerciseSide;
  baseExerciseId?: string;
  priorityBadge?: string;
  missedLastSession?: boolean;
  adjustedFromSets?: number;
  coachingNotes?: string;
}

/**
 * Determines whether an exercise involves unilateral (single-leg / single-arm / per-side) mechanics.
 */
export function isUnilateralExercise(exercise: WorkoutExercise): boolean {
  if (exercise.isUnilateral !== undefined) return exercise.isUnilateral;
  const name = exercise.name.toLowerCase();
  const targetReps = (exercise.targetReps || '').toLowerCase();
  const rationale = (exercise.biomechanicalRationale || '').toLowerCase();
  const progression = (exercise.progressionRule || '').toLowerCase();

  return (
    name.includes('single-leg') ||
    name.includes('single-arm') ||
    name.includes('split squat') ||
    name.includes('step-down') ||
    name.includes('suitcase carry') ||
    name.includes('cossack') ||
    name.includes('z-press') ||
    name.includes('half-kneeling') ||
    name.includes('bird-dog') ||
    name.includes('elephant walk') ||
    targetReps.includes('/ leg') ||
    targetReps.includes('/ arm') ||
    targetReps.includes('/ side') ||
    progression.includes('/leg') ||
    progression.includes('/arm') ||
    progression.includes('/side') ||
    rationale.includes('unilateral')
  );
}

/**
 * Splits an exercise into two distinct workouts (Left Side & Right Side) to be completed independently.
 */
export function createUnilateralSideExercises(exercise: WorkoutExercise): { left: WorkoutExercise; right: WorkoutExercise } {
  const isArm =
    exercise.name.toLowerCase().includes('arm') ||
    exercise.name.toLowerCase().includes('row') ||
    exercise.name.toLowerCase().includes('press') ||
    exercise.name.toLowerCase().includes('curl') ||
    exercise.muscleGroups.some((m) => m.toLowerCase().includes('lat') || m.toLowerCase().includes('biceps') || m.toLowerCase().includes('triceps') || m.toLowerCase().includes('deltoid'));

  const isLeg =
    exercise.name.toLowerCase().includes('leg') ||
    exercise.name.toLowerCase().includes('squat') ||
    exercise.name.toLowerCase().includes('step') ||
    exercise.name.toLowerCase().includes('hinge') ||
    exercise.name.toLowerCase().includes('calf') ||
    exercise.muscleGroups.some((m) => m.toLowerCase().includes('quad') || m.toLowerCase().includes('hamstring') || m.toLowerCase().includes('glute') || m.toLowerCase().includes('vmo') || m.toLowerCase().includes('tibialis'));

  const sideSuffixLeft = isLeg ? 'Left Leg' : isArm ? 'Left Arm' : 'Left Side';
  const sideSuffixRight = isLeg ? 'Right Leg' : isArm ? 'Right Arm' : 'Right Side';

  const baseName = exercise.name
    .replace(/\s*\((Left|Right)\s*(Leg|Arm|Side)\)/i, '')
    .trim();

  const leftExercise: WorkoutExercise = {
    ...exercise,
    id: `${exercise.id}__side_left`,
    name: `${baseName} (${sideSuffixLeft})`,
    side: 'left',
    baseExerciseId: exercise.baseExerciseId || exercise.id,
    isUnilateral: true,
  };

  const rightExercise: WorkoutExercise = {
    ...exercise,
    id: `${exercise.id}__side_right`,
    name: `${baseName} (${sideSuffixRight})`,
    side: 'right',
    baseExerciseId: exercise.baseExerciseId || exercise.id,
    isUnilateral: true,
  };

  return { left: leftExercise, right: rightExercise };
}

/**
 * Formats a given duration in seconds into standard MM:SS time format.
 * e.g. 5 -> "00:05", 60 -> "01:00", 180 -> "03:00"
 */
export function formatMMSS(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(isNaN(totalSeconds) ? 0 : totalSeconds));
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Extracts the primary numerical target reps from rep descriptions (e.g. "8–10" -> 10, "15-20" -> 20, "3 rounds" -> 3, "20 ER" -> 20, "3" -> 3).
 */
export function extractTargetReps(targetRepsStr?: string, defaultReps = 10): number {
  if (!targetRepsStr || typeof targetRepsStr !== 'string') return defaultReps;
  const numbers = targetRepsStr.match(/\d+/g);
  if (!numbers || numbers.length === 0) return defaultReps;
  if (numbers.length >= 2) {
    const val = parseInt(numbers[1], 10);
    return !isNaN(val) && val > 0 ? val : defaultReps;
  }
  const val = parseInt(numbers[0], 10);
  return !isNaN(val) && val > 0 ? val : defaultReps;
}

/**
 * Resolves the canonical, executable tempo string for an exercise.
 * Accurately extracts hold durations from targetReps for isometric holds (e.g. "Isometric Hold" with targetReps "25–35s" -> "HOLD-35"),
 * ensuring timers and metronomes execute for the exact duration the exercise calls for.
 */
export function getEffectiveExerciseTempo(tempo?: string, targetReps?: string): string {
  if (!tempo || typeof tempo !== 'string') return '30X1';
  const tempoTrimmed = tempo.trim();
  const tempoLower = tempoTrimmed.toLowerCase();

  // If already explicit format like HOLD-45, 0010, 0030, or standard 4-digit notation (e.g. 30X1)
  if (tempoLower.startsWith('hold-') || tempoLower === '0010' || tempoLower === '0030') {
    return tempoTrimmed;
  }

  // If isometric hold alias without explicit duration, extract duration from targetReps
  if (tempoLower.includes('isometric') || tempoLower.includes('hold') || tempoLower.includes('hang')) {
    if (/\d+/.test(tempoTrimmed)) {
      return tempoTrimmed;
    }

    if (targetReps) {
      const repsLower = targetReps.toLowerCase();
      if (repsLower.includes('45–60') || repsLower.includes('45-60') || repsLower.includes('60s') || repsLower.includes('60 s')) {
        return 'HOLD-60';
      }
      if (repsLower.includes('30–45') || repsLower.includes('30-45') || repsLower.includes('45s') || repsLower.includes('45 s')) {
        return 'HOLD-45';
      }
      if (repsLower.includes('25–35') || repsLower.includes('25-35') || repsLower.includes('35s') || repsLower.includes('35 s')) {
        return 'HOLD-35';
      }
      if (repsLower.includes('20–30') || repsLower.includes('20-30') || repsLower.includes('30s') || repsLower.includes('30 s')) {
        return 'HOLD-30';
      }
      if (repsLower.includes('15–25') || repsLower.includes('15-25') || repsLower.includes('25s') || repsLower.includes('25 s')) {
        return 'HOLD-25';
      }
      if (repsLower.includes('20s') || repsLower.includes('20 s')) {
        return 'HOLD-20';
      }
      if (repsLower.includes('15s') || repsLower.includes('15 s')) {
        return 'HOLD-15';
      }
      if (repsLower.includes('10s') || repsLower.includes('10 s') || repsLower.includes('rounds')) {
        return 'HOLD-10';
      }
      if (/\b5\s*s\b/i.test(repsLower) || repsLower.includes('5 s') || repsLower.startsWith('5s')) {
        return 'HOLD-5';
      }
      const match = repsLower.match(/(\d+)\s*s/);
      if (match && match[1]) {
        const parsed = parseInt(match[1], 10);
        if (!isNaN(parsed) && parsed > 0) {
          return `HOLD-${parsed}`;
        }
      }
    }
    return 'HOLD-30';
  }

  return tempoTrimmed;
}

/**
 * True when an exercise is prescribed by time (a hold, plank, hang, "45–60s", "25–30 min", a HOLD-n tempo):
 * those get a countdown. Rep-based lifts (barbell squat, bench, RDL...) don't show tempo or set timers.
 * A hold inside a rep ("10 reps (5s hold)") is a cue, not a timed set.
 */
export function isTimedPrescription(targetReps?: string, tempo?: string): boolean {
  const t = (tempo || '').toLowerCase();
  if (t.startsWith('hold-') || /\b(hold|isometric|hang)\b/.test(t)) return true;
  const raw = (targetReps || '').toLowerCase();
  // a time range in brackets is the set's duration ("8–10 pulses (30–45s)"); a single "(5s hold)" is a per-rep cue
  if (/\(\s*\d+\s*(?:-|–|to)\s*\d+\s*(s|sec|secs|seconds|min|mins|minutes)\b/.test(raw)) return true;
  const r = raw.replace(/\([^)]*\)/g, ' ');
  return /\d\s*(s|sec|secs|seconds|min|mins|minutes)\b/.test(r) || /\bhold\b/.test(r);
}

export type SessionId = 'lower_a' | 'upper_a' | 'lower_b' | 'upper_b' | 'run_conditioning' | 'post_bjj_recovery' | 'daily_abs';

export interface WorkoutSession {
  id: SessionId;
  title: string;
  subtitle: string;
  focus: string;
  estimatedDurationMinutes: number;
  creatorInfluences: string[];
  equipmentRequired: EquipmentType[];
  warmup: WarmupExercise[];
  warmupSequence: WarmupExercise[];
  exercises: WorkoutExercise[];
  dailyCoreFinisher?: WorkoutExercise[];
}

export interface RestPreset {
  id: string;
  label: string;
  durationSeconds: number;
  creatorAttribution: string;
  tierMapping: 'T1' | 'T2' | 'T3' | 'EffectiveReps';
}

export const REST_PRESETS: RestPreset[] = [
  { id: 'er_15', label: '15s (ER Cluster)', durationSeconds: 15, creatorAttribution: 'Athlean-X', tierMapping: 'EffectiveReps' },
  { id: 'er_30', label: '30s (ER Cluster)', durationSeconds: 30, creatorAttribution: 'Athlean-X', tierMapping: 'EffectiveReps' },
  { id: 't3_45', label: '45s (Daily Abs / Reset)', durationSeconds: 45, creatorAttribution: 'Athlean-X', tierMapping: 'T3' },
  { id: 't3_60', label: '60s (Accessory)', durationSeconds: 60, creatorAttribution: 'Marcus Filly', tierMapping: 'T3' },
  { id: 't3_90', label: '90s (Isolation)', durationSeconds: 90, creatorAttribution: 'Jeff Nippard', tierMapping: 'T3' },
  { id: 't2_120', label: '2 min (Hypertrophy)', durationSeconds: 120, creatorAttribution: 'GZCL Tier 2', tierMapping: 'T2' },
  { id: 't2_180', label: '3 min (Heavy Compound)', durationSeconds: 180, creatorAttribution: 'GZCL Tier 2', tierMapping: 'T2' },
  { id: 't1_240', label: '4 min (Heavy Strength)', durationSeconds: 240, creatorAttribution: 'GZCL Tier 1', tierMapping: 'T1' },
  { id: 't1_300', label: '5 min (Maximal 1RM/T1)', durationSeconds: 300, creatorAttribution: 'GZCL Tier 1', tierMapping: 'T1' },
];

const LOWER_A_WARMUP: WarmupExercise[] = [
  {
    id: 'w_lower_a_1',
    name: 'Rowing Machine Reverse Leg-Drive',
    targetDurationOrReps: '4–5 minutes (18–20 SPM)',
    creatorAttribution: 'Ben Patrick (ATG)',
    equipment: 'rowing_machine',
    biomechanicalPurpose: 'Simulates backward sled pulling at home. Drives through the ball of the foot with resistance, flushing synovial fluid and blood into the vastus medialis oblique (VMO) with zero knee joint shear.',
    coachingNotes: 'Push backward through the forefoot. Keep torso upright and smooth cadence.',
    setupInstructions: [
      'Phase 1 — Machine & Strap Setup: Adjust footplate strap across ball of foot; set damper to moderate (4–6).',
      'Phase 2 — Reverse Leg-Drive Posture: Sit tall with upright spine, arms relaxed forward holding handle.',
      'Phase 3 — Forefoot Push Initiation: Push backward purely through the balls of your feet to target the VMO without patellar shear.',
      'Phase 4 — Fluid Knee Extension: Drive backward smoothly with zero hyperextension slam.',
      'Phase 5 — Rhythmic Recovery (18–20 SPM): Return forward under control for 4–5 minutes until knee joints feel warm and lubricated.'
    ]
  },
  {
    id: 'w_lower_a_2',
    name: 'Alyssa Lu 90/90 Positional Breathing + Bridge',
    targetDurationOrReps: '2 sets x 5 deep breath cycles',
    creatorAttribution: 'Dr. Alyssa Lu (Proformance)',
    equipment: 'bodyweight',
    biomechanicalPurpose: 'Digging heels into bench/wall activates hamstrings and rectus abdominis, reflexively shifting anterior pelvic tilt to neutral and releasing overactive psoas.',
    coachingNotes: 'Inhale 5s through nose (360° belly expansion), exhale 8s through mouth, hold 3s.',
    setupInstructions: [
      'Phase 1 — 90/90 Supine Placement: Lie flat on back with calves resting on a workout bench or wall with knees and hips at 90 degrees.',
      'Phase 2 — Heel Dig & Posterior Tilt: Dig heels down into bench to engage hamstrings; tuck pelvis backward until lumbar spine is flush with floor.',
      'Phase 3 — 360° Nasal Inhale: Inhale 5s through nose, filling abdomen, obliques, and lower back 360 degrees.',
      'Phase 4 — Full Forced Exhale: Blow out through mouth for 8 full seconds, pulling lower ribcage down toward pelvis.',
      'Phase 5 — 3-Second Pause: Hold breath for 3 seconds with ribs locked down, maintaining hamstring heel dig.',
      'Phase 6 — Pelvic Reset: Repeat for 2 sets of 5 deep breath cycles to release psoas tension.'
    ]
  },
  {
    id: 'w_lower_a_3',
    name: 'Eugene Teo Standing Calf Raise (Pre-Fatigue)',
    targetDurationOrReps: '2 sets x 15 reps',
    tempo: '3012',
    creatorAttribution: 'Coach Eugene Teo',
    equipment: 'bodyweight',
    biomechanicalPurpose: 'Stabilizes the talocrural joint and knee capsule. Pre-activating the triceps surae eliminates compensatory forward tibial shear during squats.',
    coachingNotes: 'Stand on a 2" plate or block. 3s eccentric stretch at bottom, 2s hard squeeze at the peak.',
    setupInstructions: [
      'Phase 1 — Elevated Platform Stance: Place balls of feet on 2" plate or block with heels free.',
      'Phase 2 — Full Ankle Dorsiflexion: Lower heels over 3 seconds into a deep, comfortable Achilles stretch.',
      'Phase 3 — Big Toe Joint Drive: Press forcefully through first metatarsal head to reach full plantarflexion.',
      'Phase 4 — 2-Second Peak Hold: Hold maximal contraction at the top for 2 full seconds.',
      'Phase 5 — Pre-Fatigue Stabilization: Complete 2 sets of 15 reps to stabilize the talocrural joint before squats.'
    ]
  },
  {
    id: 'w_lower_a_4',
    name: 'Eugene Teo Light KB Romanian Hinge (Pre-Fatigue)',
    targetDurationOrReps: '2 sets x 10 reps',
    tempo: '3110',
    creatorAttribution: 'Coach Eugene Teo',
    equipment: 'kettlebell',
    biomechanicalPurpose: 'Pre-activates the hamstring co-contraction mechanism at the knee joint prior to quad loading, actively pulling the tibia posteriorly to guard against patellar stress.',
    coachingNotes: 'Use 20 or 25 lb Bowflex KB. Push hips back, 3s eccentric down, 1s active hamstring stretch.',
    setupInstructions: [
      'Phase 1 — Stance & Grip: Stand hip-width apart holding a 20 or 25 lb Bowflex kettlebell with both hands.',
      'Phase 2 — Knee Unlock & Lat Pack: Soften knees slightly and pack lats back and down.',
      'Phase 3 — Hip Hinge Descent (3s Tempo): Push hips straight back over 3 seconds, keeping shins nearly vertical.',
      'Phase 4 — 1-Second Hamstring Stretch: Hold end-range hinge for 1 second, loading hamstrings and glutes.',
      'Phase 5 — Glute Drive: Drive hips forward to stand tall; complete 2 sets of 10 reps.'
    ]
  },
  {
    id: 'w_lower_a_5',
    name: 'Squat U Ankle Mobilization & Tripod Rooting',
    targetDurationOrReps: '1–2 sets x 10 reps/side',
    creatorAttribution: 'Dr. Aaron Horschig (Squat University)',
    equipment: 'bodyweight',
    biomechanicalPurpose: 'Pre-conditions talocrural dorsiflexion and roots the three foot contact points (1st MTP, 5th MTP, calcaneus) to prevent inward knee valgus collapse.',
    coachingNotes: 'Grip floor with toes, drive knees outward in line with 2nd/3rd toe.',
    setupInstructions: [
      'Phase 1 — Half-Kneeling or Squat Setup: Position front foot 3–4 inches from wall or squat rack.',
      'Phase 2 — Foot Tripod Rooting: Press big toe knuckle, pinky toe knuckle, and heel firmly into the ground.',
      'Phase 3 — Forward Knee Drive: Drive knee forward directly over 2nd/3rd toe without letting heel lift off floor.',
      'Phase 4 — 2-Second Mobilization Hold: Hold end-range dorsiflexion for 2 seconds to condition ankle flexion.',
      'Phase 5 — Symmetrical Reps: Complete 10 reps per side to eliminate knee valgus collapse.'
    ]
  }
];

export const ATHLEAN_DAILY_ABS_CORE_EXERCISES: WorkoutExercise[] = [
  {
    id: 't3_athlean_hanging_knee_raise',
    name: 'Athlean-X Hanging Knee Raise with Posterior Pelvic Tilt',
    tier: 'T3',
    targetSets: 3,
    targetReps: '10–12',
    isAmrapLastSet: false,
    tempo: '2112',
    restSeconds: 45,
    equipment: 'pull_up_bar',
    muscleGroups: ['Lower Rectus Abdominis', 'Iliopsoas', 'Transversus Abdominis', 'Forearms'],
    biomechanicalRationale: 'Jeff Cavaliere Kinetic Sequence Step 1: Bottom-Up vector. Tackled first when core fibers are fresh. Curling the pelvis upward into posterior tilt engages the lower rectus abdominis without allowing the psoas to hyperextend the lumbar spine into lordotic shear.',
    progressionRule: 'Master 3x12 knees-to-chest with 2s hold at peak posterior pelvic tilt before progressing to straight-leg hanging raises.',
    regression: {
      condition: 'Grip fatigue, shoulder discomfort, or lower back arching',
      exerciseId: 't3_athlean_reverse_pelvic_curl',
      name: 'Athlean-X Lying Reverse Pelvic Curls on Floor',
      instructions: 'Lie supine on floor, hands flat or gripping rack base. Curl knees toward chest and actively elevate pelvis 2–3 inches off floor. Do NOT swing legs.',
      tempo: '2112'
    }
  },
  {
    id: 't3_athlean_hanging_corkscrew',
    name: 'Athlean-X Hanging Corkscrews (Bottom-Up Oblique Drive)',
    tier: 'T3',
    targetSets: 3,
    targetReps: '8–10 / side',
    isAmrapLastSet: false,
    tempo: '2111',
    restSeconds: 45,
    equipment: 'pull_up_bar',
    muscleGroups: ['Internal Obliques', 'External Obliques', 'Lower Rectus Abdominis', 'Serratus Anterior'],
    biomechanicalRationale: 'Jeff Cavaliere Kinetic Sequence Step 2: Bottom-Up Rotational. Rotating the pelvis diagonally as knees rise activates the internal and external obliques in synchrony with lower abs while fresh.',
    progressionRule: 'Alternate sides smoothly. Once 3x10/side completed with zero swinging momentum, progress to straight-leg hanging corkscrew twists.',
    regression: {
      condition: 'Pull-up bar grip limitation or shoulder fatigue',
      exerciseId: 't3_athlean_lying_corkscrew',
      name: 'Athlean-X Supine Twisting Reverse Crunches',
      instructions: 'Lie supine with arms braced out. Curl pelvis up and rotate hips diagonally to one side, alternating left and right with strict control.',
      tempo: '2111'
    }
  },
  {
    id: 't3_athlean_hollow_body_hold',
    name: 'Athlean-X Hollow Body Core Compression Hold',
    tier: 'T3',
    targetSets: 3,
    targetReps: '25–35s',
    isAmrapLastSet: false,
    tempo: 'Isometric Hold',
    restSeconds: 45,
    equipment: 'bodyweight',
    muscleGroups: ['Rectus Abdominis', 'Transversus Abdominis', 'Hip Flexors', 'Quadriceps'],
    biomechanicalRationale: 'Jeff Cavaliere & Yellow Dude Core Compression: Mid-Range Anti-Extension. Clamps the lumbar spine flush against the floor with zero air gap, forcing deep core endurance without lumbar shear.',
    progressionRule: 'Build from bent-knee tuck hollow hold (20s) to full straight-arm, straight-leg hollow hold (45s).'
  },
  {
    id: 't3_athlean_cross_mountain_climber',
    name: 'Athlean-X Cross-Body Mountain Climbers',
    tier: 'T3',
    targetSets: 3,
    targetReps: '15–20 / side',
    isAmrapLastSet: false,
    tempo: '2011',
    restSeconds: 45,
    equipment: 'bodyweight',
    muscleGroups: ['External Obliques', 'Internal Obliques', 'Serratus Anterior', 'Core Stabilizers'],
    biomechanicalRationale: 'Jeff Cavaliere Kinetic Sequence Step 4: Top-Down Rotational. From a push-up plank, driving the opposite knee across the torso toward the opposite elbow rotates the ribcage on a stable pelvis.',
    progressionRule: 'Ensure a deliberate 1-second squeeze at the cross-over peak rather than rushing reps. Progress from 15 to 20 reps/side.'
  },
  {
    id: 't3_athlean_iso_crunch',
    name: 'Athlean-X 2-Second Peak Squeeze Floor Curl-Up',
    tier: 'T3',
    targetSets: 3,
    targetReps: '12–15',
    isAmrapLastSet: false,
    tempo: '2112',
    restSeconds: 45,
    equipment: 'bodyweight',
    muscleGroups: ['Upper Rectus Abdominis', 'Transversus Abdominis'],
    biomechanicalRationale: 'Jeff Cavaliere Kinetic Sequence Step 5: Top-Down Flexion. Upper rectus abdominis has the lightest lever arm (torso only, with legs grounded) and can reach fatigue safely at the end of the circuit without hip flexor dominance.',
    progressionRule: 'Hold an 8 or 12 lb Bowflex kettlebell or weight plate at chest once 3x15 bodyweight reps are executed with complete exhalation.',
    regression: {
      condition: 'Neck discomfort or cervical strain',
      exerciseId: 't3_athlean_supported_curlup',
      name: 'Dr. Stuart McGill Supported Curl-Up with Head Neutral',
      instructions: 'Place hands under lumbar curve to preserve lordosis. Raise head and upper chest only 1 inch off floor without bending neck. Hold 3s per rep.',
      tempo: '2112'
    }
  },
  {
    id: 't3_athlean_serratus_plank',
    name: 'Athlean-X Serratus Elbow-to-Knee Plank + Vacuum Brace',
    tier: 'T3',
    targetSets: 3,
    targetReps: '30–45s',
    isAmrapLastSet: false,
    tempo: 'Isometric Hold',
    restSeconds: 45,
    equipment: 'bodyweight',
    muscleGroups: ['Transversus Abdominis', 'Serratus Anterior', 'Internal Obliques', 'Pelvic Floor'],
    biomechanicalRationale: 'Jeff Cavaliere & Dr. Stuart McGill Core Cylinder Finisher: While in a forearm plank, actively protract shoulder blades (pushing ground away) and isometrically pull elbows toward toes. Locks in 360° intra-abdominal pressure.',
    progressionRule: 'Advance hold duration from 30s to 45–60s while maintaining rhythmic diaphragmatic nasal breathing.'
  }
];

export function createDailyAbsExercises(sessionId: string): WorkoutExercise[] {
  return ATHLEAN_DAILY_ABS_CORE_EXERCISES.map((baseEx) => ({
    ...baseEx,
    id: `${baseEx.id}_${sessionId}`,
    baseExerciseId: baseEx.id,
    targetSets: 1,
    restSeconds: 30,
    regression: undefined,
    tempo: baseEx.id.includes('mountain') ? '2010' : baseEx.tempo,
    biomechanicalRationale: `Athlean-X Daily Core Finisher: ${baseEx.biomechanicalRationale}`,
  }));
}

export const SESSION_LOWER_A: WorkoutSession = {
  id: 'lower_a',
  title: 'Lower A',
  subtitle: 'Quad & Knee Bulletproofing Focus',
  focus: 'VMO tendon remodeling, knee joint decompression, quad hypertrophy without patellar shear, and core stability.',
  estimatedDurationMinutes: 55,
  creatorInfluences: ['Ben Patrick (ATG)', 'Coach Eugene Teo', 'Dr. Aaron Horschig', 'Dr. Alyssa Lu', 'Dr. Stuart McGill', 'Lucas Hardie (Range of Strength)', 'Jeff Cavaliere (ATHLEAN-X)', 'Derek (More Plates More Dates)'],
  equipmentRequired: ['rowing_machine', 'barbell', 'rack', 'kettlebell', 'pull_up_bar', 'bodyweight'],
  warmup: LOWER_A_WARMUP,
  warmupSequence: LOWER_A_WARMUP,
  exercises: [
    {
      id: 't1_bb_squat',
      name: 'Barbell Back Squat',
      tier: 'T1',
      targetSets: 5,
      targetReps: '3',
      isAmrapLastSet: true,
      tempo: '31X1',
      restSeconds: 180,
      equipment: 'barbell',
      defaultWeight: 185,
      defaultWeightLbs: 185,
      muscleGroups: ['Quadriceps', 'Glutes', 'Adductors', 'Erectors'],
      biomechanicalRationale: 'Primary GZCL strength foundation. Controlled 3-second descent and 1-second pause at parallel removes the stretch-shortening rebound snap on the patellar tendon, maximizing quad fiber tension under strict control.',
      progressionRule: 'Add 10 lbs weekly. When < 15 total reps across 5 sets: Stage 2 = 6x2+; Stage 3 = 10x1+; then test & reset.',
      regression: {
        condition: 'Patellar tendon pain > 2/10 or knee discomfort during deep knee flexion',
        exerciseId: 't1_bb_box_squat',
        name: 'Barbell Box Squat to Parallel',
        instructions: 'Position bench/box inside rack. Squat back onto the box keeping shins perpendicular to floor. Pause 1s on box without relaxing core, then explode up. Eliminates forward patellar shear.',
        tempo: '31X1'
      }
    },
    {
      id: 't2_atg_split_squat',
      name: 'ATG Split Squat',
      tier: 'T2',
      targetSets: 3,
      targetReps: '8–10',
      isAmrapLastSet: false,
      tempo: '31X1',
      restSeconds: 120,
      equipment: 'kettlebell',
      defaultWeight: 20,
      defaultWeightLbs: 20,
      muscleGroups: ['Quadriceps (VMO focus)', 'Psoas / Hip Flexors', 'Glutes', 'Calves'],
      biomechanicalRationale: 'Ben Patrick tendinopathy rehabilitation cornerstone. Promotes full hamstring-to-calf coverage under slow, controlled loading to remodel patellar collagen and elongate the rear-leg psoas.',
      progressionRule: 'Double progression: achieve 10 reps/leg across all 3 sets with 0/10 pain before increasing kettlebell load by 5 lbs.',
      regression: {
        condition: 'Patellar tendon pain ache or inability to reach full depth without heel lift',
        exerciseId: 't2_atg_split_squat_elevated',
        name: 'Front-Foot Elevated ATG Split Squat (6–12")',
        instructions: 'Elevate front foot on 2–3 weight plates (6") or workout bench (12–18"). Hold rack upright with hands to regulate load. Maintain vertical torso and pain-free 0/10 knee depth.',
        tempo: '4010'
      }
    },
    {
      id: 't3_tibialis_wall_raise',
      name: 'Tibialis Wall Raises',
      tier: 'T3',
      targetSets: 3,
      targetReps: '15–20',
      isAmrapLastSet: false,
      tempo: '2011',
      restSeconds: 60,
      equipment: 'bodyweight',
      muscleGroups: ['Tibialis Anterior', 'Ankle Dorsiflexors'],
      biomechanicalRationale: 'Strengthens the primary lower-leg decelerator and ground-impact shock absorber. Strong tibialis anterior directly reduces decelerative shock transmission through the patellar tendon.',
      progressionRule: 'Move feet further out from wall in 2-inch increments. Once 3x20 reps mastered at 24", add light kettlebell toe-hang.'
    },
    {
      id: 't3_patrick_step_down',
      name: 'Single-Leg Patrick Step-Downs',
      tier: 'T3',
      targetSets: 3,
      targetReps: '12–15',
      isAmrapLastSet: false,
      tempo: '3010',
      restSeconds: 60,
      equipment: 'bodyweight',
      muscleGroups: ['Vastus Medialis Oblique (VMO)', 'Ankle Stabilizers'],
      biomechanicalRationale: 'Isolates the VMO at early knee flexion (0–30°). Tap the free heel gently on the floor as if touching thin glass to eliminate impact rebound.',
      progressionRule: 'Start on 2" plate. Advance to 4" plate, then 6" step-down once 3x15 clean reps achieved.'
    },
    {
      id: 't3_mcgill_big_3',
      name: 'Dr. Stuart McGill Big 3 Endurance Tri-Set',
      tier: 'T3',
      targetSets: 3,
      targetReps: '3 rounds',
      isAmrapLastSet: false,
      tempo: 'Isometric Holds',
      restSeconds: 60,
      equipment: 'bodyweight',
      muscleGroups: ['Rectus Abdominis', 'Quadratus Lumborum', 'Obliques', 'Multifidus', 'Glutes'],
      biomechanicalRationale: 'Spares lumbar discs while building isometric core endurance ratios proven by Dr. McGill to prevent lower back overload during heavy barbell lifts.',
      progressionRule: 'Maintain descending hold endurance pyramids (e.g. 6-4-2 holds or 3x10s perfect form).'
    },
    {
      id: 't3_loaded_horse_stance',
      name: 'Range of Strength Loaded Horse Stance Pulses',
      tier: 'T3',
      targetSets: 3,
      targetReps: '8–10 pulses (30–45s)',
      isAmrapLastSet: false,
      tempo: '3112',
      restSeconds: 60,
      equipment: 'kettlebell',
      defaultWeight: 20,
      defaultWeightLbs: 20,
      muscleGroups: ['Adductor Magnus', 'Adductor Longus', 'Gluteus Medius', 'Pelvic Floor'],
      biomechanicalRationale: 'Lucas Hardie loaded end-range stimulus. Holding kettlebell low in a 3-step horse stance with slight anterior pelvic tilt overrides femoral neck impingement and exposes the adductor complex to extreme loaded stretch, maximizing stretch-mediated adductor hypertrophy and pelvic stability.',
      progressionRule: 'Double progression: build from 3x30s to 3x45s holds before stepping up to the next Bowflex kettlebell notch (20 → 25 → 35 lbs).'
    }
  ],
  dailyCoreFinisher: createDailyAbsExercises('lower_a')
};

const UPPER_A_WARMUP: WarmupExercise[] = [
  {
    id: 'w_upper_a_1',
    name: 'Indian Club Rotational Circles & Casts',
    targetDurationOrReps: '2 sets x 10 circles each direction',
    creatorAttribution: 'Marcus Filly & Athlean-X Priming',
    equipment: 'indian_clubs',
    biomechanicalPurpose: 'Uses 2 lb or 5 lb Indian clubs to lubricate the glenohumeral joint capsule, stimulate rotator cuff stabilizers, and dynamically mobilize the scapulothoracic rhythm.',
    coachingNotes: 'Smooth wrist circles, outward shoulder casts, and transverse spirals without forcing range.',
    setupInstructions: [
      'Phase 1 — Club Grip: Hold 2 lb or 5 lb Indian clubs with light thumb grip and tall spine.',
      'Phase 2 — Transverse Wrist Circles: Perform 10 smooth clockwise and counterclockwise wrist circles.',
      'Phase 3 — Outward Shoulder Casts: Swing clubs across body and cast outward into scapular plane.',
      'Phase 4 — Capsule Lubrication: Repeat 10 circles each direction to warm up the glenohumeral joint.'
    ]
  },
  {
    id: 'w_upper_a_2',
    name: 'Athlean-X Scapular Retractions & Depressions',
    targetDurationOrReps: '2 sets x 12 reps',
    tempo: '2012',
    creatorAttribution: 'Jeff Cavaliere (ATHLEAN-X)',
    equipment: 'bodyweight',
    biomechanicalPurpose: 'Activates the lower traps and serratus anterior to seat the humeral head properly in the glenoid fossa before horizontal loading.',
    coachingNotes: 'Pinch shoulder blades down and back. Hold 2s squeeze at end range.',
    setupInstructions: [
      'Phase 1 — Setup Posture: Stand tall or assume prone plank position with arms extended.',
      'Phase 2 — Scapular Retraction & Depression: Pull shoulder blades down and back without bending elbows.',
      'Phase 3 — 2-Second Peak Squeeze: Hold maximal lower trapezius and rhomboid contraction for 2 seconds.',
      'Phase 4 — Controlled Protraction: Allow shoulder blades to glide smoothly forward; repeat for 12 reps.'
    ]
  },
  {
    id: 'w_upper_a_3',
    name: 'McGill Bird-Dog Core & Lat Tension Priming',
    targetDurationOrReps: '2 sets x 4 reps / side (10s hold)',
    tempo: '0010',
    creatorAttribution: 'Dr. Stuart McGill',
    equipment: 'bodyweight',
    biomechanicalPurpose: 'Locks the core cylinder and lat-lumbar fascia, preventing unwanted spinal twisting under unilateral rowing.',
    coachingNotes: 'Clench fist, drive opposite heel back, brace core as if taking a punch.',
    setupInstructions: [
      'Phase 1 — Quadruped Base: Position hands under shoulders and knees under hips with spine neutral.',
      'Phase 2 — Opposite Limb Extension: Elevate opposite arm and leg parallel to floor without tilting pelvis.',
      'Phase 3 — 10-Second Tension Hold: Clench fist, kick heel back into wall, and brace 360° for 10 seconds.',
      'Phase 4 — Smooth Reset: Alternate sides deliberately for 4 reps per side with zero spinal flexion.'
    ]
  }
];

export const SESSION_UPPER_A: WorkoutSession = {
  id: 'upper_a',
  title: 'Upper A',
  subtitle: 'Horizontal Push/Pull & Shoulder Health',
  focus: 'Subacromial joint spacing, scapular retraction/depression, balanced horizontal press and row mechanics.',
  estimatedDurationMinutes: 50,
  creatorInfluences: ['Jeff Cavaliere (ATHLEAN-X)', 'Jeff Nippard', 'Coach Eugene Teo', 'Dr. Stuart McGill', 'Lucas Hardie (Range of Strength)', 'Derek (More Plates More Dates)'],
  equipmentRequired: ['indian_clubs', 'barbell', 'rack', 'bench', 'kettlebell', 'pull_up_bar'],
  warmup: UPPER_A_WARMUP,
  warmupSequence: UPPER_A_WARMUP,
  exercises: [
    {
      id: 't1_bb_bench_press',
      name: 'Barbell Bench Press',
      tier: 'T1',
      targetSets: 5,
      targetReps: '3',
      isAmrapLastSet: true,
      tempo: '30X1',
      restSeconds: 180,
      equipment: 'barbell',
      defaultWeight: 150,
      defaultWeightLbs: 150,
      muscleGroups: ['Pectoralis Major', 'Anterior Deltoid', 'Triceps Brachii'],
      biomechanicalRationale: 'Primary upper strength builder. Tucking elbows strictly to 45 degrees relative to torso clears the acromion process and eliminates subacromial impingement.',
      progressionRule: 'Add 5 lbs weekly. When < 15 total reps: Stage 2 = 6x2+; Stage 3 = 10x1+; then test & reset.',
      regression: {
        condition: 'Anterior shoulder pain or clavicular discomfort during full bench press depth',
        exerciseId: 't1_bb_floor_press',
        name: 'Barbell Floor Press',
        instructions: 'Lie supine on floor inside rack. Lower bar until upper arms rest gently on the floor (90° elbow bend). Pauses movement at floor level, eliminating extreme shoulder hyperextension.',
        tempo: '31X1'
      }
    },
    {
      id: 't2_kb_single_arm_row',
      name: 'Single-Arm Kettlebell Row',
      tier: 'T2',
      targetSets: 3,
      targetReps: '8–10 / arm',
      isAmrapLastSet: false,
      tempo: '31X1',
      restSeconds: 120,
      equipment: 'kettlebell',
      defaultWeight: 35,
      defaultWeightLbs: 35,
      muscleGroups: ['Latissimus Dorsi', 'Teres Major', 'Rhomboids', 'Posterior Deltoid'],
      biomechanicalRationale: 'Bench-supported horizontal pull that balances the bench press. Driving the elbow back toward the hip pocket (not up to the chest) lines the pull up with the lat fibers, and the braced hand and knee unload the lower back.',
      progressionRule: 'Double progression: build to 10 strict reps/arm across all 3 sets, then advance to the next Bowflex kettlebell notch (25 → 35 → 40 lbs max). At 40 lbs, add a 2-second squeeze at the top and a 4-second lowering.',
      regression: {
        condition: 'Lower back fatigue or difficulty bracing on the bench',
        exerciseId: 't2_inverted_row',
        name: 'Inverted Row (Rack Bar)',
        instructions: 'Set a barbell in the rack at hip height and hang underneath with straight legs or bent knees. Row your chest to the bar with elbows at about 45 degrees; the body is fully supported, so the lower back carries no load.',
        tempo: '3011'
      }
    },
    {
      id: 't3_kb_floor_press_er',
      name: 'Athlean-X 20 Effective Reps (ER) Kettlebell Floor Press',
      tier: 'T3',
      targetSets: 1,
      targetReps: '20 Effective Reps',
      isAmrapLastSet: false,
      tempo: '2010',
      restSeconds: 20,
      equipment: 'kettlebell',
      defaultWeight: 35,
      defaultWeightLbs: 35,
      muscleGroups: ['Pectoralis Major', 'Triceps', 'Shoulder Stabilizers'],
      biomechanicalRationale: 'Recruits high-threshold motor units without joint fatigue. An ignition set of 10–12 reps brings muscle fibers near failure; subsequent mini-sets of 2–4 reps with 15–30s rest accumulate 20 pure effective reps.',
      progressionRule: 'When 20 effective reps are accumulated in under 4 micro-sets, increase kettlebell weight notch.'
    },
    {
      id: 't3_athlean_face_pull',
      name: 'Athlean-X Non-Negotiable Face Pull Alternative (Kettlebell High Pull & External Rotation)',
      tier: 'T3',
      targetSets: 3,
      targetReps: '15–20',
      isAmrapLastSet: false,
      tempo: '2112',
      restSeconds: 60,
      equipment: 'kettlebell',
      defaultWeight: 12,
      defaultWeightLbs: 12,
      muscleGroups: ['Infraspinatus', 'Teres Minor', 'Rear Deltoid', 'Mid/Lower Trapezius', 'Rhomboids'],
      biomechanicalRationale: 'Zero-cable, zero-device Athlean-X face pull alternative using your BowFlex 840 kettlebell (8–12 lbs) or Indian clubs. From a 30° hip hinge, pull the load vertically with elbows wide, then actively externally rotate at the shoulder until hands/knuckles are higher than elbows. Hits the rotator cuff external rotators and scapular retractors without cables, bands, or anchors.',
      progressionRule: 'Increase kettlebell load or add 2-second isometric holds at peak external rotation once 3x20 reps mastered.'
    },
    {
      id: 't3_dead_hang_club_mills',
      name: 'Active Dead Hang & Indian Club Arm Casts',
      tier: 'T3',
      targetSets: 2,
      targetReps: '45s dead hang + 10 club casts / side',
      isAmrapLastSet: false,
      tempo: 'Controlled Cadence',
      restSeconds: 60,
      equipment: 'pull_up_bar',
      muscleGroups: ['Subscapularis', 'Serratus Anterior', 'Forearm Flexors', 'Spine'],
      biomechanicalRationale: 'Passive gravitational traction decompresses the subacromial space and thoracolumbar spine while gently re-establishing shoulder rotational freedom with light Indian clubs.',
      progressionRule: 'Increase dead hang duration to 60–90 seconds.'
    }
  ],
  dailyCoreFinisher: createDailyAbsExercises('upper_a')
};

const LOWER_B_WARMUP: WarmupExercise[] = [
  {
    id: 'w_lower_b_1',
    name: 'Alyssa Lu 10-Minute Active Hip Reset Protocol',
    targetDurationOrReps: '5–6 minutes',
    creatorAttribution: 'Dr. Alyssa Lu (Proformance)',
    equipment: 'bodyweight',
    biomechanicalPurpose: 'Combines 90/90 positional breathing with hamstring heel digs and adductor bridge squeezes to restore pelvic symmetry and inhibit chronic hip flexor hypertonicity.',
    coachingNotes: '2 sets of 5 breaths 90/90 heel dig + 2 sets of 10 adductor squeeze glute bridges.',
    setupInstructions: [
      'Phase 1 — 90/90 Heel Dig Reset: Lie on back with feet on bench at 90°. Dig heels down, tilt pelvis backward, and perform 5 deep 5s inhale / 8s exhale breath cycles to disengage hypertonic hip flexors.',
      'Phase 2 — Adductor Block Squeeze: Place a foam roller or yoga block between your knees. Squeeze the block firmly (activating adductors) while maintaining the posterior pelvic tilt.',
      'Phase 3 — Low Glute Bridge Lift: Lift hips 2 to 3 inches off the floor using your hamstrings and glutes while continuously squeezing the block. Never arch your lower back.',
      'Phase 4 — 2-Second Bridge Pause: Hold at the top for 2 seconds with ribs depressed and pelvis neutral. Lower slowly under control.',
      'Phase 5 — Complete Restoration Protocol: Perform 2 sets of 10 bridge reps followed by 5 breathing cycles. Centers the femoral head into the acetabulum, eliminating anterior hip pinch before deadlifts and RDLs.'
    ]
  },
  {
    id: 'w_lower_b_2',
    name: 'ATG Elephant Walks (Active Reciprocal Lengthening)',
    targetDurationOrReps: '2 sets x 20 reps / leg',
    creatorAttribution: 'Ben Patrick (ATG)',
    equipment: 'bodyweight',
    biomechanicalPurpose: 'Alternating active quadriceps contraction forces reciprocal inhibition of the ipsilateral hamstring, restoring deep posterior chain elasticity without damaging passive stretching.',
    coachingNotes: 'Place hands on bench or floor. Lock out knee with strong quad squeeze on each step.',
    setupInstructions: [
      'Phase 1 — Support Setup: Place hands flat on a workout bench or floor with feet shoulder-width apart.',
      'Phase 2 — Reciprocal Locking: Soften one knee while driving the opposite leg into absolute lockout, squeezing the quad as hard as possible.',
      'Phase 3 — Active Lengthening: Hold the locked quad for 1 second, feeling active lengthening through the posterior hamstring belly.',
      'Phase 4 — Rhythmic Alternation: Step back and forth between legs in a rhythmic cadence for 20 deliberate steps per side.'
    ]
  },
  {
    id: 'w_lower_b_3',
    name: 'Rowing Machine Steady Rhythm Flush',
    targetDurationOrReps: '3–4 minutes low resistance',
    creatorAttribution: 'Eugene Teo & Conditioning Base',
    equipment: 'rowing_machine',
    biomechanicalPurpose: 'Lubricates the hip joints and lumbar facet joints through rhythmic low-impact hip hinge motion.',
    coachingNotes: 'Keep stroke rate relaxed (18–20 SPM). Drive smoothly from hips and legs.',
    setupInstructions: [
      'Phase 1 — Footplate Adjustment: Strap feet securely with strap over widest part of midfoot; set damper 3–4.',
      'Phase 2 — Tall Hinge Posture: Sit tall with flat lower back, arms extended forward, shins vertical at catch.',
      'Phase 3 — Smooth Posterior Drive: Push evenly through legs, uncoiling knees and opening hips smoothly.',
      'Phase 4 — Synovial Fluid Flush: Maintain relaxed 18–20 SPM stroke cadence for 3–4 minutes to lubricate hip and lumbar facets.'
    ]
  },
  {
    id: 'w_lower_b_4',
    name: 'Squat U Single-Leg Kettlebell Around-the-Worlds',
    targetDurationOrReps: '2 sets x 5 passes each direction / leg',
    creatorAttribution: 'Dr. Aaron Horschig (Squat University)',
    equipment: 'kettlebell',
    biomechanicalPurpose: 'Passing a light kettlebell around the body while balancing on one leg forces the stance-side glute medius, deep hip rotators and foot tripod to resist a constantly moving rotational load. Primes single-leg hip and knee control for step-downs and suitcase carries.',
    coachingNotes: 'Use the 8 or 12 lb Bowflex setting; it is far harder on one leg than it looks. Keep hips level and knee over 2nd/3rd toe. Touch the free foot down if you lose balance rather than twisting.',
    setupInstructions: [
      'Phase 1 — Stance Setup: Stand on one leg with a soft knee, foot tripod rooted (big toe, pinky toe, heel). Hold an 8–12 lb kettlebell by the horn in front of the hips.',
      'Phase 2 — Brace & Level Hips: Light 360° brace, ribs down, pelvis level — do not let the free-leg hip drop.',
      'Phase 3 — Slow Pass Around: Pass the bell from hand to hand around the waist in a slow, controlled circle without letting the torso rotate or sway.',
      'Phase 4 — Knee Tracking: Keep the stance knee tracking over the 2nd/3rd toe the whole time; no inward collapse as the bell travels behind you.',
      'Phase 5 — Reverse & Switch: 5 passes clockwise, 5 counter-clockwise, then switch legs. 2 sets per leg.'
    ]
  }
];

export const SESSION_LOWER_B: WorkoutSession = {
  id: 'lower_b',
  title: 'Lower B',
  subtitle: 'Posterior Chain & Hamstring Restoration Focus',
  focus: 'Active hamstring lengthening under reciprocal inhibition, hip hinge dominance, spinal sparing, and unilateral knee resilience.',
  estimatedDurationMinutes: 55,
  creatorInfluences: ['Dr. Alyssa Lu', 'Ben Patrick (ATG)', 'Jeff Nippard', 'Dr. Stuart McGill', 'Coach Eugene Teo', 'Lucas Hardie (Range of Strength)', 'Jeff Cavaliere (ATHLEAN-X)', 'Derek (More Plates More Dates)'],
  equipmentRequired: ['pull_up_bar', 'bodyweight', 'rowing_machine', 'barbell', 'rack', 'kettlebell'],
  warmup: LOWER_B_WARMUP,
  warmupSequence: LOWER_B_WARMUP,
  exercises: [
    {
      id: 't1_bb_rdl',
      name: 'Barbell Romanian Deadlift (RDL)',
      tier: 'T1',
      targetSets: 5,
      targetReps: '3',
      isAmrapLastSet: false,
      tempo: '31X1',
      restSeconds: 180,
      equipment: 'barbell',
      defaultWeight: 175,
      defaultWeightLbs: 175,
      muscleGroups: ['Hamstrings (Biceps Femoris/Semitendinosus)', 'Gluteus Maximus', 'Erector Spinae', 'Lats'],
      biomechanicalRationale: 'Maximum stretch-mediated hypertrophy of the posterior chain. Controlled 3s hip hinge with bar kept in continuous contact with thighs minimizes the lumbar moment arm while maximally stressing hamstrings.',
      progressionRule: 'Add 10 lbs once all 5 sets of 3 are clean at RPE 8 or below. No all-out last set on RDLs: stop every set with a flat back and about 2 reps in reserve.',
      regression: {
        condition: 'Lower back shear, disc fatigue, or hamstring cramping',
        exerciseId: 't1_kb_rdl',
        name: 'Kettlebell Romanian Deadlift',
        instructions: 'Hold one heavy kettlebell by the horns, soft knees, and push the hips straight back with the bell close to the legs. The lighter load and shorter lever take the shear off the lower back while still loading the hamstrings through a full stretch.',
        tempo: '31X1'
      }
    },
    {
      id: 't2_kb_good_morning',
      name: 'Kettlebell Good Mornings',
      tier: 'T2',
      targetSets: 3,
      targetReps: '8–10',
      isAmrapLastSet: false,
      tempo: '31X1',
      restSeconds: 120,
      equipment: 'kettlebell',
      defaultWeight: 35,
      defaultWeightLbs: 35,
      muscleGroups: ['Hamstrings', 'Glutes', 'Thoracic/Lumbar Erectors'],
      biomechanicalRationale: 'Reinforces hip hinge mechanics and strengthens the spinal extensor endurance ratio without requiring heavy axial spine compression.',
      progressionRule: 'Double progression: achieve 3x10 clean reps before stepping kettlebell weight up by 5 lbs.',
      regression: {
        condition: 'Hamstring over-tightness or adductor stiffness',
        exerciseId: 't2_goblet_cossack_squat',
        name: 'Goblet Cossack Squat',
        instructions: 'Hold 18–25 lb KB at chest. Shift laterally onto one leg in deep squat while contralateral leg remains straight. Opens adductors and builds unilateral knee resilience.',
        tempo: '31X1'
      }
    },
    {
      id: 't3_patrick_step_down_b',
      name: 'Single-Leg Patrick Step-Downs',
      tier: 'T3',
      targetSets: 3,
      targetReps: '15',
      isAmrapLastSet: false,
      tempo: '3010',
      restSeconds: 60,
      equipment: 'bodyweight',
      muscleGroups: ['VMO', 'Patellar Tendon', 'Ankle Stabilizers'],
      biomechanicalRationale: 'Reinforces patellar tendon adaptation in a post-fatigued state, ensuring tendon stiffness and decelerative compliance remain high.',
      progressionRule: 'Elevate plate height from 2" to 4" as knee strength stabilizes.'
    },
    {
      id: 't3_biering_sorensen',
      name: 'Biering-Sørensen Back Extensor Holds',
      tier: 'T3',
      targetSets: 3,
      targetReps: '45–60s',
      isAmrapLastSet: false,
      tempo: 'Isometric Hold',
      restSeconds: 60,
      equipment: 'bodyweight',
      muscleGroups: ['Lumbar Erectors', 'Multifidus', 'Glutes', 'Hamstrings'],
      biomechanicalRationale: 'Clinically validated by Dr. Stuart McGill: extensor muscle endurance is the single greatest statistical predictor of lumbar spine injury resistance.',
      progressionRule: 'Increase hold duration towards 90–120 seconds.'
    },
    {
      id: 't3_kb_suitcase_carry',
      name: 'Kettlebell Suitcase Carries',
      tier: 'T3',
      targetSets: 3,
      targetReps: '50 feet / side',
      isAmrapLastSet: false,
      tempo: 'Controlled Cadence Walk',
      restSeconds: 60,
      equipment: 'kettlebell',
      defaultWeight: 35,
      defaultWeightLbs: 35,
      muscleGroups: ['Quadratus Lumborum', 'Obliques', 'Grip Flexors', 'Gluteus Medius'],
      biomechanicalRationale: 'Anti-lateral flexion drill. Demands intense isometric quadratus lumborum bracing while walking, preserving pelvic stability.',
      progressionRule: 'Increase kettlebell load or extend distance to 75–100 feet.'
    },
    {
      id: 't3_jefferson_curl',
      name: 'Range of Strength Jefferson Curl (Progressive Deficit)',
      tier: 'T3',
      targetSets: 3,
      targetReps: '5–6',
      isAmrapLastSet: false,
      tempo: '4111',
      restSeconds: 60,
      equipment: 'kettlebell',
      defaultWeight: 12,
      defaultWeightLbs: 12,
      muscleGroups: ['Hamstrings (Distal Tendon Focus)', 'Multifidus', 'Erector Spinae', 'Thoracolumbar Fascia'],
      biomechanicalRationale: 'Lucas Hardie & Ben Patrick posterior chain mobility drill. Light progressive loaded flexion at long muscle lengths. NOTE: Strictly capped at 8–12 lbs on the Bowflex kettlebell as a mobility drill, not an ego lift.',
      progressionRule: 'Strictly capped at 8–12 lbs on the Bowflex kettlebell for spinal longevity. If lower back fatigue, disc sensitivity, or stiffness is present, swap to McGill Big 3 spinal stabilization regression.',
      regression: {
        condition: 'Lumbar spine stiffness, disc sensitivity, or back fatigue',
        exerciseId: 't3_mcgill_big_3_regression',
        name: 'Dr. Stuart McGill Big 3 Spinal Stabilization',
        instructions: 'Perform 3 rounds of 10s Bird-Dog, 10s Side Plank per side, and 10s Modified Curl-Up. Eliminates loaded spinal flexion and establishes a 360-degree rigid torso cylinder.',
        tempo: '10s hold',
      },
    }
  ],
  dailyCoreFinisher: createDailyAbsExercises('lower_b')
};

const UPPER_B_WARMUP: WarmupExercise[] = [
  {
    id: 'w_upper_b_1',
    name: 'Athlean-X Active Scapular Dead Hang Pulls',
    targetDurationOrReps: '2 sets x 8 reps (2s hold at top)',
    tempo: '2112',
    creatorAttribution: 'Jeff Cavaliere (ATHLEAN-X)',
    equipment: 'pull_up_bar',
    biomechanicalPurpose: 'Hanging with relaxed shoulders, then actively pulling scapulae down and together to elevate torso without bending elbows. Primes lower trap / serratus engagement.',
    coachingNotes: 'Think of pulling your shoulder blades into your back pockets without bending elbows.',
    setupInstructions: [
      'Phase 1 — Pull-Up Bar Dead Hang: Grip the bar overhand shoulder-width apart; hang with arms straight.',
      'Phase 2 — Scapular Depression Pull: Without bending elbows, pull shoulder blades down into your back pockets.',
      'Phase 3 — 2-Second Top Hold: Hold elevated scapular contraction for 2 full seconds.',
      'Phase 4 — Controlled Descent: Slowly lower back to relaxed dead hang over 2 seconds; perform 8 reps.'
    ]
  },
  {
    id: 'w_upper_b_2',
    name: 'Indian Club Shoulder Spirals & Casts',
    targetDurationOrReps: '2 sets x 10 circles / side',
    creatorAttribution: 'Marcus Filly & Athlean-X Priming',
    equipment: 'indian_clubs',
    biomechanicalPurpose: 'Prime rotational mobility and warm up rotator cuff musculature with 2 lb or 5 lb clubs.',
    coachingNotes: 'Large, fluid circles moving over and behind the head.',
    setupInstructions: [
      'Phase 1 — Club Grip: Hold 2 lb or 5 lb Indian clubs with thumbs along handle taper; soften knees.',
      'Phase 2 — Transverse Overhead Spiral: Swing club in broad overhead spiral behind neck and back.',
      'Phase 3 — Scapular Coordination: Flow through shoulder natural scapular plane with steady nasal breathing.',
      'Phase 4 — Bilateral Symmetry: Complete 10 fluid circles per direction to lubricate rotator cuff tendons.'
    ]
  },
  {
    id: 'w_upper_b_3',
    name: 'Scapular Wall Slides + 360 Brace',
    targetDurationOrReps: '2 sets x 10 reps',
    creatorAttribution: 'Dr. Aaron Horschig (Squat University)',
    equipment: 'bodyweight',
    biomechanicalPurpose: 'Back flat against wall, slide arms from "W" to "Y" while maintaining contact and core brace, testing thoracic extension without lumbar arching.',
    coachingNotes: 'Do not allow ribs to flare up or lower back to leave wall.',
    setupInstructions: [
      'Phase 1 — Wall Stance Setup: Stand with heels 6" from wall; buttocks, upper back, and head flush with wall.',
      'Phase 2 — 360° Cylinder Lock: Inhale and brace abdominal wall, flattening lumbar spine completely against wall.',
      'Phase 3 — "W" Arm Position: Pin backs of hands, wrists, and elbows flat against wall in "W" shape.',
      'Phase 4 — Overhead Slide to "Y": Slowly slide forearms upward into "Y" position over 3 seconds.',
      'Phase 5 — 2-Second Peak Reach: Upwardly rotate shoulder blades at top without letting lower back arch.'
    ]
  }
];

export const SESSION_UPPER_B: WorkoutSession = {
  id: 'upper_b',
  title: 'Upper B',
  subtitle: 'Vertical Push/Pull & Functional Calisthenics',
  focus: 'Scapular plane vertical pressing, strict calisthenic pulling progressions, tendon collagen remodeling, and core compression.',
  estimatedDurationMinutes: 50,
  creatorInfluences: ['Yellow Dude', 'Marcus Filly', 'Jeff Cavaliere (ATHLEAN-X)', 'Dr. Aaron Horschig', 'Lucas Hardie (Range of Strength)', 'Derek (More Plates More Dates)'],
  equipmentRequired: ['pull_up_bar', 'indian_clubs', 'barbell', 'rack', 'kettlebell'],
  warmup: UPPER_B_WARMUP,
  warmupSequence: UPPER_B_WARMUP,
  exercises: [
    {
      id: 't1_bb_ohp',
      name: 'Barbell Overhead Press (OHP)',
      tier: 'T1',
      targetSets: 5,
      targetReps: '3',
      isAmrapLastSet: true,
      tempo: '30X1',
      restSeconds: 180,
      equipment: 'barbell',
      defaultWeight: 95,
      defaultWeightLbs: 95,
      muscleGroups: ['Anterior Deltoid', 'Lateral Deltoid', 'Triceps', 'Upper Pectoralis', 'Core'],
      biomechanicalRationale: 'Primary vertical pressing foundation. Pressing in the scapular plane (elbows 30° forward) prevents glenohumeral impingement while full lockout includes active scapular upward rotation.',
      progressionRule: 'Add 5 lbs weekly. When < 15 total reps: Stage 2 = 6x2+; Stage 3 = 10x1+; then test & reset.',
      regression: {
        condition: 'Shoulder impingement or inability to clear overhead without lumbar hyperextension',
        exerciseId: 't1_kb_half_kneeling_press',
        name: 'Half-Kneeling Single-Arm Kettlebell Press',
        instructions: 'Kneel with the pressing-side knee down and the bell in the rack. Press up and slightly forward in the scapular plane; the half-kneeling stance locks the ribs down and a single arm lets the shoulder find a pain-free path.',
        tempo: '30X1'
      }
    },
    {
      id: 't2_pullup_ladders',
      name: 'Pull-Up Ladder Progression & Negatives',
      tier: 'T2',
      targetSets: 3,
      targetReps: '1-2-3 ladders',
      isAmrapLastSet: false,
      tempo: '30X1',
      restSeconds: 120,
      equipment: 'pull_up_bar',
      muscleGroups: ['Latissimus Dorsi', 'Biceps Brachii', 'Brachialis', 'Lower Trapezius'],
      biomechanicalRationale: 'Yellow Dude tendon remodeling protocol: submaximal volume ladders avoid CNS failure, while strict 4-second eccentric negatives trigger tenocyte collagen synthesis.',
      progressionRule: 'Master Gate 3 (3x5 4s negatives) before unassisted Gate 4 ladders (1-2-3 rounds). When 4 rounds complete with 0 form breakdown, add kettlebell dip belt.',
      regression: {
        condition: 'Unable to perform 1 strict unassisted pull-up',
        exerciseId: 't2_inverted_bb_row',
        name: 'Inverted Barbell Rows in Rack',
        instructions: 'Set barbell at waist height in rack. Hang underneath with heels on floor and body rigid in plank. Pull chest to bar with 3s eccentric lowering.',
        tempo: '3011'
      }
    },
    {
      id: 't3_filly_kb_z_press',
      name: 'Marcus Filly Single-Arm Kettlebell Z-Press',
      tier: 'T3',
      targetSets: 3,
      targetReps: '8–10',
      isAmrapLastSet: false,
      tempo: '30X1',
      restSeconds: 60,
      equipment: 'kettlebell',
      defaultWeight: 25,
      defaultWeightLbs: 25,
      muscleGroups: ['Deltoids', 'Triceps', 'Upper Back', 'Core / Hip Flexors'],
      biomechanicalRationale: 'Functional Bodybuilding staple. Sitting on floor with legs in V removes any lower-body drive or back arch, enforcing strict thoracic extension, core compression, and pure shoulder stability.',
      progressionRule: 'Increase kettlebell load once 3x10 strict reps/arm completed without torso wobble.'
    },
    {
      id: 't3_yellow_dude_lsit',
      name: 'Yellow Dude L-Sit Compression Holds',
      tier: 'T3',
      targetSets: 3,
      targetReps: '15–25s',
      isAmrapLastSet: false,
      tempo: 'Isometric Hold',
      restSeconds: 60,
      equipment: 'pull_up_bar',
      muscleGroups: ['Rectus Abdominis', 'Iliopsoas', 'Quadriceps', 'Serratus Anterior'],
      biomechanicalRationale: 'Connective tissue and core compression gate. Performed either on floor or hanging from pull-up bar, fortifying hip flexor-abdominal coordination.',
      progressionRule: 'Tuck L-sit (15s) -> Single-leg extended (20s) -> Full L-sit (25–30s).'
    },
    {
      id: 't3_kb_arm_superset',
      name: 'Kettlebell Hammer Curl + Overhead Triceps Extension Superset',
      tier: 'T3',
      targetSets: 3,
      targetReps: '12–15',
      isAmrapLastSet: false,
      tempo: '2011',
      restSeconds: 60,
      equipment: 'kettlebell',
      defaultWeight: 20,
      defaultWeightLbs: 20,
      muscleGroups: ['Brachioradialis', 'Biceps Brachii', 'Triceps Brachii (Long Head)'],
      biomechanicalRationale: 'Fortifies distal biceps and triceps tendons at the elbow joint through controlled multi-angle tension.',
      progressionRule: 'Advance kettlebell weight setting once 15 clean reps achieved across all sets.'
    },
    {
      id: 't3_german_hang_prep',
      name: 'Range of Strength Active Shoulder Extension Hang (German Hang Prep)',
      tier: 'T3',
      targetSets: 2,
      targetReps: '20–30s hold',
      isAmrapLastSet: false,
      tempo: 'Isometric Hold',
      restSeconds: 60,
      equipment: 'pull_up_bar',
      muscleGroups: ['Anterior Deltoid', 'Pectoralis Minor', 'Biceps Brachii (Long Head & Distal Tendon)', 'Latissimus Dorsi'],
      biomechanicalRationale: 'Feat 5 prerequisite: Hanging with hands in shoulder extension (or low bar/rings turn-around) subjects the subacromial anterior capsule, bicep tendon, and pec minor to loaded stretch, triggering tendon collagen synthesis and building absolute immunity to shoulder impingement.',
      progressionRule: 'Advance from feet-assisted bar hang (20s) to fully suspended shoulder extension hang (30–45s).'
    }
  ],
  dailyCoreFinisher: createDailyAbsExercises('upper_b')
};

export const WORKOUT_SESSIONS: WorkoutSession[] = [
  SESSION_LOWER_A,
  SESSION_UPPER_A,
  SESSION_LOWER_B,
  SESSION_UPPER_B,
];

const RUN_WARMUP: WarmupExercise[] = [
  {
    id: 'w_run_1',
    name: 'Squat U Ankle Mobilization & Tripod Rooting',
    targetDurationOrReps: '2 sets x 10 reps / side',
    creatorAttribution: 'Dr. Aaron Horschig (Squat University)',
    equipment: 'bodyweight',
    biomechanicalPurpose: 'Pre-Run Primer: Restores talocrural dorsiflexion and roots the 3-point foot tripod to prevent excessive pronation and knee valgus collapse during ground strike.',
    coachingNotes: 'Drive knee tracking over 2nd toe while keeping heel glued to floor. 2s hold at peak stretch.',
    setupInstructions: [
      'Phase 1 — Stance Setup: Stand or half-kneel with front foot 3–4 inches from wall or post.',
      'Phase 2 — Root Tripod: Press big toe knuckle, pinky toe knuckle, and heel firmly into floor.',
      'Phase 3 — Ankle Glide: Drive knee over 2nd toe with heel pinned down.',
      'Phase 4 — 2s End-Range Hold: Hold end-range dorsiflexion for 2 seconds; repeat 10 reps per side.'
    ]
  },
  {
    id: 'w_run_2',
    name: 'ATG Tibialis Wall Raises',
    targetDurationOrReps: '2 sets x 15 reps',
    tempo: '2011',
    creatorAttribution: 'Ben Patrick (ATG)',
    equipment: 'bodyweight',
    biomechanicalPurpose: 'Pre-Run Primer: Pre-activates the primary anterior decelerator of the lower leg to absorb 3–4x bodyweight ground impact forces and protect the patellar tendon.',
    coachingNotes: 'Keep knees straight against wall, flex toes up hard, pause 1s at top.',
    setupInstructions: [
      'Phase 1 — Wall Lean Setup: Lean back against wall with legs straight and heels 12–18" out.',
      'Phase 2 — Dorsiflexion Pull: Pull toes and balls of feet up toward shins as high as possible.',
      'Phase 3 — 1-Second Tibialis Squeeze: Hold top contraction for 1 second, burning the tibialis anterior.',
      'Phase 4 — Controlled Lowering: Lower slowly over 2 seconds; complete 15 reps to prepare for ground impact.'
    ]
  },
  {
    id: 'w_run_3',
    name: 'Dr. Alyssa Lu Glute Medius & Pelvic Leveling',
    targetDurationOrReps: '2 sets x 10 reps / side',
    creatorAttribution: 'Dr. Alyssa Lu (Proformance)',
    equipment: 'bodyweight',
    biomechanicalPurpose: 'Pre-Run Primer: Stabilizes the pelvis in single-leg stance, eliminating Trendelenburg hip drop and IT band friction syndrome during running gait.',
    coachingNotes: 'Hinge slightly, drive knee outward against isometric hold, squeeze side glute.',
    setupInstructions: [
      'Phase 1 — Single-Leg Stance: Stand on one leg with soft knee and slight athletic hip hinge.',
      'Phase 2 — Pelvic Leveling: Keep pelvis perfectly horizontal without dropping contralateral hip.',
      'Phase 3 — Glute Medius Hold: Squeeze lateral glute to stabilize stance for 2 seconds.',
      'Phase 4 — Alternation: Perform 10 controlled reps per side to eliminate runner IT band friction.'
    ]
  }
];

export const SESSION_RUN: WorkoutSession = {
  id: 'run_conditioning',
  title: 'Run Conditioning',
  subtitle: 'Knee-Friendly Aerobic Base & Recovery Flush',
  focus: 'Zone 2 aerobic base building, patellar tendon protection, backward running, and post-run kinetic chain restoration.',
  estimatedDurationMinutes: 45,
  creatorInfluences: ['Ben Patrick (ATG)', 'Dr. Aaron Horschig', 'Coach Eugene Teo', 'Dr. Alyssa Lu', 'Derek (More Plates More Dates)'],
  equipmentRequired: ['bodyweight', 'rowing_machine'],
  warmup: RUN_WARMUP,
  warmupSequence: RUN_WARMUP,
  exercises: [
    {
      id: 't1_run_zone2',
      name: 'Zone 2 Aerobic Base Run (Mitochondrial Building)',
      tier: 'T1',
      targetSets: 1,
      targetReps: '25–30 min',
      isAmrapLastSet: false,
      tempo: '180 SPM Cadence',
      restSeconds: 180,
      equipment: 'bodyweight',
      muscleGroups: ['Cardiovascular System', 'Soleus', 'Gastrocnemius', 'Quads', 'Glutes'],
      biomechanicalRationale: 'Develops cardiac stroke volume, mitochondrial density, and ground impact tolerance. Strictly maintain conversational nasal breathing to stay within the true aerobic zone.',
      progressionRule: 'Increase running duration by 2–3 minutes weekly while maintaining nasal-only breathing.'
    },
    {
      id: 't2_backward_locomotion',
      name: 'Ben Patrick Backward Locomotion / Backward Running',
      tier: 'T2',
      targetSets: 3,
      targetReps: '3 minutes',
      isAmrapLastSet: false,
      tempo: 'Consistent Cadence',
      restSeconds: 120,
      equipment: 'bodyweight',
      muscleGroups: ['Vastus Medialis Oblique (VMO)', 'Patellar Tendon', 'Tibialis Anterior'],
      biomechanicalRationale: 'Ben Patrick ATG cornerstone: Backward walking and jogging eliminates decelerative braking shear on the patellar tendon while pumping rich blood supply directly into the VMO.',
      progressionRule: 'Increase incline or add 1 minute per set as knee tendon resilience improves.'
    },
    {
      id: 't3_rowing_metabolic_flush',
      name: 'Rowing Machine Active Metabolic Flush',
      tier: 'T3',
      targetSets: 1,
      targetReps: '8–10 min',
      isAmrapLastSet: false,
      tempo: '18–20 SPM',
      restSeconds: 60,
      equipment: 'rowing_machine',
      muscleGroups: ['Posterior Kinetic Chain', 'Hip Extensors', 'Lats'],
      biomechanicalRationale: 'Post-Run Booster: Non-impact cyclical leg drive flushes lower-leg metabolic waste and restores venous return after running impact.',
      progressionRule: 'Maintain smooth, relaxed stroke rate (18–20 SPM) focusing on full hip hinge.'
    },
    {
      id: 't3_atg_couch_stretch_run',
      name: 'Ben Patrick ATG Couch Stretch',
      tier: 'T3',
      targetSets: 2,
      targetReps: '45–60s / side',
      isAmrapLastSet: false,
      tempo: 'Isometric Hold',
      restSeconds: 60,
      equipment: 'bodyweight',
      muscleGroups: ['Rectus Femoris', 'Psoas Major', 'Hip Flexors'],
      biomechanicalRationale: 'Post-Run Booster: Releases chronic rectus femoris and hip flexor tension caused by repetitive forward running strides, decompressing the patellar tendon and lumbar spine.',
      progressionRule: 'Work back knee closer to the wall while maintaining upright vertical torso and glute squeeze.'
    },
    {
      id: 't3_atg_elephant_walk_run',
      name: 'ATG Elephant Walks (Active Reciprocal Lengthening)',
      tier: 'T3',
      targetSets: 2,
      targetReps: '20 reps / leg',
      isAmrapLastSet: false,
      tempo: '2020',
      restSeconds: 60,
      equipment: 'bodyweight',
      muscleGroups: ['Hamstrings', 'Sciatic Nerve Flossing', 'Calves'],
      biomechanicalRationale: 'Post-Run Booster: Active quadriceps contraction reciprocally relaxes tight hamstrings without damaging passive traction.',
      progressionRule: 'Lower hands closer to floor as posterior chain compliance improves.'
    }
  ]
};

const BJJ_WARMUP: WarmupExercise[] = [
  {
    id: 'w_bjj_1',
    name: 'McGill Down-Regulation Diaphragmatic Breathing',
    targetDurationOrReps: '3 minutes (4s Inhale, 7s Exhale)',
    creatorAttribution: 'Dr. Stuart McGill',
    equipment: 'bodyweight',
    biomechanicalPurpose: 'Down-regulates high sympathetic nervous system tone and resets ribcage positioning following intense 1-hour grappling.',
    coachingNotes: 'Lie supine with feet elevated. Inhale 4s through nose, exhale 7s through mouth, releasing all spinal tension.',
    setupInstructions: [
      'Phase 1 — Supine Decompression: Lie flat on back with knees bent or calves elevated on bench.',
      'Phase 2 — 4-Second Nasal Inhale: Inhale 4s through nose, expanding abdomen and lateral ribs 360 degrees.',
      'Phase 3 — 7-Second Mouth Exhale: Exhale smoothly through mouth for 7s, allowing all grappling tension to melt.',
      'Phase 4 — 3-Minute Down-Regulation: Continue rhythm for 3 minutes to activate parasympathetic recovery.'
    ]
  }
];

export const SESSION_POST_BJJ: WorkoutSession = {
  id: 'post_bjj_recovery',
  title: 'Post-BJJ 1-Hr Reset',
  subtitle: 'Spinal Decompression, Cervical Realignment, Grip & Grappler Ab Reset',
  focus: 'Post-grappling cervical retraction, spinal disc decompression, groin/hip opener, forearm synovial flush, and restorative core compression.',
  estimatedDurationMinutes: 20,
  creatorInfluences: ['Dr. Stuart McGill', 'Dr. Alyssa Lu', 'Jeff Cavaliere (ATHLEAN-X)', 'Marcus Filly', 'Lucas Hardie (Range of Strength)', 'Derek (More Plates More Dates)'],
  equipmentRequired: ['pull_up_bar', 'indian_clubs', 'bodyweight'],
  warmup: BJJ_WARMUP,
  warmupSequence: BJJ_WARMUP,
  exercises: [
    {
      id: 't3_bjj_cervical_retraction',
      name: 'Dr. Stuart McGill Cervical Retraction & Chin Tuck',
      tier: 'T3',
      targetSets: 2,
      targetReps: '10 reps (5s hold)',
      isAmrapLastSet: false,
      tempo: '1015',
      restSeconds: 45,
      equipment: 'bodyweight',
      muscleGroups: ['Deep Cervical Flexors (Longus Colli)', 'Suboccipitals', 'Upper Trapezius'],
      biomechanicalRationale: 'Directly counteracts forward head posture, stacking trauma, and cervical compression from guillotines, triangles, and heavy collar ties in BJJ.',
      progressionRule: 'Add gentle overpressure with two fingers on chin for deeper axial elongation.'
    },
    {
      id: 't3_bjj_dead_hang_traction',
      name: 'Active Scapular Overhead Dead Hang Traction',
      tier: 'T3',
      targetSets: 2,
      targetReps: '45–60s hold',
      isAmrapLastSet: false,
      tempo: 'Isometric Hold',
      restSeconds: 60,
      equipment: 'pull_up_bar',
      muscleGroups: ['Thoracolumbar Spine', 'Subacromial Space', 'Forearm Extensors'],
      biomechanicalRationale: 'Bodyweight gravitational traction expands intervertebral disc spaces compressed during ground grappling and guard retention, while gently opening the shoulders.',
      progressionRule: 'Increase hold duration up to 90 seconds of relaxed nasal breathing.'
    },
    {
      id: 't3_bjj_open_book',
      name: 'Thoracic Spine Open-Book Rotations with Positional Reach',
      tier: 'T3',
      targetSets: 2,
      targetReps: '8 reps / side',
      isAmrapLastSet: false,
      tempo: '3012',
      restSeconds: 45,
      equipment: 'bodyweight',
      muscleGroups: ['Thoracic Spine', 'Pectoralis Major/Minor', 'Intercostals'],
      biomechanicalRationale: 'Restores 3-dimensional thoracic rotational mobility locked up during tight defensive framing and closed-guard containment.',
      progressionRule: 'Follow top hand with your gaze and hold end-range rotation for 2 full exhale breaths.'
    },
    {
      id: 't3_bjj_hip_reset',
      name: 'Dr. Alyssa Lu 90/90 Hip Reset & Groin Adductor Release',
      tier: 'T3',
      targetSets: 2,
      targetReps: '5 deep breath cycles / side',
      isAmrapLastSet: false,
      tempo: 'Positional Resets',
      restSeconds: 45,
      equipment: 'bodyweight',
      muscleGroups: ['Adductors', 'Psoas Major', 'Piriformis', 'Pelvic Floor'],
      biomechanicalRationale: 'Relieves hypertonic groin adductors and deep hip rotators fatigued from sustained guard clamping, restoring neutral pelvic alignment.',
      progressionRule: 'Focus on full 360-degree abdominal expansion during nasal inhales.'
    },
    {
      id: 't3_bjj_club_grip_flush',
      name: 'Indian Club Synovial Wrist & Forearm Flush',
      tier: 'T3',
      targetSets: 2,
      targetReps: '15 circles / casts / arm',
      isAmrapLastSet: false,
      tempo: '2020',
      restSeconds: 45,
      equipment: 'indian_clubs',
      muscleGroups: ['Forearm Flexors & Extensors', 'Rotator Cuff', 'Carpal Tunnel'],
      biomechanicalRationale: 'Light centrifugal movement (2 lb Indian clubs) stimulates synovial fluid flow and flushes ischemic lactic acid from forearms fatigued by intense gi grips.',
      progressionRule: 'Focus on fluid, effortless circles without gripping the club tightly.'
    },
    {
      id: 't3_bjj_hanging_knee_raise',
      baseExerciseId: 't3_athlean_hanging_knee_raise',
      name: 'Athlean-X Post-Grappling Hanging Knee Raise & Pelvic Decompression',
      tier: 'T3',
      targetSets: 3,
      targetReps: '10–12',
      isAmrapLastSet: false,
      tempo: '2112',
      restSeconds: 45,
      equipment: 'pull_up_bar',
      muscleGroups: ['Lower Rectus Abdominis', 'Iliopsoas', 'Transversus Abdominis', 'Forearms'],
      biomechanicalRationale: 'Jeff Cavaliere Kinetic Sequence Step 1: Bottom-Up vector combined with gravitational overhead traction. Curling the pelvis upward into posterior tilt engages the lower rectus abdominis while opening compressed lumbar discs from ground guard play, without allowing the psoas to hyperextend the lumbar spine.',
      progressionRule: 'Master 3x12 knees-to-chest with 2s hold at peak posterior pelvic tilt before progressing to straight-leg hanging raises.',
      regression: {
        condition: 'Grip fatigue, shoulder discomfort, or lower back arching',
        exerciseId: 't3_bjj_reverse_pelvic_curl',
        name: 'Athlean-X Lying Reverse Pelvic Curls on Floor',
        instructions: 'Lie supine on floor, hands flat or gripping rack base. Curl knees toward chest and actively elevate pelvis 2–3 inches off floor. Do NOT swing legs.',
        tempo: '2112'
      }
    },
    {
      id: 't3_bjj_hollow_body_hold',
      baseExerciseId: 't3_athlean_hollow_body_hold',
      name: 'Athlean-X Grappler Hollow Body Core Compression Hold',
      tier: 'T3',
      targetSets: 3,
      targetReps: '25–35s',
      isAmrapLastSet: false,
      tempo: 'Isometric Hold',
      restSeconds: 45,
      equipment: 'bodyweight',
      muscleGroups: ['Rectus Abdominis', 'Transversus Abdominis', 'Hip Flexors', 'Quadriceps'],
      biomechanicalRationale: 'Jeff Cavaliere & Yellow Dude Core Compression: Mid-Range Anti-Extension. Clamps the lumbar spine flush against the floor with zero air gap, re-centering pelvic alignment and rebuilding 360-degree cylindrical intra-abdominal pressure after ground fighting.',
      progressionRule: 'Build from bent-knee tuck hollow hold (20s) to full straight-arm, straight-leg hollow hold (45s).'
    },
    {
      id: 't3_bjj_cross_mountain_climber',
      baseExerciseId: 't3_athlean_cross_mountain_climber',
      name: 'Athlean-X Cross-Body Oblique Climbers & Serratus Punch',
      tier: 'T3',
      targetSets: 3,
      targetReps: '15–20 / side',
      isAmrapLastSet: false,
      tempo: '2011',
      restSeconds: 45,
      equipment: 'bodyweight',
      muscleGroups: ['External Obliques', 'Internal Obliques', 'Serratus Anterior', 'Core Stabilizers'],
      biomechanicalRationale: 'Jeff Cavaliere Kinetic Sequence Step 4: Top-Down Rotational. From a push-up plank, driving the opposite knee across the torso toward the opposite elbow rotates the ribcage on a stable pelvis. Unwinds asymmetric rotational torque incurred during guard passing, kimura grips, and hip escapes.',
      progressionRule: 'Ensure a deliberate 1-second squeeze at the cross-over peak rather than rushing reps. Progress from 15 to 20 reps/side.'
    },
    {
      id: 't3_bjj_mcgill_curl_up',
      baseExerciseId: 't3_athlean_iso_crunch',
      name: 'Dr. Stuart McGill Post-Grappling Isometric Curl-Up & Vacuum Brace',
      tier: 'T3',
      targetSets: 3,
      targetReps: '10–12 (3s hold)',
      isAmrapLastSet: false,
      tempo: '1311',
      restSeconds: 45,
      equipment: 'bodyweight',
      muscleGroups: ['Upper Rectus Abdominis', 'Transversus Abdominis', 'Deep Core Cylinder'],
      biomechanicalRationale: 'Dr. Stuart McGill spinal-sparing gold standard. One knee bent, hands supporting under the lumbar lordosis to preserve neutral spine while elevating the head and shoulders as a single rigid unit. Delivers maximum rectus abdominis motor recruitment with zero disc shear force.',
      progressionRule: 'Hold each rep for 3–5 seconds with full diaphragmatic exhalation and abdominal bracing.'
    },
    {
      id: 't3_bjj_back_bridge_extension',
      name: 'Range of Strength Back Bridge & Thoracic Extension Arc',
      tier: 'T3',
      targetSets: 2,
      targetReps: '20–30s hold',
      isAmrapLastSet: false,
      tempo: 'Isometric Arc',
      restSeconds: 45,
      equipment: 'bodyweight',
      muscleGroups: ['Spinal Extensors (Erector Spinae)', 'Thoracic Spine', 'Gluteus Maximus', 'Pectorals & Anterior Deltoids'],
      biomechanicalRationale: 'Lucas Hardie Range of Strength "Knees-over-toes for the lower back". Counterbalances violent spinal flexion from hours of grappling by smoothly distributing active spinal extension across the entire vertebral column, expanding the ribcage and restoring hip extension.',
      progressionRule: 'Master feet-elevated or tabletop bridge before progressing to full floor wheel back bridge.',
      regression: {
        condition: 'Wrist discomfort, excessive lumbar pinching, or tight shoulders',
        exerciseId: 't3_bjj_tabletop_bridge',
        name: 'Range of Strength Reverse Tabletop Glute Bridge',
        instructions: 'Hands behind hips on floor, fingers pointing backward. Press through heels and hands to drive hips toward ceiling, creating a flat tabletop torso with neutral neck.',
        tempo: 'Isometric Arc'
      }
    },
    {
      id: 't3_bjj_downregulation_electrolytes',
      name: 'Derek (MPMD) Down-Regulation Breathing & Electrolyte Hydration Protocol',
      tier: 'T3',
      targetSets: 1,
      targetReps: '3–5 min nasal box breathing',
      isAmrapLastSet: false,
      tempo: '4040 Box Breath',
      restSeconds: 0,
      equipment: 'bodyweight',
      muscleGroups: ['Autonomic Nervous System (Parasympathetic Switch)', 'Diaphragm', 'Heart Rate Variability (HRV)'],
      biomechanicalRationale: 'Derek (More Plates More Dates) post-grappling endocrine & systemic reset. High-sweat combat sports cause massive sodium/potassium electrolyte loss and prolonged sympathetic nervous overdrive. 5-minute slow nasal box breathing (4s in, 4s hold, 4s out, 4s hold) accelerates parasympathetic tone and cortisol clearance while rehydrating with 500-1000mg sodium and potassium.',
      progressionRule: 'Lie flat on back with legs elevated on bench or wall. Inhale 4s through nose, hold 4s, exhale 4s smoothly, hold 4s empty.'
    }
  ]
};

const DAILY_ABS_WARMUP: WarmupExercise[] = [
  {
    id: 'w_abs_1',
    name: 'Dr. Stuart McGill Cat-Camel Spinal Wave',
    targetDurationOrReps: '2 sets x 6 slow cycles',
    tempo: '4040',
    creatorAttribution: 'Dr. Stuart McGill',
    equipment: 'bodyweight',
    biomechanicalPurpose: 'Gently articulates the entire spinal column through flexion and extension without external load. Flushes synovial fluid across intervertebral disc spaces, reducing internal disc shear before core contraction.',
    coachingNotes: 'Slow, fluid motion: 4s gentle arch up, 4s smooth sag down. Move only within pain-free active range without forcing end ranges.',
    setupInstructions: [
      'Phase 1 — Quadruped Base: Position hands directly under shoulders and knees directly under hips; spine neutral.',
      'Phase 2 — Cat Wave (Flexion): Slowly arch your back upward toward ceiling over 4 seconds, head relaxed.',
      'Phase 3 — Camel Wave (Extension): Slowly articulate spine in opposite direction over 4 seconds with gentle sag.',
      'Phase 4 — Fluid Articulation: Complete 6 slow cycles moving only through comfortable, pain-free range of motion.'
    ]
  },
  {
    id: 'w_abs_2',
    name: 'Athlean-X 90/90 Diaphragmatic Vacuum Breath',
    targetDurationOrReps: '2 sets x 5 deep breath cycles',
    creatorAttribution: 'Jeff Cavaliere (ATHLEAN-X)',
    equipment: 'bodyweight',
    biomechanicalPurpose: 'Forces full, active exhalation to recruit the deep transversus abdominis. Establishing 360° intra-abdominal pressure (IAP) creates the natural weight-belt cylinder needed for safe daily core training.',
    coachingNotes: 'Inhale 4s through nose expanding belly 360°. Exhale forcefully through mouth for 7–8s until lungs are completely empty. Pull belly button toward spine and hold 3s.',
    setupInstructions: [
      'Phase 1 — 90/90 Supine Setup: Lie flat on back with calves resting on a workout bench or chair with knees and hips at 90 degrees.',
      'Phase 2 — 360° Nasal Inhale: Inhale deeply through nose for 4 seconds, expanding belly, sides, and lower back 360 degrees.',
      'Phase 3 — Full Forced Exhale: Blow out through pursed lips for 7–8 seconds until every drop of air has vacated lungs.',
      'Phase 4 — Transversus Vacuum: Pull navel down toward spine, creating a vacuum tuck; hold for 3 seconds; repeat 5 breath cycles.'
    ]
  }
];

export const SESSION_DAILY_ABS: WorkoutSession = {
  id: 'daily_abs',
  title: 'Athlean-X Daily Abs',
  subtitle: 'Kinetic Chain 6-Minute Core Progression',
  focus: 'Daily bottom-up, rotational, top-down, and transverse abdominis core sequence based on Jeff Cavaliere\'s biomechanical ordering and Dr. Stuart McGill\'s spinal sparing principles.',
  estimatedDurationMinutes: 10,
  creatorInfluences: ['Jeff Cavaliere (ATHLEAN-X)', 'Dr. Stuart McGill', 'Yellow Dude'],
  equipmentRequired: ['pull_up_bar', 'bodyweight', 'kettlebell'],
  warmup: DAILY_ABS_WARMUP,
  warmupSequence: DAILY_ABS_WARMUP,
  exercises: ATHLEAN_DAILY_ABS_CORE_EXERCISES,
};

export const CORE_SESSIONS: WorkoutSession[] = [
  SESSION_DAILY_ABS
];

export const RECOVERY_SESSIONS: WorkoutSession[] = [
  SESSION_RUN,
  SESSION_POST_BJJ
];

export const ALL_SESSIONS: WorkoutSession[] = [
  ...WORKOUT_SESSIONS,
  ...RECOVERY_SESSIONS
];

export const ALL_APP_SESSIONS: WorkoutSession[] = [
  ...WORKOUT_SESSIONS,
  ...RECOVERY_SESSIONS,
  ...CORE_SESSIONS
];

export const WORKOUT_PROGRAM: Record<string, WorkoutSession> = {
  lower_a: SESSION_LOWER_A,
  upper_a: SESSION_UPPER_A,
  lower_b: SESSION_LOWER_B,
  upper_b: SESSION_UPPER_B,
  run_conditioning: SESSION_RUN,
  post_bjj_recovery: SESSION_POST_BJJ,
  daily_abs: SESSION_DAILY_ABS,
};
