import { Router } from 'express';
import { z } from 'zod';
import * as controller from '../controllers/chatController.js';
import { aiRateLimit } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
const envelope = <T extends z.ZodType>(body: T) => z.object({ body, params: z.any(), query: z.any() });
const idEnvelope = z.object({ body: z.any(), params: z.object({ id: z.string().uuid() }), query: z.any() });

router.get('/', asyncHandler(controller.listChats));
router.post(
  '/',
  validate(envelope(z.object({ videoId: z.string().uuid(), title: z.string().trim().min(1).max(120).optional() }))),
  asyncHandler(controller.createChat),
);
router.get('/:id', validate(idEnvelope), asyncHandler(controller.getChat));
router.patch(
  '/:id',
  validate(z.object({
    body: z.object({ title: z.string().trim().min(1).max(120) }),
    params: z.object({ id: z.string().uuid() }),
    query: z.any(),
  })),
  asyncHandler(controller.renameChat),
);
router.delete('/:id', validate(idEnvelope), asyncHandler(controller.deleteChat));

router.post(
  '/message/send',
  aiRateLimit,
  validate(envelope(z.object({
    chatId: z.string().uuid(),
    question: z.string().trim().min(1, 'Question cannot be empty.').max(4_000),
  }))),
  asyncHandler(controller.sendMessage),
);

export default router;
