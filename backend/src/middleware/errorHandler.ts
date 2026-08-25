import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError } from '../utils/appError.js';

export const notFoundHandler: RequestHandler = (request, _response, next) => {
  next(new AppError(`Route ${request.method} ${request.path} was not found.`, 404, 'ROUTE_NOT_FOUND'));
};

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  const isKnown = error instanceof AppError;
  const statusCode = isKnown ? error.statusCode : 500;
  const message = isKnown ? error.message : 'An unexpected error occurred.';

  if (!isKnown) console.error('Unhandled request error:', error);

  response.status(statusCode).json({
    success: false,
    error: {
      message,
      code: isKnown ? error.code : 'INTERNAL_ERROR',
      ...(isKnown && error.details ? { details: error.details } : {}),
    },
  });
};
