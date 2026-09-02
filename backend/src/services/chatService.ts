import { pool } from '../config/database.js';
import { mapMessage, mapVideo } from '../models/mappers.js';
import type { ChatMessage } from '../types/index.js';
import { AppError } from '../utils/appError.js';
import { answerQuestion } from './ragService.js';

export async function createChat(videoId: string, title?: string) {
  const video = await pool.query('SELECT * FROM videos WHERE id = $1 AND transcript_status = $2', [videoId, 'ready']);
  if (!video.rows[0]) throw new AppError('Choose a video that is ready to chat.', 404, 'VIDEO_NOT_READY');
  const result = await pool.query(
    `INSERT INTO chat_sessions (video_id, title) VALUES ($1, $2)
     RETURNING id, title, video_id, created_at, updated_at`,
    [videoId, title?.trim() || 'New conversation'],
  );
  return { ...result.rows[0], video: mapVideo(video.rows[0]) };
}

export async function listChats() {
  const result = await pool.query(
    `SELECT cs.id, cs.title, cs.video_id, cs.created_at, cs.updated_at,
            v.youtube_id, v.title AS video_title, v.thumbnail_url,
            COUNT(m.id)::int AS message_count
       FROM chat_sessions cs
       JOIN videos v ON v.id = cs.video_id
       LEFT JOIN messages m ON m.chat_session_id = cs.id
      GROUP BY cs.id, v.youtube_id, v.title, v.thumbnail_url
      ORDER BY cs.updated_at DESC`,
  );
  return result.rows.map((row) => ({
    id: row.id,
    title: row.title,
    videoId: row.video_id,
    videoTitle: row.video_title,
    youtubeId: row.youtube_id,
    thumbnailUrl: row.thumbnail_url,
    messageCount: Number(row.message_count),
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  }));
}

export async function getChat(id: string) {
  const session = await pool.query(
    `SELECT cs.*, v.youtube_id, v.url, v.title AS video_title, v.channel_name,
            v.thumbnail_url, v.transcript_status, v.chunk_count, v.created_at AS video_created_at,
            v.updated_at AS video_updated_at, v.transcript_source
       FROM chat_sessions cs JOIN videos v ON v.id = cs.video_id WHERE cs.id = $1`,
    [id],
  );
  const row = session.rows[0];
  if (!row) throw new AppError('Chat not found.', 404, 'CHAT_NOT_FOUND');
  const messages = await pool.query('SELECT * FROM messages WHERE chat_session_id = $1 ORDER BY created_at', [id]);
  const video = mapVideo({
    id: row.video_id,
    youtube_id: row.youtube_id,
    url: row.url,
    title: row.video_title,
    channel_name: row.channel_name,
    thumbnail_url: row.thumbnail_url,
    transcript_status: row.transcript_status,
    transcript_source: row.transcript_source,
    chunk_count: row.chunk_count,
    created_at: row.video_created_at,
    updated_at: row.video_updated_at,
  });
  return {
    id: row.id,
    title: row.title,
    videoId: row.video_id,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    video,
    messages: messages.rows.map(mapMessage),
  };
}

export async function renameChat(id: string, title: string) {
  const result = await pool.query(
    'UPDATE chat_sessions SET title = $2, updated_at = now() WHERE id = $1 RETURNING id, title, updated_at',
    [id, title.trim()],
  );
  if (!result.rows[0]) throw new AppError('Chat not found.', 404, 'CHAT_NOT_FOUND');
  return result.rows[0];
}

export async function deleteChat(id: string): Promise<void> {
  const result = await pool.query('DELETE FROM chat_sessions WHERE id = $1', [id]);
  if (result.rowCount === 0) throw new AppError('Chat not found.', 404, 'CHAT_NOT_FOUND');
}

export async function sendMessage(chatId: string, question: string): Promise<{ user: ChatMessage; assistant: ChatMessage }> {
  const session = await pool.query('SELECT id, video_id, title FROM chat_sessions WHERE id = $1', [chatId]);
  const chat = session.rows[0];
  if (!chat) throw new AppError('Chat not found.', 404, 'CHAT_NOT_FOUND');

  const historyResult = await pool.query(
    'SELECT role, content FROM messages WHERE chat_session_id = $1 ORDER BY created_at DESC LIMIT 8',
    [chatId],
  );
  const history = historyResult.rows.reverse().map((row) => ({
    role: row.role as 'user' | 'assistant',
    content: String(row.content),
  }));

  const userResult = await pool.query(
    `INSERT INTO messages (chat_session_id, role, content) VALUES ($1, 'user', $2) RETURNING *`,
    [chatId, question],
  );
  let assistantResult;
  try {
    const result = await answerQuestion(String(chat.video_id), question, history);
    assistantResult = await pool.query(
      `INSERT INTO messages (chat_session_id, role, content, sources)
       VALUES ($1, 'assistant', $2, $3::jsonb) RETURNING *`,
      [chatId, result.answer, JSON.stringify(result.sources)],
    );
  } catch (error) {
    await pool.query('DELETE FROM messages WHERE id = $1', [userResult.rows[0]!.id]);
    throw error;
  }
  const autoTitle = question.replace(/\s+/g, ' ').trim().slice(0, 60);
  await pool.query(
    `UPDATE chat_sessions SET title = CASE WHEN title = 'New conversation' THEN $2 ELSE title END, updated_at = now()
     WHERE id = $1`,
    [chatId, autoTitle],
  );
  return { user: mapMessage(userResult.rows[0]!), assistant: mapMessage(assistantResult.rows[0]!) };
}
