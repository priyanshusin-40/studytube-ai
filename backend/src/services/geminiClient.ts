import { ApiError, GoogleGenAI } from '@google/genai';
import { env } from '../config/env.js';
import { AppError } from '../utils/appError.js';
import { safeErrorForLog } from '../utils/logging.js';

export const geminiClient = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

export function normalizeGeminiError(error: unknown, operation: string): AppError {
  if (error instanceof ApiError) {
    if (error.status === 429) {
      return new AppError(
        'The Gemini free-tier quota is temporarily exhausted. Please wait and try again.',
        429,
        'AI_RATE_LIMIT',
      );
    }
    if (error.status === 401 || error.status === 403) {
      console.error(`Gemini authentication failed during ${operation}.`);
      return new AppError(
        'Gemini is not configured correctly. Check GEMINI_API_KEY and the selected models.',
        503,
        'AI_CONFIGURATION_ERROR',
      );
    }
    if (error.status === 400 || error.status === 404) {
      console.error(`Gemini rejected the ${operation} request:`, safeErrorForLog(error));
      return new AppError(
        'Gemini rejected the request. Check the configured Gemini model names.',
        503,
        'AI_MODEL_ERROR',
      );
    }
  }

  console.error(`Gemini ${operation} failed:`, safeErrorForLog(error));
  return new AppError(`The Gemini ${operation} service is temporarily unavailable.`, 502, 'AI_PROVIDER_ERROR');
}
