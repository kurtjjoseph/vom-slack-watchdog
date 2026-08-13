import { App, BlockAction, SlashCommand } from '@slack/bolt';
import { WebClient } from '@slack/web-api';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';
import { getDatabase } from '../db/db.js';
import { detectDuplicates } from './claude.js';
import { detectAnomalies } from './anomaly.js';

dotenv.config();

let slackApp: App;
const slackWebClient = new WebClient();

export async function initializeSlackBot() {
  slackApp = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    socketMode: true,
    appToken: process.env.SLACK_APP_TOKEN,
  });

  // Listen for messages in monitored channels
  slackApp.message(async ({ message, client, say }) => {
    try {
      if ('text' in message && message.channel_type === 'channel') {
        const channelName = await getChannelName(client, message.channel || '');

        if (['growth', 'ops', 'launches'].includes(channelName)) {
          await processMessage(message as any, client);
        }
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  // Slash command for feedback
  slackApp.command('/watchdog-feedback', async ({ command, ack, respond }) => {
    await ack();
    await handleFeedbackCommand(command, respond);
  });

  // Start the app
  await slackApp.start();
  console.log('Slack bot initialized');
}

async function getChannelName(client: WebClient, channelId: string): Promise<string> {
  try {
    const result = await client.conversations.info({ channel: channelId });
    return result.channel?.name || '';
  } catch (error) {
    console.error('Error getting channel info:', error);
    return '';
  }
}

async function processMessage(message: any, client: WebClient) {
  try {
    const db = await getDatabase();
    const workspaceId = message.team || 'default';

    // Store message
    const messageId = `${message.channel}-${message.ts}`;
    await db.query(
      `INSERT INTO messages (id, workspace_id, channel, user_id, text, ts)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO NOTHING`,
      [
        messageId,
        workspaceId,
        message.channel,
        message.user || 'unknown',
        message.text || '',
        Math.floor(parseFloat(message.ts as string) * 1000),
      ]
    );

    // Detect duplicates
    const duplicates = await detectDuplicates(message.text || '', message.channel || '');
    if (duplicates.isDuplicate && duplicates.confidence > 0.7) {
      await createAndPostAnomaly(
        workspaceId,
        'duplicate',
        duplicates.confidence,
        message.channel || '',
        [messageId],
        duplicates,
        client
      );
    }

    // Detect anomalies
    const anomaly = await detectAnomalies(message.channel || '', workspaceId);
    if (anomaly.isAnomaly && anomaly.confidence > 0.6) {
      await createAndPostAnomaly(
        workspaceId,
        anomaly.type as any,
        anomaly.confidence,
        message.channel || '',
        [messageId],
        anomaly,
        client
      );
    }
  } catch (error) {
    console.error('Error processing message:', error);
  }
}

async function createAndPostAnomaly(
  workspaceId: string,
  type: 'duplicate' | 'spike' | 'anomaly',
  confidence: number,
  channel: string,
  messageIds: string[],
  context: any,
  client: WebClient
) {
  try {
    const db = await getDatabase();
    const anomalyId = randomUUID();

    // Store anomaly
    await db.query(
      `INSERT INTO anomalies (id, workspace_id, type, confidence, channel, message_ids, context)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [anomalyId, workspaceId, type, confidence, channel, messageIds, JSON.stringify(context)]
    );

    // Post to #anomalies channel
    const token = await getWorkspaceToken(workspaceId);
    if (token) {
      const anomalyClient = new WebClient(token);
      await anomalyClient.chat.postMessage({
        channel: 'anomalies',
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: `${type.charAt(0).toUpperCase() + type.slice(1)} Detected`,
              emoji: true,
            },
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Channel:*\n#${channel}`,
              },
              {
                type: 'mrkdwn',
                text: `*Confidence:*\n${(confidence * 100).toFixed(1)}%`,
              },
            ],
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Context:*\n${JSON.stringify(context).substring(0, 200)}...`,
            },
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: 'Review in Dashboard',
                },
                url: `${process.env.FRONTEND_URL}/anomalies/${anomalyId}`,
                style: 'primary',
              },
            ],
          },
        ],
      });
    }
  } catch (error) {
    console.error('Error creating anomaly alert:', error);
  }
}

async function handleFeedbackCommand(command: SlashCommand, respond: any) {
  try {
    respond({
      text: 'Please provide feedback on anomalies via the dashboard.',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Open the dashboard to review and provide feedback: ${process.env.FRONTEND_URL}`,
          },
        },
      ],
    });
  } catch (error) {
    console.error('Error handling feedback command:', error);
  }
}

async function getWorkspaceToken(workspaceId: string): Promise<string | null> {
  try {
    const db = await getDatabase();
    const result = await db.query(
      'SELECT access_token FROM workspace_tokens WHERE workspace_id = $1',
      [workspaceId]
    );

    if (result.rows.length > 0) {
      return result.rows[0].access_token;
    }
    return null;
  } catch (error) {
    console.error('Error getting workspace token:', error);
    return null;
  }
}

export async function getSlackApp() {
  return slackApp;
}
