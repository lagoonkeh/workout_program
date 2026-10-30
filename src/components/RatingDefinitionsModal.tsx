// src/components/RatingDefinitionsModal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Info,
  ShieldAlert,
  Zap,
  TrendingUp,
  Clock,
  Sparkles,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Search
} from 'lucide-react';

export type RatingCategoryTab = 'all' | 'knee' | 'hamstring' | 'energy' | 'sleep' | 'readiness' | 'rpe';

export interface RatingDefinitionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: RatingCategoryTab;
}

interface TermDefinition {
  rating: string;
  badgeColor: string;
  title: string;
  clinicalMeaning: string;
  trainingAction: string;
}

interface RatingSection {
  id: RatingCategoryTab;
  title: string;
  scaleDescription: string;
  scientificFoundation: string;
  icon: React.ReactNode;
  iconBg: string;
  iconText: string;
  terms: TermDefinition[];
}

export const RATING_SECTIONS: RatingSection[] = [
  {
    id: 'knee',
    title: 'Knee Tendon Discomfort (0–10 Scale)',
    scaleDescription: 'Measures patellar and quadriceps tendon irritability under compressive and tensile load.',
    scientificFoundation: 'Based on Dr. Alyssa Lu (Proformance Sports Therapy), Dr. Aaron Horschig (Squat University), and the Cook & Purdam Tendon Continuum Model.',
    icon: <ShieldAlert className="w-5 h-5 text-amber-400" />,
    iconBg: 'bg-amber-500/20 border-amber-500/40',
    iconText: 'text-amber-300',
    terms: [
      {
        rating: '0 / 10',
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        title: 'Iron Knees (Pain-Free / Fully Prepared)',
        clinicalMeaning: 'Tendon collagen tissue is fully hydrated, elastic, and ready for high-velocity or deep knee flexion with zero hesitation or apprehension.',
        trainingAction: 'Proceed with 100% of prescribed GZCL T1 loads and standard warm-up.'
      },
      {
        rating: '1–2 / 10',
        badgeColor: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
        title: 'Mild Warmup Stiffness (Synovial Warm-up Phenomenon)',
        clinicalMeaning: 'Transient early-session stiffness or slight creakiness that dissipates completely within the first 1–2 warm-up sets as synovial fluid warms and circulates.',
        trainingAction: 'Classic warm-up phenomenon. Safe for full session volume, deep ATG squats, and prescribed loads.'
      },
      {
        rating: '3–4 / 10',
        badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        title: 'Noticeable Tendon Ache (Reactive Tendon Warning)',
        clinicalMeaning: 'Dull localized ache at the inferior patellar pole or tibial tuberosity that lingers into working sets without sharp aggravation.',
        trainingAction: 'Program injects elevated slant-board calf/tibialis work and front-foot elevated ATG split squats to offload patellar shear.'
      },
      {
        rating: '5–6 / 10',
        badgeColor: 'bg-amber-500/25 text-amber-200 border-amber-500/50',
        title: 'Moderate Sensitivity (Tendon Guarding)',
        clinicalMeaning: 'Persistent ache that causes subconscious compensation, such as shifting weight to the opposite side or cutting squat depth.',
        trainingAction: 'High patellar shear prohibited. Automatically swaps deep compound barbell squats for Spanish squat isometrics or backward sledding pre-exhaust.'
      },
      {
        rating: '7–8 / 10',
        badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        title: 'High Guarding / Flare-Up (Acute Irritability)',
        clinicalMeaning: 'Sharp twinges on knee flexion past 60°. Nervous system actively down-regulates quadriceps motor unit recruitment to protect the tendon.',
        trainingAction: 'Barbell squats locked out. Training shifts entirely to posterior chain movements (Romanian deadlifts, glute bridges) and non-shear blood-flow flushes.'
      },
      {
        rating: '9–10 / 10',
        badgeColor: 'bg-rose-500/30 text-rose-200 border-rose-500/60',
        title: 'Sharp Pain / Structural Risk (Immediate Stop)',
        clinicalMeaning: 'Acute, severe localized pain, warmth, or visible joint effusion.',
        trainingAction: 'Immediate cessation of all lower-body quad loading. Ice, elevation, active unloaded mobility, and medical evaluation.'
      }
    ]
  },
  {
    id: 'hamstring',
    title: 'Hamstring & Posterior Chain Tightness (0–10 Scale)',
    scaleDescription: 'Measures fascial resistance, muscle belly contracture, and sciatic nerve sensitivity during hip hinging.',
    scientificFoundation: 'Based on Ben Patrick (ATG Elephant Walks), Coach Eugene Teo, and athletic hamstring strain prevention protocols.',
    icon: <Zap className="w-5 h-5 text-sky-400" />,
    iconBg: 'bg-sky-500/20 border-sky-500/40',
    iconText: 'text-sky-300',
    terms: [
      {
        rating: '0–2 / 10',
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        title: 'Loose & Open (Supple / Full Dynamic Reach)',
        clinicalMeaning: 'Hamstrings, adductor magnus, and calves lengthen effortlessly. Palms comfortably touch the floor during an RDL hinge with a neutral lumbar spine.',
        trainingAction: 'Cleared for full GZCL T1 deadlifts and maximal hip hinge loading.'
      },
      {
        rating: '3–4 / 10',
        badgeColor: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
        title: 'Moderate Morning Stiffness (Post-Training Fatigue)',
        clinicalMeaning: 'Typical stiffness from previous eccentric training or prolonged sitting. Releases within 60–90 seconds of dynamic elephant walks or light KB hinges.',
        trainingAction: 'Perform standard warm-up sequence; execute prescribed working sets normally.'
      },
      {
        rating: '5–6 / 10',
        badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        title: 'Elevated Tension (Mechanical Resistance)',
        clinicalMeaning: 'Noticeable resistance felt before reaching parallel depth in an RDL. Hamstring muscle bellies feel dense and slow to lengthen.',
        trainingAction: 'Enforce a strict 3-second eccentric tempo; elevate RDL starting position from floor to knee-level blocks.'
      },
      {
        rating: '7–8 / 10',
        badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        title: 'Active Guarding (Protective Neuro-Spasm)',
        clinicalMeaning: 'The nervous system is actively contracting the hamstrings to protect the sciatic nerve, sacroiliac joint, or a strained myofascial junction.',
        trainingAction: 'High strain risk under explosive or heavy loads. Program reduces volume by 40% and substitutes heavy RDLs with isometric bridge holds.'
      },
      {
        rating: '9–10 / 10',
        badgeColor: 'bg-rose-500/30 text-rose-200 border-rose-500/60',
        title: 'Locked Up / Severe Contracture',
        clinicalMeaning: 'Severe protective contracture. Any forward hip hinge triggers sharp compensatory lumbar flexion.',
        trainingAction: 'Cease all posterior chain compound loading; execute gentle nerve flossing and McGill cat-camel spinal hygiene.'
      }
    ]
  },
  {
    id: 'energy',
    title: 'Overall Energy & CNS Readiness (1–10 Scale)',
    scaleDescription: 'Evaluates Central Nervous System (CNS) drive, neural recovery, and systemic motor unit recruitment capability.',
    scientificFoundation: 'Based on rate of force development (RFD), autonomic tone balance, and powerlifting readiness profiling.',
    icon: <TrendingUp className="w-5 h-5 text-emerald-400" />,
    iconBg: 'bg-emerald-500/20 border-emerald-500/40',
    iconText: 'text-emerald-300',
    terms: [
      {
        rating: '1–3 / 10',
        badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        title: 'Exhausted / Systemically Depleted',
        clinicalMeaning: 'Heavy limbs, sluggish reaction time, reduced grip strength, mental brain fog, high sympathetic exhaustion.',
        trainingAction: 'Program applies a Deload / Active Recovery protocol (lowers working weight by 15–20% and caps reps at the minimum prescribed tier threshold).'
      },
      {
        rating: '4–6 / 10',
        badgeColor: 'bg-slate-800 text-slate-300 border-slate-700',
        title: 'Moderate / Baseline Training Energy',
        clinicalMeaning: 'Normal day-to-day energy. Capable of hitting prescribed sets and reps with standard working effort.',
        trainingAction: 'Execute standard GZCL progression without attempting aggressive volume overshoots.'
      },
      {
        rating: '7–8 / 10',
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        title: 'High Energy / Primed Neuromuscularly',
        clinicalMeaning: 'Crisp neural recruitment, weights feel light in warm-up sets, high mental focus and drive.',
        trainingAction: 'Push the last-set AMRAP (+ set) for 2–4 extra reps past the base target.'
      },
      {
        rating: '9–10 / 10',
        badgeColor: 'bg-emerald-500/30 text-emerald-200 border-emerald-500/50',
        title: 'Peak PR Energy (Supercompensation State)',
        clinicalMeaning: 'Complete physiological recovery, explosive rate of force development, effortless bar speed.',
        trainingAction: 'Prime window for setting lifetime 1RM or rep-record PRs.'
      }
    ]
  },
  {
    id: 'sleep',
    title: 'Sleep Quality & Recovery (1–10 Scale)',
    scaleDescription: 'Quantifies restorative slow-wave and REM sleep architecture for hormonal recovery and protein synthesis.',
    scientificFoundation: 'Based on sleep architecture research, nocturnal growth hormone release windows, and central recovery metrics.',
    icon: <Clock className="w-5 h-5 text-indigo-400" />,
    iconBg: 'bg-indigo-500/20 border-indigo-500/40',
    iconText: 'text-indigo-300',
    terms: [
      {
        rating: '1–3 / 10',
        badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        title: 'Broken / Deficient (< 5 Hours)',
        clinicalMeaning: 'Fragmented, restless sleep with frequent wakeups. Elevated morning cortisol, impaired glucose uptake, and reduced cognitive motor control.',
        trainingAction: 'Reduces maximal spinal compressive load; avoids testing maximal 1RMs.'
      },
      {
        rating: '4–6 / 10',
        badgeColor: 'bg-slate-800 text-slate-300 border-slate-700',
        title: 'Adequate Baseline (6–7 Hours)',
        clinicalMeaning: 'Standard sleep duration. Muscle protein synthesis and glycogen restoration are sufficient for regular training.',
        trainingAction: 'Maintain normal prescribed training volume.'
      },
      {
        rating: '7–8 / 10',
        badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
        title: 'High Restoration (7.5–8.5 Hours)',
        clinicalMeaning: 'Deep, uninterrupted REM and slow-wave sleep cycles. Woke feeling refreshed with zero sleep inertia.',
        trainingAction: 'Optimal hormonal environment (growth hormone and testosterone peak); body is primed for adaptation.'
      },
      {
        rating: '9–10 / 10',
        badgeColor: 'bg-indigo-500/30 text-indigo-200 border-indigo-500/50',
        title: 'Peak Cellular Repair (8.5+ Hours)',
        clinicalMeaning: 'Deep restorative recovery night; complete parasympathetic autonomic reset.',
        trainingAction: 'Full systemic recovery; maximum training capacity cleared.'
      }
    ]
  },
  {
    id: 'readiness',
    title: 'Biomechanical Readiness Assessment Tiers (%)',
    scaleDescription: 'Synthesizes knee discomfort, posterior chain tightness, energy, sleep, and soreness tags into an overall readiness score.',
    scientificFoundation: 'Algorithmic multi-variate assessment calibrated to automatically prescribe load adaptations and prehab exercises.',
    icon: <Sparkles className="w-5 h-5 text-emerald-400" />,
    iconBg: 'bg-emerald-500/20 border-emerald-500/40',
    iconText: 'text-emerald-300',
    terms: [
      {
        rating: '85–100%',
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        title: 'Peak Readiness (Cleared for PRs)',
        clinicalMeaning: 'All biometric sensors in green state. Tendons, nervous system, and sleep architecture fully supercompensated.',
        trainingAction: 'Full green light. Test 1RMs, chase AMRAP records, and execute top tier intensity.'
      },
      {
        rating: '70–84%',
        badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
        title: 'Optimal Training Window',
        clinicalMeaning: 'High readiness with normal baseline muscular fatigue. No limiting joint or neural restrictions.',
        trainingAction: 'Execute 100% of prescribed session volume, weights, and accessory work.'
      },
      {
        rating: '50–69%',
        badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        title: 'Caution / Minor Flare-Up',
        clinicalMeaning: 'Localized tendon sensitivity or moderate sleep/CNS fatigue detected. Compensatory injury risk is elevated.',
        trainingAction: 'Program automatically injects proactive warm-up drills, enforces strict tempo, and reduces working sets by 1 set.'
      },
      {
        rating: '< 50%',
        badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        title: 'Active Recovery Required',
        clinicalMeaning: 'High fatigue or acute joint irritability. Training through this state leads to chronic tendon breakdown.',
        trainingAction: 'Replaces heavy compound axial loads with joint decompression, mobility flows, and non-shear blood-flow flushes.'
      }
    ]
  },
  {
    id: 'rpe',
    title: 'RPE & Reps in Reserve (RIR Scale)',
    scaleDescription: 'Standardized scale to autoregulate training intensity and log set difficulty on exercise cue cards.',
    scientificFoundation: 'Based on Mike Tuchscherer (RTS), Dr. Eric Helms, Dr. Michael Zourdos, and Dr. Mike Israetel (Renaissance Periodization).',
    icon: <Activity className="w-5 h-5 text-cyan-400" />,
    iconBg: 'bg-cyan-500/20 border-cyan-500/40',
    iconText: 'text-cyan-300',
    terms: [
      {
        rating: '@RPE 6',
        badgeColor: 'bg-slate-800 text-slate-300 border-slate-700',
        title: '4+ Reps in Reserve (Light Speed / Warm-Up)',
        clinicalMeaning: 'Submaximal working effort. Bar moves at maximum voluntary velocity with zero deceleration.',
        trainingAction: 'Used for dynamic warm-ups, speed work, and submaximal technique calibration.'
      },
      {
        rating: '@RPE 7',
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        title: '3 Reps in Reserve (RIR 3 / Moderate Effort)',
        clinicalMeaning: 'Challenging working weight. Fast bar speed; 3 more clean, technically sound reps could have been completed.',
        trainingAction: 'Ideal for early GZCL Tier 2 sets and volume accumulation.'
      },
      {
        rating: '@RPE 8',
        badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
        title: '2 Reps in Reserve (RIR 2 / Standard Hypertrophy)',
        clinicalMeaning: 'Heavy working set. Bar speed begins to decelerate on the final rep; 2 clean reps left in reserve.',
        trainingAction: 'Primary sweet spot for GZCL Tier 1 & Tier 2 strength and hypertrophy progress.'
      },
      {
        rating: '@RPE 9',
        badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        title: '1 Rep in Reserve (RIR 1 / High Intensity)',
        clinicalMeaning: 'Near-maximal working set. Bar speed noticeably slows; only 1 more grinding rep could have been completed without technical breakdown.',
        trainingAction: 'Recommended limit for standard working sets to manage systemic fatigue.'
      },
      {
        rating: '@RPE 10',
        badgeColor: 'bg-rose-500/25 text-rose-300 border-rose-500/50',
        title: '0 Reps in Reserve (RIR 0 / True Technical Limit)',
        clinicalMeaning: 'Absolute maximum effort. Zero additional reps possible; maximal mechanical and neural output.',
        trainingAction: 'Reserved exclusively for testing PRs or final-set AMRAP challenges.'
      },
      {
        rating: 'Calibration Tip',
        badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
        title: 'High-Rep RIR Anchoring Rule (Zourdos & Halperin 2023/2024)',
        clinicalMeaning: 'On 1–5 rep strength sets, lifters estimate RIR within 0–1 rep. On 10–15+ rep sets, lifters systematically under-estimate RIR by 2–3 reps because local metabolic burn (lactate) is mistaken for true mechanical failure.',
        trainingAction: 'If bar speed has not visibly slowed during sets of 10+ reps, you have at least 2 more reps in the tank! Use warmup bar velocity as an objective anchor.'
      }
    ]
  }
];

export const RatingDefinitionsModal: React.FC<RatingDefinitionsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'all'
}) => {
  const [activeTab, setActiveTab] = useState<RatingCategoryTab>(initialTab);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Update activeTab when initialTab changes on modal open
  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // ESC key listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock background scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Filter sections by search query and active tab
  const filteredSections = useMemo(() => {
    return RATING_SECTIONS.filter((section) => {
      if (activeTab !== 'all' && section.id !== activeTab) {
        return false;
      }
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      const matchSection =
        section.title.toLowerCase().includes(q) ||
        section.scaleDescription.toLowerCase().includes(q);
      const matchTerms = section.terms.some(
        (t) =>
          t.rating.toLowerCase().includes(q) ||
          t.title.toLowerCase().includes(q) ||
          t.clinicalMeaning.toLowerCase().includes(q) ||
          t.trainingAction.toLowerCase().includes(q)
      );
      return matchSection || matchTerms;
    });
  }, [activeTab, searchQuery]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rating-definitions-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-3.5 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-950/50">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shrink-0">
              <Info className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2
                id="rating-definitions-title"
                className="text-base sm:text-lg font-bold text-white truncate"
              >
                Rating Terms & Clinical Scale Definitions
              </h2>
              <p className="text-xs text-slate-400 truncate">
                Evidence-based definitions, clinical criteria, and automated workout actions
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close rating definitions modal"
            className="p-2 min-h-[44px] min-w-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center justify-center shrink-0 border border-slate-700/80"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Category Tabs */}
        <div className="p-3 sm:p-4 border-b border-slate-800 bg-slate-950/30 space-y-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search terms, pain scores, RPE, or clinical guidance..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          {/* Tab Navigation */}
          <div
            role="tablist"
            aria-label="Rating categories"
            className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5"
          >
            {[
              { id: 'all', label: 'All Terms' },
              { id: 'knee', label: 'Knee Discomfort' },
              { id: 'hamstring', label: 'Hamstring Tightness' },
              { id: 'energy', label: 'Energy & CNS' },
              { id: 'sleep', label: 'Sleep Quality' },
              { id: 'readiness', label: 'Readiness Tiers' },
              { id: 'rpe', label: 'RPE & RIR' }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id as RatingCategoryTab)}
                className={`px-3 py-1.5 min-h-[44px] rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center justify-center ${
                  activeTab === tab.id
                    ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950/50'
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-6">
          {filteredSections.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto opacity-70" />
              <p className="text-sm font-semibold text-slate-300">No rating definitions found</p>
              <p className="text-xs text-slate-500">Try adjusting your search query or switching tabs.</p>
            </div>
          ) : (
            filteredSections.map((section) => (
              <section
                key={section.id}
                aria-labelledby={`section-heading-${section.id}`}
                className="bg-slate-950/60 rounded-xl sm:rounded-2xl border border-slate-800/80 p-3.5 sm:p-5 space-y-4"
              >
                {/* Section Header */}
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-xl border ${section.iconBg} ${section.iconText} shrink-0 mt-0.5`}
                  >
                    {section.icon}
                  </div>
                  <div className="space-y-1 min-w-0 flex-1">
                    <h3
                      id={`section-heading-${section.id}`}
                      className="text-sm sm:text-base font-bold text-white tracking-tight"
                    >
                      {section.title}
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {section.scaleDescription}
                    </p>
                    <p className="text-[11px] text-cyan-300/80 italic font-mono">
                      {section.scientificFoundation}
                    </p>
                  </div>
                </div>

                {/* RPE / RIR Research Callout */}
                {section.id === 'rpe' && (
                  <div
                    data-testid="rpe-calibration-anchor-callout"
                    className="p-3.5 rounded-xl bg-gradient-to-r from-purple-950/60 via-slate-900 to-purple-950/40 border border-purple-500/40 space-y-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        🔬 Peer-Reviewed Calibration
                      </span>
                      <span className="text-xs font-bold text-white">
                        High-Rep RIR Distortion Anchor (Zourdos et al. & Halperin et al.)
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Research demonstrates lifters accurately gauge failure within 0–1 rep on heavy strength sets (1–5 reps), but consistently <strong>under-estimate RIR by 2–3 reps on sets of 10+ reps</strong> due to perceived lactate burn. If the bar is still moving without involuntary deceleration, you have at least 2 more reps!
                    </p>
                  </div>
                )}

                {/* Terms Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3 pt-2 border-t border-slate-800/80">
                  {section.terms.map((term, tIdx) => (
                    <div
                      key={tIdx}
                      className="p-3 sm:p-3.5 rounded-xl bg-slate-900 border border-slate-800/90 space-y-2 text-xs hover:border-slate-700 transition-colors"
                    >
                      {/* Rating Badge & Title */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded-full font-mono text-[11px] font-bold border ${term.badgeColor}`}
                        >
                          {term.rating}
                        </span>
                        <span className="font-bold text-slate-200 text-xs truncate">
                          {term.title}
                        </span>
                      </div>

                      {/* Clinical Meaning */}
                      <p className="text-slate-300 leading-relaxed text-[11px] sm:text-xs">
                        {term.clinicalMeaning}
                      </p>

                      {/* Workout Action */}
                      <div className="pt-2 border-t border-slate-800/60 flex items-start gap-1.5 text-[11px] text-emerald-300 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>
                          <strong className="text-emerald-200">Action:</strong> {term.trainingAction}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between gap-3 text-xs text-slate-400">
          <span className="font-mono text-[11px]">
            {filteredSections.reduce((acc, s) => acc + s.terms.length, 0)} Definitions Active
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition-colors cursor-pointer border border-slate-700"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
