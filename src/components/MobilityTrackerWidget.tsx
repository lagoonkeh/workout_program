// src/components/MobilityTrackerWidget.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  MOBILITY_PROTOCOLS,
  ALL_MOBILITY_PROTOCOLS,
  RANGE_OF_STRENGTH_FEATS,
  MOBILITY_PROTOCOLS_MAP,
  MobilityTestId,
  MobilityEntry,
  validateMobilityEntry,
  calculateMobilityProgress,
} from '../domain/mobility';
import { storageManager } from '../storage/storageManager';
import { SparklineChart } from './SparklineChart';
import {
  Activity,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Trash2,
  Calendar,
  AlertCircle,
  HelpCircle,
  PlusCircle,
  ChevronDown,
  ChevronUp,
  Pencil,
  Check,
  X,
} from 'lucide-react';

export interface BenchmarkBadgeInfo {
  tier: 'Exceptional' | 'Proficient' | 'Developing' | 'Restricted';
  badgeClass: string;
  dotClass: string;
  description: string;
}

export function getBenchmarkBadge(testId: MobilityTestId, value: number): BenchmarkBadgeInfo {
  switch (testId) {
    case 'elephant-walk':
      if (value >= 5) {
        return {
          tier: 'Exceptional',
          badgeClass: 'bg-emerald-950/60 border-emerald-600 text-emerald-300',
          dotClass: 'bg-emerald-400',
          description: 'Palms Flat on Floor (Full Decompression)',
        };
      }
      if (value === 4) {
        return {
          tier: 'Proficient',
          badgeClass: 'bg-blue-950/60 border-blue-600 text-blue-300',
          dotClass: 'bg-blue-400',
          description: 'Knuckles Touching Floor (Functional Athletic)',
        };
      }
      if (value === 3) {
        return {
          tier: 'Developing',
          badgeClass: 'bg-amber-950/60 border-amber-600 text-amber-300',
          dotClass: 'bg-amber-400',
          description: 'Fingertips to Toes (Baseline Mobility)',
        };
      }
      return {
        tier: 'Restricted',
        badgeClass: 'bg-rose-950/60 border-rose-600 text-rose-300',
        dotClass: 'bg-rose-400',
        description:
          value === 2
            ? 'Shoelaces / Ankles (Moderate Restriction)'
            : 'Mid-Shin (Severe Restriction; Elevate on Bench)',
      };

    case 'knee-to-wall':
      if (value >= 5.0) {
        return {
          tier: 'Exceptional',
          badgeClass: 'bg-emerald-950/60 border-emerald-600 text-emerald-300',
          dotClass: 'bg-emerald-400',
          description: '≥ 5.0 in / 12.5 cm (Optimal Dorsiflexion; Zero Squat Shear)',
        };
      }
      if (value >= 4.0) {
        return {
          tier: 'Proficient',
          badgeClass: 'bg-blue-950/60 border-blue-600 text-blue-300',
          dotClass: 'bg-blue-400',
          description: '4.0–4.9 in (Functional Parallel Squat Range)',
        };
      }
      if (value >= 2.0) {
        return {
          tier: 'Developing',
          badgeClass: 'bg-amber-950/60 border-amber-600 text-amber-300',
          dotClass: 'bg-amber-400',
          description: '2.0–3.9 in (Moderate Restriction; Box Squats Advised)',
        };
      }
      return {
        tier: 'Restricted',
        badgeClass: 'bg-rose-950/60 border-rose-600 text-rose-300',
        dotClass: 'bg-rose-400',
        description: '< 2.0 in (Severe Restriction; High Patellar Shear Risk)',
      };

    case 'split-squat-elevation':
      if (value === 0) {
        return {
          tier: 'Exceptional',
          badgeClass: 'bg-emerald-950/60 border-emerald-600 text-emerald-300',
          dotClass: 'bg-emerald-400',
          description: '0 in (Flat Ground Mastery; Pain-Free Full Knee Bend)',
        };
      }
      if (value <= 2) {
        return {
          tier: 'Proficient',
          badgeClass: 'bg-blue-950/60 border-blue-600 text-blue-300',
          dotClass: 'bg-blue-400',
          description: '2 in / Single 45 lb Plate (Advanced Remodeling)',
        };
      }
      if (value <= 6) {
        return {
          tier: 'Developing',
          badgeClass: 'bg-amber-950/60 border-amber-600 text-amber-300',
          dotClass: 'bg-amber-400',
          description: '6 in / Two Plates (Progressive Tendon Remodeling)',
        };
      }
      return {
        tier: 'Restricted',
        badgeClass: 'bg-rose-950/60 border-rose-600 text-rose-300',
        dotClass: 'bg-rose-400',
        description: '> 6 in (Acute Tendon Offloading / Bench Height)',
      };

    case 'biering-sorensen':
      if (value >= 120) {
        return {
          tier: 'Exceptional',
          badgeClass: 'bg-emerald-950/60 border-emerald-600 text-emerald-300',
          dotClass: 'bg-emerald-400',
          description: '≥ 120–180s (Resilient Spine; Optimal Disc Protection)',
        };
      }
      if (value >= 60) {
        return {
          tier: 'Proficient',
          badgeClass: 'bg-blue-950/60 border-blue-600 text-blue-300',
          dotClass: 'bg-blue-400',
          description: '60–119s (Adequate Baseline Spinal Endurance)',
        };
      }
      return {
        tier: 'Restricted',
        badgeClass: 'bg-rose-950/60 border-rose-600 text-rose-300',
        dotClass: 'bg-rose-400',
        description: '< 60s (Suboptimal Endurance; High Fatigue Risk on RDLs)',
      };

    case 'dead-hang':
      if (value >= 60) {
        return {
          tier: 'Exceptional',
          badgeClass: 'bg-emerald-950/60 border-emerald-600 text-emerald-300',
          dotClass: 'bg-emerald-400',
          description: '≥ 60s (Optimal Subacromial Decompression & Grip Stamina)',
        };
      }
      if (value >= 30) {
        return {
          tier: 'Proficient',
          badgeClass: 'bg-blue-950/60 border-blue-600 text-blue-300',
          dotClass: 'bg-blue-400',
          description: '30–59s (Baseline Functional Decompression)',
        };
      }
      return {
        tier: 'Restricted',
        badgeClass: 'bg-rose-950/60 border-rose-600 text-rose-300',
        dotClass: 'bg-rose-400',
        description: '< 30s (Restricted Grip / Shoulder Mobility)',
      };

    case 'pancake-split':
      if (value <= 0) {
        return {
          tier: 'Exceptional',
          badgeClass: 'bg-emerald-950/60 border-emerald-600 text-emerald-300',
          dotClass: 'bg-emerald-400',
          description: '0 in (Chest Flat on Floor; Feat of Range Mastery)',
        };
      }
      if (value <= 3.9) {
        return {
          tier: 'Proficient',
          badgeClass: 'bg-blue-950/60 border-blue-600 text-blue-300',
          dotClass: 'bg-blue-400',
          description: '0.1–3.9 in (Near Full Pancake Compression)',
        };
      }
      if (value <= 8.0) {
        return {
          tier: 'Developing',
          badgeClass: 'bg-amber-950/60 border-amber-600 text-amber-300',
          dotClass: 'bg-amber-400',
          description: '4.0–8.0 in (Functional Adductor Stride Range)',
        };
      }
      return {
        tier: 'Restricted',
        badgeClass: 'bg-rose-950/60 border-rose-600 text-rose-300',
        dotClass: 'bg-rose-400',
        description: '> 8.0 in (Severe Adductor Restriction; Elevate on Block)',
      };

    case 'jefferson-curl':
      if (value >= 4.0) {
        return {
          tier: 'Exceptional',
          badgeClass: 'bg-emerald-950/60 border-emerald-600 text-emerald-300',
          dotClass: 'bg-emerald-400',
          description: '≥ 4.0 in (Wrists Below Toes; Loaded Flexion Mastery)',
        };
      }
      if (value >= 2.0) {
        return {
          tier: 'Proficient',
          badgeClass: 'bg-blue-950/60 border-blue-600 text-blue-300',
          dotClass: 'bg-blue-400',
          description: '2.0–3.9 in (Knuckles Passing Platform Edge)',
        };
      }
      if (value >= 0.5) {
        return {
          tier: 'Developing',
          badgeClass: 'bg-amber-950/60 border-amber-600 text-amber-300',
          dotClass: 'bg-amber-400',
          description: '0.1–1.9 in (Toes Level; Developing Posterior Elasticity)',
        };
      }
      return {
        tier: 'Restricted',
        badgeClass: 'bg-rose-950/60 border-rose-600 text-rose-300',
        dotClass: 'bg-rose-400',
        description: '< 0.5 in (Restricted Posterior Chain; Flat Ground Advised)',
      };

    case 'german-hang':
      if (value >= 60) {
        return {
          tier: 'Exceptional',
          badgeClass: 'bg-emerald-950/60 border-emerald-600 text-emerald-300',
          dotClass: 'bg-emerald-400',
          description: '≥ 60s (Feat of Range; coaching benchmark)',
        };
      }
      if (value >= 30) {
        return {
          tier: 'Proficient',
          badgeClass: 'bg-blue-950/60 border-blue-600 text-blue-300',
          dotClass: 'bg-blue-400',
          description: '30–59s (Proficient)',
        };
      }
      if (value >= 10) {
        return {
          tier: 'Developing',
          badgeClass: 'bg-amber-950/60 border-amber-600 text-amber-300',
          dotClass: 'bg-amber-400',
          description: '10–29s (Developing Functional Shoulder Extension)',
        };
      }
      return {
        tier: 'Restricted',
        badgeClass: 'bg-rose-950/60 border-rose-600 text-rose-300',
        dotClass: 'bg-rose-400',
        description: '< 10s (Restricted; Use Toe Support)',
      };

    case 'head-to-toe':
      if (value <= 0) {
        return {
          tier: 'Exceptional',
          badgeClass: 'bg-emerald-950/60 border-emerald-600 text-emerald-300',
          dotClass: 'bg-emerald-400',
          description: '0 in (Forehead to Toes; Feat of Range Mastery)',
        };
      }
      if (value <= 2.9) {
        return {
          tier: 'Proficient',
          badgeClass: 'bg-blue-950/60 border-blue-600 text-blue-300',
          dotClass: 'bg-blue-400',
          description: '0.1–2.9 in (Advanced Active Compression)',
        };
      }
      if (value <= 6.0) {
        return {
          tier: 'Developing',
          badgeClass: 'bg-amber-950/60 border-amber-600 text-amber-300',
          dotClass: 'bg-amber-400',
          description: '3.0–6.0 in (Developing Forward Fold Compression)',
        };
      }
      return {
        tier: 'Restricted',
        badgeClass: 'bg-rose-950/60 border-rose-600 text-rose-300',
        dotClass: 'bg-rose-400',
        description: '> 6.0 in (Severe Posterior Chain Restriction; Jefferson Curls Advised)',
      };

    case 'side-split':
      if (value <= 0) {
        return {
          tier: 'Exceptional',
          badgeClass: 'bg-emerald-950/60 border-emerald-600 text-emerald-300',
          dotClass: 'bg-emerald-400',
          description: '0 in (Full Side Split Floor Contact; Feat of Range Mastery)',
        };
      }
      if (value <= 3.9) {
        return {
          tier: 'Proficient',
          badgeClass: 'bg-blue-950/60 border-blue-600 text-blue-300',
          dotClass: 'bg-blue-400',
          description: '0.1–3.9 in (Advanced Straddle Range)',
        };
      }
      if (value <= 10.0) {
        return {
          tier: 'Developing',
          badgeClass: 'bg-amber-950/60 border-amber-600 text-amber-300',
          dotClass: 'bg-amber-400',
          description: '4.0–10.0 in (Functional Straddle Range for Squats)',
        };
      }
      return {
        tier: 'Restricted',
        badgeClass: 'bg-rose-950/60 border-rose-600 text-rose-300',
        dotClass: 'bg-rose-400',
        description: '> 10.0 in (Severe Adductor Restriction; Train Horse Stance First)',
      };

    case 'back-bridge':
      if (value >= 30) {
        return {
          tier: 'Exceptional',
          badgeClass: 'bg-emerald-950/60 border-emerald-600 text-emerald-300',
          dotClass: 'bg-emerald-400',
          description: '≥ 30s (Stacked Shoulders; Feat of Range Mastery)',
        };
      }
      if (value >= 10) {
        return {
          tier: 'Developing',
          badgeClass: 'bg-amber-950/60 border-amber-600 text-amber-300',
          dotClass: 'bg-amber-400',
          description: '10–29s (Developing Spinal Extension Stamina)',
        };
      }
      return {
        tier: 'Restricted',
        badgeClass: 'bg-rose-950/60 border-rose-600 text-rose-300',
        dotClass: 'bg-rose-400',
        description: '< 10s (Restricted Thoracic Spine / Wrists; Elevate Feet)',
      };

    default:
      return {
        tier: 'Developing',
        badgeClass: 'bg-slate-900 border-slate-700 text-slate-300',
        dotClass: 'bg-slate-400',
        description: 'Assessment in progress',
      };
  }
}

export const MobilityTrackerWidget: React.FC = () => {
  const [selectedTestId, setSelectedTestId] = useState<MobilityTestId>('elephant-walk');
  const [protocolCategory, setProtocolCategory] = useState<'all' | 'foundational' | 'range_of_strength'>('all');
  const [history, setHistory] = useState<MobilityEntry[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [inputDate, setInputDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [inputSide, setInputSide] = useState<'bilateral' | 'left' | 'right'>('bilateral');
  const [inputNotes, setInputNotes] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState<boolean>(false);
  const [saveSuccessFlash, setSaveSuccessFlash] = useState<boolean>(false);

  // Subscribe to storage changes
  useEffect(() => {
    const data = storageManager.load();
    setHistory(data.mobilityHistory);

    const unsubscribe = storageManager.subscribe((updated) => {
      setHistory(updated.mobilityHistory);
    });
    return unsubscribe;
  }, []);

  const displayedProtocols = useMemo(() => {
    if (protocolCategory === 'foundational') return MOBILITY_PROTOCOLS;
    if (protocolCategory === 'range_of_strength') return RANGE_OF_STRENGTH_FEATS;
    return ALL_MOBILITY_PROTOCOLS;
  }, [protocolCategory]);

  const activeProtocol = MOBILITY_PROTOCOLS_MAP[selectedTestId];
  const testHistory = history
    .filter((e) => e.testId === selectedTestId)
    .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

  const progress = calculateMobilityProgress(history, selectedTestId);

  // Live preview badge calculation
  const numericVal = parseFloat(inputValue);
  const liveBadge = !isNaN(numericVal) ? getBenchmarkBadge(selectedTestId, numericVal) : null;

  const handleProtocolChange = (id: MobilityTestId) => {
    setSelectedTestId(id);
    setInputValue('');
    setFormError(null);
    if (id === 'knee-to-wall' || id === 'split-squat-elevation') {
      setInputSide('left');
    } else {
      setInputSide('bilateral');
    }
  };

  const handleAddMeasurement = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const value = parseFloat(inputValue);
    const candidateEntry = {
      testId: selectedTestId,
      value,
      date: new Date(inputDate).toISOString(),
      side: inputSide,
      notes: inputNotes.trim() || undefined,
    };

    const validation = validateMobilityEntry(candidateEntry);
    if (!validation.isValid) {
      setFormError(validation.error || 'Invalid entry.');
      return;
    }

    try {
      storageManager.addMobilityEntry(candidateEntry);
      setInputValue('');
      setInputNotes('');
      setSaveSuccessFlash(true);
      setTimeout(() => setSaveSuccessFlash(false), 2000);
    } catch (err: any) {
      setFormError(err.message || 'Failed to persist mobility entry.');
    }
  };

  const handleDelete = (id?: string) => {
    if (!id) return;
    if (window.confirm('Delete this mobility measurement log?')) {
      storageManager.deleteMobilityEntry(id);
    }
  };

  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [editSide, setEditSide] = useState<'bilateral' | 'left' | 'right'>('bilateral');
  const [editDate, setEditDate] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [editError, setEditError] = useState<string | null>(null);

  const handleStartEdit = (entry: MobilityEntry) => {
    setEditingEntryId(entry.id || null);
    setEditValue(String(entry.value));
    setEditSide(entry.side || 'bilateral');
    setEditDate(entry.date ? entry.date.split('T')[0] : new Date().toISOString().split('T')[0]);
    setEditNotes(entry.notes || '');
    setEditError(null);
  };

  const handleCancelEdit = () => {
    setEditingEntryId(null);
    setEditValue('');
    setEditSide('bilateral');
    setEditDate('');
    setEditNotes('');
    setEditError(null);
  };

  const handleSaveEdit = (entryId: string) => {
    setEditError(null);
    const value = parseFloat(editValue);
    const candidateEntry = {
      testId: selectedTestId,
      value,
      date: new Date(editDate).toISOString(),
      side: editSide,
      notes: editNotes.trim() || undefined,
    };

    const validation = validateMobilityEntry(candidateEntry);
    if (!validation.isValid) {
      setEditError(validation.error || 'Invalid entry.');
      return;
    }

    try {
      storageManager.updateMobilityEntry(entryId, candidateEntry);
      setEditingEntryId(null);
      setSaveSuccessFlash(true);
      setTimeout(() => setSaveSuccessFlash(false), 2000);
    } catch (err: any) {
      setEditError(err.message || 'Failed to update mobility entry.');
    }
  };

  const [isMainCollapsed, setIsMainCollapsed] = useState<boolean>(false);
  const [isOverviewCollapsed, setIsOverviewCollapsed] = useState<boolean>(false);
  const [isFormCollapsed, setIsFormCollapsed] = useState<boolean>(false);
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState<boolean>(false);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-5 md:p-6 shadow-2xl space-y-4 sm:space-y-6">
      {/* Header */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isMainCollapsed ? '' : 'border-b border-slate-800/80 pb-4'}`}>
        <div className="flex items-center justify-between gap-2">
          <div>
            <button
              type="button"
              onClick={() => setIsMainCollapsed((prev) => !prev)}
              className="flex items-center gap-2 text-left cursor-pointer group"
            >
              <Activity className="w-5 h-5 text-emerald-400" />
              <h2 className="text-xl font-bold text-slate-100 group-hover:text-emerald-300 transition-colors">
                Mobility & Flexibility Tracker
              </h2>
            </button>
            <p className="text-xs text-slate-400 mt-1">
              Standardized active mobility and flexibility assessment protocols.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Status Toast */}
          {saveSuccessFlash && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-950/80 border border-emerald-500/50 rounded-lg text-emerald-300 text-xs font-semibold animate-pulse">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              Measurement Logged!
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsMainCollapsed((prev) => !prev)}
            aria-expanded={!isMainCollapsed}
            aria-label={isMainCollapsed ? 'Expand mobility tracker' : 'Collapse mobility tracker'}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80 text-xs font-medium cursor-pointer transition-colors"
          >
            <span>{isMainCollapsed ? 'Expand' : 'Collapse'}</span>
            {isMainCollapsed ? (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>
        </div>
      </div>

      {!isMainCollapsed && (
        <>
      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center gap-2 pb-1" data-testid="mobility-category-filters">
        <button
          type="button"
          onClick={() => setProtocolCategory('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
            protocolCategory === 'all'
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
          }`}
        >
          All Science Protocols ({ALL_MOBILITY_PROTOCOLS.length})
        </button>
        <button
          type="button"
          onClick={() => setProtocolCategory('foundational')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
            protocolCategory === 'foundational'
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
          }`}
        >
          Foundational 7 (McGill & Patrick)
        </button>
        <button
          type="button"
          onClick={() => setProtocolCategory('range_of_strength')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
            protocolCategory === 'range_of_strength'
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
          }`}
        >
          Lucas Hardie Feats of Range ({RANGE_OF_STRENGTH_FEATS.length})
        </button>
      </div>

      {/* Protocol Selector Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2" role="tablist">
        {displayedProtocols.map((protocol) => {
          const isSelected = protocol.id === selectedTestId;
          const count = history.filter((e) => e.testId === protocol.id).length;
          return (
            <button
              key={protocol.id}
              role="tab"
              aria-selected={isSelected}
              onClick={() => handleProtocolChange(protocol.id)}
              className={`flex flex-col text-left p-3 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-emerald-950/40 border-emerald-500/80 text-white shadow-lg shadow-emerald-950/30 ring-1 ring-emerald-500/30'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400/80">
                {protocol.targetTissue}
              </span>
              <span className="text-xs font-semibold mt-0.5 line-clamp-1">
                {protocol.name.split('(')[0].trim()}
              </span>
              <span className="text-[10px] text-slate-500 mt-1 font-mono">
                {count} {count === 1 ? 'log' : 'logs'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Protocol Overview Card */}
      <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setIsOverviewCollapsed((prev) => !prev)}
                className="text-sm font-bold text-slate-100 hover:text-emerald-300 transition-colors cursor-pointer text-left"
              >
                {activeProtocol.name}
              </button>
            </div>
            <div className="text-xs text-slate-400 mt-1">
              <span className="text-slate-500">Target Tissue:</span> {activeProtocol.targetTissue} •{' '}
              <span className="text-slate-500">Benchmark:</span>{' '}
              <span className="text-amber-400 font-semibold">{activeProtocol.targetBenchmark}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            {!isOverviewCollapsed && (
              <button
                type="button"
                onClick={() => setShowInstructions(!showInstructions)}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>{showInstructions ? 'Hide Instructions' : 'View Protocol Details'}</span>
                {showInstructions ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsOverviewCollapsed((prev) => !prev)}
              aria-expanded={!isOverviewCollapsed}
              aria-label={isOverviewCollapsed ? 'Expand protocol overview' : 'Collapse protocol overview'}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium cursor-pointer transition-colors"
            >
              <span>{isOverviewCollapsed ? 'Expand' : 'Collapse'}</span>
              {isOverviewCollapsed ? (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>
          </div>
        </div>

        {!isOverviewCollapsed && (
          <>
            {/* Collapsible Instructions & Scoring Guide */}
            {showInstructions && (
              <div className="pt-3 border-t border-slate-800/80 space-y-3 text-xs text-slate-300">
                <div>
                  <span className="font-semibold text-emerald-400 block mb-1">Execution Steps:</span>
                  <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px]">
                    {activeProtocol.instructions.map((inst, i) => (
                      <li key={i}>{inst}</li>
                    ))}
                  </ol>
                </div>

                <div>
                  <span className="font-semibold text-emerald-400 block mb-1">Scoring Criteria:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {activeProtocol.scoringTiers.map((tier, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-900/80 p-2 rounded border border-slate-800 text-[11px]"
                      >
                        <div className="font-semibold text-slate-200">{tier.label}</div>
                        <div className="text-slate-400 text-[10px] mt-0.5">{tier.interpretation}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Trend Summary & Progress Indicators */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
                <div className="text-[10px] font-mono uppercase text-slate-500">Baseline</div>
                <div className="text-sm font-bold text-slate-200 mt-0.5">
                  {progress.baseline !== null ? `${progress.baseline} ${activeProtocol.unit}` : '—'}
                </div>
              </div>

              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
                <div className="text-[10px] font-mono uppercase text-slate-500">Latest Score</div>
                <div className="text-sm font-bold text-slate-100 mt-0.5">
                  {progress.latest !== null ? `${progress.latest} ${activeProtocol.unit}` : '—'}
                </div>
              </div>

              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
                <div className="text-[10px] font-mono uppercase text-slate-500">Progress Delta</div>
                <div className="flex items-center gap-1 mt-0.5">
                  {progress.status === 'improved' && (
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                  {progress.status === 'declined' && (
                    <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                  )}
                  <span
                    className={`text-sm font-bold ${
                      progress.status === 'improved'
                        ? 'text-emerald-400'
                        : progress.status === 'declined'
                        ? 'text-rose-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {progress.status === 'empty'
                      ? '—'
                      : `${progress.delta > 0 ? '+' : ''}${progress.delta} ${activeProtocol.unit}`}
                  </span>
                </div>
              </div>

              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
                <div className="text-[10px] font-mono uppercase text-slate-500">Target Status</div>
                <div className="mt-0.5">
                  {progress.isTargetMet ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-600">
                      Target Met
                    </span>
                  ) : progress.status === 'empty' ? (
                    <span className="text-xs text-slate-500">Untested</span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-950/80 text-amber-300 border border-amber-600">
                      In Progress
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Zero-Dependency SVG Sparkline Chart */}
            <div className="pt-2">
              <SparklineChart entries={history} protocol={activeProtocol} height={130} />
            </div>
          </>
        )}
      </div>

      {/* New Measurement Entry Form */}
      <form
        onSubmit={handleAddMeasurement}
        noValidate
        className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-4"
      >
        <div className="flex items-center justify-between flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setIsFormCollapsed((prev) => !prev)}
            className="text-sm font-bold text-slate-200 hover:text-emerald-300 transition-colors flex items-center gap-1.5 cursor-pointer text-left"
          >
            <PlusCircle className="w-4 h-4 text-emerald-400" />
            Log New Measurement
          </button>
          <div className="flex items-center gap-2">
            {liveBadge && !isFormCollapsed && (
              <div
                className={`px-2.5 py-1 rounded-full border text-[11px] font-semibold flex items-center gap-1.5 ${liveBadge.badgeClass}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${liveBadge.dotClass}`} />
                {liveBadge.tier}: {liveBadge.description}
              </div>
            )}
            <button
              type="button"
              onClick={() => setIsFormCollapsed((prev) => !prev)}
              aria-expanded={!isFormCollapsed}
              aria-label={isFormCollapsed ? 'Expand measurement form' : 'Collapse measurement form'}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium cursor-pointer transition-colors"
            >
              <span>{isFormCollapsed ? 'Expand' : 'Collapse'}</span>
              {isFormCollapsed ? (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>
          </div>
        </div>

        {!isFormCollapsed && (
          <>
            {formError && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{formError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Numeric Value Input */}
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Score / Measurement ({activeProtocol.unit})
                </label>
                <input
                  type="number"
                  step={selectedTestId === 'elephant-walk' ? '1' : '0.25'}
                  min="0"
                  max={selectedTestId === 'elephant-walk' ? '5' : '600'}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={
                    selectedTestId === 'elephant-walk' ? 'Level (1–5)' : `Enter ${activeProtocol.unit}`
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                  required
                />
              </div>

              {/* Side Selector (Conditional) */}
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Test Limb / Side
                </label>
                <select
                  value={inputSide}
                  onChange={(e) => setInputSide(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                >
                  <option value="bilateral">Bilateral (Both)</option>
                  <option value="left">Left Leg / Side</option>
                  <option value="right">Right Leg / Side</option>
                </select>
              </div>

              {/* Date Picker */}
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Assessment Date
                </label>
                <input
                  type="date"
                  value={inputDate}
                  onChange={(e) => setInputDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                  required
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Clinical / Sensation Notes
                </label>
                <input
                  type="text"
                  value={inputNotes}
                  onChange={(e) => setInputNotes(e.target.value)}
                  placeholder="e.g. Pain-free 0/10, slight tightness"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Quick Level Presets for Elephant Walks */}
            {selectedTestId === 'elephant-walk' && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] text-slate-500 mr-1 font-mono">Quick Pick:</span>
                {[
                  { lvl: 1, label: 'L1: Mid-Shin' },
                  { lvl: 2, label: 'L2: Shoelaces' },
                  { lvl: 3, label: 'L3: Toes' },
                  { lvl: 4, label: 'L4: Knuckles' },
                  { lvl: 5, label: 'L5: Palms Flat' },
                ].map((preset) => (
                  <button
                    key={preset.lvl}
                    type="button"
                    onClick={() => setInputValue(String(preset.lvl))}
                    className={`px-2 py-1 text-[11px] rounded border font-mono transition-colors cursor-pointer ${
                      inputValue === String(preset.lvl)
                        ? 'bg-emerald-600 text-white border-emerald-500 font-bold'
                        : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={!inputValue || isNaN(parseFloat(inputValue))}
                className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-950/50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Save Measurement
              </button>
            </div>
          </>
        )}
      </form>

      {/* History Log Table */}
      <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setIsHistoryCollapsed((prev) => !prev)}
            className="text-sm font-bold text-slate-200 hover:text-emerald-300 transition-colors cursor-pointer text-left"
          >
            Recent Assessment Logs ({testHistory.length})
          </button>
          <button
            type="button"
            onClick={() => setIsHistoryCollapsed((prev) => !prev)}
            aria-expanded={!isHistoryCollapsed}
            aria-label={isHistoryCollapsed ? 'Expand recent assessment logs' : 'Collapse recent assessment logs'}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium cursor-pointer transition-colors"
          >
            <span>{isHistoryCollapsed ? 'Expand' : 'Collapse'}</span>
            {isHistoryCollapsed ? (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>
        </div>

        {!isHistoryCollapsed && (
          testHistory.length === 0 ? (
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 text-center text-xs text-slate-500">
              No entries logged yet for this assessment.
            </div>
          ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {testHistory.map((entry) => {
              const badge = getBenchmarkBadge(entry.testId, entry.value);
              const isEditing = entry.id === editingEntryId;

              if (isEditing) {
                return (
                  <div
                    key={entry.id}
                    className="p-3 sm:p-4 rounded-xl border border-emerald-500/70 bg-slate-950/90 shadow-xl space-y-3 transition-all"
                  >
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="text-xs font-bold text-emerald-400 font-mono flex items-center gap-1.5">
                        <Pencil className="w-3.5 h-3.5" />
                        Edit Assessment Log
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {activeProtocol.name}
                      </span>
                    </div>

                    {editError && (
                      <div className="p-2 rounded-lg bg-rose-950/50 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                        <span>{editError}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {/* Value Input */}
                      <div>
                        <label className="block text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-1">
                          Score ({activeProtocol.unit})
                        </label>
                        <input
                          type="number"
                          step={activeProtocol.id === 'knee-to-wall' ? '0.1' : '1'}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          aria-label="Edit Measurement Value"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
                          required
                        />
                      </div>

                      {/* Side Selector */}
                      <div>
                        <label className="block text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-1">
                          Side Tested
                        </label>
                        <select
                          value={editSide}
                          onChange={(e) => setEditSide(e.target.value as any)}
                          aria-label="Edit Side Tested"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                        >
                          <option value="bilateral">Bilateral (Both)</option>
                          <option value="left">Left Leg / Side</option>
                          <option value="right">Right Leg / Side</option>
                        </select>
                      </div>

                      {/* Date Input */}
                      <div>
                        <label className="block text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-1">
                          Assessment Date
                        </label>
                        <input
                          type="date"
                          value={editDate}
                          onChange={(e) => setEditDate(e.target.value)}
                          aria-label="Edit Assessment Date"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                          required
                        />
                      </div>
                    </div>

                    {/* Elephant walk presets in edit mode */}
                    {selectedTestId === 'elephant-walk' && (
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="text-[10px] text-slate-500 mr-1 font-mono">Quick Pick:</span>
                        {[
                          { lvl: 1, label: 'L1: Mid-Shin' },
                          { lvl: 2, label: 'L2: Shoelaces' },
                          { lvl: 3, label: 'L3: Toes' },
                          { lvl: 4, label: 'L4: Knuckles' },
                          { lvl: 5, label: 'L5: Palms Flat' },
                        ].map((preset) => (
                          <button
                            key={preset.lvl}
                            type="button"
                            onClick={() => setEditValue(String(preset.lvl))}
                            className={`px-2 py-0.5 text-[10px] rounded border font-mono transition-colors cursor-pointer ${
                              editValue === String(preset.lvl)
                                ? 'bg-emerald-600 text-white border-emerald-500 font-bold'
                                : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-600'
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Notes Input */}
                    <div>
                      <label className="block text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-1">
                        Clinical Notes
                      </label>
                      <input
                        type="text"
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        placeholder="e.g. Pain-free 0/10, improved range"
                        aria-label="Edit Clinical Notes"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer border border-slate-700"
                        aria-label="Cancel editing"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Cancel</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(entry.id!)}
                        disabled={!editValue || isNaN(parseFloat(editValue))}
                        className="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-950/60 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        aria-label="Save edited measurement"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Save Changes</span>
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-950/60 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="font-mono text-xs text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      {entry.date?.split('T')[0]}
                    </div>
                    <div>
                      <span className="text-sm font-bold text-white font-mono">{entry.value}</span>{' '}
                      <span className="text-xs text-slate-400 font-mono">{activeProtocol.unit}</span>
                      {entry.side && entry.side !== 'bilateral' && (
                        <span className="ml-2 text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                          {entry.side}
                        </span>
                      )}
                    </div>
                    <span
                      className={`hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badge.badgeClass}`}
                    >
                      {badge.tier}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3">
                    {entry.notes && (
                      <span className="text-xs text-slate-400 max-w-[150px] md:max-w-xs truncate hidden sm:inline">
                        "{entry.notes}"
                      </span>
                    )}
                    <button
                      onClick={() => handleStartEdit(entry)}
                      className="p-1.5 text-slate-400 hover:text-emerald-400 transition-colors rounded hover:bg-slate-800 cursor-pointer"
                      title="Edit entry"
                      aria-label={`Edit measurement on ${entry.date?.split('T')[0]}`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors rounded hover:bg-slate-800 cursor-pointer"
                      title="Delete entry"
                      aria-label={`Delete measurement on ${entry.date?.split('T')[0]}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          )
        )}
      </div>
        </>
      )}
    </div>
  );
};

