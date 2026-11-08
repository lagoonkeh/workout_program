// src/domain/adaptationClocks.ts
/**
 * Training-adaptation summaries.
 * The "clocks" framing comes from Yellow Dude (YouTube @yellowdude_co: your body doesn't build strength,
 * muscle and tendons at the same speed). Only details backed by published research are kept here;
 * each clock lists the evidence it rests on. No creator quotes are reproduced.
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
  /** Short pointer to the research the clock rests on */
  evidence: string;
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
  /** Why the rungs go in order (coaching rationale, not a research finding) */
  progressionNote: string;
}

export const FIVE_CLOCKS_OF_ADAPTATION: AdaptationClock[] = [
  {
    id: 'neural',
    name: '1. Nervous System Adaptation',
    speed: 'Fastest',
    timelineLabel: 'First weeks (dominant early)',
    estimatedWeeks: 'Weeks 1–4+',
    biologicalMechanism:
      'Most early strength gains come from the nervous system: better motor-unit recruitment and firing, better coordination, and less antagonist co-activation.',
    athleteWarning:
      'Fast early strength jumps are mostly skill and coordination, not new muscle. Your joints and tendons have not caught up yet.',
    creatorAttribution: 'Yellow Dude (@yellowdude_co)',
    evidence: 'Kubo et al. 2010: strength and neural activation rose by month 2, before muscle size or tendon stiffness changed.',
  },
  {
    id: 'soreness',
    name: '2. Muscle Soreness & The Repeated Bout Effect',
    speed: 'Fast',
    timelineLabel: 'After the first session or two',
    estimatedWeeks: '1–2 weeks',
    biologicalMechanism:
      'Delayed-onset muscle soreness follows unaccustomed (especially eccentric) work and is linked to muscle damage and inflammation, not lactic acid. After one bout, the same exercise causes much less soreness (the repeated bout effect).',
    athleteWarning:
      'Soreness is a poor measure of a good workout. Less soreness on a familiar movement is normal adaptation, not wasted effort.',
    creatorAttribution: 'Yellow Dude (@yellowdude_co)',
    evidence: 'Repeated bout effect: a well-replicated finding in eccentric-exercise research.',
  },
  {
    id: 'cardiovascular',
    name: '3. Cardiovascular & Blood Volume Clock',
    speed: 'Split',
    timelineLabel: 'Days (plasma) / weeks–months (VO2max)',
    estimatedWeeks: '1–2 wks (plasma) / weeks–months (VO2max)',
    biologicalMechanism:
      'Blood plasma volume expands within days to about two weeks of endurance training, lowering heart rate at the same effort. VO2max, capillary and mitochondrial gains build more gradually over weeks to months.',
    athleteWarning:
      'Cardio feels easier quickly, partly from the plasma increase. Keep progressing gradually; the deeper aerobic changes take longer.',
    creatorAttribution: 'Yellow Dude (@yellowdude_co)',
    evidence: 'Endurance-training physiology: rapid plasma volume expansion is a classic, well-replicated finding.',
  },
  {
    id: 'hypertrophy',
    name: '4. Skeletal Muscle Hypertrophy',
    speed: 'Slow',
    timelineLabel: 'Roughly 6–8+ weeks to measure',
    estimatedWeeks: '6–8+ weeks',
    biologicalMechanism:
      'Muscle size increases take weeks of training to measure reliably. Some apparent early growth is temporary swelling from muscle damage rather than new tissue.',
    athleteWarning:
      'The mirror lags behind the work. Judge the first couple of months by performance and consistency, not looks.',
    creatorAttribution: 'Yellow Dude (@yellowdude_co)',
    evidence: 'Kubo et al. 2010: muscle cross-sectional area did not change until after 2 months of training.',
  },
  {
    id: 'tendons',
    name: '5. Tendons & Connective Tissue Remodeling',
    speed: 'Slowest',
    timelineLabel: 'Months',
    estimatedWeeks: '2–3+ months',
    biologicalMechanism:
      'Tendons are collagen-dense and adapt slowly: measurable stiffness changes take a couple of months or more, and tendon size changes little even after years of training.',
    athleteWarning:
      'Strength can outpace your tendons. Raising load faster than they adapt increases the risk of overload tendon pain (e.g. patellar, elbow, shoulder).',
    creatorAttribution: 'Yellow Dude (@yellowdude_co)',
    evidence: 'Kubo et al. 2010 (tendon stiffness changed only after 2 months); Massey et al. 2018 (no tendon hypertrophy after 4 years of training).',
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
    progressionNote: 'Move up one rung at a time. Each step adds load gradually, giving the slower-adapting tissues time to catch up. The rep gates are coaching targets, not research cutoffs.',
  },
  {
    id: 'pull',
    movementName: 'Horizontal & Vertical Pulling',
    pattern: 'Pull',
    rungs: [
      { rung: 1, name: 'Australian Body Row (Bar/Table)', gateCriteria: '15 clean chest-to-bar reps', techniqueRule: 'Straight body line; pull elbows into pocket.' },
      { rung: 2, name: 'Dead Hang', gateCriteria: '30-second continuous hold', techniqueRule: 'Overhand grip, shoulders active, steady breathing.' },
      { rung: 3, name: 'Scapular Pulls from Bar', gateCriteria: '10 strict reps', techniqueRule: 'Locked elbows; pull shoulder blades down and back.' },
      { rung: 4, name: 'Eccentric Pull-Up Negatives', gateCriteria: '5 reps with 5-second lowering', techniqueRule: 'Smooth continuous descent through full ROM.' },
      { rung: 5, name: 'Full Strict Pull-Up', gateCriteria: '5 full ROM reps', techniqueRule: 'Chin cleanly clearing bar; zero kipping or swinging.' },
    ],
    progressionNote: 'Build grip, shoulder-blade control and lowering strength before full pull-ups. The rep and time gates are coaching targets, not research cutoffs.',
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
    progressionNote: 'Build up through split squats before single-leg depth, which loads the knee more. Stop at the rung where the knee stays pain-free. The rep gates are coaching targets, not research cutoffs.',
  },
];

export const NIPPARD_LLP_STUDY_SYNTHESIS = {
  title: 'Lengthened Partials (LLPs), as popularized by Jeff Nippard',
  leadResearcher: 'Jeff Nippard (co-author, Wolf et al. 2025) & peer-reviewed literature',
  coreMechanism: 'Not settled: thought to relate to high tension at long muscle lengths',
  summary:
    'Training a muscle at long lengths tends to grow it more than training at short lengths (e.g. Maeo et al. 2021 and 2023, Pedrosa et al. 2022, Kassiano et al. 2023). But compared with full range of motion, lengthened partials gave similar growth in trained lifters (Wolf et al. 2025, co-authored by Nippard; Gschneidner et al. 2025). Use LLPs to extend a set, not as something that beats full reps. Calves are where the studies favor them most.',
  protocolRules: [
    'Do full-range reps first, taken close to failure.',
    'On the final set only, when full reps run out, add a few partial reps in the stretched half of the range.',
    'Stay controlled: no bouncing out of the bottom.',
    'Best on exercises that are hard in the stretch and safe to push close to failure: curls, overhead or cable triceps work, pulldowns, supported single-arm rows, leg curls and calf raises. Skip them on heavy barbell hinges and on rehab exercises.',
  ],
};

export const LUCAS_HARDIE_RANGE_OF_STRENGTH_SYNTHESIS = {
  title: 'Active Loaded End-Range Strength (Lucas Hardie / Range of Strength)',
  creator: 'Lucas Hardie (Range of Strength)',
  corePrinciple: 'Flexibility is an active feat of strength, not a passive relaxation drill.',
  guidelines: [
    'Loaded stretching: external load (kettlebells, plates) helps you into deep ranges while you control the position. Full-range strength training improves flexibility about as much as stretching does (Afonso et al. 2021 meta-analysis).',
    'End-range work: contracting the muscles in the deep position builds control there. Ease in and progress load gradually.',
    'Recovery: heavy loaded flexibility work is demanding. Space hard sessions for the same pattern and keep easier mobility work on other days.',
    'Benchmarks: the feats of range are coaching targets from Range of Strength, not research standards.',
  ],
};
