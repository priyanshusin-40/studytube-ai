import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';
import { findUserBySession } from '../services/authService.js';
import { AppError } from '../utils/appError.js';
import { readCookie } from '../utils/cookies.js';

export async function optionalAuth(request: Request, _response: Response, next: NextFunction) {
  const token = readCookie(request.headers.cookie, env.SESSION_COOKIE_NAME);
  if (!token) return next();
  request.sessionToken = token;
  request.authUser = (await findUserBySession(token)) ?? undefined;
  return next();
}

export async function requireAuth(request: Request, response: Response, next: NextFunction) {
  await optionalAuth(request, response, (error?: unknown) => {
    if (error) return next(error);
    if (!request.authUser) return next(new AppError('Please sign in to continue.', 401, 'AUTH_REQUIRED'));
    return next();
  });
}
