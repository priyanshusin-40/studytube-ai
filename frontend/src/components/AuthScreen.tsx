import { ArrowRight, Captions, DatabaseZap, Eye, EyeOff, LockKeyhole, MessageCircleQuestion, Sparkles } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { Brand } from './Brand';

export function AuthScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (mode === 'register' && password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      if (mode === 'register') await register(name, email, password);
      else await login(email, password);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-cream text-ink dark:bg-[#1c1a2c] dark:text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-28 top-16 h-96 w-96 rounded-full bg-violet/15 blur-3xl" />
        <div className="absolute -bottom-20 left-0 h-80 w-80 rounded-full bg-coral/10 blur-3xl" />
        <div className="dot-grid absolute inset-0 opacity-35 dark:opacity-10" />
      </div>
      <header className="relative mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-5 sm:px-8 lg:px-12">
        <Brand />
        <nav className="hidden items-center gap-6 text-xs font-semibold text-slate-500 md:flex"><a href="#home" className="hover:text-violet">Home</a><a href="#features" className="hover:text-violet">Features</a><a href="#about" className="hover:text-violet">About</a></nav>
        <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }} className="min-h-11 rounded-xl border border-black/10 bg-white/70 px-4 text-xs font-bold backdrop-blur hover:border-violet/40 hover:text-violet dark:border-white/10 dark:bg-white/5">{mode === 'login' ? 'Create account' : 'Sign in'}</button>
      </header>
      <main className="relative mx-auto grid w-full max-w-7xl items-center gap-10 px-4 pb-12 pt-5 sm:px-8 lg:min-h-[calc(100dvh-88px)] lg:grid-cols-[1.15fr_.85fr] lg:gap-16 lg:px-12 lg:pb-20">
        <section id="home" className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet/20 bg-violet/[0.08] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-violet sm:text-xs"><Sparkles size={14} /> Your private AI study workspace</div>
          <h1 className="mt-6 font-display text-4xl font-bold leading-[1.05] tracking-[-0.045em] sm:text-6xl lg:text-7xl">Turn video into<br /><span className="text-violet">understanding.</span></h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">Build a searchable knowledge base from any accessible YouTube video, then ask grounded questions with links to the exact moments that matter.</p>
          <div id="features" className="mt-8 grid scroll-mt-24 gap-3 sm:grid-cols-3">
            {[[Captions, 'Transcript aware'], [DatabaseZap, 'Semantic search'], [MessageCircleQuestion, 'Grounded chat']].map(([Icon, label]) => {
              const ItemIcon = Icon as typeof Captions;
              return <div key={label as string} className="flex items-center gap-3 rounded-2xl border border-black/[0.06] bg-white/60 p-4 text-xs font-bold backdrop-blur dark:border-white/10 dark:bg-white/5"><ItemIcon className="text-violet" size={18} />{label as string}</div>;
            })}
          </div>
        </section>
        <section className="mx-auto w-full max-w-md rounded-[30px] border border-black/[0.07] bg-white/90 p-5 shadow-lift backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.07] sm:p-8">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-violet/10 text-violet"><LockKeyhole size={22} /></div>
          <h2 className="mt-5 font-display text-2xl font-bold">{mode === 'login' ? 'Welcome back' : 'Create your workspace'}</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{mode === 'login' ? 'Sign in to continue your video conversations.' : 'Your videos and conversations stay isolated to your account.'}</p>
          <form onSubmit={submit} className="mt-7 space-y-4">
            {mode === 'register' && <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">Name<input autoComplete="name" required minLength={2} maxLength={80} value={name} onChange={(event) => setName(event.target.value)} className="mt-2 h-12 w-full rounded-2xl border border-black/10 bg-white px-4 text-sm font-normal outline-none focus:border-violet dark:border-white/10 dark:bg-white/5" placeholder="Your name" /></label>}
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">Email<input autoComplete="email" required type="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 h-12 w-full rounded-2xl border border-black/10 bg-white px-4 text-sm font-normal outline-none focus:border-violet dark:border-white/10 dark:bg-white/5" placeholder="you@example.com" /></label>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">Password<span className="relative mt-2 block"><input autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required type={showPassword ? 'text' : 'password'} minLength={8} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} className="h-12 w-full rounded-2xl border border-black/10 bg-white px-4 pr-12 text-sm font-normal outline-none focus:border-violet dark:border-white/10 dark:bg-white/5" placeholder="At least 8 characters" /><button type="button" onClick={() => setShowPassword((current) => !current)} className="absolute right-1 top-0 grid h-12 w-11 place-items-center text-slate-400 hover:text-violet" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>
            {mode === 'register' && <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">Confirm password<input autoComplete="new-password" required type={showPassword ? 'text' : 'password'} minLength={8} maxLength={128} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="mt-2 h-12 w-full rounded-2xl border border-black/10 bg-white px-4 text-sm font-normal outline-none focus:border-violet dark:border-white/10 dark:bg-white/5" placeholder="Repeat your password" /></label>}
            {error && <p role="alert" className="rounded-xl bg-coral/10 px-3 py-2 text-xs font-semibold text-coral">{error}</p>}
            <button disabled={busy} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-ink px-5 text-sm font-bold text-white transition hover:bg-violet disabled:opacity-50 dark:bg-white dark:text-ink dark:hover:bg-violet dark:hover:text-white">{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}{!busy && <ArrowRight size={17} />}</button>
          </form>
          <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }} className="mt-5 min-h-11 w-full text-xs font-semibold text-slate-500 hover:text-violet">{mode === 'login' ? 'New here? Create an account' : 'Already have an account? Sign in'}</button>
        </section>
      </main>
      <footer id="about" className="relative mx-auto max-w-7xl px-4 pb-8 text-center text-[11px] leading-5 text-slate-400 sm:px-8">StudyTube uses captions when available, automatic audio transcription when needed, and grounded Gemini answers with timestamped sources.</footer>
    </div>
  );
}

export function AuthLoading() {
  return <div className="grid min-h-dvh place-items-center bg-cream dark:bg-[#1c1a2c]"><div className="h-9 w-9 animate-spin rounded-full border-2 border-violet/20 border-t-violet" aria-label="Loading account" /></div>;
}
