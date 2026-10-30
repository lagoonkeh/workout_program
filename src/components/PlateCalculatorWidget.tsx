// src/components/PlateCalculatorWidget.tsx
import React, { useState, useMemo } from 'react';
import {
  calculatePlates,
  DEFAULT_PLATE_INVENTORY,
  DEFAULT_BAR_WEIGHT,
  type PlateInventory,
  type PlateCalculationResult,
} from '../domain/plateCalculator';
import { Dumbbell, Plus, Minus, AlertCircle, CheckCircle2, Copy, Check, X, ChevronUp, ChevronDown } from 'lucide-react';

export interface PlateCalculatorWidgetProps {
  initialWeight?: number;
  inventory?: PlateInventory;
  barWeight?: number;
  onWeightChange?: (weight: number) => void;
  onClose?: () => void;
  className?: string;
}

// Strict Olympic Color Scheme Specification
const OLYMPIC_SPECS: Record<
  number,
  {
    colorHex: string;
    tailwindBg: string;
    tailwindBorder: string;
    textColor: string;
    heightPx: number;
    widthPx: number;
  }
> = {
  45: {
    colorHex: '#EF4444',
    tailwindBg: 'bg-red-600',
    tailwindBorder: 'border-red-700',
    textColor: 'text-white',
    heightPx: 144,
    widthPx: 22,
  },
  35: {
    colorHex: '#3B82F6',
    tailwindBg: 'bg-blue-600',
    tailwindBorder: 'border-blue-700',
    textColor: 'text-white',
    heightPx: 124,
    widthPx: 20,
  },
  25: {
    colorHex: '#EAB308',
    tailwindBg: 'bg-yellow-500',
    tailwindBorder: 'border-yellow-600',
    textColor: 'text-slate-950',
    heightPx: 108,
    widthPx: 18,
  },
  10: {
    colorHex: '#22C55E',
    tailwindBg: 'bg-green-600',
    tailwindBorder: 'border-green-700',
    textColor: 'text-white',
    heightPx: 84,
    widthPx: 14,
  },
  5: {
    colorHex: '#F8FAFC',
    tailwindBg: 'bg-slate-100',
    tailwindBorder: 'border-slate-300',
    textColor: 'text-slate-900',
    heightPx: 64,
    widthPx: 12,
  },
  2.5: {
    colorHex: '#94A3B8',
    tailwindBg: 'bg-slate-400',
    tailwindBorder: 'border-slate-500',
    textColor: 'text-slate-900',
    heightPx: 48,
    widthPx: 10,
  },
};

const PRESETS = [135, 185, 225, 275, 300];

export const PlateCalculatorWidget: React.FC<PlateCalculatorWidgetProps> = ({
  initialWeight = 135,
  inventory = DEFAULT_PLATE_INVENTORY,
  barWeight = DEFAULT_BAR_WEIGHT,
  onWeightChange,
  onClose,
  className = '',
}) => {
  const [targetWeight, setTargetWeight] = useState<number>(initialWeight);
  const [copied, setCopied] = useState<boolean>(false);
  const [isCardCollapsed, setIsCardCollapsed] = useState<boolean>(false);
  const [isSleeveCollapsed, setIsSleeveCollapsed] = useState<boolean>(false);
  const [isBreakdownCollapsed, setIsBreakdownCollapsed] = useState<boolean>(false);

  // Sync state if initialWeight changes externally
  React.useEffect(() => {
    setTargetWeight(initialWeight);
  }, [initialWeight]);

  const result: PlateCalculationResult = useMemo(() => {
    return calculatePlates(targetWeight, inventory, barWeight);
  }, [targetWeight, inventory, barWeight]);

  const updateWeight = (newWeight: number) => {
    const clamped = Math.max(0, newWeight);
    setTargetWeight(clamped);
    onWeightChange?.(clamped);
  };

  const handleCopySummary = () => {
    if (!result.platesPerSide.length && result.achievableWeight === 0) return;
    const text = `Barbell Load: ${result.achievableWeight} lbs (${barWeight} lb bar + [${result.platesPerSide.join(
      ', '
    )}] per side)`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className={`bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 shadow-2xl text-slate-100 max-w-3xl w-full mx-auto ${className}`}
    >
      {/* Header */}
      <div className={`flex items-center justify-between ${isCardCollapsed ? '' : 'pb-4 border-b border-slate-800'}`}>
        <button
          type="button"
          onClick={() => setIsCardCollapsed((prev) => !prev)}
          className="flex items-center gap-2.5 text-left cursor-pointer group"
        >
          <div className="p-2 rounded-xl bg-red-950/60 border border-red-800/50 text-red-400">
            <Dumbbell className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100 group-hover:text-emerald-300 transition-colors flex items-center gap-2">
              Barbell Plate Loading Calculator
            </h3>
            <p className="text-xs text-slate-400">
              {isCardCollapsed
                ? `${result.achievableWeight} lbs — [${result.platesPerSide.join(', ') || 'Empty Bar'}] per side`
                : 'Optimal 128-State Subset-Sum (45–300 lbs)'}
            </p>
          </div>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopySummary}
            title="Copy Plate Load to Clipboard"
            aria-label="Copy Plate Load"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <button
            type="button"
            onClick={() => setIsCardCollapsed((prev) => !prev)}
            aria-expanded={!isCardCollapsed}
            aria-label={isCardCollapsed ? 'Expand plate calculator' : 'Collapse plate calculator'}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80 text-xs font-medium cursor-pointer transition-colors"
          >
            <span>{isCardCollapsed ? 'Expand' : 'Collapse'}</span>
            {isCardCollapsed ? (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              aria-label="Close Plate Calculator"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {!isCardCollapsed && (
        <>

      {/* Target Weight Controls */}
      <div className="my-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
        <div>
          <label
            htmlFor="target-weight-input"
            className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1"
          >
            Target Barbell Load (lbs)
          </label>
          <div className="flex items-center gap-2">
            <input
              id="target-weight-input"
              type="number"
              value={targetWeight || ''}
              onChange={(e) => updateWeight(Number(e.target.value))}
              className="w-32 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xl font-mono font-bold text-white focus:outline-none focus:border-red-500 text-center"
              min="45"
              max="300"
              step="2.5"
            />
            <span className="text-slate-400 font-medium">lbs</span>
          </div>
        </div>

        {/* Step Increments */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => updateWeight(targetWeight - 5)}
            aria-label="Decrease weight by 5 lbs"
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 active:scale-95 transition-all flex items-center gap-0.5 cursor-pointer"
          >
            <Minus className="w-3 h-3 text-red-400" /> 5 lb
          </button>
          <button
            onClick={() => updateWeight(targetWeight - 2.5)}
            aria-label="Decrease weight by 2.5 lbs"
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 active:scale-95 transition-all flex items-center gap-0.5 cursor-pointer"
          >
            <Minus className="w-3 h-3 text-red-400" /> 2.5 lb
          </button>
          <button
            onClick={() => updateWeight(targetWeight + 2.5)}
            aria-label="Increase weight by 2.5 lbs"
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 active:scale-95 transition-all flex items-center gap-0.5 cursor-pointer"
          >
            <Plus className="w-3 h-3 text-emerald-400" /> 2.5 lb
          </button>
          <button
            onClick={() => updateWeight(targetWeight + 5)}
            aria-label="Increase weight by 5 lbs"
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 active:scale-95 transition-all flex items-center gap-0.5 cursor-pointer"
          >
            <Plus className="w-3 h-3 text-emerald-400" /> 5 lb
          </button>
        </div>
      </div>

      {/* Quick Presets Strip */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
        <span className="text-xs text-slate-400 font-semibold whitespace-nowrap">Presets:</span>
        {PRESETS.map((wt) => (
          <button
            key={wt}
            onClick={() => updateWeight(wt)}
            className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
              targetWeight === wt
                ? 'bg-red-600 text-white shadow-md shadow-red-900/40'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            {wt} lb
          </button>
        ))}
      </div>

      {/* Barbell Sleeve Visualizer Container */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 mb-5 shadow-inner">
        <div className={`flex items-center justify-between text-xs ${isSleeveCollapsed ? '' : 'mb-3'}`}>
          <button
            type="button"
            onClick={() => setIsSleeveCollapsed((prev) => !prev)}
            className="font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer text-left"
          >
            Barbell Sleeve Loading (Per Side)
          </button>
          <div className="flex items-center gap-2">
            <span className="font-mono text-slate-200 font-bold">
              Weight Per Side: <span className="text-emerald-400">{result.weightPerSide} lbs</span>
            </span>
            <button
              type="button"
              onClick={() => setIsSleeveCollapsed((prev) => !prev)}
              aria-expanded={!isSleeveCollapsed}
              aria-label={isSleeveCollapsed ? 'Expand sleeve loading graphic' : 'Collapse sleeve loading graphic'}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[11px] font-medium cursor-pointer transition-colors"
            >
              <span>{isSleeveCollapsed ? 'Expand' : 'Collapse'}</span>
              {isSleeveCollapsed ? (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>
          </div>
        </div>

        {!isSleeveCollapsed && (
          <>
            {/* Tactile Sleeve Shaft Graphic */}
            <div className="relative h-44 flex items-center bg-slate-900/60 rounded-xl px-4 border border-slate-800/80 overflow-x-auto">
              {/* Inner Barbell Collar */}
              <div className="w-5 h-36 bg-gradient-to-r from-slate-700 via-slate-600 to-slate-500 rounded-l-md border-r-2 border-slate-900 shadow-xl flex-shrink-0 flex items-center justify-center">
                <span className="text-[8px] font-bold text-slate-400 -rotate-90">COLLAR</span>
              </div>

              {/* Plates Stack (Loaded from collar to tip) */}
              <div className="flex items-center gap-1 z-10 flex-shrink-0">
                {result.platesPerSide.map((plateWeight, index) => {
                  const spec = OLYMPIC_SPECS[plateWeight] || {
                    colorHex: '#64748B',
                    tailwindBg: 'bg-slate-500',
                    tailwindBorder: 'border-slate-600',
                    textColor: 'text-white',
                    heightPx: 80,
                    widthPx: 16,
                  };

                  return (
                    <div
                      key={`plate-${plateWeight}-${index}`}
                      style={{
                        height: `${spec.heightPx}px`,
                        width: `${spec.widthPx}px`,
                        backgroundColor: spec.colorHex,
                      }}
                      className={`rounded-md border shadow-lg flex items-center justify-center select-none transform transition-transform hover:scale-105 ${spec.tailwindBorder}`}
                      title={`${plateWeight} lb plate`}
                    >
                      <span
                        className={`text-[10px] font-black -rotate-90 tracking-tighter ${spec.textColor}`}
                      >
                        {plateWeight}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Barbell Shaft Cylinder extending past plates */}
              <div className="flex-1 h-7 bg-gradient-to-b from-slate-300 via-slate-400 to-slate-500 border-y border-slate-600 rounded-r-md min-w-[80px] flex items-center justify-end pr-2 shadow-md">
                <span className="text-[9px] font-mono font-bold text-slate-700">45 LB BAR</span>
              </div>
            </div>

            {/* Empty Bar Notice */}
            {result.platesPerSide.length === 0 && (
              <p className="text-center text-xs text-slate-400 mt-2 font-medium">
                Empty Olympic Barbell (45 lbs). Zero plates loaded.
              </p>
            )}
          </>
        )}
      </div>

      {/* Breakdown Badges & Calculation Details */}
      <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setIsBreakdownCollapsed((prev) => !prev)}
            className="text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer text-left"
          >
            Load Breakdown & Olympic Color Key
          </button>
          <button
            type="button"
            onClick={() => setIsBreakdownCollapsed((prev) => !prev)}
            aria-expanded={!isBreakdownCollapsed}
            aria-label={isBreakdownCollapsed ? 'Expand load breakdown' : 'Collapse load breakdown'}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[11px] font-medium cursor-pointer transition-colors"
          >
            <span>{isBreakdownCollapsed ? 'Expand' : 'Collapse'}</span>
            {isBreakdownCollapsed ? (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>
        </div>

        {!isBreakdownCollapsed && (
          <>
            {/* Status Callout Banner */}
            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 ${
                result.isExact
                  ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                  : 'bg-amber-950/40 border-amber-800 text-amber-300'
              }`}
            >
              {result.isExact ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              )}
              <span>{result.message}</span>
            </div>

            {/* Summary Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                  Total Load
                </span>
                <span className="font-mono text-base font-bold text-white">
                  {result.achievableWeight} lbs
                </span>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                  Plates Per Side
                </span>
                <span className="font-mono text-base font-bold text-emerald-400">
                  {result.platesPerSide.length > 0 ? `[${result.platesPerSide.join(', ')}]` : 'None'}
                </span>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                  Total Plates
                </span>
                <span className="font-mono text-base font-bold text-white">
                  {result.totalPlatesUsed}
                </span>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                  Remainder
                </span>
                <span className="font-mono text-base font-bold text-slate-300">
                  {result.remainder} lbs
                </span>
              </div>
            </div>

            {/* Color Legend */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-2 text-[10px] text-slate-400">
              <span className="font-semibold uppercase tracking-wider">Olympic Color Key:</span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block" /> 45
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" /> 35
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block" /> 25
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-600 inline-block" /> 10
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-100 inline-block" /> 5
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block" /> 2.5
                </span>
              </div>
            </div>
          </>
        )}
      </div>
      </>
      )}
    </div>
  );
};

