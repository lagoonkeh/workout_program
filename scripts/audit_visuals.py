# audit_visuals.py
import re

with open(r'C:\Users\lagoo\.gemini\antigravity\scratch\workout_program\src\domain\programData.ts', 'r', encoding='utf-8') as f:
    prog_content = f.read()

with open(r'C:\Users\lagoo\.gemini\antigravity\scratch\workout_program\src\domain\exerciseVisualsData.ts', 'r', encoding='utf-8') as f:
    vis_content = f.read()

with open(r'C:\Users\lagoo\.gemini\antigravity\scratch\workout_program\src\components\ExerciseDiagram.tsx', 'r', encoding='utf-8') as f:
    diag_content = f.read()

diag_cases = set(re.findall(r"case '([^']+)':", diag_content))
print('Defined cases in ExerciseDiagram.tsx:', sorted(list(diag_cases)))

# Find exercises in programData.ts
# WorkoutExercise id: '...'
exercise_matches = re.findall(r"id:\s*'([a-z0-9_]+)',\s*\n\s*name:\s*'([^']+)'", prog_content)
print(f"\nTotal exercises/warmups in programData.ts: {len(exercise_matches)}")

# Find all entries in EXERCISE_VISUALS
visual_blocks = re.findall(r"([a-z0-9_]+):\s*\{\s*id:\s*'([^']+)',\s*exerciseName:\s*'([^']+)',\s*diagramType:\s*'([^']+)'", vis_content)
visual_dict = {b[1]: (b[2], b[3]) for b in visual_blocks}

print(f"Total entries in EXERCISE_VISUALS: {len(visual_dict)}")

print("\n--- EXERCISE AUDIT ---")
missing_in_visuals = []
missing_in_cases = []

for ex_id, ex_name in exercise_matches:
    if ex_id in visual_dict:
        v_name, v_type = visual_dict[ex_id]
        has_case = v_type in diag_cases
        case_status = "OK" if has_case else "FALLBACK_TO_DEFAULT (MISSING SPECIFIC CASE!)"
        if not has_case:
            missing_in_cases.append((ex_id, ex_name, v_type))
        print(f"[{case_status}] {ex_id}: {ex_name} -> diagramType: {v_type}")
    else:
        missing_in_visuals.append((ex_id, ex_name))
        print(f"[MISSING IN EXERCISE_VISUALS!] {ex_id}: {ex_name}")

print("\n--- SUMMARY OF ISSUES ---")
print(f"Missing in EXERCISE_VISUALS: {len(missing_in_visuals)}")
for m in missing_in_visuals:
    print(f"  - {m[0]}: {m[1]}")

print(f"\nMissing specific SVG cases (falling back to generic default): {len(missing_in_cases)}")
for m in missing_in_cases:
    print(f"  - {m[0]}: {m[1]} (type: {m[2]})")
