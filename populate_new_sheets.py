# populate_new_sheets.py
import json
import urllib.request
import os

TOKEN_PATH = r'C:\Users\lagoo\.gemini\antigravity\plugin_data\gdrive\token.json'
SPREADSHEET_ID = '18IDVdkxJnCLdC2hDYJQOcKc2OFrZCWK3bkc-N-p-3NA'

with open(TOKEN_PATH, 'r', encoding='utf-8') as f:
    token_data = json.load(f)

access_token = token_data['token']['access_token']

def api_get(endpoint):
    url = f'https://sheets.googleapis.com/v4/spreadsheets/{SPREADSHEET_ID}{endpoint}'
    req = urllib.request.Request(url, headers={'Authorization': f'Bearer {access_token}'})
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode('utf-8'))

def api_post(endpoint, body):
    url = f'https://sheets.googleapis.com/v4/spreadsheets/{SPREADSHEET_ID}{endpoint}'
    data = json.dumps(body).encode('utf-8')
    req = urllib.request.Request(url, data=data, method='POST', headers={
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    })
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode('utf-8'))

# Step 1: Inspect current sheets
meta = api_get('?fields=sheets.properties')
existing_sheets = {s['properties']['title']: s['properties']['sheetId'] for s in meta['sheets']}
print("Existing sheets:", existing_sheets)

# Step 2: Prepare batchUpdate to rename Sheet1 to '4-Day Program' and add other sheets
batch_requests = []

if 'Sheet1' in existing_sheets:
    batch_requests.append({
        'updateSheetProperties': {
            'properties': {
                'sheetId': existing_sheets['Sheet1'],
                'title': '4-Day Program',
                'tabColor': {'red': 0.06, 'green': 0.72, 'blue': 0.50}
            },
            'fields': 'title,tabColor'
        }
    })

desired_sheets = [
    ('Workout Logs', {'red': 0.02, 'green': 0.71, 'blue': 0.83}),
    ('Mobility Tracker', {'red': 0.54, 'green': 0.36, 'blue': 0.96}),
    ('Warmup Protocols', {'red': 0.96, 'green': 0.62, 'blue': 0.04}),
    ('Creators & Equipment', {'red': 0.23, 'green': 0.51, 'blue': 0.96})
]

for title, color in desired_sheets:
    if title not in existing_sheets:
        batch_requests.append({
            'addSheet': {
                'properties': {
                    'title': title,
                    'tabColor': color
                }
            }
        })

if batch_requests:
    res = api_post(':batchUpdate', {'requests': batch_requests})
    print("Sheets initialized:", len(batch_requests), "requests executed.")

# Re-fetch sheet IDs
meta = api_get('?fields=sheets.properties')
sheet_id_map = {s['properties']['title']: s['properties']['sheetId'] for s in meta['sheets']}
print("Updated sheet ID map:", sheet_id_map)

# Step 3: Define sheet rows data

# 1. 4-Day Program
program_rows = [
    ['ANTIGRAVITY 4-DAY UPPER/LOWER PERSONALIZED HYBRID PROGRAM (GZCL + 8 CREATOR SYNTHESIS)', '', '', '', '', '', '', '', '', '', ''],
    ['Tailored for: Knee Tendinitis Collagen Remodeling, Hamstring Flexibility, and Home Gym Profile (300 lb Barbell, Landmine, Pull-up Bar, 8-40 lb KB, Indian Clubs, Rower)', '', '', '', '', '', '', '', '', '', ''],
    ['PWA App URL: https://workoutprogram-ten.vercel.app', '', '', '', '', '', '', '', '', '', ''],
    [''],
    ['Session', 'Session Focus', 'Tier', 'Exercise Name', 'Sets', 'Target Reps', 'Tempo (Filly)', 'Rest', 'Equipment', 'Biomechanical Cue & Creator Attribution', 'Progression & Knee Safety Regression'],
    
    # Lower A
    ['Lower A', 'Quad & Knee Bulletproofing', 'Warmup', 'ATG Backward Sled Walk / Sled Drag Simulation', '1', '5-10 min', 'Controlled', '60s', 'Rowing Machine / Bodyweight', 'Ben Patrick (ATG): Active blood flow to patellar tendon with zero shear.', 'Pain-free knee warmup.'],
    ['Lower A', 'Quad & Knee Bulletproofing', 'Warmup', 'Eugene Teo Standing Calf Raise Pre-Fatigue', '2', '15-20', '3111', '60s', 'Plates / Bodyweight', 'Eugene Teo: Full plantarflexion peak squeeze; pre-fatigues calves before squats.', 'Eliminates ankle tightness.'],
    ['Lower A', 'Quad & Knee Bulletproofing', 'T1', 'Barbell Back Squat (Box Squat Option)', '3-5', '3-5 (AMRAP)', '31X1', '180-300s', 'Barbell & Squat Rack', 'Squat U: 360-degree intra-abdominal brace, tripod foot rooting.', 'If knee flares, regress to Box Squats.'],
    ['Lower A', 'Quad & Knee Bulletproofing', 'T2', 'ATG Split Squat (Elevated)', '3', '8-10 / leg', '30X1', '120-180s', 'Plates & Kettlebell', 'Ben Patrick: Scaled front foot elevation to ensure zero patellar pain.', 'Lower elevation as mobility improves.'],
    ['Lower A', 'Quad & Knee Bulletproofing', 'T2', 'Landmine Hack Squat', '3', '8-10', '31X1', '120-180s', 'Landmine Attachment', 'Yellow Dude: 3-4s slow eccentrics for patellar tendon remodeling.', 'Smooth steady tempo.'],
    ['Lower A', 'Quad & Knee Bulletproofing', 'T3', 'Tibialis Wall Raises', '3', '15-20', '2011', '60-90s', 'Bodyweight / Wall', 'Ben Patrick: First line of defense against knee pain and shin splints.', 'Step feet further forward for more difficulty.'],
    ['Lower A', 'Quad & Knee Bulletproofing', 'T3', 'McGill Big 3 (Bird-Dog & Side Planks)', '3', '10s holds', 'Isometric', '60s', 'Bodyweight', 'Dr. Stuart McGill: Spinal endurance without lumbar flexion or spinal shear.', 'Maintain neutral lumbar spine.'],

    # Upper A
    ['Upper A', 'Horizontal Push/Pull & Shoulder Health', 'Warmup', 'Indian Club Shoulder Swings & Circles', '2', '1-2 min', 'Rhythmic', '45s', 'Indian Clubs (2-5 lb)', 'Rotator cuff fluid circulation and scapular mobility.', 'Gentle rhythmic swinging.'],
    ['Upper A', 'Horizontal Push/Pull & Shoulder Health', 'T1', 'Barbell Bench Press', '3-5', '3-5 (AMRAP)', '31X1', '180-300s', 'Barbell & Bench', 'Nippard / Athlean-X: 45-degree elbow tuck, scapular retraction and depression.', 'Touch lower sternum smoothly.'],
    ['Upper A', 'Horizontal Push/Pull & Shoulder Health', 'T2', 'Landmine Single-Arm Meadows Row', '3', '8-10 / arm', '30X1', '120-180s', 'Landmine Attachment', 'Eugene Teo: Match line-of-pull with lat fibers; avoid torso twisting.', 'Strict hinge posture.'],
    ['Upper A', 'Horizontal Push/Pull & Shoulder Health', 'T3', 'Kettlebell Floor Press / Landmine Press', '3', '20 Effective Reps', '2011', '15-30s ER', 'BowFlex 840 Kettlebell', 'Athlean-X: 20-effective-reps rest-pause cluster to exhaust fibers safely.', '15s micro-rests.'],
    ['Upper A', 'Horizontal Push/Pull & Shoulder Health', 'T3', 'Band / Bodyweight Face Pulls & Rotations', '3', '15-20', '2112', '60-90s', 'Bodyweight / Rack', 'Athlean-X: Essential shoulder bulletproofing and posterior deltoid activation.', 'Lead with thumbs back.'],

    # Lower B
    ['Lower B', 'Posterior Chain & Hamstring Restoration', 'Warmup', 'Alyssa Lu 10-Minute Active Hip Reset', '1', '8-10 min', 'Dynamic', '60s', 'Bodyweight', 'Dr. Alyssa Lu: Neuromuscular inhibition of tight hamstrings via glute activation.', 'Active hip opener.'],
    ['Lower B', 'Posterior Chain & Hamstring Restoration', 'Warmup', 'ATG Elephant Walks', '2', '20-30 / leg', 'Smooth', '45s', 'Bodyweight', 'Ben Patrick: Active eccentric lengthening of hamstrings without neural tension.', 'Hands on elevated surface if tight.'],
    ['Lower B', 'Posterior Chain & Hamstring Restoration', 'T1', 'Barbell Romanian Deadlift (RDL)', '3-5', '3-5 (AMRAP)', '3111', '180-300s', 'Barbell & Rack', 'Squat U: Hips back, vertical shins, deep hamstring stretch at mid-shin.', 'Do not bounce; reverse under tension.'],
    ['Lower B', 'Posterior Chain & Hamstring Restoration', 'T2', 'Kettlebell Goblet Cossack Squat', '3', '8-10 / leg', '31X1', '120-180s', 'BowFlex 840 Kettlebell', 'Marcus Filly: Frontal plane adductor length and knee stability.', 'Keep grounded foot rooted.'],
    ['Lower B', 'Posterior Chain & Hamstring Restoration', 'T3', 'Patrick Step-Downs (Weight Plate)', '3', '15-20 / leg', '3011', '60-90s', 'Plates (2-4 in elevation)', 'Ben Patrick: Direct VMO strengthening and pain-free patellar load.', 'Heel taps gently.'],
    ['Lower B', 'Posterior Chain & Hamstring Restoration', 'T3', 'Biering-Sorensen Lumbar Extensor Hold', '3', '45-60s', 'Isometric', '60-90s', 'Bench / Floor', 'Dr. Stuart McGill: Posterior chain endurance benchmark for spine protection.', 'Keep neutral spine alignment.'],

    # Upper B
    ['Upper B', 'Vertical Push/Pull & Functional Calisthenics', 'Warmup', 'Athlean-X Dead Hangs & Scapular Pulls', '2', '45-60s', 'Slow', '45s', 'Pull-up Bar', 'Athlean-X: Decompresses thoracic spine and activates lower traps.', 'Active grip and depressed shoulders.'],
    ['Upper B', 'Vertical Push/Pull & Functional Calisthenics', 'T1', 'Barbell Overhead Press (OHP)', '3-5', '3-5 (AMRAP)', '30X1', '180-300s', 'Barbell & Rack', 'Nippard: Press in scapular plane with tight glutes and quads locked.', 'Head clears bar smoothly.'],
    ['Upper B', 'Vertical Push/Pull & Functional Calisthenics', 'T2', 'Pull-Up Ladder / Eccentric Negatives', '3', '6-8 (or 4s negatives)', '40X1', '120-180s', 'Pull-up Bar', 'Yellow Dude: Slow 4-second negatives if full reps fatigue.', 'Control the eccentric descent.'],
    ['Upper B', 'Vertical Push/Pull & Functional Calisthenics', 'T3', 'Marcus Filly Single-Arm KB Z-Press', '3', '10-12 / arm', '30X1', '60-90s', 'BowFlex 840 Kettlebell', 'Marcus Filly: Strict seated core stiffness with overhead stability.', 'Sit tall with legs straight.'],
    ['Upper B', 'Vertical Push/Pull & Functional Calisthenics', 'T3', 'L-Sit / Hanging Knee Tuck Compression', '3', '15-30s hold', 'Isometric', '60-90s', 'Pull-up Bar / Floor', 'Yellow Dude: Active hip flexor and anterior abdominal compression.', 'Point toes, compress ribs to hips.']
]

# 2. Workout Logs
logs_rows = [
    ['WORKOUT LOGGING & PROGRESSION HISTORY', '', '', '', '', '', '', '', '', '', '', ''],
    ['Synchronized with 4-Day Workout PWA (https://workoutprogram-ten.vercel.app)', '', '', '', '', '', '', '', '', '', '', ''],
    [''],
    ['Date', 'Session', 'Exercise Name', 'Tier', 'Set #', 'Target Reps', 'Weight (lbs)', 'Reps Completed', 'AMRAP Completed', 'Knee Pain (0-10)', 'RPE (1-10)', 'Notes & Form Cues'],
    
    # Template entries
    ['2026-10-13', 'Lower A', 'Barbell Back Squat', 'T1', '1', '3', '185', '3', 'No', '0', '7', 'Warmup smooth, 3s eccentric locked.'],
    ['2026-10-13', 'Lower A', 'Barbell Back Squat', 'T1', '2', '3', '185', '3', 'No', '0', '7.5', 'Solid foot tripod rooting.'],
    ['2026-10-13', 'Lower A', 'Barbell Back Squat', 'T1', '3', '3+', '185', '5', 'Yes (AMRAP)', '0', '8.5', 'Clean 5 reps, knees tracking over toes.'],
    ['2026-10-13', 'Lower A', 'ATG Split Squat (Elevated)', 'T2', '1', '8', '24', '8', 'No', '0', '7', 'Right leg 4-inch elevation.'],
    ['2026-10-13', 'Lower A', 'ATG Split Squat (Elevated)', 'T2', '2', '8', '24', '8', 'No', '0', '7', 'Left leg matching range.'],
    ['2026-10-13', 'Lower A', 'ATG Split Squat (Elevated)', 'T2', '3', '8', '24', '8', 'No', '0', '7.5', 'Zero patellar discomfort.'],
    ['2026-10-13', 'Lower A', 'Landmine Hack Squat', 'T2', '1', '10', '45', '10', 'No', '0', '7', 'Slow 3-second descent.'],
    ['2026-10-13', 'Lower A', 'Landmine Hack Squat', 'T2', '2', '10', '45', '10', 'No', '0', '7.5', 'Great quad burn, no tendon irritation.'],
    ['2026-10-13', 'Lower A', 'Landmine Hack Squat', 'T2', '3', '10', '45', '10', 'No', '0', '8', 'Completed full range.'],
    ['2026-10-13', 'Lower A', 'Tibialis Wall Raises', 'T3', '1', '20', '0', '20', 'No', '0', '6', 'Full dorsiflexion pull.'],
    ['2026-10-13', 'Lower A', 'Tibialis Wall Raises', 'T3', '2', '20', '0', '20', 'No', '0', '6.5', 'Tibialis anterior activated.'],
    ['2026-10-13', 'Lower A', 'Tibialis Wall Raises', 'T3', '3', '20', '0', '20', 'No', '0', '7', 'Solid burn.'],
    ['2026-10-13', 'Lower A', 'McGill Big 3 Side Plank', 'T3', '1', '10s', '0', '10s', 'No', '0', '5', 'Endurance ratio hold.'],
    ['2026-10-13', 'Lower A', 'McGill Big 3 Side Plank', 'T3', '2', '10s', '0', '10s', 'No', '0', '5', 'Neutral spine maintained.'],
    ['2026-10-13', 'Lower A', 'McGill Big 3 Side Plank', 'T3', '3', '10s', '0', '10s', 'No', '0', '5', 'Core rigid.']
]

# 3. Mobility Tracker
mobility_rows = [
    ['MOBILITY & FLEXIBILITY BENCHMARKS (OPTION B PROTOCOLS)', '', '', '', '', '', '', '', '', '', '', ''],
    ['Objective range of motion and tissue capacity tracking with baseline comparisons and gold standards', '', '', '', '', '', '', '', '', '', '', ''],
    [''],
    ['Protocol Name', 'Creator / Source', 'Target Anatomy / Tissue', 'Metric & Unit', 'Improvement Direction', 'Gold Standard Benchmark', 'Baseline Standard', 'Left Side', 'Right Side', 'Latest Value', 'Target Met?', 'Clinical Notes & Safe Execution Cues'],
    
    ['Knee-to-Wall Ankle Test', 'Dr. Aaron Horschig (Squat U)', 'Ankle Dorsiflexion & Calves', 'Distance (inches)', 'Higher is better', '5.0 in (12.5 cm)', '3.5 in', '4.5 in', '4.2 in', '4.5 in', 'Approaching Target', 'Keep heel pinned flat to floor. Test barefoot. Eliminates compensatory patellar shear.'],
    ['ATG Elephant Walk Reach', 'Ben Patrick (ATG)', 'Hamstrings & Posterior Chain', 'Floor Reach (inches)', 'Higher is better', '0.0 in (Palms Flat)', '-4.0 in (Fingertips to Shin)', '-1.5 in', '-1.5 in', '-1.5 in', 'In Progress (+2.5 in)', 'Pump heels alternately for 20-30 reps. Lengthens hamstrings actively without passive strain.'],
    ['ATG Split Squat Elevation', 'Ben Patrick (ATG)', 'Patellar Tendon & Hip Flexors', 'Elevation Height (inches)', 'Lower is better', '0.0 in (Flat Ground)', '6.0 in elevation', '2.0 in', '2.0 in', '2.0 in', 'Significant Progress (-4.0 in)', 'Hamstring must cover calf completely with upright torso and zero knee pain. Lower plates as pain-free depth expands.'],
    ['Biering-Sorensen Back Hold', 'Dr. Stuart McGill', 'Lumbar Extensors & Glutes', 'Hold Time (seconds)', 'Higher is better', '180 seconds (3 mins)', '90 seconds', '125s', '125s', '125s', 'Strong Endurance (+35s)', 'Maintain horizontal torso off bench edge. Critical clinical benchmark for lumbar spine longevity.'],
    ['Active Dead Hang Hold', 'Jeff Cavaliere (Athlean-X)', 'Grip, Scapula & Thoracic Spine', 'Hang Time (seconds)', 'Higher is better', '120 seconds (2 mins)', '45 seconds', '70s', '70s', '70s', 'Progressing (+25s)', 'Active shoulder depression (scapular pull) rather than passive dead hang. Decompresses spine after BJJ.']
]

# 4. Warmup Protocols
warmup_rows = [
    ['WARM-UP DRILLS & DYNAMIC ACTIVATION LIBRARY (ALL 14 MOVEMENTS)', '', '', '', '', '', ''],
    ['Pre-session protocols specifically targeting knee synovial fluid, ankle dorsiflexion, rotator cuff health, and hip mechanics', '', '', '', '', '', ''],
    [''],
    ['Session', 'ID', 'Warm-Up Drill Name', 'Target Volume / Duration', 'Creator Attribution', 'Equipment Required', 'Biomechanical Purpose & Form Cues'],
    
    # Lower A
    ['Lower A', 'w_lower_a_1', 'Rowing Machine Reverse Leg-Drive', '4-5 min (18-20 SPM)', 'Ben Patrick (ATG)', 'Rowing Machine', 'Simulates backward sled pulling. Drives through ball of foot with smooth resistance to pump synovial fluid into VMO with zero knee shear.'],
    ['Lower A', 'w_lower_a_2', 'Alyssa Lu 90/90 Positional Breathing + Bridge', '2 sets x 5 deep breath cycles', 'Dr. Alyssa Lu (Proformance)', 'Bodyweight', 'Restores pelvic neutral and reciprocally inhibits hypertonic hip flexors and lumbar erectors before loading.'],
    ['Lower A', 'w_lower_a_3', 'Eugene Teo Standing Calf Raise Pre-Fatigue', '2 sets x 15-20 reps (3111)', 'Coach Eugene Teo', 'Plates / Bodyweight', 'Full plantarflexion squeeze with 3s eccentric stretch. Decompresses Achilles and unlocks deeper ankle dorsiflexion.'],
    ['Lower A', 'w_lower_a_4', 'Eugene Teo Light KB Hinge Activation', '2 sets x 10 reps', 'Coach Eugene Teo', 'BowFlex 840 KB (8-12 lb)', 'Light posterior weight shift to groove hip hinge mechanics and wake up glutes without neural fatigue.'],
    ['Lower A', 'w_lower_a_5', 'Squat U Ankle Mobilization & Tripod Rooting', '1-2 min per ankle', 'Dr. Aaron Horschig (Squat U)', 'Plates / Bodyweight', 'Mobilizes talocrural joint over 2nd/3rd toe while establishing solid 3-point foot tripod rooting.'],

    # Upper A
    ['Upper A', 'w_upper_a_1', 'Indian Club Rotational Circles & Heart-Throb', '2 sets x 1-2 min', 'Indian Club Methodology', 'Indian Clubs (2-5 lb)', 'Fluid multi-planar shoulder circumduction to pump synovial fluid through glenohumeral capsule and warm up rotator cuff.'],
    ['Upper A', 'w_upper_a_2', 'Athlean-X Scapular Retractions & Depressions', '2 sets x 12-15 reps (2012)', 'Jeff Cavaliere (ATHLEAN-X)', 'Bodyweight / Rack', 'Recruits lower and middle trapezius, establishing active scapular platform for stable barbell pressing.'],
    ['Upper A', 'w_upper_a_3', 'McGill Bird-Dog Core & Lat Tension', '2 sets x 6 reps per side (8s hold)', 'Dr. Stuart McGill', 'Bodyweight', 'Isometric cross-body stiffness (opposite arm/leg) maintaining neutral lumbar spine under abdominal brace.'],

    # Lower B
    ['Lower B', 'w_lower_b_1', 'Alyssa Lu 10-Minute Active Hip Reset', '8-10 min total', 'Dr. Alyssa Lu (Proformance)', 'Bodyweight', 'Dynamic multi-planar hip mobility (adductor rockbacks, 90/90 switches, glute bridges) to decompress posterior chain.'],
    ['Lower B', 'w_lower_b_2', 'ATG Elephant Walks', '2 sets x 20-30 pumps per leg', 'Ben Patrick (ATG)', 'Bodyweight / Elevation', 'Active alternating knee extension to dynamically lengthen hamstring fascia and sciatic nerve glide without passive strain.'],
    ['Lower B', 'w_lower_b_3', 'Rowing Machine Steady Rhythm Flush', '3-5 min (18-20 SPM)', 'Conditioning Standard', 'Rowing Machine', 'Elevates core body temperature and promotes posterior chain blood flow prior to Romanian Deadlifts.'],

    # Upper B
    ['Upper B', 'w_upper_b_1', 'Athlean-X Active Scapular Dead Hang Pulls', '2 sets x 30-45s hold', 'Jeff Cavaliere (ATHLEAN-X)', 'Pull-Up Bar', 'Thoracic decompression paired with active scapular depression to engage serratus anterior and lower traps.'],
    ['Upper B', 'w_upper_b_2', 'Indian Club Shoulder Spirals & Behind-Neck Casts', '2 sets x 1-2 min', 'Indian Club Methodology', 'Indian Clubs (2-5 lb)', 'End-range internal and external rotation preparing shoulder capsule for overhead pressing and pull-ups.'],
    ['Upper B', 'w_upper_b_3', 'Scapular Wall Slides + 360 Brace', '2 sets x 10-12 reps', 'Squat U / Athlean-X', 'Wall / Bodyweight', 'Upward rotation of scapulae while maintaining rib cage down and 360-degree abdominal brace.']
]

# 5. Creators & Equipment
creators_rows = [
    ['EQUIPMENT SPECIFICATIONS & 8-CREATOR BIOMECHANICAL METHODOLOGY', '', '', '', ''],
    ['Synthesized from elite sports physical therapists, strength coaches, and functional training pioneers', '', '', '', ''],
    [''],
    ['Category', 'Item / Creator', 'Specification / Core Concept', 'Application in Hybrid Program', 'Clinical & Longevity Benefit'],
    
    # Equipment
    ['Equipment', 'Olympic Barbell & Plates', '45 lb Bar + 2x45, 2x35, 2x25, 2x10, 4x5, 2x2.5 (300 lb max)', 'Tier 1 compound lifts (Back Squat, Bench Press, Romanian Deadlift, Overhead Press)', 'Heavy progressive strength overload in GZCL framework.'],
    ['Equipment', 'Landmine Attachment', 'Ground-based rotational swivel', 'Meadows Row, Hack Squats, Landmine Press', 'Joint-friendly multi-angle pressing and rowing with low spinal shear.'],
    ['Equipment', 'BowFlex SelectTech 840 KB', 'Adjustable 8, 12, 20, 25, 35, 40 lbs', 'Kettlebell Floor Press, Cossack Squats, Single-Arm Z-Press', 'Unilateral stability, core anti-rotation, and mobility.'],
    ['Equipment', 'Indian Clubs', 'Pair of 2 lb and 5 lb clubs', 'Upper A & Upper B shoulder warmups and fluid circles', 'Rotator cuff health, synovial fluid circulation, shoulder longevity.'],
    ['Equipment', 'Pull-Up Bar', 'Overhead rigid pull-up bar', 'Athlean-X dead hangs, pull-up ladder, L-sit compressions', 'Spinal decompression and vertical pulling strength.'],
    ['Equipment', 'Rowing Machine', 'Full-body cardiovascular rower', 'Lower A reverse sled drive simulation and Lower B warmups', 'Non-impact knee flexion/extension flushing blood into tendons.'],
    
    # Creators
    ['Creator', 'Ben Patrick (ATG)', 'Bulletproofing knees, ankles, and tendons through length and full range', 'Reverse sled simulation, Tibialis wall raises, Patrick step-downs, ATG split squats', 'Eliminates patellar tendinopathy via progressive tendon loading.'],
    ['Creator', 'Yellow Dude', 'Calisthenics gate thresholds and eccentric tendon remodeling', '3-4s slow eccentrics, Pull-up ladder progression, L-sit compressions', 'Collagen synthesis in tendons and pure bodyweight mastery.'],
    ['Creator', 'Coach Eugene Teo', 'Hybrid biomechanics, pre-fatigue sequencing, line of pull', 'Pre-squat calf/hamstring pre-fatigue, single-arm Meadows row lat alignment', 'Removes joint restrictions and aligns movement with muscular anatomy.'],
    ['Creator', 'Dr. Aaron Horschig (Squat U)', 'Movement mechanics, foot tripod rooting, intra-abdominal pressure', '360-degree abdominal brace, ankle dorsiflexion mobilization, RDL hinge posture', 'Protects spine and knees by restoring optimal movement mechanics.'],
    ['Creator', 'Dr. Stuart McGill', 'Spinal mechanics and core endurance ratios', 'McGill Big 3 (Bird-Dog, Side Plank), Biering-Sorensen extensor test', 'Builds spinal stiffness and endurance to prevent lower back injury.'],
    ['Creator', 'Dr. Alyssa Lu (Proformance)', 'Neuromuscular activation and reciprocal inhibition of tight tissues', '90/90 positional breathing, 10-minute active hip reset', 'Decompresses tight hamstrings through active glute activation.'],
    ['Creator', 'Jeff Cavaliere (ATHLEAN-X)', 'Physiotherapy-backed athletic hypertrophy and shoulder care', '20-effective-reps rest-pause clusters, face pulls, active dead hangs', 'Maximizes muscle recruitment while safeguarding joints and rotator cuff.'],
    ['Creator', 'Marcus Filly', 'Functional Bodybuilding and tempo-prescribed contractions', '4-digit tempo cadence (e.g. 31X1, 30X1), Single-arm KB Z-press', 'Controls eccentric speeds, enhances tendon density, mind-muscle connection.'],
    ['Creator', 'Cody Lefever (GZCL)', 'Tiered strength and conditioning programming methodology', 'T1 (Heavy strength), T2 (Hypertrophy volume), T3 (Accessory/rehab endurance)', 'Structured progressive overload with built-in autoregulation (AMRAP).']
]

# Step 4: Batch write data
batch_body = {
    'valueInputOption': 'USER_ENTERED',
    'data': [
        {'range': "'4-Day Program'!A1", 'values': program_rows},
        {'range': "'Workout Logs'!A1", 'values': logs_rows},
        {'range': "'Mobility Tracker'!A1", 'values': mobility_rows},
        {'range': "'Warmup Protocols'!A1", 'values': warmup_rows},
        {'range': "'Creators & Equipment'!A1", 'values': creators_rows}
    ]
}

res_write = api_post('/values:batchUpdate', batch_body)
print('SUCCESS! Total updated cells:', res_write.get('totalUpdatedCells'))

# Step 5: Professional Styling & Formatting Batch
format_requests = []

# Color palettes
NAVY_HEADER = {'red': 0.06, 'green': 0.09, 'blue': 0.16} # #0f172a
WHITE = {'red': 1.0, 'green': 1.0, 'blue': 1.0}
EMERALD_HEADER = {'red': 0.06, 'green': 0.72, 'blue': 0.50} # #10b981
CYAN_HEADER = {'red': 0.02, 'green': 0.71, 'blue': 0.83} # #06b6d4
PURPLE_HEADER = {'red': 0.54, 'green': 0.36, 'blue': 0.96} # #8b5cf6
AMBER_HEADER = {'red': 0.96, 'green': 0.62, 'blue': 0.04} # #f59e0b
BLUE_HEADER = {'red': 0.23, 'green': 0.51, 'blue': 0.96} # #3b82f6

def make_sheet_formatting(sheet_id, col_count, accent_color, freeze_rows=5):
    reqs = []
    # 1. Freeze rows
    reqs.append({
        'updateSheetProperties': {
            'properties': {
                'sheetId': sheet_id,
                'gridProperties': {
                    'frozenRowCount': freeze_rows,
                    'frozenColumnCount': 1
                }
            },
            'fields': 'gridProperties.frozenRowCount,gridProperties.frozenColumnCount'
        }
    })
    # 2. Main title banner (Row 1)
    reqs.append({
        'repeatCell': {
            'range': {'sheetId': sheet_id, 'startRowIndex': 0, 'endRowIndex': 1, 'startColumnIndex': 0, 'endColumnIndex': col_count},
            'cell': {
                'userEnteredFormat': {
                    'backgroundColor': NAVY_HEADER,
                    'textFormat': {'foregroundColor': WHITE, 'bold': True, 'fontSize': 13},
                    'horizontalAlignment': 'LEFT',
                    'verticalAlignment': 'MIDDLE'
                }
            },
            'fields': 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
        }
    })
    # 3. Subtitle rows (Rows 2 & 3)
    reqs.append({
        'repeatCell': {
            'range': {'sheetId': sheet_id, 'startRowIndex': 1, 'endRowIndex': 3, 'startColumnIndex': 0, 'endColumnIndex': col_count},
            'cell': {
                'userEnteredFormat': {
                    'backgroundColor': {'red': 0.12, 'green': 0.16, 'blue': 0.23},
                    'textFormat': {'foregroundColor': {'red': 0.8, 'green': 0.85, 'blue': 0.9}, 'italic': True, 'fontSize': 10},
                    'horizontalAlignment': 'LEFT',
                    'verticalAlignment': 'MIDDLE'
                }
            },
            'fields': 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
        }
    })
    # 4. Table Header row (Row 5, index 4)
    reqs.append({
        'repeatCell': {
            'range': {'sheetId': sheet_id, 'startRowIndex': 4, 'endRowIndex': 5, 'startColumnIndex': 0, 'endColumnIndex': col_count},
            'cell': {
                'userEnteredFormat': {
                    'backgroundColor': accent_color,
                    'textFormat': {'foregroundColor': WHITE, 'bold': True, 'fontSize': 11},
                    'horizontalAlignment': 'CENTER',
                    'verticalAlignment': 'MIDDLE',
                    'wrapStrategy': 'WRAP'
                }
            },
            'fields': 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,wrapStrategy)'
        }
    })
    # 5. Enable text wrap for data rows
    reqs.append({
        'repeatCell': {
            'range': {'sheetId': sheet_id, 'startRowIndex': 5, 'endRowIndex': 100, 'startColumnIndex': 0, 'endColumnIndex': col_count},
            'cell': {
                'userEnteredFormat': {
                    'verticalAlignment': 'MIDDLE',
                    'wrapStrategy': 'WRAP'
                }
            },
            'fields': 'userEnteredFormat(verticalAlignment,wrapStrategy)'
        }
    })
    return reqs

format_requests.extend(make_sheet_formatting(sheet_id_map['4-Day Program'], 11, EMERALD_HEADER, freeze_rows=5))
format_requests.extend(make_sheet_formatting(sheet_id_map['Workout Logs'], 12, CYAN_HEADER, freeze_rows=5))
format_requests.extend(make_sheet_formatting(sheet_id_map['Mobility Tracker'], 12, PURPLE_HEADER, freeze_rows=5))
format_requests.extend(make_sheet_formatting(sheet_id_map['Warmup Protocols'], 7, AMBER_HEADER, freeze_rows=5))
format_requests.extend(make_sheet_formatting(sheet_id_map['Creators & Equipment'], 5, BLUE_HEADER, freeze_rows=5))

# Set custom column widths for readability
def make_col_widths(sheet_id, widths):
    reqs = []
    for col_idx, width_px in enumerate(widths):
        reqs.append({
            'updateDimensionProperties': {
                'range': {
                    'sheetId': sheet_id,
                    'dimension': 'COLUMNS',
                    'startIndex': col_idx,
                    'endIndex': col_idx + 1
                },
                'properties': {
                    'pixelSize': width_px
                },
                'fields': 'pixelSize'
            }
        })
    return reqs

format_requests.extend(make_col_widths(sheet_id_map['4-Day Program'], [90, 160, 75, 230, 65, 110, 100, 85, 170, 320, 240]))
format_requests.extend(make_col_widths(sheet_id_map['Workout Logs'], [100, 90, 220, 65, 60, 100, 95, 120, 120, 110, 90, 260]))
format_requests.extend(make_col_widths(sheet_id_map['Mobility Tracker'], [180, 160, 160, 110, 130, 140, 130, 85, 85, 95, 140, 340]))
format_requests.extend(make_col_widths(sheet_id_map['Warmup Protocols'], [90, 110, 260, 140, 170, 150, 400]))
format_requests.extend(make_col_widths(sheet_id_map['Creators & Equipment'], [110, 200, 250, 300, 340]))

res_format = api_post(':batchUpdate', {'requests': format_requests})
print('SUCCESS! Formatted all sheets with', len(format_requests), 'formatting rules.')
print('SPREADSHEET READY AT: https://docs.google.com/spreadsheets/d/' + SPREADSHEET_ID + '/edit')
