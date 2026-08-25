import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';
import { AppError } from '../utils/appError.js';

export function validate(schema: ZodType) {
  return (request: Request, _response: Response, next: NextFunction) => {
    const parsed = schema.safeParse({ body: request.body, params: request.params, query: request.query });
    if (!parsed.success) {
      return next(
        new AppError(
          parsed.error.issues[0]?.message ?? 'Invalid request.',
          400,
          'VALIDATION_ERROR',
          parsed.error.flatten(),
        ),
      );
    }
    const data = parsed.data as { body?: unknown; params?: unknown; query?: unknown };
    if (data.body !== undefined) request.body = data.body;
    if (data.params !== undefined) request.params = data.params as Request['params'];
    next();
  };
}
