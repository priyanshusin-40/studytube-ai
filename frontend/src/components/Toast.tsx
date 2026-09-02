import { AlertCircle, CheckCircle2, X } from 'lucide-react';

export interface ToastData { id: number; message: string; type: 'error' | 'success' }

export function Toast({ toast, onClose }: { toast: ToastData; onClose: () => void }) {
  return (
    <div className="fixed inset-x-3 top-3 z-[70] flex max-w-sm items-start gap-3 rounded-2xl border border-black/5 bg-white p-4 text-sm shadow-2xl dark:border-white/10 dark:bg-[#29273d] sm:left-auto sm:right-4 sm:top-4">
      {toast.type === 'error' ? <AlertCircle className="mt-0.5 text-coral" size={19} /> : <CheckCircle2 className="mt-0.5 text-emerald-500" size={19} />}
      <span className="flex-1 leading-6">{toast.message}</span>
      <button onClick={onClose} className="grid min-h-11 min-w-11 place-items-center rounded-lg text-slate-400 hover:bg-black/5" aria-label="Dismiss notification"><X size={16} /></button>
    </div>
  );
}
