// src/domain/glossary.ts
/**
 * Plain-English glossary of the training terms, abbreviations and app features used across the program,
 * plus a tempo decoder ("31X1" -> what to actually do on each phase of the rep).
 */
import { EXERCISE_VISUALS, type DiagramType } from './exerciseVisualsData';

export type GlossaryCategory = 'Programming' | 'Reps & tempo' | 'Technique & anatomy' | 'Recovery & readiness' | 'Methods & drills' | 'In this app';

export interface GlossaryEntry {
  term: string;
  aka?: string[];
  category: GlossaryCategory;
  definition: string;
  /** how the app uses it, when that's specific */
  inApp?: string;
}

export const GLOSSARY_CATEGORIES: GlossaryCategory[] = ['Programming', 'Reps & tempo', 'Technique & anatomy', 'Recovery & readiness', 'Methods & drills', 'In this app'];

export const GLOSSARY: GlossaryEntry[] = [
  // Programming
  { term: 'GZCL', category: 'Programming', definition: 'A training system by Cody Lefever that sorts every lift into three tiers: heavy main lifts (T1), moderate-weight volume lifts (T2) and light accessories (T3).', inApp: 'Every exercise card shows its tier badge.' },
  { term: 'T1 (Tier 1)', aka: ['Tier 1'], category: 'Programming', definition: 'The main heavy lift of the day, done for low reps (about 1–5) with long rests. This is where strength is built.', inApp: 'Barbell squat, bench press, RDL and overhead press. Rests are 3–5 minutes.' },
  { term: 'T2 (Tier 2)', aka: ['Tier 2'], category: 'Programming', definition: 'Supporting compound lifts with moderate weight and more reps (about 6–12). Builds muscle and supports the T1 lift.', inApp: 'Split squats, rows, good mornings, pull-ups. Rests are 2–3 minutes.' },
  { term: 'T3 (Tier 3)', aka: ['Tier 3'], category: 'Programming', definition: 'Accessory and joint-health work with light weight and high reps (12+), timed holds or carries.', inApp: 'Tibialis raises, step-downs, McGill Big 3, carries, core work. Rests are 45–90 seconds.' },
  { term: 'Warmup', category: 'Programming', definition: 'Drills done before the working sets to raise tissue temperature, lubricate joints and switch on the muscles that protect the knees, hips and shoulders.', inApp: 'Each session opens with a warmup sequence. Ticking off its phases marks it done.' },
  { term: 'Set', category: 'Programming', definition: 'A group of reps done back to back without resting.' },
  { term: 'Rep', aka: ['Repetition'], category: 'Programming', definition: 'One complete movement: lowering and lifting once.' },
  { term: 'Progressive overload', category: 'Programming', definition: 'Gradually asking more of a muscle over time (more weight, reps or sets) so it keeps adapting.', inApp: 'See "Auto weight progression" under In this app.' },
  { term: 'Deload', category: 'Programming', definition: 'A planned lighter week that lets joints, tendons and the nervous system recover so the next block starts fresh.', inApp: 'After 5 training weeks the app runs a deload: about 85% of the weight and half the sets. You can postpone it a week.' },
  { term: 'Training block', aka: ['Block'], category: 'Programming', definition: 'A run of weeks with one goal, ended by a deload.', inApp: 'Blocks are 5 weeks long. A week counts toward the block when it has at least 2 workouts.' },
  { term: 'Cycle A / Cycle B', aka: ['Variation', 'Cycle B'], category: 'Programming', definition: 'Two versions of the same session that rotate. Cycle B swaps in exercise variations, such as a paused or tempo version, so the joints get a different stimulus.', inApp: 'Pick a variation for any exercise with its Variations button.' },
  { term: 'Regression', category: 'Programming', definition: 'An easier or more joint-friendly version of an exercise, used when pain, fatigue or equipment limits the standard one.', inApp: 'Shown on each exercise card and cue card. The weekly evaluation can swap one in automatically.' },
  { term: 'Superset', category: 'Programming', definition: 'Two exercises done back to back before resting, usually for different muscles, such as curls with triceps extensions.' },
  { term: 'Tri-set', category: 'Programming', definition: 'Three exercises done back to back before resting.', inApp: 'The McGill Big 3 is a tri-set: curl-up, side plank and bird-dog.' },
  { term: 'Unilateral', aka: ['Single-leg', 'Single-arm'], category: 'Programming', definition: 'Working one side at a time. It exposes and fixes left/right imbalances and makes the trunk resist rotation.', inApp: 'Use "Split L/R Workouts" to log the left and right sides as separate exercises.' },
  { term: 'Volume', category: 'Programming', definition: 'How much work a muscle gets, usually counted as hard sets per week.', inApp: 'The muscle heatmap compares your 7-day sets to a target for each muscle.' },

  // Reps & tempo
  { term: 'Tempo', aka: ['Tempo notation', '31X1'], category: 'Reps & tempo', definition: 'A 4-character code for how long each phase of a rep takes, in seconds: lowering, pause at the bottom, lifting, pause at the top. "X" means lift as fast as you can with control.', inApp: 'Example: 31X1 = 3 s down, 1 s pause, explode up, 1 s pause. The metronome button counts it out loud.' },
  { term: 'Eccentric', category: 'Reps & tempo', definition: 'The lowering (lengthening) phase of a rep, such as going down in a squat. Slowing it builds control and tendon strength.' },
  { term: 'Concentric', category: 'Reps & tempo', definition: 'The lifting (shortening) phase of a rep, such as standing up out of a squat.' },
  { term: 'Isometric', aka: ['Hold'], category: 'Reps & tempo', definition: 'Holding a position under tension without moving. Isometrics are a well-known way to calm a sore tendon.', inApp: 'Tempos written HOLD-30 mean hold for 30 seconds.' },
  { term: 'AMRAP', category: 'Reps & tempo', definition: '"As many reps as possible" with good form, stopping when the next rep would break technique.', inApp: 'On lifts marked "AMRAP Last Set," the last set is open-ended: do as many good reps as you can.' },
  { term: 'RPE', aka: ['Rate of perceived exertion'], category: 'Reps & tempo', definition: 'How hard a set felt on a 1–10 scale. 10 = you could not have done another rep, 9 = one rep left, 8 = two left.', inApp: 'An RPE of 9.5 or higher holds the weight instead of increasing it next time. The full scale is under Rating scales.' },
  { term: 'RIR', aka: ['Reps in reserve'], category: 'Reps & tempo', definition: 'How many more reps you could have done. RIR 2 is about RPE 8.' },
  { term: 'Effective Reps (ER)', aka: ['ER', 'Effective reps', 'Cluster sets'], category: 'Reps & tempo', definition: 'Athlean-X method: the reps close to failure are the ones that build muscle. Do a hard set, rest 15–30 s, then keep doing short mini-sets until you reach the target total, such as 20 effective reps.', inApp: 'The rest timer offers 15 s and 30 s ER presets.' },
  { term: 'Lengthened partials', category: 'Reps & tempo', definition: 'Extra half-reps done in the stretched bottom range after a set reaches failure. Research suggests the stretched position drives a lot of muscle growth.' },
  { term: 'e1RM', aka: ['Estimated 1-rep max', '1RM'], category: 'Reps & tempo', definition: 'Estimated one-rep max: the heaviest single rep you could probably do, calculated from a set of several reps instead of tested.', inApp: 'Uses the Epley formula: weight × (1 + reps ÷ 30).' },
  { term: 'Rest interval', category: 'Reps & tempo', definition: 'Time between sets. Heavy lifts need longer (3–5 min) to restore strength. Accessories need less.', inApp: 'The rest timer starts automatically when you finish a set.' },

  // Technique & anatomy
  { term: 'Bracing', aka: ['360° brace', 'Brace'], category: 'Technique & anatomy', definition: 'Breathing into your belly, sides and lower back, then tightening around that breath so the spine is protected under load.' },
  { term: 'Foot tripod', aka: ['Tripod foot', 'Tripod rooting'], category: 'Technique & anatomy', definition: 'Keeping three points of the foot pressed down (big-toe knuckle, pinky-toe knuckle and heel) so the arch stays up and the knee tracks over the toes.' },
  { term: 'Knee valgus', aka: ['Valgus', 'Knee cave'], category: 'Technique & anatomy', definition: 'The knee collapsing inward toward the big toe. It loads the knee badly. Cue: knees track over the 2nd and 3rd toes.' },
  { term: 'Hip hinge', aka: ['Hinge'], category: 'Technique & anatomy', definition: 'Bending by pushing the hips back with a flat back and soft knees, as in a deadlift or RDL. The opposite of squatting straight down.' },
  { term: 'Neutral spine', category: 'Technique & anatomy', definition: 'Keeping your back in its natural, slightly curved shape: not rounded and not over-arched.' },
  { term: 'Posterior pelvic tilt', aka: ['PPT'], category: 'Technique & anatomy', definition: 'Tucking the tailbone under, flattening the lower back. Used in core work and to switch off overactive hip flexors.' },
  { term: 'Anterior pelvic tilt', aka: ['APT'], category: 'Technique & anatomy', definition: 'The pelvis tipped forward with an exaggerated lower-back arch, often from tight hip flexors.' },
  { term: 'Dorsiflexion', category: 'Technique & anatomy', definition: 'Bending the ankle so the knee travels forward over the toes. Limited dorsiflexion is a common cause of knee pain when squatting.', inApp: 'One of the 5 mobility-assessment benchmarks.' },
  { term: 'Lat pack', aka: ['Packing the lats'], category: 'Technique & anatomy', definition: 'Pulling the shoulder blades down and back and squeezing the armpits, which stiffens the upper back and keeps the bar close.' },
  { term: 'Scapular retraction', aka: ['Retraction', 'Depression'], category: 'Technique & anatomy', definition: 'Retraction is squeezing the shoulder blades together. Depression is pulling them down away from the ears. Both protect the shoulder when pressing and pulling.' },
  { term: 'VMO', aka: ['Vastus medialis oblique'], category: 'Technique & anatomy', definition: 'The teardrop-shaped inner quad muscle just above the knee. It helps the kneecap track and works hard in deep knee bends.' },
  { term: 'Tibialis', aka: ['Tibialis anterior', 'Tib'], category: 'Technique & anatomy', definition: 'The muscle on the front of the shin that lifts the toes. Strengthening it is a staple of knee-health programs like ATG.' },
  { term: 'Glute medius', aka: ['Glute med'], category: 'Technique & anatomy', definition: 'The side-hip muscle that keeps the pelvis level and the knee from caving when you stand on one leg.' },
  { term: 'Posterior chain', category: 'Technique & anatomy', definition: 'The muscles on the back of the body (calves, hamstrings, glutes and spinal erectors) that drive hinging, jumping and sprinting.' },
  { term: 'Reciprocal inhibition', category: 'Technique & anatomy', definition: 'When one muscle contracts hard, the muscle opposite it relaxes. For example, squeezing the quad lets the hamstring lengthen.', inApp: 'The basis of ATG elephant walks.' },
  { term: 'Synovial fluid', category: 'Technique & anatomy', definition: 'The lubricating fluid inside joints. Moving a joint through its range warms and circulates it, which is why warmups reduce stiffness.' },

  // Recovery & readiness
  { term: 'Readiness score', aka: ['Readiness'], category: 'Recovery & readiness', definition: 'A 10–100 score from the daily check-in. Knee pain lowers it the most, hamstring tightness lowers it, and energy and sleep raise or lower it.', inApp: 'Tiers: Peak, Standard, Cautious, Rest & Recovery. Knee pain of 3 or more caps the score at 75.' },
  { term: 'Knee pain score', category: 'Recovery & readiness', definition: 'A 0–10 rating of tendon discomfort around the kneecap.', inApp: 'A logged knee pain of 4 or more lowers the next suggested weight. The full scale is under Rating scales.' },
  { term: 'DOMS', aka: ['Delayed-onset muscle soreness'], category: 'Recovery & readiness', definition: 'Muscle soreness that peaks 1–3 days after unfamiliar or hard training. It is normal and is not a sign of injury.' },
  { term: 'Resting heart rate', aka: ['RHR', 'Resting HR'], category: 'Recovery & readiness', definition: 'Your heart rate at rest, usually measured overnight. A morning reading 5+ bpm above your weekly average can mean incomplete recovery, illness or poor sleep.', inApp: 'Pulled from Health Connect and flagged on the check-in when elevated.' },
  { term: 'HRV', aka: ['Heart rate variability'], category: 'Recovery & readiness', definition: 'The variation in time between heartbeats. Higher than your own normal usually means well recovered. Lower can mean stress or fatigue. Compare it only to your own trend.' },
  { term: 'Zone 2', category: 'Recovery & readiness', definition: 'Easy aerobic effort where you can still talk in full sentences. It builds aerobic base and aids recovery without beating up the legs.', inApp: 'The Run Conditioning session uses Zone 2.' },
  { term: 'Recovery status', aka: ['Fresh', 'Recovering', 'Fatigued'], category: 'Recovery & readiness', definition: 'How ready a muscle is to be trained hard again.', inApp: 'Heatmap: Fatigued = trained under 24 h ago or 14+ sets this week. Recovering = 24–48 h or 8–13 sets. Fresh = 48 h+ with manageable volume.' },

  // Methods & drills
  { term: 'ATG', aka: ['Knees Over Toes', 'KOT'], category: 'Methods & drills', definition: '"Ass to grass," Ben Patrick\'s knee-resilience method: train the knee through its full range (knee past toes) with progressive load, starting very light.' },
  { term: 'McGill Big 3', category: 'Methods & drills', definition: 'Dr. Stuart McGill\'s spine-sparing core trio: modified curl-up, side plank and bird-dog, done as short holds to build core endurance without bending the spine under load.' },
  { term: 'Biering-Sorensen hold', aka: ['Biering-Sorensen'], category: 'Methods & drills', definition: 'Holding the torso horizontal off the end of a bench, face-down, to test and build lower-back endurance.' },
  { term: 'Jefferson curl', category: 'Methods & drills', definition: 'Slowly rolling the spine down one segment at a time while holding a light weight, to build strength at the end of the hamstrings\' and spine\'s range. Start very light.' },
  { term: 'Elephant walk', category: 'Methods & drills', definition: 'Hands on the floor or a bench, alternately locking out one knee with a hard quad squeeze to lengthen the hamstrings actively.' },
  { term: 'Patrick step-down', aka: ['Step-down'], category: 'Methods & drills', definition: 'Standing on a low step on one leg and slowly lowering the other heel to tap the floor, letting the knee travel forward. Builds VMO strength and knee control.' },
  { term: 'Around-the-world', aka: ['Single-leg around-the-world'], category: 'Methods & drills', definition: 'Passing a light kettlebell around your waist hand to hand. On one leg it trains glute medius and foot stability against a moving load.' },
  { term: 'Dead hang', category: 'Methods & drills', definition: 'Hanging from a bar with straight arms. Active hangs pull the shoulders down. Passive hangs let them rise to decompress the spine and shoulders.' },
  { term: '90/90 breathing', aka: ['90/90'], category: 'Methods & drills', definition: 'Lying on your back with hips and knees at 90°, feet on a bench, breathing slowly while digging the heels down. It resets pelvic position and calms tight hip flexors.' },
  { term: 'Indian clubs', category: 'Methods & drills', definition: 'Light, bowling-pin-shaped clubs swung in circles to warm up and strengthen the shoulders and grip through their full rotation.' },

  // In this app
  { term: 'Auto weight progression', aka: ['Load suggestion', 'Next weight'], category: 'In this app', definition: 'The weight the app pre-fills for your next session.', inApp: 'Every rep hit: +10 lb on lower-body barbell lifts, +5 lb upper body, or the next Bowflex setting on kettlebells (only once you reach the top of a rep range). RPE 9.5+: same weight. Missed reps on half the sets or knee pain 4+: lighter. Tap Undo to keep your own number.' },
  { term: 'Last time', category: 'In this app', definition: 'What you lifted on this exercise in your most recent non-deload session, shown under each set.' },
  { term: 'Bowflex settings', category: 'In this app', definition: 'The Bowflex SelectTech 840 kettlebell dials to 8, 12, 20, 25, 35 or 40 lb.', inApp: 'Kettlebell suggestions move one setting at a time.' },
  { term: 'Muscle heatmap', category: 'In this app', definition: 'A body map colored by how recently and how much each muscle was trained.', inApp: 'Includes workouts from Health Connect, labeled "(Health Connect)."' },
  { term: 'Set-equivalents', category: 'In this app', definition: 'How the app converts an outside workout (BJJ, a run) into roughly comparable hard sets per muscle, using activity type, duration and average heart rate.' },
  { term: 'Weekly evaluation', category: 'In this app', definition: 'A weekly review of your logs, pain scores and skipped exercises that can suggest program changes, such as swapping in a regression.' },
  { term: 'Mobility assessment', category: 'In this app', definition: 'A test every 2 weeks of 5 benchmarks (ankle dorsiflexion, elephant-walk reach, split-squat elevation, Biering-Sorensen hold and dead hang) to track joint range.' },
  { term: 'Quarterly assessment', category: 'In this app', definition: 'A test every 3 months of strength and fitness benchmarks, compared against strength standards.' },
];

/** Case-insensitive search over term, aliases, definition and in-app note. */
/** Terms you can watch: the movement demo that shows the idea best. */
export const GLOSSARY_DEMOS: Record<string, DiagramType> = {
  Bracing: 'squat',
  'Foot tripod': 'squat',
  'Knee valgus': 'squat',
  'Hip hinge': 'rdl',
  'Neutral spine': 'good_morning',
  'Posterior pelvic tilt': 'hanging_knee_raise',
  Dorsiflexion: 'warmup_ankle',
  'Lat pack': 'dead_hang',
  'Scapular retraction': 'face_pull',
  VMO: 'step_down',
  Tibialis: 'tibialis',
  'Glute medius': 'step_down',
  'Posterior chain': 'rdl',
  ATG: 'split_squat',
  'McGill Big 3': 'core_mcgill',
  'Biering-Sorensen hold': 'biering_sorensen',
  'Elephant walk': 'warmup_elephant',
  'Patrick step-down': 'step_down',
  'Around-the-world': 'single_leg_atw',
  'Dead hang': 'dead_hang',
  '90/90 breathing': 'warmup_90_90',
  'Indian clubs': 'warmup_club',
};

export interface ExerciseDemo {
  name: string;
  type: DiagramType;
}

/** Every exercise with a movement demo (one row per exercise name), filtered by a search query. */
export function searchExerciseDemos(query: string): ExerciseDemo[] {
  const q = query.trim().toLowerCase();
  const seen = new Set<string>();
  const out: ExerciseDemo[] = [];
  Object.values(EXERCISE_VISUALS).forEach((v) => {
    const key = v.exerciseName.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    if (!q || key.includes(q) || v.diagramType.replace(/_/g, ' ').includes(q)) out.push({ name: v.exerciseName, type: v.diagramType });
  });
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

export function searchGlossary(query: string, category?: GlossaryCategory | 'All'): GlossaryEntry[] {
  const q = query.trim().toLowerCase();
  return GLOSSARY.filter((g) => (!category || category === 'All' || g.category === category))
    .filter((g) => !q || [g.term, ...(g.aka || []), g.definition, g.inApp || ''].some((t) => t.toLowerCase().includes(q)))
    .sort((a, b) => {
      if (!q) return 0;
      const rank = (g: GlossaryEntry) =>
        g.term.toLowerCase().startsWith(q) || (g.aka || []).some((x) => x.toLowerCase().startsWith(q)) ? 0 : g.term.toLowerCase().includes(q) ? 1 : 2;
      return rank(a) - rank(b);
    });
}

const secs = (c: string) => (c === '0' ? 'no' : `${c} s`);

/** "31X1" -> plain steps; null when the tempo isn't a 4-character code or a HOLD-n. */
export function explainTempo(tempo: string | undefined | null): string | null {
  if (!tempo) return null;
  const t = tempo.trim().toUpperCase();
  const hold = /^HOLD-(\d+)$/.exec(t);
  if (hold) return `Hold the position for ${hold[1]} s`;
  if (!/^[0-9X]{4}$/.test(t)) return null;
  const [down, bottom, up, top] = t.split('');
  const parts = [
    down === 'X' ? 'drop fast but controlled' : `${down} s down`,
    bottom === '0' ? 'no pause at the bottom' : bottom === 'X' ? 'bounce at the bottom' : `${bottom} s pause at the bottom`,
    up === 'X' ? 'drive up explosively' : up === '0' ? 'no lifting phase' : `${up} s up`,
    top === '0' ? 'no pause at the top' : top === 'X' ? 'go straight into the next rep' : `${secs(top)} pause at the top`,
  ];
  return parts.join(' · ');
}
