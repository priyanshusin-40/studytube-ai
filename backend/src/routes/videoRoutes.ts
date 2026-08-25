import { Router } from 'express';
import { z } from 'zod';
import * as controller from '../controllers/videoController.js';
import { aiRateLimit } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
const uuidParams = z.object({ body: z.any(), params: z.object({ id: z.string().uuid() }), query: z.any() });

router.get('/', asyncHandler(controller.listVideos));
router.get('/:id', validate(uuidParams), asyncHandler(controller.getVideo));
router.post(
  '/process',
  aiRateLimit,
  validate(z.object({ body: z.object({ url: z.string().trim().min(1).max(500) }), params: z.any(), query: z.any() })),
  asyncHandler(controller.processVideo),
);

export default router;
