import { Router } from 'express';
import { z } from 'zod';
import * as controller from '../controllers/authController.js';
import { optionalAuth } from '../middleware/auth.js';
import { authRateLimit } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
const envelope = <T extends z.ZodType>(body: T) => z.object({ body, params: z.any(), query: z.any() });
const email = z.string().trim().email().max(254);
const password = z.string().min(8, 'Password must be at least 8 characters.').max(128);

router.post('/register', authRateLimit, validate(envelope(z.object({
  name: z.string().trim().min(2).max(80), email, password,
}))), asyncHandler(controller.register));
router.post('/login', authRateLimit, validate(envelope(z.object({ email, password }))), asyncHandler(controller.login));
router.post('/logout', asyncHandler(optionalAuth), asyncHandler(controller.logout));
router.get('/me', asyncHandler(optionalAuth), asyncHandler(controller.me));

export default router;
