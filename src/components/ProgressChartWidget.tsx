// src/components/ProgressChartWidget.tsx
import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Dumbbell,
  Activity,
  Zap,
  Target,
  ChevronRight,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import {
  TimeHorizon,
  TIME_HORIZONS,
  generateProgramProjections,
  LiftProjection,
  MobilityProjection,
} from '../domain/progressForecaster';
import { SetLogRecord } from './ExerciseCard';
import { MobilityEntry } from '../domain/mobility';
import { WorkoutExercise } from '../domain/programData';

export interface ProgressChartWidgetProps {
  workoutLogs: Record<string, SetLogRecord[]>;
  mobilityHistory: MobilityEntry[];
  programAdaptations?: Record<string, Partial<WorkoutExercise>>;
}

export const ProgressChartWidget: React.FC<ProgressChartWidgetProps> = ({
  workoutLogs,
  mobilityHistory,
  programAdaptations = {},
}) => {
  // 1. Controls State
  const [selectedCategory, setSelectedCategory] = useState<'strength' | 'mobility'>('strength');
  const [selectedHorizon, setSelectedHorizon] = useState<TimeHorizon>('3m');
  const [selectedLiftId, setSelectedLiftId] = useState<string>('t1_bb_squat');
  const [selectedMobilityId, setSelectedMobilityId] = useState<string>('knee-to-wall');
  const [isSummaryCollapsed, setIsSummaryCollapsed] = useState<boolean>(false);
  const [isChartCollapsed, setIsChartCollapsed] = useState<boolean>(false);
  const [isMatrixCollapsed, setIsMatrixCollapsed] = useState<boolean>(false);

  // 2. Generate Projections Data
  const report = useMemo(() => {
    return generateProgramProjections(
      workoutLogs,
      undefined,
      mobilityHistory,
      selectedHorizon,
      programAdaptations
    );
  }, [workoutLogs, mobilityHistory, selectedHorizon, programAdaptations]);

  const activeLift = useMemo(() => {
    return report.lifts.find((l) => l.exerciseId === selectedLiftId) || report.lifts[0];
  }, [report.lifts, selectedLiftId]);

  const activeMobility = useMemo(() => {
    return report.mobility.find((m) => m.testId === selectedMobilityId) || report.mobility[0];
  }, [report.mobility, selectedMobilityId]);

  // Current active data item for the main chart
  const activeItem = selectedCategory === 'strength' ? activeLift : activeMobility;
  const isStrength = selectedCategory === 'strength';
  const unitLabel = isStrength ? 'lbs' : activeMobility.unit;

  // 3. SVG Chart Math & Coordinates
  const chartPoints = useMemo(() => {
    const points = activeItem.trajectoryPoints;
    const values = points.map((p) => p.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal || 1;

    // SVG Canvas layout: 600 x 220, padding: x=50, y=30
    const width = 600;
    const height = 220;
    const padX = 55;
    const padY = 35;
    const plotW = width - padX * 2;
    const plotH = height - padY * 2;

    const coords = points.map((p, idx) => {
      const x = padX + (idx / (points.length - 1)) * plotW;
      // Invert Y for SVG coordinates
      const y = height - padY - ((p.value - minVal) / range) * plotH;
      return { ...p, x, y };
    });

    const pathD = coords.reduce((acc, pt, idx) => {
      return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
    }, '');

    // Area under the curve
    const areaD = coords.length > 0
      ? `${pathD} L ${coords[coords.length - 1].x} ${height - padY} L ${coords[0].x} ${height - padY} Z`
      : '';

    return { coords, pathD, areaD, minVal, maxVal, width, height, padX, padY };
  }, [activeItem]);

  return (
    <div className="w-full max-w-5xl mx-auto px-2 sm:px-4 py-4 space-y-5 animate-in fade-in duration-300 overflow-x-hidden min-w-0">
      {/* Top Banner / Executive Summary */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => setIsSummaryCollapsed((prev) => !prev)}
              className="flex items-center gap-2 text-left cursor-pointer group"
            >
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white group-hover:text-emerald-300 transition-colors tracking-tight">
                Progress Chart & Projected Trajectories
              </h2>
            </button>
            {!isSummaryCollapsed && (
              <p className="text-xs sm:text-sm text-slate-400">
                Biomechanical forecasting across 1 month, 3 months, 6 months, and 1 year horizons.
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Time Horizon Selector Buttons */}
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 self-start md:self-auto flex-wrap">
              {TIME_HORIZONS.map((h) => {
                const isActive = selectedHorizon === h.id;
                return (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => setSelectedHorizon(h.id)}
                    aria-pressed={isActive}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    {h.label}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setIsSummaryCollapsed((prev) => !prev)}
              aria-expanded={!isSummaryCollapsed}
              aria-label={isSummaryCollapsed ? 'Expand progress summary' : 'Collapse progress summary'}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80 text-xs font-medium cursor-pointer transition-colors"
            >
              <span>{isSummaryCollapsed ? 'Expand' : 'Collapse'}</span>
              {isSummaryCollapsed ? (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>
          </div>
        </div>

        {/* Phase Rationale Pill */}
        {!isSummaryCollapsed && (
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2 text-emerald-300 font-mono">
              <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>Target Horizon ({selectedHorizon.toUpperCase()}):</strong>{' '}
                {report.overallSummary.trainingPhaseDescription}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              Total Projected Lift Gain:{' '}
              <strong className="text-white">+{report.overallSummary.totalProjectedStrengthGainLbs} lbs</strong>
            </span>
          </div>
        )}
      </div>

      {/* Main Interactive Chart & Drilldown Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
        {/* Category & Metric Pickers */}
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isChartCollapsed ? '' : 'border-b border-slate-800/80 pb-4'}`}>
          <div className="flex items-center justify-between gap-2 w-full sm:w-auto">
            {/* Strength vs Mobility Tab Switcher */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1 flex-1 sm:flex-initial">
              <button
                type="button"
                onClick={() => setSelectedCategory('strength')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedCategory === 'strength'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Dumbbell className="w-3.5 h-3.5" />
                <span>Strength Lifts</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedCategory('mobility')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedCategory === 'mobility'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Mobility Protocols</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsChartCollapsed((prev) => !prev)}
              aria-expanded={!isChartCollapsed}
              aria-label={isChartCollapsed ? 'Expand trajectory chart' : 'Collapse trajectory chart'}
              className="sm:hidden flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80 text-xs font-medium cursor-pointer transition-colors shrink-0"
            >
              <span>{isChartCollapsed ? 'Expand' : 'Collapse'}</span>
              {isChartCollapsed ? (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>
          </div>

          <div className="flex items-center gap-2 overflow-hidden">
            {/* Metric Sub-selector Pills */}
            {!isChartCollapsed && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                {isStrength
                  ? report.lifts.map((l) => (
                      <button
                        key={l.exerciseId}
                        type="button"
                        onClick={() => setSelectedLiftId(l.exerciseId)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer border ${
                          selectedLiftId === l.exerciseId
                            ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300 font-semibold shadow-sm'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                        }`}
                      >
                        {l.exerciseName}
                      </button>
                    ))
                  : report.mobility.map((m) => (
                      <button
                        key={m.testId}
                        type="button"
                        onClick={() => setSelectedMobilityId(m.testId)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer border ${
                          selectedMobilityId === m.testId
                            ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300 font-semibold shadow-sm'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                        }`}
                      >
                        {m.name}
                      </button>
                    ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsChartCollapsed((prev) => !prev)}
              aria-expanded={!isChartCollapsed}
              aria-label={isChartCollapsed ? 'Expand trajectory chart' : 'Collapse trajectory chart'}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80 text-xs font-medium cursor-pointer transition-colors shrink-0"
            >
              <span>{isChartCollapsed ? 'Expand' : 'Collapse'}</span>
              {isChartCollapsed ? (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>
          </div>
        </div>

        {!isChartCollapsed && (
          <>
            {/* Selected Metric Header Details */}
            <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  {isStrength ? (activeItem as LiftProjection).exerciseName : (activeItem as MobilityProjection).name}
                  <span className="text-xs font-normal text-slate-400">
                    {isStrength ? `(${(activeItem as LiftProjection).tier} · ${(activeItem as LiftProjection).equipment})` : `(${(activeItem as MobilityProjection).creator})`}
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  {isStrength
                    ? (activeItem as LiftProjection).biomechanicalInsight
                    : (activeItem as MobilityProjection).clinicalGuidance}
                </p>
              </div>

              <div className="flex items-center gap-3 font-mono text-right">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Current Baseline</span>
                  <span className="text-base font-bold text-slate-200">
                    {isStrength
                      ? `${(activeItem as LiftProjection).currentWeightLbs} lbs`
                      : `${(activeItem as MobilityProjection).currentValue} ${unitLabel}`}
                  </span>
                </div>

                <ChevronRight className="w-4 h-4 text-slate-600 hidden xs:block" />

                <div>
                  <span className="text-[10px] text-emerald-400 block uppercase font-bold">
                    Projected ({selectedHorizon.toUpperCase()})
                  </span>
                  <span className="text-base sm:text-lg font-bold text-emerald-400">
                    {isStrength
                      ? `${(activeItem as LiftProjection).projectedWeightLbs[selectedHorizon]} lbs`
                      : `${(activeItem as MobilityProjection).projectedValues[selectedHorizon]} ${unitLabel}`}
                  </span>
                </div>
              </div>
            </div>

            {/* The Visual SVG Trajectory Chart */}
            <div className="relative w-full bg-slate-950/80 border border-slate-800 rounded-xl p-2 sm:p-4 overflow-hidden">
              <svg
                viewBox={`0 0 ${chartPoints.width} ${chartPoints.height}`}
                className="w-full h-48 sm:h-60 overflow-visible"
                aria-label={`Progress Trajectory Chart for ${isStrength ? (activeItem as LiftProjection).exerciseName : (activeItem as MobilityProjection).name}`}
              >
                <defs>
                  <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Grid Lines */}
                {[0.25, 0.5, 0.75, 1.0].map((ratio) => {
                  const y = chartPoints.height - chartPoints.padY - ratio * (chartPoints.height - chartPoints.padY * 2);
                  return (
                    <line
                      key={ratio}
                      x1={chartPoints.padX}
                      y1={y}
                      x2={chartPoints.width - chartPoints.padX}
                      y2={y}
                      stroke="#1e293b"
                      strokeDasharray="4 4"
                      strokeWidth="1"
                    />
                  );
                })}

                {/* Area fill */}
                <path d={chartPoints.areaD} fill="url(#chartGlow)" />

                {/* Trajectory Path Line */}
                <path
                  d={chartPoints.pathD}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="3"
                  strokeDasharray="4 3"
                  className="drop-shadow-sm"
                />

                {/* Data Points */}
                {chartPoints.coords.map((pt) => {
                  const isSelected = pt.label.toLowerCase() === selectedHorizon;
                  return (
                    <g key={pt.label}>
                      {/* Outer Pulsing Ring for Selected Horizon */}
                      {isSelected && (
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r="9"
                          fill="none"
                          stroke="#34d399"
                          strokeWidth="2"
                          className="animate-ping opacity-60 origin-center"
                        />
                      )}

                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isSelected ? 6 : 4.5}
                        fill={pt.isProjected ? '#10b981' : '#f8fafc'}
                        stroke="#022c22"
                        strokeWidth="2"
                        className="transition-all hover:scale-125 cursor-pointer"
                      />

                      {/* Value Badge above Point */}
                      <text
                        x={pt.x}
                        y={pt.y - 10}
                        textAnchor="middle"
                        className="text-[10px] sm:text-[11px] font-mono font-bold fill-emerald-300 drop-shadow"
                      >
                        {pt.value}
                        <tspan className="text-[8px] fill-slate-400 font-normal"> {unitLabel}</tspan>
                      </text>

                      {/* X-axis Label below point */}
                      <text
                        x={pt.x}
                        y={chartPoints.height - 10}
                        textAnchor="middle"
                        className={`text-[10px] sm:text-xs font-mono ${
                          isSelected ? 'font-bold fill-emerald-400' : 'fill-slate-400'
                        }`}
                      >
                        {pt.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Milestone Cards for Selected Metric across All 4 Horizons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono pt-1">
              {activeItem.milestones.map((m) => {
                const isHighlight = m.horizon === selectedHorizon;
                return (
                  <div
                    key={m.horizon}
                    className={`p-3 rounded-xl border transition-all ${
                      isHighlight
                        ? 'bg-emerald-950/40 border-emerald-500/50 shadow-md ring-1 ring-emerald-500/30'
                        : 'bg-slate-950/50 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] uppercase text-slate-400 mb-1">
                      <span>{m.horizon.toUpperCase()} Goal</span>
                      {isHighlight && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500 text-slate-950 font-bold">
                          Active
                        </span>
                      )}
                    </div>

                    <div className="text-base sm:text-lg font-bold text-white mb-0.5">
                      {m.targetValue}{' '}
                      <span className="text-xs text-slate-400 font-normal">{unitLabel}</span>
                    </div>

                    <div className="text-[11px] text-slate-400 font-sans leading-tight">
                      {m.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Complete Projections Comparison Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsMatrixCollapsed((prev) => !prev)}
            className="text-sm sm:text-base font-bold text-white hover:text-emerald-300 transition-colors flex items-center gap-2 cursor-pointer text-left"
          >
            <Target className="w-4 h-4 text-emerald-400" />
            <span>Complete {isStrength ? 'Strength' : 'Mobility'} Forecast Matrix</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono hidden sm:inline">
              {TIME_HORIZONS.find((h) => h.id === selectedHorizon)?.description}
            </span>
            <button
              type="button"
              onClick={() => setIsMatrixCollapsed((prev) => !prev)}
              aria-expanded={!isMatrixCollapsed}
              aria-label={isMatrixCollapsed ? 'Expand forecast matrix' : 'Collapse forecast matrix'}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80 text-xs font-medium cursor-pointer transition-colors"
            >
              <span>{isMatrixCollapsed ? 'Expand' : 'Collapse'}</span>
              {isMatrixCollapsed ? (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>
          </div>
        </div>

        {!isMatrixCollapsed && (
          <div className="w-full max-w-full overflow-x-auto no-scrollbar rounded-xl border border-slate-800/60">
            <table className="w-full text-left text-xs font-mono border-collapse min-w-[500px]">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-3">Metric / Protocol</th>
                  <th className="py-2.5 px-3 text-center">Baseline</th>
                  <th className="py-2.5 px-3 text-center">1 Month</th>
                  <th className="py-2.5 px-3 text-center">3 Months</th>
                  <th className="py-2.5 px-3 text-center">6 Months</th>
                  <th className="py-2.5 px-3 text-center text-emerald-400 font-bold">1 Year</th>
                  <th className="py-2.5 px-3 text-right">Net Projected Delta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {isStrength
                  ? report.lifts.map((l) => {
                      const isSelected = l.exerciseId === selectedLiftId;
                      return (
                        <tr
                          key={l.exerciseId}
                          onClick={() => setSelectedLiftId(l.exerciseId)}
                          className={`transition-colors cursor-pointer ${
                            isSelected ? 'bg-emerald-950/30' : 'hover:bg-slate-800/40'
                          }`}
                        >
                          <td className="py-2.5 px-3 font-medium text-slate-200">
                            <div className="font-bold">{l.exerciseName}</div>
                            <div className="text-[10px] text-slate-400">{l.tier} · {l.equipment}</div>
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-400 font-bold">
                            {l.currentWeightLbs} lbs
                          </td>
                          <td className={`py-2.5 px-3 text-center ${selectedHorizon === '1m' ? 'text-emerald-400 font-bold' : 'text-slate-300'}`}>
                            {l.projectedWeightLbs['1m']} lbs
                          </td>
                          <td className={`py-2.5 px-3 text-center ${selectedHorizon === '3m' ? 'text-emerald-400 font-bold' : 'text-slate-300'}`}>
                            {l.projectedWeightLbs['3m']} lbs
                          </td>
                          <td className={`py-2.5 px-3 text-center ${selectedHorizon === '6m' ? 'text-emerald-400 font-bold' : 'text-slate-300'}`}>
                            {l.projectedWeightLbs['6m']} lbs
                          </td>
                          <td className={`py-2.5 px-3 text-center font-bold ${selectedHorizon === '1y' ? 'text-emerald-400' : 'text-emerald-300'}`}>
                            {l.projectedWeightLbs['1y']} lbs
                          </td>
                          <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">
                            +{l.projectedGainLbs[selectedHorizon]} lbs
                          </td>
                        </tr>
                      );
                    })
                  : report.mobility.map((m) => {
                      const isSelected = m.testId === selectedMobilityId;
                      return (
                        <tr
                          key={m.testId}
                          onClick={() => setSelectedMobilityId(m.testId)}
                          className={`transition-colors cursor-pointer ${
                            isSelected ? 'bg-emerald-950/30' : 'hover:bg-slate-800/40'
                          }`}
                        >
                          <td className="py-2.5 px-3 font-medium text-slate-200">
                            <div className="font-bold">{m.name}</div>
                            <div className="text-[10px] text-slate-400">{m.creator} · Goal: {m.benchmarkGoal}</div>
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-400 font-bold">
                            {m.currentValue} {m.unit}
                          </td>
                          <td className={`py-2.5 px-3 text-center ${selectedHorizon === '1m' ? 'text-emerald-400 font-bold' : 'text-slate-300'}`}>
                            {m.projectedValues['1m']} {m.unit}
                          </td>
                          <td className={`py-2.5 px-3 text-center ${selectedHorizon === '3m' ? 'text-emerald-400 font-bold' : 'text-slate-300'}`}>
                            {m.projectedValues['3m']} {m.unit}
                          </td>
                          <td className={`py-2.5 px-3 text-center ${selectedHorizon === '6m' ? 'text-emerald-400 font-bold' : 'text-slate-300'}`}>
                            {m.projectedValues['6m']} {m.unit}
                          </td>
                          <td className={`py-2.5 px-3 text-center font-bold ${selectedHorizon === '1y' ? 'text-emerald-400' : 'text-emerald-300'}`}>
                            {m.projectedValues['1y']} {m.unit}
                          </td>
                          <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">
                            {m.projectedDelta[selectedHorizon] > 0 ? `+${m.projectedDelta[selectedHorizon]}` : m.projectedDelta[selectedHorizon]} {m.unit}
                          </td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

