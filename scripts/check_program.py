# Since programData is typescript, let's parse programData.ts cleanly
import re

with open(r'C:\Users\lagoo\.gemini\antigravity\scratch\workout_program\src\domain\programData.ts', 'r', encoding='utf-8') as f:
    text = f.read()

# Match exercise blocks
# id: '...', name: '...', tier: '...'
pattern = re.compile(r"id:\s*'([a-z0-9_]+)',\s*\n\s*name:\s*'([^']+)',\s*\n\s*tier:\s*'([^']+)'", re.MULTILINE)
exercises = pattern.findall(text)
print(f"Total exercises in program: {len(exercises)}")
for eid, name, tier in exercises:
    print(f"  [{tier}] {eid}: {name}")

# Also check warmups
warmup_pattern = re.compile(r"id:\s*'(w_[a-z0-9_]+)',\s*\n\s*name:\s*'([^']+)'", re.MULTILINE)
warmups = warmup_pattern.findall(text)
print(f"\nTotal warmups in program: {len(warmups)}")
for wid, wname in warmups:
    print(f"  [Warmup] {wid}: {wname}")
