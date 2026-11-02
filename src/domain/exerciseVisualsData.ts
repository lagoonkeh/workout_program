// src/domain/exerciseVisualsData.ts

export type DiagramType =
  | 'squat'
  | 'split_squat'
  | 'tibialis'
  | 'step_down'
  | 'core_mcgill'
  | 'bench_press'
  | 'kb_row'
  | 'floor_press'
  | 'face_pull'
  | 'dead_hang'
  | 'rdl'
  | 'good_morning'
  | 'biering_sorensen'
  | 'carry'
  | 'ohp'
  | 'pullup'
  | 'z_press'
  | 'lsit'
  | 'arms'
  | 'warmup_walk'
  | 'warmup_hip'
  | 'warmup_row'
  | 'warmup_90_90'
  | 'warmup_calf'
  | 'warmup_ankle'
  | 'warmup_club'
  | 'warmup_scapular'
  | 'warmup_elephant'
  | 'warmup_dead_hang'
  | 'warmup_wall_slide';

export interface ExerciseVisual {
  id: string;
  exerciseName: string;
  diagramType: DiagramType;
  startPositionLabel: string;
  bottomPositionLabel: string;
  caption: string;
  keyCues: string[];
  jointAngleCues: {
    start: string;
    bottom: string;
  };
  trajectoryNote: string;
  safetyNote?: string;
}

export const EXERCISE_VISUALS: Record<string, ExerciseVisual> = {
  // --- SESSION 1: LOWER A ---
  t1_bb_squat: {
    id: 't1_bb_squat',
    exerciseName: 'Barbell Back Squat',
    diagramType: 'squat',
    startPositionLabel: '1. Setup & Tripod Rooting',
    bottomPositionLabel: '2. Parallel Depth & Stretch Pause',
    caption: 'Establish foot tripod, 360° abdominal brace, and descend controlled to parallel or slightly below.',
    keyCues: [
      'Tripod foot rooting (big toe, pinky toe, heel center)',
      '3-second slow eccentric descent directly over midfoot',
      'Knees tracking parallel with second toe angle (15–30° flare)',
      'Zero lumbar flexion or butt wink in the bottom hole'
    ],
    jointAngleCues: {
      start: '180° full hip and knee lockout with rigid core brace',
      bottom: '90°–100° deep knee flexion with parallel femur'
    },
    trajectoryNote: 'Linear vertical bar path centered directly over midfoot arch.',
    safetyNote: 'Knee tendinitis: Stop immediately at pain-free depth; switch to box squat if patellar discomfort > 2/10.'
  },

  t2_atg_split_squat: {
    id: 't2_atg_split_squat',
    exerciseName: 'ATG Split Squat',
    diagramType: 'split_squat',
    startPositionLabel: '1. Staggered Split Lockout',
    bottomPositionLabel: '2. Hamstring-Covering-Calf Full Knee Bend',
    caption: 'Long lunge stance, rear glute clenched, driving front knee forward until hamstring covers the calf.',
    keyCues: [
      'Front hamstring achieves full coverage over front calf',
      'Rear leg stays straight with glute actively engaged',
      'Torso remains upright like an elevator, not an escalator',
      'Pain-free progression: elevate front foot on 25lb/45lb plate as needed'
    ],
    jointAngleCues: {
      start: 'Tall vertical torso, rear hip extended',
      bottom: 'Acute front knee flexion with full ankle dorsiflexion'
    },
    trajectoryNote: 'Forward diagonal knee travel over toes with upright ribcage.',
    safetyNote: 'Tendon remodeling: Strict 3-4s slow descent. Zero bouncing in the hole.'
  },

  t3_tibialis_wall_raise: {
    id: 't3_tibialis_wall_raise',
    exerciseName: 'Tibialis Wall Raise',
    diagramType: 'tibialis',
    startPositionLabel: '1. Plantarflexed Bottom',
    bottomPositionLabel: '2. Peak Dorsiflexion Contraction',
    caption: 'Back against wall, knees locked, pulling toes hard toward shins to strengthen anterior deceleration.',
    keyCues: [
      'Knees remain completely locked out straight',
      'Heels firmly anchored into the floor',
      'Pull toes and forefoot as high off floor as possible',
      'Hold peak top contraction for 1 full second'
    ],
    jointAngleCues: {
      start: 'Feet flat / neutral 90° ankle angle',
      bottom: 'Maximum active dorsiflexion (toes flexed toward knee)'
    },
    trajectoryNote: 'Rotational arc of the foot about the ankle axis.',
    safetyNote: 'Builds anterior tibialis deceleration force to protect the patellar tendon.'
  },

  t3_patrick_step_down: {
    id: 't3_patrick_step_down',
    exerciseName: 'Patrick Step-Down',
    diagramType: 'step_down',
    startPositionLabel: '1. Standing Lockout',
    bottomPositionLabel: '2. Pain-Free Forward Knee Travel',
    caption: 'Single-leg controlled heel tap forward, prioritizing pain-free knee flexion over the toes.',
    keyCues: [
      'Maintain level hips throughout single-leg descent',
      'Lightly touch working heel forward without shifting weight',
      'Smooth 3-second descent, no ballistic rebound',
      'Elevate heel slightly with small plate or slant board if ankle is stiff'
    ],
    jointAngleCues: {
      start: 'Single leg balance, neutral pelvis',
      bottom: 'Controlled forward knee translation over midfoot'
    },
    trajectoryNote: 'Controlled linear descent with forward knee translation.',
    safetyNote: 'ATG tendinopathy golden rule: Must be 100% pain-free (0–2/10).'
  },

  t3_mcgill_big_3: {
    id: 't3_mcgill_big_3',
    exerciseName: 'McGill Big 3 Core Protocol',
    diagramType: 'core_mcgill',
    startPositionLabel: '1. Neutral Quadruped / Setup',
    bottomPositionLabel: '2. Anti-Rotation Endurance Lock',
    caption: 'Bird-Dog, Side Plank, and Modified Curl-Up. Eliminates spinal shear while locking 360° core stiffness.',
    keyCues: [
      'Zero lumbar extension, flexion, or pelvis rotation',
      'Bird-Dog: push back wall with heel, clench fist forward',
      'Hold each contraction for 7-10 seconds per rep',
      'Breathe into lateral abdominal wall while bracing'
    ],
    jointAngleCues: {
      start: 'Spine in neutral lordotic curve',
      bottom: 'Horizontal isometric hold with maximum stiffness'
    },
    trajectoryNote: 'Pure isometric stabilization resisting gravity and rotational moments.',
    safetyNote: 'Spare the spine: Builds abdominal wall endurance over maximum spinal flexion.'
  },

  // --- SESSION 2: UPPER A ---
  t1_bb_bench_press: {
    id: 't1_bb_bench_press',
    exerciseName: 'Barbell Bench Press',
    diagramType: 'bench_press',
    startPositionLabel: '1. Scapular Retraction & Lockout',
    bottomPositionLabel: '2. Lower Sternum Touch & 1s Pause',
    caption: 'Shoulder blades pinched, 45° elbow tuck, bar travels in curved J-path touching lower sternum.',
    keyCues: [
      'Retract and depress scapulae firmly into the bench pad',
      'Tuck elbows to approximately 45 degrees, avoid flared 90° impingement',
      'Leg drive: push heels through the floor without lifting glutes',
      'Lower bar to nipple/lower sternum with 3-second controlled descent'
    ],
    jointAngleCues: {
      start: 'Elbows locked, bar over shoulder joints',
      bottom: 'Elbows tucked 45° relative to torso, bar touching chest'
    },
    trajectoryNote: 'Slightly curved J-hook bar path from mid-chest at bottom to over shoulders at top.',
    safetyNote: 'Scapular centration protects rotator cuff and anterior shoulder capsule.'
  },

  t2_kb_single_arm_row: {
    id: 't2_kb_single_arm_row',
    exerciseName: 'Single-Arm Kettlebell Row',
    diagramType: 'kb_row',
    startPositionLabel: '1. Braced on Bench, Arm Long',
    bottomPositionLabel: '2. Elbow Driven to the Hip Pocket',
    caption: 'Knee and hand on the bench, flat back, row the bell toward the hip without twisting.',
    keyCues: [
      'Hand and knee on the bench, flat back near parallel to the floor',
      'Pull the elbow back toward the hip pocket, not up to the chest',
      'Let the shoulder blade reach down at the bottom for a full stretch',
      'Torso stays still: no twisting to finish the rep'
    ],
    jointAngleCues: {
      start: 'Arm straight, lat stretched',
      bottom: 'Elbow past the torso, about 90 degrees bent'
    },
    trajectoryNote: 'The bell travels up and slightly back in an arc toward the hip.',
    safetyNote: 'The braced hand and knee keep the lower back unloaded.'
  },

  t3_kb_floor_press_er: {
    id: 't3_kb_floor_press_er',
    exerciseName: 'Kettlebell Floor Press',
    diagramType: 'floor_press',
    startPositionLabel: '1. Lockout Over Chest',
    bottomPositionLabel: '2. Tricep Floor Contact Pause',
    caption: 'Athlean-X Effective Reps floor press: triceps touch floor to eliminate shoulder hyper-extension.',
    keyCues: [
      'Lie flat with knees bent, feet flat on the floor',
      'Lower kettlebell until tricep gently touches the floor',
      'Dead-stop pause on floor for 1 second to dissipate elastic recoil',
      'Press upward explosively to full elbow extension'
    ],
    jointAngleCues: {
      start: 'Arms fully extended perpendicular to torso',
      bottom: 'Upper arm resting on floor at 45° angle'
    },
    trajectoryNote: 'Vertical pressing path with floor acting as a biomechanical safety stop.',
    safetyNote: 'Floor eliminates shoulder extension past neutral, completely protecting anterior capsule.'
  },

  t3_athlean_face_pull: {
    id: 't3_athlean_face_pull',
    exerciseName: 'Athlean-X Face Pull',
    diagramType: 'face_pull',
    startPositionLabel: '1. Arms Extended In Front (or 30° Hinge)',
    bottomPositionLabel: '2. High Thumbs External Rotation Lock',
    caption: 'Athlean-X 2-in-1 face pull alternative: pull kettlebell/clubs high while externally rotating hands backward and higher than elbows without cables.',
    keyCues: [
      'Thumbs turned backward (external rotation of humerus)',
      'Hands MUST finish higher than elbows at peak contraction',
      'Drive elbows backward while retracting shoulder blades',
      'Hold peak squeeze for 2 full seconds on every rep'
    ],
    jointAngleCues: {
      start: 'Arms extended forward at eye level or 30° hang',
      bottom: 'Double biceps pose with 90° elbow flexion and full external rotation'
    },
    trajectoryNote: 'Horizontal/vertical high pull converting into upward external rotation arc.',
    safetyNote: 'Strengthens infraspinatus and teres minor to correct rounded posture and bench press tightness without requiring cables or devices.'
  },

  t3_dead_hang_club_mills: {
    id: 't3_dead_hang_club_mills',
    exerciseName: 'Dead Hangs & Indian Club Shoulder Mills',
    diagramType: 'dead_hang',
    startPositionLabel: '1. Passive Grip & Decompression',
    bottomPositionLabel: '2. Active Scapular Pull & Club Mill Arc',
    caption: 'Decompresses subacromial space, remodels coracoacromial arch, and lubricates glenohumeral joint.',
    keyCues: [
      'Dead hang: relax spine and let ribcage lengthen under bodyweight',
      'Active hang: pull shoulder blades down away from ears without bending elbows',
      'Club circles: small 2-5 lb club swings driven by wrist and shoulder rotation',
      'Diaphragmatic nasal breathing throughout'
    ],
    jointAngleCues: {
      start: 'Full 180° overhead shoulder flexion',
      bottom: 'Active scapular depression with rotational multi-planar mobility'
    },
    trajectoryNote: 'Traction vertical hang followed by 360-degree rotational mills.',
    safetyNote: 'Restores overhead mobility and subacromial clearance for pain-free pressing.'
  },

  // --- SESSION 3: LOWER B ---
  t1_bb_rdl: {
    id: 't1_bb_rdl',
    exerciseName: 'Barbell Romanian Deadlift (RDL)',
    diagramType: 'rdl',
    startPositionLabel: '1. Upright Tall Lockout',
    bottomPositionLabel: '2. Deep Hip Hinge at Mid-Shin',
    caption: 'Maximum hip hinge with soft knees, pushing pelvis backward while bar stays glued to the legs.',
    keyCues: [
      'Maintain soft 15-20° knee bend that does not change during the movement',
      'Push hips backward as if trying to touch the wall behind you with glutes',
      'Barbell remains in contact with thighs and shins at all times',
      'Halt descent when hips stop travelling backward (just below kneecap)'
    ],
    jointAngleCues: {
      start: 'Full hip extension, shoulders over bar',
      bottom: '90° hip hinge angle, horizontal spine, soft knees'
    },
    trajectoryNote: 'Strict vertical bar path skimming the surface of the legs.',
    safetyNote: 'Maximizes hamstring stretch-mediated hypertrophy while keeping lumbar shear minimal.'
  },

  t2_kb_good_morning: {
    id: 't2_kb_good_morning',
    exerciseName: 'Kettlebell Good Morning',
    diagramType: 'good_morning',
    startPositionLabel: '1. Standing Chest Hug',
    bottomPositionLabel: '2. Horizontal Torso Hip Hinge',
    caption: 'Kettlebell hugged tight against upper chest. Hinge hips back with proud chest and locked lumbar spine.',
    keyCues: [
      'Hug the 8-40 lb kettlebell tight against upper sternum',
      'Keep chest tall and shoulder blades retracted',
      'Hinge backward until torso is nearly parallel to floor',
      'Drive hips forward to return to lockout without hyperextending lower back'
    ],
    jointAngleCues: {
      start: 'Upright standing alignment',
      bottom: '75–90° hip hinge with rigid thoracic extension'
    },
    trajectoryNote: 'Pure posterior hip translation with fixed upper body load.',
    safetyNote: 'Teaches hip hinge mechanics without placing compressive shear on cervical spine.'
  },

  t3_patrick_step_down_b: {
    id: 't3_patrick_step_down_b',
    exerciseName: 'Single-Leg Patrick Step-Up',
    diagramType: 'step_down',
    startPositionLabel: '1. Plate Elevated Stance',
    bottomPositionLabel: '2. Deceleration Floor Touch',
    caption: 'Elevate working foot on a 45 lb plate. Lower opposing heel slowly to floor and drive up through ball of foot.',
    keyCues: [
      'Single-leg balance with foot centered on 45 lb plate',
      '3-4 second controlled eccentric descent to touch floor lightly',
      'Drive straight up through the working leg with zero hopping from bottom foot',
      'Focus tension into vastus medialis oblique (VMO) directly above inside knee'
    ],
    jointAngleCues: {
      start: 'Single-leg lockout atop elevation plate',
      bottom: 'Ankle dorsiflexion and knee flexion past toe level'
    },
    trajectoryNote: 'Vertical lowering and pushing off single elevated surface.',
    safetyNote: 'VMO strengthening stabilizes patellar tracking and prevents lateral patellofemoral subluxation.'
  },

  t3_biering_sorensen: {
    id: 't3_biering_sorensen',
    exerciseName: 'Biering-Sørensen Back Extensor Endurance',
    diagramType: 'biering_sorensen',
    startPositionLabel: '1. Hip Support Setup',
    bottomPositionLabel: '2. Horizontal Torso Isometric Hold',
    caption: 'Gold-standard spinal endurance assessment: maintain horizontal torso alignment without hyperextension.',
    keyCues: [
      'Hips supported at bench or rack edge with ankles anchored securely',
      'Torso held strictly parallel to the floor (180° line)',
      'Cross arms across chest or hold hands behind head',
      'Glutes, hamstrings, and erectors maintain sustained isometric contraction'
    ],
    jointAngleCues: {
      start: 'Hips aligned at edge of bench',
      bottom: 'Perfect 180° horizontal alignment against gravity'
    },
    trajectoryNote: 'Pure static isometric endurance hold resisting gravity.',
    safetyNote: 'Stuart McGill benchmark: ≥ 120s hold is the number one predictor of lower back resilience.'
  },

  t3_kb_suitcase_carry: {
    id: 't3_kb_suitcase_carry',
    exerciseName: 'Heavy Kettlebell Suitcase Carry',
    diagramType: 'carry',
    startPositionLabel: '1. Unilateral Pick & Square Posture',
    bottomPositionLabel: '2. Anti-Lateral Flexion Stride',
    caption: 'Heavy kettlebell in one hand. Walk smoothly with level shoulders, resisting any sideways tilt or lateral lean.',
    keyCues: [
      'Hold kettlebell at side with arm fully straight',
      'Keep shoulders and hips completely level — zero leaning away from load',
      'Take smooth, controlled heel-to-toe strides with upright posture',
      'Opposite quadratus lumborum and obliques contract isometrically'
    ],
    jointAngleCues: {
      start: 'Neutral erect standing posture with asymmetrical load',
      bottom: 'Walking cadence maintaining strict vertical torso plane'
    },
    trajectoryNote: 'Forward linear walking path with anti-rotational spinal bracing.',
    safetyNote: 'Builds functional lateral core stiffness that protects the lumbar spine during heavy lifts.'
  },

  // --- SESSION 4: UPPER B ---
  t1_bb_ohp: {
    id: 't1_bb_ohp',
    exerciseName: 'Barbell Overhead Press',
    diagramType: 'ohp',
    startPositionLabel: '1. Front Rack & Glute Lock',
    bottomPositionLabel: '2. Overhead Lockout Through Window',
    caption: 'Grip just outside shoulders, elbows slightly forward in scapular plane, press straight up and poke head through.',
    keyCues: [
      'Squeeze glutes and brace abs tightly to prevent lumbar hyperextension',
      'Elbows tucked slightly forward of the barbell in the scapular plane (30°)',
      'Tilt head back slightly as bar passes chin, then push head forward through the window at lockout',
      'Shrug upper traps at peak lockout to stabilize shoulder blades'
    ],
    jointAngleCues: {
      start: 'Bar resting on clavicles / front delts, forearms vertical',
      bottom: 'Full 180° shoulder flexion overhead with bar directly over midfoot'
    },
    trajectoryNote: 'Direct vertical bar path curving around the chin into mid-line lockout.',
    safetyNote: 'Pressing in the scapular plane prevents subacromial impingement.'
  },

  t2_pullup_ladders: {
    id: 't2_pullup_ladders',
    exerciseName: 'Pull-Up Ladder & Negatives',
    diagramType: 'pullup',
    startPositionLabel: '1. Full Hang & Hollow Body',
    bottomPositionLabel: '2. Chest to Bar & Scapular Squeeze',
    caption: 'Overhand grip, hollow body position, pull elbows down to ribs, chest to bar, with 3-4s slow eccentric lower.',
    keyCues: [
      'Engage hollow body position: legs straight, toes pointed slightly forward',
      'Initiate pull by depressing shoulder blades down away from ears',
      'Pull chest up toward the bar, driving elbows toward back pockets',
      'Lower down under complete 3-4 second control to dead hang before next rep'
    ],
    jointAngleCues: {
      start: 'Dead hang overhead with arms straight and lats on stretch',
      bottom: 'Chin clear over bar, elbows acute, lats fully contracted'
    },
    trajectoryNote: 'Vertical pulling arc with slight thoracic extension at top.',
    safetyNote: 'Eccentric negatives remodel connective tissue in the biceps tendon and shoulders.'
  },

  t3_filly_kb_z_press: {
    id: 't3_filly_kb_z_press',
    exerciseName: 'Marcus Filly Single-Arm KB Z-Press',
    diagramType: 'z_press',
    startPositionLabel: '1. Seated L-Sit Rack Position',
    bottomPositionLabel: '2. Strict Vertical Lockout & Pause',
    caption: 'Seated on the floor with legs straight out. Press kettlebell overhead with zero leaning or momentum.',
    keyCues: [
      'Sit tall with legs straight and heels together on floor (L-sit posture)',
      'Zero back support: your core and hip flexors provide 100% of the stability',
      'Press kettlebell strictly overhead without leaning backward',
      '30X1 tempo: 3s lowering, explode up, 1s lockout hold'
    ],
    jointAngleCues: {
      start: '90° seated hip angle, upright thoracic spine, KB in front rack',
      bottom: '180° overhead arm lockout directly over ear'
    },
    trajectoryNote: 'Strict vertical trajectory punishing any postural cheating or sway.',
    safetyNote: 'Eliminates leg drive and lumbar arching, isolating shoulder musculature and deep core stabilizers.'
  },

  t3_yellow_dude_lsit: {
    id: 't3_yellow_dude_lsit',
    exerciseName: 'Yellow Dude L-Sit & Compression',
    diagramType: 'lsit',
    startPositionLabel: '1. Hands Planted Support',
    bottomPositionLabel: '2. Legs Elevated Compression Hold',
    caption: 'Yellow Dude calisthenics gate progression: hands on floor or plates, push down to lift hips, legs straight.',
    keyCues: [
      'Depress scapulae hard through palms into floor or weight plates',
      'Compress quads toward chest using hip flexors and deep lower abdominals',
      'Point toes and lock knees straight (tuck knees if regressing)',
      'Accumulate 60 seconds total work across quality clusters'
    ],
    jointAngleCues: {
      start: 'Seated hands beside hips',
      bottom: '90° hip flexion with body completely hovering off ground'
    },
    trajectoryNote: 'Static isometric levitation resisting gravity.',
    safetyNote: 'Develops immense straight-arm scapular depression strength and hip flexor endurance.'
  },

  t3_kb_arm_superset: {
    id: 't3_kb_arm_superset',
    exerciseName: 'Antagonist Arm Superset',
    diagramType: 'arms',
    startPositionLabel: '1. Neutral Arm Alignment',
    bottomPositionLabel: '2. Peak Bicep/Tricep Contraction',
    caption: 'Kettlebell Hammer Curl paired directly with Overhead Tricep Extension. Antagonist pump with zero elbow strain.',
    keyCues: [
      'Hammer Curl: neutral grip on kettlebell handle, pin elbows to ribs',
      'Tricep Extension: flare elbows slightly forward, stretch triceps deep behind neck',
      'Strict 30X1 tempo: 3s eccentric lower, explosive contraction',
      'Do not rock torso or use momentum'
    ],
    jointAngleCues: {
      start: 'Straight arm lockout with active joint centration',
      bottom: 'Acute elbow flexion followed by full overhead tricep lockout'
    },
    trajectoryNote: 'Rotational arc of the forearm around a fixed elbow pivot.',
    safetyNote: 'Neutral grip protects the common extensor and flexor tendons at the elbow.'
  },

  // --- WARMUP SEQUENCES (ALL SESSIONS) ---
  // Lower A:
  w_lower_a_1: {
    id: 'w_lower_a_1',
    exerciseName: 'Rowing Machine Reverse Leg-Drive',
    diagramType: 'warmup_row',
    startPositionLabel: '1. Catch Posture (Vertical Shins)',
    bottomPositionLabel: '2. Reverse Leg-Drive Lockout',
    caption: 'Simulates backward sled pulling. Drive through ball of foot with high resistance to pump blood into the VMO with zero joint impact.',
    keyCues: [
      'Contact through forefoot/balls of feet',
      'Smooth powerful leg push with upright torso',
      'Pumps synovial fluid into patellar tendon',
      'Maintain steady 18–20 strokes per minute cadence'
    ],
    jointAngleCues: {
      start: 'Ankle dorsiflexion, shins vertical at catch',
      bottom: '180° full knee extension push'
    },
    trajectoryNote: 'Linear horizontal leg-drive glide.',
    safetyNote: 'Zero knee shear: safe for acute patellar tendinitis.'
  },

  w_lower_a_2: {
    id: 'w_lower_a_2',
    exerciseName: 'Alyssa Lu 90/90 Positional Breathing + Bridge',
    diagramType: 'warmup_90_90',
    startPositionLabel: '1. 90/90 Supine Heel Dig',
    bottomPositionLabel: '2. Pelvic Reset Bridge & Exhale Hold',
    caption: 'Dig heels into bench to activate hamstrings, posterior pelvic tilt to turn off overactive psoas, 5s inhale / 8s full exhale.',
    keyCues: [
      'Feet flat on wall or bench at 90° hips and knees',
      'Dig heels down firmly to fire hamstrings',
      'Gently roll tailbone off floor without arching back',
      'Exhale all air out, hold 3s to lock ribs down'
    ],
    jointAngleCues: {
      start: '90° hip and knee flexion supine',
      bottom: 'Posterior pelvic tilt with 2-inch tailbone elevation'
    },
    trajectoryNote: 'Isometric heel-dig with rotational pelvic tilt.',
    safetyNote: 'Resets anterior pelvic tilt to protect lumbar spine.'
  },

  w_lower_a_3: {
    id: 'w_lower_a_3',
    exerciseName: 'Eugene Teo Standing Calf Raise (Pre-Fatigue)',
    diagramType: 'warmup_calf',
    startPositionLabel: '1. Deep Deficit Heel Stretch',
    bottomPositionLabel: '2. Peak Plantarflexion Squeeze',
    caption: 'Pre-fatigues calves to stabilize talocrural joint and remove compensatory forward knee shear during squats.',
    keyCues: [
      'Balls of feet on 2-inch plate or block',
      '3-second controlled eccentric stretch into deep deficit',
      'Explode up onto big toe and hold 2-second squeeze',
      'Knees stay straight throughout'
    ],
    jointAngleCues: {
      start: 'Deep ankle dorsiflexion (heels below plate)',
      bottom: 'Maximum plantarflexion up on toes'
    },
    trajectoryNote: 'Vertical ankle pivot with 3012 tempo.',
    safetyNote: 'Strong calf tension stabilizes knee joint alignment.'
  },

  w_lower_a_4: {
    id: 'w_lower_a_4',
    exerciseName: 'Eugene Teo Light KB Romanian Hinge (Pre-Fatigue)',
    diagramType: 'rdl',
    startPositionLabel: '1. Upright Standing Hold',
    bottomPositionLabel: '2. Posterior Hip Hinge Stretch',
    caption: 'Light 18–25 lb kettlebell. Pre-activates hamstring co-contraction to pull tibia posteriorly and protect patellar tendon.',
    keyCues: [
      'Push hips back while maintaining proud chest',
      'Soft 15° knee bend that stays fixed',
      'Feel hamstrings load as KB lowers past knees',
      '1-second pause at bottom stretch before driving up'
    ],
    jointAngleCues: {
      start: 'Standing erect posture',
      bottom: '75–90° hip hinge with flat back'
    },
    trajectoryNote: 'Linear hip hinge translation.',
    safetyNote: 'Guards against anterior cruciate and patellar shear.'
  },

  w_lower_a_5: {
    id: 'w_lower_a_5',
    exerciseName: 'Squat U Ankle Mobilization & Tripod Rooting',
    diagramType: 'warmup_ankle',
    startPositionLabel: '1. Half-Kneeling Neutral Stance',
    bottomPositionLabel: '2. Knee Past Toes Over 2nd/3rd Toe',
    caption: 'Dr. Aaron Horschig mobility drill: drives talocrural dorsiflexion while rooting big toe, pinky toe, and heel.',
    keyCues: [
      'Keep front heel glued to the floor',
      'Drive knee straight out over the 2nd and 3rd toes',
      'Do not allow arch to collapse inward (foot tripod locked)',
      '10 slow pulses per side'
    ],
    jointAngleCues: {
      start: '90° half-kneeling ankle angle',
      bottom: 'Deep closed-chain ankle dorsiflexion'
    },
    trajectoryNote: 'Horizontal forward knee glide over midfoot tripod.',
    safetyNote: 'Restores ankle range to eliminate valgus knee collapse.'
  },

  // Upper A:
  w_upper_a_1: {
    id: 'w_upper_a_1',
    exerciseName: 'Indian Club Rotational Circles & Casts',
    diagramType: 'warmup_club',
    startPositionLabel: '1. Guard Position (Chest Level)',
    bottomPositionLabel: '2. Heart Cast & Behind-Head Circle',
    caption: 'Uses 2 lb or 5 lb Indian clubs to lubricate glenohumeral capsule and activate rotator cuff before pressing.',
    keyCues: [
      'Light grip with fluid wrist movement',
      'Cast club over opposite shoulder and circle behind neck',
      'Smooth continuous circles without jerky stops',
      'Maintain tall posture and breathe nasally'
    ],
    jointAngleCues: {
      start: 'Elbow bent at 90°, club vertical',
      bottom: 'Full rotational shoulder circle through 360°'
    },
    trajectoryNote: 'Multi-planar circular loops and transverse spirals.',
    safetyNote: 'Warms up supraspinatus, infraspinatus, and subscapularis.'
  },

  w_upper_a_2: {
    id: 'w_upper_a_2',
    exerciseName: 'Athlean-X Scapular Retractions & Depressions',
    diagramType: 'warmup_scapular',
    startPositionLabel: '1. Arms Forward (Protract Scapula)',
    bottomPositionLabel: '2. Scapular Pinch & Depress Down',
    caption: 'Jeff Cavaliere shoulder health activator: pinch shoulder blades down and back to seat humeral head in glenoid socket.',
    keyCues: [
      'Keep elbows completely straight',
      'Imagine pinching a pencil between shoulder blades',
      'Pull shoulder blades down toward back pockets',
      'Hold 2-second hard squeeze at end range'
    ],
    jointAngleCues: {
      start: 'Protracted scapulae with neutral humerus',
      bottom: 'Retracted and depressed scapulae'
    },
    trajectoryNote: 'Horizontal and downward scapular gliding.',
    safetyNote: 'Eliminates shoulder impingement during bench press.'
  },

  w_upper_a_3: {
    id: 'w_upper_a_3',
    exerciseName: 'McGill Bird-Dog Core & Lat Tension Priming',
    diagramType: 'core_mcgill',
    startPositionLabel: '1. Quadruped Tabletop Setup',
    bottomPositionLabel: '2. Opposite Arm & Leg Extended Line',
    caption: 'Dr. Stuart McGill core stability drill: extend opposite arm and leg, clench fist, push heel back, hold 10 seconds.',
    keyCues: [
      'Zero rotation of pelvis or dipping of lower back',
      'Clench fist forward as if punching through a wall',
      'Drive opposite heel back as if pushing through a wall',
      'Engage lat on the extended arm'
    ],
    jointAngleCues: {
      start: '90° hips and shoulders quadruped',
      bottom: '180° horizontal line from wrist to heel'
    },
    trajectoryNote: 'Anti-rotational isometric hold against gravity.',
    safetyNote: 'Guards against lumbar flexion and extension shear.'
  },

  // Lower B:
  w_lower_b_1: {
    id: 'w_lower_b_1',
    exerciseName: 'Alyssa Lu 10-Minute Active Hip Reset Protocol',
    diagramType: 'warmup_hip',
    startPositionLabel: '1. Seated 90/90 Neutral Spine',
    bottomPositionLabel: '2. Chest Lean Over Front Femur',
    caption: 'Active hip decompression: seated 90/90 posture with active internal and external hip rotation and gentle forward hinge to decompress posterior chain.',
    keyCues: [
      'Maintain tall upright spine with 90° angles at front and rear knees',
      'Hinge forward from hips over front thigh without rounding lower back',
      'Actively press front knee and ankle into floor to activate glutes',
      'Perform 10 controlled hip switches and 5 deep diaphragmatic breaths'
    ],
    jointAngleCues: {
      start: '90° front external rotation, 90° rear internal rotation',
      bottom: 'Forward hip hinge with neutral lumbar spine'
    },
    trajectoryNote: 'Transverse hip rotation and anterior pelvic mobilization.',
    safetyNote: 'Levels pelvis and reciprocally relaxes tight hamstrings.'
  },


  w_lower_b_2: {
    id: 'w_lower_b_2',
    exerciseName: 'ATG Elephant Walks (Active Reciprocal Lengthening)',
    diagramType: 'warmup_elephant',
    startPositionLabel: '1. Hands on Support (Knees Soft)',
    bottomPositionLabel: '2. Unilateral Knee Lock (Hamstring Floss)',
    caption: 'Ben Patrick ATG hamstring flossing: alternate locking one knee at a time while hands rest on bench or floor.',
    keyCues: [
      'Rest hands comfortably on bench, rack, or floor',
      'Lock working knee completely straight with strong quad squeeze',
      'Bend opposite knee to allow pelvis to shift smoothly',
      'Exhale as you achieve full knee lockout (20 reps/leg)'
    ],
    jointAngleCues: {
      start: 'Hinged forward with soft knees',
      bottom: 'Alternating 180° full knee extension'
    },
    trajectoryNote: 'Alternating reciprocal knee extension cycles.',
    safetyNote: 'Replaces dangerous ballistic hamstring stretching.'
  },

  w_lower_b_3: {
    id: 'w_lower_b_3',
    exerciseName: 'Rowing Machine Steady Rhythm Flush',
    diagramType: 'warmup_row',
    startPositionLabel: '1. Steady Catch Position',
    bottomPositionLabel: '2. Full Drive & Hip Opening',
    caption: 'Low resistance aerobic flush to lubricate hip joints and lumbar facet joints through rhythmic low-impact hinging.',
    keyCues: [
      'Low resistance setting (damper 3-4)',
      'Maintain smooth 20 SPM stroke rate',
      'Drive with legs first, then swing torso, then pull arms',
      'Diaphragmatic breathing to oxygenate tissues'
    ],
    jointAngleCues: {
      start: 'Compressed catch position',
      bottom: 'Full leg extension with slight body lean'
    },
    trajectoryNote: 'Cyclic horizontal stroke pattern.',
    safetyNote: 'Pumps blood into lumbar discs without spinal loading.'
  },

  // Upper B:
  w_upper_b_1: {
    id: 'w_upper_b_1',
    exerciseName: 'Athlean-X Active Scapular Dead Hang Pulls',
    diagramType: 'warmup_dead_hang',
    startPositionLabel: '1. Passive Dead Hang Overhead',
    bottomPositionLabel: '2. Active Scapular Pull (Elevate Body)',
    caption: 'Jeff Cavaliere vertical prep: hang with relaxed shoulders, then actively pull shoulder blades down to elevate body without bending elbows.',
    keyCues: [
      'Elbows remain completely locked straight throughout',
      'Pull shoulder blades down toward back pockets',
      'Body raises 2-3 inches purely from scapular movement',
      'Hold top active squeeze for 2 full seconds'
    ],
    jointAngleCues: {
      start: 'Passive 180° overhead hang with elevated scapulae',
      bottom: 'Active scapular depression with engaged lower traps'
    },
    trajectoryNote: 'Pure vertical elevation driven by scapulothoracic muscles.',
    safetyNote: 'Primes serratus anterior and protects rotator cuff for overhead press.'
  },

  w_upper_b_2: {
    id: 'w_upper_b_2',
    exerciseName: 'Indian Club Shoulder Spirals & Casts',
    diagramType: 'warmup_club',
    startPositionLabel: '1. Cast Position Above Shoulder',
    bottomPositionLabel: '2. Transverse Spiral Arc Around Back',
    caption: 'Rotational shoulder mobility with 2 lb or 5 lb Indian clubs. Opens thoracic spine and lubricates shoulder capsule.',
    keyCues: [
      'Fluid, relaxed circular motions',
      'Allow momentum of the club to gently stretch the shoulder',
      'Keep ribs down and core braced',
      'Perform 10 large circles clockwise, then 10 counter-clockwise'
    ],
    jointAngleCues: {
      start: 'Shoulder in 90° abduction and flexion',
      bottom: 'Multi-planar external rotation and extension arc'
    },
    trajectoryNote: 'Fluid 3D circular arc pattern.',
    safetyNote: 'Builds resilience against shoulder impingement.'
  },

  w_upper_b_3: {
    id: 'w_upper_b_3',
    exerciseName: 'Scapular Wall Slides + 360 Brace',
    diagramType: 'warmup_wall_slide',
    startPositionLabel: '1. W-Position (Forearms Against Wall)',
    bottomPositionLabel: '2. Y-Reach (Full Overhead Extension)',
    caption: 'Dr. Aaron Horschig upper back activator: back and forearms flat against wall, slide up into Y-position while keeping ribs down.',
    keyCues: [
      'Lower back, elbows, and wrists must remain in contact with wall',
      'Slide arms up into a Y-shape without arching lower back',
      'Exhale as you reach top, inhale as you lower to W',
      'Pause 1 second at top reach'
    ],
    jointAngleCues: {
      start: '90° elbow flexion, 90° shoulder abduction (W shape)',
      bottom: 'Full overhead reach in scapular plane (Y shape)'
    },
    trajectoryNote: 'Vertical sliding arc against a wall surface.',
    safetyNote: 'Isolates lower trapezius and prevents compensatory lumbar arching.'
  },

  // Legacy Aliases:
  wu_sled_backward_walk: {
    id: 'wu_sled_backward_walk',
    exerciseName: 'Backward Walking / Sled Drag',
    diagramType: 'warmup_walk',
    startPositionLabel: '1. Toe-to-Heel Roll',
    bottomPositionLabel: '2. Full Knee Extension Push',
    caption: 'Ben Patrick ATG knee-bulletproofing warmup: walk backward rolling from toe to heel with knee driving over toe.',
    keyCues: [
      'Contact ground with forefoot first, rolling backward to heel',
      'Drive each step through the big toe knuckle into full knee lockout',
      'Pumps synovial fluid and blood into the avascular patellar tendon',
      'Zero impact shear on the knees'
    ],
    jointAngleCues: {
      start: 'Active knee flexion with forward tibia',
      bottom: 'Full backward extension and quad pump'
    },
    trajectoryNote: 'Continuous backward linear walking mechanics.',
    safetyNote: 'First rule of ATG: Backward movement brings blood to knees without pain.'
  },

  wu_atg_elephant_walks: {
    id: 'wu_atg_elephant_walks',
    exerciseName: 'ATG Elephant Walks',
    diagramType: 'warmup_elephant',
    startPositionLabel: '1. Forward Fold Hands on Support',
    bottomPositionLabel: '2. Alternating Knee Lock & Hamstring Floss',
    caption: 'Hands on bench or floor, alternating locking one knee at a time to pump and decompress tight hamstrings and calves.',
    keyCues: [
      'Place hands on bench, rack, or floor',
      'Alternate locking one knee completely straight while bending the other',
      'Feel deep active stretch in the hamstring and gastrocnemius',
      'Nasal breathing: exhale on each knee lockout'
    ],
    jointAngleCues: {
      start: 'Forward hip flexion with bent knees',
      bottom: 'Alternating 180° full knee lockout with active hamstring length'
    },
    trajectoryNote: 'Alternating unilateral knee extension in a hip-hinged position.',
    safetyNote: 'Active eccentric elongation instead of aggressive passive hamstring pulling.'
  },

  // --- ATHLEAN-X DAILY ABS PROTOCOL ---
  t3_athlean_hanging_knee_raise: {
    id: 't3_athlean_hanging_knee_raise',
    exerciseName: 'Athlean-X Hanging Knee Raise with Pelvic Curl',
    diagramType: 'pullup',
    startPositionLabel: '1. Active Dead Hang (Depressed Scapulae)',
    bottomPositionLabel: '2. Top Pelvic Curl (Show Tailbone)',
    caption: 'Jeff Cavaliere kinetic sequence step 1: curl pelvis upward toward chest, not just lifting thighs with hip flexors.',
    keyCues: [
      'Grip bar shoulder-width, engage lats and shoulders into active hang',
      'Curl pelvis upward toward ribcage into posterior tilt',
      'Pause 2 seconds at peak contraction while exhaling all air',
      'Lower under 2s control with zero backward leg swinging'
    ],
    jointAngleCues: {
      start: '180° vertical suspension with packed shoulders',
      bottom: '120° hip flexion with posterior pelvic tilt'
    },
    trajectoryNote: 'Bottom-up rotational arc curling pelvis towards ribcage.',
    safetyNote: 'Eliminates psoas dominance and prevents lumbar hyperextension shear.'
  },

  t3_athlean_hanging_corkscrew: {
    id: 't3_athlean_hanging_corkscrew',
    exerciseName: 'Athlean-X Hanging Corkscrews',
    diagramType: 'pullup',
    startPositionLabel: '1. Active Hang Centerline',
    bottomPositionLabel: '2. Diagonal Knee Drive to Armpit',
    caption: 'Bottom-up rotational oblique drive: lift knees diagonally toward opposite armpit, twisting pelvis with strict control.',
    keyCues: [
      'Active bar hang with thumbs wrapped around bar',
      'Twist pelvis 30–45° and drive knees toward armpit',
      '1s deliberate pause at top twist to wring out obliques',
      'Alternate sides smoothly with zero momentum'
    ],
    jointAngleCues: {
      start: 'Vertical centerline hang',
      bottom: '30–45° transverse pelvic rotation at peak height'
    },
    trajectoryNote: 'Diagonal corkscrew arc rotating pelvis against fixed ribcage.',
    safetyNote: 'Recruits internal and external oblique slings in synergy with lower abs.'
  },

  t3_athlean_hollow_body_hold: {
    id: 't3_athlean_hollow_body_hold',
    exerciseName: 'Athlean-X Hollow Body Core Compression',
    diagramType: 'lsit',
    startPositionLabel: '1. Supine Floor Setup (Zero Gap)',
    bottomPositionLabel: '2. Banana Curved Compression Hold',
    caption: 'Yellow Dude & Athlean-X anti-extension gate: press lumbar spine flush against floor, elevate extremities 4–6 inches.',
    keyCues: [
      'Lower back glued flat against floor with zero air gap',
      'Arms overhead, legs extended straight, toes pointed',
      'Draw navel in toward spine while breathing diaphragmatically',
      'Maintain continuous isometric compression for 25–35s'
    ],
    jointAngleCues: {
      start: '180° flat supine alignment on floor',
      bottom: '15° shallow curved banana flexion'
    },
    trajectoryNote: 'Static isometric anti-extension core hold.',
    safetyNote: 'If lower back arches away from floor, immediately bend knees to protect spine.'
  },

  t3_athlean_cross_mountain_climber: {
    id: 't3_athlean_cross_mountain_climber',
    exerciseName: 'Athlean-X Cross-Body Mountain Climbers',
    diagramType: 'core_mcgill',
    startPositionLabel: '1. High Push-Up Plank Base',
    bottomPositionLabel: '2. Cross-Body Knee Drive to Opposite Elbow',
    caption: 'Top-down rotational drive: slow, deliberate cross-body knee drive with 1s oblique squeeze.',
    keyCues: [
      'Hands under shoulders, push floor away (protracted scapulae)',
      'Drive right knee diagonally across to left elbow',
      'Hold 1 second at contact to squeeze obliques',
      'Step back smoothly and repeat on opposite side'
    ],
    jointAngleCues: {
      start: '180° straight-line push-up plank',
      bottom: '45° cross-body transverse hip flexion'
    },
    trajectoryNote: 'Diagonal linear knee drive across the sagittal plane.',
    safetyNote: 'Maintain level hips; do not let lower back sag or hips pike up.'
  },

  t3_athlean_iso_crunch: {
    id: 't3_athlean_iso_crunch',
    exerciseName: 'Athlean-X 2-Second Peak Squeeze Floor Curl-Up',
    diagramType: 'core_mcgill',
    startPositionLabel: '1. Supine 90° Bent-Knee Setup',
    bottomPositionLabel: '2. 30° Thoracic Curl with 2s Squeeze',
    caption: 'Top-down flexion: curl only shoulder blades off floor (30°), exhale all air, squeeze upper rectus abdominis for 2 full seconds.',
    keyCues: [
      'Knees bent 90°, fingertips lightly touching temples (never pull neck)',
      'Tuck chin slightly (apple under chin)',
      'Curl shoulder blades 1–2 inches off floor as you exhale completely',
      'Hold peak isometric squeeze for 2 seconds before slow descent'
    ],
    jointAngleCues: {
      start: 'Supine flat floor rest',
      bottom: '30° thoracic flexion (lumbar remains grounded)'
    },
    trajectoryNote: 'Short upward thoracic flexion arc without hip flexor involvement.',
    safetyNote: 'Stopping at 30° protects lumbar discs from loaded spinal flexion.'
  },

  t3_athlean_serratus_plank: {
    id: 't3_athlean_serratus_plank',
    exerciseName: 'Athlean-X Serratus Elbow-to-Knee Plank',
    diagramType: 'core_mcgill',
    startPositionLabel: '1. Forearm Plank Alignment',
    bottomPositionLabel: '2. Active Serratus & Elbow-Toe Drag',
    caption: 'Jeff Cavaliere & Stuart McGill core cylinder finisher: protract shoulder blades, isometrically pull elbows toward toes.',
    keyCues: [
      'Elbows directly under shoulders, forearms parallel',
      'Push floor away to protract scapulae (serratus activation)',
      'Tuck pelvis into slight posterior tilt and squeeze glutes',
      'Isometrically pull elbows toward toes to create intense 360° brace'
    ],
    jointAngleCues: {
      start: 'Forearm plank neutral alignment',
      bottom: 'Rigid 180° cylinder under maximum isometric tension'
    },
    trajectoryNote: 'Sustained isometric core cylinder stabilization.',
    safetyNote: 'Creates maximum spinal stiffness in 30–45s without joint hanging.'
  },

  w_abs_1: {
    id: 'w_abs_1',
    exerciseName: 'Dr. Stuart McGill Cat-Camel Spinal Wave',
    diagramType: 'warmup_hip',
    startPositionLabel: '1. Gentle Camel Sag (Extension)',
    bottomPositionLabel: '2. Gentle Cat Arch (Flexion)',
    caption: 'Stuart McGill motion cycle: 4s gentle arch up, 4s smooth sag down. Lubricates intervertebral discs without loading.',
    keyCues: [
      'Hands under shoulders, knees under hips',
      'Slow 4s wave into flexion, slow 4s wave into extension',
      'Motion cycle to reduce internal disc friction, NOT a forced stretch',
      '6 smooth, relaxed cycles'
    ],
    jointAngleCues: {
      start: 'Neutral quadruped base',
      bottom: 'Pain-free spinal wave range'
    },
    trajectoryNote: 'Sagittal undulating spinal articulation.',
    safetyNote: 'Do not push into painful end-range flexion or extension.'
  },

  w_abs_2: {
    id: 'w_abs_2',
    exerciseName: 'Athlean-X 90/90 Diaphragmatic Vacuum Breath',
    diagramType: 'warmup_90_90',
    startPositionLabel: '1. 90/90 Supine Setup & 360 Inhale',
    bottomPositionLabel: '2. Forced Exhale & Transverse Vacuum',
    caption: 'Jeff Cavaliere deep core primer: 4s 360° inhale, 8s forced exhale, pull navel to spine for 3s vacuum hold.',
    keyCues: [
      'Calves resting on bench or chair at 90 degrees',
      'Inhale 4s through nose expanding belly 360 degrees',
      'Exhale forcefully 8s through pursed lips until lungs are empty',
      'Draw navel in toward spine and hold vacuum 3 seconds'
    ],
    jointAngleCues: {
      start: '90° hip and knee flexion supported on bench',
      bottom: 'Full abdominal wall retraction (vacuum)'
    },
    trajectoryNote: 'Respiratory diaphragmatic expansion and contraction.',
    safetyNote: 'Primes transversus abdominis as the body\'s natural weight belt.'
  },

  // --- POST-BJJ RECOVERY AB WORKOUT ---
  t3_bjj_hanging_knee_raise: {
    id: 't3_bjj_hanging_knee_raise',
    exerciseName: 'Athlean-X Post-Grappling Hanging Knee Raise & Pelvic Decompression',
    diagramType: 'pullup',
    startPositionLabel: '1. Active Dead Hang (Depressed Scapulae)',
    bottomPositionLabel: '2. Posterior Pelvic Tilt Curl',
    caption: 'Post-grappling spinal decompression & lower core: curl pelvis upward to expand compressed lumbar discs without psoas hyperextension.',
    keyCues: [
      'Grip pull-up bar shoulder-width; engage lats to depress scapulae',
      'Exhale and curl pelvis upward toward sternum (posterior tilt)',
      'Pause 2 seconds at peak squeeze; do NOT use swinging momentum',
      'Lower under strict 2-second control to full dead hang traction'
    ],
    jointAngleCues: {
      start: '180° shoulder flexion, neutral pelvis',
      bottom: 'Knees to chest, 20°–30° upward posterior pelvic rotation'
    },
    trajectoryNote: 'Curvilinear bottom-up rotational pelvis curl.',
    safetyNote: 'Eliminates lumbar compression and decompresses spinal discs after guard play.'
  },

  t3_bjj_hollow_body_hold: {
    id: 't3_bjj_hollow_body_hold',
    exerciseName: 'Athlean-X Grappler Hollow Body Core Compression Hold',
    diagramType: 'lsit',
    startPositionLabel: '1. Supine Floor Setup (Zero Gap)',
    bottomPositionLabel: '2. Hollow Body Tension Arch',
    caption: 'Grappler core compression: press lumbar spine flush against floor with zero air gap, restoring cylindrical intra-abdominal pressure.',
    keyCues: [
      'Lower back glued flat against floor with zero air gap',
      'Arms overhead and legs extended 4–6 inches off mat',
      'Posterior pelvic tilt with glutes actively squeezed',
      'Continuous rhythmic nasal breathing throughout isometric hold'
    ],
    jointAngleCues: {
      start: 'Supine flat on mat',
      bottom: 'C-shaped anterior torso curvature with lumbar grounded'
    },
    trajectoryNote: 'Static isometric anti-extension core compression.',
    safetyNote: 'If lower back arches off floor, immediately regress to bent-knee tuck hollow.'
  },

  t3_bjj_cross_mountain_climber: {
    id: 't3_bjj_cross_mountain_climber',
    exerciseName: 'Athlean-X Cross-Body Oblique Climbers & Serratus Punch',
    diagramType: 'core_mcgill',
    startPositionLabel: '1. High Push-Up Plank Base',
    bottomPositionLabel: '2. Cross-Body Knee-to-Elbow Squeeze',
    caption: 'Post-grappling rotational reset: drive knee across torso to opposite elbow to balance asymmetric rotation from guard passing.',
    keyCues: [
      'Set rigid push-up plank, protracting shoulder blades',
      'Drive right knee diagonally across torso toward left elbow',
      'Hold 1-second peak squeeze at opposite elbow with full exhale',
      'Return with control and alternate sides with zero hip sag'
    ],
    jointAngleCues: {
      start: 'High plank neutral spine',
      bottom: 'Transverse pelvic rotation across rigid upper torso'
    },
    trajectoryNote: 'Top-down diagonal cross-torso rotational drive.',
    safetyNote: 'Keep pelvis level; do not let hips shoot up or sag.'
  },

  t3_bjj_mcgill_curl_up: {
    id: 't3_bjj_mcgill_curl_up',
    exerciseName: 'Dr. Stuart McGill Post-Grappling Isometric Curl-Up & Vacuum Brace',
    diagramType: 'core_mcgill',
    startPositionLabel: '1. Supine Neutral Spine with Hands Under Lumbar',
    bottomPositionLabel: '2. Unitized Head & Shoulder Elevation',
    caption: 'Dr. Stuart McGill spinal-sparing core curl-up: preserve neutral lumbar curve with hands while elevating head and shoulders 1 inch.',
    keyCues: [
      'One knee bent at 90°, other leg flat on mat',
      'Place hands under lower back to preserve natural neutral lordosis',
      'Elevate head and shoulders as a single rigid unit 1–2 inches off mat',
      'Hold 3–5 seconds while maintaining full 360° abdominal brace'
    ],
    jointAngleCues: {
      start: 'Neutral lumbar supported by hands, one knee 90°',
      bottom: '15°–20° thoracic elevation without neck flexing'
    },
    trajectoryNote: 'Minimal thoracic elevation with zero lumbar movement.',
    safetyNote: 'Golden standard for spinal sparing: zeroes out disc shear.'
  }
};
