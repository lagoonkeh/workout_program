// src/domain/adaptationClocks.ts
/**
 * Exercise Science & Creator Study Syntheses
 * Directly derived from verified documents for Yellow Dude, Jeff Nippard, Lucas Hardie, and Dr. Stuart McGill.
 */

export interface AdaptationClock {
  id: 'neural' | 'soreness' | 'cardiovascular' | 'hypertrophy' | 'tendons';
  name: string;
  speed: 'Fastest' | 'Fast' | 'Split' | 'Slow' | 'Slowest';
  timelineLabel: string;
  estimatedWeeks: string;
  biologicalMechanism: string;
  athleteWarning: string;
  creatorAttribution: string;
  quote: string;
}

export interface GateRung {
  rung: number;
  name: string;
  gateCriteria: string;
  techniqueRule: string;
}

export interface GateLadder {
  id: 'push' | 'pull' | 'squat';
  movementName: string;
  pattern: string;
  rungs: GateRung[];
  theRung2Trap: string;
}

export const FIVE_CLOCKS_OF_ADAPTATION: AdaptationClock[] = [
  {
    id: 'neural',
    name: '1. Nervous System Adaptation',
    speed: 'Fastest',
    timelineLabel: 'Weeks 1 to 3',
    estimatedWeeks: '1–3 weeks',
    biologicalMechanism:
      'Early strength gains are driven by neuromuscular coordination: recruiting more dormant motor units simultaneously, increasing motoneuron firing rates, and reciprocal inhibition of antagonists.',
    athleteWarning:
      'Rapid strength jumps in your first 3 weeks do not indicate new muscle mass; they reflect neuromuscular optimization. Do not spike training weight too fast.',
    creatorAttribution: 'Yellow Dude (@yellowdude_co)',
    quote: 'The spinal cord adapts weeks before muscle cross-sectional area changes.',
  },
  {
    id: 'soreness',
    name: '2. Muscle Soreness & The Repeated Bout Effect',
    speed: 'Fast',
    timelineLabel: 'Weeks 1 to 2',
    estimatedWeeks: '1–2 weeks',
    biologicalMechanism:
      'Delayed-Onset Muscle Soreness (DOMS) stems from microscopic z-disc disruption and localized inflammatory repair, not lactic acid. Subsequent exposures activate the Repeated Bout Effect, shielding fibers from soreness.',
    athleteWarning:
      'Chasing severe soreness is an invalid marker of workout quality. Once your body adapts to a pattern, absence of soreness indicates structural resilience, not wasted effort.',
    creatorAttribution: 'Yellow Dude (@yellowdude_co)',
    quote: 'Repeating the exact same movement produces significantly less soreness. No pain no gain is dead science.',
  },
  {
    id: 'cardiovascular',
    name: '3. Cardiovascular & Blood Volume Clock',
    speed: 'Split',
    timelineLabel: 'Weeks 1 to 8 (Split)',
    estimatedWeeks: '1–2 wks (plasma) / 4–8 wks (VO2)',
    biologicalMechanism:
      'Blood plasma volume expands rapidly within 7–14 days, reducing heart rate at submaximal efforts. Measurable capillarization, mitochondrial biogenesis, and VO2 max expansion stabilize between weeks 4 and 8.',
    athleteWarning:
      'Workouts will feel subjectively easier after 10 days due to plasma expansion before true stroke volume and mitochondrial density have matured.',
    creatorAttribution: 'Yellow Dude (@yellowdude_co)',
    quote: 'Plasma expansion makes early cardio feel easy, but true cardiac remodeling takes 8 full weeks.',
  },
  {
    id: 'hypertrophy',
    name: '4. Skeletal Muscle Hypertrophy',
    speed: 'Slow',
    timelineLabel: 'Weeks 5 to 6+',
    estimatedWeeks: '5–6+ weeks',
    biologicalMechanism:
      'Measurable myofibrillar protein accretion and cross-sectional muscle area increase only after neuromuscular recruitment stabilizes around week 5.',
    athleteWarning:
      'Most trainees quit in weeks 2–3 because the mirror does not reflect their effort yet. Muscular hypertrophy is the fourth clock—be patient.',
    creatorAttribution: 'Yellow Dude & Jeff Nippard',
    quote: 'Beginners quit when the mirror runs on Clock 4 while their effort started on Clock 1.',
  },
  {
    id: 'tendons',
    name: '5. Tendons & Connective Tissue Remodeling',
    speed: 'Slowest',
    timelineLabel: 'Weeks 6 to 24 (Months)',
    estimatedWeeks: '6 wks – 6 months',
    biologicalMechanism:
      'Tendons consist of densely packed parallel collagen cables with minimal vascularization. Collagen synthesis and fiber realignment occur on a timescale 4–10x slower than muscular hypertrophy.',
    athleteWarning:
      'Because your muscles and nervous system gain strength much faster than tendons adapt, jumping loads prematurely creates micro-tears that cause patellar, elbow, or rotator cuff tendinopathy.',
    creatorAttribution: 'Yellow Dude (@yellowdude_co)',
    quote: 'Your fastest clock writes the check your slowest one has to cover.',
  },
];

export const FIVE_RUNG_GATE_LADDERS: GateLadder[] = [
  {
    id: 'push',
    movementName: 'Horizontal & Incline Pressing',
    pattern: 'Push',
    rungs: [
      { rung: 1, name: 'Standard Push-Up', gateCriteria: '15 clean reps (chest to floor)', techniqueRule: 'Rigid pelvic lock, no lower back sagging.' },
      { rung: 2, name: 'Feet-Elevated Push-Up (Bench/Chair)', gateCriteria: '12 strict reps', techniqueRule: 'Hands under shoulders, full lockout.' },
      { rung: 3, name: 'Staggered-Hand Push-Up', gateCriteria: '8 reps / side', techniqueRule: 'One hand forward, one back; trains anti-rotation.' },
      { rung: 4, name: 'Assisted One-Arm Push-Up', gateCriteria: '5 reps / side', techniqueRule: 'Free hand on floor strictly for light fingertip balance.' },
      { rung: 5, name: 'Full One-Arm Push-Up', gateCriteria: '5 clean reps', techniqueRule: 'Free hand behind back; zero torso twisting.' },
    ],
    theRung2Trap: 'Trainees routinely skip Rung 2 because it feels like a modest, boring step. Skipping intermediate rungs breaks shoulder integrity before connective tissue adapts.',
  },
  {
    id: 'pull',
    movementName: 'Horizontal & Vertical Pulling',
    pattern: 'Pull',
    rungs: [
      { rung: 1, name: 'Australian Body Row (Bar/Table)', gateCriteria: '15 clean chest-to-bar reps', techniqueRule: 'Straight body line; pull elbows into pocket.' },
      { rung: 2, name: 'Dead Hang Decompression', gateCriteria: '30-second continuous hold', techniqueRule: 'Overhand grip, relax spine, depress shoulder girdle.' },
      { rung: 3, name: 'Scapular Pulls from Bar', gateCriteria: '10 strict reps', techniqueRule: 'Locked elbows; pull shoulder blades down and back.' },
      { rung: 4, name: 'Eccentric Pull-Up Negatives', gateCriteria: '5 reps with 5-second lowering', techniqueRule: 'Smooth continuous descent through full ROM.' },
      { rung: 5, name: 'Full Strict Pull-Up', gateCriteria: '5 full ROM reps', techniqueRule: 'Chin cleanly clearing bar; zero kipping or swinging.' },
    ],
    theRung2Trap: 'Jumping straight from Australian rows to weighted pull-ups overloads the bicep tendon and subacromial space. Clear all 5 gates in order.',
  },
  {
    id: 'squat',
    movementName: 'Squat & Unilateral Knee Extension',
    pattern: 'Squat',
    rungs: [
      { rung: 1, name: 'Full-Depth Bodyweight Squat', gateCriteria: '20 clean parallel reps', techniqueRule: 'Flat feet, upright torso, controlled descent.' },
      { rung: 2, name: 'Split Squat (Rear Foot Flat)', gateCriteria: '12 reps / leg', techniqueRule: 'Tall spine, front knee driving forward pain-free.' },
      { rung: 3, name: 'Rear-Foot Elevated Split Squat (RFESS)', gateCriteria: '10 reps / leg', techniqueRule: 'Back knee grazing floor under 3s tempo control.' },
      { rung: 4, name: 'Assisted Single-Leg Pistol Squat', gateCriteria: '5 reps / leg', techniqueRule: 'Fingertip touch on rack/doorframe for balance only.' },
      { rung: 5, name: 'Full Unassisted Pistol Squat', gateCriteria: '5 reps / leg', techniqueRule: 'Hamstring covering calf at bottom; non-working leg straight.' },
    ],
    theRung2Trap: 'Attempting pistol squats before mastering split squats drives extreme patellar tendon shear. Use progressive elevations to remodel tendon collagen safely.',
  },
];

export const NIPPARD_LLP_STUDY_SYNTHESIS = {
  title: 'Stretch-Mediated Hypertrophy & Lengthened Partials (Jeff Nippard 2024–2026)',
  leadResearcher: 'Jeff Nippard (BSc Biochemistry) & Exercise Science Peer-Reviewed Literature',
  coreMechanism: 'Titin Kinase Phosphorylation & Longitudinal Sarcomerogenesis',
  summary:
    'Recent hypertrophy trials (Maeo et al. 2021/2023, Kassiano et al. 2023, Pedrosa et al. 2022) prove that training muscles in their lengthened/stretched position stimulates superior muscle growth compared to shortened-position training. This occurs because mechanical tension in the lengthened state recruits both active actin-myosin bridges and passive titin elastic filaments.',
  protocolRules: [
    'Complete full-range repetitions to 1–2 Reps in Reserve (RIR).',
    'On the final set of eligible accessories, immediately perform 3–5 lengthened partial repetitions in the bottom 50% stretched range.',
    'Pause 0.5s in the deep stretch without bouncing or using rebound inertia.',
    'Best applied to exercises with peak tension in stretch: Romanian Deadlifts, Incline Dumbbell/KB Curls, Preacher Curls, Bulgarian Split Squats, Single-Arm Rows, and Lateral Raises.',
  ],
};

export const LUCAS_HARDIE_RANGE_OF_STRENGTH_SYNTHESIS = {
  title: 'Active Loaded End-Range Strength (Lucas Hardie / Range of Strength)',
  creator: 'Lucas Hardie (Range of Strength)',
  corePrinciple: 'Flexibility is an active feat of strength, not a passive relaxation drill.',
  guidelines: [
    'Loaded Stretching: External loads (kettlebells, plates, barbells) assist joints into deep ranges while requiring intense eccentric and isometric contractions.',
    'Quasi-Isometrics & End-Range Pulsing: Small, rhythmic contractions at end-range override the stretch reflex and develop motor unit control at tissue boundaries.',
    'Ballistic Pulses (Martial Arts Model): Metronome-paced ballistic pulses (40–60 BPM) develop dynamic elasticity without injury when built on a solid foundation.',
    'Low Frequency Rule: Maximal loaded flexibility work places heavy stress on connective tissue. Train each pattern once per week with 5–7 days for collagen remodeling.',
  ],
};
