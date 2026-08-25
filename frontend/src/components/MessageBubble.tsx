import { Bot, ExternalLink, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Message } from '../types';

function stamp(value: number) {
  const seconds = Math.max(0, Math.floor(value));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h ? [h, m, s].map((n) => String(n).padStart(2, '0')).join(':') : [m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

export function MessageBubble({ message }: { message: Message }) {
  const assistant = message.role === 'assistant';
  return (
    <article className={`flex gap-3 sm:gap-4 ${assistant ? '' : 'flex-row-reverse'}`}>
      <div className={`mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-xl ${assistant ? 'bg-violet text-white' : 'bg-ink text-white dark:bg-white dark:text-ink'}`}>
        {assistant ? <Bot size={16} /> : <User size={15} />}
      </div>
      <div className={`min-w-0 max-w-[86%] sm:max-w-[78%] ${assistant ? '' : 'flex flex-col items-end'}`}>
        <div className={`rounded-[22px] px-5 py-4 text-sm leading-7 ${assistant ? 'border border-black/[0.06] bg-white text-slate-700 shadow-sm dark:border-white/[0.08] dark:bg-white/[0.055] dark:text-slate-200' : 'bg-ink text-white dark:bg-white dark:text-ink'}`}>
          {assistant ? (
            <div className="markdown">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
            </div>
          ) : <p className="whitespace-pre-wrap">{message.content}</p>}
        </div>
        {assistant && message.sources.length > 0 && (
          <div className="mt-3 w-full">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Sources from the video</div>
            <div className="flex flex-wrap gap-2">
              {message.sources.map((source) => (
                <a key={source.chunkId} href={source.url} target="_blank" rel="noreferrer" title={source.text} className="group flex items-center gap-2 rounded-xl border border-violet/15 bg-violet/[0.06] px-3 py-2 text-xs font-bold text-violet transition hover:-translate-y-0.5 hover:bg-violet hover:text-white dark:bg-violet/10">
                  {stamp(source.startTime)}–{stamp(source.endTime)} <ExternalLink size={12} />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
