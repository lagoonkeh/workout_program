// src/domain/mobility.ts

export type MobilityTestId = 
  | 'elephant-walk' 
  | 'knee-to-wall' 
  | 'split-squat-elevation' 
  | 'biering-sorensen' 
  | 'dead-hang'
  | 'pancake-split'
  | 'jefferson-curl'
  | 'german-hang'
  | 'head-to-toe'
  | 'side-split'
  | 'back-bridge';

export interface MobilityProtocol {
  id: MobilityTestId;
  testId: MobilityTestId;
  name: string;
  creator: string;
  targetTissue: string;
  primaryMetric: string;
  unit: string;
  improvementDirection: 'higher' | 'lower';
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
  id?: string;
  testId: MobilityTestId;
  date?: string; // ISO 8601 string
  value: number; // numeric value
  unit?: string;
  side?: 'left' | 'right' | 'bilateral';
  painScore?: number;
  notes?: string;
}

export interface MobilityProgressResult {
  baseline: number | null;
  latest: number | null;
  delta: number;
  status: 'empty' | 'baseline' | 'improved' | 'declined' | 'unchanged';
  isTargetMet: boolean;
}

export interface BenchmarkStatusResult {
  status: string;
  isTargetMet: boolean;
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

export const PROTOCOL_ELEPHANT_WALK: MobilityProtocol = {
  id: 'elephant-walk',
  testId: 'elephant-walk',
  name: 'ATG Elephant Walks (Hamstring Reach)',
  creator: 'Ben Patrick (ATG)',
  targetTissue: 'Hamstrings, Calves & Sciatic Nerve Bed',
  primaryMetric: 'Reach Depth Level',
  unit: 'level (1–5)',
  improvementDirection: 'higher',
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
};

export const PROTOCOL_KNEE_TO_WALL: MobilityProtocol = {
  id: 'knee-to-wall',
  testId: 'knee-to-wall',
  name: 'Knee-to-Wall Ankle Dorsiflexion Test',
  creator: 'Dr. Aaron Horschig (Squat University)',
  targetTissue: 'Talocrural Joint & Soleus Muscle',
  primaryMetric: 'Distance from Wall',
  unit: 'inches',
  improvementDirection: 'higher',
  direction: 'higher_is_better',
  targetBenchmark: '≥ 4.0–5.0 inches (10–12.5 cm)',
  benchmarkNumeric: 5.0,
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
};

export const PROTOCOL_SPLIT_SQUAT_ELEVATION: MobilityProtocol = {
  id: 'split-squat-elevation',
  testId: 'split-squat-elevation',
  name: 'ATG Split Squat Elevation Gate',
  creator: 'Ben Patrick (ATG)',
  targetTissue: 'Patellar Tendon, VMO & Hip Flexors',
  primaryMetric: 'Pain-Free Front Foot Elevation',
  unit: 'inches',
  improvementDirection: 'lower',
  direction: 'lower_is_better',
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
};

export const PROTOCOL_BIERING_SORENSEN: MobilityProtocol = {
  id: 'biering-sorensen',
  testId: 'biering-sorensen',
  name: 'Biering-Sørensen Back Extensor Hold',
  creator: 'Dr. Stuart McGill',
  targetTissue: 'Lumbar Erector Spinae & Posterior Kinetic Chain',
  primaryMetric: 'Horizontal Isometric Hold Duration',
  unit: 'seconds',
  improvementDirection: 'higher',
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
};

export const PROTOCOL_DEAD_HANG: MobilityProtocol = {
  id: 'dead-hang',
  testId: 'dead-hang',
  name: 'Dead Hang Decompression & Grip Test',
  creator: 'Jeff Cavaliere & Yellow Dude',
  targetTissue: 'Glenohumeral Joint, Subacromial Space, Spine & Grip',
  primaryMetric: 'Suspended Hang Time',
  unit: 'seconds',
  improvementDirection: 'higher',
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
};

export const PROTOCOL_PANCAKE_SPLIT: MobilityProtocol = {
  id: 'pancake-split',
  testId: 'pancake-split',
  name: 'Lucas Hardie Pancake Split (Torso Compression)',
  creator: 'Lucas Hardie (Range of Strength)',
  targetTissue: 'Adductor Magnus, Gracilis & Hamstrings',
  primaryMetric: 'Chest-to-Floor Distance',
  unit: 'inches',
  improvementDirection: 'lower',
  direction: 'lower_is_better',
  targetBenchmark: '0 inches (Chest Flat on Floor)',
  benchmarkNumeric: 0,
  instructions: [
    'Sit in a wide straddle on the floor with knees locked and kneecaps pointing up.',
    'Actively roll pelvis into anterior tilt and reach torso forward (not rounding straight down).',
    'Measure vertical distance from sternum/chest to the floor in inches.'
  ],
  scoringTiers: [
    { scoreOrValue: '> 8.0', label: '> 8.0 inches (> 20 cm)', interpretation: 'Severe restriction; elevate pelvis on 2–4" block and train active compression.' },
    { scoreOrValue: '4.0–8.0', label: '4.0–8.0 inches (10–20 cm)', interpretation: 'Moderate restriction; functional adductor length for standard squats.' },
    { scoreOrValue: '0.1–3.9', label: '0.1–3.9 inches (1–9 cm)', interpretation: 'Advanced range; near full pancake compression.' },
    { scoreOrValue: '0', label: '0 inches (Chest to Floor)', interpretation: 'Feat of Range (coaching benchmark).' }
  ]
};

export const PROTOCOL_JEFFERSON_CURL: MobilityProtocol = {
  id: 'jefferson-curl',
  testId: 'jefferson-curl',
  name: 'Lucas Hardie Loaded Jefferson Curl Deficit',
  creator: 'Lucas Hardie (Range of Strength)',
  targetTissue: 'Thoracolumbar Fascia, Deep Erector Spinae & Distal Hamstrings',
  primaryMetric: 'Reach Deficit Past Toes',
  unit: 'inches',
  improvementDirection: 'higher',
  direction: 'higher_is_better',
  targetBenchmark: '≥ 4.0 inches (Wrists Below Toes)',
  benchmarkNumeric: 4.0,
  instructions: [
    'Stand on a sturdy 4–6" elevated box or bumper plate holding a light load (15–25 lbs / ~15–25% bodyweight).',
    'Tuck chin to chest and slowly roll down vertebra by vertebra with knees locked.',
    'At bottom loaded stretch, measure how far knuckles/wrists hang below the top edge of the platform (toes).'
  ],
  scoringTiers: [
    { scoreOrValue: '< 0', label: '< 0 inches (Above Toes)', interpretation: 'Restricted posterior chain; do not load heavily until toes reached on flat ground.' },
    { scoreOrValue: '0–1.9', label: '0–1.9 inches (Toes to Knuckles)', interpretation: 'Baseline mobility; knuckles reaching platform edge.' },
    { scoreOrValue: '2.0–3.9', label: '2.0–3.9 inches (Knuckles Below Toes)', interpretation: 'Functional athletic resilience; progressive spinal flexion capacity.' },
    { scoreOrValue: '≥ 4.0', label: '≥ 4.0 inches (Wrists Below Toes)', interpretation: 'Feat of Range (coaching benchmark).' }
  ]
};

export const PROTOCOL_GERMAN_HANG: MobilityProtocol = {
  id: 'german-hang',
  testId: 'german-hang',
  name: 'Lucas Hardie German Hang (Active Shoulder Extension)',
  creator: 'Lucas Hardie (Range of Strength)',
  targetTissue: 'Long Head of Biceps, Pectoralis Minor & Anterior Capsule',
  primaryMetric: 'Active Isometric Hold Time',
  unit: 'seconds',
  improvementDirection: 'higher',
  direction: 'higher_is_better',
  targetBenchmark: '≥ 30–60 seconds',
  benchmarkNumeric: 30,
  instructions: [
    'Using gymnastics rings or pull-up bar, lower backward through a skin-the-cat into full shoulder hyperextension.',
    'Keep shoulder blades actively depressed and elbows straight; breathe steadily.',
    'Hold under control without dumping passively into joint capsule. Exit safely under control.'
  ],
  scoringTiers: [
    { scoreOrValue: '< 10', label: '< 10 seconds', interpretation: 'Restricted shoulder extension; keep toes on the floor to take weight off.' },
    { scoreOrValue: '10–29', label: '10–29 seconds', interpretation: 'Developing shoulder extension.' },
    { scoreOrValue: '30–59', label: '30–59 seconds', interpretation: 'Proficient (Range of Strength target).' },
    { scoreOrValue: '≥ 60', label: '≥ 60 seconds', interpretation: 'Feat of Range (coaching benchmark).' }
  ]
};

export const PROTOCOL_HEAD_TO_TOE: MobilityProtocol = {
  id: 'head-to-toe',
  testId: 'head-to-toe',
  name: 'Lucas Hardie Head-to-Toe Fold (Active Compression)',
  creator: 'Lucas Hardie (Range of Strength)',
  targetTissue: 'Hamstrings, Sciatic Nerve Bed & Thoracolumbar Fascia',
  primaryMetric: 'Forehead-to-Toes Distance',
  unit: 'inches',
  improvementDirection: 'lower',
  direction: 'lower_is_better',
  targetBenchmark: '0 inches (Forehead Touching Toes)',
  benchmarkNumeric: 0,
  instructions: [
    'Sit on floor with legs straight out front, knees completely locked and toes pulled back.',
    'Actively compress torso toward legs using hip flexor and abdominal pull.',
    'Warm up with a few easy folds first, then hold your deepest controlled position and measure the gap from forehead to big toes.'
  ],
  scoringTiers: [
    { scoreOrValue: '> 6.0', label: '> 6.0 inches (> 15 cm)', interpretation: 'Severe posterior chain restriction; prioritize loaded Jefferson curls.' },
    { scoreOrValue: '3.0–6.0', label: '3.0–6.0 inches (7.5–15 cm)', interpretation: 'Developing compression mobility.' },
    { scoreOrValue: '0.1–2.9', label: '0.1–2.9 inches (1–7 cm)', interpretation: 'Advanced range; forehead approaching toes.' },
    { scoreOrValue: '0', label: '0 inches (Forehead to Toes)', interpretation: 'Feat of Range (coaching benchmark).' }
  ]
};

export const PROTOCOL_SIDE_SPLIT: MobilityProtocol = {
  id: 'side-split',
  testId: 'side-split',
  name: 'Lucas Hardie Side Split (Middle Split)',
  creator: 'Lucas Hardie (Range of Strength)',
  targetTissue: 'Adductor Brevis/Longus, Pectineus, Gracilis & Hip Capsule',
  primaryMetric: 'Crotch-to-Floor Distance',
  unit: 'inches',
  improvementDirection: 'lower',
  direction: 'lower_is_better',
  targetBenchmark: '0 inches (Full Floor Contact)',
  benchmarkNumeric: 0,
  instructions: [
    'Slide feet out wide sideways on a smooth surface or wearing socks.',
    'Tilt the pelvis forward (Thomas Kurz style) and lower slowly; stop at a stretch, not pain.',
    'Keep kneecaps facing forward/up; measure vertical distance from pelvic floor/crotch to the floor.'
  ],
  scoringTiers: [
    { scoreOrValue: '> 10.0', label: '> 10.0 inches (> 25 cm)', interpretation: 'Severe adductor restriction; train loaded horse stance first.' },
    { scoreOrValue: '4.0–10.0', label: '4.0–10.0 inches (10–25 cm)', interpretation: 'Functional straddle range for squatting and lunging.' },
    { scoreOrValue: '0.1–3.9', label: '0.1–3.9 inches (1–9 cm)', interpretation: 'Advanced side split range.' },
    { scoreOrValue: '0', label: '0 inches (Full Side Split)', interpretation: 'Feat of Range (coaching benchmark).' }
  ]
};

export const PROTOCOL_BACK_BRIDGE: MobilityProtocol = {
  id: 'back-bridge',
  testId: 'back-bridge',
  name: 'Lucas Hardie Full Back Bridge Arc',
  creator: 'Lucas Hardie (Range of Strength)',
  targetTissue: 'Thoracic Spine, Hip Flexors, Abdominal Wall & Shoulders',
  primaryMetric: 'Hold Duration with Stacked Shoulders',
  unit: 'seconds',
  improvementDirection: 'higher',
  direction: 'higher_is_better',
  targetBenchmark: '≥ 30 seconds',
  benchmarkNumeric: 30,
  instructions: [
    'Lie supine with hands planted beside ears, fingers pointing towards shoulders.',
    'Press through palms and feet into full spinal bridge arc.',
    'Push chest forward through shoulders so wrists stack under shoulders. Hold for time.'
  ],
  scoringTiers: [
    { scoreOrValue: '< 10', label: '< 10 seconds', interpretation: 'Restricted thoracic spine or wrist extension; elevate feet on box.' },
    { scoreOrValue: '10–29', label: '10–29 seconds', interpretation: 'Developing spinal extension endurance.' },
    { scoreOrValue: '≥ 30', label: '≥ 30 seconds', interpretation: 'Feat of Range (coaching benchmark).' }
  ]
};

/**
 * Standard 7 core mobility protocols (preserved for backward compatibility with baseline suites)
 */
export const MOBILITY_PROTOCOLS: MobilityProtocol[] = [
  PROTOCOL_ELEPHANT_WALK,
  PROTOCOL_KNEE_TO_WALL,
  PROTOCOL_SPLIT_SQUAT_ELEVATION,
  PROTOCOL_BIERING_SORENSEN,
  PROTOCOL_DEAD_HANG,
  PROTOCOL_PANCAKE_SPLIT,
  PROTOCOL_JEFFERSON_CURL,
];

/**
 * Lucas Hardie (Range of Strength) Feats of Range benchmarks
 */
export const RANGE_OF_STRENGTH_FEATS: MobilityProtocol[] = [
  PROTOCOL_PANCAKE_SPLIT,
  PROTOCOL_SIDE_SPLIT,
  PROTOCOL_HEAD_TO_TOE,
  PROTOCOL_GERMAN_HANG,
  PROTOCOL_BACK_BRIDGE,
  PROTOCOL_JEFFERSON_CURL,
];

/**
 * All 11 comprehensive science-backed mobility protocols
 */
export const ALL_MOBILITY_PROTOCOLS: MobilityProtocol[] = [
  ...MOBILITY_PROTOCOLS,
  PROTOCOL_GERMAN_HANG,
  PROTOCOL_HEAD_TO_TOE,
  PROTOCOL_SIDE_SPLIT,
  PROTOCOL_BACK_BRIDGE,
];

export const MOBILITY_PROTOCOLS_MAP: Record<MobilityTestId, MobilityProtocol> = {
  'elephant-walk': PROTOCOL_ELEPHANT_WALK,
  'knee-to-wall': PROTOCOL_KNEE_TO_WALL,
  'split-squat-elevation': PROTOCOL_SPLIT_SQUAT_ELEVATION,
  'biering-sorensen': PROTOCOL_BIERING_SORENSEN,
  'dead-hang': PROTOCOL_DEAD_HANG,
  'pancake-split': PROTOCOL_PANCAKE_SPLIT,
  'jefferson-curl': PROTOCOL_JEFFERSON_CURL,
  'german-hang': PROTOCOL_GERMAN_HANG,
  'head-to-toe': PROTOCOL_HEAD_TO_TOE,
  'side-split': PROTOCOL_SIDE_SPLIT,
  'back-bridge': PROTOCOL_BACK_BRIDGE,
};

/**
 * Validates a mobility entry before persistence.
 */
export function validateMobilityEntry(entry: { testId: MobilityTestId; value: number; date?: string; [key: string]: any }): { isValid: boolean; error?: string } {
  const validTestIds = [
    'elephant-walk',
    'knee-to-wall',
    'split-squat-elevation',
    'biering-sorensen',
    'dead-hang',
    'pancake-split',
    'jefferson-curl',
    'german-hang',
    'head-to-toe',
    'side-split',
    'back-bridge',
  ];
  
  if (!entry.testId || !validTestIds.includes(entry.testId)) {
    return { isValid: false, error: 'Missing or invalid testId' };
  }

  if (entry.date === '') {
    return { isValid: false, error: 'Missing date string' };
  }

  if (typeof entry.value !== 'number' || Number.isNaN(entry.value) || !Number.isFinite(entry.value)) {
    return { isValid: false, error: 'Value must be a valid finite number' };
  }

  if (entry.testId === 'elephant-walk') {
    if (!Number.isInteger(entry.value) || entry.value < 1 || entry.value > 5) {
      if (entry.value < 0) {
        return { isValid: false, error: 'Negative values are not allowed (Elephant Walk level must be an integer between 1 and 5)' };
      }
      return { isValid: false, error: 'Elephant Walk level must be an integer between 1 and 5' };
    }
  }

  if (entry.value < 0) {
    return { isValid: false, error: 'Negative values are not allowed' };
  }

  return { isValid: true };
}

/**
 * Calculates progress and status delta from a list of historical entries.
 */
export function calculateMobilityProgress(
  history: MobilityEntry[],
  testId: MobilityTestId
): MobilityProgressResult {
  const protocol = MOBILITY_PROTOCOLS_MAP[testId];
  const filtered = history
    .filter((e) => e.testId === testId)
    .sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());

  if (filtered.length === 0) {
    return {
      baseline: null,
      latest: null,
      delta: 0,
      status: 'empty',
      isTargetMet: false,
    };
  }

  const baseline = filtered[0].value;
  const latest = filtered[filtered.length - 1].value;
  const isLowerBetter = protocol.improvementDirection === 'lower';
  const rawDelta = Number((latest - baseline).toFixed(2));

  let status: MobilityProgressResult['status'] = 'unchanged';
  if (filtered.length === 1) {
    status = 'baseline';
  } else if (isLowerBetter) {
    if (latest < baseline) status = 'improved';
    else if (latest > baseline) status = 'declined';
    else status = 'unchanged';
  } else {
    if (latest > baseline) status = 'improved';
    else if (latest < baseline) status = 'declined';
    else status = 'unchanged';
  }

  const isTargetMet = isLowerBetter
    ? latest <= protocol.benchmarkNumeric
    : latest >= protocol.benchmarkNumeric;

  return {
    baseline,
    latest,
    delta: rawDelta,
    status,
    isTargetMet,
  };
}

/**
 * Classifies benchmark achievement tiers for a test value.
 */
export function getMobilityBenchmarkStatus(
  testId: MobilityTestId,
  value: number
): BenchmarkStatusResult {
  switch (testId) {
    case 'knee-to-wall':
      if (value < 2.0) return { status: 'severe_restriction', isTargetMet: false };
      if (value < 4.0) return { status: 'moderate_restriction', isTargetMet: false };
      if (value < 5.0) return { status: 'functional', isTargetMet: false };
      return { status: 'optimal', isTargetMet: true };

    case 'biering-sorensen':
      if (value < 60) return { status: 'suboptimal', isTargetMet: false };
      if (value < 120) return { status: 'adequate', isTargetMet: false };
      return { status: 'optimal', isTargetMet: true };

    case 'split-squat-elevation':
      if (value > 6) return { status: 'regressed', isTargetMet: false };
      if (value > 0) return { status: 'near_mastery', isTargetMet: false };
      return { status: 'optimal', isTargetMet: true };

    case 'elephant-walk':
      if (value < 2) return { status: 'severe_restriction', isTargetMet: false };
      if (value < 3) return { status: 'moderate_restriction', isTargetMet: false };
      if (value < 4) return { status: 'baseline', isTargetMet: false };
      if (value < 5) return { status: 'functional', isTargetMet: false };
      return { status: 'optimal', isTargetMet: true };

    case 'dead-hang':
      if (value < 30) return { status: 'restricted', isTargetMet: false };
      if (value < 60) return { status: 'baseline', isTargetMet: false };
      return { status: 'optimal', isTargetMet: true };

    case 'pancake-split':
      if (value > 8.0) return { status: 'severe_restriction', isTargetMet: false };
      if (value > 4.0) return { status: 'moderate_restriction', isTargetMet: false };
      if (value > 0) return { status: 'near_mastery', isTargetMet: false };
      return { status: 'optimal', isTargetMet: true };

    case 'jefferson-curl':
      if (value < 1.0) return { status: 'baseline', isTargetMet: false };
      if (value < 2.5) return { status: 'functional', isTargetMet: false };
      if (value < 4.0) return { status: 'advanced', isTargetMet: false };
      return { status: 'optimal', isTargetMet: true };

    case 'german-hang':
      if (value < 10) return { status: 'restricted', isTargetMet: false };
      if (value < 30) return { status: 'developing', isTargetMet: false };
      if (value < 60) return { status: 'proficient', isTargetMet: true };
      return { status: 'optimal', isTargetMet: true };

    case 'head-to-toe':
      if (value > 6.0) return { status: 'severe_restriction', isTargetMet: false };
      if (value > 3.0) return { status: 'developing', isTargetMet: false };
      if (value > 0) return { status: 'proficient', isTargetMet: false };
      return { status: 'optimal', isTargetMet: true };

    case 'side-split':
      if (value > 10.0) return { status: 'severe_restriction', isTargetMet: false };
      if (value > 4.0) return { status: 'developing', isTargetMet: false };
      if (value > 0) return { status: 'proficient', isTargetMet: false };
      return { status: 'optimal', isTargetMet: true };

    case 'back-bridge':
      if (value < 10) return { status: 'restricted', isTargetMet: false };
      if (value < 30) return { status: 'developing', isTargetMet: false };
      return { status: 'optimal', isTargetMet: true };
  }
}

/**
 * Generates an SVG polyline points string from historical entries.
 */
export function generateSparklinePoints(
  entries: MobilityEntry[],
  width: number,
  height: number
): string {
  if (!entries || entries.length === 0) {
    return '';
  }

  if (entries.length === 1) {
    return `0,${Number((height / 2).toFixed(2))}`;
  }

  const values = entries.map((e) => e.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);

  const points = entries.map((entry, index) => {
    const x = Number(((index / (entries.length - 1)) * width).toFixed(2));
    let y: number;
    if (maxVal === minVal) {
      y = Number((height / 2).toFixed(2));
    } else {
      y = Number((height - ((entry.value - minVal) / (maxVal - minVal)) * height).toFixed(2));
    }
    return `${x},${y}`;
  });

  return points.join(' ');
}

/**
 * Comprehensive summary calculation for backward-compatibility with PROJECT.md contract.
 */
export function calculateMobilitySummary(
  testId: MobilityTestId,
  history: MobilityEntry[]
): MobilitySummary {
  const protocol = MOBILITY_PROTOCOLS_MAP[testId];
  const testHistory = history
    .filter((e) => e.testId === testId)
    .sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());

  const latestEntry = testHistory.length > 0 ? testHistory[testHistory.length - 1] : null;
  const latestValue = latestEntry ? latestEntry.value : null;

  let personalBest: number | null = null;
  if (testHistory.length > 0) {
    if (protocol.improvementDirection === 'higher') {
      personalBest = Math.max(...testHistory.map((e) => e.value));
    } else {
      personalBest = Math.min(...testHistory.map((e) => e.value));
    }
  }

  let status: MobilitySummary['status'] = 'untested';
  if (latestValue !== null) {
    const bench = getMobilityBenchmarkStatus(testId, latestValue);
    if (bench.isTargetMet) {
      status = 'optimal';
    } else if (bench.status === 'severe_restriction' || bench.status === 'restricted' || bench.status === 'suboptimal' || bench.status === 'regressed') {
      status = 'restricted';
    } else {
      status = 'functional';
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
    status,
  };
}

export function getAllMobilitySummaries(history: MobilityEntry[]): MobilitySummary[] {
  return MOBILITY_PROTOCOLS.map((protocol) => calculateMobilitySummary(protocol.id, history));
}

export const MOBILITY_BIWEEKLY_INTERVAL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days in ms

export interface MobilityCheckInStatus {
  isDue: boolean;
  daysSinceLastAssessment: number | null;
  lastAssessmentDate: string | null;
  daysRemainingUntilDue: number;
}

/**
 * Calculates whether the user is due for their bi-weekly mobility assessment (every 14 days).
 */
export function getMobilityCheckInStatus(
  history: MobilityEntry[],
  snoozeUntilTimestamp?: number | null,
  referenceDateMs: number = Date.now()
): MobilityCheckInStatus {
  if (snoozeUntilTimestamp && referenceDateMs < snoozeUntilTimestamp) {
    const daysRemaining = Math.max(0, Math.ceil((snoozeUntilTimestamp - referenceDateMs) / (24 * 60 * 60 * 1000)));
    return {
      isDue: false,
      daysSinceLastAssessment: null,
      lastAssessmentDate: null,
      daysRemainingUntilDue: daysRemaining,
    };
  }

  if (!history || history.length === 0) {
    return {
      isDue: true,
      daysSinceLastAssessment: null,
      lastAssessmentDate: null,
      daysRemainingUntilDue: 0,
    };
  }

  // Find most recent entry timestamp
  const timestamps = history
    .map((e) => (e.date ? new Date(e.date).getTime() : 0))
    .filter((ts) => !isNaN(ts) && ts > 0);

  if (timestamps.length === 0) {
    return {
      isDue: true,
      daysSinceLastAssessment: null,
      lastAssessmentDate: null,
      daysRemainingUntilDue: 0,
    };
  }

  const latestTs = Math.max(...timestamps);
  const diffMs = referenceDateMs - latestTs;
  const daysSince = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  const isDue = diffMs >= MOBILITY_BIWEEKLY_INTERVAL_MS;
  const daysRemaining = Math.max(0, 14 - daysSince);

  return {
    isDue,
    daysSinceLastAssessment: daysSince,
    lastAssessmentDate: new Date(latestTs).toISOString(),
    daysRemainingUntilDue: daysRemaining,
  };
}

