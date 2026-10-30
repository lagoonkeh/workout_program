// src/domain/cueCardTypes.ts
// Cue card types, kept apart from the ~130 KB card data so importing them costs nothing.

export interface CreatorAttribution {
  creator: string;
  quote: string;
  biomechanicalRationale: string;
}

export interface LengthenedPartialsProtocol {
  recommendation: string;
  targetRangeNote: string;
  scientificRationale: string;
}

export interface CueCard {
  id: string;
  exerciseId: string;
  exerciseName: string;
  title: string;
  tier: 'T1' | 'T2' | 'T3' | 'Warmup';
  tempo: string; // Marcus Filly 4-digit notation e.g. "31X1"
  prescribedTempo: string;
  primaryMuscles: string[];
  equipment: string;
  setup: string;
  setupInstructions: string[];
  creatorCues: CreatorAttribution[];
  commonFaults: string[];
  rehabRegressions: string[];
  lengthenedPartialsProtocol?: LengthenedPartialsProtocol;
}
