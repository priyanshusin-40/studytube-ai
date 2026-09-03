import { Menu, Moon, Sun } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Brand } from './components/Brand';
import { AuthLoading, AuthScreen } from './components/AuthScreen';
import { ChatView } from './components/ChatView';
import { Landing } from './components/Landing';
import { Sidebar } from './components/Sidebar';
import { Toast, type ToastData } from './components/Toast';
import { useAuth } from './context/AuthContext';
import { api } from './lib/api';
import type { Chat, ChatSummary, Video } from './types';

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <AuthLoading />;
  if (!user) return <AuthScreen />;
  return <Workspace />;
}

function Workspace() {
  const { user, logout } = useAuth();
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [dark, setDark] = useState(() => localStorage.getItem('studytube-theme') === 'dark');

  const notify = useCallback((message: string, type: ToastData['type'] = 'error') => {
    const item = { id: Date.now(), message, type };
    setToast(item);
    window.setTimeout(() => setToast((current) => current?.id === item.id ? null : current), 4500);
  }, []);
  const refreshChats = useCallback(async () => {
    try { setChats((await api.listChats()).chats); } catch (error) { notify((error as Error).message); }
  }, [notify]);
  const refreshVideos = useCallback(async () => {
    try { setVideos((await api.listVideos()).videos); } catch (error) { notify((error as Error).message); }
  }, [notify]);
  useEffect(() => { void Promise.all([refreshChats(), refreshVideos()]); }, [refreshChats, refreshVideos]);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('studytube-theme', dark ? 'dark' : 'light');
  }, [dark]);

  const openChat = async (id: string) => {
    try { setActiveChat((await api.getChat(id)).chat); } catch (error) { notify((error as Error).message); }
  };
  const analyze = async (url: string) => {
    setLoading(true);
    try {
      const processed = await api.processVideo(url);
      const created = await api.createChat(processed.video.id);
      await Promise.all([openChat(created.chat.id), refreshChats(), refreshVideos()]);
      notify(processed.reused ? 'This video was already indexed—ready to chat.' : 'Knowledge base ready. Ask away!', 'success');
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setLoading(false);
    }
  };
  const openVideo = async (videoId: string) => {
    try {
      const created = await api.createChat(videoId);
      await Promise.all([openChat(created.chat.id), refreshChats()]);
    } catch (error) { notify((error as Error).message); }
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
    <div className={`flex min-w-0 bg-cream text-ink antialiased dark:bg-[#1c1a2c] dark:text-slate-100 ${activeChat ? 'h-dvh overflow-hidden' : 'min-h-dvh'}`}>
      <Sidebar user={user!} chats={chats} activeId={activeChat?.id ?? null} open={sidebarOpen} collapsed={sidebarCollapsed} onClose={() => setSidebarOpen(false)} onToggleCollapse={() => setSidebarCollapsed((current) => !current)} onNewVideo={() => setActiveChat(null)} onSelect={(id) => void openChat(id)} onDelete={(id) => void remove(id)} onRename={(id, title) => void rename(id, title)} onLogout={() => void logout()} />
      {activeChat ? (
        <ChatView chat={activeChat} sending={sending} dark={dark} onToggleTheme={() => setDark(!dark)} onMenu={() => setSidebarOpen(true)} onNewVideo={() => setActiveChat(null)} onSend={send} />
      ) : (
        <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-[72px] shrink-0 items-center justify-between border-b border-black/[0.05] bg-cream/85 px-4 backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#1c1a2c]/85 sm:px-7">
            <div className="flex items-center gap-2 lg:hidden"><button onClick={() => setSidebarOpen(true)} className="grid min-h-11 min-w-11 place-items-center rounded-xl hover:bg-black/5" aria-label="Open sidebar"><Menu size={20} /></button><Brand compact /></div>
            <span className="hidden text-xs font-semibold text-slate-400 lg:block">AI-powered video learning</span>
            <button onClick={() => setDark(!dark)} className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-black/[0.06] bg-white text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300" aria-label="Toggle theme">{dark ? <Sun size={17} /> : <Moon size={17} />}</button>
          </header>
          <Landing videos={videos} userName={user!.name} onOpenVideo={(id) => void openVideo(id)} onAnalyze={(url) => void analyze(url)} loading={loading} />
        </div>
      )}
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
