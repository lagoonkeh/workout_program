import { describe, it, expect } from 'vitest';
import {
  FIVE_CLOCKS_OF_ADAPTATION,
  FIVE_RUNG_GATE_LADDERS,
  NIPPARD_LLP_STUDY_SYNTHESIS,
  LUCAS_HARDIE_RANGE_OF_STRENGTH_SYNTHESIS,
} from '../../src/domain/adaptationClocks';

describe('Adaptation Clocks & Exercise Science Studies Domain', () => {
  it('defines all 5 physiological adaptation clocks from Yellow Dude', () => {
    expect(FIVE_CLOCKS_OF_ADAPTATION).toHaveLength(5);
    const clockIds = FIVE_CLOCKS_OF_ADAPTATION.map((c) => c.id);
    expect(clockIds).toEqual(['neural', 'soreness', 'cardiovascular', 'hypertrophy', 'tendons']);
  });

  it('orders clocks from fastest to slowest with accurate timelines', () => {
    expect(FIVE_CLOCKS_OF_ADAPTATION[0].speed).toBe('Fastest');
    expect(FIVE_CLOCKS_OF_ADAPTATION[0].timelineLabel).toContain('Weeks 1 to 3');

    expect(FIVE_CLOCKS_OF_ADAPTATION[4].speed).toBe('Slowest');
    expect(FIVE_CLOCKS_OF_ADAPTATION[4].timelineLabel).toContain('Months');
    expect(FIVE_CLOCKS_OF_ADAPTATION[4].quote).toContain('fastest clock writes the check');
  });

  it('defines 3 calisthenics progression ladders with 5 rungs each', () => {
    expect(FIVE_RUNG_GATE_LADDERS).toHaveLength(3);
    FIVE_RUNG_GATE_LADDERS.forEach((ladder) => {
      expect(ladder.rungs).toHaveLength(5);
      expect(ladder.theRung2Trap).toBeDefined();
    });
  });

  it('includes Jeff Nippard lengthened partials study synthesis', () => {
    expect(NIPPARD_LLP_STUDY_SYNTHESIS.title).toContain('Jeff Nippard');
    expect(NIPPARD_LLP_STUDY_SYNTHESIS.coreMechanism).toContain('Titin Kinase');
    expect(NIPPARD_LLP_STUDY_SYNTHESIS.protocolRules.length).toBeGreaterThanOrEqual(3);
  });

  it('includes Lucas Hardie Range of Strength synthesis with 1x/wk frequency rule', () => {
    expect(LUCAS_HARDIE_RANGE_OF_STRENGTH_SYNTHESIS.creator).toContain('Lucas Hardie');
    expect(
      LUCAS_HARDIE_RANGE_OF_STRENGTH_SYNTHESIS.guidelines.some((g) => g.includes('once per week'))
    ).toBe(true);
  });
});
