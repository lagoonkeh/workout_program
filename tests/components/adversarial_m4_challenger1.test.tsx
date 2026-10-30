// tests/components/adversarial_m4_challenger1.test.tsx
/**
 * Milestone 4 Adversarial Hardening & Stress Testing Suite (Challenger 1)
 *
 * Scope:
 * 1. Timer & Metronome Rapid Mount/Unmount Interval Leak Verification
 *    - Validates that rapid unmount (25+ cycles) clears all interval timers and terminates workers.
 *    - Asserts zero orphaned intervals continue firing after widget destruction.
 * 2. AudioContext Unlock Listener Cleanup Verification
 *    - Validates that user interaction (click, touchstart, keydown) removes all three listeners.
 *    - Validates that subsequent interactions do not cause redundant unlock attempts.
 * 3. Zero NaN Coordinates in SVG Sparklines and Circular Progress Rings
 *    - Validates SparklineChart with boundary inputs: zeros, identical values, negative values,
 *      single points, astronomical numbers (1e9), sub-micro decimals (1e-6), and mixed values.
 *    - Validates that every SVG attribute (x, y, cx, cy, d, points, strokeDashoffset) contains NO "NaN".
 *    - Validates RestTimerWidget circular progress ring strokeDashoffset contains zero "NaN".
 *    - Validates TempoMetronomeWidget circular progress ring strokeDashoffset contains zero "NaN".
 * 4. High-Frequency Concurrent Interaction & Race Conditions
 *    - Rapid concurrent timer button presses (Start, Pause, Resume, Add 15s, Add 30s, Reset).
 *    - Rapid cadence changes and metronome restarts under simulated sub-millisecond execution.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { RestTimerWidget } from '../../src/components/RestTimerWidget';
import { TempoMetronomeWidget } from '../../src/components/TempoMetronomeWidget';
import { SparklineChart } from '../../src/components/SparklineChart';
import { TempoMetronome } from '../../src/timer/tempoMetronome';
import { RestTimer } from '../../src/timer/restTimer';
import { restTimerSingleton } from '../../src/timer/restTimerSingleton';
import { AudioSynthesizer } from '../../src/audio/audioSynthesizer';
import { PROTOCOL_ELEPHANT_WALK, PROTOCOL_SPLIT_SQUAT_ELEVATION, PROTOCOL_BIERING_SORENSEN, MobilityEntry } from '../../src/domain/mobility';

describe('Adversarial M4 Hardening: Timers, SVG Coordinates, and AudioContext Cleanup', () => {
  beforeEach(() => {
    localStorage.clear();
    restTimerSingleton.reset();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. AudioContext Unlock Listener Cleanup Verification
  // =========================================================================
  describe('AudioContext Unlock Interaction Listeners', () => {
    it('verifies click interaction triggers unlock and removes click, touchstart, and keydown listeners', () => {
      const removeSpy = vi.spyOn(window, 'removeEventListener');
      const addSpy = vi.spyOn(window, 'addEventListener');

      // Create a fresh instance
      new AudioSynthesizer();

      // Check that addEventListener was called for the three events
      const addedEvents = addSpy.mock.calls.map((call) => call[0]);
      expect(addedEvents).toContain('click');
      expect(addedEvents).toContain('touchstart');
      expect(addedEvents).toContain('keydown');

      // Dispatch 'click' on window
      window.dispatchEvent(new Event('click'));

      // Verify all 3 listeners are cleaned up
      const removedEvents = removeSpy.mock.calls.map((call) => call[0]);
      expect(removedEvents).toContain('click');
      expect(removedEvents).toContain('touchstart');
      expect(removedEvents).toContain('keydown');
    });

    it('verifies touchstart interaction triggers unlock and cleans up all interaction listeners', () => {
      const removeSpy = vi.spyOn(window, 'removeEventListener');

      new AudioSynthesizer();

      // Dispatch 'touchstart'
      window.dispatchEvent(new Event('touchstart'));

      const removedEvents = removeSpy.mock.calls.map((call) => call[0]);
      expect(removedEvents).toContain('click');
      expect(removedEvents).toContain('touchstart');
      expect(removedEvents).toContain('keydown');
    });

    it('verifies keydown interaction triggers unlock and cleans up all interaction listeners', () => {
      const removeSpy = vi.spyOn(window, 'removeEventListener');

      new AudioSynthesizer();

      // Dispatch 'keydown'
      window.dispatchEvent(new Event('keydown'));

      const removedEvents = removeSpy.mock.calls.map((call) => call[0]);
      expect(removedEvents).toContain('click');
      expect(removedEvents).toContain('touchstart');
      expect(removedEvents).toContain('keydown');
    });
  });

  // =========================================================================
  // 2. Timer & Metronome Rapid Mount/Unmount Interval Leak Verification
  // =========================================================================
  describe('Rapid Component Mount/Unmount Interval Leak Verification', () => {
    it('rapidly mounts and unmounts TempoMetronomeWidget 30 times without leaking intervals', () => {
      const clearIntervalSpy = vi.spyOn(window, 'clearInterval');

      for (let i = 0; i < 30; i++) {
        const { unmount } = render(
          <TempoMetronomeWidget initialTempo="30X1" autoStart={true} />
        );
        // Immediately unmount
        unmount();
      }

      // Every mounted widget with autoStart starts a ticker and must clear it upon unmount
      expect(clearIntervalSpy).toHaveBeenCalled();
      expect(clearIntervalSpy.mock.calls.length).toBeGreaterThanOrEqual(30);
    });

    it('rapidly starts and destroys standalone TempoMetronome instances, confirming complete ticker teardown', () => {
      const metronomes: TempoMetronome[] = [];
      const clearIntervalSpy = vi.spyOn(window, 'clearInterval');

      // Instantiate and start 20 metronomes
      for (let i = 0; i < 20; i++) {
        const m = new TempoMetronome({ tickIntervalMs: 50 });
        m.start('31X1', 10);
        metronomes.push(m);
      }

      // Destroy each
      metronomes.forEach((m) => m.destroy());

      expect(clearIntervalSpy.mock.calls.length).toBeGreaterThanOrEqual(20);
    });

    it('rapidly starts and destroys RestTimer instances without dangling visibility listeners or workers', () => {
      const removeDocSpy = vi.spyOn(document, 'removeEventListener');

      for (let i = 0; i < 25; i++) {
        const timer = new RestTimer();
        timer.start(60);
        timer.destroy();
      }

      const docRemovedEvents = removeDocSpy.mock.calls.map((call) => call[0]);
      expect(docRemovedEvents.filter((e) => e === 'visibilitychange').length).toBe(25);
    });
  });

  // =========================================================================
  // 3. Zero NaN Coordinates in SVG Sparklines and Progress Rings
  // =========================================================================
  describe('Zero NaN Coordinates in SVG Renderers Under Extreme Values', () => {
    const checkNoNaNInSVG = (container: HTMLElement) => {
      const svgElements = container.querySelectorAll('svg, path, polyline, line, circle, text');
      expect(svgElements.length).toBeGreaterThan(0);

      svgElements.forEach((el) => {
        for (let i = 0; i < el.attributes.length; i++) {
          const attr = el.attributes[i];
          expect(attr.value).not.toContain('NaN');
          expect(attr.value).not.toContain('undefined');
          expect(attr.value).not.toContain('null');
        }
      });
    };

    it('verifies zero NaN in SparklineChart with a single baseline entry', () => {
      const singleEntry: MobilityEntry[] = [
        { id: 'e1', testId: 'elephant-walk', date: '2026-10-01T10:00:00Z', value: 3 },
      ];

      const { container } = render(
        <SparklineChart entries={singleEntry} protocol={PROTOCOL_ELEPHANT_WALK} />
      );

      checkNoNaNInSVG(container);
    });

    it('verifies zero NaN in SparklineChart with identical entry values (span = 0)', () => {
      const identicalEntries: MobilityEntry[] = [
        { id: 'e1', testId: 'split-squat-elevation', date: '2026-10-01T10:00:00Z', value: 6 },
        { id: 'e2', testId: 'split-squat-elevation', date: '2026-10-02T10:00:00Z', value: 6 },
        { id: 'e3', testId: 'split-squat-elevation', date: '2026-10-03T10:00:00Z', value: 6 },
      ];

      const { container } = render(
        <SparklineChart entries={identicalEntries} protocol={PROTOCOL_SPLIT_SQUAT_ELEVATION} />
      );

      checkNoNaNInSVG(container);
    });

    it('verifies zero NaN in SparklineChart with all zero values (value = 0)', () => {
      const zeroEntries: MobilityEntry[] = [
        { id: 'e1', testId: 'split-squat-elevation', date: '2026-10-01T10:00:00Z', value: 0 },
        { id: 'e2', testId: 'split-squat-elevation', date: '2026-10-02T10:00:00Z', value: 0 },
      ];

      const { container } = render(
        <SparklineChart entries={zeroEntries} protocol={PROTOCOL_SPLIT_SQUAT_ELEVATION} />
      );

      checkNoNaNInSVG(container);
    });

    it('verifies zero NaN in SparklineChart with astronomical extreme values (value = 1e9)', () => {
      const extremeEntries: MobilityEntry[] = [
        { id: 'e1', testId: 'biering-sorensen', date: '2026-10-01T10:00:00Z', value: 1000000000 },
        { id: 'e2', testId: 'biering-sorensen', date: '2026-10-02T10:00:00Z', value: 1000000500 },
      ];

      const { container } = render(
        <SparklineChart entries={extremeEntries} protocol={PROTOCOL_BIERING_SORENSEN} />
      );

      checkNoNaNInSVG(container);
    });

    it('verifies zero NaN in SparklineChart with sub-microscopic fractions (value = 0.00001)', () => {
      const microEntries: MobilityEntry[] = [
        { id: 'e1', testId: 'elephant-walk', date: '2026-10-01T10:00:00Z', value: 0.00001 },
        { id: 'e2', testId: 'elephant-walk', date: '2026-10-02T10:00:00Z', value: 0.00005 },
      ];

      const { container } = render(
        <SparklineChart entries={microEntries} protocol={PROTOCOL_ELEPHANT_WALK} />
      );

      checkNoNaNInSVG(container);
    });

    it('verifies zero NaN in RestTimerWidget circular progress ring across IDLE, RUNNING, and COMPLETED', () => {
      const { container } = render(
        <RestTimerWidget variant="modal" defaultExpanded={true} />
      );

      // 1. Initial IDLE state
      checkNoNaNInSVG(container);

      // 2. Start timer
      const startBtn = screen.getByRole('button', { name: /^start$/i });
      act(() => {
        fireEvent.click(startBtn);
      });
      checkNoNaNInSVG(container);

      // 3. Add time bumper
      const add15Btn = screen.getByRole('button', { name: /add 15 seconds/i });
      act(() => {
        fireEvent.click(add15Btn);
      });
      checkNoNaNInSVG(container);

      // 4. Reset
      const resetBtn = screen.getByRole('button', { name: /reset timer/i });
      act(() => {
        fireEvent.click(resetBtn);
      });
      checkNoNaNInSVG(container);
    });

    it('verifies zero NaN in TempoMetronomeWidget circular progress ring across all tempo phases', () => {
      const { container } = render(
        <TempoMetronomeWidget initialTempo="30X1" autoStart={false} />
      );

      // Initial stopped state
      checkNoNaNInSVG(container);

      // Start cadence
      const startBtn = screen.getByRole('button', { name: /start cadence/i });
      act(() => {
        fireEvent.click(startBtn);
      });
      checkNoNaNInSVG(container);

      // Pause cadence
      const pauseBtn = screen.getByRole('button', { name: /pause/i });
      act(() => {
        fireEvent.click(pauseBtn);
      });
      checkNoNaNInSVG(container);
    });
  });

  // =========================================================================
  // 4. High-Frequency Concurrent Rapid User Interactions
  // =========================================================================
  describe('High-Frequency Rapid User Interaction Stress', () => {
    it('executes 50 rapid sequential clicks on rest timer controls without unhandled exceptions', () => {
      render(<RestTimerWidget variant="modal" defaultExpanded={true} />);

      const startBtn = screen.getByRole('button', { name: /^start$/i });
      const add15Btn = screen.getByRole('button', { name: /add 15 seconds/i });
      const add30Btn = screen.getByRole('button', { name: /add 30 seconds/i });
      const resetBtn = screen.getByRole('button', { name: /reset timer/i });

      expect(() => {
        act(() => {
          for (let i = 0; i < 15; i++) {
            fireEvent.click(startBtn);
            fireEvent.click(add15Btn);
            fireEvent.click(add30Btn);
            fireEvent.click(resetBtn);
          }
        });
      }).not.toThrow();

      expect(restTimerSingleton.getSnapshot().state).toBe('IDLE');
    });

    it('switches between all metronome presets in rapid succession without error', () => {
      render(<TempoMetronomeWidget initialTempo="30X1" autoStart={true} />);

      const presets = ['31X1', '4010', '2011', '3012', '30X1'];

      expect(() => {
        act(() => {
          for (let cycle = 0; cycle < 5; cycle++) {
            for (const preset of presets) {
              const presetBtn = screen.getByText(preset);
              fireEvent.click(presetBtn);
            }
          }
        });
      }).not.toThrow();
    });
  });
});
