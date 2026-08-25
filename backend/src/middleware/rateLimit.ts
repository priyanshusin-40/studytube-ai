import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

export const aiRateLimit = rateLimit({
  windowMs: env.AI_RATE_LIMIT_WINDOW_MS,
  limit: env.AI_RATE_LIMIT_MAX,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_request, response) => {
    response.status(429).json({
      success: false,
      error: { message: 'Too many AI requests. Please wait a moment and try again.', code: 'RATE_LIMITED' },
    });
  },
});
