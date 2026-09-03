import { Edit3, LogOut, MessageSquareText, PanelLeftClose, PanelLeftOpen, Plus, Trash2, X } from 'lucide-react';
import type { ChatSummary, User } from '../types';
import { Brand } from './Brand';

interface Props {
  user: User;
  chats: ChatSummary[];
  activeId: string | null;
  open: boolean;
  collapsed: boolean;
  onClose: () => void;
  onToggleCollapse: () => void;
  onNewVideo: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onLogout: () => void;
}

export function Sidebar({ user, chats, activeId, open, collapsed, onClose, onToggleCollapse, onNewVideo, onSelect, onDelete, onRename, onLogout }: Props) {
  return (
    <>
      {open && <button aria-label="Close sidebar" onClick={onClose} className="fixed inset-0 z-40 bg-ink/30 backdrop-blur-sm lg:hidden" />}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[min(88vw,320px)] flex-col border-r border-black/[0.06] bg-[#f3f1eb] p-4 transition-[width,transform] duration-200 dark:border-white/[0.07] dark:bg-[#171625] lg:sticky lg:top-0 lg:h-dvh lg:translate-x-0 ${collapsed ? 'lg:w-20 lg:px-3' : 'lg:w-[290px]'} ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className={`flex items-center py-2 ${collapsed ? 'lg:justify-center lg:px-0' : 'justify-between px-2'}`}>
          <div className={collapsed ? 'lg:hidden' : ''}><Brand /></div>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-500 hover:bg-black/5 lg:hidden" aria-label="Close sidebar"><X size={19} /></button>
          <button onClick={onToggleCollapse} className="hidden min-h-11 min-w-11 place-items-center rounded-xl p-2 text-slate-400 hover:bg-black/5 lg:grid" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>{collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}</button>
        </div>
        <button onClick={() => { onNewVideo(); onClose(); }} title={collapsed ? 'Add new video' : undefined} className={`mt-5 flex min-h-12 w-full items-center justify-center rounded-2xl bg-ink text-sm font-bold text-white shadow-lg shadow-ink/10 transition hover:-translate-y-0.5 hover:bg-violet dark:bg-white dark:text-ink dark:hover:bg-violet dark:hover:text-white ${collapsed ? 'lg:px-0' : 'gap-2 px-4'}`}>
          <Plus size={17} /> <span className={collapsed ? 'lg:hidden' : ''}>Add new video</span>
        </button>

        <div className={`mt-7 items-center justify-between px-2 ${collapsed ? 'flex lg:hidden' : 'flex'}`}>
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
            <div key={chat.id} title={collapsed ? chat.title : undefined} className={`group relative rounded-2xl transition ${activeId === chat.id ? 'bg-white shadow-sm dark:bg-white/10' : 'hover:bg-black/[0.035] dark:hover:bg-white/[0.05]'}`}>
              <button onClick={() => { onSelect(chat.id); onClose(); }} className={`flex min-h-12 w-full items-start text-left ${collapsed ? 'lg:justify-center lg:px-2 lg:py-2.5' : 'gap-3 px-3 py-3.5 pr-20'}`}>
                <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl ${activeId === chat.id ? 'bg-violet text-white' : 'bg-black/[0.05] text-slate-500 dark:bg-white/10'}`}><MessageSquareText size={15} /></span>
                <span className={`min-w-0 ${collapsed ? 'lg:hidden' : ''}`}>
                  <span className="block truncate text-xs font-bold">{chat.title}</span>
                  <span className="mt-1 block truncate text-[10px] text-slate-400">{chat.videoTitle}</span>
                </span>
              </button>
              <div className={`absolute right-2 top-2.5 flex transition ${collapsed ? 'lg:hidden' : ''} opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100`}>
                <button onClick={() => { const title = window.prompt('Rename conversation', chat.title); if (title?.trim()) onRename(chat.id, title.trim()); }} className="grid min-h-9 min-w-9 place-items-center rounded-lg text-slate-400 hover:bg-black/5 hover:text-violet" aria-label="Rename chat"><Edit3 size={14} /></button>
                <button onClick={() => onDelete(chat.id)} className="grid min-h-9 min-w-9 place-items-center rounded-lg text-slate-400 hover:bg-coral/10 hover:text-coral" aria-label="Delete chat"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
        <div className={`mt-3 flex items-center gap-3 rounded-2xl border border-black/[0.05] bg-white/55 p-2.5 dark:border-white/[0.06] dark:bg-white/[0.04] ${collapsed ? 'lg:justify-center' : ''}`}>
          <div title={user.name} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet text-xs font-bold text-white">{user.name.slice(0, 1).toUpperCase()}</div>
          <div className={`min-w-0 flex-1 ${collapsed ? 'lg:hidden' : ''}`}><div className="truncate text-xs font-bold">{user.name}</div><div className="truncate text-[10px] text-slate-400">{user.email}</div></div>
          <button onClick={onLogout} title="Sign out" className={`grid min-h-10 min-w-10 place-items-center rounded-xl text-slate-400 hover:bg-coral/10 hover:text-coral ${collapsed ? 'lg:hidden' : ''}`} aria-label="Sign out"><LogOut size={16} /></button>
        </div>
      </aside>
    </>
  );
}
