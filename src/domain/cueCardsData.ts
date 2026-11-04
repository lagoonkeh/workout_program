// src/domain/cueCardsData.ts

import type { CueCard } from './cueCardTypes';

export type { CreatorAttribution, LengthenedPartialsProtocol, CueCard } from './cueCardTypes';

export const CUE_CARDS: CueCard[] = [
  // ==========================================
  // WORKING EXERCISES (T1, T2, T3)
  // ==========================================
  {
    id: 'cue_01_bb_squat',
    exerciseId: 't1_bb_squat',
    exerciseName: 'Barbell Back Squat',
    title: 'Barbell Back Squat',
    tier: 'T1',
    tempo: '31X1',
    prescribedTempo: '31X1',
    primaryMuscles: ['Quadriceps', 'Glutes', 'Adductors', 'Spinal Erectors'],
    equipment: 'Olympic Barbell & Squat Rack',
    setup: 'Position barbell at mid-sternum height; grip bar with hands close; step back into shoulder-width stance with toes flared 15-30 degrees.',
    setupInstructions: [
      'Phase 1 — Equipment & Barbell Placement: Set the J-hooks so the barbell sits at mid-sternum height (never have to press onto your toes to unrack). Grip the barbell as narrow as your shoulder mobility allows to pack upper back tension. Step under the bar and wedge it securely across your upper trapezius (high-bar) or over the posterior deltoid shelf (low-bar).',
      'Phase 2 — Stance & Foot Tripod Rooting: Unrack the bar with both feet squarely underneath you. Take exactly two deliberate steps backward. Establish a shoulder-width stance with toes flared outward 15–30°. Root your foot tripod: actively press the big toe knuckle, pinky toe knuckle, and center of your heel into the floor while screwing your feet outward to generate external rotation torque at the hips.',
      'Phase 3 — 360° Diaphragmatic Breath & Core Cylinder Brace: Inhale a deep diaphragmatic breath into your lower abdomen, obliques, and lower back—expanding outward 360 degrees like a pressurized cylinder. Pull your lower ribs down toward your pelvis and clench your abdominal wall as if bracing for a direct punch.',
      'Phase 4 — Controlled Eccentric Descent (3–4s Tempo): Initiate the squat by breaking simultaneously at the hips and knees. Lower under strict control for a full 3 to 4 seconds. Push your knees out in line with your toes, tracking smoothly over the second toe. Keep your torso angle consistent and prevent your chest from collapsing forward.',
      'Phase 5 — Bottom Turnaround & Stabilization (1s Pause): Descend until the hip crease dips just below the top of the patella (parallel depth). Stop all downward momentum and hold active muscular tension for a full 1-second pause. Zero bouncing, rebounding, or sinking into ligamentous slack in the hole.',
      'Phase 6 — Concentric Drive & Lockout Reset: Drive forcefully into the floor through the whole foot tripod, pushing the floor away. Ascend with chest and hips rising at the exact same rate. Squeeze glutes and quads to complete lockout at the top, exhale through pursed lips, and reset your 360° brace before initiating the next rep.'
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
      },
      {
        creator: 'Lucas Hardie (Range of Strength)',
        quote: 'To achieve extreme squat depth and pelvic centration without impingement, rotate your pelvis into anterior tilt and actively drive your knees wide. Flexibility is not passive relaxation—it is an active feat of antagonist pulling.',
        biomechanicalRationale: 'Active hip abduction and anterior pelvic tilt clears the femoral head within the acetabular rim, allowing deep hip flexion without femoral-acetabular impingement.'
      }
    ],
    commonFaults: [
      'Inward knee cave (valgus collapse) on concentric drive.',
      'Rushing the eccentric and bouncing out of the bottom position, causing high impact shear spikes on the patellar tendon.',
      'Weight shifting forward onto toes with heels lifting off the floor.',
      'Lumbar rounding (butt wink) at maximum depth.'
    ],
    rehabRegressions: [
      'Level 1: Barbell Box Squat to parallel (shins perpendicular, zero forward patellar shear).',
      'Level 2: Goblet box squat to a high box (upright torso and near-vertical shins offload the knees).'
    ]
  },
  {
    id: 'cue_02_atg_split_squat',
    exerciseId: 't2_atg_split_squat',
    exerciseName: 'ATG Split Squat',
    title: 'ATG Split Squat',
    tier: 'T2',
    tempo: '31X1',
    prescribedTempo: '31X1',
    primaryMuscles: ['Vastus Medialis Oblique (VMO)', 'Patellar Tendon', 'Psoas / Hip Flexors', 'Glutes'],
    equipment: 'Kettlebell or Bodyweight (Platform/Plates for Elevation)',
    setup: 'Adopt a long split stance: front foot flat on floor or elevated on plates/bench; rear leg extended straight behind; torso tall.',
    setupInstructions: [
      'Phase 1 — Stance & Elevation Setup: Adopt a long split stance. Position front foot flat on the floor or elevated on 2–6" weight plates/bench (essential if knee pain is > 2/10). Extend rear leg straight behind you with rear heel naturally elevated.',
      'Phase 2 — Upright Torso & Glute Lock: Maintain a tall, perpendicular torso. Actively squeeze the rear glute to open up the iliopsoas and prevent lumbar hyperextension. Brace your core lightly.',
      'Phase 3 — Slow Eccentric Descent (3–4s Tempo): Descend over 3 to 4 seconds by translating your front knee forward directly over your toes. Allow the hamstring to travel toward full contact with the calf.',
      'Phase 4 — Full Knee Bend Stretch (1s Pause): Aim for full hamstring-to-calf coverage at the bottom. Keep your rear knee hovering just above the floor without resting on the ground. Hold this maximum stretch for 1 second to remodel patellar tenocytes under tensile strain.',
      'Phase 5 — Concentric Pushback: Push through the entire front foot (heel and forefoot balance) while maintaining rear glute tension. Rise smoothly back to the top position.',
      'Phase 6 — Unilateral Integrity: Keep hips perfectly square to the front—never allow the rear hip to flare open laterally. Complete all prescribed reps on one leg before resting and switching sides.'
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
      },
      {
        creator: 'Lucas Hardie (Range of Strength)',
        quote: 'In any deep split or lunge, prioritize a squared pelvis over turned-out martial arts hips. Internal rotation of the rear hip directly loads the psoas and rectus femoris at extreme length, transforming hip extension into an active strength feat.',
        biomechanicalRationale: 'Squaring the pelvis ensures true loaded hip extension of the rear leg, stimulating sarcomere addition in series and restoring anterior kinetic chain elasticity.'
      }
    ],
    commonFaults: [
      'Dropping into deep knee bend too rapidly without controlling the eccentric phase.',
      'Allowing the rear hip to flare open laterally instead of remaining square to the front.',
      'Pushing through active tendon pain rather than utilizing front-foot elevation.',
      'Resting rear knee on the floor and losing muscular tension.'
    ],
    rehabRegressions: [
      'Level 0: Front foot elevated 12–18" on bench, hands supported on rack uprights.',
      'Level 1: Front foot elevated 6" on weight plates.',
      'Level 2: Flat ground bodyweight.',
      'Level 3: Loaded with kettlebell.'
    ],
    lengthenedPartialsProtocol: {
      recommendation: 'Perform 3–5 lengthened partial pulses in the bottom 50% range after achieving technical full-ROM fatigue.',
      targetRangeNote: 'From full hamstring-on-calf deep knee flexion up to 45° knee flexion, reversing before the quadriceps deload.',
      scientificRationale: 'Milo Wolf et al. (2023/2024 meta-analysis) & Pedrosa et al.: Loading the rectus femoris and vastus medialis at long muscle lengths stimulates stretch-mediated hypertrophy and increases distal tendon compliance.'
    }
  },
  {
    id: 'cue_03_bb_rdl',
    exerciseId: 't1_bb_rdl',
    exerciseName: 'Barbell Romanian Deadlift (RDL)',
    title: 'Barbell Romanian Deadlift (RDL)',
    tier: 'T1',
    tempo: '31X1',
    prescribedTempo: '31X1',
    primaryMuscles: ['Hamstrings', 'Gluteus Maximus', 'Erector Spinae', 'Lats'],
    equipment: 'Olympic Barbell & Plates',
    setup: 'Stand with feet hip-width apart; grip barbell double overhand outside thighs; slight soft unlock in the knees; pack lats.',
    setupInstructions: [
      'Phase 1 — Stance & Grip Setup: Unrack the barbell from mid-thigh height or deadlift from floor. Stand with feet hip-width apart, toes pointing straight forward. Grip the bar double overhand just outside your thighs with thumbs wrapped.',
      'Phase 2 — Lat Packing & Knee Unlock: Pull your shoulder blades down and back, actively "bending the bar" against your thighs to fire the latissimus dorsi. Unlock your knees slightly (15–20° bend) and freeze this knee angle—do not squat down from here.',
      'Phase 3 — Posterior Hip Hinge (3–4s Tempo): Inhale into your core cylinder and brace. Initiate the descent by pushing your hips straight back toward the wall behind you. Lower over 3 to 4 seconds, keeping the bar painted against your thighs and shins at all times (zero forward gap).',
      'Phase 4 — End-Range Stretch & Stabilization (1s Pause): Descend until your hamstrings reach maximum active stretch (typically just below the kneecap or mid-shin). Stop immediately before your lower back rounds or knees bend further. Hold for 1 second of intense hamstring tension.',
      'Phase 5 — Powerful Glute Drive & Lockout: Drive your hips forcefully forward into the bar by squeezing your gluteus maximus and driving your heels into the floor. Stand tall without hyperextending your lumbar spine at the top.',
      'Phase 6 — Lat Tension Maintenance: Ensure the bar never drifts away from your shins. If your hamstrings feel tight, end the range higher rather than compensating with spinal flexion.'
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
      },
      {
        creator: 'Lucas Hardie (Range of Strength)',
        quote: 'Never let gravity pull you down passively into a hinge. Actively pull yourself into deep hip flexion using your hip flexors and abdominals. When you compress actively under load, the hamstrings remodel at their furthest mechanical limit.',
        biomechanicalRationale: 'Active antagonist compression during loaded hip hinging overrides stretch reflex resistance via reciprocal inhibition, maximizing stretch-mediated hypertrophy.'
      }
    ],
    commonFaults: [
      'Squatting the weight down by bending knees excessively rather than pushing hips back.',
      'Allowing the bar to drift away from the shins, shifting stress to the lower back.',
      'Rounding the lumbar spine at the bottom to force fake range of motion.',
      'Hyperextending the lower back at lockout instead of clenching the glutes.'
    ],
    rehabRegressions: [
      'Regression 1: Kettlebell RDL (lighter load and shorter lever decrease lower back shear).',
      'Regression 2: Heavy Kettlebell RDL (35–40 lb KB held between feet).'
    ]
  },
  {
    id: 'cue_04_bb_bench_press',
    exerciseId: 't1_bb_bench_press',
    exerciseName: 'Barbell Bench Press',
    title: 'Barbell Bench Press',
    tier: 'T1',
    tempo: '30X1',
    prescribedTempo: '30X1',
    primaryMuscles: ['Pectoralis Major', 'Anterior Deltoid', 'Triceps Brachii'],
    equipment: 'Olympic Barbell, Plates & Flat Bench in Rack',
    setup: 'Lie supine on bench; 5 points of contact; grip bar slightly wider than shoulder width with thumbs wrapped.',
    setupInstructions: [
      'Phase 1 — 5-Point Setup & Eye Line: Lie supine on the bench with eyes directly beneath the racked barbell. Establish 5 points of contact: head, upper back/shoulders, glutes, left foot flat on floor, right foot flat on floor.',
      'Phase 2 — Scapular Retraction & Grip: Retract and depress your shoulder blades into the bench pad, creating a stable upper-back shelf. Grip the bar slightly wider than shoulder width so forearms are perpendicular to the floor at the chest. Wrap thumbs securely.',
      'Phase 3 — Unrack & Leg Drive Lock: Pull the bar out horizontally over your chest (maintaining retracted scapulae). Inhale a deep 360° breath into your abdomen. Press heels down into the floor to activate full-body leg drive tension.',
      'Phase 4 — Controlled Curved Descent (30X1 Tempo): Tuck elbows to a 45-degree angle relative to your ribs (avoid 90° flare). Lower the barbell over a strict 3 seconds along a gentle J-curve, touching down softly on the lower sternum at the nipple line.',
      'Phase 5 — Explosive Concentric Press: Press the bar forcefully upward and slightly backward toward the rack uprights (finishing directly over the shoulder joints). Squeeze pectorals and lock out triceps.',
      'Phase 6 — Lockout Stability: Keep your shoulder blades pinned against the bench even at full lockout—never protract your shoulders off the pad. Reset breath at the top before the next rep.'
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
      'Lifting buttocks off the bench to cheat the lockout.',
      'Losing upper back tightness and flattening shoulder blades at lockout.'
    ],
    rehabRegressions: [
      'Regression: Barbell Floor Press (limits range of motion to 90° elbow bend, eliminating anterior capsule stress).'
    ]
  },
  {
    id: 'cue_05_kb_single_arm_row',
    exerciseId: 't2_kb_single_arm_row',
    exerciseName: 'Single-Arm Kettlebell Row',
    title: 'Single-Arm Kettlebell Row',
    tier: 'T2',
    tempo: '31X1',
    prescribedTempo: '31X1',
    primaryMuscles: ['Latissimus Dorsi', 'Teres Major', 'Rhomboids', 'Posterior Deltoid'],
    equipment: 'Kettlebell & Flat Bench',
    setup: 'Same-side knee and hand on the bench, other foot on the floor; flat back, bell hanging under the shoulder.',
    setupInstructions: [
      'Phase 1 — Brace on the Bench: Put the non-working knee and hand on the bench, hand under the shoulder. Plant the working-side foot on the floor slightly out to the side.',
      'Phase 2 — Flat Back: Hinge until your torso is close to parallel with the floor. Keep a neutral spine and your head in line with it.',
      'Phase 3 — Dead-Stop Stretch: Let the bell hang straight down and allow the shoulder blade to reach toward the floor for a 1-second stretch.',
      'Phase 4 — Elbow to Hip Pocket (31X1 Tempo): Drive the elbow back toward your hip in a slight arc, keeping the forearm vertical.',
      'Phase 5 — Squeeze: Pause for 1 second with the elbow past the torso and the lat fully contracted. No twisting of the torso.',
      'Phase 6 — Controlled Negative: Lower the bell over 3 seconds back to the full stretch.'
    ],
    creatorCues: [
      {
        creator: 'Coach Eugene Teo',
        quote: 'Pull your elbow toward your back pocket, not straight up to your chest.',
        biomechanicalRationale: 'A hip-ward arc matches the line of the lower and mid lat fibers, so the lat does the work instead of the upper traps and biceps.'
      },
      {
        creator: 'Jeff Nippard',
        quote: 'Let the shoulder blade fully protract at the bottom of every rep and pause in the stretch.',
        biomechanicalRationale: 'Loading the lat at long muscle lengths drives stretch-mediated hypertrophy.'
      },
      {
        creator: 'Marcus Filly (FBB)',
        quote: 'Keep the torso still. If you have to twist to finish the rep, the bell is too heavy.',
        biomechanicalRationale: 'Resisting rotation trains the obliques and quadratus lumborum isometrically.'
      }
    ],
    commonFaults: [
      'Twisting the torso open to heave the bell up.',
      'Pulling toward the armpit or collarbone, shrugging with the upper traps.',
      'Cutting the bottom short and never reaching the stretch.'
    ],
    rehabRegressions: [
      'Regression: Inverted row under the rack bar (fully supported body, no lower back load).'
    ],
    lengthenedPartialsProtocol: {
      recommendation: 'After the last full rep, add 3–4 bottom-half partials focused on the deep lat stretch.',
      targetRangeNote: 'From the arm hanging straight down to about halfway up.',
      scientificRationale: 'Kassiano et al. (2023) & Wolf et al. (2024): the lats produce more mechanical tension at long muscle lengths, favouring stretch-focused partials.'
    }
  },
  {
    id: 'cue_06_athlean_face_pull',
    exerciseId: 't3_athlean_face_pull',
    exerciseName: 'Athlean-X Non-Negotiable Face Pull',
    title: 'Athlean-X Non-Negotiable Face Pull',
    tier: 'T3',
    tempo: '2112',
    prescribedTempo: '2112',
    primaryMuscles: ['Infraspinatus', 'Teres Minor', 'Rear Deltoid', 'Mid/Lower Trapezius'],
    equipment: 'BowFlex SelectTech 840 Kettlebell (8–12 lbs) or Indian Clubs (2–5 lbs) [Zero Cables/Device Needed]',
    setup: 'Slight 30° hip hinge; hold kettlebell or Indian clubs with pronated-to-neutral grip; pull elbows wide and externally rotate hands higher than elbows.',
    setupInstructions: [
      'Phase 1 — Equipment & Hinge: Select your BowFlex 840 kettlebell (8–12 lbs) or Indian clubs (2–5 lbs). Hinge at the hips approx 30° with a flat spine and braced core. Zero cables or bands required.',
      'Phase 2 — High Pull Initiation: Initiate the pull vertically by driving your elbows high and wide toward the ceiling, engaging your rhomboids and posterior deltoids.',
      'Phase 3 — External Rotation Flip (Hands Lead Elbows): As the weight reaches chest level, rotate your humerus backward into external rotation so your hands and knuckles finish higher than your elbows in a double-biceps pose.',
      'Phase 4 — 2-Second Peak Squeeze: Hold the contraction for 2 full seconds. Squeeze your external rotators (infraspinatus, teres minor) and mid/lower traps with maximum intent.',
      'Phase 5 — Controlled 2-Second Return: Reverse the external rotation smoothly under control over 2 seconds back to the starting hang position.',
      'Phase 6 — Postural Longevity: Counteracts horizontal pressing volume and keeps shoulders centered in the glenoid fossa.'
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
      'Leaning the torso backward to cheat the weight instead of using scapular retraction.',
      'Rushing the contraction without the mandatory 2-second hold at peak.'
    ],
    rehabRegressions: [
      'Regression: Indian Club 2 lb Shield Casts with external rotation.'
    ]
  },
  {
    id: 'cue_07_bb_ohp',
    exerciseId: 't1_bb_ohp',
    exerciseName: 'Barbell Overhead Press (OHP)',
    title: 'Barbell Overhead Press (OHP)',
    tier: 'T1',
    tempo: '30X1',
    prescribedTempo: '30X1',
    primaryMuscles: ['Anterior Deltoid', 'Lateral Deltoid', 'Triceps', 'Upper Trapezius', 'Core'],
    equipment: 'Olympic Barbell & Squat Rack',
    setup: 'Set bar at collarbone height; grip just outside shoulders; bar resting on front delts; glutes tight and ribs locked down.',
    setupInstructions: [
      'Phase 1 — Rack Height & Grip Width: Set the barbell at mid-collarbone height. Grip the bar just outside shoulder width with wrists stacked vertically over forearms and thumbs wrapped securely.',
      'Phase 2 — Front Rack Shelf & Lower Body Lock: Unrack the bar and rest it across your anterior deltoids and clavicles. Elbows should sit slightly in front of the bar (angled 30° into the scapular plane). Squeeze glutes and quads to lock pelvis.',
      'Phase 3 — Head Clearance & Vertical Trajectory: Take a deep 360° breath into your abdomen and brace. Pull your chin straight back ("make a double chin") to clear the bar path without leaning your torso backward.',
      'Phase 4 — Overhead Press & Head Through the Window: Press the barbell vertically. As soon as the bar passes your forehead, push your head and chest forward "through the window" formed by your arms.',
      'Phase 5 — Active Upward Scapular Shrug: Lock out elbows overhead with the bar balanced directly over the midfoot and base of neck. Perform an active upward shrug of the shoulder blades to engage the serratus anterior and avoid subacromial pinching.',
      'Phase 6 — Controlled 3-Second Descent: Lower the barbell over 3 seconds back down to your collarbone shelf while maintaining glute tension to prevent lumbar hyperextension.'
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
      'Flaring elbows out completely wide into the frontal plane.',
      'Failing to actively shrug the shoulder blades at top lockout.'
    ],
    rehabRegressions: [
      'Regression: Half-Kneeling Single-Arm Kettlebell Press (scapular-plane press avoids overhead impingement).'
    ]
  },
  {
    id: 'cue_08_pullup_ladders',
    exerciseId: 't2_pullup_ladders',
    exerciseName: 'Pull-Up Ladder Progression & Negatives',
    title: 'Pull-Up Ladder Progression & Negatives',
    tier: 'T2',
    tempo: '30X1',
    prescribedTempo: '30X1',
    primaryMuscles: ['Latissimus Dorsi', 'Biceps Brachii', 'Brachialis', 'Lower Trapezius'],
    equipment: 'Pull-Up Bar',
    setup: 'Grip pull-up bar overhand slightly wider than shoulder width; begin from full dead hang in hollow body position.',
    setupInstructions: [
      'Phase 1 — Grip & Full Dead Hang: Grip the pull-up bar with an overhand (pronated) grip slightly wider than shoulder width. Begin from a complete dead hang with arms fully extended and shoulders stretched overhead.',
      'Phase 2 — Hollow Body Core Bracing: Engage your midsection by pulling ribs down and pointing toes slightly forward, creating a rigid gymnastic hollow body position.',
      'Phase 3 — Scapular Depression Initiation: Initiate the movement by actively depressing your shoulder blades downward into your back pockets before your elbows bend. Fire your lower traps and lats first.',
      'Phase 4 — Vertical Pull & Chin Clearance: Drive your elbows down toward your ribs to pull your upper body upward. Continue pulling until your chin clearly clears the bar without craning your neck.',
      'Phase 5 — Apex Pause & Strict Eccentric Negative: Hold for 1 second at the top with chest close to the bar. Then lower under strict control for a full 3 to 4 seconds back down to a dead hang.',
      'Phase 6 — Ladder Progression Mechanics: Use submaximal clusters (1 rep, rest 15s; 2 reps, rest 30s; 3 reps, rest 45s). If full pull-ups are not yet achieved, use a box to jump to chin-over-bar and perform 4-second eccentric negatives.'
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
      'Craning the neck forward to reach the bar.',
      'Dropping quickly without controlling the 4-second eccentric descent.'
    ],
    rehabRegressions: [
      'Gate 1: Active Scapular Dead Hangs (3x30s).',
      'Gate 2: Inverted Barbell Rows in rack (3x8 reps).',
      'Gate 3: 4-Second Eccentric Pull-Up Negatives (3x5 reps).'
    ],
    lengthenedPartialsProtocol: {
      recommendation: 'Execute a 3-second accentuated dead-hang stretch pause at the bottom of the final rep of each ladder cluster.',
      targetRangeNote: 'Bottom 25% of pull-up excursion (active dead-hang with engaged scapulae to initial 30° elbow bend).',
      scientificRationale: 'Wolf et al. (2024): Emphasizing the lengthened phase on vertical pull movements produces heightened passive and active tension across the latissimus and teres major.'
    }
  },
  {
    id: 'cue_09_tibialis_wall_raise',
    exerciseId: 't3_tibialis_wall_raise',
    exerciseName: 'Tibialis Wall Raises',
    title: 'Tibialis Wall Raises',
    tier: 'T3',
    tempo: '2011',
    prescribedTempo: '2011',
    primaryMuscles: ['Tibialis Anterior', 'Extensor Digitorum Longus'],
    equipment: 'Flat Wall & Flat Shoes / Barefoot',
    setup: 'Stand with upper back and glutes flat against wall; feet 18-24 inches out from wall with knees locked straight.',
    setupInstructions: [
      'Phase 1 — Wall Stance Setup: Stand with your upper back and buttocks flat against a smooth wall. Position your feet 18 to 24 inches away from the wall with toes pointed forward.',
      'Phase 2 — Rigid Knee Lockout: Fully extend and lock your knees straight. Keep your quadriceps engaged. Under no circumstances bend your knees during this exercise.',
      'Phase 3 — Maximal Dorsiflexion Pull: Pull your toes and the balls of your feet upward toward your knees as high as possible, pivoting solely on your heels.',
      'Phase 4 — Peak Contraction Pause (1s Hold): Hold at the top of dorsiflexion for a full 1-second pause, flexing the tibialis anterior muscle on the front of your shin.',
      'Phase 5 — Controlled 2-Second Lowering: Lower the balls of your feet back down over 2 seconds until they tap the floor gently. Do not rest your weight on the floor—immediately begin the next repetition.',
      'Phase 6 — Decelerative Knee Bulletproofing: Perform high repetitions (15–25 reps) until an intense pump is achieved in the shins, building the body’s primary brake against patellar tendon shock.'
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
      'Letting the buttocks come away from the wall to use body momentum.',
      'Dropping feet rapidly without the controlled 2-second eccentric phase.'
    ],
    rehabRegressions: [
      'Move feet closer to the wall (10–12 inches) to decrease resistance.'
    ],
    lengthenedPartialsProtocol: {
      recommendation: 'Hold the full plantarflexion bottom stretch against the floor for 2 seconds on every rep to maximize stretch-mediated shin pump.',
      targetRangeNote: 'Bottom lengthened position (toes pointed fully away, anterior compartment under sustained tension).',
      scientificRationale: 'Wolf et al. (2023) & Patrick (2022): Lengthened loading of the anterior tibialis enhances fascial compliance and shock-absorbing capacity upon ground contact.'
    }
  },
  {
    id: 'cue_10_patrick_step_down',
    exerciseId: 't3_patrick_step_down',
    exerciseName: 'Patrick Step-Downs',
    title: 'Patrick Step-Downs',
    tier: 'T3',
    tempo: '3010',
    prescribedTempo: '3010',
    primaryMuscles: ['Vastus Medialis Oblique (VMO)', 'Patellar Tendon', 'Ankle Stabilizers'],
    equipment: '2–4" Weight Plate or Step',
    setup: 'Stand on a 2-4" weight plate on one foot; allow free foot to hang forward; keep torso completely vertical.',
    setupInstructions: [
      'Phase 1 — Single-Leg Stance on Plate: Stand on a 2 to 4-inch weight plate with your working foot flat and secure. Allow your non-working foot to hang freely in front of the plate.',
      'Phase 2 — Upright Torso & Heel Anchor: Keep your torso completely upright (perpendicular to the floor). Place hands on your hips or lightly touch the squat rack upright for balance. Glue your working heel firmly to the plate.',
      'Phase 3 — Forward Knee Translation (3s Tempo): Slowly push your working knee forward directly over your toes over a 3-second count, while reaching your free heel forward toward the floor.',
      'Phase 4 — Feather-Light Heel Tap: Tap the floor with your free heel as softly as if touching thin glass. Zero bouncing, stamping, or weight transfer onto the floor.',
      'Phase 5 — VMO Concentric Drive: Push through the working foot to return to the starting position, actively squeezing the vastus medialis oblique (VMO) at the top.',
      'Phase 6 — Pain-Free Boundary Rule: Knee discomfort must remain ≤ 2/10. If tendon irritation arises, immediately reduce step height to a 1-inch plate or flat floor.'
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
      'Hinging at the hips rather than translating the knee forward.',
      'Allowing the working heel to lift off the plate.'
    ],
    rehabRegressions: [
      'Reduce step height to a 1" plate or perform flat on the floor.'
    ],
    lengthenedPartialsProtocol: {
      recommendation: 'Focus on a 3-second controlled descent into the deepest comfortable heel tap without bouncing off the floor.',
      targetRangeNote: 'Bottom 50% of step-down excursion where the patellar tendon experiences pure eccentric and isometric stretch.',
      scientificRationale: 'Cook & Purdam (2016) & Rio et al. (2021): Terminal VMO loading at lengthened angles stimulates tenocyte collagen synthesis without high compressive retropatellar forces.'
    }
  },
  {
    id: 'cue_11_alyssa_lu_9090',
    exerciseId: 'w_lower_a_2',
    exerciseName: 'Alyssa Lu 90/90 Positional Breathing & Hip Reset',
    title: 'Alyssa Lu 90/90 Positional Breathing & Hip Reset',
    tier: 'Warmup',
    tempo: '5083',
    prescribedTempo: '5083 (5s Inhale / 8s Exhale / 3s Pause)',
    primaryMuscles: ['Proximal Hamstrings', 'Rectus Abdominis', 'Diaphragm', 'Pelvic Floor'],
    equipment: 'Flat Floor & Bench or Squat Rack Upright',
    setup: 'Lie supine on floor with feet on bench or rack at 90 degrees hips and knees; hands on lower ribs.',
    setupInstructions: [
      'Phase 1 — 90/90 Supine Positioning: Lie on your back on the floor with knees and hips bent at 90-degree angles. Rest your feet flat against a bench, sturdy box, or rack upright. Place your hands lightly on your lower ribs.',
      'Phase 2 — Active Heel Dig & Pelvic Tilt: Gently dig your heels downward into the bench (activating the proximal hamstrings). Feel your pelvis tilt backward (posterior tilt) so your lower back flattens completely against the floor.',
      'Phase 3 — 5-Second 360° Nasal Inhalation: Inhale quietly through your nose for 5 seconds, directing air 360 degrees into your lower abdomen, lateral ribcage, and posterior lower back without lifting your chest.',
      'Phase 4 — 8-Second Complete Oral Exhalation: Exhale through pursed lips for a full 8 seconds until every drop of air leaves your lungs. Feel your ribs sink down and your internal obliques engage.',
      'Phase 5 — 3-Second Post-Expiratory Pause: Hold your breath for 3 seconds after the exhale, maintaining the flat lumbar contact and abdominal tone.',
      'Phase 6 — Autonomic Reset: Repeat for 5 to 6 breath cycles to down-regulate sympathetic tone, inhibit tight hip flexors via reciprocal inhibition, and center the hip joint for squatting.'
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
      'Chest breathing instead of diaphragmatic expansion.',
      'Rushing the exhalation before ribs fully depress.'
    ],
    rehabRegressions: [
      'Place a foam roller or yoga block between knees and gently squeeze during breath cycles.'
    ]
  },
  {
    id: 'cue_12_atg_elephant_walks',
    exerciseId: 'w_lower_b_2',
    exerciseName: 'ATG Elephant Walks',
    title: 'ATG Elephant Walks',
    tier: 'Warmup',
    tempo: '2020',
    prescribedTempo: '2020 (Rhythmic 2s Steps)',
    primaryMuscles: ['Hamstrings', 'Gastrocnemius / Soleus', 'Sciatic Nerve Tract'],
    equipment: 'Workout Bench (Elevation) or Flat Floor',
    setup: 'Place hands flat on elevated bench or floor; feet hip-width apart; knees softly bent.',
    setupInstructions: [
      'Phase 1 — Elevation & Stance Setup: Place your hands flat on a workout bench or sturdy table (or on the floor if you already possess advanced mobility). Position feet hip-width apart with toes pointing straight forward.',
      'Phase 2 — Soft Knee Starting Posture: Begin with both knees slightly bent. Allow your spine to relax into a natural forward fold without forcing aggressive lumbar rounding.',
      'Phase 3 — Unilateral Quad Lockout: Straighten one knee completely by forcefully flexing that leg’s quadriceps. Drive the knee backward to lock it out, feeling the active stretch through the entire posterior chain.',
      'Phase 4 — Hold & Nerve Floss: Hold that full quad contraction for 1 to 2 seconds. The opposing knee remains relaxed and bent.',
      'Phase 5 — Alternating Rhythmic Transition: Bend the straightened knee while simultaneously locking out the opposite knee with an aggressive quad flex. Transfer weight smoothly between legs.',
      'Phase 6 — Repetition Target: Complete 20 reps per leg (40 total alternating steps) to actively lengthen the hamstrings and calves while desensitizing the sciatic nerve tract.'
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
      'Failing to actively contract the quadriceps on the straightened leg.',
      'Holding hands on too low a surface, forcing painful spinal strain.'
    ],
    rehabRegressions: [
      'Elevate hands on a higher barbell in the rack or sturdy table.'
    ]
  },
  {
    id: 'cue_13_filly_z_press',
    exerciseId: 't3_filly_kb_z_press',
    exerciseName: 'Marcus Filly Single-Arm Kettlebell Z-Press',
    title: 'Marcus Filly Single-Arm Kettlebell Z-Press',
    tier: 'T3',
    tempo: '30X1',
    prescribedTempo: '30X1',
    primaryMuscles: ['Deltoids', 'Triceps', 'Thoracic Spine Erectors', 'Core / Hip Flexors'],
    equipment: 'BowFlex Kettlebell (8–40 lbs) & Floor',
    setup: 'Sit on floor with legs in wide V, knees straight and toes pointed up; kettlebell in front rack position; neutral spine.',
    setupInstructions: [
      'Phase 1 — Seated Floor Stance: Sit directly on the floor with your legs spread in a wide "V". Knees must be locked completely straight with toes pulled upward toward your shins.',
      'Phase 2 — Front Rack Position: Clean the kettlebell into a single-arm front rack: thumb hooked close to collarbone, kettlebell ball resting securely between forearm and biceps, wrist neutral.',
      'Phase 3 — Thoracic Posture & Hip Flexor Lock: Sit tall directly on your sitz bones. Actively compress your hip flexors and brace your abdominal cylinder tightly. Prevent any slumping or backward torso lean.',
      'Phase 4 — Overhead Press (30X1 Tempo): Press the kettlebell straight upward, keeping your elbow angled slightly forward in the scapular plane (approx. 30° from the side).',
      'Phase 5 — Full Overhead Lockout: Lock out your elbow overhead with bicep directly next to your ear. Hold for 1 second with a completely vertical spine.',
      'Phase 6 — Strict 3-Second Descent: Lower the kettlebell under control over 3 seconds back to the front rack. Do not allow your torso to twist or your legs to lift off the floor.'
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
      'Bending the knees to relieve hip flexor tension.',
      'Twisting the torso laterally toward or away from the kettlebell.'
    ],
    rehabRegressions: [
      'Sit on a 2–4" weight plate to decrease hip flexion demand.'
    ]
  },
  {
    id: 'cue_14_mcgill_big_3',
    exerciseId: 't3_mcgill_big_3',
    exerciseName: 'Dr. Stuart McGill Big 3 Endurance Tri-Set',
    title: 'Dr. Stuart McGill Big 3 Endurance Tri-Set',
    tier: 'T3',
    tempo: '0010',
    prescribedTempo: 'Isometric 10s Holds (McGill Pyramid)',
    primaryMuscles: ['Rectus Abdominis', 'Quadratus Lumborum', 'Obliques', 'Multifidus', 'Gluteal Muscles'],
    equipment: 'Flat Floor & Bodyweight',
    setup: 'Perform modified curl-up (one knee bent, hands under lumbar arch), side bridge, and quadruped bird-dog with clenched fists.',
    setupInstructions: [
      'Phase 1 — Modified Curl-Up: Lie supine with one knee bent and the other straight. Place hands palms-down beneath the natural lordotic curve of your lower back. Lift head and upper shoulders only 1–2 inches off the floor without flexing your neck. Hold for 10 seconds while breathing diaphragmatically.',
      'Phase 2 — Side Bridge: Support your torso on your forearm and feet (or knees for regression). Align your body in a straight line from shoulder to heels. Contract your abdominal wall and glutes; hold for 10 seconds per side without allowing hips to sag.',
      'Phase 3 — Quadruped Bird-Dog Setup: On all fours with hands under shoulders and knees under hips. Keep spine in rigid neutral lordosis. Clench both fists to create neuromuscular irradiation.',
      'Phase 4 — Bird-Dog Extension: Simultaneously kick one heel straight back and reach the opposite fist straight forward. Keep hips and shoulders perfectly level to the floor. Hold for 10 seconds.',
      'Phase 5 — McGill Descending Pyramid: Perform holds in a descending pyramid fashion: 3 reps of 10s, then 2 reps of 10s, then 1 rep of 10s, resting 3 seconds between reps.',
      'Phase 6 — True Lumbar Stiffness: Preserve neutral spine throughout all holds—the goal is building endurance in spinal stabilizers without cyclical spinal flexion.'
    ],
    creatorCues: [
      {
        creator: 'Dr. Stuart McGill',
        quote: 'True spinal stability is about muscular endurance, not peak 1RM strength. We preserve the neutral lordotic curve while challenging abdominal wall co-contraction without disc-destroying spinal flexion.',
        biomechanicalRationale: 'Spares lumbar discs from repeated flexion-shear while building the exact isometric muscle endurance ratios required to prevent spinal injury.'
      }
    ],
    commonFaults: [
      'Flattening lumbar curve against floor during curl-up.',
      'Hyperextending spine or rotating hips during bird-dog.',
      'Holding breath instead of breathing rhythmically during isometric holds.'
    ],
    rehabRegressions: [
      'Perform bird-dog without lifting limbs simultaneously; side bridge from knees.'
    ]
  },
  {
    id: 'cue_15_kb_floor_press_er',
    exerciseId: 't3_kb_floor_press_er',
    exerciseName: 'Athlean-X 20 Effective Reps (ER) Kettlebell Floor Press',
    title: 'Athlean-X 20 Effective Reps (ER) Kettlebell Floor Press',
    tier: 'T3',
    tempo: '2010',
    prescribedTempo: '2010 (Athlean-X ER Cluster)',
    primaryMuscles: ['Pectoralis Major', 'Triceps Brachii', 'Rotator Cuff Stabilizers'],
    equipment: 'BowFlex Kettlebell (8–40 lbs) & Floor',
    setup: 'Lie supine on floor with knees bent; press kettlebell from floor stop with upper arm at 45 degrees.',
    setupInstructions: [
      'Phase 1 — Supine Floor Setup: Lie flat on the floor with knees bent and feet rooted firmly into the ground. Hold the kettlebell with your upper arm resting flat against the floor.',
      'Phase 2 — 45° Elbow Angle Alignment: Position your upper arm at a 45-degree angle relative to your ribs (avoiding 90° flare to preserve rotator cuff tendons).',
      'Phase 3 — Ignition Set to Near Failure: Press the kettlebell upward to lockout and lower over 2 seconds until your triceps lightly contact the floor. Perform 10–12 repetitions until reaching RPE 8.5–9 (2 reps shy of technical failure).',
      'Phase 4 — 15–20 Second Rest-Pause: Rest exactly 15 to 20 seconds with the weight resting safely on the floor.',
      'Phase 5 — Micro-Set Accumulation: Immediately perform 2 to 4 crisp reps, rest 15–20 seconds again, and repeat micro-sets until you accumulate exactly 20 total effective repetitions.',
      'Phase 6 — Peak Fiber Recruitment: By keeping rest intervals under 20 seconds, you bypass low-threshold warmup reps and keep high-threshold motor units firing continuously.'
    ],
    creatorCues: [
      {
        creator: 'Jeff Cavaliere (ATHLEAN-X)',
        quote: 'Effective reps are the repetitions closest to failure that stimulate high-threshold motor unit recruitment. By resting 15 to 20 seconds between micro-clusters, you accumulate pure hypertrophic tension with zero joint breakdown.',
        biomechanicalRationale: 'The floor naturally prevents shoulder hyperextension, while short rest-pause clusters maximize mechanical tension on high-threshold fast-twitch muscle fibers.'
      }
    ],
    commonFaults: [
      'Bouncing elbows off floor.',
      'Flaring elbows out to 90 degrees.',
      'Resting longer than 20 seconds between micro-sets, losing the effective reps cluster effect.'
    ],
    rehabRegressions: [
      'Reduce kettlebell weight or use bilateral two-hand floor press.'
    ]
  },
  {
    id: 'cue_16_dead_hang_club_mills',
    exerciseId: 't3_dead_hang_club_mills',
    exerciseName: 'Active Dead Hang & Indian Club Arm Casts',
    title: 'Active Dead Hang & Indian Club Arm Casts',
    tier: 'T3',
    tempo: '0010',
    prescribedTempo: 'Controlled Cadence (45s Hang + Casts)',
    primaryMuscles: ['Subscapularis', 'Serratus Anterior', 'Forearm Flexors', 'Thoracolumbar Spine'],
    equipment: 'Pull-Up Bar & Indian Clubs',
    setup: 'Hang freely from overhead bar with engaged grip, followed by circular club casts in scapular plane.',
    setupInstructions: [
      'Phase 1 — Overhead Dead Hang: Grip the pull-up bar with an overhand grip at shoulder width. Allow your entire body to hang freely with arms fully extended.',
      'Phase 2 — Diaphragmatic Spinal Decompression: Inhale deeply into your lower abdomen and exhale fully, feeling gravity gently decompress your lumbar spine and expand the subacromial space for 45 to 60 seconds.',
      'Phase 3 — Controlled Dismount: Step down gently without jumping. Pick up light Indian clubs (2–5 lbs) in each hand.',
      'Phase 4 — Indian Club Cast Pattern: Stand with feet shoulder-width apart. Swing the clubs in smooth circular patterns (heart casts) around your head and shoulders within the scapular plane.',
      'Phase 5 — Synovial Joint Flushing: Allow fluid wrist articulation and forearm rotation, feeling the rotator cuff stabilizers and serratus anterior fire to control the circular momentum.',
      'Phase 6 — Volume Protocol: Perform 10 to 15 fluid circles per direction to restore multi-planar shoulder mobility and flush the glenohumeral capsule with synovial fluid.'
    ],
    creatorCues: [
      {
        creator: 'Jeff Cavaliere & Marcus Filly',
        quote: 'Hanging remodels the acromion arch and gently decompresses compressed spinal discs. Combining hanging with light club casts activates rotator cuff mechanoreceptors and lubricates the joint capsule.',
        biomechanicalRationale: 'Passive gravitational traction increases subacromial joint space while rotational club swings stimulate synovial fluid perfusion across glenohumeral articular cartilage.'
      }
    ],
    commonFaults: [
      'Holding breath during dead hang.',
      'Swinging clubs with rigid elbow instead of relaxed shoulder-wrist synergy.',
      'Jumping down aggressively from the pull-up bar, shocking the decompressed spine.'
    ],
    rehabRegressions: [
      'Hang with toes lightly touching floor or box to regulate traction load.'
    ]
  },
  {
    id: 'cue_17_kb_good_morning',
    exerciseId: 't2_kb_good_morning',
    exerciseName: 'Kettlebell Good Mornings',
    title: 'Kettlebell Good Mornings',
    tier: 'T2',
    tempo: '31X1',
    prescribedTempo: '31X1',
    primaryMuscles: ['Hamstrings', 'Gluteus Maximus', 'Spinal Erectors'],
    equipment: 'BowFlex Kettlebell (8–40 lbs)',
    setup: 'Hold kettlebell against upper chest / sternum in goblet or front rack carry; hinge hips backward.',
    setupInstructions: [
      'Phase 1 — Goblet Chest Hug Setup: Stand with feet hip-width apart. Hold the BowFlex kettlebell tightly against your upper sternum using a secure two-handed goblet grip.',
      'Phase 2 — Lat Pack & Soft Knee Unlock: Squeeze shoulder blades back and down. Unlock your knees softly (15–20° bend) and freeze that knee bend for the duration of the set.',
      'Phase 3 — Posterior Hip Hinge (31X1 Tempo): Inhale into your core cylinder. Push your hips straight back toward the wall behind you. Lower your torso under strict control over 3 seconds while maintaining a neutral spine.',
      'Phase 4 — End-Range Hamstring Pause (1s Hold): Descend until your torso reaches approximately 45–60 degrees and your hamstrings reach full active stretch. Pause for 1 second without rounding your lower back.',
      'Phase 5 — Powerful Hip Drive: Drive your hips forward into the starting position by clenching your glutes and pressing through your heels. Stand tall without hyperextending your spine.',
      'Phase 6 — Reduced Lumbar Shear: Holding the kettlebell tightly against your chest cuts compressive spinal shear by 50% compared to a barbell behind the neck while providing immense hamstring stimulus.'
    ],
    creatorCues: [
      {
        creator: 'Jeff Nippard & Dr. Stuart McGill',
        quote: 'Good mornings overload the hamstrings at long muscle lengths. By keeping the load held close to your sternum, you cut the compressive lever arm on the spine by half compared to a barbell behind the neck.',
        biomechanicalRationale: 'Maintains hip hinge moment arm while minimizing cervical and lumbar shear forces, achieving optimal stretch-mediated hypertrophy.'
      }
    ],
    commonFaults: [
      'Rounding lumbar spine at bottom of hinge.',
      'Squatting down instead of pushing hips backward.',
      'Allowing the kettlebell to drift away from the chest.'
    ],
    rehabRegressions: [
      'Perform bodyweight wall-tap hinges or elevate kettlebell onto bench.'
    ],
    lengthenedPartialsProtocol: {
      recommendation: 'Incorporate a strict 2-second isometric pause at maximum hip hinge depth where the hamstrings are at maximal stretch.',
      targetRangeNote: 'Bottom 40% of hinge excursion (torso near-parallel to floor with soft knees and high ischial tuberosity drive).',
      scientificRationale: 'Bourne et al. & Presland et al.: Loading the hamstrings at long muscle lengths triggers in-series sarcomerogenesis (fascicle lengthening), shifting the length-tension curve rightward to prevent athletic tears.'
    }
  },
  {
    id: 'cue_18_biering_sorensen',
    exerciseId: 't3_biering_sorensen',
    exerciseName: 'Biering-Sørensen Back Extensor Holds',
    title: 'Biering-Sørensen Back Extensor Holds',
    tier: 'T3',
    tempo: '0010',
    prescribedTempo: 'Isometric Hold (45–60s)',
    primaryMuscles: ['Lumbar Erectors', 'Multifidus', 'Gluteus Maximus', 'Hamstrings'],
    equipment: 'Workout Bench & Straps or Counterweight',
    setup: 'Lie prone with pelvis at edge of bench; secure lower limbs; maintain horizontal spine alignment.',
    setupInstructions: [
      'Phase 1 — Bench Positioning: Lie face down on your workout bench with the anterior superior iliac spine (front hip bones) aligned precisely with the edge of the bench.',
      'Phase 2 — Lower Limb Anchoring: Secure your calves and ankles firmly beneath a padded bar, strap, or heavy counterweight (or have a partner securely pin your legs).',
      'Phase 3 — Horizontal Alignment: Cross your arms over your chest. Lift your torso until your entire body forms a straight, horizontal line parallel to the floor.',
      'Phase 4 — Neutral Cervical Posture: Keep your chin tucked and neck aligned with your spine (look down at the floor, not up). Never hyperextend into an arch above horizontal.',
      'Phase 5 — Continuous Diaphragmatic Breathing: Maintain steady rhythmic breathing into your abdomen throughout the hold without holding your breath.',
      'Phase 6 — Isometric Endurance Target: Hold for 45 to 60 seconds (or accumulate cluster holds of 20s hold / 5s rest). Stop immediately if sharp pain occurs or form drops below horizontal.'
    ],
    creatorCues: [
      {
        creator: 'Dr. Stuart McGill',
        quote: 'The Biering-Sørensen test is the gold standard of back health. Individuals who can hold horizontal for 2 minutes or longer have dramatically lower incidence of future low back pain episodes.',
        biomechanicalRationale: 'Builds isometric endurance in slow-twitch multifidus and longissimus thoracis muscle fibers without compressive spinal cycling.'
      }
    ],
    commonFaults: [
      'Hyperextending spine above horizontal into painful lumbar arching.',
      'Holding breath and creating excessive Valsalva pressure.',
      'Allowing torso to sag below horizontal as fatigue sets in.'
    ],
    rehabRegressions: [
      'Hold for shorter intervals (15–20s) with 5s rest breaks (cluster holds).'
    ]
  },
  {
    id: 'cue_19_kb_suitcase_carry',
    exerciseId: 't3_kb_suitcase_carry',
    exerciseName: 'Kettlebell Suitcase Carries',
    title: 'Kettlebell Suitcase Carries',
    tier: 'T3',
    tempo: '2020',
    prescribedTempo: 'Controlled Cadence Walk (50 ft / side)',
    primaryMuscles: ['Quadratus Lumborum', 'Internal/External Obliques', 'Grip Flexors', 'Gluteus Medius'],
    equipment: 'BowFlex Kettlebell (8–40 lbs)',
    setup: 'Hold heavy kettlebell in one hand at side; stand tall with level shoulders; walk with deliberate heel-to-toe stride.',
    setupInstructions: [
      'Phase 1 — Deadlift Pick-Up: Place a heavy kettlebell next to your outside foot. Hinge at the hips, grip the handle, and deadlift the weight up to a tall standing position.',
      'Phase 2 — Anti-Lateral Alignment: Square your shoulders and hips completely level to the floor. Do not allow your torso to lean toward or away from the kettlebell.',
      'Phase 3 — 360° Core Shield: Brace your abdominal wall tightly, firing the opposite quadratus lumborum and obliques to keep your spine strictly vertical.',
      'Phase 4 — Deliberate Heel-to-Toe Steps: Walk forward with slow, controlled heel-to-toe footsteps (approx. 50 feet). Avoid rushing, swaying, or bouncing the kettlebell against your thigh.',
      'Phase 5 — Controlled Turnaround: Lower the kettlebell under control with a strict hip hinge. Rest 15 seconds, switch hands, and carry for identical distance on the opposite side.',
      'Phase 6 — Pelvic Stabilization: Squeeze the gluteus medius of each stance leg with every step to maintain level hip elevation across the entire walking distance.'
    ],
    creatorCues: [
      {
        creator: 'Dr. Stuart McGill',
        quote: 'Suitcase carries challenge the quadratus lumborum and contralateral gluteus medius to lock the pelvis. It is the ultimate functional anti-lateral-flexion exercise.',
        biomechanicalRationale: 'Forces intense unilateral isometric co-contraction of spinal stabilizers, training the abdominal cylinder to resist asymmetric lateral loads.'
      }
    ],
    commonFaults: [
      'Leaning torso sideways away from or toward the kettlebell.',
      'Speed walking or rushing footsteps.',
      'Allowing the kettlebell to swing and bump against the thigh.'
    ],
    rehabRegressions: [
      'Reduce kettlebell load or perform isometric standing suitcase hold.'
    ]
  },
  {
    id: 'cue_20_yellow_dude_lsit',
    exerciseId: 't3_yellow_dude_lsit',
    exerciseName: 'Yellow Dude L-Sit Compression Holds',
    title: 'Yellow Dude L-Sit Compression Holds',
    tier: 'T3',
    tempo: '0010',
    prescribedTempo: 'Isometric Hold (15–25s)',
    primaryMuscles: ['Rectus Abdominis', 'Iliopsoas', 'Quadriceps', 'Serratus Anterior'],
    equipment: 'Pull-Up Bar or Floor',
    setup: 'Hang from pull-up bar or support body on floor; compress hips and elevate legs to 90 degrees horizontal.',
    setupInstructions: [
      'Phase 1 — Grip & Support Setup: Grip the pull-up bar firmly with an overhand grip (or place palms on the floor right beside your hips on parallettes/pushup handles).',
      'Phase 2 — Forceful Scapular Depression: Depress your shoulder blades aggressively downward away from your ears, locking your arms straight and engaging the serratus anterior.',
      'Phase 3 — Knee Lockout & Quad Flex: Lock your knees 100% straight and point your toes forward. Contract your quadriceps maximally.',
      'Phase 4 — Hip Flexor Compression: Compress your hips and lower abdomen, lifting your straight legs upward until they are completely parallel to the floor (90° hip angle).',
      'Phase 5 — Isometric Hold (15–25s): Hold the horizontal "L" position for 15 to 25 seconds while maintaining steady shallow breathing. Zero knee bending or leg sagging.',
      'Phase 6 — Regression Scaling: If unable to hold full horizontal legs, perform a tuck L-sit (knees tucked to chest) or alternating single-leg horizontal holds.'
    ],
    creatorCues: [
      {
        creator: 'Yellow Dude',
        quote: 'Compression strength is the missing link between calisthenics and tendon longevity. Keep your knees fully locked and point your toes. Active compression strengthens the iliopsoas-abdominal synergy.',
        biomechanicalRationale: 'Maximally activates distal quadriceps lock, deep hip flexors, and lower rectus abdominis while building tendon tolerance in the anterior chain.'
      }
    ],
    commonFaults: [
      'Bending knees or letting legs sag below 90 degrees.',
      'Shrugging shoulders into ears instead of actively depressing.',
      'Holding breath and losing abdominal compression.'
    ],
    rehabRegressions: [
      'Tuck L-sit (knees bent to chest) or alternating single-leg L-sit hold.'
    ]
  },
  {
    id: 'cue_21_kb_arm_superset',
    exerciseId: 't3_kb_arm_superset',
    exerciseName: 'Kettlebell Hammer Curl + Overhead Triceps Extension Superset',
    title: 'Kettlebell Hammer Curl + Overhead Triceps Extension Superset',
    tier: 'T3',
    tempo: '2011',
    prescribedTempo: '2011',
    primaryMuscles: ['Brachioradialis', 'Biceps Brachii', 'Triceps Brachii (Long Head)'],
    equipment: 'BowFlex Kettlebell (8–40 lbs)',
    setup: 'Perform kettlebell neutral-grip hammer curls, immediately followed by two-handed overhead kettlebell triceps extension.',
    setupInstructions: [
      'Phase 1 — Hammer Curl Setup: Stand tall with feet shoulder-width apart. Hold the BowFlex kettlebell by the vertical horns with a neutral grip (thumbs pointing upward).',
      'Phase 2 — Strict Hammer Curl Execution: Pin elbows securely against your ribs. Curl the kettlebell toward your upper chest over 1 second, squeeze brachioradialis and biceps at the top for 1 second, then lower under strict 2-second control. Complete 10–12 reps.',
      'Phase 3 — Immediate Overhead Transition: Immediately hoist the kettlebell overhead, gripping the base/ball with both palms facing upward and elbows pointing forward.',
      'Phase 4 — Overhead Triceps Lowering (2s Tempo): Lower the kettlebell smoothly behind your head over 2 seconds by bending your elbows, feeling a full active stretch in the long head of the triceps without flaring elbows out.',
      'Phase 5 — Triceps Lockout & Squeeze: Extend elbows to return the kettlebell overhead, squeezing triceps at peak lockout for 1 second. Complete 10–12 reps.',
      'Phase 6 — Tendon Remodeling & Reciprocal Flushing: Supersetting antagonistic arm muscles flushes synovial fluid and builds distal tendon resilience at both the elbow and shoulder joint.'
    ],
    creatorCues: [
      {
        creator: 'Marcus Filly & Jeff Cavaliere',
        quote: 'Antagonist supersetting promotes tendon balance and reciprocal joint flushing. Neutral-grip hammer curls strengthen the brachioradialis and distal biceps tendon without aggravating the medial epicondyle.',
        biomechanicalRationale: 'Controlled eccentric tension under neutral wrist orientation protects elbow collateral ligaments and stimulates tenocyte collagen remodeling.'
      }
    ],
    commonFaults: [
      'Swinging torso to cheat kettlebell upward.',
      'Flaring elbows outward during overhead triceps extension.',
      'Cutting the eccentric lowering phase short on either exercise.'
    ],
    rehabRegressions: [
      'Perform single-arm curls and bench-supported kickbacks.'
    ],
    lengthenedPartialsProtocol: {
      recommendation: 'On overhead triceps extensions, perform 4–5 lengthened partial pulses in the deep overhead elbow bend position after reaching full-ROM fatigue.',
      targetRangeNote: 'Bottom 40% behind head (elbows bent past 100° flexion, triceps long head at maximal stretch).',
      scientificRationale: 'Maeo et al. (2022/2023) & Wolf et al. (2023): Overhead triceps extensions produce ~1.5x greater long-head hypertrophy than pushdowns because the muscle is loaded at long muscle lengths.'
    }
  },
  {
    id: 'cue_22_loaded_horse_stance',
    exerciseId: 't3_loaded_horse_stance',
    exerciseName: 'Range of Strength Loaded Horse Stance Pulses',
    title: 'Range of Strength Loaded Horse Stance Pulses',
    tier: 'T3',
    tempo: '3112',
    prescribedTempo: '3112 (3s Descent / 1s Hold / 1s Rise / 2s End-Range Pulse)',
    primaryMuscles: ['Adductor Magnus', 'Adductor Longus', 'Gluteus Medius', 'Pelvic Floor'],
    equipment: 'BowFlex Kettlebell (8–40 lbs)',
    setup: 'Establish a 3-step heel-to-toe stance; toes pointing outward 30–45 degrees; hold kettlebell low between thighs.',
    setupInstructions: [
      'Phase 1 — 3-Step Stance Setup: From a shoulder-width stance, perform 3 deliberate heel-to-toe step-outs to establish a wide horse stance. Turn feet outward 30–45 degrees so knees track precisely over the second toes.',
      'Phase 2 — Low Kettlebell Load Placement: Hold your BowFlex kettlebell (18–25 lbs) by the handle hanging straight down between your legs. Keep arms relaxed with shoulder blades lightly retracted.',
      'Phase 3 — Anterior Pelvic Tilt & Knee Abduction: Slightly roll your pelvis into an anterior pelvic tilt. Lucas Hardie notes that an anterior tilt clears the femoral head against the acetabular rim, allowing deep hip abduction without bony impingement.',
      'Phase 4 — Controlled Descent (3s Tempo): Descend over 3 seconds by pushing your knees wide and sinking your hips straight down toward knee height (thighs approaching parallel to floor).',
      'Phase 5 — Quasi-Isometric End-Range Pulses (2s Pulse): At maximum loaded adductor stretch, perform small, rhythmic, 1-inch pulses over 2 seconds. This quasi-isometric stimulus overrides the stretch reflex and builds active neural control at the tissue boundary.',
      'Phase 6 — Concentric Rise & Antagonist Squeeze: Squeeze adductors and glutes to rise halfway up, reset pelvic orientation, and repeat for 8 to 10 controlled pulses (30–45 seconds total time under tension).'
    ],
    creatorCues: [
      {
        creator: 'Lucas Hardie (Range of Strength)',
        quote: 'The horse stance is the gateway to the side split. Never relax into passive stretch. Hold the weight low, maintain slight anterior pelvic tilt to avoid bone-on-bone impingement, and pulse actively against the resistance.',
        biomechanicalRationale: 'Loaded quasi-isometrics at long muscle lengths stimulate collagen synthesis in the adductor tendon insertions while recruiting high-threshold motor units.'
      }
    ],
    commonFaults: [
      'Allowing knees to collapse inward into valgus instead of tracking wide over toes.',
      'Rounding the lower back into posterior pelvic tuck (causes femoral neck impingement).',
      'Using excessive weight that prevents reaching parallel femur depth.'
    ],
    rehabRegressions: [
      'Level 0: Unloaded bodyweight horse stance holding onto rack uprights for balance.',
      'Level 1: 2-step moderate stance with 8–12 lb kettlebell.'
    ]
  },
  {
    id: 'cue_23_jefferson_curl',
    exerciseId: 't3_jefferson_curl',
    exerciseName: 'Range of Strength Jefferson Curl (Progressive Deficit)',
    title: 'Range of Strength Jefferson Curl (Progressive Deficit)',
    tier: 'T3',
    tempo: '4111',
    prescribedTempo: '4111 (4s Segmental Roll / 1s Bottom Stretch / 1s Unroll / 1s Reset)',
    primaryMuscles: ['Hamstrings (Distal Tendon Focus)', 'Multifidus', 'Erector Spinae', 'Thoracolumbar Fascia'],
    equipment: 'Kettlebell (15–25 lbs) & 2–4" Bumper Plate / Step',
    setup: 'Stand on a sturdy 2–4" elevated plate with feet together or hip-width; knees 100% locked straight; hold light weight hanging at thighs.',
    setupInstructions: [
      'Phase 1 — Platform Elevation & Stance: Stand on a secure 2–4" bumper plate or wooden box with feet together or hip-width apart. Hold a 15–25 lb kettlebell (or light barbell) hanging freely in front of thighs.',
      'Phase 2 — Locked Knee Prerequisite: Lock your knees completely straight and squeeze your quads. The knees must remain rigidly extended throughout the entire movement to isolate posterior chain compliance.',
      'Phase 3 — Cervical to Thoracic Segmental Flexion: Begin by tucking your chin firmly into your sternum. Slowly roll down one individual vertebra at a time: cervical spine first, then thoracic spine, rounding each segment sequentially.',
      'Phase 4 — Lumbar Flexion & Deficit Descent (4s Tempo): Continue rolling smoothly into the lumbar spine over a full 4 seconds, letting the weight draw your torso down past your feet into the deficit.',
      'Phase 5 — 1-Second Loaded Stretch Pause: At maximum end-range (wrists or knuckles passing below toes), hold active muscular tension for 1 full second without bouncing or jerking.',
      'Phase 6 — Segmental Concentric Rebuild: Reverse the motion by tucking the pelvis underneath you and unrolling the spine vertebra by vertebra: lumbar first, thoracic second, and finally un-tucking the chin at the top.'
    ],
    creatorCues: [
      {
        creator: 'Lucas Hardie (Range of Strength)',
        quote: 'The Jefferson Curl is not a deadlift; it is a movement of spinal articulation and distal hamstring remodeling. Roll down bone by bone. Build to 25% of your bodyweight passing below your toes with straight knees.',
        biomechanicalRationale: 'Progressive, submaximal loaded flexion adapts the posterior longitudinal ligament and erector spinae tendons, building structural resilience against accidental flexion injuries.'
      },
      {
        creator: 'Ben Patrick (ATG)',
        quote: 'By keeping the knees completely locked, the Jefferson Curl forces the distal hamstring and gastrocnemius tendon complex to elongate under load, creating bulletproof posterior elasticity.',
        biomechanicalRationale: 'Straight-knee loaded flexion targets the semitendinosus and biceps femoris at their maximal sarcomere lengths, triggering stretch-mediated hypertrophy.'
      }
    ],
    commonFaults: [
      'Bending the knees during the descent (bypasses hamstring loaded stretch).',
      'Hinging at the hips with a flat back instead of rolling segmentally vertebra by vertebra.',
      'Using excessive weight too early before developing connective tissue tolerance.'
    ],
    rehabRegressions: [
      'Level 0: Flat ground bodyweight forward fold with hands sliding down shins.',
      'Level 1: 10–15 lb light kettlebell on flat ground before introducing platform deficit.'
    ]
  },
  {
    id: 'cue_24_german_hang_prep',
    exerciseId: 't3_german_hang_prep',
    exerciseName: 'Range of Strength Active Shoulder Extension Hang (German Hang Prep)',
    title: 'Range of Strength Active Shoulder Extension Hang (German Hang Prep)',
    tier: 'T3',
    tempo: '0030',
    prescribedTempo: 'Isometric Hold (20–30s Continuous Tension)',
    primaryMuscles: ['Anterior Deltoid', 'Pectoralis Minor', 'Biceps Brachii (Long Head & Distal Tendon)', 'Latissimus Dorsi'],
    equipment: 'Pull-Up Bar or Low Bar / Rings',
    setup: 'Position hands behind you on a waist-to-chest height bar (or rings), palms facing backward; step feet forward into shoulder extension stretch.',
    setupInstructions: [
      'Phase 1 — Equipment & Grip Setup: Stand underneath a waist-to-chest height bar (inside rack) or adjust gymnastic rings. Reach behind your body and grip the bar with palms facing backward in full shoulder extension.',
      'Phase 2 — Feet-Assisted Weight Transfer: Step your feet forward and slowly lower your hips underneath the bar so that your arms are drawn into extreme shoulder hyperextension.',
      'Phase 3 — Antagonist Chest Expansion: Open your chest, retract shoulder blades, and gently draw your shoulders down away from your ears. Never collapse into painful joint pinching.',
      'Phase 4 — Active Muscular Tension (Quasi-Isometric): Rather than hanging passively, actively pull your hands toward your hips against the fixed bar. This fires the anterior deltoids and biceps tendons under loaded elongation.',
      'Phase 5 — Regulated Hold Duration (20–30s): Breathe diaphragmatically and maintain active tension for 20 to 30 seconds. Lucas Hardie highlights this as Feat 5: the premier exercise for eliminating biceps tendinopathy and shoulder impingement.',
      'Phase 6 — Controlled Step-Back Exit: Step your feet backward under the bar to safely unload your shoulders before releasing your grip.'
    ],
    creatorCues: [
      {
        creator: 'Lucas Hardie (Range of Strength)',
        quote: 'The German Hang is the ultimate antidote to modern desk posture and heavy pressing. Exposing the shoulder to loaded extension on rings or a bar builds tendon resilience in the biceps and pecs that conventional lifting never touches.',
        biomechanicalRationale: 'Shoulder hyperextension under tensile loading promotes extracellular matrix remodeling in the anterior capsule and long head of the biceps tendon.'
      }
    ],
    commonFaults: [
      'Shrugging shoulders into the neck or letting the head collapse forward.',
      'Dropping into full depth abruptly without feet-assisted load regulation.',
      'Holding your breath and tensing into panic during the stretch.'
    ],
    rehabRegressions: [
      'Level 0: Floor-seated table-top shoulder extension stretch.',
      'Level 1: Low bar feet-flat assisted shoulder extension hang (50% bodyweight on feet).'
    ]
  },

  // ==========================================
  // WARMUP & BIOMECHANICAL PRIMING EXERCISES
  // ==========================================
  {
    id: 'cue_wu_lower_a_1',
    exerciseId: 'w_lower_a_1',
    exerciseName: 'Rowing Machine Reverse Leg-Drive',
    title: 'Rowing Machine Reverse Leg-Drive',
    tier: 'Warmup',
    tempo: '2020',
    prescribedTempo: '2020 (Rhythmic 18–20 SPM)',
    primaryMuscles: ['Vastus Medialis Oblique (VMO)', 'Patellar Tendon', 'Calves', 'Cardiovascular System'],
    equipment: 'Rowing Machine',
    setup: 'Adjust footplate straps over forefoot; set damper to moderate (4–6); sit tall holding handle with loose grip.',
    setupInstructions: [
      'Phase 1 — Machine Setup & Foot Straps: Adjust the foot stretcher so the strap sits directly across the widest part of your foot (the ball of the foot). Set the damper to moderate resistance (setting 4–6).',
      'Phase 2 — Reverse Leg-Drive Posture: Sit tall on the seat with spine upright and arms extended forward holding the handle. Do not slouch or round your thoracic spine.',
      'Phase 3 — Forefoot Push Initiation: Push backward purely through the balls of your feet and forefoot (rather than heels first). This directly simulates Ben Patrick’s backward sled walking, driving blood flow and synovial fluid directly into the VMO.',
      'Phase 4 — Fluid Knee Extension (Zero Lockout Impact): Drive the seat backward smoothly without snapping your knees into hyperextension. Maintain continuous, controlled quad tension.',
      'Phase 5 — Rhythmic Recovery (18–20 SPM): Return forward under control by letting knees bend smoothly over toes. Maintain a steady, relaxed pace (18–20 strokes per minute) for 4 to 5 minutes until knees feel warm, lubricated, and pain-free.'
    ],
    creatorCues: [
      {
        creator: 'Ben Patrick (ATG)',
        quote: 'Backward movement is the foundation of knee bulletproofing. By pushing through the balls of the feet with resistance, you pump blood directly into the patellar tendon and VMO without creating decelerative shear stress.',
        biomechanicalRationale: 'Eliminates eccentric patellar braking shear while activating the VMO and delivering nutrient-rich synovial fluid to articular cartilage.'
      }
    ],
    commonFaults: [
      'Pushing through the heels instead of the balls of the feet (misses VMO focus).',
      'Aggressively snapping knees straight at the back of the stroke.',
      'Slumping or rounding the lumbar spine during the drive.'
    ],
    rehabRegressions: [
      'Reduce damper resistance to 1–2 or perform backward treadmill walking with belt powered off.'
    ]
  },
  {
    id: 'cue_wu_lower_a_3',
    exerciseId: 'w_lower_a_3',
    exerciseName: 'Eugene Teo Standing Calf Raise (Pre-Fatigue)',
    title: 'Eugene Teo Standing Calf Raise (Pre-Fatigue)',
    tier: 'Warmup',
    tempo: '3012',
    prescribedTempo: '3012 (3s Lower / 2s Peak Squeeze)',
    primaryMuscles: ['Gastrocnemius', 'Soleus', 'Achilles Tendon', 'Plantar Fascia'],
    equipment: '2" Weight Plate or Step / Bodyweight',
    setup: 'Stand on a 2" plate or block with balls of feet; heels hanging off; light touch on rack for balance.',
    setupInstructions: [
      'Phase 1 — Elevated Platform Stance: Place the balls of both feet on a 2" weight plate, step, or wooden block with your heels hanging freely off the edge. Lightly touch rack uprights for balance.',
      'Phase 2 — Full Ankle Dorsiflexion Stretch: Lower your heels slowly below the plate over a full 3 seconds until you feel a deep, comfortable stretch through the Achilles tendon and calf bellies.',
      'Phase 3 — Big Toe Joint Concentric Drive: Press down forcefully through the first metatarsal head (big toe knuckle) to elevate your heels as high as possible. Never roll your ankles outward onto pinky toes.',
      'Phase 4 — 2-Second Peak Contraction Hold: Hold maximum elevation for 2 full seconds, squeezing the gastrocnemius with maximal voluntary contraction.',
      'Phase 5 — Pre-Fatigue Joint Stabilization: Complete 15 strict reps across 2 sets. Pre-fatiguing the calf musculature stabilizes the talocrural joint and removes compensatory anterior knee shear before squatting.'
    ],
    creatorCues: [
      {
        creator: 'Coach Eugene Teo',
        quote: 'Do not squat with cold, stiff calves. Pre-fatiguing and actively stretching the calves before leg sessions stabilizes the ankle joint and eliminates forward tibial shear that destroys patellar tendons.',
        biomechanicalRationale: 'Pre-activates the gastrocnemius-soleus complex to act as an active dynamic shock absorber during squat descent.'
      }
    ],
    commonFaults: [
      'Bouncing rapidly out of the bottom stretch without the 3-second eccentric control.',
      'Rolling outward onto lateral edges of feet.',
      'Bending the knees to cheat the calf contraction.'
    ],
    rehabRegressions: [
      'Perform flat ground calf raises without elevation.'
    ]
  },
  {
    id: 'cue_wu_lower_a_4',
    exerciseId: 'w_lower_a_4',
    exerciseName: 'Eugene Teo Light KB Romanian Hinge (Pre-Fatigue)',
    title: 'Eugene Teo Light KB Romanian Hinge (Pre-Fatigue)',
    tier: 'Warmup',
    tempo: '3110',
    prescribedTempo: '3110 (3s Hinge / 1s Stretch / 1s Drive)',
    primaryMuscles: ['Biceps Femoris', 'Semitendinosus', 'Gluteus Maximus'],
    equipment: 'BowFlex Kettlebell (18–25 lbs)',
    setup: 'Hold light 18-25 lb kettlebell by horns in front of thighs; feet hip-width; knees soft; pack lats.',
    setupInstructions: [
      'Phase 1 — Stance & Grip Setup: Hold a light 18–25 lb BowFlex kettlebell by the horns in front of your thighs. Stand with feet hip-width apart and toes pointing straight ahead.',
      'Phase 2 — Soft Knee Unlock & Lat Pack: Softly unlock your knees (approx. 15° bend) and freeze that knee bend. Retract and depress shoulder blades to lock your lats.',
      'Phase 3 — Posterior Hip Hinge (3s Tempo): Inhale into your core cylinder and push your hips straight backward toward the wall. Lower the kettlebell over 3 seconds while keeping it glued against your shins.',
      'Phase 4 — 1-Second Hamstring Stretch Hold: Pause for 1 second at the bottom when your hamstrings reach full active elongation. Keep your lumbar spine locked in rigid neutral lordosis.',
      'Phase 5 — Hamstring Co-Contraction Activation: Drive hips forward by squeezing glutes and hamstrings. Pre-activating the hamstrings ensures that the hamstring-quad co-contraction mechanism protects the ACL and patellar tendon during heavy squats.'
    ],
    creatorCues: [
      {
        creator: 'Coach Eugene Teo',
        quote: 'Firing the hamstrings before heavy squats activates the posterior co-contraction mechanism. When your hamstrings are awake, they actively pull the tibia backward, removing tremendous shear from your patellar tendon.',
        biomechanicalRationale: 'Hamstring co-contraction stabilizes the knee joint by balancing anterior quadriceps translation during deep knee flexion.'
      }
    ],
    commonFaults: [
      'Squatting down instead of pushing hips back.',
      'Letting the kettlebell drift away from the legs.',
      'Rounding the lower back at the bottom.'
    ],
    rehabRegressions: [
      'Perform bodyweight wall-tap hip hinges with hands on hips.'
    ]
  },
  {
    id: 'cue_wu_lower_a_5',
    exerciseId: 'w_lower_a_5',
    exerciseName: 'Squat U Ankle Mobilization & Tripod Rooting',
    title: 'Squat U Ankle Mobilization & Tripod Rooting',
    tier: 'Warmup',
    tempo: '2012',
    prescribedTempo: '2012 (2s End-Range Mobilization)',
    primaryMuscles: ['Talocrural Joint Capsule', 'Peroneals', 'Tibialis Posterior', 'Foot Intrinsics'],
    equipment: 'Flat Floor / Squat Rack Upright',
    setup: 'Assume half-kneeling position 4–5" from wall or rack upright; root foot tripod firmly.',
    setupInstructions: [
      'Phase 1 — Half-Kneeling Stance: Assume a half-kneeling position on the floor (one knee down, forward foot flat on the floor 4–5 inches away from a wall or rack upright).',
      'Phase 2 — Foot Tripod Rooting: Press the big toe knuckle, pinky toe knuckle, and heel center firmly into the ground. Maintain an active medial arch (do not let the foot pronate or arch collapse).',
      'Phase 3 — Forward Knee Translation Over Pinky Toe: Drive the front knee forward over the second and third toes until maximum ankle dorsiflexion is reached, keeping the heel glued flat to the floor.',
      'Phase 4 — 2-Second End-Range Mobilization: Hold the forward ankle stretch for 2 seconds. Feel the stretch at the posterior ankle joint and anterior talus glide.',
      'Phase 5 — Repeat & Switch: Perform 10 controlled reps per side. Removing ankle stiffness eliminates compensatory inward knee collapse (valgus) during your squat workout.'
    ],
    creatorCues: [
      {
        creator: 'Dr. Aaron Horschig (Squat University)',
        quote: 'Limited ankle dorsiflexion is the number one hidden cause of knee pain during squats. If your ankle cannot bend, your tibia will rotate inward and your knee will collapse into valgus shear. Mobilize the ankle and root the tripod first.',
        biomechanicalRationale: 'Restores talocrural anterior-posterior joint play and prevents valgus knee collapse caused by dorsiflexion restrictions.'
      }
    ],
    commonFaults: [
      'Allowing the working heel to lift off the ground.',
      'Letting the knee cave inward toward the big toe rather than tracking over 2nd/3rd toe.',
      'Collapsing the medial arch of the foot.'
    ],
    rehabRegressions: [
      'Place a small 2.5 lb plate under the heel if severe mobility restriction prevents forward translation.'
    ]
  },
  {
    id: 'cue_wu_upper_a_1',
    exerciseId: 'w_upper_a_1',
    exerciseName: 'Indian Club Rotational Circles & Casts',
    title: 'Indian Club Rotational Circles & Casts',
    tier: 'Warmup',
    tempo: '2020',
    prescribedTempo: 'Fluid Circular Rhythm (10 circles / direction)',
    primaryMuscles: ['Subscapularis', 'Infraspinatus', 'Teres Minor', 'Supraspinatus', 'Serratus Anterior'],
    equipment: 'Indian Clubs (2 lb or 5 lb clubs)',
    setup: 'Hold light Indian clubs with relaxed grip; feet shoulder-width; soft knees.',
    setupInstructions: [
      'Phase 1 — Club Selection & Stance: Hold one light Indian club (2 lb or 5 lb) in each hand. Stand with feet shoulder-width apart, knees soft, and core lightly braced.',
      'Phase 2 — Inward Heart Cast (Internal Rotation): Swing the clubs upward in front of your chest, sweeping inward across your midline in a fluid circular arc over and behind each shoulder.',
      'Phase 3 — Outward Heart Cast (External Rotation): Reverse the motion by casting the clubs outward away from your head, allowing your wrist and shoulder to articulate in synergy.',
      'Phase 4 — Relaxed Scapular Rhythm: Keep your elbows soft and allow your shoulder blades to rotate freely across the ribcage without shrugging collarbones into your ears.',
      'Phase 5 — Synovial Perfusion: Perform 10 inward circles and 10 outward circles per side. The centrifugal momentum forces synovial fluid into the glenohumeral capsule, priming shoulders for benching.'
    ],
    creatorCues: [
      {
        creator: 'Marcus Filly & Athlean-X Priming',
        quote: 'Light rotational club casting awakens dormant rotator cuff mechanoreceptors and lubricates the shoulder joint capsule with synovial fluid without creating neurological fatigue.',
        biomechanicalRationale: 'Rotational torque stimulates mechanoreceptors and increases synovial perfusion across glenohumeral cartilage.'
      }
    ],
    commonFaults: [
      'Gripping clubs with a rigid death grip rather than relaxed wrist articulation.',
      'Shrugging shoulders into ears instead of allowing fluid scapular rhythm.'
    ],
    rehabRegressions: [
      'Perform arm circles without clubs (bodyweight only).'
    ]
  },
  {
    id: 'cue_wu_upper_a_2',
    exerciseId: 'w_upper_a_2',
    exerciseName: 'Athlean-X Scapular Retractions & Depressions',
    title: 'Athlean-X Scapular Retractions & Depressions',
    tier: 'Warmup',
    tempo: '2012',
    prescribedTempo: '2012 (2s End-Range Squeeze)',
    primaryMuscles: ['Lower Trapezius', 'Rhomboids', 'Serratus Anterior', 'Latissimus Dorsi'],
    equipment: 'Bodyweight / Floor',
    setup: 'Assume quadruped position on hands and knees with arms straight; neutral spine.',
    setupInstructions: [
      'Phase 1 — Quadruped Setup: Assume a quadruped position on hands and knees with arms straight and elbows locked, or lie prone on floor.',
      'Phase 2 — Pure Scapular Retraction: Without bending your elbows, pinch your shoulder blades together as tightly as possible. Feel your chest sink slightly while your arms remain rigid pillars.',
      'Phase 3 — Active Scapular Depression: While keeping the shoulder blades pinched together, pull them downward toward your back pockets (depression).',
      'Phase 4 — 2-Second Isometric Hold: Hold this retracted and depressed position for 2 full seconds, feeling the lower traps and serratus anterior fire intensely.',
      'Phase 5 — Controlled Protraction Return: Push the floor away to protract your shoulder blades smoothly over 2 seconds before repeating. Perform 2 sets of 12 reps to center the humeral head in the socket before pressing.'
    ],
    creatorCues: [
      {
        creator: 'Jeff Cavaliere (ATHLEAN-X)',
        quote: 'The shoulder blade is the base of support for your entire upper arm. If you cannot retract and depress your scapulae, your rotator cuff has to work overtime, leading straight to impingement.',
        biomechanicalRationale: 'Depressing and retracting the scapula seats the humeral head deeply into the glenoid fossa, maximizing subacromial clearance.'
      }
    ],
    commonFaults: [
      'Bending the elbows to cheat retraction.',
      'Shrugging shoulders upward toward the ears instead of depressing downward.'
    ],
    rehabRegressions: [
      'Perform standing scapular wall slides or doorway scapular pinches.'
    ]
  },
  {
    id: 'cue_wu_upper_a_3',
    exerciseId: 'w_upper_a_3',
    exerciseName: 'McGill Bird-Dog Core & Lat Tension Priming',
    title: 'McGill Bird-Dog Core & Lat Tension Priming',
    tier: 'Warmup',
    tempo: '0010',
    prescribedTempo: 'Isometric 10s Holds (4 reps / side)',
    primaryMuscles: ['Multifidus', 'Quadratus Lumborum', 'Gluteus Maximus', 'Latissimus Dorsi'],
    equipment: 'Bodyweight / Floor',
    setup: 'Hands under shoulders, knees under hips; neutral lordotic spine; clenched fists.',
    setupInstructions: [
      'Phase 1 — Quadruped Setup: Position on all fours with hands directly below shoulders and knees directly below hips. Preserve natural lumbar lordosis (neutral spine).',
      'Phase 2 — Irradiation Clench: Clench both hands into tight fists to create neuromuscular irradiation through the upper extremities.',
      'Phase 3 — Cross-Body Limb Extension: Extend your right leg straight back by driving the heel to hip level, while simultaneously reaching your left fist straight forward.',
      'Phase 4 — Anti-Rotation Stabilization (10s Hold): Keep hips and shoulders perfectly parallel to the floor—zero pelvic tilting, hip rolling, or lumbar hyperextension. Hold for 10 seconds while breathing rhythmically.',
      'Phase 5 — Alternating Repetition: Return limbs smoothly to the floor and switch sides. Complete 4 reps of 10s holds per side to establish anti-torsional spinal stiffness before rowing.'
    ],
    creatorCues: [
      {
        creator: 'Dr. Stuart McGill',
        quote: 'Bird-dog holds train the abdominal wall, gluteals, and back extensors to lock the spine against rotation. This core stiffness is mandatory before lifting heavy loads.',
        biomechanicalRationale: 'Activates the posterior oblique sling (contralateral glute and lat) without imposing compressive lumbar shear.'
      }
    ],
    commonFaults: [
      'Kicking the leg too high into lumbar hyperextension.',
      'Rolling the hip open to the ceiling.',
      'Holding breath instead of diaphragmatic breathing.'
    ],
    rehabRegressions: [
      'Extend one limb at a time (leg only, then arm only).'
    ]
  },
  {
    id: 'cue_wu_lower_b_1',
    exerciseId: 'w_lower_b_1',
    exerciseName: 'Alyssa Lu 10-Minute Active Hip Reset Protocol',
    title: 'Alyssa Lu 10-Minute Active Hip Reset Protocol',
    tier: 'Warmup',
    tempo: '5083',
    prescribedTempo: 'Controlled Flow (5–6 Minutes)',
    primaryMuscles: ['Proximal Hamstrings', 'Adductor Longus/Magnus', 'Gluteus Medius', 'Psoas'],
    equipment: 'Flat Floor & Bench / Yoga Block',
    setup: 'Lie supine with feet on bench at 90°; place yoga block or foam roller between knees.',
    setupInstructions: [
      'Phase 1 — 90/90 Heel Dig Reset: Lie on back with feet on bench at 90°. Dig heels down, tilt pelvis backward, and perform 5 deep 5s inhale / 8s exhale breath cycles to disengage hypertonic hip flexors.',
      'Phase 2 — Adductor Block Squeeze: Place a foam roller or yoga block between your knees. Squeeze the block firmly (activating adductors) while maintaining the posterior pelvic tilt.',
      'Phase 3 — Low Glute Bridge Lift: Lift hips 2 to 3 inches off the floor using your hamstrings and glutes while continuously squeezing the block. Never arch your lower back.',
      'Phase 4 — 2-Second Bridge Pause: Hold at the top for 2 seconds with ribs depressed and pelvis neutral. Lower slowly under control.',
      'Phase 5 — Complete Restoration Protocol: Perform 2 sets of 10 bridge reps followed by 5 breathing cycles. Centers the femoral head into the acetabulum, eliminating anterior hip pinch before deadlifts and RDLs.'
    ],
    creatorCues: [
      {
        creator: 'Dr. Alyssa Lu (Proformance)',
        quote: 'Tight hamstrings are often an illusion caused by an anteriorly tilted pelvis pulling them taut like a guitar string. Resetting the pelvis with 90/90 breathing and adductor bridges restores pelvic neutral and unlocks true active length.',
        biomechanicalRationale: 'Reciprocal inhibition of anterior hip capsule flexors via proximal hamstring and adductor co-activation.'
      }
    ],
    commonFaults: [
      'Bridging too high into lumbar arching instead of subtle pelvic tilt.',
      'Allowing knees to splay outward rather than maintaining block squeeze.'
    ],
    rehabRegressions: [
      'Perform isometric 90/90 breathing on floor without lifting hips.'
    ]
  },
  {
    id: 'cue_wu_lower_b_3',
    exerciseId: 'w_lower_b_3',
    exerciseName: 'Rowing Machine Steady Rhythm Flush',
    title: 'Rowing Machine Steady Rhythm Flush',
    tier: 'Warmup',
    tempo: '2020',
    prescribedTempo: 'Steady 18–20 Strokes/Min (3–4 Minutes)',
    primaryMuscles: ['Gluteal Group', 'Hamstrings', 'Thoracic Spine', 'Latissimus Dorsi'],
    equipment: 'Rowing Machine',
    setup: 'Set light-moderate damper (3–4); strap feet over ball of foot; sit tall holding handle.',
    setupInstructions: [
      'Phase 1 — Ergometer Setup: Secure feet in footplates with strap across the ball of the foot. Set resistance damper to light-moderate (setting 3–4).',
      'Phase 2 — Smooth Catch Position: Sit tall at the catch with shins vertical, arms extended, and torso tilted slightly forward from the hips (1 o\'clock angle).',
      'Phase 3 — Leg Drive First: Push smoothly through the legs first, preserving torso angle until legs are nearly straight.',
      'Phase 4 — Hip Hinge & Arm Pull: Swing torso smoothly backward to 11 o\'clock, then pull handle to lower ribs with wrists flat.',
      'Phase 5 — Rhythm & Lubrication: Reverse the sequence: arms extend, torso hinges forward, knees bend. Row continuously for 3 to 4 minutes at a conversational pace to lubricate hip and facet joints.'
    ],
    creatorCues: [
      {
        creator: 'Eugene Teo & Conditioning Base',
        quote: 'A light 3 to 4-minute row warms the synovial fluid in the hips and lower back through dynamic reciprocal movement without exhausting energy reserves.',
        biomechanicalRationale: 'Cyclical hip flexion and extension with low resistance stimulates articular lubrication across lumbar facet and hip joints.'
      }
    ],
    commonFaults: [
      'Rushing stroke rate above 24 SPM (turns warmup into conditioning).',
      'Bending arms early before legs have completed the drive.'
    ],
    rehabRegressions: [
      'Lower damper to 1 or perform bodyweight good mornings and arm swings.'
    ]
  },
  {
    id: 'cue_wu_upper_b_1',
    exerciseId: 'w_upper_b_1',
    exerciseName: 'Athlean-X Active Scapular Dead Hang Pulls',
    title: 'Athlean-X Active Scapular Dead Hang Pulls',
    tier: 'Warmup',
    tempo: '2112',
    prescribedTempo: '2112 (2s Hold at Peak Scapular Elevation)',
    primaryMuscles: ['Lower Trapezius', 'Serratus Anterior', 'Latissimus Dorsi', 'Forearm Flexors'],
    equipment: 'Pull-Up Bar',
    setup: 'Overhand grip at shoulder width on pull-up bar; full relaxed dead hang.',
    setupInstructions: [
      'Phase 1 — Pull-Up Bar Dead Hang: Grip the pull-up bar with an overhand shoulder-width grip. Hang with arms straight and body relaxed in full gravitational traction.',
      'Phase 2 — Scapular Depression Pull: Without bending your elbows even one millimeter, pull your shoulder blades forcefully down and back into your ribcage.',
      'Phase 3 — Torso Elevation & Chest Lift: Feel your torso elevate 2 to 3 inches purely from the muscular action of your lower traps and lats. Your chest tilts slightly upward.',
      'Phase 4 — 2-Second Top Isometric Hold: Hold this elevated scapular contraction for 2 full seconds.',
      'Phase 5 — Controlled Return to Full Hang: Slowly lower your torso back down over 2 seconds into a relaxed dead hang. Perform 2 sets of 8 reps to prime the scapulohumeral rhythm for pull-ups and overhead pressing.'
    ],
    creatorCues: [
      {
        creator: 'Jeff Cavaliere (ATHLEAN-X)',
        quote: 'Scapular pulls bridge the gap between dead hanging and pull-ups. Teaching your lower traps and serratus to initiate the pull protects your rotator cuff tendons from impingement.',
        biomechanicalRationale: 'Pre-activates upward and downward scapular rotators, preserving the subacromial space under traction.'
      }
    ],
    commonFaults: [
      'Bending elbows into a partial pull-up instead of pure scapular motion.',
      'Kipping or swinging legs to generate momentum.'
    ],
    rehabRegressions: [
      'Place feet lightly on a box or bench to offload body weight.'
    ]
  },
  {
    id: 'cue_wu_upper_b_2',
    exerciseId: 'w_upper_b_2',
    exerciseName: 'Indian Club Shoulder Spirals & Casts',
    title: 'Indian Club Shoulder Spirals & Casts',
    tier: 'Warmup',
    tempo: '2020',
    prescribedTempo: 'Fluid Circular Rhythm (10 circles / side)',
    primaryMuscles: ['Rotator Cuff (Supraspinatus, Infraspinatus, Teres Minor, Subscapularis)', 'Biceps Tendon'],
    equipment: 'Indian Clubs (2 lb or 5 lb clubs)',
    setup: 'Hold light Indian clubs; tall posture; soft knees; relax wrists.',
    setupInstructions: [
      'Phase 1 — Club Grip & Alignment: Hold 2 lb or 5 lb Indian clubs with thumbs aligned along the handle taper. Stand tall with soft knees.',
      'Phase 2 — Transverse Overhead Spiral: Swing one club in a broad overhead circle behind your neck and back, allowing the wrist to trace a figure-eight path.',
      'Phase 3 — Scapular Plane Coordination: Keep the club movement synchronized with your breath, flowing across the shoulder\'s natural scapular plane.',
      'Phase 4 — Bilateral Symmetry: Alternate sides or perform bilateral outward casts for 10 fluid circles per direction.',
      'Phase 5 — Joint Capsule Warmth: Activates the mechanoreceptors within the shoulder joint capsule, lubricating the biceps tendon groove before overhead loads.'
    ],
    creatorCues: [
      {
        creator: 'Marcus Filly & Athlean-X Priming',
        quote: 'The shoulder is a 360-degree ball-and-socket joint that rarely moves in single planes. Indian clubs force the joint through spiral patterns, warming every corner of the rotator cuff.',
        biomechanicalRationale: 'Multi-planar rotational patterns stimulate dynamic stabilization across the rotator cuff and long head of the biceps.'
      }
    ],
    commonFaults: [
      'Holding arms rigidly straight instead of fluid, relaxed arcs.',
      'Rushing the circular cadence.'
    ],
    rehabRegressions: [
      'Perform spirals with light water bottles or unweighted hands.'
    ]
  },
  {
    id: 'cue_wu_upper_b_3',
    exerciseId: 'w_upper_b_3',
    exerciseName: 'Scapular Wall Slides + 360 Brace',
    title: 'Scapular Wall Slides + 360 Brace',
    tier: 'Warmup',
    tempo: '3012',
    prescribedTempo: '3012 (3s Slide Up / 2s Peak Reach)',
    primaryMuscles: ['Serratus Anterior', 'Lower Trapezius', 'Core Stabilizers'],
    equipment: 'Wall & Flat Floor',
    setup: 'Heels 6" from wall; buttocks, upper back, and head flat against wall; lower back flush.',
    setupInstructions: [
      'Phase 1 — Wall Stance Setup: Stand with your heels 6 inches from a wall. Rest your buttocks, upper back, and back of head flat against the wall.',
      'Phase 2 — 360° Abdominal Cylinder Lock: Inhale and brace your abdomen, flattening your lower back against the wall so there is zero gap behind your lumbar spine.',
      'Phase 3 — "W" Arm Position: Place the backs of your hands, wrists, and elbows flat against the wall with arms formed in a "W" shape.',
      'Phase 4 — Overhead Slide to "Y" (3s Tempo): Slowly slide your forearms upward along the wall into a "Y" position over 3 seconds, keeping elbows and wrists pinned against the wall.',
      'Phase 5 — 2-Second Upward Shrug & Hold: At the top, perform an active upward reach with your shoulder blades (activating serratus anterior) while keeping your lower back glued to the wall.',
      'Phase 6 — Return to "W": Slowly return to the starting "W" shape. Perform 2 sets of 10 reps to establish thoracic extension and upward scapular rotation before barbell overhead pressing.'
    ],
    creatorCues: [
      {
        creator: 'Dr. Aaron Horschig (Squat University)',
        quote: 'If you cannot slide your arms overhead against a wall without arching your lower back, you do not have the mobility to press a barbell overhead safely. Wall slides test and restore true thoracic extension.',
        biomechanicalRationale: 'Demands active upward scapular rotation via serratus anterior and lower traps while maintaining abdominal wall neutral spine.'
      }
    ],
    commonFaults: [
      'Letting the lower back arch away from the wall as arms reach upward.',
      'Allowing elbows or wrists to peel off the wall.'
    ],
    rehabRegressions: [
      'Perform floor slides lying supine with knees bent to eliminate standing balance demands.'
    ]
  },

  // ==========================================
  // ATHLEAN-X DAILY ABS & CORE PROTOCOL
  // ==========================================
  {
    id: 'cue_athlean_hanging_knee_raise',
    exerciseId: 't3_athlean_hanging_knee_raise',
    exerciseName: 'Athlean-X Hanging Knee Raise with Posterior Pelvic Tilt',
    title: 'Athlean-X Hanging Knee Raise with Posterior Pelvic Tilt',
    tier: 'T3',
    tempo: '2112',
    prescribedTempo: '2112 (2s Lower / 1s Bottom / 1s Lift / 2s Top Squeeze)',
    primaryMuscles: ['Lower Rectus Abdominis', 'Iliopsoas', 'Transversus Abdominis', 'Forearms'],
    equipment: 'Pull-Up Bar & Bodyweight',
    setup: 'Dead hang from pull-up bar, palms facing away, thumbs wrapped; engage lats and shoulders slightly.',
    setupInstructions: [
      'Phase 1 — Bar Hang Setup: Grip the pull-up bar shoulder-width apart. Wrap thumbs around the bar. Pack your shoulder blades downward into active depression to stabilize the glenohumeral joint.',
      'Phase 2 — Core Pre-Tension: Inhale diaphragmatically into your belly and exhale forcefully to brace your abdominal wall. Do not hang completely loose with arched lower back.',
      'Phase 3 — The Bottom-Up Pelvic Curl: Rather than merely swinging your knees up with hip flexors, curl your pelvis upward toward your ribcage into a strong posterior pelvic tilt.',
      'Phase 4 — 2-Second Peak Squeeze: At the top (knees near chest height), hold the pelvic tuck for a full 2-second contraction while exhaling all remaining air.',
      'Phase 5 — Strict 2-Second Lowering: Lower your legs under full control over 2 seconds without allowing your legs to swing behind your vertical centerline.',
      'Phase 6 — Anti-Momentum Dead Stop: Stop completely at the bottom for 1 second before beginning the next repetition. Zero swinging.'
    ],
    creatorCues: [
      {
        creator: 'Jeff Cavaliere (ATHLEAN-X)',
        quote: 'If you just lift your legs, your hip flexors do 90% of the work and pull your spine forward. To actually work the abs, you must curl your pelvis up toward your ribcage. Show your tailbone to the wall in front of you!',
        biomechanicalRationale: 'Pelvic elevation actively recruits the lower rectus abdominis against the gravitational torque of the lower body, prioritizing core contraction over psoas dominance.'
      }
    ],
    commonFaults: [
      'Using swinging hip momentum to throw legs upward.',
      'Lifting knees without curling the pelvis into posterior tilt.',
      'Hyperextending the lumbar spine at the bottom of each rep.'
    ],
    rehabRegressions: [
      'Perform lying reverse pelvic curls on the floor with knees bent and hands bracing the rack base.'
    ]
  },
  {
    id: 'cue_athlean_hanging_corkscrew',
    exerciseId: 't3_athlean_hanging_corkscrew',
    exerciseName: 'Athlean-X Hanging Corkscrews (Bottom-Up Oblique Drive)',
    title: 'Athlean-X Hanging Corkscrews',
    tier: 'T3',
    tempo: '2111',
    prescribedTempo: '2111 (Controlled Diagonal Twist)',
    primaryMuscles: ['Internal Obliques', 'External Obliques', 'Lower Rectus Abdominis', 'Serratus Anterior'],
    equipment: 'Pull-Up Bar & Bodyweight',
    setup: 'Active dead hang from bar; ribs down; core braced.',
    setupInstructions: [
      'Phase 1 — Active Hang: Grip bar shoulder-width apart with thumbs wrapped. Pack shoulder blades downward.',
      'Phase 2 — Diagonal Pelvic Rotation: Initiate by lifting knees diagonally toward the right armpit, twisting the pelvis 30–45 degrees as it ascends.',
      'Phase 3 — Oblique Peak Contraction: Hold the top diagonal peak for 1 second, focusing on wringing out the obliques like a wet towel.',
      'Phase 4 — Controlled Descent: Lower legs under control back through center over 2 seconds.',
      'Phase 5 — Alternating Twist: Repeat immediately to the left side, driving knees toward left armpit with smooth rotational control.'
    ],
    creatorCues: [
      {
        creator: 'Jeff Cavaliere (ATHLEAN-X)',
        quote: 'The obliques do not just bend you sideways; they rotate the pelvis and ribcage in opposition. By adding a corkscrew twist to the bottom-up raise, we fire both the internal and external oblique slings simultaneously.',
        biomechanicalRationale: 'Diagonal pelvic flexion under suspension engages the contralateral external oblique and ipsilateral internal oblique force-couple while sparing lumbar discs.'
      }
    ],
    commonFaults: [
      'Swinging wildly in circles without a distinct pause at peak twist.',
      'Twisting the neck or upper shoulders instead of the pelvis and lower torso.'
    ],
    rehabRegressions: [
      'Perform supine twisting reverse crunches on the floor with arms out for balance.'
    ]
  },
  {
    id: 'cue_athlean_hollow_body_hold',
    exerciseId: 't3_athlean_hollow_body_hold',
    exerciseName: 'Athlean-X Hollow Body Core Compression Hold',
    title: 'Athlean-X Hollow Body Core Compression Hold',
    tier: 'T3',
    tempo: '0010',
    prescribedTempo: 'Isometric Hold (25–35s)',
    primaryMuscles: ['Rectus Abdominis', 'Transversus Abdominis', 'Hip Flexors', 'Quadriceps'],
    equipment: 'Flat Floor & Bodyweight',
    setup: 'Lie supine on floor; arms overhead; legs extended together; lumbar spine pressed flush to floor.',
    setupInstructions: [
      'Phase 1 — Ground Setup: Lie flat on your back on the floor. Extend arms overhead by your ears and glue your legs straight together.',
      'Phase 2 — Zero-Gap Lumbar Pin: Press your lower back completely flat against the floor. A piece of paper placed under your lumbar spine should be impossible to pull out.',
      'Phase 3 — Lift Extremities: Elevate your shoulders, head, and feet 4–6 inches off the floor. Your body should resemble a shallow banana or curved rocking bowl.',
      'Phase 4 — Core Compression: Pull your belly button down into your spine while maintaining steady shallow diaphragmatic breathing.',
      'Phase 5 — Sustained Isometric Tension: Hold for 25–35 seconds. If your lower back arches away from the floor at any point, terminate or regress immediately.'
    ],
    creatorCues: [
      {
        creator: 'Jeff Cavaliere (ATHLEAN-X) & Yellow Dude',
        quote: 'The moment your lower back leaves the floor, your abs have surrendered and your lumbar spine is bearing the load. Glue that lower back down and breathe through the compression.',
        biomechanicalRationale: 'Maximizes mid-range isometric anti-extension and co-activates the transversus abdominis and rectus abdominis to resist anterior pelvic tilt.'
      }
    ],
    commonFaults: [
      'Allowing the lower back to arch off the floor.',
      'Holding breath instead of diaphragmatic breathing.',
      'Bending the knees when attempting the full advanced variation.'
    ],
    rehabRegressions: [
      'Perform tuck hollow hold with knees bent at 90° or arms held at your sides.'
    ]
  },
  {
    id: 'cue_athlean_cross_mountain_climber',
    exerciseId: 't3_athlean_cross_mountain_climber',
    exerciseName: 'Athlean-X Cross-Body Mountain Climbers',
    title: 'Athlean-X Cross-Body Mountain Climbers',
    tier: 'T3',
    tempo: '2011',
    prescribedTempo: '2011 (Controlled Cross-Body Drive)',
    primaryMuscles: ['External Obliques', 'Internal Obliques', 'Serratus Anterior', 'Core Stabilizers'],
    equipment: 'Flat Floor & Bodyweight',
    setup: 'Push-up plank position with hands under shoulders, body in a straight line from head to heels.',
    setupInstructions: [
      'Phase 1 — Push-Up Plank Base: Start in a high push-up plank. Hands directly beneath shoulders, fingers spread, core braced rigidly.',
      'Phase 2 — Protracted Scapulae: Push the floor away through your palms to protract your shoulder blades and recruit the serratus anterior.',
      'Phase 3 — Cross-Body Knee Drive: Drive your right knee diagonally across your chest toward your left elbow.',
      'Phase 4 — 1-Second Rotational Squeeze: When the knee nears the opposite elbow, pause for a deliberate 1-second contraction to squeeze the obliques.',
      'Phase 5 — Controlled Return: Step the right foot back smoothly to the plank position over 2 seconds.',
      'Phase 6 — Alternate Sides: Drive the left knee across to the right elbow. Continue alternating with deliberate cadence, not frantic cardio running.'
    ],
    creatorCues: [
      {
        creator: 'Jeff Cavaliere (ATHLEAN-X)',
        quote: 'Do not bounce through these like high-school cardio drills. Slow it down! Drive the knee across, squeeze your obliques hard against the opposite elbow for a full second, then reset.',
        biomechanicalRationale: 'Top-down rotational vector that trains the oblique force-couple against rotational torque on a stable pelvic platform.'
      }
    ],
    commonFaults: [
      'Rushing reps like a sprint without pausing at peak oblique contraction.',
      'Allowing hips to pike high into the air or sag toward the floor.'
    ],
    rehabRegressions: [
      'Place hands elevated on a bench or sturdy chair to reduce shoulder and core load.'
    ]
  },
  {
    id: 'cue_athlean_iso_crunch',
    exerciseId: 't3_athlean_iso_crunch',
    exerciseName: 'Athlean-X 2-Second Peak Squeeze Floor Curl-Up',
    title: 'Athlean-X 2-Second Peak Squeeze Floor Curl-Up',
    tier: 'T3',
    tempo: '2112',
    prescribedTempo: '2112 (2s Lower / 1s Rest / 1s Curl / 2s Peak Squeeze)',
    primaryMuscles: ['Upper Rectus Abdominis', 'Transversus Abdominis'],
    equipment: 'Flat Floor & Bodyweight',
    setup: 'Lie supine, knees bent 90°, feet flat on floor; fingertips touching temples or hands across chest; chin slightly tucked.',
    setupInstructions: [
      'Phase 1 — Setup Position: Lie supine with knees bent at 90 degrees and feet flat. Place fingertips lightly against your temples (do NOT interlace fingers behind neck).',
      'Phase 2 — Cervical Spine Sparing: Tuck chin gently like holding an apple between chin and chest. Maintain this position throughout to eliminate cervical strain.',
      'Phase 3 — Top-Down Curl: Inhale, then as you exhale forcefully, curl only your shoulder blades up off the floor (approx. 30 degrees of thoracic flexion).',
      'Phase 4 — 2-Second Peak Iso-Hold: Hold the top contraction for 2 full seconds while blowing out every cubic centimeter of air, pulling the ribcage toward your pelvis.',
      'Phase 5 — Controlled Descent: Lower slowly over 2 seconds until shoulder blades touch the floor.',
      'Phase 6 — Repeat for 12–15 reps of pure, unadulterated upper abdominal tension.'
    ],
    creatorCues: [
      {
        creator: 'Jeff Cavaliere (ATHLEAN-X)',
        quote: 'Do not sit all the way up! Once your shoulder blades leave the floor, any additional movement is done by the hip flexors. Stop at 30 degrees, exhale all your air, and squeeze your abs for 2 seconds.',
        biomechanicalRationale: 'Limits spinal flexion to the thoracic region, sparing lumbar discs while maximizing peak concentric tension on the upper rectus abdominis.'
      }
    ],
    commonFaults: [
      'Yanking on the neck with hands.',
      'Sitting all the way up into hip flexion (involving psoas).',
      'Holding breath instead of exhaling on the squeeze.'
    ],
    rehabRegressions: [
      'Dr. Stuart McGill Supported Curl-Up: Keep one knee straight, slide hands under the lower back to preserve neutral lordosis, and lift head and upper shoulders only 1 inch.'
    ]
  },
  {
    id: 'cue_athlean_serratus_plank',
    exerciseId: 't3_athlean_serratus_plank',
    exerciseName: 'Athlean-X Serratus Elbow-to-Knee Plank + Vacuum Brace',
    title: 'Athlean-X Serratus Elbow-to-Knee Plank + Vacuum Brace',
    tier: 'T3',
    tempo: '0010',
    prescribedTempo: 'Isometric Hold (30–45s)',
    primaryMuscles: ['Transversus Abdominis', 'Serratus Anterior', 'Internal Obliques', 'Pelvic Floor'],
    equipment: 'Flat Floor & Bodyweight',
    setup: 'Forearm plank position; elbows directly under shoulders; forearms parallel; body in a rigid straight line.',
    setupInstructions: [
      'Phase 1 — Forearm Plank Setup: Set elbows directly under shoulders, forearms flat and parallel. Extend legs with toes tucked.',
      'Phase 2 — Active Serratus Protraction: Push into the floor through your elbows and forearms to spread your shoulder blades apart (scapular protraction). Do not sink between your shoulders.',
      'Phase 3 — Posterior Pelvic Tuck: Squeeze your glutes and tuck your pelvis slightly into posterior tilt.',
      'Phase 4 — The Isometric Vice: Isometrically drag your elbows toward your toes and pull your toes toward your elbows without moving either. This multiplies abdominal tension fourfold.',
      'Phase 5 — Diaphragmatic Vacuum Breath: Maintain the intense tension while breathing rhythmically through your nose. Hold for 30–45 seconds.'
    ],
    creatorCues: [
      {
        creator: 'Jeff Cavaliere (ATHLEAN-X) & Dr. Stuart McGill',
        quote: 'A passive plank where you just hang out on your joints for two minutes is useless. Active tension—protracting the serratus and pulling elbows to toes—creates maximum intra-abdominal stiffness in 30 seconds.',
        biomechanicalRationale: 'Actively couples the serratus anterior and transversus abdominis to form a rigid, 360-degree corset around the lumbar spine.'
      }
    ],
    commonFaults: [
      'Allowing lower back to sag toward the floor (anterior tilt).',
      'Winged shoulder blades (failing to push floor away).',
      'Holding breath instead of maintaining rhythmic diaphragmatic respiration.'
    ],
    rehabRegressions: [
      'Drop knees to the floor into an elevated knee forearm plank while maintaining serratus protraction.'
    ]
  },
  {
    id: 'cue_w_abs_1',
    exerciseId: 'w_abs_1',
    exerciseName: 'Dr. Stuart McGill Cat-Camel Spinal Wave',
    title: 'Dr. Stuart McGill Cat-Camel Spinal Wave',
    tier: 'Warmup',
    tempo: '4040',
    prescribedTempo: '4040 (4s Arch Up / 4s Gentle Sag Down)',
    primaryMuscles: ['Erector Spinae', 'Rectus Abdominis', 'Intervertebral Disc Facets'],
    equipment: 'Flat Floor & Bodyweight',
    setup: 'All fours on hands and knees; hands under shoulders, knees under hips.',
    setupInstructions: [
      'Phase 1 — Quadruped Base: Position hands directly under shoulders and knees directly under hips. Spine in neutral.',
      'Phase 2 — Cat Wave (Flexion): Slowly arch your back upward toward the ceiling over 4 seconds, letting your head drop relaxed between your arms.',
      'Phase 3 — Camel Wave (Extension): Slowly articulate the spine in the opposite direction over 4 seconds, lifting head slightly and allowing lower back to sag gently.',
      'Phase 4 — Motion, Not Stretch: Move through a comfortable, pain-free range of motion without pushing into hard end-range stretching. Complete 6 slow cycles.'
    ],
    creatorCues: [
      {
        creator: 'Dr. Stuart McGill',
        quote: 'The Cat-Camel is not a stretch—it is a motion cycle to reduce internal friction and lubricate the intervertebral joints before loading.',
        biomechanicalRationale: 'Reduces passive spinal stiffness and flushes synovial fluid across intervertebral disc spaces.'
      }
    ],
    commonFaults: [
      'Forcing aggressive hyperextension or hyperflexion at the end points.',
      'Moving too quickly.'
    ],
    rehabRegressions: [
      'Reduce the range of spinal motion if any facet joint pinch is felt.'
    ]
  },
  {
    id: 'cue_w_abs_2',
    exerciseId: 'w_abs_2',
    exerciseName: 'Athlean-X 90/90 Diaphragmatic Vacuum Breath',
    title: 'Athlean-X 90/90 Diaphragmatic Vacuum Breath',
    tier: 'Warmup',
    tempo: '4083',
    prescribedTempo: '4s Inhale / 8s Full Exhale / 3s Vacuum Hold',
    primaryMuscles: ['Transversus Abdominis', 'Diaphragm', 'Pelvic Floor'],
    equipment: 'Flat Floor & Bodyweight',
    setup: 'Lie supine with hips and knees at 90 degrees resting on a bench or chair.',
    setupInstructions: [
      'Phase 1 — 90/90 Supine Setup: Lie flat on back with calves resting on a workout bench or chair with knees and hips at 90 degrees.',
      'Phase 2 — 360° Nasal Inhale: Inhale deeply through your nose for 4 seconds, expanding belly, sides, and lower back 360 degrees.',
      'Phase 3 — Full Forced Exhale: Blow out through pursed lips for 7–8 seconds until every drop of air has vacated your lungs.',
      'Phase 4 — Transversus Abdominis Vacuum: At the bottom of exhalation, pull your navel down toward your spine, creating a vacuum tuck. Hold for 3 seconds.',
      'Phase 5 — Repeat for 5 deep breath cycles to activate the natural lifting belt.'
    ],
    creatorCues: [
      {
        creator: 'Jeff Cavaliere (ATHLEAN-X)',
        quote: 'You cannot train your core properly if you do not know how to engage your transversus abdominis. Exhale completely, draw your belly button in, and feel that deep inner belt tighten.',
        biomechanicalRationale: 'Activates the deep transversus abdominis and resets the diaphragm before core training.'
      }
    ],
    commonFaults: [
      'Inhaling only into the chest instead of 360° abdominal cylinder.',
      'Not exhaling completely before drawing navel inward.'
    ],
    rehabRegressions: [
      'Perform lying flat with knees bent and feet on floor.'
    ]
  },
  {
    id: 'cue_t3_bjj_hanging_knee_raise',
    exerciseId: 't3_bjj_hanging_knee_raise',
    exerciseName: 'Athlean-X Post-Grappling Hanging Knee Raise & Pelvic Decompression',
    title: 'Athlean-X Post-Grappling Hanging Knee Raise & Pelvic Decompression',
    tier: 'T3',
    tempo: '2112',
    prescribedTempo: '2112 (2s Down / 1s Hang / 1s Drive / 2s Peak Posterior Tilt)',
    primaryMuscles: ['Lower Rectus Abdominis', 'Transversus Abdominis', 'Iliopsoas', 'Forearms'],
    equipment: 'Pull-Up Bar',
    setup: 'Overhead grip on pull-up bar, shoulder-width apart, arms fully extended into active dead hang with depressed scapulae.',
    setupInstructions: [
      'Phase 1 — Scapular Engagement: Hang from bar and depress your shoulder blades downward (active hang). Do not hang passively on shoulder ligaments.',
      'Phase 2 — The Posterior Pelvic Tilt: Initiate the movement by curling your pelvis up toward your belly button BEFORE your knees rise. This ensures lower rectus abdominis initiates rather than the hip flexors.',
      'Phase 3 — Knees-to-Chest Lift: Drive knees toward sternum until thighs pass 90 degrees.',
      'Phase 4 — 2-Second Peak Squeeze: At the top, hold for 2 full seconds while blowing out all your air, maximally curling pelvis toward ribs.',
      'Phase 5 — 2-Second Controlled Descent: Slowly lower legs over 2 full seconds back to dead hang with zero swinging momentum.'
    ],
    creatorCues: [
      {
        creator: 'Jeff Cavaliere (ATHLEAN-X)',
        quote: 'Hanging knee raises are NOT just lifting your legs. If your pelvis does not tilt upward toward your sternum, you are merely training the hip flexors while jamming your lumbar spine. Curl the pelvis, squeeze the lower abs, and use gravity to decompress.',
        biomechanicalRationale: 'Bottom-up kinetic chain vector combined with gravitational axial traction creates intervertebral disc spacing while firing lower rectus abdominis fibers.'
      }
    ],
    commonFaults: [
      'Swinging legs to build momentum.',
      'Lifting thighs without tilting the pelvis upward into posterior tilt.',
      'Arching lower back at the bottom of the movement.'
    ],
    rehabRegressions: [
      'Athlean-X Lying Reverse Pelvic Curls on Floor: Lie flat on mat with knees bent 90°, curl pelvis upward lifting sacrum 2–3 inches off floor without momentum.'
    ]
  },
  {
    id: 'cue_t3_bjj_hollow_body_hold',
    exerciseId: 't3_bjj_hollow_body_hold',
    exerciseName: 'Athlean-X Grappler Hollow Body Core Compression Hold',
    title: 'Athlean-X Grappler Hollow Body Core Compression Hold',
    tier: 'T3',
    tempo: '0010',
    prescribedTempo: 'Isometric Hold (25–35s)',
    primaryMuscles: ['Rectus Abdominis', 'Transversus Abdominis', 'Hip Flexors', 'Pelvic Floor'],
    equipment: 'Flat Floor & Bodyweight',
    setup: 'Lie supine on floor, arms extended overhead, legs straight together, toes pointed.',
    setupInstructions: [
      'Phase 1 — The Zero-Gap Rule: Press your lower back firmly into the floor so not even a piece of paper could slide under your lumbar spine.',
      'Phase 2 — Co-Contraction Lift: Squeeze your glutes, tilt your pelvis into posterior tilt, and elevate your legs 4–6 inches off the mat.',
      'Phase 3 — Upper Torso Elevation: Lift your shoulder blades and arms 4–6 inches off the mat, forming a shallow, rigid banana shape.',
      'Phase 4 — Isometric Compression: Hold this tension without allowing the lower back to peel off the mat. Breathe rhythmically through your nose throughout the hold.'
    ],
    creatorCues: [
      {
        creator: 'Jeff Cavaliere (ATHLEAN-X) & Yellow Dude',
        quote: 'The hollow body hold is the ultimate test of anti-extension. If your lower back leaves the floor, your core has failed and your lumbar spine is bearing the load. Regress to tuck if needed, but never compromise the zero-gap rule.',
        biomechanicalRationale: 'Locks the anterior core into a unified force shield, countering excessive lordosis and building endurance for closed guard and grappling posture.'
      }
    ],
    commonFaults: [
      'Lower back arching off the floor.',
      'Holding breath instead of diaphragmatic breathing.',
      'Craning the neck forward aggressively.'
    ],
    rehabRegressions: [
      'Tuck Hollow Body Hold: Bend knees at 90 degrees with hands at sides, keeping lumbar spine pressed completely flat against the mat.'
    ]
  },
  {
    id: 'cue_t3_bjj_cross_mountain_climber',
    exerciseId: 't3_bjj_cross_mountain_climber',
    exerciseName: 'Athlean-X Cross-Body Oblique Climbers & Serratus Punch',
    title: 'Athlean-X Cross-Body Oblique Climbers & Serratus Punch',
    tier: 'T3',
    tempo: '2011',
    prescribedTempo: '2011 (2s Return / 0s Pause / 1s Drive / 1s Peak Isometric Squeeze)',
    primaryMuscles: ['Internal Obliques', 'External Obliques', 'Serratus Anterior', 'Core Stabilizers'],
    equipment: 'Flat Floor & Bodyweight',
    setup: 'High push-up plank position; hands shoulder-width, body in a rigid straight line, shoulder blades protracted.',
    setupInstructions: [
      'Phase 1 — High Plank Alignment: Set hands under shoulders, toes tucked, core and glutes clamped into a rigid plank.',
      'Phase 2 — Diagonal Knee Drive: Drive your right knee diagonally across your body toward your left elbow.',
      'Phase 3 — 1-Second Rotational Peak Squeeze: At the end of the range, contract your right obliques and serratus intensely for 1 second, trying to touch the elbow.',
      'Phase 4 — Controlled Return: Smoothly return your right foot to starting position over 2 seconds with zero hip dip.',
      'Phase 5 — Alternate: Repeat with left knee driving toward right elbow.'
    ],
    creatorCues: [
      {
        creator: 'Jeff Cavaliere (ATHLEAN-X)',
        quote: 'Stop sprinting through mountain climbers like cardio. For core development, cross-body drives require a deliberate pause at the top where the oblique twists the ribcage across a stable pelvis.',
        biomechanicalRationale: 'Activates internal and external obliques in a cross-body kinetic vector, resetting rotational torque after asymmetric grappling passes and escapes.'
      }
    ],
    commonFaults: [
      'Bouncing or rushing reps without pausing at the cross-over peak.',
      'Hips piking high into the air.',
      'Shoulder blades winging or sinking.'
    ],
    rehabRegressions: [
      'Elevate hands on a bench or sturdy box to reduce gravitational load on the wrists and shoulders.'
    ]
  },
  {
    id: 'cue_t3_bjj_mcgill_curl_up',
    exerciseId: 't3_bjj_mcgill_curl_up',
    exerciseName: 'Dr. Stuart McGill Post-Grappling Isometric Curl-Up & Vacuum Brace',
    title: 'Dr. Stuart McGill Post-Grappling Isometric Curl-Up & Vacuum Brace',
    tier: 'T3',
    tempo: '1311',
    prescribedTempo: '1311 (1s Lift / 3s Iso Hold / 1s Down / 1s Reset)',
    primaryMuscles: ['Upper Rectus Abdominis', 'Transversus Abdominis', 'Deep Core Cylinder'],
    equipment: 'Flat Floor & Bodyweight',
    setup: 'Lie supine with one knee bent 90° and the other straight on floor. Slide hands palms-down under the lumbar lordosis to preserve neutral curve.',
    setupInstructions: [
      'Phase 1 — Hand Placement: Slide both hands under your lower back to monitor that the lumbar spine does NOT flatten or move during the movement.',
      'Phase 2 — Single Knee Bent: Bend one knee at 90° with foot flat; keep the other leg relaxed and extended on the mat.',
      'Phase 3 — Unitized Elevation: Keeping chin tucked as if holding an apple, elevate only your head and upper shoulders 1–2 inches off the mat as a rigid unit.',
      'Phase 4 — 3-Second Isometric Brace: Hold the peak contraction for 3 seconds while maintaining a 360-degree abdominal brace. Do not allow your neck to flex forward.',
      'Phase 5 — Switch leg position halfway through the set to balance pelvic tilt.'
    ],
    creatorCues: [
      {
        creator: 'Dr. Stuart McGill',
        quote: 'Traditional sit-ups and crunches impose thousands of Newtons of destructive shear force on vulnerable lumbar discs. The McGill Curl-Up preserves natural lumbar lordosis while activating the rectus abdominis and deep abdominal wall with zero spinal motion.',
        biomechanicalRationale: 'Locks the lumbar spine in its neutral lordotic alignment, eliminating flexion shear stress on intervertebral discs after intense ground grappling.'
      }
    ],
    commonFaults: [
      'Flattening lower back into floor and flexing lumbar spine.',
      'Yanking neck forward into excessive cervical flexion.',
      'Lifting torso too high off the floor.'
    ],
    rehabRegressions: [
      'Focus purely on the diaphragmatic 360° abdominal brace without lifting the head until neck endurance develops.'
    ]
  },
  {
    id: 'cue_bjj_back_bridge',
    exerciseId: 't3_bjj_back_bridge_extension',
    exerciseName: 'Range of Strength Back Bridge & Thoracic Extension Arc',
    title: 'Range of Strength Back Bridge & Thoracic Extension Arc',
    tier: 'T3',
    tempo: '0030',
    prescribedTempo: 'Isometric Arc (Hold 20-30s / Smooth Nasal Breathing)',
    primaryMuscles: ['Spinal Extensors (Erector Spinae)', 'Thoracic Spine', 'Gluteus Maximus', 'Pectorals & Anterior Deltoids'],
    equipment: 'Flat Floor & Bodyweight',
    setup: 'Lie supine with knees bent and feet hip-width. Place hands next to ears with fingers pointing toward shoulders. Press through heels and palms to arc into extension.',
    setupInstructions: [
      'Phase 1 — Hand & Foot Rooting: Lie flat on your back, bend knees with feet flat near glutes. Plant palms beside your head with fingers pointing toward your shoulders.',
      'Phase 2 — Pelvic & Chest Drive: Press firmly through heels and palms simultaneously to drive hips toward ceiling and push chest backward through your arms.',
      'Phase 3 — Continuous Arc Distribution: Strive to distribute the curve smoothly across the entire thoracic and lumbar spine, rather than hinging sharply at L4-S1.',
      'Phase 4 — Controlled Isometric Hold: Breathe smoothly through your nose for 20–30 seconds. Slowly tuck chin and lower down bone by bone.'
    ],
    creatorCues: [
      {
        creator: 'Lucas Hardie (Range of Strength)',
        quote: 'The back bridge is the knees-over-toes concept for the lower back. Avoiding spinal extension entirely makes the spine fragile and brittle. Distribute the extension arc evenly through the thoracic spine and open the ribcage to reverse thousands of seconds of grappling flexion.',
        biomechanicalRationale: 'Restores active sagittal spinal extension and anterior chain compliance, decompressing anterior intervertebral disc margins compressed during prolonged guard play.'
      }
    ],
    commonFaults: [
      'Hinging sharply at the lumbar spine instead of pushing the thoracic spine through the shoulders.',
      'Holding breath and panicking in deep spinal extension.',
      'Feet splaying excessively outward.'
    ],
    rehabRegressions: [
      'Elevate feet on an 8–12 inch box or perform tabletop glute bridge with hands on floor behind hips.'
    ]
  },
  {
    id: 'cue_bjj_downregulation_electrolytes',
    exerciseId: 't3_bjj_downregulation_electrolytes',
    exerciseName: 'Derek (MPMD) Down-Regulation Breathing & Electrolyte Hydration Protocol',
    title: 'Derek (MPMD) Down-Regulation Breathing & Electrolyte Hydration Protocol',
    tier: 'T3',
    tempo: '4040',
    prescribedTempo: '4040 (4s Inhale / 4s Hold / 4s Exhale / 4s Hold)',
    primaryMuscles: ['Autonomic Nervous System (Parasympathetic Switch)', 'Diaphragm', 'Vagus Nerve Tone'],
    equipment: 'Floor / Mat & High-Sodium Electrolyte Beverage',
    setup: 'Lie flat on back with calves resting on a bench or wall (90/90 passive decompressed posture). Keep high-sodium electrolyte water at arm reach.',
    setupInstructions: [
      'Phase 1 — Supine Decompression: Lie supine with legs elevated on a bench or wall at 90 degrees to immediately reduce venous pooling and lower cardiac output.',
      'Phase 2 — Nasal Box Breathing Cadence: Inhale slowly through your nose into the abdomen for 4 seconds, hold gently for 4 seconds, exhale smoothly through mouth for 4 seconds, hold empty for 4 seconds.',
      'Phase 3 — Systemic Parasympathetic Activation: Continue for 3 to 5 minutes until heart rate drops below 90 BPM and autonomic nervous tone shifts out of fight-or-flight sympathetic overdrive.',
      'Phase 4 — Targeted Electrolyte Replenishment: Sip 16–24 oz of water containing 500–1000mg sodium and 200–400mg potassium to replenish acute fluid and mineral losses from grappling.'
    ],
    creatorCues: [
      {
        creator: 'Derek (More Plates More Dates)',
        quote: 'Physical training and martial arts cannot be isolated from internal biochemistry and autonomic recovery. Heavy sweating depletes plasma volume, potassium, and sodium, leaving you in sympathetic overdrive. Standardize 5g daily creatine, replenish electrolytes post-session, and enforce an 8-to-10 hour caffeine curfew to protect sleep architecture and hormone levels.',
        biomechanicalRationale: 'Accelerates cortisol clearance and vagal nerve activation via controlled diaphragmatic respiration, while sodium-potassium rehydration restores intravascular volume and prevents hyponatremic cramping.'
      }
    ],
    commonFaults: [
      'Chest breathing into the neck and shoulders instead of 360-degree abdominal expansion.',
      'Drinking plain distilled water without electrolytes, diluting serum sodium further.',
      'Consuming high-stimulant energy drinks late in the day after evening training sessions.'
    ],
    rehabRegressions: [
      'Perform standard physiological sighs (two quick nasal inhales followed by one long extended exhale) if box breathing holds cause tension.'
    ]
  },
  {
    id: 'cue_w_run_1',
    exerciseId: 'w_run_1',
    exerciseName: 'Squat U Ankle Mobilization & Tripod Rooting',
    title: 'Squat U Ankle Mobilization & Tripod Rooting',
    tier: 'Warmup',
    tempo: '2020',
    prescribedTempo: '2020 (2s Forward Glide / 0s / 2s End-Range Hold / 0s Reset)',
    primaryMuscles: ['Talocrural Joint', 'Soleus', 'Achilles Tendon', 'Plantar Fascia Foot Tripod'],
    equipment: 'Flat Floor & Bodyweight',
    setup: 'Half-kneeling or standing with front foot 3–4 inches from wall or post. Root big toe knuckle, pinky toe knuckle, and heel center.',
    setupInstructions: [
      'Phase 1 — Stance Setup: Stand or half-kneel with front foot 3–4 inches from wall or post.',
      'Phase 2 — Root Tripod: Press big toe knuckle, pinky toe knuckle, and heel firmly into floor.',
      'Phase 3 — Ankle Glide: Drive knee over 2nd toe with heel pinned down.',
      'Phase 4 — 2s End-Range Hold: Hold end-range dorsiflexion for 2 seconds; repeat 10 reps per side.'
    ],
    creatorCues: [
      {
        creator: 'Dr. Aaron Horschig (Squat University)',
        quote: 'Dorsiflexion restriction forces the foot into pronation and the knee into valgus collapse during ground strike. Root the foot tripod and drive the knee over the second toe without letting the heel lift.',
        biomechanicalRationale: 'Restores posterior talar glide within the mortise joint, preventing tibial internal rotational torque.'
      }
    ],
    commonFaults: [
      'Allowing the heel to lift off the floor during the forward knee drive.',
      'Collapsing the medial longitudinal arch into knee valgus.'
    ],
    rehabRegressions: [
      'Use a light resistance band anchored behind the ankle across the talus to assist posterior glide.'
    ]
  },
  {
    id: 'cue_w_run_2',
    exerciseId: 'w_run_2',
    exerciseName: 'ATG Tibialis Wall Raises',
    title: 'ATG Tibialis Wall Raises',
    tier: 'Warmup',
    tempo: '2011',
    prescribedTempo: '2011 (2s Lower / 0s / 1s Pull / 1s Squeeze)',
    primaryMuscles: ['Tibialis Anterior', 'Extensor Digitorum Longus', 'Anterior Compartment'],
    equipment: 'Smooth Wall & Bodyweight',
    setup: 'Lean hips and upper back against wall with legs straight, feet positioned 12–18 inches away from wall.',
    setupInstructions: [
      'Phase 1 — Wall Lean Setup: Lean back against wall with legs straight and heels 12–18" out.',
      'Phase 2 — Dorsiflexion Pull: Pull toes and balls of feet up toward shins as high as possible.',
      'Phase 3 — 1-Second Tibialis Squeeze: Hold top contraction for 1 second, burning the tibialis anterior.',
      'Phase 4 — Controlled Lowering: Lower slowly over 2 seconds; complete 15 reps to prepare for ground impact.'
    ],
    creatorCues: [
      {
        creator: 'Ben Patrick (ATG)',
        quote: 'The tibialis anterior is the first line of defense for ground impact deceleration. Bulletproofing the tibialis protects the knees, ankles, and shins from 3–4x bodyweight running impact.',
        biomechanicalRationale: 'Builds eccentric force absorption capacity in the anterior compartment, preventing shin splints.'
      }
    ],
    commonFaults: [
      'Bending the knees to cheat the ankle range of motion.',
      'Bouncing heels off the floor without a 1-second isometric hold.'
    ],
    rehabRegressions: [
      'Step heels closer to the wall (6–8 inches) to decrease resistance and leverage.'
    ]
  },
  {
    id: 'cue_w_run_3',
    exerciseId: 'w_run_3',
    exerciseName: 'Dr. Alyssa Lu Glute Medius & Pelvic Leveling',
    title: 'Dr. Alyssa Lu Glute Medius & Pelvic Leveling',
    tier: 'Warmup',
    tempo: '2020',
    prescribedTempo: '2020 (2s Single-Leg Level / 0s / 2s Glute Hold / 0s Switch)',
    primaryMuscles: ['Gluteus Medius', 'Gluteus Minimus', 'Tensor Fasciae Latae', 'Pelvic Stabilizers'],
    equipment: 'Flat Floor & Bodyweight',
    setup: 'Stand upright on one leg with soft knee and slight athletic hip hinge, hands resting on iliac crests.',
    setupInstructions: [
      'Phase 1 — Single-Leg Stance: Stand on one leg with soft knee and slight athletic hip hinge.',
      'Phase 2 — Pelvic Leveling: Keep pelvis perfectly horizontal without dropping contralateral hip.',
      'Phase 3 — Glute Medius Hold: Squeeze lateral glute to stabilize stance for 2 seconds.',
      'Phase 4 — Alternation: Perform 10 controlled reps per side to eliminate runner IT band friction.'
    ],
    creatorCues: [
      {
        creator: 'Dr. Alyssa Lu (Proformance)',
        quote: 'Running is a continuous series of single-leg landings. If the glute medius is dormant, the opposite hip drops and the stance knee rotates inward, causing IT band friction and runner knee.',
        biomechanicalRationale: 'Activates lateral hip abductors to maintain horizontal pelvic alignment in the frontal plane.'
      }
    ],
    commonFaults: [
      'Contralateral hip dipping downward (Trendelenburg sign).',
      'Leaning torso sideways to compensate for glute medius weakness.'
    ],
    rehabRegressions: [
      'Keep fingertips lightly touching a wall or chair for balance assistance.'
    ]
  },
  {
    id: 'cue_w_bjj_1',
    exerciseId: 'w_bjj_1',
    exerciseName: 'McGill Down-Regulation Diaphragmatic Breathing',
    title: 'McGill Down-Regulation Diaphragmatic Breathing',
    tier: 'Warmup',
    tempo: '4070',
    prescribedTempo: '4070 (4s Nasal Inhale / 0s Hold / 7s Mouth Exhale / 0s Reset)',
    primaryMuscles: ['Diaphragm', 'Intercostals', 'Autonomic Vagus Nerve', 'Spinal Decompressors'],
    equipment: 'Mat / Floor & Elevated Bench',
    setup: 'Lie supine on back with calves elevated at 90 degrees on bench or couch. Hands resting gently on lower ribs.',
    setupInstructions: [
      'Phase 1 — Supine Decompression: Lie flat on back with knees bent or calves elevated on bench.',
      'Phase 2 — 4-Second Nasal Inhale: Inhale 4s through nose, expanding abdomen and lateral ribs 360 degrees.',
      'Phase 3 — 7-Second Mouth Exhale: Exhale smoothly through mouth for 7s, allowing all grappling tension to melt.',
      'Phase 4 — 3-Minute Down-Regulation: Continue rhythm for 3 minutes to activate parasympathetic recovery.'
    ],
    creatorCues: [
      {
        creator: 'Dr. Stuart McGill',
        quote: 'After extreme spinal flexion and combat stress, the sympathetic nervous system locks muscles into guarded splinting. Long, controlled diaphragmatic exhalations reset tone and decompress intervertebral discs.',
        biomechanicalRationale: 'Activates parasympathetic vagal stimulation, lowering heart rate and normalizing intra-abdominal resting pressure.'
      }
    ],
    commonFaults: [
      'Chest breathing into the clavicles rather than expanding lateral lower ribs.',
      'Rushing the exhalation without allowing full ribcage depression.'
    ],
    rehabRegressions: [
      'Place a light 5 lb sandbag or book on the belly to provide tactile biofeedback for diaphragmatic rise.'
    ]
  }
];
