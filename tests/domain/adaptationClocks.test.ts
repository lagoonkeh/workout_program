import { describe, it, expect } from 'vitest';
import {
  FIVE_CLOCKS_OF_ADAPTATION,
  FIVE_RUNG_GATE_LADDERS,
  NIPPARD_LLP_STUDY_SYNTHESIS,
  LUCAS_HARDIE_RANGE_OF_STRENGTH_SYNTHESIS,
} from '../../src/domain/adaptationClocks';

describe('Adaptation Clocks & Exercise Science Studies Domain', () => {
  it('defines all 5 adaptation clocks (Yellow Dude framing)', () => {
    expect(FIVE_CLOCKS_OF_ADAPTATION).toHaveLength(5);
    const clockIds = FIVE_CLOCKS_OF_ADAPTATION.map((c) => c.id);
    expect(clockIds).toEqual(['neural', 'soreness', 'cardiovascular', 'hypertrophy', 'tendons']);
  });

  it('orders clocks from fastest to slowest and cites evidence for each', () => {
    expect(FIVE_CLOCKS_OF_ADAPTATION[0].speed).toBe('Fastest');
    expect(FIVE_CLOCKS_OF_ADAPTATION[4].speed).toBe('Slowest');
    expect(FIVE_CLOCKS_OF_ADAPTATION[4].timelineLabel).toContain('Months');
    FIVE_CLOCKS_OF_ADAPTATION.forEach((clock) => {
      expect(clock.evidence.length).toBeGreaterThan(10);
      expect(clock).not.toHaveProperty('quote');
    });
    expect(FIVE_CLOCKS_OF_ADAPTATION[4].evidence).toContain('Kubo');
  });

  it('defines 3 calisthenics progression ladders with 5 rungs each', () => {
    expect(FIVE_RUNG_GATE_LADDERS).toHaveLength(3);
    FIVE_RUNG_GATE_LADDERS.forEach((ladder) => {
      expect(ladder.rungs).toHaveLength(5);
      expect(ladder.progressionNote).toMatch(/coaching targets/i);
    });
  });

  it('describes lengthened partials as comparable to full range, not superior', () => {
    expect(NIPPARD_LLP_STUDY_SYNTHESIS.title).toContain('Lengthened Partials (LLPs)');
    expect(NIPPARD_LLP_STUDY_SYNTHESIS.coreMechanism).toMatch(/not settled/i);
    expect(NIPPARD_LLP_STUDY_SYNTHESIS.summary).toContain('similar growth');
    expect(NIPPARD_LLP_STUDY_SYNTHESIS.summary).not.toMatch(/prove/i);
    expect(NIPPARD_LLP_STUDY_SYNTHESIS.protocolRules.some((r) => /final set only/i.test(r))).toBe(true);
  });

  it('labels Range of Strength benchmarks as coaching targets', () => {
    expect(LUCAS_HARDIE_RANGE_OF_STRENGTH_SYNTHESIS.creator).toBe('Biomechanics Standard');
    expect(
      LUCAS_HARDIE_RANGE_OF_STRENGTH_SYNTHESIS.guidelines.some((g) => /coaching targets/i.test(g))
    ).toBe(true);
  });
});
