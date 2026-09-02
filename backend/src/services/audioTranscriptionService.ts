import { mkdtemp, readdir, rm, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { extname, join } from 'node:path';
import { ApiError, createPartFromUri, createUserContent, type GenerateContentResponse } from '@google/genai';
import { env } from '../config/env.js';
import type { TranscriptSegment } from '../types/index.js';
import { AppError } from '../utils/appError.js';
import { safeErrorForLog } from '../utils/logging.js';
import { canonicalYouTubeUrl } from '../utils/youtube.js';
import { geminiClient, normalizeGeminiError } from './geminiClient.js';

interface YtDlpMetadata {
  duration?: number;
}

type YtDlpRunner = (
  url: string,
  flags?: Record<string, string | number | boolean>,
  options?: Record<string, unknown>,
) => Promise<unknown>;

interface TimedWord {
  text: string;
  start: number;
  end: number;
}

const require = createRequire(import.meta.url);
const ytDlp = require('yt-dlp-exec') as YtDlpRunner;

export function youtubeDownloaderBaseFlags(): Record<string, string | number | boolean> {
  return {
    noPlaylist: true,
    noWarnings: true,
    socketTimeout: 20,
    // Current YouTube extraction requires an external JavaScript challenge
    // runtime. Reuse the exact Node executable already running the backend so
    // this also works when a hosting provider does not expose `node` on PATH.
    jsRuntimes: `node:${process.execPath}`,
  };
}

const MIME_TYPES: Record<string, string> = {
  '.aac': 'audio/aac',
  '.aiff': 'audio/aiff',
  '.flac': 'audio/flac',
  '.m4a': 'audio/m4a',
  '.mp3': 'audio/mp3',
  '.mpeg': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.opus': 'audio/opus',
  '.wav': 'audio/wav',
  '.webm': 'audio/webm',
};

export function parseGeminiOffset(value: string | undefined): number | null {
  if (!value) return null;
  const match = value.trim().match(/^(\d+(?:\.\d+)?)s$/);
  if (!match?.[1]) return null;
  const seconds = Number(match[1]);
  return Number.isFinite(seconds) ? seconds : null;
}

function joinWords(words: string[]): string {
  return words
    .join(' ')
    .replace(/\s+([,.;:!?%])/g, '$1')
    .replace(/([([{])\s+/g, '$1')
    .trim();
}

export function groupTimedWords(words: TimedWord[]): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
  let current: TimedWord[] = [];

  const flush = () => {
    if (current.length === 0) return;
    const first = current[0]!;
    const last = current[current.length - 1]!;
    const text = joinWords(current.map((word) => word.text));
    if (text) {
      segments.push({
        text,
        start: first.start,
        duration: Math.round(Math.max(0.01, last.end - first.start) * 1000) / 1000,
      });
    }
    current = [];
  };

  for (const word of words) {
    current.push(word);
    const textLength = current.reduce((total, item) => total + item.text.length + 1, 0);
    const duration = word.end - current[0]!.start;
    const sentenceEnd = /[.!?]$/.test(word.text) && current.length >= 8;
    if (textLength >= 240 || duration >= 15 || sentenceEnd) flush();
  }
  flush();
  return segments;
}

export function extractTimedTranscript(response: GenerateContentResponse): TranscriptSegment[] {
  const words: TimedWord[] = [];
  for (const candidate of response.candidates ?? []) {
    for (const part of candidate.content?.parts ?? []) {
      for (const word of part.audioTranscription?.words ?? []) {
        const start = parseGeminiOffset(word.startOffset);
        const end = parseGeminiOffset(word.endOffset);
        const text = word.word?.trim();
        if (text && start !== null && end !== null && end >= start) words.push({ text, start, end });
      }
    }
  }
  return groupTimedWords(words.sort((left, right) => left.start - right.start));
}

export function parseStructuredTranscript(value: string | undefined): TranscriptSegment[] {
  if (!value) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  return parsed
    .flatMap((item): TranscriptSegment[] => {
      if (!item || typeof item !== 'object') return [];
      const candidate = item as Record<string, unknown>;
      const text = typeof candidate.text === 'string' ? candidate.text.trim() : '';
      const start = Number(candidate.start);
      const duration = Number(candidate.duration);
      if (!text || !Number.isFinite(start) || start < 0 || !Number.isFinite(duration) || duration <= 0) return [];
      return [{ text, start, duration }];
    })
    .sort((left, right) => left.start - right.start);
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function transcribePublicYouTubeUrl(videoId: string): Promise<TranscriptSegment[]> {
  const url = canonicalYouTubeUrl(videoId);
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await geminiClient.models.generateContent({
        model: env.GEMINI_VIDEO_MODEL,
        contents: [
          { fileData: { fileUri: url } },
          {
            text: [
              'Listen carefully to the complete audio track and transcribe every intelligible spoken utterance.',
              'Include isolated words, single numbers, and very short speech. Do not summarize.',
              'Return timestamped segments no longer than 15 seconds and use the actual video timeline.',
              'Exclude descriptions of visuals, music, sound effects, and silence.',
              'Return an empty array only after checking the entire audio and finding no speech.',
            ].join(' '),
          },
        ],
        config: {
          responseMimeType: 'application/json',
          responseJsonSchema: {
            type: 'array',
            items: {
              type: 'object',
              required: ['text', 'start', 'duration'],
              properties: {
                text: { type: 'string' },
                start: { type: 'number' },
                duration: { type: 'number' },
              },
            },
          },
        },
      });
      const transcript = parseStructuredTranscript(response.text);
      if (transcript.some((segment) => segment.start + segment.duration > env.AUDIO_FALLBACK_MAX_SECONDS)) {
        throw new AppError(
          `Audio fallback supports videos up to ${Math.floor(env.AUDIO_FALLBACK_MAX_SECONDS / 60)} minutes.`,
          413,
          'AUDIO_TOO_LONG',
        );
      }
      if (transcript.length === 0) {
        throw new AppError(
          'No intelligible speech was found in this public video.',
          422,
          'SPEECH_TO_TEXT_EMPTY',
        );
      }
      return transcript;
    } catch (error) {
      if (error instanceof AppError) throw error;
      lastError = error;
      const retryable = error instanceof ApiError && [500, 502, 503, 504].includes(error.status);
      if (!retryable || attempt === 2) break;
      await wait(750 * (2 ** attempt));
    }
  }

  throw normalizeGeminiError(lastError, 'public YouTube transcription');
}

async function findDownloadedAudio(directory: string): Promise<{ path: string; mimeType: string }> {
  const files = await readdir(directory);
  for (const file of files) {
    const extension = extname(file).toLowerCase();
    const mimeType = MIME_TYPES[extension];
    if (!mimeType) continue;
    const path = join(directory, file);
    const details = await stat(path);
    if (details.size > 0 && details.size <= env.AUDIO_FALLBACK_MAX_BYTES) return { path, mimeType };
    if (details.size > env.AUDIO_FALLBACK_MAX_BYTES) {
      throw new AppError(
        'This video audio is too large for the transcription fallback.',
        413,
        'AUDIO_TOO_LARGE',
      );
    }
  }
  throw new AppError(
    'YouTube did not provide a supported audio stream for this video.',
    422,
    'AUDIO_EXTRACTION_FAILED',
  );
}

export async function transcribeYouTubeAudio(videoId: string): Promise<TranscriptSegment[]> {
  const directory = await mkdtemp(join(tmpdir(), 'studytube-audio-'));
  let uploadedFileName: string | undefined;
  try {
    const url = canonicalYouTubeUrl(videoId);
    let metadata: YtDlpMetadata;
    try {
      metadata = await ytDlp(url, {
        ...youtubeDownloaderBaseFlags(),
        dumpSingleJson: true,
        skipDownload: true,
      }) as YtDlpMetadata;
    } catch (error) {
      console.error('YouTube audio metadata lookup failed:', safeErrorForLog(error));
      return transcribePublicYouTubeUrl(videoId);
    }

    const duration = Number(metadata.duration);
    if (!Number.isFinite(duration) || duration <= 0) {
      throw new AppError(
        'The video duration could not be verified, so audio fallback was stopped safely.',
        422,
        'AUDIO_DURATION_UNKNOWN',
      );
    }
    if (duration > env.AUDIO_FALLBACK_MAX_SECONDS) {
      throw new AppError(
        `Audio fallback supports videos up to ${Math.floor(env.AUDIO_FALLBACK_MAX_SECONDS / 60)} minutes.`,
        413,
        'AUDIO_TOO_LONG',
      );
    }

    try {
      await ytDlp(url, {
        ...youtubeDownloaderBaseFlags(),
        format: 'bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio',
        output: join(directory, 'audio.%(ext)s'),
        noProgress: true,
        quiet: true,
        maxFilesize: env.AUDIO_FALLBACK_MAX_BYTES,
        retries: 2,
      });
    } catch (error) {
      console.error('YouTube audio extraction failed:', safeErrorForLog(error));
      return transcribePublicYouTubeUrl(videoId);
    }

    const audio = await findDownloadedAudio(directory);
    try {
      const uploaded = await geminiClient.files.upload({
        file: audio.path,
        config: { mimeType: audio.mimeType, displayName: `studytube-${videoId}` },
      });
      uploadedFileName = uploaded.name;
      if (!uploaded.uri || !uploaded.mimeType) {
        throw new AppError('Gemini did not accept the extracted audio file.', 502, 'SPEECH_TO_TEXT_FAILED');
      }

      const response = await geminiClient.models.generateContent({
        model: env.GEMINI_TRANSCRIPTION_MODEL,
        contents: createUserContent([createPartFromUri(uploaded.uri, uploaded.mimeType)]),
        config: {
          audioTranscriptionConfig: {
            wordTimestamp: true,
          },
        },
      });
      const transcript = extractTimedTranscript(response);
      if (transcript.length === 0) {
        console.error('Gemini transcription contained no timed words:', {
          candidates: response.candidates?.map((candidate) => ({
            finishReason: candidate.finishReason,
            partFields: candidate.content?.parts?.map((part) => Object.keys(part)),
          })),
        });
        throw new AppError(
          'Gemini could not produce a timestamped speech transcript for this video.',
          422,
          'SPEECH_TO_TEXT_EMPTY',
        );
      }
      return transcript;
    } catch (error) {
      if (error instanceof AppError) throw error;
      const normalized = normalizeGeminiError(error, 'audio transcription');
      if (normalized.code === 'AI_CONFIGURATION_ERROR' || normalized.code === 'AI_RATE_LIMIT') throw normalized;
      throw new AppError(
        'The audio was extracted, but Gemini could not transcribe it.',
        502,
        'SPEECH_TO_TEXT_FAILED',
      );
    }
  } finally {
    if (uploadedFileName) {
      try {
        await geminiClient.files.delete({ name: uploadedFileName });
      } catch (error) {
        console.error('Temporary Gemini file cleanup failed:', safeErrorForLog(error));
      }
    }
    await rm(directory, { recursive: true, force: true });
  }
}
