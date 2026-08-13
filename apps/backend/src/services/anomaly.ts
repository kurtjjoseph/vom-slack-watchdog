import { getDatabase } from '../db/db.js';
import type { AnomalyDetectionResult } from '../types/index.js';

export async function detectAnomalies(
  channel: string,
  workspaceId: string
): Promise<AnomalyDetectionResult & { confidence: number }> {
  try {
    // Check for volume spikes
    const spikeDetection = await detectVolumeSpikeInChannel(channel, workspaceId);
    if (spikeDetection.isAnomaly) {
      return spikeDetection;
    }

    // Check for unusual frequency patterns
    const frequencyAnomalies = await detectFrequencyPatterns(channel, workspaceId);
    if (frequencyAnomalies.isAnomaly) {
      return frequencyAnomalies;
    }

    return {
      isAnomaly: false,
      type: 'spike',
      confidence: 0,
      description: 'No anomalies detected',
    };
  } catch (error) {
    console.error('Error detecting anomalies:', error);
    return {
      isAnomaly: false,
      type: 'spike',
      confidence: 0,
      description: 'Error during anomaly detection',
    };
  }
}

async function detectVolumeSpikeInChannel(
  channel: string,
  workspaceId: string
): Promise<AnomalyDetectionResult & { confidence: number }> {
  try {
    const db = await getDatabase();

    // Get message counts for last hour and previous 24 hours
    const result = await db.query(
      `
      SELECT
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '1 hour' THEN 1 END) as last_hour_count,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' AND created_at <= NOW() - INTERVAL '1 hour' THEN 1 END) as previous_day_count
      FROM messages
      WHERE channel = $1 AND workspace_id = $2
      `,
      [channel, workspaceId]
    );

    const { last_hour_count, previous_day_count } = result.rows[0] || {
      last_hour_count: 0,
      previous_day_count: 0,
    };

    // Calculate average for previous day (excluding last hour)
    const avgPerHour = previous_day_count > 0 ? previous_day_count / 23 : 0;
    const spike = avgPerHour > 0 ? (last_hour_count - avgPerHour) / avgPerHour : 0;

    if (spike > 2.0 && last_hour_count > 5) {
      return {
        isAnomaly: true,
        type: 'spike',
        confidence: Math.min(0.95, 0.5 + spike * 0.1),
        description: `${spike.toFixed(1)}x spike in message volume (${last_hour_count} messages in last hour vs avg ${avgPerHour.toFixed(1)}/hour)`,
      };
    }

    return {
      isAnomaly: false,
      type: 'spike',
      confidence: 0,
      description: 'No volume spike detected',
    };
  } catch (error) {
    console.error('Error detecting volume spike:', error);
    return {
      isAnomaly: false,
      type: 'spike',
      confidence: 0,
      description: 'Error during volume analysis',
    };
  }
}

async function detectFrequencyPatterns(
  channel: string,
  workspaceId: string
): Promise<AnomalyDetectionResult & { confidence: number }> {
  try {
    const db = await getDatabase();

    // Get unique users posting in last 24 hours
    const result = await db.query(
      `
      SELECT
        user_id,
        COUNT(*) as message_count,
        COUNT(DISTINCT DATE_TRUNC('hour', created_at)) as active_hours
      FROM messages
      WHERE channel = $1
      AND workspace_id = $2
      AND created_at > NOW() - INTERVAL '24 hours'
      GROUP BY user_id
      ORDER BY message_count DESC
      LIMIT 5
      `,
      [channel, workspaceId]
    );

    const users = result.rows || [];

    // Check if single user is dominating (>60% of messages)
    if (users.length > 0) {
      const totalMessages = users.reduce((sum: number, u: any) => sum + u.message_count, 0);
      const topUserPercentage = (users[0].message_count / totalMessages) * 100;

      if (topUserPercentage > 60 && totalMessages > 10) {
        return {
          isAnomaly: true,
          type: 'frequency',
          confidence: Math.min(0.9, 0.4 + topUserPercentage * 0.005),
          description: `Single user (${users[0].user_id}) posting ${topUserPercentage.toFixed(1)}% of messages`,
        };
      }
    }

    return {
      isAnomaly: false,
      type: 'frequency',
      confidence: 0,
      description: 'No unusual frequency patterns detected',
    };
  } catch (error) {
    console.error('Error detecting frequency patterns:', error);
    return {
      isAnomaly: false,
      type: 'frequency',
      confidence: 0,
      description: 'Error during frequency analysis',
    };
  }
}

export async function getAnomalyTrends(
  workspaceId: string,
  days: number = 7
): Promise<Record<string, number>> {
  try {
    const db = await getDatabase();

    const result = await db.query(
      `
      SELECT
        type,
        COUNT(*) as count
      FROM anomalies
      WHERE workspace_id = $1
      AND created_at > NOW() - INTERVAL '${days} days'
      GROUP BY type
      `,
      [workspaceId]
    );

    const trends: Record<string, number> = {};
    result.rows.forEach((row: any) => {
      trends[row.type] = row.count;
    });

    return trends;
  } catch (error) {
    console.error('Error getting anomaly trends:', error);
    return {};
  }
}
