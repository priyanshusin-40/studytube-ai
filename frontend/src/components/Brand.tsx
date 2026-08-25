import { Play } from 'lucide-react';

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-2xl bg-ink text-white shadow-lg shadow-violet/20 dark:bg-white dark:text-ink">
        <div className="absolute -right-2 -top-2 h-5 w-5 rounded-full bg-coral" />
        <Play size={17} fill="currentColor" />
      </div>
      {!compact && (
        <div>
          <div className="font-display text-[17px] font-bold leading-none tracking-tight">StudyTube</div>
          <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.25em] text-violet">AI workspace</div>
        </div>
      )}
    </div>
  );
}
