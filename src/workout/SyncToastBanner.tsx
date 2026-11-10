// Extracted from src/App.tsx (WorkoutAppMain). Presentation only: state and handlers come in as props.
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { type Dispatch, type SetStateAction } from 'react';
import { type SheetsSyncToast } from '../hooks/useSheetsSync';

export interface SyncToastBannerProps {
  setSyncToast: Dispatch<SetStateAction<SheetsSyncToast | null>>;
  syncToast: SheetsSyncToast | null;
}

export function SyncToastBanner({ setSyncToast, syncToast }: SyncToastBannerProps) {
  return (
    <>
      {/* Sync Notification Banner */}
      {syncToast && (
        <aside
          role="status"
          aria-live="polite"
          className={`w-full px-3 sm:px-6 py-2 text-xs font-medium flex items-center justify-between border-b transition-all ${
            syncToast.type === 'success'
              ? 'bg-emerald-950/95 border-emerald-600/80 text-emerald-200'
              : 'bg-rose-950/95 border-rose-600/80 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
            {syncToast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span className="flex-1 font-sans">{syncToast.message}</span>
            <button
              type="button"
              onClick={() => setSyncToast(null)}
              className="text-slate-400 hover:text-white px-2 py-0.5 rounded cursor-pointer text-xs"
              aria-label="Dismiss sync notification"
            >
              ✕
            </button>
          </div>
        </aside>
      )}
    </>
  );
}
