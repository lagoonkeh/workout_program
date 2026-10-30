# Original User Request

## Initial Request — 2026-10-13T05:14:48Z

# Teamwork Project Prompt — Final

> Status: Launched
> Goal: Craft prompt → get user approval → delegate to teamwork_preview
> Requested team: Full multi-agent team (parallel specialized agents handling biomechanics synthesis, web application architecture, UI/UX timer engine, and verification testing)

The user requested the full multi-agent team. Build a high-performance, responsive web workout application that synthesizes training principles from 8 elite fitness creators (Jeff Nippard, Jeff Cavaliere / ATHLEAN-X, Ben Patrick / ATG, Dr. Aaron Horschig / Squat University, Marcus Filly, Coach Eugene Teo, Yellow Dude, and Dr. Alyssa Lu / Proformance Sports Therapy) and the GZCL method into a personalized 4-Day Upper / Lower training program tailored specifically for the user's home gym equipment, knee tendinitis rehabilitation, and posterior chain flexibility.

Working directory: C:\Users\lagoo\.gemini\antigravity\scratch\workout_program
Integrity mode: development

## User Equipment Profile
- **Barbell & Squat Rack**: Olympic barbell + plates (2x45lb, 2x35lb, 2x25lb, 2x10lb, 4x5lb, 2x2.5lb = up to 300 lbs total load).
- **Landmine Attachment**: Ground-based rotational, pressing, and rowing mechanics.
- **Pull-Up Bar**: Bodyweight pulling, dead hangs, and L-sit progressions.
- **BowFlex SelectTech 840 Adjustable Kettlebell**: 8–40 lbs for unilateral training, carries, swings, and FBB accessories.
- **Indian Clubs**: 2x 5 lb and 2x 2 lb clubs for rotator cuff preparation and shoulder rotational mobility.
- **Rowing Machine**: Low-impact cardio warm-up, active recovery flushes, and conditioning intervals.

## Health & Biomechanical Context (High Priority)
- **Knee Tendinitis Protocol**: Strictly integrate Ben Patrick's ATG tendinopathy protocol (backward walking / sled simulation, tibialis wall raises, Patrick/Poliquin step-downs, and regressed pain-free ATG split squats) and Yellow Dude's eccentric collagen remodeling principles (3-4s eccentric lowers). Under no circumstances prescribe ballistic knee extension or painful end-range knee flexion under load.
- **Posterior Chain Flexibility & Pre-Fatigue**: Integrate Eugene Teo's sequencing (starting leg sessions with calves and hamstring active pre-activation/eccentrics before heavy squats) plus ATG elephant walks and Alyssa Lu hip resets to decompress tight hamstrings and calves without passive overstretching.
- **Foot & Ankle Mobility**: Address calf stiffness through Dr. Aaron Horschig's ankle dorsiflexion and foot tripod mechanics to remove compensatory patellar shear.
- **Spinal Integrity**: Prioritize Dr. Stuart McGill's core endurance ratios and Big 3 stiffness drills over 1RM lumbar flexion.

## Requirements

### R1. Multi-Disciplinary 4-Day Upper/Lower Workout Synthesis
Design a structured 4-Day Upper / Lower training routine (45–60 minutes per session) adhering to the user's equipment and recovery profile:
- **Session 1 (Lower A - Quad & Knee Bulletproofing Focus)**: ATG backward walking/sled warmup, Eugene Teo calf/hamstring pre-fatigue, GZCL Tier 1 Barbell Back/Box Squat with foot tripod rooting, Tier 2 ATG Split Squats or Landmine Hack Squats, Tier 3 Tibialis wall raises & McGill Big 3 core endurance.
- **Session 2 (Upper A - Horizontal Push/Pull & Shoulder Health)**: Indian club shoulder circle prep, GZCL Tier 1 Barbell Bench Press (45-degree elbow tuck, scapular retraction), Tier 2 Landmine Meadows/Underhand Row, Tier 3 20-Effective-Reps (ER) Kettlebell Floor Press / Landmine Press, and daily Athlean-X Face Pulls or Doorway band pulls.
- **Session 3 (Lower B - Posterior Chain & Hamstring Restoration)**: Alyssa Lu 10-minute active hip reset, ATG Elephant Walks for active hamstring length, GZCL Tier 1 Barbell Romanian Deadlift (RDL) or Conventional Deadlift, Tier 2 Kettlebell/Barbell Good Mornings or Goblet Cossack Squats, Tier 3 Single-Leg Patrick Step-ups on weight plates & Biering-Sørensen back extensor holds.
- **Session 4 (Upper B - Vertical Push/Pull & Functional Calisthenics)**: Athlean-X dead hangs with active scap pulls, GZCL Tier 1 Barbell Overhead Press (scapular plane), Tier 2 Pull-up ladder progression (Yellow Dude gate thresholds / eccentric negatives), Tier 3 Marcus Filly tempo-prescribed (30X1) single-arm kettlebell presses & L-sit compression holds.

### R2. Interactive Web Application & Timer Engine
Deliver a modern, responsive, mobile-friendly web application:
- **Session Selector & Routine Navigator**: Seamless switching between Lower A, Upper A, Lower B, and Upper B with exercise breakdowns, target muscles, and rationale.
- **Real-Time Rest Interval Countdown Timer**: Configurable multi-tier countdown timer with visual status rings, audio chimes/beeps for set completion, and one-click quick presets:
  - 15–30s: Athlean-X Effective Reps rest-pause clusters
  - 60–90s: Tier 3 accessory & mobility intervals
  - 2–3 min: Tier 2 hypertrophy compounds
  - 3–5 min: Tier 1 heavy powerbuilding lifts
- **Set & Rep Tracker with State Persistence**: Checkboxes or log inputs for completed sets, reps achieved, and weights used. Automatically persists progress to local storage across browser refreshes.
- **Interactive Marcus Filly Tempo Metronome**: Visual/audible cadence pinger for prescribed tempos (e.g. 3-second eccentric, 0-second pause, explosive concentric, 1-second top squeeze).
- **Biomechanical Form & Rehab Cue Cards**: Expandable cue cards for each exercise displaying creator-specific cues (e.g., Squat University 360-degree brace, Eugene Teo line-of-pull, Ben Patrick pain-free scaling range, Athlean-X scapular depression).

### R3. Automated Verification Suite
Provide an automated test suite verifying:
- Accurate timer countdowns, pause/resume state transitions, and audio dispatch triggers.
- GZCL tier calculation logic, weight plate loading calculator based on user's exact plate inventory, and rep progression rules.
- LocalStorage persistence across simulated workout reloads.
- Responsive HTML/CSS layout rendering without visual truncation.

## Acceptance Criteria

### Programmatic & Functional Verification
- [ ] Automated test suite runs cleanly and passes 100% of tests.
- [ ] Timer accurately counts down from presets (15s, 30s, 60s, 90s, 120s, 180s), supports custom inputs, and transitions between active, paused, and completed states.
- [ ] Audio/visual alerts trigger on timer completion without breaking user interaction.
- [ ] Tempo ticker correctly demonstrates a 4-digit tempo cadence (e.g. 30X1) with synchronized visual pacing.
- [ ] Plate loading calculator correctly calculates plate combinations matching the user's inventory (45s, 35s, 25s, 10s, 5s, 2.5s) for any target weight up to 300 lbs.
- [ ] Local storage persists completed sets, notes, and entered loads across page reloads.

### Biomechanical & Program Quality
- [ ] Every exercise strictly adheres to the user's available equipment.
- [ ] Knee tendinitis safety protocol is enforced: zero uncontrolled ballistic knee flexion; all knee loading features scalable pain-free regressions and dedicated 3-4s eccentric tempos.
- [ ] Hamstring and calf pre-fatigue / active mobility is integrated prior to quad-dominant compound movements in Lower sessions.
- [ ] All 8 creator core philosophies and GZCL tier structures are clearly operationalized within the application interface.


## Follow-up — 2026-10-13T05:19:01Z

User request update:
Please ensure the workout application also programs active stretching/mobility into the routine and includes a dedicated 'Mobility & Flexibility Tracker' that logs measurable flexibility data over time. Specifically:
1. Active stretching protocols from the creators:
   - ATG Elephant Walks (measuring hamstring reach: fingertips to toes, floor, or palms flat).
   - Squat University Knee-to-Wall Ankle Dorsiflexion Test (measuring distance from wall in inches/cm to track calf tightness reduction).
   - Ben Patrick ATG Split Squat Elevation (tracking front foot elevation regression from block/plate down to flat ground with full hamstring-calf coverage).
   - Dr. Stuart McGill Biering-Sørensen Hold (measuring posterior chain spinal endurance in seconds).
   - Dead Hang Decompression (hold time in seconds).
2. LocalStorage persistence and progress visualization showing if mobility metrics are improving over time.
