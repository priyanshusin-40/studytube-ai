import type { CookieOptions, Request, Response } from 'express';
import { env } from '../config/env.js';
import * as authService from '../services/authService.js';

export function getSessionCookieOptions(nodeEnv = env.NODE_ENV): CookieOptions {
  const isProduction = nodeEnv === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    partitioned: isProduction,
    path: '/',
    maxAge: env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
  };
}

const cookieOptions = getSessionCookieOptions();

export async function register(request: Request, response: Response) {
  const result = await authService.register(request.body.name, request.body.email, request.body.password);
  response.cookie(env.SESSION_COOKIE_NAME, result.token, cookieOptions);
  response.status(201).json({ success: true, data: { user: result.user } });
}

export async function login(request: Request, response: Response) {
  const result = await authService.login(request.body.email, request.body.password);
  response.cookie(env.SESSION_COOKIE_NAME, result.token, cookieOptions);
  response.json({ success: true, data: { user: result.user } });
}

export async function logout(request: Request, response: Response) {
  if (request.sessionToken) await authService.logout(request.sessionToken);
  response.clearCookie(env.SESSION_COOKIE_NAME, { ...cookieOptions, maxAge: undefined });
  response.status(204).send();
}

export async function me(request: Request, response: Response) {
  response.json({ success: true, data: { user: request.authUser ?? null } });
}

