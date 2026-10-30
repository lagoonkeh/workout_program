// src/domain/plateCalculator.ts

export const DEFAULT_BAR_WEIGHT = 45;

/**
 * Plate counts in user home gym inventory (total plates across both sleeves).
 */
export interface PlateInventory {
  45: number;  // 2 plates (1 pair)
  35: number;  // 2 plates (1 pair)
  25: number;  // 2 plates (1 pair)
  10: number;  // 2 plates (1 pair)
  5: number;   // 4 plates (2 pairs)
  2.5: number; // 2 plates (1 pair)
}

export const DEFAULT_PLATE_INVENTORY: PlateInventory = {
  45: 2,
  35: 2,
  25: 2,
  10: 2,
  5: 4,
  2.5: 2,
};

/**
 * Visual and physical metadata for a single plate denomination.
 */
export interface PlateSpecification {
  weight: number;
  diameterMm: number;
  heightPx: number;
  colorHex: string;
  tailwindBg: string;
  tailwindBorder: string;
  textColor: string;
  label: string;
}

/**
 * Visual element rendered on a barbell sleeve.
 */
export interface PlateVisualItem {
  id: string;
  weight: number;
  diameterMm: number;
  heightPx: number;
  colorHex: string;
  tailwindBg: string;
  tailwindBorder: string;
  textColor: string;
  label: string;
}

/**
 * Grouped plate count summary for readable display badges.
 */
export interface PlateGroupSummary {
  plateWeight: number;
  countPerSide: number;
  totalCount: number;
  spec: PlateSpecification;
}

/**
 * Comprehensive result of a barbell plate calculation.
 */
export interface PlateCalculationResult {
  targetWeight: number;
  barWeight: number;
  weightPerSide: number;
  platesPerSide: number[];        // Descending order (inside sleeve to collar tip)
  achievableWeight: number;
  isExact: boolean;
  totalPlatesUsed: number;        // Total plates across BOTH sides
  remainder: number;              // targetWeight - achievableWeight
  message: string;
  platesVisual: PlateVisualItem[];
  groupSummary: PlateGroupSummary[];
}

export const PLATE_SPECS: Record<number, PlateSpecification> = {
  45: {
    weight: 45,
    diameterMm: 450,
    heightPx: 140,
    colorHex: '#EF4444',
    tailwindBg: 'bg-red-600',
    tailwindBorder: 'border-red-700',
    textColor: 'text-white',
    label: '45',
  },
  35: {
    weight: 35,
    diameterMm: 390,
    heightPx: 120,
    colorHex: '#F59E0B',
    tailwindBg: 'bg-amber-500',
    tailwindBorder: 'border-amber-600',
    textColor: 'text-slate-950',
    label: '35',
  },
  25: {
    weight: 25,
    diameterMm: 340,
    heightPx: 100,
    colorHex: '#10B981',
    tailwindBg: 'bg-emerald-600',
    tailwindBorder: 'border-emerald-700',
    textColor: 'text-white',
    label: '25',
  },
  10: {
    weight: 10,
    diameterMm: 280,
    heightPx: 76,
    colorHex: '#1E293B',
    tailwindBg: 'bg-slate-800',
    tailwindBorder: 'border-slate-700',
    textColor: 'text-slate-100',
    label: '10',
  },
  5: {
    weight: 5,
    diameterMm: 220,
    heightPx: 56,
    colorHex: '#64748B',
    tailwindBg: 'bg-slate-500',
    tailwindBorder: 'border-slate-600',
    textColor: 'text-white',
    label: '5',
  },
  2.5: {
    weight: 2.5,
    diameterMm: 180,
    heightPx: 44,
    colorHex: '#94A3B8',
    tailwindBg: 'bg-slate-400',
    tailwindBorder: 'border-slate-500',
    textColor: 'text-slate-900',
    label: '2.5',
  },
};

/**
 * Converts a list of plates into visual items with styling dimensions.
 */
export function getPlatesVisual(platesPerSide: number[]): PlateVisualItem[] {
  return platesPerSide.map((weight, index) => {
    const spec = PLATE_SPECS[weight] || {
      weight,
      diameterMm: 200,
      heightPx: 60,
      colorHex: '#64748B',
      tailwindBg: 'bg-slate-500',
      tailwindBorder: 'border-slate-600',
      textColor: 'text-white',
      label: String(weight),
    };

    return {
      id: `plate-${weight}-${index}`,
      weight,
      diameterMm: spec.diameterMm,
      heightPx: spec.heightPx,
      colorHex: spec.colorHex,
      tailwindBg: spec.tailwindBg,
      tailwindBorder: spec.tailwindBorder,
      textColor: spec.textColor,
      label: spec.label,
    };
  });
}

/**
 * Summarizes plate counts into group badges (e.g. 2x 35 lb, 2x 25 lb).
 */
export function getPlateGroupSummary(platesPerSide: number[]): PlateGroupSummary[] {
  const counts = new Map<number, number>();
  for (const p of platesPerSide) {
    counts.set(p, (counts.get(p) || 0) + 1);
  }

  // Sort descending by plate weight
  const sortedDenoms = Array.from(counts.keys()).sort((a, b) => b - a);

  return sortedDenoms.map((plateWeight) => {
    const countPerSide = counts.get(plateWeight)!;
    const spec = PLATE_SPECS[plateWeight] || {
      weight: plateWeight,
      diameterMm: 200,
      heightPx: 60,
      colorHex: '#64748B',
      tailwindBg: 'bg-slate-500',
      tailwindBorder: 'border-slate-600',
      textColor: 'text-white',
      label: String(plateWeight),
    };

    return {
      plateWeight,
      countPerSide,
      totalCount: countPerSide * 2,
      spec,
    };
  });
}

/**
 * Calculates the mathematically optimal barbell plate combination.
 * 
 * Uses an exhaustive 128-state subset-sum search over available side plates.
 * Guarantees minimal plate count, resolving greedy flaws at 165, 170, 175, 180 lbs.
 * 
 * @param targetWeight The total desired barbell weight in pounds.
 * @param inventory Optional custom plate inventory (defaults to user 300 lb set).
 * @param barWeight Weight of the empty barbell (defaults to 45 lbs).
 */
export function calculatePlates(
  targetWeight: number,
  inventory: PlateInventory = DEFAULT_PLATE_INVENTORY,
  barWeight: number = DEFAULT_BAR_WEIGHT
): PlateCalculationResult {
  // 1. Guard against non-numeric, NaN, or non-finite inputs
  if (typeof targetWeight !== 'number' || Number.isNaN(targetWeight) || !Number.isFinite(targetWeight) || targetWeight === null || targetWeight === undefined) {
    return {
      targetWeight: 0,
      barWeight,
      weightPerSide: 0,
      platesPerSide: [],
      achievableWeight: barWeight,
      isExact: false,
      totalPlatesUsed: 0,
      remainder: 0,
      message: 'Invalid target weight entered.',
      platesVisual: [],
      groupSummary: [],
    };
  }

  // 2. Expand inventory to single-side available plates
  const denoms: (keyof PlateInventory)[] = [45, 35, 25, 10, 5, 2.5];
  const sidePlates: number[] = [];

  for (const d of denoms) {
    const totalCount = inventory ? (inventory[d] ?? 0) : (DEFAULT_PLATE_INVENTORY[d] ?? 0);
    const pairs = Math.floor(totalCount / 2);
    for (let i = 0; i < pairs; i++) {
      sidePlates.push(d);
    }
  }

  const maxSideCapacity = sidePlates.reduce((sum, p) => sum + p, 0);
  const maxAchievableWeight = barWeight + 2 * maxSideCapacity;

  // 3. Sub-barbell or empty-bar cases
  if (targetWeight <= barWeight) {
    const isExact = targetWeight === barWeight;
    const remainder = Number((targetWeight - barWeight).toFixed(2));
    const message = isExact
      ? 'Empty bar (45 lbs).'
      : `Target weight is below empty bar (${barWeight} lbs). Use empty bar.`;

    return {
      targetWeight,
      barWeight,
      weightPerSide: 0,
      platesPerSide: [],
      achievableWeight: barWeight,
      isExact,
      totalPlatesUsed: 0,
      remainder,
      message,
      platesVisual: [],
      groupSummary: [],
    };
  }

  // 4. Evaluate optimal 128-state subset-sum search
  const desiredSide = (targetWeight - barWeight) / 2;
  const n = sidePlates.length;
  const totalStates = 1 << n;

  let exactBest: number[] | null = null;
  let closestSubset: number[] | null = null;
  let closestDiff = Infinity;

  for (let mask = 0; mask < totalStates; mask++) {
    let sum = 0;
    const subset: number[] = [];

    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) {
        sum += sidePlates[i];
        subset.push(sidePlates[i]);
      }
    }

    const diff = Math.abs(sum - desiredSide);

    // Exact match check: minimize plate count
    if (diff < 1e-6) {
      if (!exactBest || subset.length < exactBest.length) {
        exactBest = subset;
      }
    }

    // Nearest fallback check (for inexact/odd loads or overcapacity)
    if (
      diff < closestDiff ||
      (Math.abs(diff - closestDiff) < 1e-6 && closestSubset && subset.length < closestSubset.length)
    ) {
      closestDiff = diff;
      closestSubset = subset;
    }
  }

  // 5. Exact match found
  if (exactBest) {
    // Sort descending: heaviest plate closest to collar
    exactBest.sort((a, b) => b - a);

    return {
      targetWeight,
      barWeight,
      weightPerSide: Number(desiredSide.toFixed(2)),
      platesPerSide: exactBest,
      achievableWeight: targetWeight,
      isExact: true,
      totalPlatesUsed: exactBest.length * 2,
      remainder: 0,
      message: 'Exact plate combination calculated.',
      platesVisual: getPlatesVisual(exactBest),
      groupSummary: getPlateGroupSummary(exactBest),
    };
  }

  // 6. Non-exact match handling (odd decimal weights, increments not divisible by 5, or target > 300)
  const chosen = closestSubset || [];
  chosen.sort((a, b) => b - a);
  const achievableSide = chosen.reduce((sum, p) => sum + p, 0);
  const achievableWeight = Number((barWeight + 2 * achievableSide).toFixed(2));
  const remainder = Number((targetWeight - achievableWeight).toFixed(2));

  let message: string;
  if (targetWeight > maxAchievableWeight) {
    message = `Target exceeds maximum capacity (${maxAchievableWeight} lbs). Loaded maximum available plates.`;
  } else {
    message = `${targetWeight} lbs cannot be loaded with available plates. Closest achievable load is ${achievableWeight} lbs.`;
  }

  return {
    targetWeight,
    barWeight,
    weightPerSide: Number(achievableSide.toFixed(2)),
    platesPerSide: chosen,
    achievableWeight,
    isExact: false,
    totalPlatesUsed: chosen.length * 2,
    remainder,
    message,
    platesVisual: getPlatesVisual(chosen),
    groupSummary: getPlateGroupSummary(chosen),
  };
}
