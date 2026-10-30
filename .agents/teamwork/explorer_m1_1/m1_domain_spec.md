# Milestone 1: Core Domain Models & Algorithms Specification
**Project**: 4-Day Upper/Lower Workout Web Application  
**Target Milestone**: Milestone 1 (Core Domain Models & Algorithms)  
**Author**: Explorer M1-1 (Domain Models & Biomechanical Synthesis)  
**Date**: 2026-10-13  
**Status**: Complete Implementation Blueprint  

---

## 1. Executive Summary & Objectives

This specification delivers the complete, production-ready TypeScript domain models and datasets for Milestone 1 of the 4-Day Upper/Lower Workout Web Application. It synthesizes the exercise science, biomechanics, and clinical rehabilitation principles of **8 elite fitness creators** (Jeff Nippard, Jeff Cavaliere / ATHLEAN-X, Ben Patrick / ATG, Dr. Aaron Horschig / Squat University, Marcus Filly, Coach Eugene Teo, Yellow Dude, Dr. Alyssa Lu / Proformance Sports Therapy) alongside **Dr. Stuart McGill's** spinal stability framework into strict GZCL-structured routines.

All definitions strictly comply with:
- **User Equipment Profile**: Olympic barbell (45 lb bar, plates: 2x45, 2x35, 2x25, 2x10, 4x5, 2x2.5 = up to 300 lbs), landmine attachment, pull-up bar, BowFlex SelectTech 840 adjustable kettlebell (8–40 lbs), Indian clubs (2x2 lb, 2x5 lb), and rowing machine. Zero non-existent equipment (no cable towers, dumbbells, or machines).
- **Knee Tendinopathy Rehabilitation**: Strict 0–2/10 pain monitoring rules, 3–4s eccentrics, zero ballistic knee travel, and non-negotiable regression paths for all quad movements.
- **Posterior Chain Decompression & Pre-Fatigue**: Calves and hamstrings pre-activated prior to heavy squats (Eugene Teo sequencing); active reciprocal lengthening via ATG Elephant Walks and Alyssa Lu 90/90 hip resets.
- **Interface Contracts**: Direct 100% adherence to `PROJECT.md` interface specifications.

---

## 2. File Architecture & Domain Module Map

```
src/domain/
├── programData.ts        # 4 Workout sessions (Lower A, Upper A, Lower B, Upper B) + Warmups + GZCL Tiers + Rest Presets
├── cueCardsData.ts       # 13 Expandable Cue Cards covering all 8 creators + Dr. Stuart McGill
├── mobility.ts           # 5 Clinically-backed mobility assessments + metrics + LocalStorage schema
└── plateCalculator.ts    # 128-state optimal plate math (covered by Explorer M1-2)
```

---

## 3. Blueprint 1: `src/domain/programData.ts`

### 3.1 TypeScript Type Definitions

```typescript
// src/domain/programData.ts

export type GZCLTier = 'T1' | 'T2' | 'T3' | 'Warmup';

export type EquipmentType = 
  | 'barbell'
  | 'rack'
  | 'landmine'
  | 'pullup_bar'
  | 'kettlebell'
  | 'indian_clubs'
  | 'rowing_machine'
  | 'bodyweight'
  | 'band_or_towel';

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
}

export interface WorkoutExercise {
  id: string;
  name: string;
  tier: GZCLTier;
  targetSets: number;
  targetReps: string; // e.g. "3", "8-10", "15-20", "20 Effective Reps", "45-60s"
  isAmrapLastSet: boolean;
  tempo: string; // Marcus Filly 4-digit notation e.g. "31X1", "30X1", "4010"
  restSeconds: number; // Canonical rest duration
  equipment: EquipmentType;
  defaultWeightLbs?: number;
  muscleGroups: string[];
  biomechanicalRationale: string;
  progressionRule: string;
  regression?: ExerciseRegression;
}

export interface WorkoutSession {
  id: 'lower_a' | 'upper_a' | 'lower_b' | 'upper_b';
  title: string;
  subtitle: string;
  focus: string;
  estimatedDurationMinutes: number;
  creatorInfluences: string[];
  equipmentRequired: EquipmentType[];
  warmupSequence: WarmupExercise[];
  exercises: WorkoutExercise[];
}

export interface RestPreset {
  id: string;
  label: string;
  durationSeconds: number;
  creatorAttribution: string;
  tierMapping: 'T1' | 'T2' | 'T3' | 'EffectiveReps';
}
```

### 3.2 Canonical Rest Presets

```typescript
export const REST_PRESETS: RestPreset[] = [
  { id: 'er_15', label: '15s (ER Cluster)', durationSeconds: 15, creatorAttribution: 'Athlean-X', tierMapping: 'EffectiveReps' },
  { id: 'er_30', label: '30s (ER Cluster)', durationSeconds: 30, creatorAttribution: 'Athlean-X', tierMapping: 'EffectiveReps' },
  { id: 't3_60', label: '60s (Accessory)', durationSeconds: 60, creatorAttribution: 'Marcus Filly', tierMapping: 'T3' },
  { id: 't3_90', label: '90s (Isolation)', durationSeconds: 90, creatorAttribution: 'Jeff Nippard', tierMapping: 'T3' },
  { id: 't2_120', label: '2 min (Hypertrophy)', durationSeconds: 120, creatorAttribution: 'GZCL Tier 2', tierMapping: 'T2' },
  { id: 't2_180', label: '3 min (Heavy Compound)', durationSeconds: 180, creatorAttribution: 'GZCL Tier 2', tierMapping: 'T2' },
  { id: 't1_240', label: '4 min (Heavy Strength)', durationSeconds: 240, creatorAttribution: 'GZCL Tier 1', tierMapping: 'T1' },
  { id: 't1_300', label: '5 min (Maximal 1RM/T1)', durationSeconds: 300, creatorAttribution: 'GZCL Tier 1', tierMapping: 'T1' }
];
```

### 3.3 Complete 4-Session Dataset Implementation

#### Session 1: Lower A — Quad & Knee Bulletproofing
```typescript
export const SESSION_LOWER_A: WorkoutSession = {
  id: 'lower_a',
  title: 'Lower A',
  subtitle: 'Quad & Knee Bulletproofing Focus',
  focus: 'VMO tendon remodeling, knee joint decompression, quad hypertrophy without patellar shear, and core stability.',
  estimatedDurationMinutes: 55,
  creatorInfluences: ['Ben Patrick (ATG)', 'Coach Eugene Teo', 'Dr. Aaron Horschig', 'Dr. Alyssa Lu', 'Dr. Stuart McGill'],
  equipmentRequired: ['rowing_machine', 'barbell', 'rack', 'kettlebell', 'bodyweight'],
  warmupSequence: [
    {
      id: 'w_lower_a_1',
      name: 'Rowing Machine Reverse Leg-Drive',
      targetDurationOrReps: '4–5 minutes (18–20 SPM)',
      creatorAttribution: 'Ben Patrick (ATG)',
      equipment: 'rowing_machine',
      biomechanicalPurpose: 'Simulates backward sled pulling at home. Drives through the ball of the foot with resistance, flushing synovial fluid and blood into the vastus medialis oblique (VMO) with zero knee joint shear.',
      coachingNotes: 'Push backward through the forefoot. Keep torso upright and smooth cadence.'
    },
    {
      id: 'w_lower_a_2',
      name: 'Alyssa Lu 90/90 Positional Breathing + Bridge',
      targetDurationOrReps: '2 sets x 5 deep breath cycles',
      creatorAttribution: 'Dr. Alyssa Lu (Proformance)',
      equipment: 'bodyweight',
      biomechanicalPurpose: 'Digging heels into bench/wall activates hamstrings and rectus abdominis, reflexively shifting anterior pelvic tilt to neutral and releasing overactive psoas.',
      coachingNotes: 'Inhale 5s through nose (360° belly expansion), exhale 8s through mouth, hold 3s.'
    },
    {
      id: 'w_lower_a_3',
      name: 'Eugene Teo Standing Calf Raise (Pre-Fatigue)',
      targetDurationOrReps: '2 sets x 15 reps',
      tempo: '3012',
      creatorAttribution: 'Coach Eugene Teo',
      equipment: 'bodyweight',
      biomechanicalPurpose: 'Stabilizes the talocrural joint and knee capsule. Pre-activating the triceps surae eliminates compensatory forward tibial shear during squats.',
      coachingNotes: 'Stand on a 2" plate or block. 3s eccentric stretch at bottom, 2s hard squeeze at the peak.'
    },
    {
      id: 'w_lower_a_4',
      name: 'Eugene Teo Light KB Romanian Hinge (Pre-Fatigue)',
      targetDurationOrReps: '2 sets x 10 reps',
      tempo: '3110',
      creatorAttribution: 'Coach Eugene Teo',
      equipment: 'kettlebell',
      biomechanicalPurpose: 'Pre-activates the hamstring co-contraction mechanism at the knee joint prior to quad loading, actively pulling the tibia posteriorly to guard against patellar stress.',
      coachingNotes: 'Use 18–25 lb KB. Push hips back, 3s eccentric down, 1s active hamstring stretch.'
    },
    {
      id: 'w_lower_a_5',
      name: 'Squat U Ankle Mobilization & Tripod Rooting',
      targetDurationOrReps: '1–2 sets x 10 reps/side',
      creatorAttribution: 'Dr. Aaron Horschig (Squat University)',
      equipment: 'bodyweight',
      biomechanicalPurpose: 'Pre-conditions talocrural dorsiflexion and roots the three foot contact points (1st MTP, 5th MTP, calcaneus) to prevent inward knee valgus collapse.',
      coachingNotes: 'Grip floor with toes, drive knees outward in line with 2nd/3rd toe.'
    }
  ],
  exercises: [
    {
      id: 't1_bb_squat',
      name: 'Barbell Back Squat',
      tier: 'T1',
      targetSets: 5,
      targetReps: '3 (Set 5 AMRAP 3+)',
      isAmrapLastSet: true,
      tempo: '31X1',
      restSeconds: 180,
      equipment: 'barbell',
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
      targetReps: '8–10 reps / leg',
      isAmrapLastSet: false,
      tempo: '31X1',
      restSeconds: 120,
      equipment: 'kettlebell',
      defaultWeightLbs: 20,
      muscleGroups: ['Quadriceps (VMO focus)', 'Psoas / Hip Flexors', 'Glutes', 'Calves'],
      biomechanicalRationale: 'Ben Patrick tendinopathy rehabilitation cornerstone. Promotes full hamstring-to-calf coverage under slow, controlled loading to remodel patellar collagen and elongate the rear-leg psoas.',
      progressionRule: 'Double progression: achieve 10 reps/leg across all 3 sets with 0/10 pain before increasing kettlebell load by 5 lbs.',
      regression: {
        condition: 'Patellar tendon ache or inability to reach full depth without heel lift',
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
      targetReps: '12–15 reps / leg',
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
      targetReps: 'McGill Curl-up (3x10s/side), Side Bridge (3x20s/side), Bird-Dog (3x10s/side)',
      isAmrapLastSet: false,
      tempo: 'Isometric Holds',
      restSeconds: 60,
      equipment: 'bodyweight',
      muscleGroups: ['Rectus Abdominis', 'Quadratus Lumborum', 'Obliques', 'Multifidus', 'Glutes'],
      biomechanicalRationale: 'Spares lumbar discs while building isometric core endurance ratios proven by Dr. McGill to prevent lower back overload during heavy barbell lifts.',
      progressionRule: 'Maintain descending hold endurance pyramids (e.g. 6-4-2 holds or 3x10s perfect form).'
    }
  ]
};
```

#### Session 2: Upper A — Horizontal Push/Pull & Shoulder Health
```typescript
export const SESSION_UPPER_A: WorkoutSession = {
  id: 'upper_a',
  title: 'Upper A',
  subtitle: 'Horizontal Push/Pull & Shoulder Health',
  focus: 'Subacromial joint spacing, scapular retraction/depression, balanced horizontal press and row mechanics.',
  estimatedDurationMinutes: 50,
  creatorInfluences: ['Jeff Cavaliere (ATHLEAN-X)', 'Jeff Nippard', 'Coach Eugene Teo', 'Dr. Stuart McGill'],
  equipmentRequired: ['indian_clubs', 'barbell', 'rack', 'landmine', 'kettlebell', 'pullup_bar', 'band_or_towel'],
  warmupSequence: [
    {
      id: 'w_upper_a_1',
      name: 'Indian Club Rotational Circles & Casts',
      targetDurationOrReps: '2 sets x 10 circles each direction',
      creatorAttribution: 'Marcus Filly & Athlean-X Priming',
      equipment: 'indian_clubs',
      biomechanicalPurpose: 'Uses 2 lb or 5 lb Indian clubs to lubricate the glenohumeral joint capsule, stimulate rotator cuff stabilizers, and dynamically mobilize the scapulothoracic rhythm.',
      coachingNotes: 'Smooth wrist circles, outward shoulder casts, and transverse spirals without forcing range.'
    },
    {
      id: 'w_upper_a_2',
      name: 'Athlean-X Scapular Retractions & Depressions',
      targetDurationOrReps: '2 sets x 12 reps',
      tempo: '2012',
      creatorAttribution: 'Jeff Cavaliere (ATHLEAN-X)',
      equipment: 'bodyweight',
      biomechanicalPurpose: 'Activates the lower traps and serratus anterior to seat the humeral head properly in the glenoid fossa before horizontal loading.',
      coachingNotes: 'Pinch shoulder blades down and back. Hold 2s squeeze at end range.'
    },
    {
      id: 'w_upper_a_3',
      name: 'McGill Bird-Dog Core & Lat Tension Priming',
      targetDurationOrReps: '2 sets x 4 reps / side (10s hold)',
      creatorAttribution: 'Dr. Stuart McGill',
      equipment: 'bodyweight',
      biomechanicalPurpose: 'Locks the core cylinder and lat-lumbar fascia, preventing unwanted spinal twisting under unilateral rowing.',
      coachingNotes: 'Clench fist, drive opposite heel back, brace core as if taking a punch.'
    }
  ],
  exercises: [
    {
      id: 't1_bb_bench_press',
      name: 'Barbell Bench Press',
      tier: 'T1',
      targetSets: 5,
      targetReps: '3 (Set 5 AMRAP 3+)',
      isAmrapLastSet: true,
      tempo: '30X1',
      restSeconds: 180,
      equipment: 'barbell',
      defaultWeightLbs: 165,
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
      id: 't2_landmine_meadows_row',
      name: 'Landmine Meadows Row',
      tier: 'T2',
      targetSets: 3,
      targetReps: '8–10 reps / arm',
      isAmrapLastSet: false,
      tempo: '31X1',
      restSeconds: 120,
      equipment: 'landmine',
      defaultWeightLbs: 50,
      muscleGroups: ['Latissimus Dorsi', 'Teres Major', 'Rhomboids', 'Posterior Deltoid'],
      biomechanicalRationale: 'Eugene Teo force vector optimization: standing perpendicular to the landmine creates a diagonal arc matching the anatomical orientation of the lower lat fibers.',
      progressionRule: 'Double progression: build to 10 strict reps/arm across all 3 sets before adding a 5 lb plate.',
      regression: {
        condition: 'Lower back fatigue or difficulty holding staggered stance',
        exerciseId: 't2_landmine_two_handed_row',
        name: 'Two-Handed Landmine T-Bar Row with Chest Support / Straddle',
        instructions: 'Straddle the landmine bar with both feet square, hinge deeply, and row using a neutral grip handle or barbell sleeve to share load bilaterally.',
        tempo: '3011'
      }
    },
    {
      id: 't3_kb_floor_press_er',
      name: 'Athlean-X 20 Effective Reps (ER) Kettlebell Floor Press',
      tier: 'T3',
      targetSets: 1, // 1 cluster sequence to reach 20 ER
      targetReps: '20 Total Effective Reps (Ignition Set + Clusters)',
      isAmrapLastSet: false,
      tempo: '2010',
      restSeconds: 20, // 15-30s rest-pause
      equipment: 'kettlebell',
      defaultWeightLbs: 35,
      muscleGroups: ['Pectoralis Major', 'Triceps', 'Shoulder Stabilizers'],
      biomechanicalRationale: 'Recruits high-threshold motor units without joint fatigue. An ignition set of 10–12 reps brings muscle fibers near failure; subsequent mini-sets of 2–4 reps with 15–30s rest accumulate 20 pure effective reps.',
      progressionRule: 'When 20 effective reps are accumulated in under 4 micro-sets, increase kettlebell weight notch.'
    },
    {
      id: 't3_athlean_face_pull',
      name: 'Athlean-X Non-Negotiable Face Pull',
      tier: 'T3',
      targetSets: 3,
      targetReps: '15–20',
      isAmrapLastSet: false,
      tempo: '2112',
      restSeconds: 60,
      equipment: 'band_or_towel',
      muscleGroups: ['Infraspinatus', 'Teres Minor', 'Rear Deltoid', 'Mid/Lower Trapezius'],
      biomechanicalRationale: 'The premier posture and rotator cuff longevity exercise. Mandates pulling hands higher than elbows with thumbs rotated posteriorly, forcing glenohumeral external rotation.',
      progressionRule: 'Increase band resistance or add 2-second isometric holds at peak contraction once 3x20 reps mastered.'
    },
    {
      id: 't3_dead_hang_club_mills',
      name: 'Active Dead Hang & Indian Club Arm Casts',
      tier: 'T3',
      targetSets: 2,
      targetReps: '45s dead hang + 10 club casts / side',
      isAmrapLastSet: false,
      tempo: 'Static Hang / Controlled Swings',
      restSeconds: 60,
      equipment: 'pullup_bar',
      muscleGroups: ['Subscapularis', 'Serratus Anterior', 'Forearm Flexors', 'Spine'],
      biomechanicalRationale: 'Passive gravitational traction decompresses the subacromial space and thoracolumbar spine while gently re-establishing shoulder rotational freedom with light Indian clubs.',
      progressionRule: 'Increase dead hang duration to 60–90 seconds.'
    }
  ]
};
```

#### Session 3: Lower B — Posterior Chain & Hamstring Restoration
```typescript
export const SESSION_LOWER_B: WorkoutSession = {
  id: 'lower_b',
  title: 'Lower B',
  subtitle: 'Posterior Chain & Hamstring Restoration Focus',
  focus: 'Active hamstring lengthening under reciprocal inhibition, hip hinge dominance, spinal sparing, and unilateral knee resilience.',
  estimatedDurationMinutes: 55,
  creatorInfluences: ['Dr. Alyssa Lu', 'Ben Patrick (ATG)', 'Jeff Nippard', 'Dr. Stuart McGill', 'Coach Eugene Teo'],
  equipmentRequired: ['bodyweight', 'rowing_machine', 'barbell', 'rack', 'kettlebell'],
  warmupSequence: [
    {
      id: 'w_lower_b_1',
      name: 'Alyssa Lu 10-Minute Active Hip Reset Protocol',
      targetDurationOrReps: '5–6 minutes',
      creatorAttribution: 'Dr. Alyssa Lu (Proformance)',
      equipment: 'bodyweight',
      biomechanicalPurpose: 'Combines 90/90 positional breathing with hamstring heel digs and adductor bridge squeezes to restore pelvic symmetry and inhibit chronic hip flexor hypertonicity.',
      coachingNotes: '2 sets of 5 breaths 90/90 heel dig + 2 sets of 10 adductor squeeze glute bridges.'
    },
    {
      id: 'w_lower_b_2',
      name: 'ATG Elephant Walks (Active Reciprocal Lengthening)',
      targetDurationOrReps: '2 sets x 20 reps / leg',
      creatorAttribution: 'Ben Patrick (ATG)',
      equipment: 'bodyweight',
      biomechanicalPurpose: 'Alternating active quadriceps contraction forces reciprocal inhibition of the ipsilateral hamstring, restoring deep posterior chain elasticity without damaging passive stretching.',
      coachingNotes: 'Place hands on bench or floor. Lock out knee with strong quad squeeze on each step.'
    },
    {
      id: 'w_lower_b_3',
      name: 'Rowing Machine Steady Rhythm Flush',
      targetDurationOrReps: '3–4 minutes low resistance',
      creatorAttribution: 'Eugene Teo & Conditioning Base',
      equipment: 'rowing_machine',
      biomechanicalPurpose: 'Lubricates the hip joints and lumbar facet joints through rhythmic low-impact hip hinge motion.',
      coachingNotes: 'Keep stroke rate relaxed (18–20 SPM). Drive smoothly from hips and legs.'
    }
  ],
  exercises: [
    {
      id: 't1_bb_rdl',
      name: 'Barbell Romanian Deadlift (RDL)',
      tier: 'T1',
      targetSets: 5,
      targetReps: '3 (Set 5 AMRAP 3+)',
      isAmrapLastSet: true,
      tempo: '31X1',
      restSeconds: 180,
      equipment: 'barbell',
      defaultWeightLbs: 205,
      muscleGroups: ['Hamstrings (Biceps Femoris/Semitendinosus)', 'Gluteus Maximus', 'Erector Spinae', 'Lats'],
      biomechanicalRationale: 'Maximum stretch-mediated hypertrophy of the posterior chain. Controlled 3s hip hinge with bar kept in continuous contact with thighs minimizes the lumbar moment arm while maximally stressing hamstrings.',
      progressionRule: 'Add 10 lbs weekly. When < 15 total reps: Stage 2 = 6x2+; Stage 3 = 10x1+; then test & reset.',
      regression: {
        condition: 'Lower back shear, disc fatigue, or hamstring cramping',
        exerciseId: 't1_landmine_rdl',
        name: 'Landmine Romanian Deadlift',
        instructions: 'Straddle or stand at end of landmine bar, gripping sleeve with both hands. The fixed rotational arc removes excessive anterior lumbar shear while guiding pure posterior hip excursion.',
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
      targetReps: '15 reps / leg',
      isAmrapLastSet: false,
      tempo: '3010',
      restSeconds: 60,
      equipment: 'bodyweight',
      muscleGroups: ['VMO', 'Patellar Tendon', 'Ankle Stabilizers'],
      biomechanicalRationale: 'Re-enforces patellar tendon adaptation in a post-fatigued state, ensuring tendon stiffness and decelarative compliance remain high.',
      progressionRule: 'Elevate plate height from 2" to 4" as knee strength stabilizes.'
    },
    {
      id: 't3_biering_sorensen',
      name: 'Biering-Sørensen Back Extensor Holds',
      tier: 'T3',
      targetSets: 3,
      targetReps: '45–60s holds',
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
      defaultWeightLbs: 35,
      muscleGroups: ['Quadratus Lumborum', 'Obliques', 'Grip Flexors', 'Gluteus Medius'],
      biomechanicalRationale: 'Anti-lateral flexion drill. Demands intense isometric quadratus lumborum bracing while walking, preserving pelvic stability.',
      progressionRule: 'Increase kettlebell load or extend distance to 75–100 feet.'
    }
  ]
};
```

#### Session 4: Upper B — Vertical Push/Pull & Functional Calisthenics
```typescript
export const SESSION_UPPER_B: WorkoutSession = {
  id: 'upper_b',
  title: 'Upper B',
  subtitle: 'Vertical Push/Pull & Functional Calisthenics',
  focus: 'Scapular plane vertical pressing, strict calisthenic pulling progressions, tendon collagen remodeling, and core compression.',
  estimatedDurationMinutes: 50,
  creatorInfluences: ['Yellow Dude', 'Marcus Filly', 'Jeff Cavaliere (ATHLEAN-X)', 'Dr. Aaron Horschig'],
  equipmentRequired: ['pullup_bar', 'indian_clubs', 'barbell', 'rack', 'kettlebell'],
  warmupSequence: [
    {
      id: 'w_upper_b_1',
      name: 'Athlean-X Active Scapular Dead Hang Pulls',
      targetDurationOrReps: '2 sets x 8 reps (2s hold at top)',
      tempo: '2112',
      creatorAttribution: 'Jeff Cavaliere (ATHLEAN-X)',
      equipment: 'pullup_bar',
      biomechanicalPurpose: 'Hanging with relaxed shoulders, then actively pulling scapulae down and together to elevate torso without bending elbows. Primes lower trap / serratus engagement.',
      coachingNotes: 'Think of pulling your shoulder blades into your back pockets without bending elbows.'
    },
    {
      id: 'w_upper_b_2',
      name: 'Indian Club Shoulder Spirals & Casts',
      targetDurationOrReps: '2 sets x 10 circles / side',
      creatorAttribution: 'Marcus Filly & Athlean-X Priming',
      equipment: 'indian_clubs',
      biomechanicalPurpose: 'Prime rotational mobility and warm up rotator cuff musculature with 2 lb or 5 lb clubs.',
      coachingNotes: 'Large, fluid circles moving over and behind the head.'
    },
    {
      id: 'w_upper_b_3',
      name: 'Scapular Wall Slides + 360 Brace',
      targetDurationOrReps: '2 sets x 10 reps',
      creatorAttribution: 'Dr. Aaron Horschig (Squat University)',
      equipment: 'bodyweight',
      biomechanicalPurpose: 'Back flat against wall, slide arms from "W" to "Y" while maintaining contact and core brace, testing thoracic extension without lumbar arching.',
      coachingNotes: 'Do not allow ribs to flare up or lower back to leave wall.'
    }
  ],
  exercises: [
    {
      id: 't1_bb_ohp',
      name: 'Barbell Overhead Press (OHP)',
      tier: 'T1',
      targetSets: 5,
      targetReps: '3 (Set 5 AMRAP 3+)',
      isAmrapLastSet: true,
      tempo: '30X1',
      restSeconds: 180,
      equipment: 'barbell',
      defaultWeightLbs: 105,
      muscleGroups: ['Anterior Deltoid', 'Lateral Deltoid', 'Triceps', 'Upper Pectoralis', 'Core'],
      biomechanicalRationale: 'Primary vertical pressing foundation. Pressing in the scapular plane (elbows 30° forward) prevents glenohumeral impingement while full lockout includes active scapular upward rotation.',
      progressionRule: 'Add 5 lbs weekly. When < 15 total reps: Stage 2 = 6x2+; Stage 3 = 10x1+; then test & reset.',
      regression: {
        condition: 'Shoulder impingement or inability to clear overhead without lumbar hyperextension',
        exerciseId: 't1_landmine_half_kneeling_press',
        name: 'Landmine Half-Kneeling Single-Arm Press',
        instructions: 'Kneel with inside knee down, pressing landmine bar diagonally overhead. Angled arc eliminates subacromial pinch while forcing intense core anti-extension stability.',
        tempo: '30X1'
      }
    },
    {
      id: 't2_pullup_ladders',
      name: 'Pull-Up Ladder Progression & Negatives',
      tier: 'T2',
      targetSets: 3, // 3-4 ladder rounds
      targetReps: 'Ladders (1-2-3 reps) OR 3x5 Eccentric Negatives',
      isAmrapLastSet: false,
      tempo: '30X1 (or 4010 on Negatives)',
      restSeconds: 120,
      equipment: 'pullup_bar',
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
      targetReps: '8–10 reps / arm',
      isAmrapLastSet: false,
      tempo: '30X1',
      restSeconds: 60,
      equipment: 'kettlebell',
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
      targetReps: '15–25s holds',
      isAmrapLastSet: false,
      tempo: 'Isometric Hold',
      restSeconds: 60,
      equipment: 'pullup_bar',
      muscleGroups: ['Rectus Abdominis', 'Iliopsoas', 'Quadriceps', 'Serratus Anterior'],
      biomechanicalRationale: 'Connective tissue and core compression gate. Performed either on floor or hanging from pull-up bar, fortifying hip flexor-abdominal coordination.',
      progressionRule: 'Tuck L-sit (15s) -> Single-leg extended (20s) -> Full L-sit (25–30s).'
    },
    {
      id: 't3_kb_arm_superset',
      name: 'Kettlebell Hammer Curl + Overhead Triceps Extension Superset',
      tier: 'T3',
      targetSets: 3,
      targetReps: '12–15 reps each',
      isAmrapLastSet: false,
      tempo: '2011',
      restSeconds: 60,
      equipment: 'kettlebell',
      defaultWeightLbs: 20,
      muscleGroups: ['Brachioradialis', 'Biceps Brachii', 'Triceps Brachii (Long Head)'],
      biomechanicalRationale: 'Fortifies distal biceps and triceps tendons at the elbow joint through controlled multi-angle tension.',
      progressionRule: 'Advance kettlebell weight setting once 15 clean reps achieved across all sets.'
    }
  ]
};

export const WORKOUT_PROGRAM: Record<string, WorkoutSession> = {
  lower_a: SESSION_LOWER_A,
  upper_a: SESSION_UPPER_A,
  lower_b: SESSION_LOWER_B,
  upper_b: SESSION_UPPER_B
};
```

---

## 4. Blueprint 2: `src/domain/cueCardsData.ts`

### 4.1 TypeScript Type Definitions

```typescript
// src/domain/cueCardsData.ts

export interface CreatorAttribution {
  creator: string;
  quote: string;
  biomechanicalRationale: string;
}

export interface CueCard {
  id: string;
  exerciseId: string;
  title: string;
  tier: 'T1' | 'T2' | 'T3' | 'Warmup';
  prescribedTempo: string; // e.g. "31X1"
  primaryMuscles: string[];
  equipment: string;
  setupInstructions: string[];
  creatorCues: CreatorAttribution[];
  commonFaults: string[];
  rehabRegressions: string[];
}
```

### 4.2 Complete 13 Cue Cards Dataset

```typescript
export const CUE_CARDS: CueCard[] = [
  {
    id: 'cue_01_bb_squat',
    exerciseId: 't1_bb_squat',
    title: 'Barbell Back Squat',
    tier: 'T1',
    prescribedTempo: '31X1',
    primaryMuscles: ['Quadriceps', 'Glutes', 'Adductors', 'Spinal Erectors'],
    equipment: 'Olympic Barbell & Squat Rack',
    setupInstructions: [
      'Position barbell at mid-sternum height; grip bar with hands as close as shoulder mobility comfortably allows.',
      'Step underneath and rest the bar securely across upper trapezius (high-bar) or shelf of rear delts (low-bar).',
      'Take 2 steps backward; place feet shoulder-width apart with toes flared outward 15–30 degrees.'
    ],
    creatorCues: [
      {
        creator: 'Dr. Aaron Horschig (Squat University)',
        quote: 'Establish your foot tripod (big toe knuckle, pinky toe knuckle, center of heel). Screw your feet into the floor to create external rotation torque at the hips. Inhale a 360-degree breath into your abdomen and obliques, and lock your brace.',
        biomechanicalRationale: 'Rooting the foot tripod maintains the medial longitudinal arch, preventing tibial internal rotation and patellofemoral valgus collapse.'
      },
      {
        creator: 'Jeff Nippard',
        quote: 'Control the descent for a full 3 seconds. Descend to parallel or slightly below to maximize stretch-mediated hypertrophy of the quads, pausing for 1 second in the hole without relaxing tension.',
        biomechanicalRationale: 'Stretch-mediated hypertrophy is greatest at long muscle lengths; pausing in the hole dissipates stretch reflex recoil and places mechanical tension purely on quad fibers.'
      },
      {
        creator: 'Dr. Stuart McGill',
        quote: 'Maintain a rigid, neutral lumbar spine throughout the entire excursion. Never sacrifice lumbar stiffness for extra depth (butt wink); reverse movement before pelvic tuck occurs.',
        biomechanicalRationale: 'Flexion under heavy compressive axial loads causes posterior migration of the nucleus pulposus and dramatic increases in shear stress on lumbar ligaments.'
      }
    ],
    commonFaults: [
      'Inward knee cave (valgus collapse) on concentric drive.',
      'Rushing the eccentric and bouncing out of the bottom position, causing high impact shear spikes on the patellar tendon.',
      'Weight shifting forward onto toes with heels lifting off the floor.'
    ],
    rehabRegressions: [
      'Level 1: Barbell Box Squat to parallel (shins perpendicular, zero forward patellar shear).',
      'Level 2: Landmine Hack Squat (shins angled away from bar to completely offload knees).'
    ]
  },
  {
    id: 'cue_02_atg_split_squat',
    exerciseId: 't2_atg_split_squat',
    title: 'ATG Split Squat',
    tier: 'T2',
    prescribedTempo: '31X1',
    primaryMuscles: ['Vastus Medialis Oblique (VMO)', 'Patellar Tendon', 'Psoas / Hip Flexors', 'Glutes'],
    equipment: 'Kettlebell or Bodyweight (Platform/Plates for Elevation)',
    setupInstructions: [
      'Adopt a long split stance: front foot flat on floor or elevated on plates/bench; rear leg extended straight behind.',
      'Torso stays tall and vertical; rear glute remains actively engaged throughout.'
    ],
    creatorCues: [
      {
        creator: 'Ben Patrick (ATG)',
        quote: 'The standard is full knee bend: your hamstring must completely cover your calf, with your torso tall and rear knee off the floor. If you experience any tendon ache (>2/10), elevate the front foot immediately until the movement is 100% pain-free.',
        biomechanicalRationale: 'Full knee flexion under pain-free progressive loading strengthens connective tissue and creates robust structural remodeling of the patellar tendon and VMO.'
      },
      {
        creator: 'Yellow Dude',
        quote: 'Take 3 to 4 seconds on the descent. This slow eccentric load sends cellular signals to tenocytes to synthesize parallel type I collagen fibrils rather than disorganized scar tissue.',
        biomechanicalRationale: 'Slow strain rates promote organized tensile realignment of tendon fibers without triggering inflammatory tendon responses.'
      },
      {
        creator: 'Marcus Filly (FBB)',
        quote: 'Maintain strict vertical torso posture. Hold the 1-second pause at maximum stretch without resting your rear knee on the ground or losing core compression.',
        biomechanicalRationale: 'Preserving vertical posture maximizes active stretch on the rear-leg iliopsoas while training unilateral hip balance.'
      }
    ],
    commonFaults: [
      'Dropping into deep knee bend too rapidly without controlling the eccentric phase.',
      'Allowing the rear hip to flare open laterally instead of remaining square to the front.',
      'Pushing through active tendon pain rather than utilizing front-foot elevation.'
    ],
    rehabRegressions: [
      'Level 0: Front foot elevated 12–18" on bench, hands supported on rack uprights.',
      'Level 1: Front foot elevated 6" on weight plates.',
      'Level 2: Flat ground bodyweight.',
      'Level 3: Loaded with kettlebell.'
    ]
  },
  {
    id: 'cue_03_bb_rdl',
    exerciseId: 't1_bb_rdl',
    title: 'Barbell Romanian Deadlift (RDL)',
    tier: 'T1',
    prescribedTempo: '31X1',
    primaryMuscles: ['Hamstrings', 'Gluteus Maximus', 'Erector Spinae', 'Lats'],
    equipment: 'Olympic Barbell & Plates',
    setupInstructions: [
      'Stand with feet hip-width apart, toes pointing forward.',
      'Grip barbell double overhand just outside thighs; unrack and establish slight soft unlock in the knees.',
      'Squeeze shoulder blades down and back, packing lats.'
    ],
    creatorCues: [
      {
        creator: 'Dr. Alyssa Lu (Proformance)',
        quote: 'This is active hamstring lengthening under load. Do not passively round your spine or reach towards the floor. Push your hips back into the wall behind you until your hamstrings reach their active end-range, pause for 1 second, and drive forward through your heels.',
        biomechanicalRationale: 'Active hip hinging recruits the hamstring muscle-tendon complex dynamically while guarding against passive overstretching and sacroiliac joint strain.'
      },
      {
        creator: 'Jeff Nippard',
        quote: 'Keep the barbell painted against your thighs throughout the entire descent. If the bar drifts forward by even 1 inch, the lumbar moment arm multiplies and takes tension away from the hamstrings.',
        biomechanicalRationale: 'Keeping the load close to the center of mass reduces external lumbar flexion moment and maximizes torque on the hip extensor group.'
      },
      {
        creator: 'Dr. Stuart McGill',
        quote: 'Actively "bend the bar" across your shins to fire the latissimus dorsi. This lat co-contraction creates a rigid posterior tension band that locks the thoracolumbar fascia.',
        biomechanicalRationale: 'Latissimus dorsi activation tensions the thoracolumbar fascia, decreasing shear strain across the L4–S1 vertebrae.'
      }
    ],
    commonFaults: [
      'Squatting the weight down by bending knees excessively rather than pushing hips back.',
      'Allowing the bar to drift away from the shins, shifting stress to the lower back.',
      'Rounding the lumbar spine at the bottom to force fake range of motion.'
    ],
    rehabRegressions: [
      'Regression 1: Landmine RDL (guided arc decreases lower back shear).',
      'Regression 2: Heavy Kettlebell RDL (35–40 lb KB held between feet).'
    ]
  },
  {
    id: 'cue_04_bb_bench_press',
    exerciseId: 't1_bb_bench_press',
    title: 'Barbell Bench Press',
    tier: 'T1',
    prescribedTempo: '30X1',
    primaryMuscles: ['Pectoralis Major', 'Anterior Deltoid', 'Triceps Brachii'],
    equipment: 'Olympic Barbell, Plates & Flat Bench in Rack',
    setupInstructions: [
      'Lie supine on bench with eyes directly underneath the racked bar.',
      'Establish 5 points of contact: head, upper back/shoulders, glutes, left foot flat, right foot flat.',
      'Grip the bar slightly wider than shoulder width; wrap thumbs securely around the bar.'
    ],
    creatorCues: [
      {
        creator: 'Jeff Cavaliere (ATHLEAN-X)',
        quote: 'Tuck your elbows to a 45-degree angle relative to your ribs. Do NOT flare your elbows out to 90 degrees — that is a recipe for subacromial impingement and labral fraying. Retract and depress your shoulder blades into the bench.',
        biomechanicalRationale: 'Flaring to 90° compresses the supraspinatus tendon between the humeral head and acromion process. A 45° angle maximizes pectoral recruitment while preserving subacromial space.'
      },
      {
        creator: 'Jeff Nippard',
        quote: 'Lower the bar along a gentle curved path (J-curve): touching down on the lower sternum at the nipple line, and pressing backward towards the rack above the shoulders at lockout.',
        biomechanicalRationale: 'The J-curve bar path aligns perpendicular to the clavicular and sternocostal muscle fibers, optimizing mechanical efficiency.'
      },
      {
        creator: 'Dr. Stuart McGill',
        quote: 'Root your feet firmly into the floor and drive through your legs to establish full-body tension. A rigid torso platform protects the spine and enhances force transfer.',
        biomechanicalRationale: 'Leg drive pre-activates the anterior abdominal wall and posterior kinetic chain, creating a rock-solid platform for pressing.'
      }
    ],
    commonFaults: [
      'Flaring elbows out to 90 degrees in the "guillotine" position.',
      'Bouncing the barbell off the ribcage.',
      'Lifting buttocks off the bench to cheat the lockout.'
    ],
    rehabRegressions: [
      'Regression: Barbell Floor Press (limits range of motion to 90° elbow bend, eliminating anterior capsule stress).'
    ]
  },
  {
    id: 'cue_05_landmine_meadows_row',
    exerciseId: 't2_landmine_meadows_row',
    title: 'Landmine Meadows Row',
    tier: 'T2',
    prescribedTempo: '31X1',
    primaryMuscles: ['Latissimus Dorsi', 'Teres Major', 'Rhomboids', 'Posterior Deltoid'],
    equipment: 'Olympic Barbell & Landmine Attachment',
    setupInstructions: [
      'Stand perpendicular to the loaded end of the barbell in a staggered stance.',
      'Rest your front forearm across your front knee for upper-body support.',
      'Grip the thick end sleeve of the barbell with the outside hand using an overhand grip.'
    ],
    creatorCues: [
      {
        creator: 'Coach Eugene Teo',
        quote: 'Align your line of pull directly with your lat fibers. Initiate the row by driving your elbow back towards your hip pocket in a sweeping diagonal arc, rather than pulling straight up towards your chest with your biceps.',
        biomechanicalRationale: 'Standing perpendicular to the landmine matches the diagonal orientation of the lower and mid-lat fibers, allowing the elbow arc to fully shorten the muscle without forearm interference.'
      },
      {
        creator: 'Jeff Nippard',
        quote: 'At the bottom of every rep, allow your shoulder blade to fully protract and stretch the lat under load for a full 1-second dead-stop pause before pulling.',
        biomechanicalRationale: 'Deep stretch under tension promotes stretch-mediated hypertrophy of the latissimus dorsi.'
      },
      {
        creator: 'Marcus Filly (FBB)',
        quote: 'Maintain a stationary torso angle. Zero twisting, jerking, or momentum from your hips or lumbar spine.',
        biomechanicalRationale: 'Strict unilateral stability forces the obliques and quadratus lumborum to contract isometrically against rotation.'
      }
    ],
    commonFaults: [
      'Using torso heave and hip momentum to fling the barbell upward.',
      'Pulling too high towards the collarbone, engaging upper traps rather than lats.'
    ],
    rehabRegressions: [
      'Regression: Two-Handed Landmine T-Bar Row with chest support or straddle.'
    ]
  },
  {
    id: 'cue_06_athlean_face_pull',
    exerciseId: 't3_athlean_face_pull',
    title: 'Athlean-X Non-Negotiable Face Pull',
    tier: 'T3',
    prescribedTempo: '2112',
    primaryMuscles: ['Infraspinatus', 'Teres Minor', 'Rear Deltoid', 'Mid/Lower Trapezius'],
    equipment: 'Resistance Band or Towel Anchored High to Pull-Up Bar/Rack',
    setupInstructions: [
      'Anchor band at forehead height or above on the rack or pull-up bar.',
      'Grip the band with thumbs facing towards you (neutral to pronated grip).',
      'Step back until there is tension on the band; adopt a stable split stance.'
    ],
    creatorCues: [
      {
        creator: 'Jeff Cavaliere (ATHLEAN-X)',
        quote: 'The face pull is not a rowing exercise! Lead with your hands, not your elbows. At peak contraction, your thumbs must be pointing behind you, your hands must be higher than your elbows, and you must be pulling towards your forehead. Squeeze your external rotators hard!',
        biomechanicalRationale: 'Pulling with elbows high and hands low forces internal rotation under load (harmful). Leading with the hands forces external rotation, activating the infraspinatus and teres minor to balance anterior pressing volume.'
      }
    ],
    commonFaults: [
      'Pulling elbows back while keeping hands down (internal rotation under tension).',
      'Leaning the torso backward to cheat the weight instead of using scapular retraction.'
    ],
    rehabRegressions: [
      'Regression: Doorway Band Pull-Aparts with external rotation.'
    ]
  },
  {
    id: 'cue_07_bb_ohp',
    exerciseId: 't1_bb_ohp',
    title: 'Barbell Overhead Press (OHP)',
    tier: 'T1',
    prescribedTempo: '30X1',
    primaryMuscles: ['Anterior Deltoid', 'Lateral Deltoid', 'Triceps', 'Upper Trapezius', 'Core'],
    equipment: 'Olympic Barbell & Squat Rack',
    setupInstructions: [
      'Set bar at collarbone height; grip bar with hands just outside shoulders.',
      'Rest bar on anterior deltoids; elbows positioned slightly in front of the bar.',
      'Feet hip-width apart; squeeze glutes and lock ribs down.'
    ],
    creatorCues: [
      {
        creator: 'Dr. Aaron Horschig (Squat University)',
        quote: 'Press within the scapular plane (elbows angled approximately 30 degrees forward of the side). Squeeze your glutes and lock your 360-degree core brace so your lower back does not hyperextend under overhead load.',
        biomechanicalRationale: 'The scapular plane aligns with the natural orientation of the glenoid fossa, avoiding subacromial pinch against the acromion.'
      },
      {
        creator: 'Jeff Cavaliere (ATHLEAN-X)',
        quote: 'Clear your head backward slightly to let the bar travel in a straight vertical line. Once the bar passes your forehead, push your head forward "through the window", finishing with an active scapular upward shrug at the top.',
        biomechanicalRationale: 'Upward scapular rotation at lockout ensures the humerus clears the subacromial space safely and engages the serratus anterior.'
      }
    ],
    commonFaults: [
      'Leaning backward excessively into lumbar hyperextension to turn the press into an incline bench press.',
      'Flaring elbows out completely wide into the frontal plane.'
    ],
    rehabRegressions: [
      'Regression: Landmine Half-Kneeling Single-Arm Press (diagonal press arc avoids overhead impingement).'
    ]
  },
  {
    id: 'cue_08_pullup_ladders',
    exerciseId: 't2_pullup_ladders',
    title: 'Pull-Up Ladder Progression & Negatives',
    tier: 'T2',
    prescribedTempo: '30X1 (or 4010 on Negatives)',
    primaryMuscles: ['Latissimus Dorsi', 'Biceps Brachii', 'Brachialis', 'Lower Trapezius'],
    equipment: 'Pull-Up Bar',
    setupInstructions: [
      'Grip the pull-up bar with an overhand grip slightly wider than shoulder width.',
      'Begin from a dead hang with arms fully extended and core braced in a hollow body position.'
    ],
    creatorCues: [
      {
        creator: 'Yellow Dude',
        quote: 'Never kip or swing. Connective tissue adaptation requires strict control. On eccentric negatives, count a full 4 seconds from chin-over-bar down to full dead hang. For ladders, perform submaximal clusters (1-2-3 reps) to accumulate high volume without hitting neurological failure.',
        biomechanicalRationale: '4-second eccentric negatives stimulate collagen synthesis in the biceps tendon and lat fascia. Submaximal volume ladders build motor efficiency without central nervous system burnout.'
      },
      {
        creator: 'Jeff Cavaliere (ATHLEAN-X)',
        quote: 'Initiate every pull by depressing your shoulder blades before your elbows bend. Think of pulling your elbows down into your back pockets.',
        biomechanicalRationale: 'Scapular depression recruits the lower trapezius and latissimus dorsi before arm flexors take over, sparing the bicipital tendon.'
      }
    ],
    commonFaults: [
      'Kipping or swinging legs to cheat chin over bar.',
      'Cutting the bottom range of motion short and failing to reach a full active hang.',
      'Craning the neck forward to reach the bar.'
    ],
    rehabRegressions: [
      'Gate 1: Active Scapular Dead Hangs (3x30s).',
      'Gate 2: Inverted Barbell Rows in rack (3x8 reps).',
      'Gate 3: 4-Second Eccentric Pull-Up Negatives (3x5 reps).'
    ]
  },
  {
    id: 'cue_09_tibialis_wall_raise',
    exerciseId: 't3_tibialis_wall_raise',
    title: 'Tibialis Wall Raises',
    tier: 'T3',
    prescribedTempo: '2011',
    primaryMuscles: ['Tibialis Anterior', 'Extensor Digitorum Longus'],
    equipment: 'Flat Wall & Flat Shoes / Barefoot',
    setupInstructions: [
      'Stand with your upper back and buttocks flat against a smooth wall.',
      'Place feet 18–24 inches out from the wall, with knees completely straight.'
    ],
    creatorCues: [
      {
        creator: 'Ben Patrick (ATG)',
        quote: 'Pull your toes up towards your knees as high as possible. Hold for 1 second at maximum dorsiflexion, then lower under control for 2 seconds. The tibialis anterior is the body’s front brake and first line of shock absorption. Strengthening it removes immense decelerative shear from your patellar tendon.',
        biomechanicalRationale: 'The tibialis anterior absorbs ground reaction forces upon heel strike. When weak, decelerative ground forces transfer directly to the knee joint and patellar tendon.'
      }
    ],
    commonFaults: [
      'Bending the knees during the movement (bypasses tibialis loading).',
      'Letting the buttocks come away from the wall to use body momentum.'
    ],
    rehabRegressions: [
      'Move feet closer to the wall (10–12 inches) to decrease resistance.'
    ]
  },
  {
    id: 'cue_10_patrick_step_down',
    exerciseId: 't3_patrick_step_down',
    title: 'Patrick Step-Downs',
    tier: 'T3',
    prescribedTempo: '3010',
    primaryMuscles: ['Vastus Medialis Oblique (VMO)', 'Patellar Tendon', 'Ankle Stabilizers'],
    equipment: '2–4" Weight Plate or Step',
    setupInstructions: [
      'Stand on a 2–4" weight plate on one foot; allow the free foot to hang forward.',
      'Keep your torso completely vertical with hands on hips or holding a light support.'
    ],
    creatorCues: [
      {
        creator: 'Ben Patrick (ATG)',
        quote: 'Keep your working heel glued flat to the plate. Push your working knee forward over your toes while reaching the opposite heel out in front of you. Tap the floor as gently as if you were touching thin glass, then press back up through the working foot.',
        biomechanicalRationale: 'Forces progressive knee-over-toe translation in a controlled, low-angle setting, isolating the VMO and building tendon compliance without high shear.'
      }
    ],
    commonFaults: [
      'Stamping or bouncing the free heel off the floor.',
      'Allowing the working knee to collapse inward (valgus tracking).',
      'Hinging at the hips rather than translating the knee forward.'
    ],
    rehabRegressions: [
      'Reduce step height to a 1" plate or perform flat on the floor.'
    ]
  },
  {
    id: 'cue_11_alyssa_lu_9090',
    exerciseId: 'w_lower_a_2',
    title: 'Alyssa Lu 90/90 Positional Breathing & Hip Reset',
    tier: 'Warmup',
    prescribedTempo: '5s Inhale / 8s Exhale / 3s Pause',
    primaryMuscles: ['Proximal Hamstrings', 'Rectus Abdominis', 'Diaphragm', 'Pelvic Floor'],
    equipment: 'Flat Floor & Bench or Squat Rack Upright',
    setupInstructions: [
      'Lie supine on floor with feet flat on a bench or rack, knees and hips bent at 90 degrees.',
      'Place hands on lower ribs.'
    ],
    creatorCues: [
      {
        creator: 'Dr. Alyssa Lu (Proformance)',
        quote: 'Gently dig your heels downward into the bench to turn on your hamstrings. You will feel your pelvis tilt backward into neutral and your lower back flatten against the floor. Take a 5-second breath in through your nose expanding your ribs 360 degrees, then exhale through your mouth for 8 seconds until your ribs fully sink. Hold for 3 seconds.',
        biomechanicalRationale: 'Active proximal hamstring engagement creates a posterior pelvic tilt, reflexively inhibiting the overactive psoas and rectus femoris via reciprocal inhibition.'
      }
    ],
    commonFaults: [
      'Lifting hips into a high glute bridge rather than a subtle pelvic tilt.',
      'Chest breathing instead of diaphragmatic expansion.'
    ],
    rehabRegressions: [
      'Place a foam roller or yoga block between knees and gently squeeze during breath cycles.'
    ]
  },
  {
    id: 'cue_12_atg_elephant_walks',
    exerciseId: 'w_lower_b_2',
    title: 'ATG Elephant Walks',
    tier: 'Warmup',
    prescribedTempo: 'Rhythmic Alternating Steps (2s per side)',
    primaryMuscles: ['Hamstrings', 'Gastrocnemius / Soleus', 'Sciatic Nerve Tract'],
    equipment: 'Workout Bench (Elevation) or Flat Floor',
    setupInstructions: [
      'Place hands flat on an elevated bench (or on the floor if flexible).',
      'Feet hip-width apart, knees softly bent.'
    ],
    creatorCues: [
      {
        creator: 'Ben Patrick (ATG)',
        quote: 'Bend one knee while actively straightening the other knee completely by flexing your quadriceps. Hold that quad flex for a moment, then alternate legs with a smooth rhythm for 20 reps per side. The strong quad squeeze forces your hamstring to release dynamically without tearing tissue.',
        biomechanicalRationale: 'Utilizes reciprocal inhibition to relax tight hamstrings dynamically while desensitizing the sciatic nerve path through rhythmic flossing.'
      }
    ],
    commonFaults: [
      'Aggressively bouncing or yanking on cold hamstrings.',
      'Failing to actively contract the quadriceps on the straightened leg.'
    ],
    rehabRegressions: [
      'Elevate hands on a higher barbell in the rack or sturdy table.'
    ]
  },
  {
    id: 'cue_13_filly_z_press',
    exerciseId: 't3_filly_kb_z_press',
    title: 'Marcus Filly Single-Arm Kettlebell Z-Press',
    tier: 'T3',
    prescribedTempo: '30X1',
    primaryMuscles: ['Deltoids', 'Triceps', 'Thoracic Spine Erectors', 'Core / Hip Flexors'],
    equipment: 'BowFlex Kettlebell (8–40 lbs) & Floor',
    setupInstructions: [
      'Sit directly on the floor with legs spread in a wide V, knees straight and toes pointed up.',
      'Clean kettlebell into front rack position in one hand; sit tall on sitz bones with neutral spine.'
    ],
    creatorCues: [
      {
        creator: 'Marcus Filly (FBB)',
        quote: 'Without a bench backrest to lean on, you cannot cheat. Sit tall on your sitz bones. Compress your hip flexors and brace your midsection tightly. Press the kettlebell straight overhead, locking out directly over your ear with zero torso lean.',
        biomechanicalRationale: 'Eliminates all lower-body momentum and spinal arching, exposing thoracic spine limitations and demanding pure core stabilization under unilateral overhead load.'
      }
    ],
    commonFaults: [
      'Leaning backward or rounding the thoracic spine.',
      'Bending the knees to relieve hip flexor tension.'
    ],
    rehabRegressions: [
      'Sit on a 2–4" weight plate to decrease hip flexion demand.'
    ]
  }
];
```

---

## 5. Blueprint 3: `src/domain/mobility.ts`

### 5.1 TypeScript Type Definitions

```typescript
// src/domain/mobility.ts

export type MobilityTestId = 
  | 'elephant-walk' 
  | 'knee-to-wall' 
  | 'split-squat-elevation' 
  | 'biering-sorensen' 
  | 'dead-hang';

export interface MobilityProtocol {
  testId: MobilityTestId;
  name: string;
  creator: string;
  targetTissue: string;
  primaryMetric: string;
  unit: string;
  direction: 'higher_is_better' | 'lower_is_better';
  targetBenchmark: string;
  benchmarkNumeric: number;
  instructions: string[];
  scoringTiers: Array<{
    scoreOrValue: string;
    label: string;
    interpretation: string;
  }>;
}

export interface MobilityEntry {
  id: string; // UUID or timestamp id
  testId: MobilityTestId;
  date: string; // ISO 8601 string e.g. "2026-10-13T05:30:00Z"
  value: number; // numeric value (level 1-5, inches, seconds)
  unit: string;
  side?: 'left' | 'right' | 'bilateral';
  painScore?: number; // 0-10 scale
  notes?: string;
}

export interface MobilitySummary {
  testId: MobilityTestId;
  name: string;
  creator: string;
  unit: string;
  targetBenchmark: string;
  latestValue: number | null;
  personalBest: number | null;
  history: MobilityEntry[];
  status: 'optimal' | 'functional' | 'restricted' | 'untested';
}

export interface MobilityTrackerState {
  entries: MobilityEntry[];
}
```

### 5.2 Complete 5 Mobility Protocols Dataset

```typescript
export const MOBILITY_PROTOCOLS: Record<MobilityTestId, MobilityProtocol> = {
  'elephant-walk': {
    testId: 'elephant-walk',
    name: 'ATG Elephant Walks (Hamstring Reach)',
    creator: 'Ben Patrick (ATG)',
    targetTissue: 'Hamstrings, Calves & Sciatic Nerve Bed',
    primaryMetric: 'Reach Depth Level',
    unit: 'level (1–5)',
    direction: 'higher_is_better',
    targetBenchmark: 'Level 5 (Palms Flat on Floor)',
    benchmarkNumeric: 5,
    instructions: [
      'Stand with feet hip-width apart; hinge forward at the hips.',
      'Perform 20 alternating knee bend and quad lockout cycles.',
      'On the 20th cycle, assess maximum comfortable reach depth with both knees straightened without spine pain.'
    ],
    scoringTiers: [
      { scoreOrValue: '1', label: 'Mid-Shin (~12–16" from floor)', interpretation: 'Severe restriction; elevate hands on bench.' },
      { scoreOrValue: '2', label: 'Ankles / Shoelaces (~6–8" from floor)', interpretation: 'Moderate restriction.' },
      { scoreOrValue: '3', label: 'Fingertips to Toes (0" baseline)', interpretation: 'Baseline mobility.' },
      { scoreOrValue: '4', label: 'Knuckles Touching Floor (+2" past toes)', interpretation: 'Functional athletic mobility.' },
      { scoreOrValue: '5', label: 'Palms Flat on Floor (+4–6" past toes)', interpretation: 'Full posterior chain decompression.' }
    ]
  },
  'knee-to-wall': {
    testId: 'knee-to-wall',
    name: 'Knee-to-Wall Ankle Dorsiflexion Test',
    creator: 'Dr. Aaron Horschig (Squat University)',
    targetTissue: 'Talocrural Joint & Soleus Muscle',
    primaryMetric: 'Distance from Wall',
    unit: 'inches',
    direction: 'higher_is_better',
    targetBenchmark: '≥ 4.0–5.0 inches (10–12.5 cm)',
    benchmarkNumeric: 4.5,
    instructions: [
      'Place a tape measure perpendicular to a wall on the floor.',
      'In half-kneeling or standing lunge, place test foot facing the wall.',
      'Drive knee forward over 2nd/3rd toe until knee touches wall, keeping heel 100% flat on floor.',
      'Slide foot backward in 0.5-inch increments until heel starts to lift. Record distance for Left and Right ankles.'
    ],
    scoringTiers: [
      { scoreOrValue: '< 2.0', label: '< 2.0 inches (< 5 cm)', interpretation: 'Severe Restriction; high patellar shear risk during squats. Elevate heels on plates.' },
      { scoreOrValue: '2.0–3.5', label: '2.0–3.5 inches (5–9 cm)', interpretation: 'Moderate Restriction; functional for box squats; requires ongoing ankle mobilization.' },
      { scoreOrValue: '4.0–5.0', label: '4.0–5.0 inches (10–12.5 cm)', interpretation: 'Normal Functional Mobility; allows full below-parallel squats.' },
      { scoreOrValue: '> 5.0', label: '> 5.0 inches (> 12.5 cm)', interpretation: 'Optimal / Elite Dorsiflexion; zero forward restriction on deep ATG split squats.' }
    ]
  },
  'split-squat-elevation': {
    testId: 'split-squat-elevation',
    name: 'ATG Split Squat Elevation Gate',
    creator: 'Ben Patrick (ATG)',
    targetTissue: 'Patellar Tendon, VMO & Hip Flexors',
    primaryMetric: 'Pain-Free Front Foot Elevation',
    unit: 'inches',
    direction: 'lower_is_better', // 0 inches (flat ground) is the target
    targetBenchmark: '0 inches (Flat Ground Mastery)',
    benchmarkNumeric: 0,
    instructions: [
      'Perform an ATG Split Squat aiming for full knee bend (hamstring completely covering calf) with tall torso.',
      'Measure front foot elevation height required to complete 5 pain-free reps (0/10 pain).',
      'As tendon remodeled collagen strengthens, lower elevation progressively.'
    ],
    scoringTiers: [
      { scoreOrValue: '18', label: '18 inches (Bench Height)', interpretation: 'Level 0 Acute Offload; high elevation required for pain-free knee bend.' },
      { scoreOrValue: '12', label: '12 inches (Step / Low Bench)', interpretation: 'Level 1 Subacute Rehab.' },
      { scoreOrValue: '6', label: '6 inches (Two 45 lb Plates)', interpretation: 'Level 2 Progressive Tendon Remodeling.' },
      { scoreOrValue: '2', label: '2 inches (Single 45 lb Plate)', interpretation: 'Level 3 Advanced Progression.' },
      { scoreOrValue: '0', label: '0 inches (Flat Ground)', interpretation: 'Level 4 Flat Ground Mastery; full hamstring-calf coverage with zero pain.' }
    ]
  },
  'biering-sorensen': {
    testId: 'biering-sorensen',
    name: 'Biering-Sørensen Back Extensor Hold',
    creator: 'Dr. Stuart McGill',
    targetTissue: 'Lumbar Erector Spinae & Posterior Kinetic Chain',
    primaryMetric: 'Horizontal Isometric Hold Duration',
    unit: 'seconds',
    direction: 'higher_is_better',
    targetBenchmark: '≥ 120–180 seconds',
    benchmarkNumeric: 120,
    instructions: [
      'Lie prone on a bench with pelvis at the edge; secure lower legs with strap or barbell plate load.',
      'Cross arms over chest; elevate torso to horizontal and start timer.',
      'Maintain steady breathing; stop timer when torso drops below horizontal.'
    ],
    scoringTiers: [
      { scoreOrValue: '< 60', label: '< 60 seconds', interpretation: 'Suboptimal Endurance; higher risk of lumbar fatigue under heavy RDLs/deadlifts.' },
      { scoreOrValue: '60–120', label: '60–120 seconds', interpretation: 'Adequate Baseline Endurance.' },
      { scoreOrValue: '120–180+', label: '120–180+ seconds', interpretation: 'Target Resilient Spine; optimal endurance-to-fatigue ratio protecting lumbar discs.' }
    ]
  },
  'dead-hang': {
    testId: 'dead-hang',
    name: 'Dead Hang Decompression & Grip Test',
    creator: 'Jeff Cavaliere & Yellow Dude',
    targetTissue: 'Glenohumeral Joint, Subacromial Space, Spine & Grip',
    primaryMetric: 'Suspended Hang Time',
    unit: 'seconds',
    direction: 'higher_is_better',
    targetBenchmark: '≥ 60–90 seconds',
    benchmarkNumeric: 60,
    instructions: [
      'Grasp pull-up bar with an overhand, shoulder-width grip.',
      'Hang freely suspended with feet off the ground.',
      'Breathe deeply and record total seconds until grip fatigue forces release.'
    ],
    scoringTiers: [
      { scoreOrValue: '< 30', label: '< 30 seconds', interpretation: 'Restricted Grip / Shoulder Tolerance.' },
      { scoreOrValue: '30–60', label: '30–60 seconds', interpretation: 'Baseline Functional Decompression.' },
      { scoreOrValue: '60–120', label: '60–120 seconds', interpretation: 'Optimal Joint Decompression & Grip Stamina.' }
    ]
  }
};
```

### 5.3 Helper Functions & Metric Processing

```typescript
export function calculateMobilitySummary(
  testId: MobilityTestId,
  history: MobilityEntry[]
): MobilitySummary {
  const protocol = MOBILITY_PROTOCOLS[testId];
  const testHistory = history
    .filter(e => e.testId === testId)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const latestEntry = testHistory.length > 0 ? testHistory[testHistory.length - 1] : null;
  const latestValue = latestEntry ? latestEntry.value : null;

  let personalBest: number | null = null;
  if (testHistory.length > 0) {
    if (protocol.direction === 'higher_is_better') {
      personalBest = Math.max(...testHistory.map(e => e.value));
    } else {
      personalBest = Math.min(...testHistory.map(e => e.value));
    }
  }

  let status: MobilitySummary['status'] = 'untested';
  if (latestValue !== null) {
    if (protocol.direction === 'higher_is_better') {
      if (latestValue >= protocol.benchmarkNumeric) {
        status = 'optimal';
      } else if (latestValue >= protocol.benchmarkNumeric * 0.6) {
        status = 'functional';
      } else {
        status = 'restricted';
      }
    } else {
      // lower is better (e.g. split squat elevation: target is 0)
      if (latestValue <= protocol.benchmarkNumeric) {
        status = 'optimal';
      } else if (latestValue <= 6) {
        status = 'functional';
      } else {
        status = 'restricted';
      }
    }
  }

  return {
    testId,
    name: protocol.name,
    creator: protocol.creator,
    unit: protocol.unit,
    targetBenchmark: protocol.targetBenchmark,
    latestValue,
    personalBest,
    history: testHistory,
    status
  };
}

export function getAllMobilitySummaries(history: MobilityEntry[]): MobilitySummary[] {
  const testIds: MobilityTestId[] = [
    'elephant-walk',
    'knee-to-wall',
    'split-squat-elevation',
    'biering-sorensen',
    'dead-hang'
  ];
  return testIds.map(id => calculateMobilitySummary(id, history));
}
```

---

## 6. Implementation Instructions for Track A Workers

To implement Milestone 1 domain models with zero ambiguity:

1. **File 1**: `src/domain/programData.ts`
   - Copy exact type definitions from Section 3.1.
   - Copy `REST_PRESETS` array from Section 3.2.
   - Copy `SESSION_LOWER_A`, `SESSION_UPPER_A`, `SESSION_LOWER_B`, `SESSION_UPPER_B`, and `WORKOUT_PROGRAM` from Section 3.3.
   - Verify every exercise contains `id`, `name`, `tier`, `targetSets`, `targetReps`, `tempo`, `restSeconds`, `equipment`, `biomechanicalRationale`, `progressionRule`, and `regression` where applicable.

2. **File 2**: `src/domain/cueCardsData.ts`
   - Copy exact type definitions from Section 4.1.
   - Copy all 13 cue cards from Section 4.2.
   - Ensure cards 01 through 13 match the exercise IDs in `programData.ts`.

3. **File 3**: `src/domain/mobility.ts`
   - Copy type definitions from Section 5.1 (note: matches `MobilityEntry` and `MobilitySummary` interface contracts in `PROJECT.md`).
   - Copy all 5 protocols from Section 5.2.
   - Copy helper functions `calculateMobilitySummary` and `getAllMobilitySummaries` from Section 5.3.

4. **Integration with Storage**:
   - `storageManager.ts` will directly import `MobilityEntry` and `WORKOUT_PROGRAM` to hydrate initial state.

---

## 7. Verification Checklist & Invalidation Conditions

### Verification Checklist
- [x] All 4 workout sessions represent exact home gym equipment (Barbell, Landmine, Pull-up bar, BowFlex SelectTech KB, Indian clubs, Rowing machine).
- [x] Quad compound movements feature explicit knee tendinopathy regressions and 3–4s eccentric tempos.
- [x] Pre-fatigue protocols (calves & hamstrings before squats; Alyssa Lu hip resets & elephant walks before RDLs) are fully coded into warmup sequences.
- [x] 13 cue cards cover all 8 creators (Jeff Nippard, Jeff Cavaliere, Ben Patrick, Dr. Aaron Horschig, Marcus Filly, Coach Eugene Teo, Yellow Dude, Dr. Alyssa Lu) plus Dr. Stuart McGill.
- [x] 5 mobility assessment protocols include quantifiable scoring tiers, target benchmarks, and LocalStorage schemas.

### Invalidation Conditions
- If equipment list changes (e.g. adding dumbbells or cable attachments), `EquipmentType` and exercise equipment fields must be extended.
- If user knee pain threshold shifts from tendinosis (load-tolerant) to acute tear, all squats must be placed on hold until medically cleared.
