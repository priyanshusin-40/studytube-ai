import { pool } from '../config/database.js';
import { env } from '../config/env.js';
import { mapVideo } from '../models/mappers.js';
import type { VideoRecord } from '../types/index.js';
import { AppError } from '../utils/appError.js';
import { chunkTranscript } from '../utils/transcript.js';
import { extractYouTubeId } from '../utils/youtube.js';
import { createDocumentEmbeddings } from './embeddingService.js';
import { toPgVector } from './vectorSearchService.js';
import { getYouTubeVideo } from './youtubeService.js';

export async function listVideos(): Promise<VideoRecord[]> {
  const result = await pool.query('SELECT * FROM videos ORDER BY updated_at DESC');
  return result.rows.map(mapVideo);
}

export async function getVideo(id: string): Promise<VideoRecord> {
  const result = await pool.query('SELECT * FROM videos WHERE id = $1', [id]);
  const row = result.rows[0];
  if (!row) throw new AppError('Video not found.', 404, 'VIDEO_NOT_FOUND');
  return mapVideo(row);
}

export async function processVideo(inputUrl: string): Promise<{ video: VideoRecord; reused: boolean }> {
  const youtubeId = extractYouTubeId(inputUrl);
  const existing = await pool.query('SELECT * FROM videos WHERE youtube_id = $1', [youtubeId]);
  if (
    existing.rows[0]?.transcript_status === 'ready' &&
    existing.rows[0]?.embedding_provider === 'google-gemini' &&
    existing.rows[0]?.embedding_model === env.GEMINI_EMBEDDING_MODEL &&
    Number(existing.rows[0]?.embedding_dimensions) === env.GEMINI_EMBEDDING_DIMENSIONS
  ) {
    return { video: mapVideo(existing.rows[0]), reused: true };
  }
  if (
    existing.rows[0]?.transcript_status === 'processing' &&
    Date.now() - new Date(existing.rows[0].updated_at as string | Date).getTime() < env.PROCESSING_LEASE_MS
  ) {
    throw new AppError('This video is already being processed. Please try again shortly.', 409, 'VIDEO_PROCESSING');
  }

  const videoData = await getYouTubeVideo(inputUrl);
  const pending = await pool.query(
    `INSERT INTO videos (
       youtube_id, url, title, channel_name, thumbnail_url, transcript_status, transcript_source,
       embedding_provider, embedding_model, embedding_dimensions, error_message
     )
     VALUES ($1, $2, $3, $4, $5, 'processing', $6, 'google-gemini', $7, $8, NULL)
     ON CONFLICT (youtube_id) DO UPDATE SET
       url = EXCLUDED.url, title = EXCLUDED.title, channel_name = EXCLUDED.channel_name,
       thumbnail_url = EXCLUDED.thumbnail_url, transcript_status = 'processing',
       transcript_source = EXCLUDED.transcript_source,
       embedding_provider = EXCLUDED.embedding_provider, embedding_model = EXCLUDED.embedding_model,
       embedding_dimensions = EXCLUDED.embedding_dimensions, error_message = NULL,
       updated_at = now()
     RETURNING *`,
    [
      videoData.youtubeId,
      videoData.url,
      videoData.title,
      videoData.channelName,
      videoData.thumbnailUrl,
      videoData.transcriptSource,
      env.GEMINI_EMBEDDING_MODEL,
      env.GEMINI_EMBEDDING_DIMENSIONS,
    ],
  );
  const videoId = String(pending.rows[0]!.id);

  try {
    const chunks = await chunkTranscript(videoData.transcript, env.CHUNK_SIZE, env.CHUNK_OVERLAP);
    if (chunks.length === 0) {
      throw new AppError('The transcript did not contain usable text.', 422, 'EMPTY_TRANSCRIPT');
    }
    const embeddings = await createDocumentEmbeddings(chunks.map((chunk) => chunk.text));

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM transcript_chunks WHERE video_id = $1', [videoId]);
      for (let index = 0; index < chunks.length; index += 1) {
        const chunk = chunks[index]!;
        const embedding = embeddings[index];
        if (!embedding) throw new AppError('An embedding was missing for a transcript chunk.', 502, 'INVALID_EMBEDDING');
        await client.query(
          `INSERT INTO transcript_chunks (video_id, chunk_index, text, start_time, end_time, embedding)
           VALUES ($1, $2, $3, $4, $5, $6::vector)`,
          [videoId, chunk.chunkIndex, chunk.text, chunk.startTime, chunk.endTime, toPgVector(embedding)],
        );
      }
      const ready = await client.query(
        `UPDATE videos SET transcript_status = 'ready', chunk_count = $2, transcript_source = $5,
            embedding_provider = 'google-gemini', embedding_model = $3, embedding_dimensions = $4,
            error_message = NULL, updated_at = now()
         WHERE id = $1 RETURNING *`,
        [
          videoId,
          chunks.length,
          env.GEMINI_EMBEDDING_MODEL,
          env.GEMINI_EMBEDDING_DIMENSIONS,
          videoData.transcriptSource,
        ],
      );
      await client.query('COMMIT');
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
