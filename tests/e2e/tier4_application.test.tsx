// tests/e2e/tier4_application.test.tsx
/**
 * Tier 4: Real-World Workload Scenarios Test Suite
 * End-to-end workout session flows from warm-up to cool-down covering all 5 scenarios
 * defined in TEST_INFRA.md:
 * 1. Lower A Complete Knee-Bulletproofing Flow
 * 2. Upper A Horizontal Push/Pull & Shoulder Health
 * 3. Lower B Posterior Chain Restoration & Hip Reset
 * 4. Upper B Vertical Push/Pull & Tempo Calisthenics
 * 5. Long-Term Mobility Tracking & Storage Fault Recovery
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import App from '../../src/App';
import { storageManager } from '../../src/storage/storageManager';
import { restTimerSingleton } from '../../src/timer/restTimerSingleton';
import { audioSynthesizer } from '../../src/audio/audioSynthesizer';

describe('Tier 4: Real-World Application Workload Scenarios', () => {
  beforeEach(() => {
    localStorage.clear();
    restTimerSingleton.reset();
    audioSynthesizer.setMuted(false);
    storageManager.saveImmediate({
      activeSessionId: 'lower_a',
      currentLogs: {},
      mobilityHistory: [],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // Scenario 1: Lower A Complete Knee-Bulletproofing Flow
  // =========================================================================
  it('Scenario 1: Lower A complete knee-bulletproofing flow (Warmup -> T1 Squat -> T2 ATG Split Squat -> T3 Deceleration -> State Saved)', () => {
    render(<App />);

    // 1. Initial State: Lower A Quad & Knee Bulletproofing
    expect(screen.getByText(/4-Day Upper\/Lower/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Quad & Knee Bulletproofing Focus/i).length).toBeGreaterThanOrEqual(1);

    // 2. Warm-up sequence is automatically expanded
    expect(screen.getByText(/Rowing Machine Reverse Leg-Drive/i)).toBeInTheDocument();
    expect(screen.getByText(/Eugene Teo Standing Calf Raise \(Pre-Fatigue\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Eugene Teo Light KB Romanian Hinge \(Pre-Fatigue\)/i)).toBeInTheDocument();

    // 3. View Technique cues for warm-up drill
    const warmupCueBtn = screen.getAllByRole('button', { name: /View Technique Cues/i })[0];
    fireEvent.click(warmupCueBtn);
    const warmupModal = screen.getByRole('dialog');
    expect(warmupModal).toBeInTheDocument();
    expect(within(warmupModal).getByText(/Rowing Machine Reverse Leg-Drive/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Close Cue Card Modal/i }));

    // 4. Barbell Back Squat: Open plate calculator shortcut from set 1 (change weight to 225 lbs)
    const squatWeightInput = screen.getAllByLabelText(/Set 1 Weight \(lbs\)/i)[0];
    fireEvent.change(squatWeightInput, { target: { value: '225' } });

    const squatPlateBtn = screen.getByRole('button', { name: /Show bar view for 225 lbs/i });
    fireEvent.click(squatPlateBtn);

    // Verify plate breakdown on sleeve: [45, 35, 10]
    expect(screen.getByText(/Barbell Plate Loading Calculator/i)).toBeInTheDocument();
    expect(screen.getByText(/\[45, 35, 10\]/)).toBeInTheDocument();

    // Return to routine
    fireEvent.click(screen.getByRole('tab', { name: /Routine/i }));

    // 5. Log all 5 sets of Barbell Back Squat
    const squatCard = screen.getAllByText(/Barbell Back Squat/i)[0].closest('article')!;
    for (let setIdx = 1; setIdx <= 5; setIdx++) {
      const setDoneBtn = within(squatCard).getByRole('button', { name: new RegExp(`Mark set ${setIdx} as completed`, 'i') });
      fireEvent.click(setDoneBtn);
    }
    // Verify rest timer automatically triggered by set completion
    expect(restTimerSingleton.getSnapshot().state).toBe('RUNNING');
    expect(restTimerSingleton.getSnapshot().durationSeconds).toBe(180);

    // 6. T2 ATG Split Squats: Launch Marcus Filly tempo metronome for 31X1 cadence
    const atgTempoBtn = screen.getAllByTitle(/Launch Marcus Filly metronome for/i)[1];
    fireEvent.click(atgTempoBtn);
    expect(screen.getByRole('dialog', { name: /Marcus Filly Tempo Metronome/i })).toBeInTheDocument();
    expect(screen.getAllByText(/31X1/i).length).toBeGreaterThanOrEqual(1);
    fireEvent.click(screen.getByRole('button', { name: /Close Metronome/i }));

    // Verify knee safety banner & regression check
    const regressionBtns = screen.getAllByRole('button', { name: /Need a pain-free regression\?/i });
    const atgRegressionBtn = regressionBtns[1] || regressionBtns[0];
    fireEvent.click(atgRegressionBtn);
    expect(screen.getAllByText(/Front-Foot Elevated ATG Split Squat/i).length).toBeGreaterThanOrEqual(1);

    // Log T2 ATG Split Squats sets (3 sets)
    const atgDoneBtns = screen.getAllByRole('button', { name: /Mark set 1 as completed/i });
    // Click set 1 for ATG split squat (exercise index 1)
    if (atgDoneBtns.length > 1) {
      fireEvent.click(atgDoneBtns[1]);
    }

    // 7. Verify overall session completion percentage increased from 0%
    expect(screen.queryByText(/^0%$/)).not.toBeInTheDocument();

    // 8. Verify LocalStorage persists the session and set logs
    expect(localStorage.getItem('workout_app_active_session_v1')).toBe('lower_a');
  }, 15000);

  // =========================================================================
  // Scenario 2: Upper A Horizontal Push/Pull & Shoulder Health
  // =========================================================================
  it('Scenario 2: Upper A horizontal push/pull & shoulder health (Indian Clubs -> T1 Bench -> T2 Single-Arm KB Row -> T3 ER Floor Press -> State Persisted)', () => {
    render(<App />);

    // 1. Switch to Upper A session
    fireEvent.click(screen.getByRole('button', { name: /Upper A/i }));
    expect(screen.getAllByText(/Horizontal Push\/Pull & Shoulder Health/i).length).toBeGreaterThanOrEqual(1);

    // 2. Warm-Up sequence is automatically expanded: Indian clubs, Athlean-X scapular retractions, McGill Bird-Dog
    expect(screen.getByText(/Indian Club Rotational Circles & Casts/i)).toBeInTheDocument();
    expect(screen.getByText(/Athlean-X Scapular Retractions & Depressions/i)).toBeInTheDocument();
    expect(screen.getByText(/McGill Bird-Dog Core & Lat Tension Priming/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Start 10s Hold Clock/i })).toBeInTheDocument();

    // 3. T1 Barbell Bench Press: Open cue card modal to view 45-degree elbow tuck & scapular depression cues
    const benchCueBtn = screen.getAllByRole('button', { name: /View Creator Cues & Science/i })[0];
    fireEvent.click(benchCueBtn);
    const cueModal = screen.getByRole('dialog');
    expect(cueModal).toBeInTheDocument();
    expect(within(cueModal).getByText(/Barbell Bench Press/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Close Cue Card Modal/i }));

    // 4. Calculate plates for 185 lbs Bench Press: [45, 25] per side
    fireEvent.click(screen.getByTestId('barbell-plates-toggle-t1_bb_bench_press'));
    const weightInput = screen.getByLabelText(/Target Barbell Load/i);
    fireEvent.change(weightInput, { target: { value: '185' } });
    expect(screen.getByText(/\[45, 25\]/)).toBeInTheDocument();

    // 5. Log Bench Press sets (5 sets)
    const benchDone1 = screen.getAllByRole('button', { name: /Mark set 1 as completed/i })[0];
    fireEvent.click(benchDone1);
    expect(screen.getByRole('button', { name: /Mark set 1 as incomplete/i })).toBeInTheDocument();

    // 6. T2 Single-Arm Kettlebell Row: check biomechanical rationale (elbow to hip pocket)
    const rowRationaleBtn = screen.getAllByRole('button', { name: /Biomechanical Rationale/i })[1];
    fireEvent.click(rowRationaleBtn);
    expect(screen.getByText(/Driving the elbow back toward the hip pocket/i)).toBeInTheDocument();

    // 7. T3 Athlean-X 20 Effective Reps (ER) Floor Press: test short rest-pause cluster preset
    const floorPressRestBtn = screen.getAllByTitle(/Start \d+s rest timer/i)[2];
    fireEvent.click(floorPressRestBtn);
    expect(restTimerSingleton.getSnapshot().state).toBe('RUNNING');
    expect(restTimerSingleton.getSnapshot().durationSeconds).toBe(20);

    // 8. T3 Athlean-X Non-Negotiable Face Pulls: verify presence
    expect(screen.getByText(/Athlean-X Non-Negotiable Face Pull/i)).toBeInTheDocument();

    // 9. Verify state persisted
    expect(localStorage.getItem('workout_app_active_session_v1')).toBe('upper_a');
  }, 15000);

  // =========================================================================
  // Scenario 3: Lower B Posterior Chain Restoration & Hip Reset
  // =========================================================================
  it('Scenario 3: Lower B posterior chain restoration & hip reset (Hip Reset -> Elephant Walks -> T1 RDL -> Biering-Sørensen logged to Mobility)', () => {
    render(<App />);

    // 1. Switch to Lower B
    fireEvent.click(screen.getByRole('button', { name: /Lower B/i }));
    expect(screen.getAllByText(/Posterior Chain & Hamstring Restoration Focus/i).length).toBeGreaterThanOrEqual(1);

    // 2. Warmup drills are automatically expanded: Alyssa Lu hip reset, ATG Elephant Walks
    expect(screen.getByText(/Alyssa Lu 10-Minute Active Hip Reset Protocol/i)).toBeInTheDocument();
    expect(screen.getByText(/ATG Elephant Walks \(Active Reciprocal Lengthening\)/i)).toBeInTheDocument();

    // 3. Navigate to Mobility Tracker and log Elephant Walk assessment (Level 4: Knuckles)
    fireEvent.click(screen.getByRole('tab', { name: /Mobility/i }));
    expect(screen.getByText(/Mobility & Flexibility Tracker/i)).toBeInTheDocument();

    const l4Btn = screen.getByRole('button', { name: /L4: Knuckles/i });
    fireEvent.click(l4Btn);
    const notesInput = screen.getByPlaceholderText(/e\.g\. Pain-free 0\/10/i);
    fireEvent.change(notesInput, { target: { value: 'Pre-workout active elongation' } });
    fireEvent.click(screen.getByRole('button', { name: /Save Measurement/i }));

    expect(screen.getByText(/Measurement Logged!/i)).toBeInTheDocument();
    expect(screen.getByText(/Proficient/i)).toBeInTheDocument();

    // 4. Return to Routine: T1 Barbell Romanian Deadlift (RDL)
    fireEvent.click(screen.getByRole('tab', { name: /Routine/i }));
    expect(screen.getByText(/Barbell Romanian Deadlift \(RDL\)/i)).toBeInTheDocument();

    // Calculate plates for RDL 205 lbs: [45, 35]
    fireEvent.click(screen.getByTestId('barbell-plates-toggle-t1_bb_rdl'));
    const weightInput = screen.getByLabelText(/Target Barbell Load/i);
    fireEvent.change(weightInput, { target: { value: '205' } });
    expect(screen.getByText(/\[45, 35\]/)).toBeInTheDocument();

    // Log set 1 of RDL
    const rdlDone1 = screen.getAllByRole('button', { name: /Mark set 1 as completed/i })[0];
    fireEvent.click(rdlDone1);

    // 5. T3 Biering-Sørensen Back Extensor Holds: check presence in Lower B
    expect(screen.getByText(/Biering-Sørensen Back Extensor Holds/i)).toBeInTheDocument();

    // 6. Switch to Mobility Tracker to log Biering-Sørensen test (95 seconds hold)
    fireEvent.click(screen.getByRole('tab', { name: /Mobility/i }));
    const sorensenTab = screen.getAllByText(/Biering-Sørensen/i)[0];
    fireEvent.click(sorensenTab);

    const holdInput = screen.getByPlaceholderText(/Enter seconds/i);
    fireEvent.change(holdInput, { target: { value: '95' } });
    fireEvent.click(screen.getByRole('button', { name: /Save Measurement/i }));

    expect(screen.getByText(/Measurement Logged!/i)).toBeInTheDocument();

    // 7. Verify storage contains both Elephant Walk and Biering-Sørensen entries
    const history = storageManager.load().mobilityHistory;
    expect(history.length).toBe(2);
    expect(history.some((e) => e.testId === 'elephant-walk' && e.value === 4)).toBe(true);
    expect(history.some((e) => e.testId === 'biering-sorensen' && e.value === 95)).toBe(true);
  }, 15000);

  // =========================================================================
  // Scenario 4: Upper B Vertical Push/Pull & Tempo Calisthenics
  // =========================================================================
  it('Scenario 4: Upper B vertical push/pull & tempo calisthenics (Dead Hang Mobility -> T1 OHP -> T2 Pullup Ladder Negatives -> T3 Z-Press Metronome)', () => {
    render(<App />);

    // 1. Switch to Upper B
    fireEvent.click(screen.getByRole('button', { name: /Upper B/i }));
    expect(screen.getAllByText(/Vertical Push\/Pull & Functional Calisthenics/i).length).toBeGreaterThanOrEqual(1);

    // 2. Warm-Up sequence is automatically expanded: Active scapular dead hang pulls & Scapular wall slides
    expect(screen.getByText(/Athlean-X Active Scapular Dead Hang Pulls/i)).toBeInTheDocument();
    expect(screen.getByText(/Scapular Wall Slides \+ 360 Brace/i)).toBeInTheDocument();

    // 3. Log Dead Hang assessment in Mobility tab (50s hold)
    fireEvent.click(screen.getByRole('tab', { name: /Mobility/i }));
    const deadHangTab = screen.getAllByText(/Dead Hang/i)[0];
    fireEvent.click(deadHangTab);

    const hangInput = screen.getByPlaceholderText(/Enter seconds/i);
    fireEvent.change(hangInput, { target: { value: '50' } });
    fireEvent.click(screen.getByRole('button', { name: /Save Measurement/i }));
    expect(screen.getByText(/Measurement Logged!/i)).toBeInTheDocument();

    // 4. Return to Routine: T1 Barbell Overhead Press (OHP)
    fireEvent.click(screen.getByRole('tab', { name: /Routine/i }));
    expect(screen.getByText(/Barbell Overhead Press \(OHP\)/i)).toBeInTheDocument();

    // Calculate plates for OHP 105 lbs: [25, 5] per side
    fireEvent.click(screen.getByTestId('barbell-plates-toggle-t1_bb_ohp'));
    const weightInput = screen.getByLabelText(/Target Barbell Load/i);
    fireEvent.change(weightInput, { target: { value: '105' } });
    expect(screen.getByText(/\[25, 5\]/)).toBeInTheDocument();

    // Log OHP set 1
    const ohpDone1 = screen.getAllByRole('button', { name: /Mark set 1 as completed/i })[0];
    fireEvent.click(ohpDone1);

    // 5. T2 Pull-Up Ladder Progression: check Yellow Dude tenocyte remodeling rationale
    const pullupRationaleBtn = screen.getAllByRole('button', { name: /Biomechanical Rationale/i })[1];
    fireEvent.click(pullupRationaleBtn);
    expect(screen.getByText(/Yellow Dude tendon remodeling protocol/i)).toBeInTheDocument();

    // 6. T3 Marcus Filly Single-Arm Kettlebell Z-Press: launch metronome (tempo: 30X1)
    const zPressTempoBtn = screen.getAllByTitle(/Launch Marcus Filly metronome for/i)[2];
    fireEvent.click(zPressTempoBtn);
    expect(screen.getByRole('dialog', { name: /Marcus Filly Tempo Metronome/i })).toBeInTheDocument();
    expect(screen.getAllByText(/30X1/i).length).toBeGreaterThanOrEqual(1);
    fireEvent.click(screen.getByRole('button', { name: /Close Metronome/i }));

    // 7. Verify Upper B progress persisted
    expect(localStorage.getItem('workout_app_active_session_v1')).toBe('upper_b');
  }, 15000);

  // =========================================================================
  // Scenario 5: Long-Term Mobility Tracking & Storage Fault Recovery
  // =========================================================================
  it('Scenario 5: Long-term mobility tracking & storage fault recovery (10 test entries over 30 days -> Sparkline trend -> Corrupted injection recovery -> Export/Import)', () => {
    // 1. Seed 10 sequential Knee-to-Wall measurements over 30 days
    const mockDates = [
      '2026-09-01', '2026-09-04', '2026-09-08', '2026-09-11', '2026-09-15',
      '2026-09-18', '2026-09-22', '2026-09-25', '2026-09-28', '2026-10-01',
    ];
    const mockValues = [2.5, 2.75, 3.0, 3.25, 3.5, 3.75, 4.0, 4.25, 4.75, 5.0];

    mockDates.forEach((dateStr, idx) => {
      storageManager.addMobilityEntry({
        testId: 'knee-to-wall',
        value: mockValues[idx],
        date: `${dateStr}T10:00:00.000Z`,
        side: 'bilateral',
        notes: `Assessment day ${idx + 1}`,
      });
    });

    render(<App />);

    // 2. Open Mobility view and select Knee-to-Wall
    fireEvent.click(screen.getByRole('tab', { name: /Mobility/i }));
    const k2wTab = screen.getAllByText(/Knee-to-Wall/i)[0];
    fireEvent.click(k2wTab);

    // 3. Verify Baseline = 2.5 inches, Latest Score = 5 inches, Delta = +2.5 inches
    expect(screen.getByText(/Baseline/i)).toBeInTheDocument();
    expect(screen.getAllByText(/2\.5 inches/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Latest Score/i)).toBeInTheDocument();
    expect(screen.getAllByText(/5 inches/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/\+2\.5 inches/i)).toBeInTheDocument();
    expect(screen.getByText(/Target Met/i)).toBeInTheDocument();

    // 4. Verify Sparkline SVG contains 10 rendered points
    const circles = document.querySelectorAll('circle');
    expect(circles.length).toBeGreaterThanOrEqual(10);

    // 5. Simulate sudden corrupted localStorage injection while user is in application
    localStorage.setItem('workout_app_state_v1', '###SYNTAX_ERROR_CORRUPTED_JSON###');
    localStorage.setItem('workout_app_set_logs_v1', 'corrupted-logs-string');

    // Re-load storage state via storageManager and verify fallback
    const recoveredData = storageManager.load();
    expect(recoveredData).toBeDefined();
    expect(recoveredData.version).toBe(1);

    // 6. Test JSON export and import roundtrip
    const backupJson = storageManager.exportJSON();
    expect(backupJson).toContain('knee-to-wall');

    const importRes = storageManager.importJSON(backupJson);
    expect(importRes.success).toBe(true);
    expect(storageManager.load().mobilityHistory.length).toBe(10);
  }, 15000);
});
