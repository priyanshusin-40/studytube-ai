import { ArrowUp, CheckCircle2, Menu, MessageCircleQuestion, Moon, Plus, Sun } from 'lucide-react';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { Chat } from '../types';
import { MessageBubble } from './MessageBubble';

interface Props {
  chat: Chat;
  sending: boolean;
  dark: boolean;
  onToggleTheme: () => void;
  onMenu: () => void;
  onNewVideo: () => void;
  onSend: (value: string) => Promise<boolean>;
}

export function ChatView({ chat, sending, dark, onToggleTheme, onMenu, onNewVideo, onSend }: Props) {
  const [value, setValue] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chat.messages, sending]);

  const submit = async () => {
    const question = value.trim();
    if (!question || sending) return;
    setValue('');
    if (!(await onSend(question))) setValue(question);
  };
  const keyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void submit(); }
  };

  return (
    <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-cream dark:bg-[#1c1a2c]">
      <header className="flex min-h-[64px] shrink-0 items-center gap-2 border-b border-black/[0.055] bg-cream/85 px-3 py-2 backdrop-blur-xl dark:border-white/[0.07] dark:bg-[#1c1a2c]/85 sm:h-[72px] sm:gap-3 sm:px-6 sm:py-0">
        <button onClick={onMenu} className="grid min-h-11 min-w-11 place-items-center rounded-xl hover:bg-black/5 lg:hidden" aria-label="Open sidebar"><Menu size={20} /></button>
        {chat.video.thumbnailUrl && <img src={chat.video.thumbnailUrl} alt="" className="hidden h-9 w-14 rounded-lg object-cover min-[390px]:block" />}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-bold">{chat.video.title}</h1>
          <div className="mt-1 flex items-center gap-1.5 truncate text-[10px] font-semibold text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="shrink-0" size={11} /> Ready · {chat.video.chunkCount} chunks · {chat.video.transcriptSource === 'gemini-audio' ? 'Audio transcript' : 'YouTube captions'}</div>
        </div>
        <button onClick={onToggleTheme} className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-black/[0.06] bg-white text-slate-500 hover:text-violet dark:border-white/10 dark:bg-white/5 dark:text-slate-300" aria-label="Toggle theme">{dark ? <Sun size={17} /> : <Moon size={17} />}</button>
        <button onClick={onNewVideo} className="hidden min-h-11 items-center gap-2 rounded-xl border border-black/[0.06] bg-white px-3.5 py-2.5 text-xs font-bold hover:border-violet/30 hover:text-violet dark:border-white/10 dark:bg-white/5 sm:flex"><Plus size={15} /> New video</button>
      </header>

      <div className="scrollbar flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-4xl px-3 py-6 sm:px-8 sm:py-10">
          {chat.messages.length === 0 ? (
            <div className="mx-auto flex max-w-2xl flex-col items-center py-10 text-center sm:py-16">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-violet/10 text-violet"><MessageCircleQuestion size={26} /></div>
              <h2 className="mt-5 font-display text-2xl font-bold tracking-tight">What do you want to understand?</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">Ask for an explanation, key argument, definition, comparison, or a recap. Answers stay grounded in this video's transcript.</p>
              <div className="mt-7 grid w-full gap-2 sm:grid-cols-2">
                {['Summarize the main ideas', 'What are the key takeaways?', 'Explain the hardest concept simply', 'What examples does the speaker use?'].map((prompt) => (
                  <button key={prompt} onClick={() => setValue(prompt)} className="rounded-2xl border border-black/[0.06] bg-white p-4 text-left text-xs font-semibold transition hover:-translate-y-0.5 hover:border-violet/25 hover:text-violet dark:border-white/[0.08] dark:bg-white/[0.04]">{prompt}</button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-7">
              {chat.messages.map((message) => <MessageBubble key={message.id} message={message} />)}
              {sending && (
                <div className="flex gap-4">
                  <div className="grid h-8 w-8 place-items-center rounded-xl bg-violet text-white"><span className="h-2 w-2 animate-pulse rounded-full bg-white" /></div>
                  <div className="flex items-center gap-1 rounded-2xl border border-black/[0.06] bg-white px-5 py-4 dark:border-white/10 dark:bg-white/5">
                    {[0, 1, 2].map((item) => <span key={item} style={{ animationDelay: `${item * 150}ms` }} className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet" />)}
                  </div>
                </div>
              )}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="shrink-0 border-t border-black/[0.05] bg-cream/90 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#1c1a2c]/90 sm:px-8 sm:py-5">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-end gap-2 rounded-[24px] border border-black/[0.08] bg-white p-2 pl-5 shadow-lift focus-within:border-violet/40 dark:border-white/10 dark:bg-white/[0.07]">
            <textarea value={value} onChange={(event) => setValue(event.target.value)} onKeyDown={keyDown} rows={1} maxLength={4000} placeholder="Ask anything about this video…" className="scrollbar max-h-32 min-h-11 flex-1 resize-none bg-transparent py-3 text-sm leading-5 outline-none placeholder:text-slate-400" />
            <button disabled={!value.trim() || sending} onClick={() => void submit()} className="grid h-11 w-11 shrink-0 place-items-center rounded-[17px] bg-ink text-white transition hover:bg-violet disabled:opacity-30 dark:bg-white dark:text-ink dark:hover:bg-violet dark:hover:text-white" aria-label="Send question"><ArrowUp size={19} strokeWidth={2.5} /></button>
          </div>
          <p className="mt-2 hidden text-center text-[10px] text-slate-400 sm:block">Enter to send · Shift+Enter for a new line · AI can make mistakes—check the linked sources.</p>
        </div>
      </div>
    </main>
  );
}
