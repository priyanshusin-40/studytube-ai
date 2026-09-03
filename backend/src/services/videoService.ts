import { pool } from '../config/database.js';
import { env } from '../config/env.js';
import { mapVideo } from '../models/mappers.js';
import type { TranscriptChunk, VideoRecord } from '../types/index.js';
import { AppError } from '../utils/appError.js';
import { chunkTranscript } from '../utils/transcript.js';
import { canonicalYouTubeUrl, extractYouTubeId } from '../utils/youtube.js';
import { createDocumentEmbeddings } from './embeddingService.js';
import { toPgVector } from './vectorSearchService.js';
import { getYouTubeVideo } from './youtubeService.js';

function elapsed(startedAt: number): number {
  return Math.round(performance.now() - startedAt);
}

function logTiming(stage: string, startedAt: number, extra: Record<string, unknown> = {}) {
  console.info('[video-processing]', { stage, durationMs: elapsed(startedAt), ...extra });
}

async function attachVideo(userId: string, videoId: string): Promise<void> {
  await pool.query(
    `INSERT INTO user_videos (user_id, video_id) VALUES ($1, $2)
     ON CONFLICT (user_id, video_id) DO UPDATE SET last_opened_at = now()`,
    [userId, videoId],
  );
}

export async function listVideos(userId: string): Promise<VideoRecord[]> {
  const result = await pool.query(
    `SELECT v.* FROM user_videos uv JOIN videos v ON v.id = uv.video_id
      WHERE uv.user_id = $1 ORDER BY uv.last_opened_at DESC`,
    [userId],
  );
  return result.rows.map(mapVideo);
}

export async function getVideo(userId: string, id: string): Promise<VideoRecord> {
  const result = await pool.query(
    `SELECT v.* FROM user_videos uv JOIN videos v ON v.id = uv.video_id
      WHERE uv.user_id = $1 AND v.id = $2`,
    [userId, id],
  );
  const row = result.rows[0];
  if (!row) throw new AppError('Video not found.', 404, 'VIDEO_NOT_FOUND');
  return mapVideo(row);
}

function embeddingsAreCurrent(row: Record<string, unknown>): boolean {
  return row.transcript_status === 'ready' &&
    row.embedding_provider === 'google-gemini' &&
    row.embedding_model === env.GEMINI_EMBEDDING_MODEL &&
    Number(row.embedding_dimensions) === env.GEMINI_EMBEDDING_DIMENSIONS;
}

async function insertChunks(
  client: { query: typeof pool.query },
  videoId: string,
  chunks: TranscriptChunk[],
  embeddings: number[][],
): Promise<void> {
  const values: unknown[] = [];
  const tuples = chunks.map((chunk, index) => {
    const embedding = embeddings[index];
    if (!embedding) throw new AppError('An embedding was missing for a transcript chunk.', 502, 'INVALID_EMBEDDING');
    const offset = index * 6;
    values.push(videoId, chunk.chunkIndex, chunk.text, chunk.startTime, chunk.endTime, toPgVector(embedding));
    return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}::vector)`;
  });
  await client.query(
    `INSERT INTO transcript_chunks (video_id, chunk_index, text, start_time, end_time, embedding)
     VALUES ${tuples.join(',')}`,
    values,
  );
}

export async function processVideo(userId: string, inputUrl: string): Promise<{ video: VideoRecord; reused: boolean }> {
  const totalStartedAt = performance.now();
  const youtubeId = extractYouTubeId(inputUrl);
  let existing = await pool.query('SELECT * FROM videos WHERE youtube_id = $1', [youtubeId]);
  if (existing.rows[0] && embeddingsAreCurrent(existing.rows[0])) {
    await attachVideo(userId, String(existing.rows[0].id));
    logTiming('reuse', totalStartedAt);
    return { video: mapVideo(existing.rows[0]), reused: true };
  }
  if (
    existing.rows[0]?.transcript_status === 'processing' &&
    Date.now() - new Date(existing.rows[0].updated_at as string | Date).getTime() < env.PROCESSING_LEASE_MS
  ) {
    throw new AppError('This video is already being processed. Please try again shortly.', 409, 'VIDEO_PROCESSING');
  }

  let pending;
  if (existing.rows[0]) {
    pending = await pool.query(
      `UPDATE videos SET transcript_status = 'processing', error_message = NULL,
              embedding_provider = 'google-gemini', embedding_model = $2,
              embedding_dimensions = $3, updated_at = now()
        WHERE id = $1 RETURNING *`,
      [existing.rows[0].id, env.GEMINI_EMBEDDING_MODEL, env.GEMINI_EMBEDDING_DIMENSIONS],
    );
  } else {
    pending = await pool.query(
      `INSERT INTO videos (
         youtube_id, url, title, thumbnail_url, transcript_status,
         embedding_provider, embedding_model, embedding_dimensions
       ) VALUES ($1, $2, 'Preparing video…', $3, 'processing', 'google-gemini', $4, $5)
       ON CONFLICT (youtube_id) DO NOTHING RETURNING *`,
      [
        youtubeId,
        canonicalYouTubeUrl(youtubeId),
        `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`,
        env.GEMINI_EMBEDDING_MODEL,
        env.GEMINI_EMBEDDING_DIMENSIONS,
      ],
    );
    if (!pending.rows[0]) {
      existing = await pool.query('SELECT * FROM videos WHERE youtube_id = $1', [youtubeId]);
      if (existing.rows[0] && embeddingsAreCurrent(existing.rows[0])) {
        await attachVideo(userId, String(existing.rows[0].id));
        return { video: mapVideo(existing.rows[0]), reused: true };
      }
      throw new AppError('This video is already being processed. Please try again shortly.', 409, 'VIDEO_PROCESSING');
    }
  }
  const videoId = String(pending.rows[0]!.id);

  try {
    const extractionStartedAt = performance.now();
    const videoData = await getYouTubeVideo(inputUrl);
    logTiming('transcript', extractionStartedAt, { source: videoData.transcriptSource });
    await pool.query(
      `UPDATE videos SET url = $2, title = $3, channel_name = $4, thumbnail_url = $5,
              transcript_source = $6, updated_at = now() WHERE id = $1`,
      [videoId, videoData.url, videoData.title, videoData.channelName, videoData.thumbnailUrl, videoData.transcriptSource],
    );

    const chunkStartedAt = performance.now();
    const chunks = await chunkTranscript(videoData.transcript, env.CHUNK_SIZE, env.CHUNK_OVERLAP);
    if (chunks.length === 0) throw new AppError('The transcript did not contain usable text.', 422, 'EMPTY_TRANSCRIPT');
    logTiming('chunking', chunkStartedAt, { chunkCount: chunks.length });

    const embeddingStartedAt = performance.now();
    const embeddings = await createDocumentEmbeddings(chunks.map((chunk) => chunk.text));
    logTiming('embeddings', embeddingStartedAt, { chunkCount: chunks.length });

    const databaseStartedAt = performance.now();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM transcript_chunks WHERE video_id = $1', [videoId]);
      await insertChunks(client, videoId, chunks, embeddings);
      const ready = await client.query(
        `UPDATE videos SET transcript_status = 'ready', chunk_count = $2, transcript_source = $5,
            embedding_provider = 'google-gemini', embedding_model = $3, embedding_dimensions = $4,
            error_message = NULL, updated_at = now()
         WHERE id = $1 RETURNING *`,
        [videoId, chunks.length, env.GEMINI_EMBEDDING_MODEL, env.GEMINI_EMBEDDING_DIMENSIONS, videoData.transcriptSource],
      );
      await client.query(
        `INSERT INTO user_videos (user_id, video_id) VALUES ($1, $2)
         ON CONFLICT (user_id, video_id) DO UPDATE SET last_opened_at = now()`,
        [userId, videoId],
      );
      await client.query('COMMIT');
      logTiming('database', databaseStartedAt, { chunkCount: chunks.length });
      logTiming('complete', totalStartedAt, { chunkCount: chunks.length, source: videoData.transcriptSource });
      return { video: mapVideo(ready.rows[0]!), reused: false };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    await pool.query(
      `UPDATE videos SET transcript_status = 'failed', error_message = $2, updated_at = now() WHERE id = $1`,
      [videoId, error instanceof Error ? error.message.slice(0, 500) : 'Processing failed'],
    );
    throw error;
  }
}
