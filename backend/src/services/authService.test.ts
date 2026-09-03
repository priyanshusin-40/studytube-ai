import bcrypt from 'bcryptjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { pool } from '../config/database.js';
import { findUserBySession, hashSessionToken, login, logout, register } from './authService.js';

vi.mock('../config/database.js', () => ({ pool: { query: vi.fn() } }));
const queryMock = vi.mocked(pool.query);

describe('authentication service', () => {
  beforeEach(() => vi.clearAllMocks());

  it('hashes passwords and normalizes email during registration', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ id: 'user-1', email: 'learner@example.com', display_name: 'Learner', created_at: new Date(0) }] } as never)
      .mockResolvedValueOnce({ rows: [] } as never);
    const result = await register(' Learner ', ' LEARNER@Example.com ', 'strong-pass');
    const firstCall = queryMock.mock.calls[0]!;
    expect(firstCall[1]?.[0]).toBe('learner@example.com');
    expect(firstCall[1]?.[1]).toBe('Learner');
    expect(await bcrypt.compare('strong-pass', String(firstCall[1]?.[2]))).toBe(true);
    expect(result.token).not.toBe('strong-pass');
    expect(queryMock.mock.calls[1]?.[1]?.[1]).toBe(hashSessionToken(result.token));
  });

  it('returns the same generic error for an unknown login', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] } as never);
    await expect(login('missing@example.com', 'wrong-pass')).rejects.toMatchObject({
      statusCode: 401, code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.',
    });
  });

  it('returns the same generic error for a wrong password', async () => {
    queryMock.mockResolvedValueOnce({ rows: [{
      id: 'user-1', email: 'learner@example.com', display_name: 'Learner',
      password_hash: await bcrypt.hash('correct-pass', 10), created_at: new Date(0),
    }] } as never);
    await expect(login('learner@example.com', 'wrong-pass')).rejects.toMatchObject({
      statusCode: 401, code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.',
    });
  });

  it('maps duplicate registration to a safe conflict', async () => {
    queryMock.mockRejectedValueOnce(Object.assign(new Error('duplicate'), { code: '23505' }));
    await expect(register('Learner', 'learner@example.com', 'strong-pass')).rejects.toMatchObject({
      statusCode: 409, code: 'EMAIL_ALREADY_EXISTS',
    });
  });

  it('treats expired or invalid sessions as unauthenticated and hashes logout tokens', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] } as never);
    await expect(findUserBySession('invalid-session')).resolves.toBeNull();
    expect(queryMock.mock.calls[0]?.[1]).toEqual([hashSessionToken('invalid-session')]);

    queryMock.mockResolvedValueOnce({ rows: [] } as never);
    await logout('logout-session');
    expect(queryMock.mock.calls[1]?.[1]).toEqual([hashSessionToken('logout-session')]);
  });
});
