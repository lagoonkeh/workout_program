// auditor_m1_1/adversarial_stress_test.ts
import { calculatePlates, DEFAULT_PLATE_INVENTORY } from '../../../src/domain/plateCalculator';
import { 
  calculateMobilityProgress, 
  getMobilityBenchmarkStatus, 
  generateSparklinePoints,
  validateMobilityEntry 
} from '../../../src/domain/mobility';
import { WORKOUT_SESSIONS } from '../../../src/domain/programData';
import { CUE_CARDS } from '../../../src/domain/cueCardsData';

console.log('=== STARTING INDEPENDENT ADVERSARIAL STRESS TEST ===');

let failures = 0;

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    failures++;
  }
}

// 1. STRESS TEST: Plate Calculator across all integer weights from 40 to 310 lbs
console.log('Test 1: Testing 271 weights from 40 to 310 lbs in 1 lb increments...');
for (let w = 40; w <= 310; w++) {
  const res = calculatePlates(w);
  const sideSum = res.platesPerSide.reduce((sum, p) => sum + p, 0);

  // Check physical conservation of mass
  assert(res.barWeight + 2 * sideSum === res.achievableWeight, `Mass mismatch at ${w} lbs`);
  assert(res.totalPlatesUsed === res.platesPerSide.length * 2, `Plate count mismatch at ${w} lbs`);
  assert(Math.abs(res.remainder - (w - res.achievableWeight)) < 1e-4, `Remainder mismatch at ${w} lbs`);

  // Check inventory limits
  const counts: Record<number, number> = {};
  for (const p of res.platesPerSide) counts[p] = (counts[p] || 0) + 1;
  assert((counts[45] || 0) <= 1, `Too many 45s at ${w} lbs`);
  assert((counts[35] || 0) <= 1, `Too many 35s at ${w} lbs`);
  assert((counts[25] || 0) <= 1, `Too many 25s at ${w} lbs`);
  assert((counts[10] || 0) <= 1, `Too many 10s at ${w} lbs`);
  assert((counts[5] || 0) <= 2, `Too many 5s at ${w} lbs`);
  assert((counts[2.5] || 0) <= 1, `Too many 2.5s at ${w} lbs`);

  // Check sorting order (descending)
  for (let i = 0; i < res.platesPerSide.length - 1; i++) {
    assert(res.platesPerSide[i] >= res.platesPerSide[i + 1], `Sort violation at ${w} lbs`);
  }
}

// 2. STRESS TEST: Knapsack optimality checks
console.log('Test 2: Verifying exact subset-sum minimality on knapsack critical points...');
assert(JSON.stringify(calculatePlates(165).platesPerSide) === JSON.stringify([35, 25]), '165 lbs must be [35, 25]');
assert(JSON.stringify(calculatePlates(170).platesPerSide) === JSON.stringify([35, 25, 2.5]), '170 lbs must be [35, 25, 2.5]');
assert(JSON.stringify(calculatePlates(175).platesPerSide) === JSON.stringify([35, 25, 5]), '175 lbs must be [35, 25, 5]');
assert(JSON.stringify(calculatePlates(180).platesPerSide) === JSON.stringify([35, 25, 5, 2.5]), '180 lbs must be [35, 25, 5, 2.5]');

// 3. STRESS TEST: Empty / Custom inventories
console.log('Test 3: Testing custom restricted inventories...');
const emptyInv = { 45: 0, 35: 0, 25: 0, 10: 0, 5: 0, 2.5: 0 };
const emptyRes = calculatePlates(135, emptyInv);
assert(emptyRes.isExact === false, 'Empty inventory cannot make 135 lbs');
assert(emptyRes.achievableWeight === 45, 'Empty inventory achievable weight must be 45 lbs');
assert(emptyRes.platesPerSide.length === 0, 'Empty inventory must use 0 plates');

// 4. STRESS TEST: Extreme & Malformed inputs
console.log('Test 4: Testing extreme & malformed inputs...');
assert(calculatePlates(NaN).achievableWeight === 45, 'NaN target');
assert(calculatePlates(-999).achievableWeight === 45, 'Negative target');
assert(calculatePlates(1e6).achievableWeight === 300, 'Extreme 1M target clamps to 300');

// 5. STRESS TEST: Mobility Engine Edge Cases
console.log('Test 5: Testing mobility engine edge cases...');
// Inverted lower-is-better regression
const splitSquatHistory = [
  { testId: 'split-squat-elevation' as const, date: '2026-01-01', value: 18 },
  { testId: 'split-squat-elevation' as const, date: '2026-02-01', value: 12 },
  { testId: 'split-squat-elevation' as const, date: '2026-03-01', value: 6 },
  { testId: 'split-squat-elevation' as const, date: '2026-04-01', value: 0 },
];
const ssProg = calculateMobilityProgress(splitSquatHistory, 'split-squat-elevation');
assert(ssProg.status === 'improved', '18 to 0 must be improved');
assert(ssProg.isTargetMet === true, '0 elevation must be target met');
assert(ssProg.delta === -18, 'Delta must be -18');

// Sparkline points with 100 entries
const largeHistory = Array.from({ length: 100 }, (_, i) => ({
  testId: 'dead-hang' as const,
  date: `2026-01-${String(i + 1).padStart(2, '0')}`,
  value: 30 + (i % 20),
}));
const sparkline = generateSparklinePoints(largeHistory, 200, 50);
assert(!sparkline.includes('NaN'), 'Sparkline contains NaN');
assert(sparkline.split(' ').length === 100, 'Sparkline points count must be 100');

// 6. STRESS TEST: Biomechanics & Equipment constraints
console.log('Test 6: Testing biomechanics & equipment constraints...');
const creatorsFound = new Set<string>();
CUE_CARDS.forEach(card => card.creatorCues.forEach(c => creatorsFound.add(c.creator)));
const expectedCreators = [
  'Jeff Nippard',
  'Jeff Cavaliere',
  'Ben Patrick',
  'Dr. Aaron Horschig',
  'Marcus Filly',
  'Coach Eugene Teo',
  'Yellow Dude',
  'Dr. Alyssa Lu',
  'Dr. Stuart McGill'
];
expectedCreators.forEach(creator => {
  const matched = Array.from(creatorsFound).some(c => c.includes(creator.split(' ').pop()!));
  assert(matched, `Missing creator representation: ${creator}`);
});

console.log(`=== ADVERSARIAL STRESS TEST COMPLETE: ${failures} FAILURES ===`);
if (failures > 0) process.exit(1);
