// src/domain/adaptiveStretching.ts
import { MobilityEntry } from './mobility';
import { SetLogRecord } from '../components/ExerciseCard';

export interface AdaptiveStretch {
  id: string;
  name: string;
  creator: string;
  targetArea: string;
  targetMuscles: string[];
  durationSeconds: number;
  isBilateral: boolean;
  priorityScore: number;
  triggerSource: 'comment' | 'mobility_test' | 'preventive_maintenance';
  triggerReason: string;
  coachingQuote: string;
  instructions: string[];
  commonFaults: string[];
  recommendedTempo?: string;
  tags: string[];
}

export interface DetectedIssue {
  category: 'knee' | 'hamstring' | 'back' | 'shoulder' | 'ankle' | 'hip' | 'dance';
  label: string;
  source: string;
  quote?: string;
  severity: 'high' | 'medium' | 'low';
}

export interface AdaptiveStretchingResult {
  stretches: AdaptiveStretch[];
  totalDurationSeconds: number;
  detectedIssues: DetectedIssue[];
  summaryText: string;
  analyzedNotesCount: number;
  analyzedMobilityTestsCount: number;
}

export const STRETCH_CATALOG: AdaptiveStretch[] = [
  {
    id: 'stretch_couch_psoas',
    name: 'Alyssa Lu Couch Stretch & Psoas Contract-Relax',
    creator: 'Dr. Alyssa Lu (Proformance Sports Therapy)',
    targetArea: 'Quadriceps, Patellar Tendon & Hip Flexors',
    targetMuscles: ['Rectus Femoris', 'Psoas Major', 'Iliacus', 'Vastus Medialis'],
    durationSeconds: 90,
    isBilateral: true,
    priorityScore: 90,
    triggerSource: 'preventive_maintenance',
    triggerReason: 'Proactive Knee Bulletproofing: Releases chronic anterior tension to safeguard patellar tendon load capacity.',
    coachingQuote: 'Opening the anterior hip chain takes massive tensile shear off the patellar tendon during deep knee flexion.',
    instructions: [
      'Position back knee within 2–4 inches of a wall or sturdy box, shin vertical against the surface.',
      'Step the opposite foot forward into a 90-degree lunge stance, keeping torso upright.',
      'Execute a posterior pelvic tilt: tuck your tailbone under and squeeze your trailing glute hard.',
      'Active Contract-Relax: Press the back foot into the wall for 5 seconds (20% effort), exhale, then sink 1 inch deeper.',
      'Hold steady for 90 seconds per side while breathing into the lower abdomen.'
    ],
    commonFaults: [
      'Hyperextending the lumbar spine (arching lower back) instead of engaging glute.',
      'Allowing the front heel to lift off the floor during lunge repositioning.'
    ],
    recommendedTempo: '5s Contract / 10s Relax',
    tags: ['knee', 'quad', 'hip', 'patellar']
  },
  {
    id: 'stretch_atg_elephant_walks',
    name: 'Ben Patrick (ATG) Dynamic Elephant Walks',
    creator: 'Ben Patrick (Athletic Truth Group)',
    targetArea: 'Hamstrings, Calves & Sciatic Nerve Flossing',
    targetMuscles: ['Biceps Femoris', 'Semimembranosus', 'Gastrocnemius', 'Soleus'],
    durationSeconds: 90,
    isBilateral: false,
    priorityScore: 85,
    triggerSource: 'preventive_maintenance',
    triggerReason: 'Posterior Kinetic Chain Decompression: Dynamically lengthens tight hamstrings through active reciprocal inhibition.',
    coachingQuote: 'Pumping the quads actively unlocks the hamstrings without triggering the defensive stretch reflex.',
    instructions: [
      'Stand with feet hip-to-shoulder width apart, hinge deeply from the hips with hands on an elevated surface or the floor.',
      'Bend one knee deeply (30–45 degrees) while locking the opposite knee fully and contracting that quad firmly.',
      'Hold the lockout for 1–2 seconds to feel the deep hamstring bellies release.',
      'Smoothly alternate sides, performing 30–40 alternating pumping cycles over 90 seconds.',
      'Relax your neck and jaw; allow gravity to gently decompress the upper spine.'
    ],
    commonFaults: [
      'Bouncing aggressively into the bottom position instead of controlling the quad contraction.',
      'Holding breath or straining through lower back rounding.'
    ],
    recommendedTempo: '0101',
    tags: ['hamstring', 'posterior_chain', 'calves', 'sciatic']
  },
  {
    id: 'stretch_wall_ankle_mob',
    name: 'Dr. Aaron Horschig Wall Ankle Dorsiflexion Mobilization',
    creator: 'Dr. Aaron Horschig (Squat University)',
    targetArea: 'Talocrural Ankle Joint & Achilles Tendon',
    targetMuscles: ['Soleus', 'Gastrocnemius', 'Anterior Talofibular Capsule'],
    durationSeconds: 90,
    isBilateral: true,
    priorityScore: 80,
    triggerSource: 'preventive_maintenance',
    triggerReason: 'Squat Tracking Optimization: Restores forward tibial travel to eliminate compensatory knee valgus and patellar shear.',
    coachingQuote: 'If your ankles cannot dorsiflex, your knees are forced to take on compensatory rotary torque.',
    instructions: [
      'Position toes 3–4 inches away from a sturdy wall in a staggered half-kneeling or standing lunge.',
      'Drive the front knee directly forward over the 2nd and 3rd toes toward the wall.',
      'Crucial: Keep the entire heel glued 100% flat to the floor at all times.',
      'Perform 25–30 slow, controlled pulses per side, holding each end-range stretch for 2 seconds.',
      'Repeat on the opposite leg, noting any side-to-side asymmetry.'
    ],
    commonFaults: [
      'Letting the heel lift off the ground to fake extra dorsiflexion range.',
      'Letting the knee cave inward (valgus collapse) inside the big toe.'
    ],
    recommendedTempo: '0202',
    tags: ['ankle', 'calf', 'calves', 'dorsiflexion', 'achilles']
  },
  {
    id: 'stretch_mcgill_cat_camel',
    name: 'Dr. Stuart McGill Spinal Decompression & Lateral Child\'s Pose',
    creator: 'Dr. Stuart McGill (Spine Biomechanics)',
    targetArea: 'Thoracolumbar Spine & Quadratus Lumborum Decompression',
    targetMuscles: ['Erector Spinae', 'Quadratus Lumborum', 'Latissimus Dorsi', 'Thoracolumbar Fascia'],
    durationSeconds: 90,
    isBilateral: true,
    priorityScore: 75,
    triggerSource: 'preventive_maintenance',
    triggerReason: 'Axial Spine Decompression: Flushes intervertebral discs with nutrient-rich synovial fluid following compound loading.',
    coachingQuote: 'Motion without friction: the Cat-Camel reduces spinal viscosity without imposing compressive micro-trauma.',
    instructions: [
      'Begin on all fours on a padded mat with hands under shoulders and knees under hips.',
      'Gently arch the back up toward the ceiling (Cat), then smoothly reverse into mild neutral extension (Camel) for 6–8 slow cycles.',
      'Sit your hips back onto your heels with knees wide in Child\'s Pose.',
      'Walk both hands diagonally 45 degrees to the right to open the left quadratus lumborum and lat; breathe deeply for 40 seconds.',
      'Walk hands across to the left side and hold for 40 seconds to release the right lumbar erectors.'
    ],
    commonFaults: [
      'Forcing end-range hyperextension or hard lumbar flexion.',
      'Shrugging shoulders into ears while reaching diagonally.'
    ],
    recommendedTempo: '0404',
    tags: ['back', 'lumbar', 'spine', 'erector']
  },
  {
    id: 'stretch_doorway_pec_minor',
    name: 'Jeff Cavaliere (ATHLEAN-X) Doorway Pec Minor & Cross-Body Scapular Distraction',
    creator: 'Jeff Cavaliere (ATHLEAN-X)',
    targetArea: 'Pectoralis Minor, Anterior Deltoid & Posterior Shoulder Capsule',
    targetMuscles: ['Pectoralis Minor', 'Infraspinatus', 'Teres Minor', 'Subscapularis'],
    durationSeconds: 60,
    isBilateral: true,
    priorityScore: 70,
    triggerSource: 'preventive_maintenance',
    triggerReason: 'Shoulder Impingement Prevention: Opens the anterior chest to restore scapular posterior tilt and subacromial clearance.',
    coachingQuote: 'A tight pec minor tilts the scapula forward and downward, creating mechanical impingement whenever you press overhead.',
    instructions: [
      'Stand inside a doorway and place forearm against the door jamb with elbow bent at 90–100 degrees.',
      'Step forward with the same-side leg and rotate torso gently away until feeling a deep pectoral release.',
      'Keep shoulder blade retracted and depressed (down and back); hold for 30 seconds.',
      'Immediately transition: reach arm across chest, using opposite forearm to hug elbow in for 30 seconds to decompress the posterior capsule.',
      'Repeat the 60-second complex on the opposite arm.'
    ],
    commonFaults: [
      'Allowing the anterior shoulder head to glide forward into the joint capsule.',
      'Shrugging the shoulder toward the ear during the cross-body hug.'
    ],
    recommendedTempo: 'Isometric Hold',
    tags: ['shoulder', 'pec', 'chest', 'rotator']
  },
  {
    id: 'stretch_90_90_hip_capsule',
    name: 'Eugene Teo 90/90 Hip Internal & External Rotation Reset',
    creator: 'Eugene Teo & Yellow Dude',
    targetArea: 'Femoral-Acetabular Joint & Deep Hip Rotators',
    targetMuscles: ['Gluteus Medius', 'Piriformis', 'Obturator Internus', 'Adductor Magnus'],
    durationSeconds: 90,
    isBilateral: true,
    priorityScore: 65,
    triggerSource: 'preventive_maintenance',
    triggerReason: 'Hip Capsule Integrity: Mobilizes internal and external femoral rotation to unlock deeper, symmetrical squat depth.',
    coachingQuote: 'Restoring femoral internal rotation eliminates pelvic shift and prevents compensatory lumbar torsion in the hole.',
    instructions: [
      'Sit on the floor with front leg bent at 90 degrees (shin parallel to chest) and back leg bent at 90 degrees to your side.',
      'Square your sternum toward your front knee with a tall spine, then hinge forward from the hips for 45 seconds (external rotation).',
      'Sit tall, plant fingertips behind you, and rotate torso gently toward the rear hip to engage active internal rotation for 45 seconds.',
      'Switch leg positions smoothly and repeat on the opposite side.'
    ],
    commonFaults: [
      'Rounding the thoracic spine instead of hinging strictly from the pelvis.',
      'Collapsing the chest onto the front shin with loose core bracing.'
    ],
    recommendedTempo: '0202 Slow Shifts',
    tags: ['hip', 'glute', 'adductor', 'groin']
  },
  {
    id: 'stretch_tibialis_calves_slant',
    name: 'ATG Tibialis & Plantar Fascia Slant Stretch',
    creator: 'Ben Patrick (ATG) & Yellow Dude',
    targetArea: 'Anterior & Posterior Lower Leg Chain',
    targetMuscles: ['Tibialis Anterior', 'Gastrocnemius', 'Soleus', 'Plantar Fascia'],
    durationSeconds: 60,
    isBilateral: true,
    priorityScore: 60,
    triggerSource: 'preventive_maintenance',
    triggerReason: 'Lower Leg Shock Absorption: Unlocks soleus and plantar fascial mobility to absorb kinetic impact before reaching knees.',
    coachingQuote: 'Your foot and lower leg are your body\'s primary suspension coils; keep them supple to shield your joints.',
    instructions: [
      'Place toes high on a slant board, weight plate edge, or against a wall with heel grounded.',
      'Keep knee straight and lean forward for 30 seconds to target the upper gastrocnemius.',
      'Slightly bend the knee 15–20 degrees while keeping the heel glued down for 30 seconds to focus on the deep soleus muscle.',
      'Switch legs and repeat for a full 60 seconds per leg.'
    ],
    commonFaults: [
      'Lifting the heel off the ground or pronating the foot.',
      'Hyperextending the knee joint during the straight-leg segment.'
    ],
    recommendedTempo: 'Isometric Stretch',
    tags: ['calf', 'calves', 'tibialis', 'foot']
  },
  {
    id: 'stretch_ros_back_bridge',
    name: 'Lucas Hardie (Range of Strength) Back Bridge & Thoracic Arc',
    creator: 'Lucas Hardie (Range of Strength)',
    targetArea: 'Full Spinal Column, Anterior Chest & Hip Flexors',
    targetMuscles: ['Erector Spinae', 'Thoracic Spine', 'Rectus Abdominis', 'Iliopsoas', 'Anterior Deltoids', 'Pectoralis Major'],
    durationSeconds: 60,
    isBilateral: false,
    priorityScore: 90,
    triggerSource: 'preventive_maintenance',
    triggerReason: 'Spinal Extension Restoration: Balances prolonged sitting, heavy deadlifts, and grappling flexion with active thoracic and hip extension.',
    coachingQuote: 'The back bridge is the knees-over-toes concept for the lower back. Distributing the extension arc across the entire spine prevents back fragility.',
    instructions: [
      'Lie supine with knees bent and feet flat on floor hip-width apart.',
      'Place palms flat next to your ears with fingers pointing toward your shoulders.',
      'Press through heels and hands to arc hips toward the ceiling and push chest backward through shoulders.',
      'Distribute the curve smoothly across the entire thoracic spine rather than hinging sharply at L4-S1.',
      'Hold for 20–30 seconds with calm nasal breathing, slowly lower down bone by bone, and rest.'
    ],
    commonFaults: [
      'Hinging exclusively at the lumbar spine without thoracic extension.',
      'Holding breath in maximum extension.'
    ],
    recommendedTempo: '20-30s Controlled Isometric Arc',
    tags: ['back', 'spine', 'extension', 'bridge', 'thoracic', 'posture', 'hip_flexor']
  },
  {
    id: 'stretch_mpmd_parasympathetic_electrolytes',
    name: 'Derek (More Plates More Dates) Down-Regulation Box Breathing & Recovery Flush',
    creator: 'Derek (More Plates More Dates)',
    targetArea: 'Autonomic Nervous System & Endocrine Recovery',
    targetMuscles: ['Diaphragm', 'Vagus Nerve Tone', 'Heart Rate Variability (HRV)', 'Intercostals'],
    durationSeconds: 120,
    isBilateral: false,
    priorityScore: 95,
    triggerSource: 'preventive_maintenance',
    triggerReason: 'Systemic Down-Regulation & Cortisol Clearance: Restores autonomic balance, aids post-sweat electrolyte uptake, and clears sympathetic stress for restorative slow-wave sleep.',
    coachingQuote: 'Training cannot be separated from internal biochemistry. Shift out of sympathetic overdrive with controlled box breathing and replenish electrolytes to protect hormone levels and collagen turnover.',
    instructions: [
      'Lie comfortably on your back with legs elevated on a bench or couch at 90 degrees.',
      'Inhale slowly through your nose into the deep belly for 4 seconds.',
      'Hold with lungs gently full for 4 seconds without neck tension.',
      'Exhale smoothly through your mouth for 4 seconds, feeling your ribcage deflate.',
      'Hold empty for 4 seconds before the next breath cycle. Repeat for 2–3 minutes while hydrating with electrolyte water.'
    ],
    commonFaults: [
      'Chest breathing with shoulder elevation.',
      'Skipping electrolyte replenishment after high-sweat training.'
    ],
    recommendedTempo: '4s Inhale / 4s Hold / 4s Exhale / 4s Hold',
    tags: ['recovery', 'sleep', 'cns', 'fatigue', 'parasympathetic', 'breathing', 'caffeine', 'electrolytes']
  },
  {
    id: 'stretch_rp_loaded_sfr_stretch',
    name: 'Dr. Mike Israetel (Renaissance Periodization) High-SFR Loaded Stretched-Position Hang',
    creator: 'Dr. Mike Israetel (Renaissance Periodization)',
    targetArea: 'Pectorals, Lats & Stretched Connective Tissue',
    targetMuscles: ['Pectoralis Major', 'Latissimus Dorsi', 'Anterior Deltoids', 'Thoracolumbar Fascia'],
    durationSeconds: 60,
    isBilateral: false,
    priorityScore: 78,
    triggerSource: 'preventive_maintenance',
    triggerReason: 'Stretch-Mediated Cellular Remodeling: Maximizes target muscle hypertrophic signalling at deep muscle lengths with high stimulus-to-fatigue ratio (SFR) and zero spinal shear.',
    coachingQuote: 'Loaded stretching at long muscle lengths provides potent hypertrophic stimulus without the high axial fatigue of extra heavy sets. Let the muscle hang into the deep stretch under active control.',
    instructions: [
      'Grip the pull-up bar with an overhand or neutral grip, or support hands on dumbbells/bench.',
      'Lower slowly into a controlled active hang with feet touching the floor for assistance if needed.',
      'Allow the lats and pectorals to elongate fully into the deepest comfortable stretch position.',
      'Hold for 30–45 seconds with relaxed abdominal breathing, feeling tension purely in muscle bellies, not joints.',
      'Step gently onto the floor and shake out the arms.'
    ],
    commonFaults: [
      'Completely disengaging shoulders into passive painful bone impingement.',
      'Holding breath during the lengthened hold.'
    ],
    recommendedTempo: 'HOLD-45',
    tags: ['chest', 'lats', 'shoulders', 'stretch', 'hypertrophy', 'sfr', 'lengthened']
  },
  {
    id: 'stretch_sbs_reactive_velocity_flush',
    name: 'Stronger By Science (Greg Nuckols & Dr. Eric Trexler) Reactive Deload & Joint Flush',
    creator: 'Greg Nuckols & Dr. Eric Trexler (Stronger By Science)',
    targetArea: 'Systemic Kinetic Chain & Neuromuscular Recovery',
    targetMuscles: ['Erector Spinae', 'Quadriceps', 'Hamstrings', 'Glenohumeral Joint'],
    durationSeconds: 90,
    isBilateral: false,
    priorityScore: 77,
    triggerSource: 'preventive_maintenance',
    triggerReason: 'Neuromuscular Recovery & Velocity Restoration: Dissipates acute fatigue accumulation across heavy compound sessions, restoring high-threshold motor unit recruitment capacity.',
    coachingQuote: 'Fatigue is systemic and non-linear. Flushing joints with non-fatiguing active mobility restores bar velocity faster than passive sitting.',
    instructions: [
      'Perform slow, rhythmic bodyweight hinges and deep knee bend transitions with zero external load.',
      'Focus on fluid, continuous movement through full comfortable range of motion.',
      'Cycle through 10 deep hip hinges followed by 10 slow goblet-depth air squats with arms reaching forward.',
      'Breathe rhythmically in through the nose and out through the mouth.'
    ],
    commonFaults: [
      'Turning recovery flush into an intense cardiovascular circuit.'
    ],
    recommendedTempo: 'Rhythmic Flow',
    tags: ['cns', 'recovery', 'velocity', 'joint', 'fatigue', 'mobility']
  },
  {
    id: 'stretch_hoh_long_length_decompression',
    name: 'House of Hypertrophy Lengthened-Position Posterior Chain Decompression',
    creator: 'House of Hypertrophy',
    targetArea: 'Hamstrings, Posterior Knee Capsule & Gluteals',
    targetMuscles: ['Biceps Femoris', 'Semitendinosus', 'Semimembranosus', 'Gluteus Maximus'],
    durationSeconds: 60,
    isBilateral: false,
    priorityScore: 76,
    triggerSource: 'preventive_maintenance',
    triggerReason: 'Long-Length Partials & Stretched Muscle Remodeling: Meta-analytic research demonstrates superior hypertrophy and passive tension adaptation when tissues are held under tension in lengthened ranges.',
    coachingQuote: 'Peer-reviewed meta-analyses show that tension in lengthened muscle positions triggers distinct structural and fascicle length adaptations. Prioritize the deep stretch.',
    instructions: [
      'Place one heel on an elevated 12–18" surface with knee slightly unlocked (10–15° bend).',
      'Hinge forward from the hips with a flat spine until a deep stretch is felt in the hamstring belly.',
      'Gently pulse 1–2 inches in the deep lengthened position for 30 seconds per leg.',
      'Repeat on contralateral side.'
    ],
    commonFaults: [
      'Rounding the lumbar spine to reach the toes.',
      'Hyperextending the knee joint during the stretch.'
    ],
    recommendedTempo: '30s Lengthened Micro-Pulse',
    tags: ['hamstring', 'posterior_chain', 'stretch', 'long_length', 'hypertrophy']
  }
];

/**
 * Dedicated 7-Step Evidence-Based Post-Bachata Dance Recovery Routine.
 * Specifically engineered for Latin social dancers:
 * 1. Dual-Angle Calf & Plantar Fascia Decompression (Forefoot taps & heels)
 * 2. Alyssa Lu Couch Stretch & Psoas-QL Lateral Reach (Soft-knee & beat-4 hip pop reset)
 * 3. Eugene Teo 90/90 Cuban Motion Hip Rotator & Piriformis Reset (Figure-8s & hip rolls)
 * 4. Stuart McGill Sensual Wave Decompression & Lateral Child's Pose (Body wave & dip recovery)
 * 5. Side-Lying Thoracic Windmill & Ribcage Decompression (Arm styling & frame rotation)
 * 6. Jeff Cavaliere Dance Frame Reset & Pec Minor Distraction (Upper-body frame restoration)
 * 7. Viparita Karani (Legs-Up-The-Wall) & Autonomic Parasympathetic Sigh (Venous drainage & vagus reset)
 */
export const BACHATA_RECOVERY_ROUTINE: AdaptiveStretch[] = [
  {
    id: 'stretch_bachata_wall_calf_plantar',
    name: 'Ben Patrick (ATG) Dual-Angle Calf & Plantar Fascia Decompression (Soleus Focus)',
    creator: 'Ben Patrick (ATG) & Dr. Aaron Horschig',
    targetArea: 'Soleus (Primary Decelerator), Gastrocnemius, Achilles & Plantar Fascia',
    targetMuscles: ['Soleus (6–8x BW Dance Decelerator)', 'Gastrocnemius (Lateral & Medial Heads)', 'Achilles Tendon', 'Plantar Fascia', 'Peroneus Longus/Brevis'],
    durationSeconds: 60,
    isBilateral: true,
    priorityScore: 95,
    triggerSource: 'preventive_maintenance',
    triggerReason: 'Foot & Ankle Decompression: Unloads extreme soleus shear (which absorbs 6–8x body weight in forefoot dance spins, vs 2–3x for gastroc) and relaxes plantar fascial tension from dancing on the balls of the feet and in heels.',
    coachingQuote: 'Your soleus absorbs up to 8x body weight on every turn and pivot. Bending the knee 20° slacks the gastrocnemius, isolating deep soleus fibers to shield the Achilles.',
    instructions: [
      'Step one foot back 2–3 feet from a wall, keeping the back leg straight and the entire heel glued flat to the floor for 20 seconds to stretch the gastrocnemius.',
      'Bent-Knee Soleus Isolation: Without moving your foot, bend the back knee 15–20 degrees while keeping the heel rooted. Feel the stretch shift beneath the calf deep into the soleus and lower Achilles for 25 seconds.',
      'Eccentric Soleus Drop: Kick toes up against the wall base or board edge, gently lowering the heel to lengthen soleus and Achilles fascicles under bodyweight tension.',
      'Plantar Fascia Stretch: Press toes firmly against the wall base with the ball of the foot on the floor, flexing toes back toward your shin for 15 seconds.',
      'Breathe deeply and switch to the opposite foot.'
    ],
    commonFaults: [
      'Allowing the heel to peel up off the floor to fake extra range.',
      'Pigeon-toeing or turning the foot outward; keep the second toe pointing straight forward.',
      'Keeping the knee locked during the soleus stretch (which keeps tension on the gastrocnemius instead).'
    ],
    recommendedTempo: '20s Straight Knee / 25s Bent Knee Soleus / 15s Plantar Fascia',
    tags: ['dance', 'bachata', 'soleus', 'calf', 'calves', 'achilles', 'plantar_fascia', 'footwork']
  },
  {
    id: 'stretch_bachata_couch_psoas_ql',
    name: 'Dr. Alyssa Lu Couch Stretch & Psoas-QL Lateral Reach (Hip Pop Reset)',
    creator: 'Dr. Alyssa Lu & Dr. Stuart McGill',
    targetArea: 'Psoas Major, Rectus Femoris, Iliacus & Quadratus Lumborum (QL)',
    targetMuscles: ['Psoas Major', 'Rectus Femoris', 'Iliacus', 'Quadratus Lumborum (QL)', 'Tensor Fasciae Latae'],
    durationSeconds: 75,
    isBilateral: true,
    priorityScore: 92,
    triggerSource: 'preventive_maintenance',
    triggerReason: 'Cuban Motion & Anterior Chain Reset: Releases the chronically shortened hip flexors from the "soft knee" dance posture and decompresses the unilateral QL from repetitive beat-4 hip pops.',
    coachingQuote: 'Dancing with soft knees keeps your hip flexors firing for hours. Squeezing your glute engages reciprocal inhibition, opening the hip and freeing the lower back.',
    instructions: [
      'Place rear knee within 2–4 inches of a wall or couch, shin vertical against the wall. Step opposite leg forward into a 90° lunge.',
      'Perform an active posterior pelvic tilt: tuck tailbone under and squeeze trailing glute hard (prevents lumbar arching).',
      'Hold upright for 45 seconds while breathing deeply into your lower pelvis to release the psoas and rectus femoris.',
      'QL Lateral Reach: Raise the same-side arm overhead and gently side-bend your torso toward the opposite side for 30 seconds to open the Quadratus Lumborum.',
      'Exhale slowly, release, and repeat on the other leg.'
    ],
    commonFaults: [
      'Arching the lower back into lumbar hyperextension instead of squeezing the glute.',
      'Collapsing the front knee inward or letting the front heel lift.'
    ],
    recommendedTempo: '45s Hip Flexor / 30s QL Lateral Reach',
    tags: ['dance', 'bachata', 'hip_flexor', 'psoas', 'ql', 'hip_pop', 'cuban_motion', 'knee']
  },
  {
    id: 'stretch_bachata_90_90_piriformis',
    name: 'Coach Eugene Teo 90/90 Cuban Motion Hip Rotator & Piriformis Reset (Deep-6 Focus)',
    creator: 'Coach Eugene Teo & Yellow Dude',
    targetArea: 'Deep Six Lateral Rotators, Piriformis, Gluteus Medius & Pelvic Capsule',
    targetMuscles: ['Deep Six Rotators (Piriformis, Obturators, Gemelli, Quadratus Femoris)', 'Gluteus Medius', 'Tensor Fasciae Latae (TFL)', 'Adductor Longus'],
    durationSeconds: 60,
    isBilateral: true,
    priorityScore: 88,
    triggerSource: 'preventive_maintenance',
    triggerReason: 'Pelvic Rotation & Cuban Motion Reset: Syncopated Cuban motion on beats 4 & 8 places asymmetric eccentric torque on the deep six external rotators. 90/90 resets femoral head centering and stops compensatory lumbar twisting.',
    coachingQuote: 'Sensual bachata rolls and Cuban motion demand extreme lateral hip endurance. The 90/90 restores hip internal/external rotation balance so your lumbar spine does not twist.',
    instructions: [
      'Sit on floor with front leg bent at 90° (shin parallel to chest) and rear leg bent at 90° out to your side.',
      'Deep-6 Rotator Focus: Square sternum over your front knee with a tall spine. Hinge strictly from the hips (avoid rounding back) forward over the front shin for 30 seconds to release the deep piriformis and obturators.',
      'Active Internal Rotation Reset: Return upright, plant fingertips behind your hips, and gently rotate your torso back toward the rear hip for 30 seconds to stimulate active internal rotation and center the femoral head.',
      'Smoothly transition legs to the opposite side and repeat.'
    ],
    commonFaults: [
      'Rounding the upper back to bring the forehead to the knee; keep spine long and chest proud.',
      'Lifting the front hip completely off the floor.'
    ],
    recommendedTempo: '30s Deep-6 External Rotators / 30s Internal Hip',
    tags: ['dance', 'bachata', 'hip', 'soleus', 'piriformis', 'deep_6_rotators', 'glute_med', 'rotators', 'figure_8']
  },
  {
    id: 'stretch_bachata_mcgill_cat_camel',
    name: 'Dr. Stuart McGill Sensual Wave Decompression & Lateral Child\'s Pose',
    creator: 'Dr. Stuart McGill (Spine Biomechanics)',
    targetArea: 'Thoracolumbar Spine, Facet Joints, Erector Spinae & Intervertebral Discs',
    targetMuscles: ['Erector Spinae', 'Thoracolumbar Fascia', 'Quadratus Lumborum', 'Multifidus', 'Latissimus Dorsi'],
    durationSeconds: 90,
    isBilateral: true,
    priorityScore: 85,
    triggerSource: 'preventive_maintenance',
    triggerReason: 'Spinal Shear & Wave Decompression: Flushes intervertebral discs with synovial fluid and resets hypertonic erectors after hours of body rolls, sensual waves, and dips.',
    coachingQuote: 'Motion without friction: Cat-Camel reduces spinal viscosity and resets facet joint shear without imposing compressive micro-trauma.',
    instructions: [
      'Begin on all fours on a padded mat with wrists under shoulders and knees directly under hips.',
      'Cat-Camel Flushes: Slowly flex the spine toward the ceiling (Cat) for 4 seconds, then smoothly transition through neutral into mild extension (Camel) for 4 seconds. Complete 8 slow, gentle cycles.',
      'Child\'s Pose Transition: Push hips back onto heels with knees slightly apart and arms stretched forward.',
      'Lateral QL Decompression: Walk both hands diagonally 45° to the right, anchoring the left hip down into the heel for 30 seconds.',
      'Walk hands across diagonally 45° to the left, breathing deeply into the right ribcage and lumbar erectors for 30 seconds.'
    ],
    commonFaults: [
      'Forcing end-range hyperextension or cranking the cervical spine upward.',
      'Holding breath; keep exhales long, slow, and diaphragmatic.'
    ],
    recommendedTempo: '0404 Fluid Waves / 30s Lateral Holds',
    tags: ['dance', 'bachata', 'spine', 'back', 'body_wave', 'lumbar', 'dips']
  },
  {
    id: 'stretch_bachata_thoracic_open_book',
    name: 'Side-Lying Thoracic Windmill & Ribcage Decompression',
    creator: 'Dr. Aaron Horschig & Coach Eugene Teo',
    targetArea: 'Thoracic Spine, Intercostal Muscles, Pectoralis Major & Scapula',
    targetMuscles: ['Thoracic Erector Spinae', 'Pectoralis Major/Minor', 'Intercostals', 'Anterior Shoulder Capsule', 'Rhomboids'],
    durationSeconds: 60,
    isBilateral: true,
    priorityScore: 82,
    triggerSource: 'preventive_maintenance',
    triggerReason: 'Rotational Mobility Restoration: Frees the ribcage and thoracic spine restricted by partner frame connection, arm styling, and partner spins.',
    coachingQuote: 'When the thoracic spine locks up from dancing, the lower back and neck are forced into compensatory twisting. Free the ribcage, protect the spine.',
    instructions: [
      'Lie on your side with hips and knees stacked at 90° (fetal position). Bottom arm extended out along floor perpendicular to torso.',
      'Place top hand on bottom hand. Keeping knees glued together and resting on floor, sweep the top arm in a wide, sweeping arc up past your head and across to the opposite floor.',
      'Rotate through your mid-back and ribcage, keeping eyes tracking your fingertips. Exhale completely as the shoulder opens.',
      'Perform 5 slow, flowing rotational windmills, pausing for 3–5 seconds at full open extension.',
      'Roll onto your opposite side and repeat.'
    ],
    commonFaults: [
      'Allowing the top knee to slide backward or lift off the floor (sacrifices thoracic isolation for lumbar twist). Keep knees pinned.',
      'Moving rapidly or jerky through the rotational sweep.'
    ],
    recommendedTempo: '0505 Sweeping Rotations',
    tags: ['dance', 'bachata', 'thoracic', 'ribcage', 'rotation', 'frame', 'spins']
  },
  {
    id: 'stretch_bachata_doorway_frame_reset',
    name: 'Jeff Cavaliere (ATHLEAN-X) Dance Frame Reset & Pec Minor Distraction',
    creator: 'Jeff Cavaliere (ATHLEAN-X)',
    targetArea: 'Pectoralis Minor, Anterior Deltoid, Biceps Short Head & Posterior Capsule',
    targetMuscles: ['Pectoralis Minor', 'Pectoralis Major (Clavicular)', 'Anterior Deltoid', 'Infraspinatus', 'Upper Trapezius'],
    durationSeconds: 60,
    isBilateral: true,
    priorityScore: 78,
    triggerSource: 'preventive_maintenance',
    triggerReason: 'Dance Frame Restoration: Counteracts hours of isometric arm elevation and forward-slumped frame posture, relieving subacromial shoulder impingement and neck strain.',
    coachingQuote: 'Maintaining an isometric dance frame for 3 hours pulls your scapulae forward and down. Opening the pec minor restores subacromial clearance immediately.',
    instructions: [
      'Stand in an open doorway. Place your forearm against the door jamb with elbow elevated above shoulder level (100°–110° angle).',
      'Step forward with the same-side foot and rotate your sternum gently away from the doorway until feeling a deep stretch across the upper chest and under the collarbone.',
      'Keep shoulder blade retracted and depressed (down and back); hold for 30 seconds.',
      'Immediately follow with Cross-Body Scapular Distraction: Bring that arm across your chest and use opposite forearm to gently hug the elbow in for 30 seconds to decompress the posterior capsule.',
      'Switch to the other arm and repeat.'
    ],
    commonFaults: [
      'Allowing the shoulder head to roll forward and dump anteriorly.',
      'Shrugging the shoulder up toward your ear while pulling across.'
    ],
    recommendedTempo: '30s Pec Minor / 30s Posterior Capsule',
    tags: ['dance', 'bachata', 'shoulder', 'pec_minor', 'frame', 'upper_body', 'lead', 'follow']
  },
  {
    id: 'stretch_bachata_venous_drainage_parasympathetic',
    name: 'Viparita Karani (Legs-Up-The-Wall) & Autonomic Parasympathetic Sigh',
    creator: 'Dr. Andrew Huberman & Sports Medicine Recovery',
    targetArea: 'Venous Circulation, Lymphatic Drainage, Diaphragm & Vagus Nerve',
    targetMuscles: ['Soleus / Plantar Fascia (Venous Pump)', 'Hamstrings', 'Pelvic Floor', 'Diaphragm'],
    durationSeconds: 120,
    isBilateral: false,
    priorityScore: 98,
    triggerSource: 'preventive_maintenance',
    triggerReason: 'Venous Pooling Flush & Sleep Preparation: Reverses gravity-dependent blood and lymph pooling in the lower legs and triggers parasympathetic vagal recovery after social dancing.',
    coachingQuote: 'Social dancing floods your system with cortisol and adrenaline while blood pools in your feet. Elevating your legs combined with double-inhale sighs shifts you into deep parasympathetic recovery.',
    instructions: [
      'Sit sideways next to a wall, then swing legs up the wall while lowering your torso flat onto the floor (hips resting 2–4 inches from the baseboard).',
      'Rest arms by your sides with palms turned upward. Close your eyes and allow gravity to passively drain pooled blood and metabolic fluid from your calves and feet.',
      'Physiological Sigh Breathing: Inhale deeply through your nose, take a second quick sharp inhale at the very top to maximally inflate your alveoli, then perform a long, slow sigh exhale through your mouth (cadence: 2s in + 1s in + 6s out).',
      'Complete 15–20 slow breath cycles over 2 to 3 minutes.',
      'Bend knees into chest and roll gently onto your right side before standing up.'
    ],
    commonFaults: [
      'Forcing hips flush against the wall if hamstrings are tight; slide hips back a few inches so your tailbone rests flat on the floor.',
      'Chest-only shallow breathing; ensure your belly rises with each inhale.'
    ],
    recommendedTempo: '2s Inhale + 1s Top Inhale / 6s Extended Exhale',
    tags: ['dance', 'bachata', 'recovery', 'parasympathetic', 'sleep', 'legs_up_wall', 'venous_drainage']
  }
];

interface KeywordMatcher {
  category: DetectedIssue['category'];
  keywords: string[];
  stretchId: string;
  issueLabel: string;
}

const KEYWORD_MATCHERS: KeywordMatcher[] = [
  {
    category: 'dance',
    keywords: ['bachata', 'dance', 'dancing', 'social dance', 'salsa', 'cuban motion', 'hip pop', 'partner dance', 'danced'],
    stretchId: 'stretch_90_90_hip_capsule',
    issueLabel: 'Latin Social Dancing & Bachata Hip/Spine Fatigue'
  },
  {
    category: 'knee',
    keywords: ['knee', 'patell', 'tendon', 'vmo', 'quad', 'front knee', 'kneecap', 'achy knee', 'sore knee'],
    stretchId: 'stretch_couch_psoas',
    issueLabel: 'Knee tendinitis sensitivity / Quadriceps tightness'
  },
  {
    category: 'hamstring',
    keywords: ['hamstring', 'hamstrings', 'hammies', 'posterior chain', 'stiff hamstring', 'tight hamstring', 'toe touch'],
    stretchId: 'stretch_atg_elephant_walks',
    issueLabel: 'Hamstring & posterior chain tightness'
  },
  {
    category: 'back',
    keywords: ['back', 'lumbar', 'spine', 'erector', 'lower back', 'low back', 'stiff back', 'sore back', 'compressed'],
    stretchId: 'stretch_mcgill_cat_camel',
    issueLabel: 'Lower back stiffness / Lumbar compression'
  },
  {
    category: 'shoulder',
    keywords: ['shoulder', 'rotator', 'impingement', 'pec', 'chest', 'bench pain', 'shoulder clicking', 'ac joint'],
    stretchId: 'stretch_doorway_pec_minor',
    issueLabel: 'Shoulder anterior tightness / Scapular impingement'
  },
  {
    category: 'ankle',
    keywords: ['ankle', 'calf', 'calves', 'achilles', 'dorsiflexion', 'heel lift', 'stiff ankle', 'shin splints'],
    stretchId: 'stretch_wall_ankle_mob',
    issueLabel: 'Ankle dorsiflexion restriction / Calf stiffness'
  },
  {
    category: 'hip',
    keywords: ['hip', 'glute', 'adductor', 'groin', 'hip flexor', 'piriformis', 'clicking hip', 'tight hips'],
    stretchId: 'stretch_90_90_hip_capsule',
    issueLabel: 'Hip capsule / Adductor & deep rotator restriction'
  }
];

export function generateAdaptiveStretchingRoutine(
  workoutLogs: Record<string, SetLogRecord[]> = {},
  mobilityHistory: MobilityEntry[] = []
): AdaptiveStretchingResult {
  const detectedIssues: DetectedIssue[] = [];
  const priorityBoosts: Record<string, { boost: number; reason: string; quote?: string }> = {};
  let totalNotesCount = 0;

  // 1. Scan Workout Set Logs from previous workouts (past 2 weeks)
  Object.entries(workoutLogs).forEach(([exerciseKey, sets]) => {
    if (!Array.isArray(sets)) return;
    sets.forEach((set) => {
      const rawNote = (set.notes || '').trim();
      if (!rawNote) return;
      totalNotesCount++;
      const lowerNote = rawNote.toLowerCase();

      KEYWORD_MATCHERS.forEach((matcher) => {
        const hasMatch = matcher.keywords.some((kw) => lowerNote.includes(kw));
        if (hasMatch) {
          // Record detected issue
          const existingIssue = detectedIssues.find((i) => i.category === matcher.category);
          if (!existingIssue) {
            detectedIssues.push({
              category: matcher.category,
              label: matcher.issueLabel,
              source: `Workout comment in ${exerciseKey.replace(/_/g, ' ')}`,
              quote: rawNote,
              severity: 'high'
            });
          }

          // Apply priority boost & trigger quote
          const currentBoost = priorityBoosts[matcher.stretchId]?.boost || 0;
          priorityBoosts[matcher.stretchId] = {
            boost: currentBoost + 50,
            reason: `Triggered by your recent workout comment: "${rawNote}" (${exerciseKey.replace(/_/g, ' ')}).`,
            quote: rawNote
          };
        }
      });
    });
  });

  // 2. Scan Mobility Test History (latest scores from tests)
  const latestByTest: Record<string, MobilityEntry> = {};
  mobilityHistory.forEach((entry) => {
    if (!entry.testId) return;
    const existing = latestByTest[entry.testId];
    if (!existing || (entry.date && existing.date && new Date(entry.date) > new Date(existing.date))) {
      latestByTest[entry.testId] = entry;
    }
  });

  const analyzedMobilityTestsCount = Object.keys(latestByTest).length;

  // Mobility Test 1: Split Squat Elevation (Knee / Quad Tendinitis Gate)
  if (latestByTest['split-squat-elevation']) {
    const entry = latestByTest['split-squat-elevation'];
    if (entry.value > 0) {
      detectedIssues.push({
        category: 'knee',
        label: `ATG Split Squat requires ${entry.value}" elevation (Tendon offload needed)`,
        source: 'Mobility Tracker Test',
        severity: entry.value >= 6 ? 'high' : 'medium'
      });
      const cur = priorityBoosts['stretch_couch_psoas']?.boost || 0;
      priorityBoosts['stretch_couch_psoas'] = {
        boost: cur + (entry.value >= 6 ? 60 : 40),
        reason: `Triggered by Mobility Test: ATG Split Squat requires ${entry.value}" front-foot elevation. Opening the anterior hip reduces patellar tendon shear.`
      };
    }
  }

  // Mobility Test 2: Knee-to-Wall Ankle Dorsiflexion
  if (latestByTest['knee-to-wall']) {
    const entry = latestByTest['knee-to-wall'];
    if (entry.value < 4.0) {
      detectedIssues.push({
        category: 'ankle',
        label: `Ankle Dorsiflexion at ${entry.value}" (< 4.0" benchmark)`,
        source: 'Mobility Tracker Test',
        severity: entry.value < 2.5 ? 'high' : 'medium'
      });
      const cur = priorityBoosts['stretch_wall_ankle_mob']?.boost || 0;
      priorityBoosts['stretch_wall_ankle_mob'] = {
        boost: cur + 55,
        reason: `Triggered by Mobility Test: Knee-to-Wall dorsiflexion is ${entry.value}" (below 4.0" benchmark). Mobilizing the talocrural joint protects your knees during squats.`
      };
    }
  }

  // Mobility Test 3: Elephant Walk (Hamstring Reach Level 1-5)
  if (latestByTest['elephant-walk']) {
    const entry = latestByTest['elephant-walk'];
    if (entry.value < 4) {
      detectedIssues.push({
        category: 'hamstring',
        label: `Hamstring Reach Level ${entry.value}/5 (< Level 4 target)`,
        source: 'Mobility Tracker Test',
        severity: entry.value <= 2 ? 'high' : 'medium'
      });
      const cur = priorityBoosts['stretch_atg_elephant_walks']?.boost || 0;
      priorityBoosts['stretch_atg_elephant_walks'] = {
        boost: cur + 50,
        reason: `Triggered by Mobility Test: Hamstring Reach is at Level ${entry.value} of 5. Dynamic elephant walks decompress posterior chain without tearing tendons.`
      };
    }
  }

  // Mobility Test 4: Biering-Sorensen (Lumbar Extensor Endurance)
  if (latestByTest['biering-sorensen']) {
    const entry = latestByTest['biering-sorensen'];
    if (entry.value < 120) {
      detectedIssues.push({
        category: 'back',
        label: `Back Extensor Hold at ${entry.value}s (< 120s benchmark)`,
        source: 'Mobility Tracker Test',
        severity: entry.value < 60 ? 'high' : 'medium'
      });
      const cur = priorityBoosts['stretch_mcgill_cat_camel']?.boost || 0;
      priorityBoosts['stretch_mcgill_cat_camel'] = {
        boost: cur + 45,
        reason: `Triggered by Mobility Test: Biering-Sørensen hold scored ${entry.value}s (< 120s target). Gentle spinal decompression alleviates lumbar erector fatigue.`
      };
    }
  }

  // Mobility Test 5: Dead Hang (Shoulder / Spinal Traction)
  if (latestByTest['dead-hang']) {
    const entry = latestByTest['dead-hang'];
    if (entry.value < 60) {
      detectedIssues.push({
        category: 'shoulder',
        label: `Dead Hang Hold at ${entry.value}s (< 60s benchmark)`,
        source: 'Mobility Tracker Test',
        severity: 'medium'
      });
      const cur = priorityBoosts['stretch_doorway_pec_minor']?.boost || 0;
      priorityBoosts['stretch_doorway_pec_minor'] = {
        boost: cur + 40,
        reason: `Triggered by Mobility Test: Dead Hang hold was ${entry.value}s (< 60s target). Opening the pec minor and subacromial space decompresses the glenohumeral joint.`
      };
    }
  }

  // 3. Assemble and rank the personalized stretch routine
  const personalizedStretches: AdaptiveStretch[] = STRETCH_CATALOG.map((baseStretch) => {
    const boostInfo = priorityBoosts[baseStretch.id];
    if (boostInfo) {
      return {
        ...baseStretch,
        priorityScore: baseStretch.priorityScore + boostInfo.boost,
        triggerSource: boostInfo.quote ? ('comment' as const) : ('mobility_test' as const),
        triggerReason: boostInfo.reason
      };
    }
    return { ...baseStretch };
  });

  // Sort by final priorityScore descending
  personalizedStretches.sort((a, b) => b.priorityScore - a.priorityScore);

  // Filter to the top 4-5 high-impact stretches to keep the routine focused (~6–8 minutes total)
  const selectedStretches = personalizedStretches.slice(0, 5);

  const totalDurationSeconds = selectedStretches.reduce((acc, curr) => {
    // If bilateral, count 2x duration for total routine time
    return acc + (curr.isBilateral ? curr.durationSeconds * 2 : curr.durationSeconds);
  }, 0);

  // Generate adaptive summary description
  let summaryText = '';
  if (detectedIssues.length > 0) {
    const issueNames = detectedIssues.map((d) => d.category).filter((v, i, a) => a.indexOf(v) === i);
    summaryText = `Custom routine adapted for your reported ${issueNames.join(', ')} tension from the last 2 weeks of workouts and mobility assessments.`;
  } else {
    summaryText = 'Proactive 4-Creator recovery routine designed to maintain knee bulletproofing, hamstring elasticity, and spinal hygiene.';
  }

  return {
    stretches: selectedStretches,
    totalDurationSeconds,
    detectedIssues,
    summaryText,
    analyzedNotesCount: totalNotesCount,
    analyzedMobilityTestsCount
  };
}

/**
 * Returns the fully structured Post-Bachata Dance Recovery Routine with
 * dance medicine diagnostic context, bilateral timing, and science-backed targets.
 */
export function getBachataRecoveryRoutine(): AdaptiveStretchingResult {
  const totalDurationSeconds = BACHATA_RECOVERY_ROUTINE.reduce((acc, curr) => {
    return acc + (curr.isBilateral ? curr.durationSeconds * 2 : curr.durationSeconds);
  }, 0);

  return {
    stretches: BACHATA_RECOVERY_ROUTINE,
    totalDurationSeconds,
    detectedIssues: [
      {
        category: 'ankle',
        label: 'Forefoot & Achilles Overload (Syncopated Taps & Elevated Heels)',
        source: 'Latin Dance Kinesiology Protocol',
        severity: 'high'
      },
      {
        category: 'hip',
        label: 'Cuban Motion & Beat-4 Hip Pop (TFL/QL & Deep Rotator Fatigue)',
        source: 'Latin Dance Kinesiology Protocol',
        severity: 'high'
      },
      {
        category: 'back',
        label: 'Sensual Wave Facet Shear & Partner Dips (Spinal Decompression)',
        source: 'Spine Biomechanics Protocol (Dr. Stuart McGill)',
        severity: 'medium'
      },
      {
        category: 'shoulder',
        label: 'Dance Frame Anterior Chain Contracture (Pec Minor & Trapezius)',
        source: 'Posture & Scapular Protocol (Jeff Cavaliere)',
        severity: 'medium'
      },
      {
        category: 'dance',
        label: 'Autonomic Sympathetic Tone & Lower Extremity Venous Pooling',
        source: 'Neuro-Autonomic Recovery (Dr. Andrew Huberman)',
        severity: 'medium'
      }
    ],
    summaryText: 'Scientific 7-step post-social dance recovery protocol engineered for Bachata and Latin dancers: decompresses calves and plantar fascia from forefoot taps, releases the psoas and QL from Cuban motion hip pops, frees deep piriformis rotators from sensual figure-8s, flushes spinal facet shear from body waves, resets dance frame posture, and triggers parasympathetic down-regulation.',
    analyzedNotesCount: 0,
    analyzedMobilityTestsCount: 0
  };
}
