import { LoaderCircle } from 'lucide-react';

const steps = ['Getting video', 'Extracting captions or audio', 'Preparing timestamped transcript', 'Creating AI embeddings', 'Preparing knowledge base', 'Ready for questions'];

export function ProgressCard() {
  return (
    <div className="mx-auto mt-8 max-w-lg rounded-3xl border border-violet/15 bg-white/80 p-6 text-left shadow-lift backdrop-blur dark:border-white/10 dark:bg-white/[0.06]">
      <div className="mb-5 flex items-center gap-3">
        <LoaderCircle className="animate-spin text-violet" size={22} />
        <div>
          <p className="font-semibold">Preparing your study space</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">The server is working through the pipeline. Audio transcription can take several minutes.</p>
        </div>
      </div>
      <div className="space-y-3">
        {steps.map((label, index) => (
          <div key={label} className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-300">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-violet/10 text-violet">
              <span className="text-[10px] font-bold">{index + 1}</span>
            </span>
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
