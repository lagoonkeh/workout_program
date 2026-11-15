// src/components/AthleteProfileCard.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Scale, Trash2, UserRound, Zap } from 'lucide-react';
import {
  ATHLETE_PROFILE_EVENT,
  MAX_BODYWEIGHT_LBS,
  MIN_BODYWEIGHT_LBS,
  addWeighIn,
  bodyweightTimeline,
  currentBodyweight,
  formatHeight,
  loadProfile,
  profileAge,
  removeWeighIn,
  saveProfile,
  todayISO,
  type AthleteProfile,
} from '../domain/athleteProfile';
import { QUARTERLY_ASSESSMENTS_EVENT, loadQuarterlyAssessments } from '../domain/fitnessAssessment';

export interface AthleteProfileCardProps {
  className?: string;
  now?: Date;
}

/** Profile (birthday, height) and a dated bodyweight log; drives age and bodyweight across the Assess tab. */
export const AthleteProfileCard: React.FC<AthleteProfileCardProps> = ({ className = '', now }) => {
  const [profile, setProfile] = useState<AthleteProfile>(() => loadProfile());
  const [assessments, setAssessments] = useState(() => loadQuarterlyAssessments());
  const [weight, setWeight] = useState('');
  const [date, setDate] = useState(() => todayISO(now));
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [feet, setFeet] = useState(() => String(Math.floor(profile.heightInches / 12)));
  const [inches, setInches] = useState(() => String(Math.round(profile.heightInches % 12)));
  const [dob, setDob] = useState(profile.dob);

  useEffect(() => {
    const refresh = () =>
      setTimeout(() => {
        setProfile(loadProfile());
        setAssessments(loadQuarterlyAssessments());
      }, 0);
    // catch anything saved by sibling widgets while this one was mounting
    refresh();
    window.addEventListener(QUARTERLY_ASSESSMENTS_EVENT, refresh);
    window.addEventListener(ATHLETE_PROFILE_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(QUARTERLY_ASSESSMENTS_EVENT, refresh);
      window.removeEventListener(ATHLETE_PROFILE_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const timeline = useMemo(() => bodyweightTimeline(profile, assessments), [profile, assessments]);
  const current = currentBodyweight(timeline);
  const first = timeline[0];
  const change = first ? Math.round((current - first.lbs) * 10) / 10 : 0;
  const recent = [...timeline].reverse().slice(0, 6);
  const age = profileAge(profile, now);

  const logWeight = (e: React.FormEvent) => {
    e.preventDefault();
    const lbs = parseFloat(weight);
    const next = addWeighIn(profile, lbs, date);
    if (!next) {
      setError(`Enter a weight between ${MIN_BODYWEIGHT_LBS} and ${MAX_BODYWEIGHT_LBS} lb and a valid date.`);
      return;
    }
    setError(null);
    setWeight('');
    setProfile(saveProfile(next));
  };

  const saveDetails = (e: React.FormEvent) => {
    e.preventDefault();
    const h = parseInt(feet, 10) * 12 + parseInt(inches || '0', 10);
    const next = saveProfile({ ...profile, dob, heightInches: Number.isFinite(h) ? h : profile.heightInches });
    setProfile(next);
    setFeet(String(Math.floor(next.heightInches / 12)));
    setInches(String(Math.round(next.heightInches % 12)));
    setDob(next.dob);
    setEditing(false);
  };

  const input =
    'bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-400 min-h-[40px]';

  return (
    <div data-testid="athlete-profile-card" className={`rounded-2xl bg-slate-900 border border-slate-800 p-3.5 sm:p-5 shadow-xl flex flex-col gap-3 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <UserRound className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Profile &amp; bodyweight</h3>
            <p className="text-xs text-slate-400">Used for your age, BMI and every strength percentile.</p>
          </div>
        </div>
        <div className="flex items-stretch gap-2 text-xs font-mono">
          <div className="rounded-xl bg-slate-950/80 border border-slate-800 px-3 py-1.5">
            <span className="text-[10px] uppercase text-slate-400 block">Bodyweight</span>
            <span data-testid="profile-current-bw" className="text-white font-bold text-base">{current} lb</span>
            {timeline.length > 1 && (
              <span className={`block text-[10px] ${change > 0 ? 'text-amber-300' : change < 0 ? 'text-sky-300' : 'text-slate-400'}`}>
                {change > 0 ? '+' : ''}
                {change} lb since {first.date}
              </span>
            )}
          </div>
          <div className="rounded-xl bg-slate-950/80 border border-slate-800 px-3 py-1.5">
            <span className="text-[10px] uppercase text-slate-400 block">Age · Height</span>
            <span data-testid="profile-age-height" className="text-white font-bold text-base">
              {age} · {formatHeight(profile.heightInches)}
            </span>
            <button type="button" onClick={() => setEditing((v) => !v)} className="block min-h-[36px] min-w-[44px] -mb-1.5 text-left text-xs text-blue-300 hover:underline cursor-pointer">
              {editing ? 'Cancel' : 'Edit'}
            </button>
          </div>
        </div>
      </div>

      {editing && (
        <form onSubmit={saveDetails} className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end" data-testid="profile-details-form">
          <label className="text-[11px] text-slate-400 col-span-2 sm:col-span-1">
            Birthday
            <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className={`${input} w-full mt-1`} aria-label="Birthday" />
          </label>
          <label className="text-[11px] text-slate-400">
            Height (ft)
            <input type="number" min={4} max={7} value={feet} onChange={(e) => setFeet(e.target.value)} className={`${input} w-full mt-1`} aria-label="Height feet" />
          </label>
          <label className="text-[11px] text-slate-400">
            (in)
            <input type="number" min={0} max={11} value={inches} onChange={(e) => setInches(e.target.value)} className={`${input} w-full mt-1`} aria-label="Height inches" />
          </label>
          <button type="submit" className="col-span-2 sm:col-span-1 min-h-[40px] rounded-lg bg-blue-500 hover:bg-blue-400 text-slate-950 text-sm font-bold cursor-pointer">
            Save
          </button>
        </form>
      )}

      <form onSubmit={logWeight} className="flex flex-wrap items-end gap-2" data-testid="weigh-in-form">
        <label className="text-[11px] text-slate-400">
          Weight (lb)
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder={String(current)}
            className={`${input} w-28 block mt-1`}
            aria-label="Bodyweight in pounds"
          />
        </label>
        <label className="text-[11px] text-slate-400">
          Date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`${input} block mt-1`} aria-label="Weigh-in date" />
        </label>
        <button type="submit" className="min-h-[40px] px-3.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-bold flex items-center gap-1.5 cursor-pointer">
          <Scale className="w-4 h-4" /> Log weigh-in
        </button>
        {error && <p role="alert" className="w-full text-xs text-rose-300">{error}</p>}
      </form>

      {recent.length > 0 && (
        <ul data-testid="weigh-in-list" className="flex flex-wrap gap-1.5">
          {recent.map((p) => {
            const w = p.source === 'weigh-in' ? profile.weighIns.find((x) => x.date === p.date) : null;
            return (
              <li key={p.date} className="flex items-center gap-1.5 text-[11px] font-mono px-2 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-300">
                <span className="text-slate-500">{p.date}</span>
                <span className="text-white font-semibold">{p.lbs} lb</span>
                {p.source === 'assessment' && <span className="text-slate-500">(test)</span>}
                {w && (
                  <button
                    type="button"
                    onClick={() => setProfile(saveProfile(removeWeighIn(profile, w.id)))}
                    aria-label={`Delete weigh-in ${p.date}`}
                    className="text-slate-500 hover:text-rose-300 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Yellow Dude 5 Clocks of Adaptation Tendon Advisory */}
      <div data-testid="profile-tendon-clock-advisory" className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/30 text-xs text-purple-200 flex items-start gap-2.5">
        <Zap className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-purple-300 block">
            Tendon Adaptation Clock (Yellow Dude)
          </span>
          <p className="text-purple-200/90 text-[11px] leading-relaxed mt-0.5">
            Strength rises within weeks, mostly from the nervous system, but tendons take months to stiffen. Add load gradually so they can keep up.
          </p>
        </div>
      </div>
    </div>
  );
};
