import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { getSessionCookieOptions } from './authController.js';

describe('session cookie policy', () => {
  it('uses a local-development cookie that works over HTTP', () => {
    expect(getSessionCookieOptions('development')).toMatchObject({
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      partitioned: false,
      path: '/',
    });
  });

  it('uses a secure cross-site partitioned cookie in production', () => {
    expect(getSessionCookieOptions('production')).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      partitioned: true,
      path: '/',
    });
  });

  it('serializes every required production cookie attribute', async () => {
    const testApp = express();
    testApp.get('/', (_request, response) => {
      response.cookie('session', 'opaque-token', getSessionCookieOptions('production')).sendStatus(204);
    });
    const response = await request(testApp).get('/');
    const cookie = response.headers['set-cookie']?.[0] ?? '';
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('Partitioned');
    expect(cookie).toContain('SameSite=None');
    expect(cookie).toContain('Path=/');
  });
});

