// src/components/QuarterlyAssessmentWidget.tsx
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  ATHLETE_PROFILE_EVENT,
  bodyweightTimeline,
  currentBodyweight,
  loadProfile,
  profileAge,
} from '../domain/athleteProfile';
import {
  QuarterlyAssessmentRecord,
  AssessmentScores,
  loadQuarterlyAssessments,
  saveQuarterlyAssessment,
  DEFAULT_BASELINE_ASSESSMENT,
  evaluateRow2k,
  formatRowingTime,
  calculateRowingSplit,
  estimateVO2MaxFromCooper,
  evaluateCooperRun,
  evaluateDeadlift,
  evaluateSquat,
  evaluateBenchPress,
  evaluateOverheadPress,
  evaluatePullups,
  evaluatePushups,
  calculateMcGillRatios,
  evaluateDeadHang,
} from '../domain/fitnessAssessment';
import {
  Trophy,
  Activity,
  HeartPulse,
  Dumbbell,
  ShieldCheck,
  Flame,
  Clock,
  ChevronDown,
  ChevronUp,
  PlusCircle,
  Pencil,
  X,
  AlertTriangle,
} from 'lucide-react';

export interface QuarterlyAssessmentWidgetProps {
  onBackToWorkout?: () => void;
}

export const QuarterlyAssessmentWidget: React.FC<QuarterlyAssessmentWidgetProps> = () => {
  const [profile, setProfile] = useState(() => loadProfile());
  useEffect(() => {
    const refresh = () => setTimeout(() => setProfile(loadProfile()), 0);
    window.addEventListener(ATHLETE_PROFILE_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(ATHLETE_PROFILE_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);
  const currentAge = useMemo(() => profileAge(profile), [profile]);

  // Records state
  const [assessments, setAssessments] = useState<QuarterlyAssessmentRecord[]>(() => {
    const loaded = loadQuarterlyAssessments();
    if (loaded.length === 0) {
      // Seed default baseline
      // seeding the starter record is not a user edit, so it must not trigger or win a backup
      saveQuarterlyAssessment(DEFAULT_BASELINE_ASSESSMENT, { silent: true });
      return [DEFAULT_BASELINE_ASSESSMENT];
    }
    return loaded;
  });

  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>(
    () => assessments[0]?.id || DEFAULT_BASELINE_ASSESSMENT.id
  );

  const activeRecord = useMemo(() => {
    return assessments.find((a) => a.id === selectedAssessmentId) || assessments[0] || DEFAULT_BASELINE_ASSESSMENT;
  }, [assessments, selectedAssessmentId]);

  const currentBw = useMemo(() => currentBodyweight(bodyweightTimeline(profile, assessments)), [profile, assessments]);
  const heightFt = Math.floor(profile.heightInches / 12);
  const heightIn = Math.round(profile.heightInches - heightFt * 12);
  const heightLabel = `${heightFt}'${heightIn}"`;
  const bmi = (703 * currentBw) / (profile.heightInches * profile.heightInches);
  const [dobY, dobM, dobD] = profile.dob.split('-');
  const dobLabel = `${dobM}/${dobD}/${dobY}`;

  // Edit / Add modal state
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editFormData, setEditFormData] = useState<QuarterlyAssessmentRecord>(activeRecord);

  // Expanded category accordions
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    aerobic: true,
    strength: true,
    calisthenics: true,
    mcgill: true,
    longevity: true,
    mobility: true,
  });

  const toggleCategory = useCallback((catKey: string) => {
    setExpandedCategories((prev) => ({ ...prev, [catKey]: !prev[catKey] }));
  }, []);

  // 1RM calculator helper state inside edit modal
  const [calcWeight, setCalcWeight] = useState<number>(225);
  const [calcReps, setCalcReps] = useState<number>(5);
  const estimated1RM = useMemo(() => {
    if (calcReps <= 1) return calcWeight;
    return Math.round(calcWeight * (1 + calcReps / 30));
  }, [calcWeight, calcReps]);

  // Handle open editor
  const handleOpenEdit = useCallback((recordToEdit?: QuarterlyAssessmentRecord) => {
    const target = recordToEdit || activeRecord;
    setEditFormData(JSON.parse(JSON.stringify(target)));
    setIsEditing(true);
  }, [activeRecord]);

  // Handle create new assessment
  const handleCreateNewQuarter = useCallback(() => {
    const now = new Date();
    const qNum = Math.floor(now.getMonth() / 3) + 1;
    const year = now.getFullYear();
    const newRecord: QuarterlyAssessmentRecord = {
      id: `assessment_q${qNum}_${year}_${Date.now()}`,
      date: now.toISOString().split('T')[0],
      quarterLabel: `Q${qNum} ${year}`,
      age: currentAge,
      bodyweightLbs: currentBw,
      scores: { ...activeRecord.scores },
      notes: '',
    };
    setEditFormData(newRecord);
    setIsEditing(true);
  }, [activeRecord, currentAge, currentBw]);

  // Handle save
  const handleSaveAssessment = useCallback(() => {
    const updatedList = saveQuarterlyAssessment(editFormData);
    setAssessments(updatedList);
    setSelectedAssessmentId(editFormData.id);
    setIsEditing(false);
  }, [editFormData]);

  // Form input change helper
  const handleScoreChange = useCallback((field: keyof AssessmentScores, val: string | number) => {
    setEditFormData((prev) => ({
      ...prev,
      scores: {
        ...prev.scores,
        [field]: val === '' ? undefined : Number(val),
      },
    }));
  }, []);

  // Computed McGill Ratios for Active Record
  const mcgillAnalysis = useMemo(() => {
    const scores = activeRecord.scores;
    return calculateMcGillRatios(
      scores.mcgillExtensionSec || 0,
      scores.mcgillFlexionSec || 0,
      scores.mcgillSideBridgeRightSec || 0,
      scores.mcgillSideBridgeLeftSec || 0
    );
  }, [activeRecord]);

  // Computed Evaluations
  const rowEval = useMemo(() => evaluateRow2k(activeRecord.scores.row2kSeconds || 450), [activeRecord]);
  const cooperEval = useMemo(() => evaluateCooperRun(activeRecord.scores.cooperRunMiles || 1.3), [activeRecord]);
  const dlEval = useMemo(() => evaluateDeadlift(activeRecord.scores.deadlift1rmLbs || 0, activeRecord.bodyweightLbs, profile.sex), [activeRecord, profile.sex]);
  const squatEval = useMemo(() => evaluateSquat(activeRecord.scores.squat1rmLbs || 0, activeRecord.bodyweightLbs, profile.sex), [activeRecord, profile.sex]);
  const benchEval = useMemo(() => evaluateBenchPress(activeRecord.scores.bench1rmLbs || 0, activeRecord.bodyweightLbs, profile.sex), [activeRecord, profile.sex]);
  const ohpEval = useMemo(() => evaluateOverheadPress(activeRecord.scores.ohp1rmLbs || 0, activeRecord.bodyweightLbs, profile.sex), [activeRecord, profile.sex]);
  const pullupsEval = useMemo(() => evaluatePullups(activeRecord.scores.strictPullupsReps || 0, activeRecord.bodyweightLbs, profile.sex), [activeRecord, profile.sex]);
  const pushupsEval = useMemo(() => evaluatePushups(activeRecord.scores.pushupsReps || 0), [activeRecord]);
  const deadHangEval = useMemo(() => evaluateDeadHang(activeRecord.scores.deadHangSec || 0), [activeRecord]);

  return (
    <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 md:px-6 py-3 sm:py-6 space-y-4 sm:space-y-6">
      {/* 1. Header Banner & Athlete Demographic Profile Card */}
      <section
        role="region"
        aria-label="Quarterly Assessment Profile"
        className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-slate-900 via-slate-900/90 to-emerald-950/40 p-3.5 sm:p-5 shadow-xl"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Trophy className="w-4 h-4 sm:w-5 sm:h-5" />
              </span>
              <h2 className="text-base sm:text-xl font-bold tracking-tight text-white">
                Quarterly Fitness Testing Battery
              </h2>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold">
                DOB: {dobLabel} • Age {currentAge}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300">
              Objective biometric standards calibrated for a {currentAge}-year-old male at {heightLabel}, {currentBw} lbs.
            </p>
          </div>

          {/* Action buttons & Quarter selector */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <label htmlFor="quarter-select" className="sr-only">Select Quarter</label>
            <select
              id="quarter-select"
              value={activeRecord.id}
              onChange={(e) => setSelectedAssessmentId(e.target.value)}
              className="bg-slate-800 text-slate-100 text-xs font-semibold px-2.5 py-2 rounded-xl border border-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-400 cursor-pointer min-h-[44px]"
            >
              {assessments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.quarterLabel} ({a.date})
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => handleOpenEdit(activeRecord)}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors min-h-[44px]"
            >
              <Pencil className="w-3.5 h-3.5 text-emerald-400" />
              <span>Edit Scores</span>
            </button>

            <button
              type="button"
              onClick={handleCreateNewQuarter}
              className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95 min-h-[44px]"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>New Quarter Test</span>
            </button>
          </div>
        </div>

        {/* Demographic & Longevity Invariants Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-4 pt-3.5 border-t border-slate-800/80 text-xs">
          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
            <div className="text-slate-400 text-[10px] font-medium uppercase tracking-wider">Height & Weight</div>
            <div className="font-bold text-white mt-0.5">
              {heightLabel} ({profile.heightInches} in) • {currentBw} lbs
            </div>
            <div className="text-[10px] text-slate-400">BMI {bmi.toFixed(1)}</div>
          </div>

          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
            <div className="text-slate-400 text-[10px] font-medium uppercase tracking-wider">Waist-to-Height Ratio</div>
            <div className="font-bold text-emerald-400 mt-0.5">&lt; 33.0 in Target</div>
            <div className="text-[10px] text-slate-400">WHtR &lt; 0.50 (Cardiometabolic)</div>
          </div>

          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
            <div className="text-slate-400 text-[10px] font-medium uppercase tracking-wider">Dr. McGill Disc Standard</div>
            <div className={`font-bold mt-0.5 ${mcgillAnalysis.isSpineProtected ? 'text-emerald-400' : 'text-amber-400'}`}>
              {mcgillAnalysis.isSpineProtected ? 'Protected Spine' : 'Balance Alert'}
            </div>
            <div className="text-[10px] text-slate-400">Ext ≥ 160s • Flex/Ext &lt; 1.0</div>
          </div>

          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
            <div className="text-slate-400 text-[10px] font-medium uppercase tracking-wider">Longevity Benchmark</div>
            <div className="font-bold text-cyan-400 mt-0.5">120s Dead Hang</div>
            <div className="text-[10px] text-slate-400">Peter Attia Grip Criterion</div>
          </div>
        </div>
      </section>

      {/* 2. Category Testing Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* DOMAIN 1: Cardiorespiratory & VO2max */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3.5 sm:p-4 shadow-lg space-y-3">
          <button
            type="button"
            onClick={() => toggleCategory('aerobic')}
            className="w-full flex items-center justify-between text-left cursor-pointer min-h-[44px]"
          >
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
                <HeartPulse className="w-4 h-4" />
              </span>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-white">1. Cardiorespiratory & VO2max</h3>
                <p className="text-[11px] text-slate-400">Rowing machine 2k time trial & Cooper run</p>
              </div>
            </div>
            {expandedCategories.aerobic ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {expandedCategories.aerobic && (
            <div className="space-y-3 pt-2 border-t border-slate-800">
              {/* 2k Row */}
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-slate-200">2,000m Rowing Machine TT</div>
                  <div className="text-lg font-mono font-bold text-white mt-0.5">
                    {formatRowingTime(activeRecord.scores.row2kSeconds || 0)}
                    <span className="text-xs text-slate-400 font-sans ml-2">
                      ({calculateRowingSplit(activeRecord.scores.row2kSeconds || 0)})
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{rowEval.description}</div>
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${rowEval.badgeClass}`}>
                    {rowEval.tier} ({rowEval.percentileRank})
                  </span>
                </div>
              </div>

              {/* Cooper Run */}
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-slate-200">Cooper 12-Minute Run Test</div>
                  <div className="text-lg font-mono font-bold text-white mt-0.5">
                    {activeRecord.scores.cooperRunMiles || 0} miles
                    <span className="text-xs text-slate-400 font-sans ml-2">
                      (Est. VO2max: {estimateVO2MaxFromCooper(activeRecord.scores.cooperRunMiles || 0)} mL/kg/min)
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{cooperEval.description}</div>
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${cooperEval.badgeClass}`}>
                    {cooperEval.tier}
                  </span>
                </div>
              </div>

              {/* Vagal Heart Rate Recovery */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/60">
                  <span className="text-slate-400 text-[10px]">Resting Heart Rate</span>
                  <div className="font-mono font-bold text-white text-sm mt-0.5">{activeRecord.scores.restingHeartRateBpm || '--'} bpm</div>
                  <span className="text-[10px] text-emerald-400">&lt; 60 bpm Athletic</span>
                </div>
                <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/60">
                  <span className="text-slate-400 text-[10px]">1-Min HR Recovery Drop</span>
                  <div className="font-mono font-bold text-white text-sm mt-0.5">{activeRecord.scores.hrr1minDropBpm || '--'} bpm drop</div>
                  <span className="text-[10px] text-emerald-400">≥ 25 bpm Strong Vagal Tone</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* DOMAIN 2: Compound Strength — percentile among lifters at this assessment's bodyweight */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3.5 sm:p-4 shadow-lg space-y-3">
          <button
            type="button"
            onClick={() => toggleCategory('strength')}
            className="w-full flex items-center justify-between text-left cursor-pointer min-h-[44px]"
          >
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <Dumbbell className="w-4 h-4" />
              </span>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-white">2. Relative Strength ({activeRecord.bodyweightLbs} lbs BW)</h3>
                <p className="text-[11px] text-slate-400">1RM ÷ bodyweight, percentile among lifters (same scale as the heatmap)</p>
              </div>
            </div>
            {expandedCategories.strength ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {expandedCategories.strength && (
            <div className="space-y-2.5 pt-2 border-t border-slate-800">
              {/* Deadlift */}
              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-200">Barbell Deadlift / RDL</div>
                  <div className="text-base font-mono font-bold text-white">
                    {activeRecord.scores.deadlift1rmLbs || 0} lbs{' '}
                    <span className="text-xs text-emerald-400">
                      ({((activeRecord.scores.deadlift1rmLbs || 0) / activeRecord.bodyweightLbs).toFixed(2)}x BW)
                    </span>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${dlEval.badgeClass}`}>
                  {dlEval.tier} · {dlEval.percentileRank}
                </span>
              </div>

              {/* Squat */}
              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-200">Barbell Back Squat</div>
                  <div className="text-base font-mono font-bold text-white">
                    {activeRecord.scores.squat1rmLbs || 0} lbs{' '}
                    <span className="text-xs text-emerald-400">
                      ({((activeRecord.scores.squat1rmLbs || 0) / activeRecord.bodyweightLbs).toFixed(2)}x BW)
                    </span>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${squatEval.badgeClass}`}>
                  {squatEval.tier} · {squatEval.percentileRank}
                </span>
              </div>

              {/* Bench */}
              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-200">Barbell Bench Press</div>
                  <div className="text-base font-mono font-bold text-white">
                    {activeRecord.scores.bench1rmLbs || 0} lbs{' '}
                    <span className="text-xs text-emerald-400">
                      ({((activeRecord.scores.bench1rmLbs || 0) / activeRecord.bodyweightLbs).toFixed(2)}x BW)
                    </span>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${benchEval.badgeClass}`}>
                  {benchEval.tier} · {benchEval.percentileRank}
                </span>
              </div>

              {/* OHP */}
              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-200">Strict Overhead Press</div>
                  <div className="text-base font-mono font-bold text-white">
                    {activeRecord.scores.ohp1rmLbs || 0} lbs{' '}
                    <span className="text-xs text-emerald-400">
                      ({((activeRecord.scores.ohp1rmLbs || 0) / activeRecord.bodyweightLbs).toFixed(2)}x BW)
                    </span>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${ohpEval.badgeClass}`}>
                  {ohpEval.tier} · {ohpEval.percentileRank}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* DOMAIN 3: Calisthenics & Relative Endurance */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3.5 sm:p-4 shadow-lg space-y-3">
          <button
            type="button"
            onClick={() => toggleCategory('calisthenics')}
            className="w-full flex items-center justify-between text-left cursor-pointer min-h-[44px]"
          >
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Flame className="w-4 h-4" />
              </span>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-white">3. Calisthenics & Muscular Endurance</h3>
                <p className="text-[11px] text-slate-400">Strict pull-ups & ACSM push-up norms</p>
              </div>
            </div>
            {expandedCategories.calisthenics ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {expandedCategories.calisthenics && (
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-slate-200">Strict Dead-Hang Pull-Ups</div>
                  <div className="text-xl font-mono font-bold text-white mt-0.5">
                    {activeRecord.scores.strictPullupsReps || 0} reps
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{pullupsEval.description}</div>
                </div>
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${pullupsEval.badgeClass}`}>
                  {pullupsEval.tier} · {pullupsEval.percentileRank}
                </span>
              </div>

              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-slate-200">Push-Ups to Muscular Failure (ACSM 30–39)</div>
                  <div className="text-xl font-mono font-bold text-white mt-0.5">
                    {activeRecord.scores.pushupsReps || 0} reps
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{pushupsEval.description}</div>
                </div>
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${pushupsEval.badgeClass}`}>
                  {pushupsEval.tier}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* DOMAIN 4: Dr. Stuart McGill Core Endurance & Spinal Balance Ratios */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3.5 sm:p-4 shadow-lg space-y-3">
          <button
            type="button"
            onClick={() => toggleCategory('mcgill')}
            className="w-full flex items-center justify-between text-left cursor-pointer min-h-[44px]"
          >
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <ShieldCheck className="w-4 h-4" />
              </span>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-white">4. Dr. Stuart McGill Core Balance Ratios</h3>
                <p className="text-[11px] text-slate-400">Clinical endurance times & injury prevention invariants</p>
              </div>
            </div>
            {expandedCategories.mcgill ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {expandedCategories.mcgill && (
            <div className="space-y-3 pt-2 border-t border-slate-800">
              {/* Raw hold cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 text-center">
                  <span className="text-slate-400 text-[10px]">Biering-Sørensen (Ext)</span>
                  <div className="text-base font-mono font-bold text-white mt-0.5">{activeRecord.scores.mcgillExtensionSec || 0}s</div>
                  <span className="text-[10px] text-slate-400">Target ≥ 160s</span>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 text-center">
                  <span className="text-slate-400 text-[10px]">60° Trunk Flexion</span>
                  <div className="text-base font-mono font-bold text-white mt-0.5">{activeRecord.scores.mcgillFlexionSec || 0}s</div>
                  <span className="text-[10px] text-slate-400">Norm ~140s</span>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 text-center">
                  <span className="text-slate-400 text-[10px]">Right Side Bridge</span>
                  <div className="text-base font-mono font-bold text-white mt-0.5">{activeRecord.scores.mcgillSideBridgeRightSec || 0}s</div>
                  <span className="text-[10px] text-slate-400">Norm ~85s</span>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 text-center">
                  <span className="text-slate-400 text-[10px]">Left Side Bridge</span>
                  <div className="text-base font-mono font-bold text-white mt-0.5">{activeRecord.scores.mcgillSideBridgeLeftSec || 0}s</div>
                  <span className="text-[10px] text-slate-400">Norm ~85s</span>
                </div>
              </div>

              {/* Live McGill Ratios Bar */}
              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-2">
                <div className="text-xs font-bold text-slate-200">McGill Clinical Ratios Analysis:</div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300">Flexion / Extension:</span>
                  <span className="font-mono font-bold">
                    {mcgillAnalysis.flexionToExtensionRatio}{' '}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${mcgillAnalysis.flexionToExtensionStatus === 'optimal' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                      {mcgillAnalysis.flexionToExtensionStatus === 'optimal' ? 'Pass (< 1.0)' : 'High (> 1.0)'}
                    </span>
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300">Side Bridge / Extension:</span>
                  <span className="font-mono font-bold">
                    {mcgillAnalysis.sideBridgeToExtensionRatio}{' '}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${mcgillAnalysis.sideBridgeToExtensionStatus === 'optimal' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                      {mcgillAnalysis.sideBridgeToExtensionStatus === 'optimal' ? 'Pass (< 0.75)' : 'High (> 0.75)'}
                    </span>
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300">Right vs. Left Symmetry:</span>
                  <span className="font-mono font-bold">
                    {mcgillAnalysis.sideBridgeSymmetryRatio}{' '}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${mcgillAnalysis.sideBridgeSymmetryStatus === 'optimal' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                      {mcgillAnalysis.sideBridgeSymmetryStatus === 'optimal' ? 'Symmetrical (0.95–1.05)' : 'Asymmetry Detected'}
                    </span>
                  </span>
                </div>

                {mcgillAnalysis.clinicalFeedback.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-800 text-[11px] text-amber-300/90 space-y-1">
                    {mcgillAnalysis.clinicalFeedback.map((fb, idx) => (
                      <div key={idx} className="flex items-start gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
                        <span>{fb}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* DOMAIN 5: Functional Longevity & Grip */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3.5 sm:p-4 shadow-lg space-y-3">
          <button
            type="button"
            onClick={() => toggleCategory('longevity')}
            className="w-full flex items-center justify-between text-left cursor-pointer min-h-[44px]"
          >
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                <Clock className="w-4 h-4" />
              </span>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-white">5. Longevity Biomarkers & Grip</h3>
                <p className="text-[11px] text-slate-400">Dr. Peter Attia 2-minute dead hang & suitcase carry</p>
              </div>
            </div>
            {expandedCategories.longevity ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {expandedCategories.longevity && (
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-slate-200">Bodyweight Two-Arm Dead Hang</div>
                  <div className="text-xl font-mono font-bold text-white mt-0.5">
                    {activeRecord.scores.deadHangSec || 0} seconds
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{deadHangEval.description}</div>
                </div>
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${deadHangEval.badgeClass}`}>
                  {deadHangEval.tier}
                </span>
              </div>

              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-slate-200">Single-Arm 40 lb Suitcase Carry</div>
                  <div className="text-xl font-mono font-bold text-white mt-0.5">
                    {activeRecord.scores.suitcaseCarrySec || 0} seconds / side
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Anti-lateral flexion endurance (Quadratus Lumborum)</div>
                </div>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full border bg-emerald-950/60 border-emerald-500 text-emerald-300">
                  Target ≥ 60s
                </span>
              </div>
            </div>
          )}
        </div>

        {/* DOMAIN 6: Loaded Joint Mobility & End-Range */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3.5 sm:p-4 shadow-lg space-y-3">
          <button
            type="button"
            onClick={() => toggleCategory('mobility')}
            className="w-full flex items-center justify-between text-left cursor-pointer min-h-[44px]"
          >
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Activity className="w-4 h-4" />
              </span>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-white">6. Loaded Mobility & Range of Strength</h3>
                <p className="text-[11px] text-slate-400">Lucas Hardie, ATG, & Squat U joint metrics</p>
              </div>
            </div>
            {expandedCategories.mobility ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {expandedCategories.mobility && (
            <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-800 text-xs">
              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                <div className="text-slate-400 text-[10px]">Ankle Knee-to-Wall</div>
                <div className="text-base font-mono font-bold text-white mt-0.5">{activeRecord.scores.kneeToWallInches || 0} inches</div>
                <div className="text-[10px] text-emerald-400">Optimal ≥ 5.0 in</div>
              </div>

              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                <div className="text-slate-400 text-[10px]">Jefferson Curl Deficit</div>
                <div className="text-base font-mono font-bold text-white mt-0.5">{activeRecord.scores.jeffersonCurlDeficitInches || 0} in past toes</div>
                <div className="text-[10px] text-emerald-400">Target ≥ 2.0 in</div>
              </div>

              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                <div className="text-slate-400 text-[10px]">Flat-Ground ATG Split Squat</div>
                <div className="text-base font-mono font-bold text-white mt-0.5">{activeRecord.scores.atgSplitSquatWeightLbs || 0} lbs load</div>
                <div className="text-[10px] text-cyan-400">Goal: 84 lbs (50% BW)</div>
              </div>

              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                <div className="text-slate-400 text-[10px]">Pancake Split Depth</div>
                <div className="text-base font-mono font-bold text-white mt-0.5">{activeRecord.scores.pancakeSplitInches || 0} in to floor</div>
                <div className="text-[10px] text-slate-400">Goal: ≤ 2.0 in (Flat Torso)</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Modal / Slide-Over: Edit Assessment Scores */}
      {isEditing && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base sm:text-lg text-white">
                  Log Assessment: {editFormData.quarterLabel}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                aria-label="Close editor"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* General Meta */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="input-quarter-label" className="text-xs text-slate-400 block mb-1">Quarter Label</label>
                <input
                  id="input-quarter-label"
                  type="text"
                  value={editFormData.quarterLabel}
                  onChange={(e) => setEditFormData({ ...editFormData, quarterLabel: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label htmlFor="input-date" className="text-xs text-slate-400 block mb-1">Date</label>
                <input
                  id="input-date"
                  type="date"
                  value={editFormData.date}
                  onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label htmlFor="input-bodyweight" className="text-xs text-slate-400 block mb-1">Bodyweight (lbs)</label>
                <input
                  id="input-bodyweight"
                  type="number"
                  value={editFormData.bodyweightLbs}
                  onChange={(e) => setEditFormData({ ...editFormData, bodyweightLbs: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Score Inputs by Category */}
            <div className="space-y-4 pt-2">
              {/* Category 1: Aerobic */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-2">1. Cardiorespiratory</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <label htmlFor="input-row2k" className="text-slate-400 block mb-1">2k Row (Seconds)</label>
                    <input
                      id="input-row2k"
                      type="number"
                      placeholder="e.g. 435"
                      value={editFormData.scores.row2kSeconds ?? ''}
                      onChange={(e) => handleScoreChange('row2kSeconds', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="input-cooper" className="text-slate-400 block mb-1">Cooper 12-Min (Miles)</label>
                    <input
                      id="input-cooper"
                      type="number"
                      step="0.01"
                      placeholder="e.g. 1.55"
                      value={editFormData.scores.cooperRunMiles ?? ''}
                      onChange={(e) => handleScoreChange('cooperRunMiles', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="input-resting-hr" className="text-slate-400 block mb-1">Resting HR (bpm)</label>
                    <input
                      id="input-resting-hr"
                      type="number"
                      placeholder="e.g. 58"
                      value={editFormData.scores.restingHeartRateBpm ?? ''}
                      onChange={(e) => handleScoreChange('restingHeartRateBpm', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="input-hrr-drop" className="text-slate-400 block mb-1">1-Min HR Drop (bpm)</label>
                    <input
                      id="input-hrr-drop"
                      type="number"
                      placeholder="e.g. 28"
                      value={editFormData.scores.hrr1minDropBpm ?? ''}
                      onChange={(e) => handleScoreChange('hrr1minDropBpm', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Category 2: Strength 1RMs */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400">2. Compound Strength 1RMs (lbs)</h4>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <span>1RM Tool:</span>
                    <input
                      type="number"
                      aria-label="Calculator weight in lbs"
                      value={calcWeight}
                      onChange={(e) => setCalcWeight(Number(e.target.value))}
                      className="w-14 bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-white text-center"
                    />
                    <span>lbs x</span>
                    <input
                      type="number"
                      aria-label="Calculator completed reps"
                      value={calcReps}
                      onChange={(e) => setCalcReps(Number(e.target.value))}
                      className="w-10 bg-slate-950 border border-slate-800 rounded px-1 py-0.5 text-white text-center"
                    />
                    <span>reps =</span>
                    <span className="font-bold text-emerald-400">{estimated1RM} lbs</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <label htmlFor="input-deadlift" className="text-slate-400 block mb-1">Deadlift 1RM</label>
                    <input
                      id="input-deadlift"
                      type="number"
                      value={editFormData.scores.deadlift1rmLbs ?? ''}
                      onChange={(e) => handleScoreChange('deadlift1rmLbs', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="input-squat" className="text-slate-400 block mb-1">Back Squat 1RM</label>
                    <input
                      id="input-squat"
                      type="number"
                      value={editFormData.scores.squat1rmLbs ?? ''}
                      onChange={(e) => handleScoreChange('squat1rmLbs', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="input-bench" className="text-slate-400 block mb-1">Bench Press 1RM</label>
                    <input
                      id="input-bench"
                      type="number"
                      value={editFormData.scores.bench1rmLbs ?? ''}
                      onChange={(e) => handleScoreChange('bench1rmLbs', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="input-ohp" className="text-slate-400 block mb-1">Overhead Press 1RM</label>
                    <input
                      id="input-ohp"
                      type="number"
                      value={editFormData.scores.ohp1rmLbs ?? ''}
                      onChange={(e) => handleScoreChange('ohp1rmLbs', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Category 3: Calisthenics */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2">3. Calisthenics</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label htmlFor="input-pullups" className="text-slate-400 block mb-1">Strict Pull-Ups (Max Reps)</label>
                    <input
                      id="input-pullups"
                      type="number"
                      value={editFormData.scores.strictPullupsReps ?? ''}
                      onChange={(e) => handleScoreChange('strictPullupsReps', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="input-pushups" className="text-slate-400 block mb-1">Push-Ups to Failure (Reps)</label>
                    <input
                      id="input-pushups"
                      type="number"
                      value={editFormData.scores.pushupsReps ?? ''}
                      onChange={(e) => handleScoreChange('pushupsReps', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Category 4: McGill Core Holds */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2">4. McGill Core Endurance (Seconds)</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <label htmlFor="input-mcgill-ext" className="text-slate-400 block mb-1">Extension Hold</label>
                    <input
                      id="input-mcgill-ext"
                      type="number"
                      value={editFormData.scores.mcgillExtensionSec ?? ''}
                      onChange={(e) => handleScoreChange('mcgillExtensionSec', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="input-mcgill-flex" className="text-slate-400 block mb-1">60° Flexion Hold</label>
                    <input
                      id="input-mcgill-flex"
                      type="number"
                      value={editFormData.scores.mcgillFlexionSec ?? ''}
                      onChange={(e) => handleScoreChange('mcgillFlexionSec', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="input-mcgill-side-r" className="text-slate-400 block mb-1">Right Side Bridge</label>
                    <input
                      id="input-mcgill-side-r"
                      type="number"
                      value={editFormData.scores.mcgillSideBridgeRightSec ?? ''}
                      onChange={(e) => handleScoreChange('mcgillSideBridgeRightSec', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="input-mcgill-side-l" className="text-slate-400 block mb-1">Left Side Bridge</label>
                    <input
                      id="input-mcgill-side-l"
                      type="number"
                      value={editFormData.scores.mcgillSideBridgeLeftSec ?? ''}
                      onChange={(e) => handleScoreChange('mcgillSideBridgeLeftSec', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Category 5 & 6: Grip & Mobility */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-2">5 & 6. Longevity Grip & Loaded Mobility</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <label htmlFor="input-deadhang" className="text-slate-400 block mb-1">Dead Hang (Sec)</label>
                    <input
                      id="input-deadhang"
                      type="number"
                      value={editFormData.scores.deadHangSec ?? ''}
                      onChange={(e) => handleScoreChange('deadHangSec', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="input-suitcase" className="text-slate-400 block mb-1">Suitcase Carry (Sec)</label>
                    <input
                      id="input-suitcase"
                      type="number"
                      value={editFormData.scores.suitcaseCarrySec ?? ''}
                      onChange={(e) => handleScoreChange('suitcaseCarrySec', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="input-kneewall" className="text-slate-400 block mb-1">Knee-to-Wall (In)</label>
                    <input
                      id="input-kneewall"
                      type="number"
                      step="0.1"
                      value={editFormData.scores.kneeToWallInches ?? ''}
                      onChange={(e) => handleScoreChange('kneeToWallInches', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="input-jcurl" className="text-slate-400 block mb-1">J-Curl Deficit (In)</label>
                    <input
                      id="input-jcurl"
                      type="number"
                      step="0.5"
                      value={editFormData.scores.jeffersonCurlDeficitInches ?? ''}
                      onChange={(e) => handleScoreChange('jeffersonCurlDeficitInches', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label htmlFor="input-notes" className="text-xs text-slate-400 block mb-1">Quarterly Testing Notes</label>
                <textarea
                  id="input-notes"
                  rows={2}
                  value={editFormData.notes || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  placeholder="Subjective feeling, knee tendinitis status, grip fatigue, etc."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Modal actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAssessment}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold cursor-pointer shadow-md"
              >
                Save Assessment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
