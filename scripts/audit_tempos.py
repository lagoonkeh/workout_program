# audit_tempos.py
import re

with open('src/domain/programData.ts', 'r', encoding='utf-8') as f:
    prog_text = f.read()

with open('src/domain/cueCardsData.ts', 'r', encoding='utf-8') as f:
    cue_text = f.read()

prog_tempos = re.findall(r"tempo:\s*['\"]([^'\"]+)['\"]", prog_text)
cue_tempos = re.findall(r"tempo:\s*['\"]([^'\"]+)['\"]", cue_text)
prescribed_tempos = re.findall(r"prescribedTempo:\s*['\"]([^'\"]+)['\"]", cue_text)

all_tempos = set(prog_tempos + cue_tempos + prescribed_tempos)

def resolve_tempo(tempo_str):
    if not tempo_str or not isinstance(tempo_str, str):
        return '30X1'
    t = tempo_str.strip().lower()
    
    # 1. Direct aliases
    if 'isometric' in t or 'hold' in t:
        return '0010'  # 10s isometric hold
    if 'controlled' in t or 'walk' in t or 'step' in t:
        return '2020'  # 2s cadence
    if 'breath' in t or 'inhale' in t or '5083' in t:
        return '5083'  # 5s inhale, 8s exhale, 3s pause
    if 'cluster' in t or 'effective' in t:
        return '2010'

    # 2. Strip parentheses
    before_parens = tempo_str.split('(')[0].split('[')[0].strip().replace(' ', '').replace('-', '')
    if re.match(r'^[0-9][0-9][0-9xX][0-9]$', before_parens):
        return before_parens.upper()

    return '30X1'

print(f"Testing {len(all_tempos)} unique tempos against resolve_tempo:")
failures = []
for t in sorted(all_tempos):
    resolved = resolve_tempo(t)
    is_valid = bool(re.match(r'^[0-9][0-9][0-9X][0-9]$', resolved))
    status = 'OK' if is_valid else 'FAIL'
    if not is_valid: failures.append(t)
    print(f"  [{status}] '{t}' -> '{resolved}'")

print(f"\nTotal Failures: {len(failures)}")
