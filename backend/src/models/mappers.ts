import type { QueryResultRow } from 'pg';
import type { ChatMessage, VideoRecord } from '../types/index.js';

export function mapVideo(row: QueryResultRow): VideoRecord {
  return {
    id: String(row.id),
    youtubeId: String(row.youtube_id),
    url: String(row.url),
    title: String(row.title),
    channelName: row.channel_name ? String(row.channel_name) : null,
    thumbnailUrl: row.thumbnail_url ? String(row.thumbnail_url) : null,
    transcriptStatus: row.transcript_status as VideoRecord['transcriptStatus'],
    transcriptSource: (row.transcript_source as VideoRecord['transcriptSource']) ?? null,
    chunkCount: Number(row.chunk_count),
    createdAt: new Date(row.created_at as string | Date).toISOString(),
    updatedAt: new Date(row.updated_at as string | Date).toISOString(),
  };
}

export function mapMessage(row: QueryResultRow): ChatMessage {
  return {
    id: String(row.id),
    role: row.role as ChatMessage['role'],
    content: String(row.content),
    sources: Array.isArray(row.sources) ? row.sources : [],
    createdAt: new Date(row.created_at as string | Date).toISOString(),
  };
}
