// src/components/SparklineChart.tsx
import React, { useState } from 'react';
import { MobilityEntry, MobilityProtocol } from '../domain/mobility';

export interface SparklineChartProps {
  entries: MobilityEntry[];
  protocol: MobilityProtocol;
  width?: number;
  height?: number;
  showBenchmarkLine?: boolean;
  showPoints?: boolean;
  showAreaGradient?: boolean;
  className?: string;
}

interface ScaledPoint {
  x: number;
  y: number;
  entry: MobilityEntry;
}

export const SparklineChart: React.FC<SparklineChartProps> = ({
  entries,
  protocol,
  width = 340,
  height = 120,
  showBenchmarkLine = true,
  showPoints = true,
  showAreaGradient = true,
  className = '',
}) => {
  const [activeTooltip, setActiveTooltip] = useState<{ point: ScaledPoint } | null>(null);

  const padTop = 16;
  const padBottom = 22;
  const padLeft = 16;
  const padRight = 16;
  const chartWidth = width - padLeft - padRight;
  const chartHeight = height - padTop - padBottom;

  // Filter and sort entries chronologically
  const sorted = [...entries]
    .filter((e) => e.testId === protocol.id)
    .sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());

  if (sorted.length === 0) {
    return (
      <div
        className={`w-full flex flex-col items-center justify-center p-6 bg-slate-900/60 border border-dashed border-slate-800 rounded-xl text-center ${className}`}
        style={{ minHeight: height }}
      >
        <span className="text-slate-400 text-xs font-medium">No assessment history logged yet</span>
        <span className="text-slate-500 text-[11px] mt-1">
          Record your first baseline measurement below to track progress
        </span>
      </div>
    );
  }

  // Determine domain bounds including target benchmark
  const rawValues = sorted.map((e) => e.value);
  const benchmark = protocol.benchmarkNumeric;
  const isLowerBetter =
    protocol.improvementDirection === 'lower' || protocol.direction === 'lower_is_better';

  let minVal = Math.min(...rawValues, benchmark);
  let maxVal = Math.max(...rawValues, benchmark);

  // If min and max are identical, expand margin
  if (minVal === maxVal) {
    minVal = Math.max(0, minVal - 1);
    maxVal = maxVal + 1;
  } else {
    // Add 5% breathing room
    const span = maxVal - minVal;
    minVal = Math.max(0, minVal - span * 0.05);
    maxVal = maxVal + span * 0.05;
  }

  const range = maxVal - minVal || 1;

  // Map value to Y coordinate with polarity awareness
  const getY = (val: number): number => {
    let normalizedRatio = (val - minVal) / range;
    if (isLowerBetter) {
      // Inverted: lower value maps to TOP (lower Y in SVG coordinates)
      normalizedRatio = 1 - normalizedRatio;
    }
    // High ratio -> top of chart (padTop)
    return Number((padTop + chartHeight * (1 - normalizedRatio)).toFixed(2));
  };

  const getX = (index: number, total: number): number => {
    if (total <= 1) return padLeft + chartWidth / 2;
    return Number((padLeft + (index / (total - 1)) * chartWidth).toFixed(2));
  };

  const scaledPoints: ScaledPoint[] = sorted.map((entry, index) => ({
    x: getX(index, sorted.length),
    y: getY(entry.value),
    entry,
  }));

  const polylinePoints = scaledPoints.map((p) => `${p.x},${p.y}`).join(' ');

  // Area path for gradient fill
  let areaPath = '';
  if (scaledPoints.length > 1) {
    const first = scaledPoints[0];
    const last = scaledPoints[scaledPoints.length - 1];
    const baselineY = height - padBottom;
    areaPath =
      `M ${first.x},${first.y} ` +
      scaledPoints.map((p) => `L ${p.x},${p.y}`).join(' ') +
      ` L ${last.x},${baselineY} L ${first.x},${baselineY} Z`;
  }

  const benchmarkY = getY(benchmark);
  const gradientId = `sparkline-gradient-${protocol.id}`;

  return (
    <div className={`relative w-full overflow-hidden select-none ${className}`}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible"
        role="img"
        aria-label={`Progress sparkline chart for ${protocol.name}`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Target Benchmark Line */}
        {showBenchmarkLine && (
          <g className="benchmark-guide">
            <line
              x1={padLeft}
              x2={width - padRight}
              y1={benchmarkY}
              y2={benchmarkY}
              stroke="#F59E0B"
              strokeWidth="1.2"
              strokeDasharray="4 4"
            />
            <text
              x={width - padRight}
              y={benchmarkY > padTop + 14 ? benchmarkY - 4 : benchmarkY + 12}
              fill="#F59E0B"
              fontSize="9"
              fontWeight="600"
              textAnchor="end"
              className="font-mono tracking-tight"
            >
              Target: {protocol.targetBenchmark}
            </text>
          </g>
        )}

        {/* Gradient Area Fill */}
        {showAreaGradient && areaPath && <path d={areaPath} fill={`url(#${gradientId})`} />}

        {/* Polyline */}
        {scaledPoints.length > 1 ? (
          <polyline
            points={polylinePoints}
            fill="none"
            stroke="#10B981"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          // Single entry indicator line
          <line
            x1={padLeft}
            x2={width - padRight}
            y1={scaledPoints[0].y}
            y2={scaledPoints[0].y}
            stroke="#10B981"
            strokeWidth="2"
            strokeDasharray="2 2"
          />
        )}

        {/* Data Points */}
        {showPoints &&
          scaledPoints.map((pt, idx) => (
            <g key={pt.entry.id || idx}>
              <circle
                cx={pt.x}
                cy={pt.y}
                r={activeTooltip?.point.entry.id === pt.entry.id ? '5.5' : '3.5'}
                fill="#0F172A"
                stroke="#10B981"
                strokeWidth="2"
                className="cursor-pointer transition-all duration-150"
                tabIndex={0}
                role="button"
                aria-label={`Entry ${idx + 1}: ${pt.entry.value} ${protocol.unit} on ${
                  pt.entry.date?.split('T')[0]
                }`}
                onMouseEnter={() => setActiveTooltip({ point: pt })}
                onMouseLeave={() => setActiveTooltip(null)}
                onFocus={() => setActiveTooltip({ point: pt })}
                onBlur={() => setActiveTooltip(null)}
              />
            </g>
          ))}

        {/* Axis Baseline */}
        <line
          x1={padLeft}
          x2={width - padRight}
          y1={height - padBottom}
          y2={height - padBottom}
          stroke="#334155"
          strokeWidth="1"
        />

        {/* Baseline / Date labels */}
        {scaledPoints.length > 0 && (
          <>
            <text
              x={padLeft}
              y={height - 6}
              fill="#64748B"
              fontSize="9"
              textAnchor="start"
              className="font-mono"
            >
              {sorted[0].date?.split('T')[0] || 'Start'}
            </text>
            {sorted.length > 1 && (
              <text
                x={width - padRight}
                y={height - 6}
                fill="#64748B"
                fontSize="9"
                textAnchor="end"
                className="font-mono"
              >
                {sorted[sorted.length - 1].date?.split('T')[0] || 'Latest'}
              </text>
            )}
          </>
        )}
      </svg>

      {/* Floating Tooltip */}
      {activeTooltip && (
        <div
          className="absolute z-20 pointer-events-none transform -translate-x-1/2 -translate-y-full bg-slate-950/95 border border-emerald-500/40 rounded-lg px-2.5 py-1.5 shadow-xl text-left backdrop-blur-sm"
          style={{
            left: `${(activeTooltip.point.x / width) * 100}%`,
            top: `${(activeTooltip.point.y / height) * 100 - 8}%`,
          }}
        >
          <div className="text-[10px] text-slate-400 font-mono">
            {activeTooltip.point.entry.date?.split('T')[0]}
            {activeTooltip.point.entry.side && ` • ${activeTooltip.point.entry.side.toUpperCase()}`}
          </div>
          <div className="text-xs font-bold text-emerald-400">
            {activeTooltip.point.entry.value}{' '}
            <span className="text-[10px] text-slate-300 font-normal">{protocol.unit}</span>
          </div>
          {activeTooltip.point.entry.notes && (
            <div className="text-[10px] text-slate-300 max-w-[140px] truncate mt-0.5">
              {activeTooltip.point.entry.notes}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
