import { AppError } from './appError.js';

const VIDEO_ID_PATTERN = /^[\w-]{11}$/;
const ALLOWED_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
  'www.youtu.be',
]);

export function extractYouTubeId(input: string): string {
  const value = input.trim();
  if (VIDEO_ID_PATTERN.test(value)) return value;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new AppError('Please enter a valid YouTube URL.', 400, 'INVALID_YOUTUBE_URL');
  }

  const host = url.hostname.toLowerCase();
  if (!ALLOWED_HOSTS.has(host)) {
    throw new AppError('Please enter a valid YouTube URL.', 400, 'INVALID_YOUTUBE_URL');
  }

  let id: string | null = null;
  if (host.endsWith('youtu.be')) id = url.pathname.split('/').filter(Boolean)[0] ?? null;
  else if (url.pathname === '/watch') id = url.searchParams.get('v');
  else {
    const match = url.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]{11})/);
    id = match?.[1] ?? null;
  }

  if (!id || !VIDEO_ID_PATTERN.test(id)) {
    throw new AppError('This YouTube URL does not contain a valid video ID.', 400, 'INVALID_YOUTUBE_URL');
  }

  return id;
}

export function canonicalYouTubeUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function timestampUrl(videoId: string, seconds: number): string {
  return `${canonicalYouTubeUrl(videoId)}&t=${Math.max(0, Math.floor(seconds))}s`;
}
