import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { buildCueCardLookup, loadCueCards, getCueCardLookup, useCueCardLookup } from '../../src/domain/cueCardStore';
import { CUE_CARDS } from '../../src/domain/cueCardsData';

describe('cueCardStore', () => {
  it('indexes cards by id, exercise id, name and title', () => {
    const card = CUE_CARDS[0];
    const map = buildCueCardLookup(CUE_CARDS);
    expect(map.get(card.id)).toBe(card);
    expect(map.get(card.exerciseId)).toBe(card);
    expect(map.get(card.exerciseName.toLowerCase())).toBe(card);
    expect(map.get(card.title.toLowerCase())).toBe(card);
  });

  it('loads once and the hook returns the loaded lookup', async () => {
    const a = await loadCueCards();
    expect(await loadCueCards()).toBe(a);
    expect(getCueCardLookup()).toBe(a);
    const { result } = renderHook(() => useCueCardLookup());
    await waitFor(() => expect(result.current.size).toBeGreaterThan(0));
    expect(result.current).toBe(a);
  });
});
