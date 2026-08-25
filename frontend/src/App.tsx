import { Menu, Moon, Sun } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Brand } from './components/Brand';
import { ChatView } from './components/ChatView';
import { Landing } from './components/Landing';
import { Sidebar } from './components/Sidebar';
import { Toast, type ToastData } from './components/Toast';
import { api } from './lib/api';
import type { Chat, ChatSummary } from './types';

export default function App() {
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [dark, setDark] = useState(() => localStorage.getItem('studytube-theme') === 'dark');
  const timerRef = useRef<number | null>(null);

  const notify = (message: string, type: ToastData['type'] = 'error') => {
    const item = { id: Date.now(), message, type };
    setToast(item);
    window.setTimeout(() => setToast((current) => current?.id === item.id ? null : current), 4500);
  };
  const refreshChats = useCallback(async () => {
    try { setChats((await api.listChats()).chats); } catch (error) { notify((error as Error).message); }
  }, []);
  useEffect(() => { void refreshChats(); }, [refreshChats]);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('studytube-theme', dark ? 'dark' : 'light');
  }, [dark]);

  const openChat = async (id: string) => {
    try { setActiveChat((await api.getChat(id)).chat); } catch (error) { notify((error as Error).message); }
  };
  const analyze = async (url: string) => {
    setLoading(true);
    setProgress(0);
    timerRef.current = window.setInterval(() => setProgress((current) => Math.min(current + 1, 3)), 1700);
    try {
      const processed = await api.processVideo(url);
      const created = await api.createChat(processed.video.id);
      await Promise.all([openChat(created.chat.id), refreshChats()]);
      notify(processed.reused ? 'This video was already indexed—ready to chat.' : 'Knowledge base ready. Ask away!', 'success');
    } catch (error) {
      notify((error as Error).message);
    } finally {
      if (timerRef.current) window.clearInterval(timerRef.current);
      setProgress(0);
      setLoading(false);
    }
  };
  const send = async (question: string) => {
    if (!activeChat) return false;
    const optimistic = { id: `pending-${Date.now()}`, role: 'user' as const, content: question, sources: [], createdAt: new Date().toISOString() };
    setActiveChat({ ...activeChat, messages: [...activeChat.messages, optimistic] });
    setSending(true);
    try {
      const result = await api.sendMessage(activeChat.id, question);
      setActiveChat((current) => current ? { ...current, messages: [...current.messages.filter((message) => message.id !== optimistic.id), result.user, result.assistant] } : current);
      await refreshChats();
      return true;
    } catch (error) {
      setActiveChat((current) => current ? { ...current, messages: current.messages.filter((message) => message.id !== optimistic.id) } : current);
      notify((error as Error).message);
      return false;
    } finally { setSending(false); }
  };
  const remove = async (id: string) => {
    if (!window.confirm('Delete this conversation? This cannot be undone.')) return;
    try {
      await api.deleteChat(id);
      if (activeChat?.id === id) setActiveChat(null);
      await refreshChats();
      notify('Conversation deleted.', 'success');
    } catch (error) { notify((error as Error).message); }
  };
  const rename = async (id: string, title: string) => {
    try {
      await api.renameChat(id, title);
      if (activeChat?.id === id) setActiveChat({ ...activeChat, title });
      await refreshChats();
    } catch (error) { notify((error as Error).message); }
  };

  return (
    <div className="flex h-dvh overflow-hidden bg-cream text-ink antialiased dark:bg-[#1c1a2c] dark:text-slate-100">
      <Sidebar chats={chats} activeId={activeChat?.id ?? null} open={sidebarOpen} onClose={() => setSidebarOpen(false)} onNewVideo={() => setActiveChat(null)} onSelect={(id) => void openChat(id)} onDelete={(id) => void remove(id)} onRename={(id, title) => void rename(id, title)} />
      {activeChat ? (
        <ChatView chat={activeChat} sending={sending} dark={dark} onToggleTheme={() => setDark(!dark)} onMenu={() => setSidebarOpen(true)} onNewVideo={() => setActiveChat(null)} onSend={send} />
      ) : (
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-black/[0.05] px-4 dark:border-white/[0.06] sm:px-7">
            <div className="flex items-center gap-3 lg:hidden"><button onClick={() => setSidebarOpen(true)} className="rounded-xl p-2 hover:bg-black/5" aria-label="Open sidebar"><Menu size={20} /></button><Brand compact /></div>
            <span className="hidden text-xs font-semibold text-slate-400 lg:block">AI-powered video learning</span>
            <button onClick={() => setDark(!dark)} className="rounded-xl border border-black/[0.06] bg-white p-2.5 text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300" aria-label="Toggle theme">{dark ? <Sun size={17} /> : <Moon size={17} />}</button>
          </header>
          <Landing onAnalyze={(url) => void analyze(url)} loading={loading} progress={progress} />
        </div>
      )}
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
