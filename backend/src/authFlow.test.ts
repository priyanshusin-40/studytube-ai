import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  sessions: new Map<string, { id: string; email: string; name: string; createdAt: string }>(),
  videoCalls: [] as Array<[string, string]>,
}));

vi.mock('./services/authService.js', () => ({
  register: vi.fn(async (name: string, email: string) => {
    const user = { id: 'user-register', email, name, createdAt: new Date(0).toISOString() };
    state.sessions.set('register-token', user);
    return { user, token: 'register-token' };
  }),
  login: vi.fn(async (email: string) => {
    const user = { id: 'user-login', email, name: 'Login User', createdAt: new Date(0).toISOString() };
    state.sessions.set('login-token', user);
    return { user, token: 'login-token' };
  }),
  findUserBySession: vi.fn(async (token: string) => state.sessions.get(token) ?? null),
  logout: vi.fn(async (token: string) => { state.sessions.delete(token); }),
}));

vi.mock('./services/videoService.js', () => ({
  processVideo: vi.fn(async (userId: string, url: string) => {
    state.videoCalls.push([userId, url]);
    return { video: { id: 'video-1', youtubeId: 'abcdefghijk', title: 'Test video' }, reused: false };
  }),
  listVideos: vi.fn(async () => []),
  getVideo: vi.fn(),
}));

import { app } from './app.js';

describe('HTTP authentication flow', () => {
  beforeEach(() => {
    state.sessions.clear();
    state.videoCalls.length = 0;
  });

  it('registers, confirms the session through /me, and processes a video as that user', async () => {
    const agent = request.agent(app);
    const registered = await agent.post('/api/auth/register').send({
      name: 'Register User', email: 'register@example.com', password: 'strong-pass',
    });
    expect(registered.status).toBe(201);
    expect(registered.headers['set-cookie']?.[0]).toContain('HttpOnly');

    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.data.user.id).toBe('user-register');

    const processed = await agent.post('/api/videos/process').send({ url: 'https://youtu.be/abcdefghijk' });
    expect(processed.status).toBe(201);
    expect(state.videoCalls).toEqual([['user-register', 'https://youtu.be/abcdefghijk']]);
  });

  it('logs in and confirms the session through /me', async () => {
    const agent = request.agent(app);
    const loggedIn = await agent.post('/api/auth/login').send({
      email: 'login@example.com', password: 'strong-pass',
    });
    expect(loggedIn.status).toBe(200);
    expect(loggedIn.headers['set-cookie']?.[0]).toContain('HttpOnly');

    const me = await agent.get('/api/auth/me');
    expect(me.body.data.user).toMatchObject({ id: 'user-login', email: 'login@example.com' });
  });

  it('logs out, clears the browser cookie, and rejects later protected requests', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ email: 'login@example.com', password: 'strong-pass' });

    const loggedOut = await agent.post('/api/auth/logout');
    expect(loggedOut.status).toBe(204);
    expect(loggedOut.headers['set-cookie']?.[0]).toContain('studytube_session=;');
    expect((await agent.get('/api/auth/me')).body.data.user).toBeNull();

    const protectedResponse = await agent.post('/api/videos/process').send({ url: 'https://youtu.be/abcdefghijk' });
    expect(protectedResponse.status).toBe(401);
    expect(protectedResponse.body.error.code).toBe('AUTH_REQUIRED');
  });

  it('rejects video processing without an authenticated session', async () => {
    const response = await request(app).post('/api/videos/process').send({ url: 'https://youtu.be/abcdefghijk' });
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTH_REQUIRED');
    expect(state.videoCalls).toHaveLength(0);
  });
});

