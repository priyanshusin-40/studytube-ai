import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { allowedClientOrigins } from './config/env.js';
import { requireAuth } from './middleware/auth.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/authRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import videoRoutes from './routes/videoRoutes.js';

export const app = express();
app.set('trust proxy', 1);

app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedClientOrigins.includes(origin.replace(/\/$/, ''))) {
      callback(null, true);
      return;
    }
    callback(new Error('CORS_ORIGIN_DENIED'));
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  credentials: true,
}));
app.use(express.json({ limit: '64kb' }));

app.get('/api/health', (_request, response) => {
  response.json({ success: true, data: { status: 'ok' } });
});
app.use('/api/auth', authRoutes);
app.use('/api/videos', requireAuth);
app.use('/api/videos', videoRoutes);
app.use('/api/chats', requireAuth);
app.use('/api/chats', chatRoutes);
app.use(notFoundHandler);
app.use(errorHandler);
