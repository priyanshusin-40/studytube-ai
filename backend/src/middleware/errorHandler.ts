import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError } from '../utils/appError.js';
import { safeErrorForLog } from '../utils/logging.js';

export const notFoundHandler: RequestHandler = (request, _response, next) => {
  next(new AppError(`Route ${request.method} ${request.path} was not found.`, 404, 'ROUTE_NOT_FOUND'));
};

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  const isKnown = error instanceof AppError;
  const errorCode = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
  const isDatabaseError = !isKnown && (/^[0-9A-Z]{5}$/.test(errorCode) || errorCode.startsWith('ECONN'));
  const isCorsError = !isKnown && error instanceof Error && error.message === 'CORS_ORIGIN_DENIED';
  const statusCode = isKnown ? error.statusCode : isDatabaseError ? 503 : isCorsError ? 403 : 500;
  const message = isKnown
    ? error.message
    : isDatabaseError
      ? 'The database is temporarily unavailable. Please try again shortly.'
      : isCorsError
        ? 'This website is not allowed to access the StudyTube API.'
        : 'An unexpected error occurred.';
  const responseCode = isKnown
    ? error.code
    : isDatabaseError
      ? 'DATABASE_UNAVAILABLE'
      : isCorsError
        ? 'CORS_ORIGIN_DENIED'
        : 'INTERNAL_ERROR';

  if (!isKnown && !isCorsError) console.error('Unhandled request error:', safeErrorForLog(error));

  response.status(statusCode).json({
    success: false,
    error: {
      message,
      code: responseCode,
      ...(isKnown && error.details ? { details: error.details } : {}),
    },
  });
};
