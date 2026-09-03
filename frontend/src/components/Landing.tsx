import { ArrowRight, Captions, DatabaseZap, Link2, MessageCircleQuestion, PlayCircle, Sparkles } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { Video } from '../types';
import { ProgressCard } from './ProgressCard';

interface Props {
  videos: Video[];
  userName: string;
  onOpenVideo: (id: string) => void;
  onAnalyze: (url: string) => void;
  loading: boolean;
}

export function Landing({ videos, userName, onOpenVideo, onAnalyze, loading }: Props) {
  const [url, setUrl] = useState('');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (url.trim()) onAnalyze(url.trim());
  };

  return (
    <main className="relative flex min-w-0 flex-1">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-24 top-10 h-80 w-80 rounded-full bg-violet/10 blur-3xl dark:bg-violet/15" />
        <div className="absolute bottom-0 left-[15%] h-72 w-72 rounded-full bg-coral/10 blur-3xl" />
        <div className="dot-grid absolute inset-0 opacity-40 dark:opacity-10" />
      </div>
      <div className="relative mx-auto flex w-full max-w-6xl flex-col justify-start px-4 py-10 sm:px-10 sm:py-14 lg:justify-center lg:py-20">
        <div className="mx-auto max-w-4xl text-center">
          <p className="mb-3 text-sm font-semibold text-slate-500 dark:text-slate-300">Welcome back, {userName}</p>
          <div className="mb-6 inline-flex max-w-full items-center gap-2 rounded-full border border-violet/20 bg-violet/[0.07] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-violet dark:bg-violet/15 sm:mb-7 sm:px-4 sm:text-xs sm:tracking-[0.15em]">
            <Sparkles size={14} /> Learn at the speed of curiosity
          </div>
          <h1 className="font-display text-[2.35rem] font-bold leading-[1.05] tracking-[-0.045em] text-ink dark:text-white sm:text-6xl lg:text-7xl">
            Turn any video into<span className="hidden sm:inline"><br /></span>{' '}<span className="text-violet">a conversation.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">
            Paste a YouTube video. StudyTube uses captions when available and can transcribe spoken audio when they are not, then gives you grounded answers with exact moments to revisit.
          </p>

          {!loading ? (
            <form onSubmit={submit} className="mx-auto mt-9 flex max-w-2xl flex-col gap-3 rounded-[28px] border border-black/[0.07] bg-white p-2.5 shadow-lift dark:border-white/10 dark:bg-white/[0.07] sm:flex-row">
              <label className="flex min-w-0 flex-1 items-center gap-3 px-3">
                <Link2 className="shrink-0 text-slate-400" size={20} />
                <span className="sr-only">YouTube URL</span>
                <input
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  type="url"
                  required
                  placeholder="Paste a YouTube URL"
                  className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                />
              </label>
              <button disabled={!url.trim()} className="group flex h-12 items-center justify-center gap-2 rounded-[20px] bg-ink px-6 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-violet disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-ink dark:hover:bg-violet dark:hover:text-white">
                Process video <ArrowRight size={17} className="transition group-hover:translate-x-0.5" />
              </button>
            </form>
          ) : <ProgressCard />}
        </div>

        {!loading && (
          <div className="mx-auto mt-10 grid max-w-4xl gap-3 sm:mt-16 sm:grid-cols-3">
            {[
              [Captions, 'Transcript aware', 'Captions or spoken audio are processed while preserving real timestamps.'],
              [DatabaseZap, 'Semantic recall', 'Only the moments most relevant to your question reach the AI.'],
              [MessageCircleQuestion, 'Grounded answers', 'Each response links back to the exact source moments.'],
            ].map(([Icon, title, description]) => {
              const FeatureIcon = Icon as typeof Captions;
              return (
                <div key={title as string} className="rounded-3xl border border-black/[0.05] bg-white/60 p-5 text-left backdrop-blur transition hover:-translate-y-1 hover:bg-white dark:border-white/[0.07] dark:bg-white/[0.035] dark:hover:bg-white/[0.06]">
                  <FeatureIcon size={21} className="mb-4 text-violet" />
                  <h2 className="font-display text-sm font-bold">{title as string}</h2>
                  <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{description as string}</p>
                </div>
              );
            })}
          </div>
        )}
        {!loading && videos.length > 0 && (
          <section className="mx-auto mt-12 w-full max-w-4xl sm:mt-16">
            <div className="mb-4 flex items-end justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet">Your library</p><h2 className="mt-1 font-display text-xl font-bold">Continue learning</h2></div><span className="text-xs text-slate-400">{videos.length} video{videos.length === 1 ? '' : 's'}</span></div>
            <div className="grid gap-3 sm:grid-cols-2">
              {videos.slice(0, 4).map((video) => (
                <button key={video.id} onClick={() => onOpenVideo(video.id)} className="group flex min-w-0 items-center gap-3 rounded-2xl border border-black/[0.06] bg-white/70 p-3 text-left backdrop-blur transition hover:-translate-y-0.5 hover:border-violet/25 dark:border-white/[0.08] dark:bg-white/[0.04]">
                  {video.thumbnailUrl ? <img src={video.thumbnailUrl} alt="" className="h-14 w-24 shrink-0 rounded-xl object-cover" /> : <div className="grid h-14 w-24 shrink-0 place-items-center rounded-xl bg-violet/10 text-violet"><PlayCircle size={20} /></div>}
                  <span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold group-hover:text-violet">{video.title}</span><span className="mt-1 block truncate text-[10px] text-slate-400">{new Date(video.updatedAt).toLocaleDateString()} · {video.transcriptSource === 'gemini-audio' ? 'Audio transcript' : 'Captions'} · {video.transcriptStatus}</span></span>
                  <ArrowRight className="shrink-0 text-slate-300 group-hover:text-violet" size={16} />
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
