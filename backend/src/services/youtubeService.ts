import { YoutubeTranscript } from 'youtube-transcript';
import { env } from '../config/env.js';
import type { TranscriptSegment } from '../types/index.js';
import { AppError } from '../utils/appError.js';
import { canonicalYouTubeUrl, extractYouTubeId } from '../utils/youtube.js';
import { transcribeYouTubeAudio } from './audioTranscriptionService.js';

interface OEmbedResponse {
  title: string;
  author_name: string;
  thumbnail_url: string;
}

export interface YouTubeVideoData {
  youtubeId: string;
  url: string;
  title: string;
  channelName: string | null;
  thumbnailUrl: string;
  transcript: TranscriptSegment[];
  transcriptSource: 'captions' | 'gemini-audio';
}

export function normalizeTranscriptTiming(
  raw: Array<{ text: string; offset: number; duration: number }>,
): TranscriptSegment[] {
  const sortedDurations = raw.map((item) => Number(item.duration)).filter(Number.isFinite).sort((a, b) => a - b);
  const medianDuration = sortedDurations[Math.floor(sortedDurations.length / 2)] ?? 0;
  // youtube-transcript supports both srv3 (milliseconds) and classic XML (seconds).
  const divisor = medianDuration > 100 ? 1000 : 1;
  return raw.map((segment) => ({
    text: segment.text,
    start: Number(segment.offset) / divisor,
    duration: Number(segment.duration) / divisor,
  }));
}

async function fetchMetadata(
  url: string,
  videoId: string,
): Promise<Omit<YouTubeVideoData, 'transcript' | 'transcriptSource'>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const endpoint = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const response = await fetch(endpoint, { signal: controller.signal });
    if (!response.ok) {
      if (response.status === 404) throw new AppError('The YouTube video could not be found.', 404, 'VIDEO_NOT_FOUND');
      throw new Error(`YouTube oEmbed responded with ${response.status}`);
    }
    const metadata = (await response.json()) as OEmbedResponse;
    return {
      youtubeId: videoId,
      url,
      title: metadata.title,
      channelName: metadata.author_name || null,
      thumbnailUrl: metadata.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    return {
      youtubeId: videoId,
      url,
      title: `YouTube video ${videoId}`,
      channelName: null,
      thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function getYouTubeVideo(inputUrl: string): Promise<YouTubeVideoData> {
  const youtubeId = extractYouTubeId(inputUrl);
  const url = canonicalYouTubeUrl(youtubeId);
  const metadataPromise = fetchMetadata(url, youtubeId);

  try {
    const raw = await YoutubeTranscript.fetchTranscript(youtubeId);
    const transcript = normalizeTranscriptTiming(raw);
    const totalChars = transcript.reduce((sum, segment) => sum + segment.text.length, 0);
    if (transcript.length === 0) throw new Error('Empty transcript');
    if (totalChars > env.MAX_TRANSCRIPT_CHARS) {
      throw new AppError(
        'This transcript is too long to process safely.',
        413,
        'TRANSCRIPT_TOO_LONG',
      );
    }
    return { ...(await metadataPromise), transcript, transcriptSource: 'captions' };
  } catch (error) {
    if (error instanceof AppError) throw error;
    const metadata = await metadataPromise;
    if (!env.AUDIO_FALLBACK_ENABLED) {
      throw new AppError('A transcript is not available for this video.', 422, 'TRANSCRIPT_UNAVAILABLE');
    }
    const transcript = await transcribeYouTubeAudio(youtubeId);
    const totalChars = transcript.reduce((sum, segment) => sum + segment.text.length, 0);
    if (totalChars > env.MAX_TRANSCRIPT_CHARS) {
      throw new AppError('This transcript is too long to process safely.', 413, 'TRANSCRIPT_TOO_LONG');
    }
    return { ...metadata, transcript, transcriptSource: 'gemini-audio' };
  }
}
