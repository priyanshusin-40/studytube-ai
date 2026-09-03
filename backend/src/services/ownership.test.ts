import { beforeEach, describe, expect, it, vi } from 'vitest';
import { pool } from '../config/database.js';
import { deleteChat, getChat, listChats } from './chatService.js';
import { getVideo, listVideos } from './videoService.js';

vi.mock('../config/database.js', () => ({ pool: { query: vi.fn(), connect: vi.fn() } }));
vi.mock('./ragService.js', () => ({ answerQuestion: vi.fn() }));
const queryMock = vi.mocked(pool.query);

describe('user data isolation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('scopes chat listings to the authenticated user', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] } as never);
    await listChats('user-a');
    expect(queryMock.mock.calls[0]?.[0]).toContain('WHERE cs.user_id = $1');
    expect(queryMock.mock.calls[0]?.[1]).toEqual(['user-a']);
  });

  it('does not return or delete another user\'s chat', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] } as never);
    await expect(getChat('user-a', 'chat-b')).rejects.toMatchObject({ code: 'CHAT_NOT_FOUND' });
    expect(queryMock.mock.calls[0]?.[1]).toEqual(['chat-b', 'user-a']);

    queryMock.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);
    await expect(deleteChat('user-a', 'chat-b')).rejects.toMatchObject({ code: 'CHAT_NOT_FOUND' });
    expect(queryMock.mock.calls[1]?.[1]).toEqual(['chat-b', 'user-a']);
  });

  it('scopes video listings and lookups through user_videos', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] } as never);
    await listVideos('user-a');
    expect(queryMock.mock.calls[0]?.[0]).toContain('user_videos');
    expect(queryMock.mock.calls[0]?.[1]).toEqual(['user-a']);

    queryMock.mockResolvedValueOnce({ rows: [] } as never);
    await expect(getVideo('user-a', 'video-b')).rejects.toMatchObject({ code: 'VIDEO_NOT_FOUND' });
    expect(queryMock.mock.calls[1]?.[1]).toEqual(['user-a', 'video-b']);
  });
});
