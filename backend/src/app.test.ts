import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from './app.js';

describe('API', () => {
  it('returns a structured health response', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, data: { status: 'ok' } });
  });

  it('allows the configured frontend origin', async () => {
    const response = await request(app).get('/api/health').set('Origin', 'http://localhost:5173');
    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });

  it('rejects an unconfigured browser origin without exposing internals', async () => {
    const response = await request(app).get('/api/health').set('Origin', 'https://not-studytube.example');
    expect(response.status).toBe(403);
    expect(response.body.error).toEqual({
      message: 'This website is not allowed to access the StudyTube API.',
      code: 'CORS_ORIGIN_DENIED',
    });
  });

  it('protects video processing before request data reaches services', async () => {
    const response = await request(app).post('/api/videos/process').send({ url: '' });
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('AUTH_REQUIRED');
  });

  it.each([
    ['get', '/api/videos'],
    ['get', '/api/chats'],
    ['post', '/api/chats'],
  ] as const)('requires authentication for %s %s', async (method, path) => {
    const response = await request(app)[method](path).send({});
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTH_REQUIRED');
  });

  it('validates registration input before database access', async () => {
    const response = await request(app).post('/api/auth/register').send({
      name: 'A', email: 'not-an-email', password: 'short',
    });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns structured 404 errors', async () => {
    const response = await request(app).get('/api/nope');
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('ROUTE_NOT_FOUND');
  });
});

