import { mkdtemp, readdir, rm, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { extname, join } from 'node:path';
import { createPartFromUri, createUserContent, type GenerateContentResponse } from '@google/genai';
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
        dumpSingleJson: true,
        skipDownload: true,
        noPlaylist: true,
        noWarnings: true,
        socketTimeout: 20,
      }) as YtDlpMetadata;
    } catch (error) {
      console.error('YouTube audio metadata lookup failed:', safeErrorForLog(error));
      throw new AppError(
        'The video is unavailable or its audio cannot be accessed.',
        422,
        'AUDIO_EXTRACTION_FAILED',
      );
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
        format: 'bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio',
        output: join(directory, 'audio.%(ext)s'),
        noPlaylist: true,
        noWarnings: true,
        noProgress: true,
        quiet: true,
        maxFilesize: env.AUDIO_FALLBACK_MAX_BYTES,
        retries: 2,
        socketTimeout: 20,
      });
    } catch (error) {
      console.error('YouTube audio extraction failed:', safeErrorForLog(error));
      throw new AppError(
        'Captions were unavailable and the video audio could not be extracted.',
        422,
        'AUDIO_EXTRACTION_FAILED',
      );
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
