# backup_to_sheets.py
import json
import urllib.request
import os

TOKEN_PATH = r'C:\Users\lagoo\.gemini\antigravity\plugin_data\gdrive\token.json'
SPREADSHEET_ID = '18IDVdkxJnCLdC2hDYJQOcKc2OFrZCWK3bkc-N-p-3NA'

with open(TOKEN_PATH, 'r', encoding='utf-8') as f:
    token_data = json.load(f)

access_token = token_data['token']['access_token']

def api_post(endpoint, body):
    url = f'https://sheets.googleapis.com/v4/spreadsheets/{SPREADSHEET_ID}{endpoint}'
    data = json.dumps(body).encode('utf-8')
    req = urllib.request.Request(url, data=data, method='POST', headers={
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    })
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode('utf-8'))

# 1. 4-Day Program Data
program_rows = [
    ['ANTIGRAVITY 4-DAY UPPER/LOWER PERSONALIZED HYBRID PROGRAM (GZCL + 8 CREATOR SYNTHESIS)', '', '', '', '', '', '', '', '', '', ''],
    ['Tailored for: Knee Tendinitis Collagen Remodeling, Hamstring Flexibility, and Home Gym Profile (300 lb Barbell, Landmine, Pull-up Bar, 8-40 lb KB, Indian Clubs, Rower)', '', '', '', '', '', '', '', '', '', ''],
    ['Web App URL: https://workoutprogram-ten.vercel.app', '', '', '', '', '', '', '', '', '', ''],
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

# 2. Workout Logs Data
logs_rows = [
    ['WORKOUT LOGGING & PROGRESSION HISTORY', '', '', '', '', '', '', '', '', '', '', ''],
    ['Synchronized with 4-Day Workout PWA (https://workoutprogram-ten.vercel.app)', '', '', '', '', '', '', '', '', '', '', ''],
    [''],
    ['Date', 'Session', 'Exercise Name', 'Tier', 'Set #', 'Target Reps', 'Weight (lbs)', 'Reps Completed', 'AMRAP Completed', 'Knee Pain (0-10)', 'RPE (1-10)', 'Notes & Form Cues'],
    
    # Template entries for Lower A
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

# 3. Mobility Tracker Data
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

batch_body = {
    'valueInputOption': 'USER_ENTERED',
    'data': [
        {
            'range': "'4-Day Program'!A1",
            'values': program_rows
        },
        {
            'range': "'Workout Logs'!A1",
            'values': logs_rows
        },
        {
            'range': "'Mobility Tracker'!A1",
            'values': mobility_rows
        }
    ]
}

res = api_post('/values:batchUpdate', batch_body)
print('SUCCESS! Updated cells:', res.get('totalUpdatedCells'))
print('Updated sheets count:', len(res.get('responses', [])))
