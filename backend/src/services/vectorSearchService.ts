import { pool } from '../config/database.js';
import { env } from '../config/env.js';
import type { SourceReference } from '../types/index.js';
import { timestampUrl } from '../utils/youtube.js';

interface SearchRow {
  id: string;
  text: string;
  start_time: number;
  end_time: number;
  score: number;
  youtube_id: string;
}

export function toPgVector(values: number[]): string {
  return `[${values.join(',')}]`;
}

export async function searchTranscript(
  videoId: string,
  questionEmbedding: number[],
  topK = env.TOP_K,
): Promise<SourceReference[]> {
  const result = await pool.query<SearchRow>(
    `SELECT tc.id, tc.text, tc.start_time, tc.end_time, v.youtube_id,
            1 - (tc.embedding <=> $2::vector) AS score
       FROM transcript_chunks tc
       JOIN videos v ON v.id = tc.video_id
      WHERE tc.video_id = $1
      ORDER BY tc.embedding <=> $2::vector
      LIMIT $3`,
    [videoId, toPgVector(questionEmbedding), topK],
  );

  return result.rows.map((row) => ({
    chunkId: row.id,
    text: row.text,
    startTime: Number(row.start_time),
    endTime: Number(row.end_time),
    score: Number(row.score),
    url: timestampUrl(row.youtube_id, row.start_time),
  }));
}
