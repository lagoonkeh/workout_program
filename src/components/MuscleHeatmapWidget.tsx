// src/components/MuscleHeatmapWidget.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { Activity, Info } from 'lucide-react';
import {
  type RecoveryStatus,
  calculateMuscleHeatmap,
  calculatePatternBalance,
} from '../domain/muscleHeatmap';
import { CompletedWorkoutSession } from '../storage/storageManager';
import { HEALTH_UPDATED_EVENT, loadCachedWorkouts, type HealthWorkout } from '../domain/healthWorkouts';
import { SetLogRecord } from './ExerciseCard';

export interface MuscleHeatmapWidgetProps {
  history?: CompletedWorkoutSession[];
  activeLogs?: Record<string, SetLogRecord[]>;
  className?: string;
}

export const MuscleHeatmapWidget: React.FC<MuscleHeatmapWidgetProps> = ({
  history = [],
  activeLogs = {},
  className = '',
}) => {
  const [activeView, setActiveView] = useState<'both' | 'front' | 'back'>('both');
  const [selectedMuscleId, setSelectedMuscleId] = useState<string>('chest');

  // Workouts from Health Connect (cached by the readiness check-in's refresh)
  const [outsideWorkouts, setOutsideWorkouts] = useState<HealthWorkout[]>(() => loadCachedWorkouts());
  useEffect(() => {
    const onUpdate = () => setOutsideWorkouts(loadCachedWorkouts());
    window.addEventListener(HEALTH_UPDATED_EVENT, onUpdate);
    return () => window.removeEventListener(HEALTH_UPDATED_EVENT, onUpdate);
  }, []);

  const heatmap = useMemo(() => {
    return calculateMuscleHeatmap(history, activeLogs, new Date(), outsideWorkouts);
  }, [history, activeLogs, outsideWorkouts]);

  const balance = useMemo(() => calculatePatternBalance(history, activeLogs, new Date()), [history, activeLogs]);

  const selectedMuscle = heatmap[selectedMuscleId] || heatmap['chest'] || Object.values(heatmap)[0];

  const summaryCounts = useMemo(() => {
    let fresh = 0;
    let recovering = 0;
    let fatigued = 0;
    Object.values(heatmap).forEach((m) => {
      if (m.status === 'fresh') fresh++;
      else if (m.status === 'recovering') recovering++;
      else if (m.status === 'fatigued') fatigued++;
    });
    return { fresh, recovering, fatigued };
  }, [heatmap]);

  const getStatusColor = (status: RecoveryStatus) => {
    switch (status) {
      case 'fresh':
        return {
          fill: '#10b981', // emerald-500
          fillOpacity: 0.85,
          stroke: '#34d399',
          glow: 'rgba(16, 185, 129, 0.4)',
          badgeBg: 'bg-emerald-500/15',
          badgeText: 'text-emerald-300',
          badgeBorder: 'border-emerald-500/40',
          dot: 'bg-emerald-400',
          label: 'Fresh & Ready',
        };
      case 'recovering':
        return {
          fill: '#f59e0b', // amber-500
          fillOpacity: 0.85,
          stroke: '#fbbf24',
          glow: 'rgba(245, 158, 11, 0.4)',
          badgeBg: 'bg-amber-500/15',
          badgeText: 'text-amber-300',
          badgeBorder: 'border-amber-500/40',
          dot: 'bg-amber-400',
          label: 'Recovering (24–48h)',
        };
      case 'fatigued':
        return {
          fill: '#ef4444', // rose-500
          fillOpacity: 0.90,
          stroke: '#f87171',
          glow: 'rgba(239, 68, 68, 0.45)',
          badgeBg: 'bg-rose-500/15',
          badgeText: 'text-rose-300',
          badgeBorder: 'border-rose-500/40',
          dot: 'bg-rose-400 animate-pulse',
          label: 'Fatigued (<24h / High Vol)',
        };
    }
  };

  const getMuscleFill = (id: string) => {
    const m = heatmap[id];
    if (!m) return '#334155';
    const cfg = getStatusColor(m.status);
    return cfg.fill;
  };

  const isMuscleSelected = (id: string) => selectedMuscleId === id;

  return (
    <div
      data-testid="muscle-fatigue-heatmap-widget"
      className={`rounded-2xl bg-slate-900 border border-slate-800 p-3.5 sm:p-5 shadow-xl flex flex-col gap-4 ${className}`}
    >
      {/* Header & Status Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Activity className="w-4 h-4" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              Anatomical Muscle Fatigue & Recovery Heatmap
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Dynamic recovery state modeled from set volume, fatigue accumulation, and elapsed rest.
          </p>
        </div>

        {/* 3 Summary Pills */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>{summaryCounts.fresh} Fresh</span>
          </div>
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-semibold">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>{summaryCounts.recovering} Recovering</span>
          </div>
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono font-semibold">
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
            <span>{summaryCounts.fatigued} Fatigued</span>
          </div>
        </div>
      </div>

      {/* View Toggle Bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="inline-flex rounded-xl bg-slate-950/80 p-1 border border-slate-800">
          <button
            type="button"
            data-testid="heatmap-view-both"
            onClick={() => setActiveView('both')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeView === 'both'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Front & Back
          </button>
          <button
            type="button"
            data-testid="heatmap-view-front"
            onClick={() => setActiveView('front')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeView === 'front'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Front Only
          </button>
          <button
            type="button"
            data-testid="heatmap-view-back"
            onClick={() => setActiveView('back')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeView === 'back'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Back Only
          </button>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>🟢 Fresh (48h+)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>🟡 Recovering (24–48h)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span>🔴 Fatigued (&lt;24h)</span>
          </span>
        </div>
      </div>

      {/* Main Heatmap Visual & Detail Card Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Anatomical SVGs */}
        <div className="lg:col-span-7 rounded-xl bg-slate-950/60 border border-slate-800 p-3 sm:p-4 flex flex-col items-center">
          <div className="text-[11px] font-mono text-slate-400 mb-2">
            Tap or click any muscle group to inspect recovery and weekly volume:
          </div>

          <div className="flex items-center justify-center gap-4 sm:gap-8 w-full max-w-md mx-auto">
            {/* FRONT BODY SVG */}
            {(activeView === 'both' || activeView === 'front') && (
              <div className="flex flex-col items-center">
                <span className="text-[11px] font-mono font-bold uppercase text-slate-400 mb-1">
                  Anterior (Front)
                </span>
                <svg
                  data-testid="heatmap-svg-front"
                  viewBox="0 0 200 400"
                  className="w-32 xs:w-36 sm:w-44 h-auto select-none"
                  aria-label="Anterior front muscle group anatomy"
                >
                  <defs>
                    <filter id="glow-filter" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>

                  {/* Silhouette Base Body Layer */}
                  <g opacity="0.3" fill="#1e293b" stroke="#334155" strokeWidth="1.5">
                    {/* Head & Neck */}
                    <ellipse cx="100" cy="35" rx="20" ry="24" />
                    <rect x="92" y="58" width="16" height="15" rx="3" />
                    {/* Torso Contour */}
                    <path d="M72,72 Q100,74 128,72 L124,175 Q100,180 76,175 Z" />
                    {/* Legs Contour */}
                    <path d="M76,175 L68,360 L88,360 L96,200 L104,200 L112,360 L132,360 L124,175 Z" />
                    {/* Arms Contour */}
                    <path d="M68,76 L44,180 L56,182 L76,105 Z" />
                    <path d="M132,76 L156,180 L144,182 L124,105 Z" />
                  </g>

                  {/* CHEST (Pectorals) */}
                  <g
                    data-testid="muscle-path-chest"
                    onClick={() => setSelectedMuscleId('chest')}
                    className="cursor-pointer transition-all hover:opacity-100"
                  >
                    {/* Left Pec */}
                    <path
                      d="M74,78 Q96,76 98,92 L98,118 Q74,122 70,98 Z"
                      fill={getMuscleFill('chest')}
                      stroke={isMuscleSelected('chest') ? '#ffffff' : '#0f172a'}
                      strokeWidth={isMuscleSelected('chest') ? '2.5' : '1'}
                      opacity={isMuscleSelected('chest') ? 1 : 0.85}
                    />
                    {/* Right Pec */}
                    <path
                      d="M126,78 Q104,76 102,92 L102,118 Q126,122 130,98 Z"
                      fill={getMuscleFill('chest')}
                      stroke={isMuscleSelected('chest') ? '#ffffff' : '#0f172a'}
                      strokeWidth={isMuscleSelected('chest') ? '2.5' : '1'}
                      opacity={isMuscleSelected('chest') ? 1 : 0.85}
                    />
                  </g>

                  {/* SHOULDERS (Anterior Deltoids) */}
                  <g
                    data-testid="muscle-path-shoulders"
                    onClick={() => setSelectedMuscleId('shoulders')}
                    className="cursor-pointer transition-all hover:opacity-100"
                  >
                    <path
                      d="M58,74 Q74,72 74,86 L70,105 Q52,98 56,78 Z"
                      fill={getMuscleFill('shoulders')}
                      stroke={isMuscleSelected('shoulders') ? '#ffffff' : '#0f172a'}
                      strokeWidth={isMuscleSelected('shoulders') ? '2.5' : '1'}
                      opacity={isMuscleSelected('shoulders') ? 1 : 0.85}
                    />
                    <path
                      d="M142,74 Q126,72 126,86 L130,105 Q148,98 144,78 Z"
                      fill={getMuscleFill('shoulders')}
                      stroke={isMuscleSelected('shoulders') ? '#ffffff' : '#0f172a'}
                      strokeWidth={isMuscleSelected('shoulders') ? '2.5' : '1'}
                      opacity={isMuscleSelected('shoulders') ? 1 : 0.85}
                    />
                  </g>

                  {/* BICEPS */}
                  <g
                    data-testid="muscle-path-biceps"
                    onClick={() => setSelectedMuscleId('biceps')}
                    className="cursor-pointer transition-all hover:opacity-100"
                  >
                    <path
                      d="M52,106 Q64,106 64,136 Q50,138 48,114 Z"
                      fill={getMuscleFill('biceps')}
                      stroke={isMuscleSelected('biceps') ? '#ffffff' : '#0f172a'}
                      strokeWidth={isMuscleSelected('biceps') ? '2.5' : '1'}
                      opacity={isMuscleSelected('biceps') ? 1 : 0.85}
                    />
                    <path
                      d="M148,106 Q136,106 136,136 Q150,138 152,114 Z"
                      fill={getMuscleFill('biceps')}
                      stroke={isMuscleSelected('biceps') ? '#ffffff' : '#0f172a'}
                      strokeWidth={isMuscleSelected('biceps') ? '2.5' : '1'}
                      opacity={isMuscleSelected('biceps') ? 1 : 0.85}
                    />
                  </g>

                  {/* CORE & ABDOMINALS */}
                  <g
                    data-testid="muscle-path-core"
                    onClick={() => setSelectedMuscleId('core')}
                    className="cursor-pointer transition-all hover:opacity-100"
                  >
                    {/* Rectus Abdominis 6-Pack Matrix */}
                    <path
                      d="M84,122 L116,122 L114,170 Q100,174 86,170 Z"
                      fill={getMuscleFill('core')}
                      stroke={isMuscleSelected('core') ? '#ffffff' : '#0f172a'}
                      strokeWidth={isMuscleSelected('core') ? '2.5' : '1'}
                      opacity={isMuscleSelected('core') ? 1 : 0.85}
                    />
                  </g>

                  {/* QUADS (Quadriceps) */}
                  <g
                    data-testid="muscle-path-quads"
                    onClick={() => setSelectedMuscleId('quads')}
                    className="cursor-pointer transition-all hover:opacity-100"
                  >
                    {/* Left Quad */}
                    <path
                      d="M74,180 Q98,180 96,260 Q72,258 70,215 Z"
                      fill={getMuscleFill('quads')}
                      stroke={isMuscleSelected('quads') ? '#ffffff' : '#0f172a'}
                      strokeWidth={isMuscleSelected('quads') ? '2.5' : '1'}
                      opacity={isMuscleSelected('quads') ? 1 : 0.85}
                    />
                    {/* Right Quad */}
                    <path
                      d="M126,180 Q102,180 104,260 Q128,258 130,215 Z"
                      fill={getMuscleFill('quads')}
                      stroke={isMuscleSelected('quads') ? '#ffffff' : '#0f172a'}
                      strokeWidth={isMuscleSelected('quads') ? '2.5' : '1'}
                      opacity={isMuscleSelected('quads') ? 1 : 0.85}
                    />
                  </g>

                  {/* CALVES / TIBIALIS (Anterior) */}
                  <g
                    data-testid="muscle-path-calves"
                    onClick={() => setSelectedMuscleId('calves')}
                    className="cursor-pointer transition-all hover:opacity-100"
                  >
                    <path
                      d="M74,272 Q92,272 90,345 L76,345 Z"
                      fill={getMuscleFill('calves')}
                      stroke={isMuscleSelected('calves') ? '#ffffff' : '#0f172a'}
                      strokeWidth={isMuscleSelected('calves') ? '2.5' : '1'}
                      opacity={isMuscleSelected('calves') ? 1 : 0.85}
                    />
                    <path
                      d="M126,272 Q108,272 110,345 L124,345 Z"
                      fill={getMuscleFill('calves')}
                      stroke={isMuscleSelected('calves') ? '#ffffff' : '#0f172a'}
                      strokeWidth={isMuscleSelected('calves') ? '2.5' : '1'}
                      opacity={isMuscleSelected('calves') ? 1 : 0.85}
                    />
                  </g>
                </svg>
              </div>
            )}

            {/* BACK BODY SVG */}
            {(activeView === 'both' || activeView === 'back') && (
              <div className="flex flex-col items-center">
                <span className="text-[11px] font-mono font-bold uppercase text-slate-400 mb-1">
                  Posterior (Back)
                </span>
                <svg
                  data-testid="heatmap-svg-back"
                  viewBox="0 0 200 400"
                  className="w-32 xs:w-36 sm:w-44 h-auto select-none"
                  aria-label="Posterior back muscle group anatomy"
                >
                  {/* Silhouette Base Body Layer */}
                  <g opacity="0.3" fill="#1e293b" stroke="#334155" strokeWidth="1.5">
                    {/* Head & Neck */}
                    <ellipse cx="100" cy="35" rx="20" ry="24" />
                    <rect x="92" y="58" width="16" height="15" rx="3" />
                    {/* Torso Contour */}
                    <path d="M72,72 Q100,74 128,72 L124,175 Q100,180 76,175 Z" />
                    {/* Legs Contour */}
                    <path d="M76,175 L68,360 L88,360 L96,200 L104,200 L112,360 L132,360 L124,175 Z" />
                    {/* Arms Contour */}
                    <path d="M68,76 L44,180 L56,182 L76,105 Z" />
                    <path d="M132,76 L156,180 L144,182 L124,105 Z" />
                  </g>

                  {/* TRAPS (Trapezius) */}
                  <g
                    data-testid="muscle-path-traps"
                    onClick={() => setSelectedMuscleId('traps')}
                    className="cursor-pointer transition-all hover:opacity-100"
                  >
                    <path
                      d="M84,65 L116,65 L128,86 L100,108 L72,86 Z"
                      fill={getMuscleFill('traps')}
                      stroke={isMuscleSelected('traps') ? '#ffffff' : '#0f172a'}
                      strokeWidth={isMuscleSelected('traps') ? '2.5' : '1'}
                      opacity={isMuscleSelected('traps') ? 1 : 0.85}
                    />
                  </g>

                  {/* LATS (Latissimus Dorsi) */}
                  <g
                    data-testid="muscle-path-lats"
                    onClick={() => setSelectedMuscleId('lats')}
                    className="cursor-pointer transition-all hover:opacity-100"
                  >
                    <path
                      d="M72,90 Q92,102 96,146 L76,144 Q68,115 72,90 Z"
                      fill={getMuscleFill('lats')}
                      stroke={isMuscleSelected('lats') ? '#ffffff' : '#0f172a'}
                      strokeWidth={isMuscleSelected('lats') ? '2.5' : '1'}
                      opacity={isMuscleSelected('lats') ? 1 : 0.85}
                    />
                    <path
                      d="M128,90 Q108,102 104,146 L124,144 Q132,115 128,90 Z"
                      fill={getMuscleFill('lats')}
                      stroke={isMuscleSelected('lats') ? '#ffffff' : '#0f172a'}
                      strokeWidth={isMuscleSelected('lats') ? '2.5' : '1'}
                      opacity={isMuscleSelected('lats') ? 1 : 0.85}
                    />
                  </g>

                  {/* TRICEPS */}
                  <g
                    data-testid="muscle-path-triceps"
                    onClick={() => setSelectedMuscleId('triceps')}
                    className="cursor-pointer transition-all hover:opacity-100"
                  >
                    <path
                      d="M54,98 Q66,98 64,136 Q48,136 48,106 Z"
                      fill={getMuscleFill('triceps')}
                      stroke={isMuscleSelected('triceps') ? '#ffffff' : '#0f172a'}
                      strokeWidth={isMuscleSelected('triceps') ? '2.5' : '1'}
                      opacity={isMuscleSelected('triceps') ? 1 : 0.85}
                    />
                    <path
                      d="M146,98 Q134,98 136,136 Q152,136 152,106 Z"
                      fill={getMuscleFill('triceps')}
                      stroke={isMuscleSelected('triceps') ? '#ffffff' : '#0f172a'}
                      strokeWidth={isMuscleSelected('triceps') ? '2.5' : '1'}
                      opacity={isMuscleSelected('triceps') ? 1 : 0.85}
                    />
                  </g>

                  {/* LOWER BACK (Erector Spinae) */}
                  <g
                    data-testid="muscle-path-lower_back"
                    onClick={() => setSelectedMuscleId('lower_back')}
                    className="cursor-pointer transition-all hover:opacity-100"
                  >
                    <path
                      d="M86,146 L114,146 L116,176 L84,176 Z"
                      fill={getMuscleFill('lower_back')}
                      stroke={isMuscleSelected('lower_back') ? '#ffffff' : '#0f172a'}
                      strokeWidth={isMuscleSelected('lower_back') ? '2.5' : '1'}
                      opacity={isMuscleSelected('lower_back') ? 1 : 0.85}
                    />
                  </g>

                  {/* GLUTES */}
                  <g
                    data-testid="muscle-path-glutes"
                    onClick={() => setSelectedMuscleId('glutes')}
                    className="cursor-pointer transition-all hover:opacity-100"
                  >
                    <path
                      d="M72,176 Q100,176 98,215 Q72,215 70,185 Z"
                      fill={getMuscleFill('glutes')}
                      stroke={isMuscleSelected('glutes') ? '#ffffff' : '#0f172a'}
                      strokeWidth={isMuscleSelected('glutes') ? '2.5' : '1'}
                      opacity={isMuscleSelected('glutes') ? 1 : 0.85}
                    />
                    <path
                      d="M128,176 Q100,176 102,215 Q128,215 130,185 Z"
                      fill={getMuscleFill('glutes')}
                      stroke={isMuscleSelected('glutes') ? '#ffffff' : '#0f172a'}
                      strokeWidth={isMuscleSelected('glutes') ? '2.5' : '1'}
                      opacity={isMuscleSelected('glutes') ? 1 : 0.85}
                    />
                  </g>

                  {/* HAMSTRINGS */}
                  <g
                    data-testid="muscle-path-hamstrings"
                    onClick={() => setSelectedMuscleId('hamstrings')}
                    className="cursor-pointer transition-all hover:opacity-100"
                  >
                    <path
                      d="M72,218 Q96,218 94,270 Q74,270 70,230 Z"
                      fill={getMuscleFill('hamstrings')}
                      stroke={isMuscleSelected('hamstrings') ? '#ffffff' : '#0f172a'}
                      strokeWidth={isMuscleSelected('hamstrings') ? '2.5' : '1'}
                      opacity={isMuscleSelected('hamstrings') ? 1 : 0.85}
                    />
                    <path
                      d="M128,218 Q104,218 106,270 Q126,270 130,230 Z"
                      fill={getMuscleFill('hamstrings')}
                      stroke={isMuscleSelected('hamstrings') ? '#ffffff' : '#0f172a'}
                      strokeWidth={isMuscleSelected('hamstrings') ? '2.5' : '1'}
                      opacity={isMuscleSelected('hamstrings') ? 1 : 0.85}
                    />
                  </g>

                  {/* CALVES (Gastrocnemius Posterior) */}
                  <g
                    onClick={() => setSelectedMuscleId('calves')}
                    className="cursor-pointer transition-all hover:opacity-100"
                  >
                    <path
                      d="M72,274 Q94,274 90,345 L74,345 Z"
                      fill={getMuscleFill('calves')}
                      stroke={isMuscleSelected('calves') ? '#ffffff' : '#0f172a'}
                      strokeWidth={isMuscleSelected('calves') ? '2.5' : '1'}
                      opacity={isMuscleSelected('calves') ? 1 : 0.85}
                    />
                    <path
                      d="M128,274 Q106,274 110,345 L126,345 Z"
                      fill={getMuscleFill('calves')}
                      stroke={isMuscleSelected('calves') ? '#ffffff' : '#0f172a'}
                      strokeWidth={isMuscleSelected('calves') ? '2.5' : '1'}
                      opacity={isMuscleSelected('calves') ? 1 : 0.85}
                    />
                  </g>
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* Selected Muscle Deep-Dive Inspector Card */}
        <div className="lg:col-span-5 rounded-xl bg-slate-950/80 border border-slate-800 p-4 sm:p-5 flex flex-col gap-3.5">
          {/* Header of Inspector */}
          <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {selectedMuscle.category} Body
              </span>
              <h4 className="text-base sm:text-lg font-bold text-white mt-1">
                {selectedMuscle.name}
              </h4>
            </div>

            {/* Status Badge */}
            <div
              data-testid="muscle-inspector-status"
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-bold ${
                getStatusColor(selectedMuscle.status).badgeBg
              } ${getStatusColor(selectedMuscle.status).badgeText} ${
                getStatusColor(selectedMuscle.status).badgeBorder
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${getStatusColor(selectedMuscle.status).dot}`} />
              <span>{getStatusColor(selectedMuscle.status).label}</span>
            </div>
          </div>

          {/* Recovery Readiness Progress Gauge */}
          <div>
            <div className="flex items-center justify-between text-xs font-mono mb-1.5">
              <span className="text-slate-400">Recovery Readiness</span>
              <span className="font-bold text-white">{selectedMuscle.recoveryPercentage}%</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  selectedMuscle.status === 'fresh'
                    ? 'bg-emerald-500'
                    : selectedMuscle.status === 'recovering'
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
                style={{ width: `${selectedMuscle.recoveryPercentage}%` }}
              />
            </div>
          </div>

          {/* Training Stats Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
              <span className="text-[11px] text-slate-400 block">Last Trained</span>
              <span className="text-white font-bold text-sm">
                {selectedMuscle.hoursElapsed !== null
                  ? `${selectedMuscle.hoursElapsed}h ago`
                  : 'Ready (No recent log)'}
              </span>
              {selectedMuscle.lastTrainedDate && (
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  {selectedMuscle.lastTrainedDate}
                </span>
              )}
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
              <span className="text-[11px] text-slate-400 block">7-Day Volume</span>
              <span className="text-white font-bold text-sm">
                {selectedMuscle.setsLast7Days} / {selectedMuscle.recommendedTargetSets} sets
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Target weekly volume
              </span>
            </div>
          </div>

          {/* Coaching & Recovery Guidance */}
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block mb-0.5">Coaching Guidance</strong>
              <span>{selectedMuscle.guidance}</span>
            </div>
          </div>

          {/* Recent Contributing Exercises */}
          <div>
            <span className="text-[11px] font-mono font-bold uppercase text-slate-400 block mb-1.5">
              Recent Targeted Movements
            </span>
            {selectedMuscle.recentExercises.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {selectedMuscle.recentExercises.map((ex, idx) => (
                  <span
                    key={idx}
                    className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300"
                  >
                    {ex}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-xs text-slate-500 italic">
                No recent exercises logged for this muscle group.
              </span>
            )}
          </div>
        </div>
      </div>

      <div data-testid="pattern-balance" className="rounded-xl bg-slate-950/60 border border-slate-800 p-3 text-xs font-mono">
        <span className="text-[11px] font-bold uppercase text-slate-400 block mb-1.5">7-Day Movement Balance</span>
        <div className="grid grid-cols-2 gap-2 text-slate-300">
          <span data-testid="pattern-balance-upper">
            Push {balance.sets.upper_push} · Pull {balance.sets.upper_pull}
          </span>
          <span data-testid="pattern-balance-lower">
            Squat {balance.sets.squat} · Hinge {balance.sets.hinge}
          </span>
        </div>
        {balance.flags.map((flag) => (
          <p key={flag} data-testid="pattern-balance-flag" className="mt-1.5 text-amber-400">
            {flag}
          </p>
        ))}
      </div>
    </div>
  );
};
