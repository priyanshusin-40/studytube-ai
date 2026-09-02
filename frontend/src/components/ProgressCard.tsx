import { Check, LoaderCircle } from 'lucide-react';

const steps = ['Checking captions or audio', 'Processing transcript', 'Creating embeddings', 'Building knowledge base'];

export function ProgressCard({ step }: { step: number }) {
  return (
    <div className="mx-auto mt-8 max-w-lg rounded-3xl border border-violet/15 bg-white/80 p-6 text-left shadow-lift backdrop-blur dark:border-white/10 dark:bg-white/[0.06]">
      <div className="mb-5 flex items-center gap-3">
        <LoaderCircle className="animate-spin text-violet" size={22} />
        <div>
          <p className="font-semibold">Preparing your study space</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Audio transcription can take several minutes.</p>
        </div>
      </div>
      <div className="space-y-3">
        {steps.map((label, index) => (
          <div key={label} className={`flex items-center gap-3 text-sm transition ${index > step ? 'opacity-35' : ''}`}>
            <span className={`grid h-6 w-6 place-items-center rounded-full ${index < step ? 'bg-emerald-500 text-white' : index === step ? 'bg-violet text-white' : 'bg-slate-100 dark:bg-white/10'}`}>
              {index < step ? <Check size={13} strokeWidth={3} /> : <span className="text-[10px] font-bold">{index + 1}</span>}
            </span>
            <span className={index === step ? 'font-semibold' : ''}>{label}{index === step ? '…' : ''}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
