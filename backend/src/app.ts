import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import chatRoutes from './routes/chatRoutes.js';
import videoRoutes from './routes/videoRoutes.js';

export const app = express();

app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: env.CLIENT_URL, methods: ['GET', 'POST', 'PATCH', 'DELETE'], credentials: false }));
app.use(express.json({ limit: '64kb' }));

app.get('/api/health', (_request, response) => {
  response.json({ success: true, data: { status: 'ok' } });
});
app.use('/api/videos', videoRoutes);
app.use('/api/chats', chatRoutes);
app.use(notFoundHandler);
app.use(errorHandler);
