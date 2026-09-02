import { resolve } from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({
  path: [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../.env')],
  quiet: true,
});

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_URL: z.string().min(1).default('http://localhost:5173'),
  DATABASE_URL: z.string().min(1),
  GEMINI_API_KEY: z.string().min(1),
  GEMINI_CHAT_MODEL: z.string().default('gemini-3.5-flash'),
  GEMINI_EMBEDDING_MODEL: z.string().default('gemini-embedding-2'),
  GEMINI_EMBEDDING_DIMENSIONS: z.coerce.number().int().positive().default(1536),
  GEMINI_TRANSCRIPTION_MODEL: z.string().default('gemini-3.5-transcribe'),
  GEMINI_VIDEO_MODEL: z.string().default('gemini-3.6-flash'),
  AUDIO_FALLBACK_ENABLED: z.string().default('true').transform((value) => value.toLowerCase() === 'true'),
  AUDIO_FALLBACK_MAX_SECONDS: z.coerce.number().int().min(1).max(1800).default(1800),
  AUDIO_FALLBACK_MAX_BYTES: z.coerce.number().int().min(1).default(100 * 1024 * 1024),
  PROCESSING_LEASE_MS: z.coerce.number().int().min(60_000).default(45 * 60_000),
  CHUNK_SIZE: z.coerce.number().int().min(300).max(5000).default(1200),
  CHUNK_OVERLAP: z.coerce.number().int().min(0).default(200),
  TOP_K: z.coerce.number().int().min(1).max(20).default(5),
  EMBEDDING_BATCH_SIZE: z.coerce.number().int().min(1).max(2048).default(10),
  MAX_TRANSCRIPT_CHARS: z.coerce.number().int().positive().default(2_000_000),
  AI_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  AI_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const message = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('\n');
  throw new Error(`Invalid environment configuration:\n${message}`);
}

if (parsed.data.CHUNK_OVERLAP >= parsed.data.CHUNK_SIZE) {
  throw new Error('CHUNK_OVERLAP must be smaller than CHUNK_SIZE.');
}

if (parsed.data.GEMINI_EMBEDDING_DIMENSIONS !== 1536) {
  throw new Error('GEMINI_EMBEDDING_DIMENSIONS must be 1536 to match the pgvector database schema.');
}

export const env = parsed.data;

export const allowedClientOrigins = env.CLIENT_URL.split(',').map((origin) => {
  const normalized = origin.trim().replace(/\/$/, '');
  try {
    return new URL(normalized).origin;
  } catch {
    throw new Error(`CLIENT_URL contains an invalid origin: ${origin}`);
  }
});
