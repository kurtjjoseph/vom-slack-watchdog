# VOM Slack Watchdog

Real-time duplicate work detection, anomaly monitoring, and pattern recognition for Slack.

**Live:** https://vom-slack-watchdog.vercel.app

## Features

- **Duplicate Detection**: Uses Claude API for semantic matching to identify duplicate work across #growth, #ops, #launches
- **Anomaly Detection**: Monitors for unusual posting volumes and frequency patterns
- **Real-time Alerts**: Posts to #anomalies channel with confidence scores and context
- **Interactive Dashboard**: Review flagged items, provide feedback, track patterns
- **Pattern Recognition**: Identifies recurring topics, keywords, and cross-channel theme clustering
- **Workspace-scoped**: Multi-tenant support with JWT authentication

## Tech Stack

### Frontend
- React 18 + TypeScript
- Tailwind CSS + Lucide Icons
- Zustand for state management
- Vite bundler
- Deployed on Vercel

### Backend
- Node.js + Express + TypeScript
- PostgreSQL (Neon.tech)
- Slack API (Socket Mode for real-time events)
- Claude API (claude-3-5-sonnet)
- JWT authentication
- Sentry for error tracking
- Vercel Functions for serverless compute

## Prerequisites

1. **Slack Workspace Admin Access**: Create app, install bot
2. **Anthropic API Key**: https://console.anthropic.com/account/keys
3. **PostgreSQL Database**: Neon.tech (free tier available)
4. **Node.js 18+**: Development only

## Setup & Deployment

### 1. Clone & Install

```bash
git clone <repo-url>
cd vom-slack-watchdog
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in all required variables:

```env
# Slack (create app at https://api.slack.com/apps)
SLACK_BOT_TOKEN=xoxb-...
SLACK_APP_TOKEN=xapp-...
SLACK_SIGNING_SECRET=...
SLACK_CLIENT_ID=...
SLACK_CLIENT_SECRET=...
SLACK_REDIRECT_URI=https://vom-slack-watchdog.vercel.app/slack/oauth_redirect

# Database (neon.tech PostgreSQL)
DATABASE_URL=postgresql://user:pass@host/watchdog

# Claude API
ANTHROPIC_API_KEY=sk-ant-...

# JWT Secret (generate strong random string)
JWT_SECRET=$(openssl rand -base64 32)

# Environment
NODE_ENV=production
```

### 3. Setup Slack App

1. Go to https://api.slack.com/apps
2. Create New App → From an app manifest
3. Paste this manifest:

```json
{
  "display_information": {
    "name": "VOM Slack Watchdog",
    "description": "Duplicate work detection and anomaly monitoring"
  },
  "features": {
    "bot_user": {
      "display_name": "Watchdog",
      "always_online": true
    }
  },
  "oauth_config": {
    "scopes": {
      "bot": [
        "chat:write",
        "channels:read",
        "users:read",
        "messages:read"
      ]
    }
  },
  "settings": {
    "socket_mode_enabled": true,
    "org_deploy_enabled": false,
    "token_rotation_enabled": false
  }
}
```

4. Copy Bot Token and App Token from "Install App"
5. Go to "Signing Secret" and copy it

### 4. Database Setup

Create tables (runs automatically on first backend start):

```sql
CREATE TABLE workspace_tokens (
  workspace_id VARCHAR(255) PRIMARY KEY,
  access_token TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE messages (
  id VARCHAR(255) PRIMARY KEY,
  workspace_id VARCHAR(255),
  channel VARCHAR(255),
  user_id VARCHAR(255),
  text TEXT,
  ts BIGINT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE anomalies (
  id VARCHAR(255) PRIMARY KEY,
  workspace_id VARCHAR(255),
  type VARCHAR(50),
  confidence DECIMAL(3,2),
  channel VARCHAR(255),
  message_ids TEXT[],
  context JSONB,
  flagged BOOLEAN,
  feedback TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE patterns (
  id VARCHAR(255) PRIMARY KEY,
  workspace_id VARCHAR(255),
  keywords TEXT[],
  channels TEXT[],
  frequency INT,
  last_seen TIMESTAMP
);

CREATE TABLE user_feedback (
  id VARCHAR(255) PRIMARY KEY,
  workspace_id VARCHAR(255),
  anomaly_id VARCHAR(255),
  is_relevant BOOLEAN,
  feedback_text TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 5. Deploy to Vercel

```bash
npm install -g vercel
vercel --env-file .env.local
```

Or connect GitHub repository and deploy via Vercel dashboard:
1. Go to https://vercel.com/new
2. Import repository
3. Add environment variables
4. Deploy

## Development

### Local Development

```bash
# Terminal 1: Start backend
cd apps/backend
npm run dev

# Terminal 2: Start frontend
cd apps/frontend
npm run dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:3001

### Testing

```bash
npm run test  # Run all tests
npm run lint  # Lint code
```

## API Endpoints

### Authentication
- `POST /auth/login` - Login with email/password
- `GET /slack/oauth_redirect` - Slack OAuth callback

### Anomalies
- `GET /api/anomalies` - List anomalies (paginated)
- `GET /api/anomalies/:id` - Get anomaly details
- `PATCH /api/anomalies/:id` - Update anomaly (flag/feedback)

### Patterns
- `GET /api/patterns/:channel` - Get channel patterns and themes

### Statistics
- `GET /api/stats/anomalies` - Get anomaly statistics

### Health
- `GET /api/health` - API health check

## Architecture

### Message Flow

1. **Slack Event** → Socket Mode listener
2. **Duplicate Check** → Claude API semantic analysis
3. **Anomaly Detection** → Volume spike & frequency analysis
4. **Alert Creation** → Stored in PostgreSQL
5. **Slack Notification** → Posted to #anomalies
6. **Dashboard** → Review & feedback via frontend

### Data Models

**Anomaly**
```typescript
{
  id: string
  type: 'duplicate' | 'spike' | 'anomaly'
  confidence: 0-1
  channel: string
  message_ids: string[]
  context: any
  flagged: boolean
  feedback?: string
  created_at: Date
}
```

**Pattern**
```typescript
{
  id: string
  keywords: string[]
  channels: string[]
  frequency: number
  last_seen: Date
}
```

## Performance & Scaling

- **Real-time**: Socket Mode for sub-second latency
- **Scalable**: Vercel Functions auto-scale
- **Efficient**: Claude API for semantic understanding
- **Monitored**: Sentry for error tracking and alerts

## Troubleshooting

### Socket Mode Connection Fails
```bash
# Check app token is correct
# Ensure Socket Mode is enabled in Slack app settings
```

### Database Connection Error
```bash
# Verify DATABASE_URL is correct
# Check Neon.tech firewall settings
```

### Missing Messages
```bash
# Ensure bot has proper channel permissions
# Check Slack app scopes
```

### Claude API Errors
```bash
# Verify ANTHROPIC_API_KEY is valid
# Check API usage limits at console.anthropic.com
```

## Security

- **Authentication**: JWT tokens (24h expiry)
- **Database**: SSL connections, environment variables
- **Slack**: App signing verification
- **Secrets**: All stored as Vercel environment variables
- **CORS**: Configured for origin matching

## Monitoring

- **Sentry**: Error tracking via `SENTRY_DSN`
- **Vercel**: Function logs and analytics
- **PostgreSQL**: Query performance monitoring

## License

Proprietary - Vision Outreach Media
