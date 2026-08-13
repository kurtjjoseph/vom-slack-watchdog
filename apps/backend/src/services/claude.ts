import Anthropic from '@anthropic-ai/sdk';
import { getDatabase } from '../db/db.js';
import type { ClaudeAnalysisResult } from '../types/index.js';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function detectDuplicates(
  messageText: string,
  channel: string
): Promise<ClaudeAnalysisResult> {
  try {
    const db = await getDatabase();

    // Get recent messages from the same channel
    const result = await db.query(
      `SELECT id, text, channel FROM messages
       WHERE channel = $1
       AND created_at > NOW() - INTERVAL '7 days'
       ORDER BY created_at DESC
       LIMIT 20`,
      [channel]
    );

    const recentMessages = result.rows;

    if (recentMessages.length === 0) {
      return {
        isDuplicate: false,
        confidence: 0,
        summary: 'No recent messages to compare',
      };
    }

    // Use Claude to analyze semantic similarity
    const messageTexts = recentMessages.map((m: any) => m.text).join('\n\n---\n\n');

    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: `Analyze if this new message is a duplicate of any recent messages:

NEW MESSAGE:
"${messageText}"

RECENT MESSAGES:
${messageTexts}

Respond in JSON format: { "isDuplicate": boolean, "confidence": number (0-1), "summary": string, "relatedMessageIndices": number[] }`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        isDuplicate: false,
        confidence: 0,
        summary: 'Could not parse response',
      };
    }

    const analysis = JSON.parse(jsonMatch[0]) as any;

    return {
      isDuplicate: analysis.isDuplicate || false,
      confidence: analysis.confidence || 0,
      summary: analysis.summary || '',
      relatedMessages: analysis.relatedMessageIndices?.map((idx: number) => recentMessages[idx]?.id),
    };
  } catch (error) {
    console.error('Error detecting duplicates:', error);
    return {
      isDuplicate: false,
      confidence: 0,
      summary: 'Error analyzing message',
    };
  }
}

export async function analyzePatterns(channel: string, workspaceId: string): Promise<string[]> {
  try {
    const db = await getDatabase();

    // Get messages from last 30 days
    const result = await db.query(
      `SELECT text FROM messages
       WHERE channel = $1
       AND workspace_id = $2
       AND created_at > NOW() - INTERVAL '30 days'
       ORDER BY created_at DESC
       LIMIT 100`,
      [channel, workspaceId]
    );

    const messages = result.rows.map((r: any) => r.text);

    if (messages.length < 5) {
      return [];
    }

    // Use Claude to identify themes
    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: `Identify the top 5 recurring themes, topics, or keywords from these Slack messages:

${messages.slice(0, 30).join('\n\n')}

Respond in JSON format: { "themes": ["theme1", "theme2", ...], "keywordClusters": [["keyword1", "keyword2"], ...] }`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return [];
    }

    const analysis = JSON.parse(jsonMatch[0]) as any;
    return analysis.themes || [];
  } catch (error) {
    console.error('Error analyzing patterns:', error);
    return [];
  }
}
