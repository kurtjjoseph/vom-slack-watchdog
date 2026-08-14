import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import * as Sentry from '@sentry/node';
import dotenv from 'dotenv';
import { initializeSlackBot } from './services/slack.js';
import { initializeDatabase } from './db/db.js';
import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import apiRoutes from './routes/api.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Sentry
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 1.0,
  });
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.errorHandler());
}

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Slack OAuth callback
app.get('/slack/oauth_redirect', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, state } = req.query;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Missing authorization code' });
    }

    const response = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.SLACK_CLIENT_ID || '',
        client_secret: process.env.SLACK_CLIENT_SECRET || '',
        code,
        redirect_uri: process.env.SLACK_REDIRECT_URI || '',
      }).toString(),
    });

    const data = await response.json() as { ok: boolean; error?: string; access_token?: string; team_id?: string };

    if (!data.ok) {
      return res.status(400).json({ error: data.error || 'OAuth failed' });
    }

    // Store token in database
    if (data.access_token && data.team_id) {
      const db = await initializeDatabase();
      await db.query(
        'INSERT INTO workspace_tokens (workspace_id, access_token, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (workspace_id) DO UPDATE SET access_token = $2, updated_at = NOW()',
        [data.team_id, data.access_token]
      );
    }

    res.json({ success: true, message: 'Workspace authorized successfully' });
  } catch (error) {
    next(error);
  }
});

// API Routes (protected)
app.use('/api', authMiddleware, apiRoutes);

// Error handling
app.use(errorHandler);

// Start server
async function start() {
  try {
    await initializeDatabase();
    await initializeSlackBot();

    app.listen(PORT, () => {
      console.log(`VOM Slack Watchdog running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
