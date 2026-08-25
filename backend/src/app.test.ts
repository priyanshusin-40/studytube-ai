import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from './app.js';

describe('API', () => {
  it('returns a structured health response', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, data: { status: 'ok' } });
  });

  it('validates video processing input before accessing services', async () => {
    const response = await request(app).post('/api/videos/process').send({ url: '' });
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns structured 404 errors', async () => {
    const response = await request(app).get('/api/nope');
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('ROUTE_NOT_FOUND');
  });
});
