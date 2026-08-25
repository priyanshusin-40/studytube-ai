import { Edit3, MessageSquareText, PanelLeftClose, Plus, Trash2, X } from 'lucide-react';
import type { ChatSummary } from '../types';
import { Brand } from './Brand';

interface Props {
  chats: ChatSummary[];
  activeId: string | null;
  open: boolean;
  onClose: () => void;
  onNewVideo: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
}

export function Sidebar({ chats, activeId, open, onClose, onNewVideo, onSelect, onDelete, onRename }: Props) {
  return (
    <>
      {open && <button aria-label="Close sidebar" onClick={onClose} className="fixed inset-0 z-40 bg-ink/30 backdrop-blur-sm lg:hidden" />}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[290px] flex-col border-r border-black/[0.06] bg-[#f3f1eb] p-4 transition-transform dark:border-white/[0.07] dark:bg-[#171625] lg:static lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-2 py-2">
          <Brand />
          <button onClick={onClose} className="rounded-xl p-2 text-slate-500 hover:bg-black/5 lg:hidden" aria-label="Close sidebar"><X size={19} /></button>
          <button onClick={onClose} className="hidden rounded-xl p-2 text-slate-400 hover:bg-black/5 lg:block" aria-label="Collapse sidebar"><PanelLeftClose size={18} /></button>
        </div>
        <button onClick={onNewVideo} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-ink px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-ink/10 transition hover:-translate-y-0.5 hover:bg-violet dark:bg-white dark:text-ink dark:hover:bg-violet dark:hover:text-white">
          <Plus size={17} /> Add new video
        </button>

        <div className="mt-7 flex items-center justify-between px-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Conversations</span>
          <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-bold dark:bg-white/10">{chats.length}</span>
        </div>
        <div className="scrollbar mt-3 flex-1 space-y-1 overflow-y-auto">
          {chats.length === 0 && (
            <div className="px-2 py-8 text-center text-xs leading-5 text-slate-400">
              Your video conversations<br />will appear here.
            </div>
          )}
          {chats.map((chat) => (
            <div key={chat.id} className={`group relative rounded-2xl transition ${activeId === chat.id ? 'bg-white shadow-sm dark:bg-white/10' : 'hover:bg-black/[0.035] dark:hover:bg-white/[0.05]'}`}>
              <button onClick={() => { onSelect(chat.id); onClose(); }} className="flex w-full items-start gap-3 px-3 py-3.5 pr-16 text-left">
                <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl ${activeId === chat.id ? 'bg-violet text-white' : 'bg-black/[0.05] text-slate-500 dark:bg-white/10'}`}><MessageSquareText size={15} /></span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-bold">{chat.title}</span>
                  <span className="mt-1 block truncate text-[10px] text-slate-400">{chat.videoTitle}</span>
                </span>
              </button>
              <div className="absolute right-2 top-3 flex opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                <button onClick={() => { const title = window.prompt('Rename conversation', chat.title); if (title?.trim()) onRename(chat.id, title.trim()); }} className="rounded-lg p-1.5 text-slate-400 hover:bg-black/5 hover:text-violet" aria-label="Rename chat"><Edit3 size={13} /></button>
                <button onClick={() => onDelete(chat.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-coral/10 hover:text-coral" aria-label="Delete chat"><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-black/[0.05] bg-white/50 p-3 text-[10px] leading-4 text-slate-500 dark:border-white/[0.06] dark:bg-white/[0.03] dark:text-slate-400">
          <span className="font-bold text-ink dark:text-white">Privacy note</span><br />Videos are indexed in your configured database. API keys stay on the server.
        </div>
      </aside>
    </>
  );
}
