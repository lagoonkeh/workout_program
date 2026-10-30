# inspect_visuals_data.py
import re

with open(r'C:\Users\lagoo\.gemini\antigravity\scratch\workout_program\src\domain\exerciseVisualsData.ts', 'r', encoding='utf-8') as f:
    text = f.read()

pattern = re.compile(r"([a-z0-9_]+):\s*\{\s*id:\s*'([^']+)',\s*exerciseName:\s*'([^']+)',\s*diagramType:\s*'([^']+)'", re.MULTILINE)
matches = pattern.findall(text)

print(f"Total entries in EXERCISE_VISUALS: {len(matches)}")
for key, vid, name, dtype in matches:
    print(f"{key:25} | {dtype:18} | {name}")
