# VOM Slack Watchdog - Deployment Guide

Complete, production-ready deployment to Vercel.

## Prerequisites

1. Vercel account (vercel.com)
2. GitHub account with repository
3. Slack workspace admin access
4. Neon.tech PostgreSQL database
5. Anthropic API key

## Step-by-Step Deployment

### Phase 1: Prepare Environment

#### 1.1 Create Neon PostgreSQL Database

1. Go to https://neon.tech
2. Sign up and create project
3. Copy connection string: `postgresql://user:password@host/watchdog`
4. Test connection:
   ```bash
   psql "postgresql://user:password@host/watchdog"
   ```

#### 1.2 Get Anthropic API Key

1. Go to https://console.anthropic.com
2. Create API key
3. Copy key: `sk-ant-...`

#### 1.3 Create Slack App

1. Go to https://api.slack.com/apps
2. Click "Create New App" → "From an app manifest"
3. Paste manifest from README
4. Go to "OAuth & Permissions"
5. Copy Bot Token: `xoxb-...`
6. Go to "App Credentials"
7. Copy Signing Secret: `...`
8. Enable Socket Mode
9. Copy App Token: `xapp-...`
10. Set redirect URI: `https://vom-slack-watchdog.vercel.app/slack/oauth_redirect`

### Phase 2: Deploy to Vercel

#### 2.1 Connect GitHub Repository

1. Push code to GitHub
2. Go to https://vercel.com/new
3. Import your repository
4. Select "Other" → "Monorepo"
5. Configure:
   - Framework: Vite (for frontend)
   - Build Command: `npm run build`
   - Output Directory: `apps/frontend/dist`

#### 2.2 Set Environment Variables

In Vercel Project Settings → Environment Variables, add:

```
ANTHROPIC_API_KEY=sk-ant-your-key
DATABASE_URL=postgresql://user:pass@host/db
SLACK_BOT_TOKEN=xoxb-your-token
SLACK_APP_TOKEN=xapp-your-token
SLACK_SIGNING_SECRET=your-secret
SLACK_CLIENT_ID=your-client-id
SLACK_CLIENT_SECRET=your-client-secret
SLACK_REDIRECT_URI=https://vom-slack-watchdog.vercel.app/slack/oauth_redirect
JWT_SECRET=$(openssl rand -base64 32)
SENTRY_DSN=optional-sentry-dsn
NODE_ENV=production
VITE_API_URL=https://vom-slack-watchdog.vercel.app/api
VITE_SLACK_CLIENT_ID=your-client-id
VITE_SLACK_REDIRECT_URI=https://vom-slack-watchdog.vercel.app/slack/callback
```

#### 2.3 Deploy

1. Click "Deploy"
2. Wait for build to complete
3. Test frontend: https://vom-slack-watchdog.vercel.app
4. Test API: https://vom-slack-watchdog.vercel.app/api/health

### Phase 3: Initialize Database

#### 3.1 Create Tables

Run these SQL commands in Neon:

```sql
CREATE TABLE IF NOT EXISTS workspace_tokens (
  workspace_id VARCHAR(255) PRIMARY KEY,
  access_token TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR(255) PRIMARY KEY,
  workspace_id VARCHAR(255) NOT NULL,
  channel VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  text TEXT NOT NULL,
  ts BIGINT NOT NULL,
  thread_ts BIGINT,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (workspace_id) REFERENCES workspace_tokens(workspace_id)
);

CREATE INDEX idx_messages_channel ON messages(channel);
CREATE INDEX idx_messages_workspace ON messages(workspace_id);

CREATE TABLE IF NOT EXISTS anomalies (
  id VARCHAR(255) PRIMARY KEY,
  workspace_id VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  confidence DECIMAL(3,2) NOT NULL,
  channel VARCHAR(255) NOT NULL,
  message_ids TEXT[] NOT NULL,
  context JSONB,
  flagged BOOLEAN DEFAULT FALSE,
  feedback TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (workspace_id) REFERENCES workspace_tokens(workspace_id)
);

CREATE INDEX idx_anomalies_workspace ON anomalies(workspace_id);
CREATE INDEX idx_anomalies_channel ON anomalies(channel);

CREATE TABLE IF NOT EXISTS patterns (
  id VARCHAR(255) PRIMARY KEY,
  workspace_id VARCHAR(255) NOT NULL,
  keywords TEXT[] NOT NULL,
  channels TEXT[] NOT NULL,
  frequency INT DEFAULT 1,
  last_seen TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (workspace_id) REFERENCES workspace_tokens(workspace_id)
);

CREATE TABLE IF NOT EXISTS user_feedback (
  id VARCHAR(255) PRIMARY KEY,
  workspace_id VARCHAR(255) NOT NULL,
  anomaly_id VARCHAR(255) NOT NULL,
  is_relevant BOOLEAN NOT NULL,
  feedback_text TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (workspace_id) REFERENCES workspace_tokens(workspace_id),
  FOREIGN KEY (anomaly_id) REFERENCES anomalies(id)
);
```

### Phase 4: Install Slack App

1. Go to your Slack workspace
2. In browser, navigate to: `https://vom-slack-watchdog.vercel.app/slack/install`
3. Click "Authorize"
4. App is now installed in your workspace
5. Bot appears in workspace members
6. Create #anomalies channel if it doesn't exist

### Phase 5: Test

#### 5.1 Test Duplicate Detection

1. Post in #growth: "We need to increase our marketing spend"
2. Post in #ops: "We need to increase our marketing spend"
3. Should see alert in #anomalies within 30 seconds

#### 5.2 Test Dashboard

1. Go to https://vom-slack-watchdog.vercel.app
2. Login (use test credentials or Slack OAuth)
3. See anomalies listed
4. Click to view details
5. Add feedback

#### 5.3 Test Patterns

1. Post multiple messages with keywords in #growth
2. Go to Patterns page
3. Should see detected themes

### Phase 6: Production Checklist

- [ ] All environment variables set in Vercel
- [ ] Database tables created
- [ ] Slack app installed in workspace
- [ ] #anomalies channel exists
- [ ] Frontend loads without errors
- [ ] API endpoints respond
- [ ] Sentry configured (optional but recommended)
- [ ] GitHub Actions workflow enabled for auto-deploy
- [ ] Custom domain configured (optional)
- [ ] Monitoring alerts set up

## Troubleshooting

### Slack Connection Issues

Check in Vercel logs:
```bash
vercel logs vor-slack-watchdog --follow
```

Look for Socket Mode errors. Ensure:
- App Token is correct
- Socket Mode is enabled
- Token has app-level permissions

### Database Connection Errors

Test connection:
```bash
psql "postgresql://user:password@host/db"
```

Ensure:
- DATABASE_URL is correct
- Neon IP whitelist includes Vercel
- SSL mode is correct

### Claude API Errors

Check:
- ANTHROPIC_API_KEY is valid
- API billing is active
- Rate limits not exceeded

### Frontend Not Loading

Check:
- VITE_API_URL points to correct backend
- CORS headers configured
- No build errors in Vercel logs

## Monitoring

### Set Up Error Tracking

1. Create Sentry account: https://sentry.io
2. Create project for "Node.js"
3. Copy DSN
4. Set SENTRY_DSN in Vercel
5. Errors automatically tracked

### View Logs

```bash
# Install Vercel CLI
npm install -g vercel

# Follow logs
vercel logs vom-slack-watchdog --follow
```

## Performance Optimization

### Database Queries

Add indexes for common queries:
```sql
CREATE INDEX idx_messages_created ON messages(created_at);
CREATE INDEX idx_anomalies_created ON anomalies(created_at);
```

### Caching

Responses are cached via CDN. To purge:
```bash
vercel deployments inspect vom-slack-watchdog --latest --logs
```

## Backup & Recovery

### Database Backup

Neon provides automatic backups. To export:

```bash
pg_dump "postgresql://user:pass@host/db" > backup.sql
```

### Restore from Backup

```bash
psql "postgresql://user:pass@host/db" < backup.sql
```

## Scaling

If seeing 503 errors or timeouts:

1. Check Vercel dashboard for limits
2. Optimize Claude API calls (cache results)
3. Consider Railway for backend instead of Vercel Functions
4. Add database read replicas on Neon

## Maintenance

### Weekly Tasks

- Check error logs in Sentry
- Review anomaly accuracy feedback
- Monitor database size

### Monthly Tasks

- Update dependencies
- Review and optimize Claude API calls
- Analyze pattern trends

### Quarterly Tasks

- Full backup of database
- Security audit
- Performance optimization review
