// src/domain/cueCardStore.ts
/**
 * Loads the cue card data (~130 KB) as its own chunk instead of shipping it in the main bundle.
 * Components read it through useCueCardLookup(), which returns an empty map until the chunk arrives
 * and re-renders once it does.
 */
import { useEffect, useState } from 'react';
import type { CueCard } from './cueCardTypes';

export type CueCardLookup = ReadonlyMap<string, CueCard>;

const EMPTY_LOOKUP: CueCardLookup = new Map();
let lookup: CueCardLookup | null = null;
let pending: Promise<CueCardLookup> | null = null;

/** Index cards by id, exercise id, lower-cased exercise name and lower-cased title. */
export function buildCueCardLookup(cards: CueCard[]): CueCardLookup {
  const map = new Map<string, CueCard>();
  for (const card of cards) {
    map.set(card.id, card);
    map.set(card.exerciseId, card);
    map.set(card.exerciseName.toLowerCase(), card);
    map.set(card.title.toLowerCase(), card);
  }
  return map;
}

export function loadCueCards(): Promise<CueCardLookup> {
  if (!pending) {
    pending = import('./cueCardsData')
      .then((m) => {
        lookup = buildCueCardLookup(m.CUE_CARDS);
        return lookup;
      })
      .catch((err) => {
        pending = null; // offline: try again next time
        throw err;
      });
  }
  return pending;
}

/** The loaded lookup, or null if the chunk hasn't arrived yet. */
export const getCueCardLookup = (): CueCardLookup | null => lookup;

export function useCueCardLookup(): CueCardLookup {
  const [map, setMap] = useState<CueCardLookup>(() => lookup ?? EMPTY_LOOKUP);
  useEffect(() => {
    if (lookup) {
      setMap(lookup);
      return;
    }
    let alive = true;
    loadCueCards()
      .then((m) => {
        if (alive) setMap(m);
      })
      .catch(() => {
        // instructions fall back to the exercise's own data
      });
    return () => {
      alive = false;
    };
  }, []);
  return map;
}
