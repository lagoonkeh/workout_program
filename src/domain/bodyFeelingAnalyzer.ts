// src/domain/bodyFeelingAnalyzer.ts
import { CompletedWorkoutSession } from '../storage/storageManager';
import { WorkoutSession, ALL_APP_SESSIONS } from './programData';
import { WorkoutAdaptation } from './weeklyEvaluator';

export type BodyPartCategory =
  | 'knee'
  | 'lower_back'
  | 'shoulder'
  | 'hamstring'
  | 'hip'
  | 'elbow'
  | 'cns_energy';

export interface DiagnosedSymptom {
  category: BodyPartCategory;
  label: string;
  severity: 'mild' | 'moderate' | 'high';
  detectedFrom: 'today_input' | 'past_notes' | 'both';
  evidenceSnippets: string[];
}

export interface HistoricalNoteSnippet {
  sessionTitle: string;
  date: string;
  exerciseName: string;
  note: string;
  category: BodyPartCategory;
}

export interface BodyFeelingAnalysisResult {
  rawInput: string;
  diagnosedSymptoms: DiagnosedSymptom[];
  pastTwoWeeksFindings: string[];
  biomechanicalSummary: string;
  injectedWarmups: {
    id: string;
    name: string;
    rationale: string;
    creatorInfluence: string;
  }[];
  adaptations: WorkoutAdaptation[];
  isPeakReadiness: boolean;
}

/**
 * Scans the past 14 days of completed workout sessions for athlete notes,
 * skipped exercise comments, and joint feedback.
 */
export function extractPastTwoWeeksNotes(
  history: CompletedWorkoutSession[],
  referenceNowMs: number = Date.now()
): HistoricalNoteSnippet[] {
  const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;
  const cutoffMs = referenceNowMs - fourteenDaysMs;

  const snippets: HistoricalNoteSnippet[] = [];

  history.forEach((session) => {
    const sessionTime = new Date(session.date).getTime();
    if (isNaN(sessionTime) || sessionTime < cutoffMs) return;

    const dateFormatted = session.date.split('T')[0];
    const sessionTitle = session.sessionTitle || session.sessionId;

    // 1. Check notes inside exercise set logs
    const sessionLogs = session.logs || (session as any).setLogs;
    if (sessionLogs && typeof sessionLogs === 'object') {
      Object.entries(sessionLogs).forEach(([exId, logVal]) => {
        const exName =
          ALL_APP_SESSIONS.flatMap((s) => s.exercises).find((e) => e.id === exId)?.name || exId;

        const checkText = (text: string) => {
          if (!text || typeof text !== 'string') return;
          const lower = text.toLowerCase();

          // Classify into categories
          if (
            lower.includes('knee') ||
            lower.includes('patell') ||
            lower.includes('vmo') ||
            lower.includes('crepitus')
          ) {
            snippets.push({ sessionTitle, date: dateFormatted, exerciseName: exName, note: text, category: 'knee' });
          } else if (
            lower.includes('back') ||
            lower.includes('lumbar') ||
            lower.includes('spine') ||
            lower.includes('erector') ||
            lower.includes('disc')
          ) {
            snippets.push({ sessionTitle, date: dateFormatted, exerciseName: exName, note: text, category: 'lower_back' });
          } else if (
            lower.includes('shoulder') ||
            lower.includes('rotator') ||
            lower.includes('imping') ||
            lower.includes('cuff') ||
            lower.includes('acromion')
          ) {
            snippets.push({ sessionTitle, date: dateFormatted, exerciseName: exName, note: text, category: 'shoulder' });
          } else if (
            lower.includes('hamstring') ||
            lower.includes('posterior chain') ||
            lower.includes('bicep femoris')
          ) {
            snippets.push({ sessionTitle, date: dateFormatted, exerciseName: exName, note: text, category: 'hamstring' });
          } else if (
            lower.includes('hip') ||
            lower.includes('groin') ||
            lower.includes('adductor') ||
            lower.includes('flexor')
          ) {
            snippets.push({ sessionTitle, date: dateFormatted, exerciseName: exName, note: text, category: 'hip' });
          } else if (
            lower.includes('elbow') ||
            lower.includes('tricep tendon') ||
            lower.includes('golfer') ||
            lower.includes('tennis')
          ) {
            snippets.push({ sessionTitle, date: dateFormatted, exerciseName: exName, note: text, category: 'elbow' });
          } else if (
            lower.includes('tired') ||
            lower.includes('exhausted') ||
            lower.includes('fatigue') ||
            lower.includes('drained') ||
            lower.includes('sore') ||
            lower.includes('sleep')
          ) {
            snippets.push({ sessionTitle, date: dateFormatted, exerciseName: exName, note: text, category: 'cns_energy' });
          }
        };

        if (Array.isArray(logVal)) {
          logVal.forEach((set: any) => checkText(set.notes));
        } else if (logVal && typeof logVal === 'object') {
          checkText((logVal as any).notes);
        }
      });
    }

    // 2. Check skipped exercise reasons
    if (session.skippedExercises && Array.isArray(session.skippedExercises)) {
      session.skippedExercises.forEach((sk) => {
        if (sk.reason) {
          const lower = sk.reason.toLowerCase();
          let cat: BodyPartCategory = 'cns_energy';
          if (lower.includes('knee') || lower.includes('patell')) cat = 'knee';
          else if (lower.includes('back') || lower.includes('lumbar')) cat = 'lower_back';
          else if (lower.includes('shoulder') || lower.includes('imping')) cat = 'shoulder';
          else if (lower.includes('hamstring')) cat = 'hamstring';
          else if (lower.includes('hip')) cat = 'hip';

          snippets.push({
            sessionTitle,
            date: dateFormatted,
            exerciseName: sk.exerciseName || sk.exerciseId,
            note: `Skipped: ${sk.reason}`,
            category: cat,
          });
        }
      });
    }

    // 3. Check overall session notes
    if (session.notes) {
      const lower = session.notes.toLowerCase();
      let cat: BodyPartCategory = 'cns_energy';
      if (lower.includes('knee')) cat = 'knee';
      else if (lower.includes('back')) cat = 'lower_back';
      else if (lower.includes('shoulder')) cat = 'shoulder';

      snippets.push({
        sessionTitle,
        date: dateFormatted,
        exerciseName: 'Session Note',
        note: session.notes,
        category: cat,
      });
    }
  });

  return snippets;
}

/**
 * Parses free-form text input and quick tags, combining with the past 2 weeks
 * of workout notes to diagnose joint strains, tendon fatigue, and prescribe adaptations.
 */
export function analyzeBodyFeelingAndHistory(
  feelingText: string,
  quickTags: string[] = [],
  pastHistory: CompletedWorkoutSession[] = [],
  activeSession: WorkoutSession,
  referenceNowMs: number = Date.now()
): BodyFeelingAnalysisResult {
  const combinedInput = [feelingText, ...quickTags].filter(Boolean).join(' ').trim();
  const lowerInput = combinedInput.toLowerCase();

  // 1. Extract and analyze past 14 days of notes
  const pastSnippets = extractPastTwoWeeksNotes(pastHistory, referenceNowMs);

  const pastSnippetsByCat: Record<BodyPartCategory, HistoricalNoteSnippet[]> = {
    knee: pastSnippets.filter((s) => s.category === 'knee'),
    lower_back: pastSnippets.filter((s) => s.category === 'lower_back'),
    shoulder: pastSnippets.filter((s) => s.category === 'shoulder'),
    hamstring: pastSnippets.filter((s) => s.category === 'hamstring'),
    hip: pastSnippets.filter((s) => s.category === 'hip'),
    elbow: pastSnippets.filter((s) => s.category === 'elbow'),
    cns_energy: pastSnippets.filter((s) => s.category === 'cns_energy'),
  };

  const diagnosedSymptoms: DiagnosedSymptom[] = [];
  const pastFindings: string[] = [];
  const adaptations: WorkoutAdaptation[] = [];
  const injectedWarmups: BodyFeelingAnalysisResult['injectedWarmups'] = [];

  // Helper flags from today's input
  const mentionsKnee =
    lowerInput.includes('knee') ||
    lowerInput.includes('patell') ||
    lowerInput.includes('vmo') ||
    quickTags.includes('🦵 Knee Tender');

  const mentionsBack =
    lowerInput.includes('back') ||
    lowerInput.includes('lumbar') ||
    lowerInput.includes('spine') ||
    lowerInput.includes('disc') ||
    quickTags.includes('🪵 Stiff Lower Back');

  const mentionsShoulder =
    lowerInput.includes('shoulder') ||
    lowerInput.includes('rotator') ||
    lowerInput.includes('pinch') ||
    lowerInput.includes('imping') ||
    quickTags.includes('🎯 Shoulder Pinch');

  const mentionsHamstring =
    lowerInput.includes('hamstring') ||
    lowerInput.includes('posterior chain') ||
    quickTags.includes('🤸 Tight Hamstrings');

  const mentionsHip =
    lowerInput.includes('hip') ||
    lowerInput.includes('groin') ||
    lowerInput.includes('adductor') ||
    lowerInput.includes('flexor');

  const mentionsLowEnergy =
    lowerInput.includes('tired') ||
    lowerInput.includes('exhausted') ||
    lowerInput.includes('fatigue') ||
    lowerInput.includes('sleep debt') ||
    lowerInput.includes('drained') ||
    lowerInput.includes('beat up') ||
    quickTags.includes('😴 Low Sleep');

  const mentionsPeak =
    (lowerInput.includes('fresh') ||
      lowerInput.includes('strong') ||
      lowerInput.includes('great') ||
      lowerInput.includes('push') ||
      lowerInput.includes('energized') ||
      lowerInput.includes('10/10') ||
      quickTags.includes('⚡ High Energy')) &&
    !mentionsKnee &&
    !mentionsBack &&
    !mentionsShoulder &&
    !mentionsLowEnergy;

  // --- 1. KNEE & PATELLAR TENDON ANALYSIS (Ben Patrick ATG / Yellow Dude) ---
  const pastKneeCount = pastSnippetsByCat.knee.length;
  if (mentionsKnee || pastKneeCount > 0) {
    const isBoth = mentionsKnee && pastKneeCount > 0;
    const severity = isBoth || pastKneeCount >= 2 ? 'high' : mentionsKnee ? 'moderate' : 'mild';

    const evidence = [
      ...(mentionsKnee ? [`Today: "${feelingText}"`] : []),
      ...pastSnippetsByCat.knee.map((s) => `${s.date} (${s.exerciseName}): "${s.note}"`),
    ];

    diagnosedSymptoms.push({
      category: 'knee',
      label: 'Patellar Tendon / Knee Strain',
      severity,
      detectedFrom: isBoth ? 'both' : mentionsKnee ? 'today_input' : 'past_notes',
      evidenceSnippets: evidence,
    });

    if (pastKneeCount > 0) {
      pastFindings.push(
        `Past 14 Days: ${pastKneeCount} note(s) logged regarding knee/patellar tension (${pastSnippetsByCat.knee.map((s) => s.date).join(', ')}). Connective tissue requires continuous eccentric protection.`
      );
    }

    // Find knee-dominant compound in active session (Squat / Split Squat / Hack Squat)
    const squatEx = activeSession.exercises.find(
      (e) =>
        e.id === 't1_bb_squat' ||
        e.id === 't2_atg_split_squat' ||
        e.name.toLowerCase().includes('squat')
    );

    if (squatEx && squatEx.regression) {
      adaptations.push({
        id: `adapt_knee_reg_${squatEx.id}_${Date.now()}`,
        exerciseId: squatEx.id,
        exerciseName: squatEx.name,
        action: 'activate_regression',
        parameter: 'regression',
        currentValue: squatEx.name,
        proposedValue: squatEx.regression.name,
        proposedLabel: `Swap to ${squatEx.regression.name}`,
        rationale: `Knee strain diagnosed (severity: ${severity}). Swapping to ${squatEx.regression.name} enforces vertical shins and eliminates ballistic patellar shear forces.`,
        creatorInfluence: 'Ben Patrick (ATG) & Yellow Dude',
        applied: false,
      });

      adaptations.push({
        id: `adapt_knee_tempo_${squatEx.id}_${Date.now()}`,
        exerciseId: squatEx.id,
        exerciseName: squatEx.name,
        action: 'adjust_tempo',
        parameter: 'tempo',
        currentValue: squatEx.tempo,
        proposedValue: '3210',
        proposedLabel: '3210 (3s slow descent, 2s pause, 1s drive)',
        rationale: 'Slow eccentric loading triggers tenocyte mechanotransduction without compressive tendon spikes.',
        creatorInfluence: 'Yellow Dude & Marcus Filly',
        applied: false,
      });
    }

    injectedWarmups.push({
      id: 'prehab_atg_drag',
      name: 'ATG Backward Drag / Locomotion (3–4 min)',
      rationale: 'Pumps rich synovial fluid into patellar cartilage with zero shear impact before squatting.',
      creatorInfluence: 'Ben Patrick (ATG)',
    });
    injectedWarmups.push({
      id: 'prehab_patrick_step',
      name: 'Patrick Step-Downs on Plate (2x15/side)',
      rationale: 'Isolates and vascularizes the VMO (vastus medialis oblique) in full terminal extension.',
      creatorInfluence: 'Ben Patrick (ATG)',
    });
  }

  // --- 2. LOWER BACK & LUMBAR SPINAL SPARING (Dr. Stuart McGill) ---
  const pastBackCount = pastSnippetsByCat.lower_back.length;
  if (mentionsBack || pastBackCount > 0) {
    const isBoth = mentionsBack && pastBackCount > 0;
    const severity = isBoth || pastBackCount >= 2 ? 'high' : mentionsBack ? 'moderate' : 'mild';

    const evidence = [
      ...(mentionsBack ? [`Today: "${feelingText}"`] : []),
      ...pastSnippetsByCat.lower_back.map((s) => `${s.date} (${s.exerciseName}): "${s.note}"`),
    ];

    diagnosedSymptoms.push({
      category: 'lower_back',
      label: 'Lumbar Spine Sensitivity / Extensor Fatigue',
      severity,
      detectedFrom: isBoth ? 'both' : mentionsBack ? 'today_input' : 'past_notes',
      evidenceSnippets: evidence,
    });

    if (pastBackCount > 0) {
      pastFindings.push(
        `Past 14 Days: ${pastBackCount} note(s) logged regarding lower back tightness/stiffness. Spinal-sparing cylinder bracing prioritized.`
      );
    }

    // Regress or swap axial hinge movements (RDL, Good Morning, or Jefferson Curl)
    const rdlEx = activeSession.exercises.find(
      (e) =>
        e.id === 't1_bb_rdl' ||
        e.id === 't2_kb_good_morning' ||
        e.name.toLowerCase().includes('deadlift') ||
        e.name.toLowerCase().includes('rdl')
    );

    if (rdlEx) {
      adaptations.push({
        id: `adapt_back_tempo_${rdlEx.id}_${Date.now()}`,
        exerciseId: rdlEx.id,
        exerciseName: rdlEx.name,
        action: 'adjust_tempo',
        parameter: 'tempo',
        currentValue: rdlEx.tempo,
        proposedValue: '3111',
        proposedLabel: '3111 (Strict 3s eccentric, pause at knee, zero spinal flexion)',
        rationale: 'Reinforces 360° intra-abdominal pressure and eliminates lumbar rounding under shear.',
        creatorInfluence: 'Dr. Stuart McGill & Squat University',
        applied: false,
      });
    }

    // Check for Jefferson Curls in session -> auto-swap to McGill Big 3 isometric core
    const jeffersonEx = activeSession.exercises.find((e) => e.id === 't3_jefferson_curl');
    if (jeffersonEx && jeffersonEx.regression) {
      adaptations.push({
        id: `adapt_jefferson_swap_${jeffersonEx.id}_${Date.now()}`,
        exerciseId: jeffersonEx.id,
        exerciseName: jeffersonEx.name,
        action: 'activate_regression',
        parameter: 'regression',
        currentValue: jeffersonEx.name,
        proposedValue: jeffersonEx.regression.name,
        proposedLabel: `Swap to ${jeffersonEx.regression.name}`,
        rationale: 'Active back tightness contraindicates loaded spinal flexion. Swapping to McGill Big 3 isometric holds spares lumbar disc fibers.',
        creatorInfluence: 'Dr. Stuart McGill (Spinal Sparing)',
        applied: false,
      });
    }

    injectedWarmups.push({
      id: 'prehab_mcgill_big3',
      name: 'McGill Big 3 Stabilization (Bird-Dog + Side Plank + Curl-Up)',
      rationale: 'Constructs a rigid 360° torso cylinder and neutralizes disc shear prior to lifting.',
      creatorInfluence: 'Dr. Stuart McGill',
    });
  }

  // --- 3. SHOULDER IMPINGEMENT & ROTATOR CUFF HEALTH (Athlean-X & Indian Clubs) ---
  const pastShoulderCount = pastSnippetsByCat.shoulder.length;
  if (mentionsShoulder || pastShoulderCount > 0) {
    const isBoth = mentionsShoulder && pastShoulderCount > 0;
    const severity = isBoth || pastShoulderCount >= 2 ? 'high' : mentionsShoulder ? 'moderate' : 'mild';

    const evidence = [
      ...(mentionsShoulder ? [`Today: "${feelingText}"`] : []),
      ...pastSnippetsByCat.shoulder.map((s) => `${s.date} (${s.exerciseName}): "${s.note}"`),
    ];

    diagnosedSymptoms.push({
      category: 'shoulder',
      label: 'Subacromial Impingement / Rotator Cuff Strain',
      severity,
      detectedFrom: isBoth ? 'both' : mentionsShoulder ? 'today_input' : 'past_notes',
      evidenceSnippets: evidence,
    });

    if (pastShoulderCount > 0) {
      pastFindings.push(
        `Past 14 Days: ${pastShoulderCount} note(s) logged regarding shoulder tightness/pinch (${pastSnippetsByCat.shoulder.map((s) => s.date).join(', ')}). Acromion clearance required.`
      );
    }

    const pressEx = activeSession.exercises.find(
      (e) =>
        e.id === 't1_bb_bench_press' ||
        e.id === 't1_bb_ohp' ||
        e.name.toLowerCase().includes('press')
    );

    if (pressEx && pressEx.regression) {
      adaptations.push({
        id: `adapt_shoulder_reg_${pressEx.id}_${Date.now()}`,
        exerciseId: pressEx.id,
        exerciseName: pressEx.name,
        action: 'activate_regression',
        parameter: 'regression',
        currentValue: pressEx.name,
        proposedValue: pressEx.regression.name,
        proposedLabel: `Swap to ${pressEx.regression.name}`,
        rationale: `Shoulder impingement sensitivity detected. Swapping to ${pressEx.regression.name} allows natural scapulohumeral upward rotation in the scapular plane (30° angle).`,
        creatorInfluence: 'Jeff Cavaliere (ATHLEAN-X)',
        applied: false,
      });
    }

    injectedWarmups.push({
      id: 'prehab_indian_clubs',
      name: 'Indian Club Casts & Circles (2x20 inward & outward)',
      rationale: 'Restores glenohumeral reciprocal rotation and synovial lubrication without load.',
      creatorInfluence: 'Indian Club Shoulder Longevity',
    });
    injectedWarmups.push({
      id: 'prehab_dead_hang',
      name: 'Active Scapular Decompression Hang (2x30s)',
      rationale: 'Decompresses the subacromial space and stretches the tight pec minor.',
      creatorInfluence: 'ATHLEAN-X Scapular Protocols',
    });
  }

  // --- 4. HAMSTRING TIGHTNESS (Eugene Teo & ATG) ---
  const pastHamstringCount = pastSnippetsByCat.hamstring.length;
  if (mentionsHamstring || pastHamstringCount > 0) {
    const evidence = [
      ...(mentionsHamstring ? [`Today: "${feelingText}"`] : []),
      ...pastSnippetsByCat.hamstring.map((s) => `${s.date} (${s.exerciseName}): "${s.note}"`),
    ];

    diagnosedSymptoms.push({
      category: 'hamstring',
      label: 'Posterior Chain & Hamstring Guarding',
      severity: mentionsHamstring ? 'moderate' : 'mild',
      detectedFrom: mentionsHamstring && pastHamstringCount > 0 ? 'both' : mentionsHamstring ? 'today_input' : 'past_notes',
      evidenceSnippets: evidence,
    });

    injectedWarmups.push({
      id: 'prehab_elephant_walks',
      name: 'ATG Elephant Walks (40 dynamic pumps)',
      rationale: 'Dynamically flushes the hamstrings through active reciprocal knee flexion without passive micro-tearing.',
      creatorInfluence: 'Ben Patrick (ATG)',
    });
  }

  // --- 4b. HIP / GROIN / ADDUCTOR RESTRICTION ---
  const pastHipCount = pastSnippetsByCat.hip.length;
  if (mentionsHip || pastHipCount > 0) {
    const evidence = [
      ...(mentionsHip ? [`Today: "${feelingText}"`] : []),
      ...pastSnippetsByCat.hip.map((s) => `${s.date} (${s.exerciseName}): "${s.note}"`),
    ];

    diagnosedSymptoms.push({
      category: 'hip',
      label: 'Hip Capsule / Adductor Restriction',
      severity: mentionsHip ? 'moderate' : 'mild',
      detectedFrom: mentionsHip && pastHipCount > 0 ? 'both' : mentionsHip ? 'today_input' : 'past_notes',
      evidenceSnippets: evidence,
    });

    injectedWarmups.push({
      id: 'prehab_90_90_hip_flow',
      name: '90/90 Dynamic Hip Rotations (2x10 dynamic transitions)',
      rationale: 'Mobilizes internal and external femoral acetabular rotation and clears anterior impingement.',
      creatorInfluence: 'Squat University & Eugene Teo',
    });
  }

  // --- 5. SYSTEMIC CNS FATIGUE & LOW RECOVERY (GZCL Autoregulation) ---
  const pastCnsCount = pastSnippetsByCat.cns_energy.length;
  if (mentionsLowEnergy || pastCnsCount >= 2) {
    diagnosedSymptoms.push({
      category: 'cns_energy',
      label: 'Systemic Fatigue / Sleep Debt',
      severity: mentionsLowEnergy ? 'moderate' : 'mild',
      detectedFrom: mentionsLowEnergy && pastCnsCount > 0 ? 'both' : mentionsLowEnergy ? 'today_input' : 'past_notes',
      evidenceSnippets: [
        ...(mentionsLowEnergy ? [`Today: "${feelingText}"`] : []),
        ...pastSnippetsByCat.cns_energy.map((s) => `${s.date}: "${s.note}"`),
      ],
    });

    // Reduce T1 load by 10%
    const t1Ex = activeSession.exercises.find((e) => e.tier === 'T1');
    if (t1Ex) {
      const currentLoad = t1Ex.defaultWeightLbs || t1Ex.defaultWeight || 100;
      const reducedLoad = Math.max(45, Math.round((currentLoad * 0.9) / 5) * 5);
      if (reducedLoad < currentLoad) {
        adaptations.push({
          id: `adapt_cns_weight_${t1Ex.id}_${Date.now()}`,
          exerciseId: t1Ex.id,
          exerciseName: t1Ex.name,
          action: 'decrease_weight',
          parameter: 'weightLbs',
          currentValue: currentLoad,
          proposedValue: reducedLoad,
          proposedLabel: `${reducedLoad} lbs (-10% Autoregulated Load)`,
          rationale: 'Preserves bar velocity and motor grooving without digging a deeper recovery deficit.',
          creatorInfluence: 'GZCL Method Autoregulation',
          applied: false,
        });
      }
    }
  }

  // --- 6. PEAK READINESS / CLEAR SIGNAL ---
  if (mentionsPeak && diagnosedSymptoms.length === 0) {
    diagnosedSymptoms.push({
      category: 'cns_energy',
      label: 'Peak Neuromuscular Readiness',
      severity: 'mild',
      detectedFrom: 'today_input',
      evidenceSnippets: [`Today: "${feelingText}"`],
    });
  }

  // Formulate Biomechanical Summary
  let biomechanicalSummary = '';
  if (diagnosedSymptoms.length === 0) {
    biomechanicalSummary =
      'Standard functional profile confirmed. No acute joint compromises or guarded muscles detected across today’s check-in or the past 14 days of workout logs. Cleared for prescribed GZCL working weights and tempos.';
  } else if (mentionsPeak) {
    biomechanicalSummary =
      'All physiological lights are green! Full joint compliance, high systemic CNS energy, and zero residual tendon fatigue across past 2 weeks. You are fully primed for Tier 1 progressive overload and AMRAP personal records.';
  } else {
    const categoriesDiagnosed = diagnosedSymptoms.map((s) => s.label).join(', ');
    biomechanicalSummary = `Biomechanical assessment identified: ${categoriesDiagnosed}. Adjustments have been constructed using ATG tendon remodeling, McGill spinal sparing, and scapular decompression principles to deliver full functional training stimulus with zero joint wear.`;
  }

  return {
    rawInput: feelingText,
    diagnosedSymptoms,
    pastTwoWeeksFindings: pastFindings,
    biomechanicalSummary,
    injectedWarmups,
    adaptations,
    isPeakReadiness: mentionsPeak,
  };
}
