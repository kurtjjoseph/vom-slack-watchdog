import { Router, Response } from 'express';
import { randomUUID } from 'crypto';
import { getDatabase } from '../db/db.js';
import { getAnomalyTrends } from '../services/anomaly.js';
import { analyzePatterns } from '../services/claude.js';
import type { AuthRequest } from '../middleware/auth.js';

const router = Router();

// Get all anomalies for workspace
router.get('/anomalies', async (req: AuthRequest, res: Response) => {
  try {
    const { limit = 50, offset = 0, type, flagged } = req.query;
    const workspaceId = req.workspaceId;
    if (!workspaceId) return res.status(401).json({ error: 'Unauthorized' });

    const db = await getDatabase();
    let query = 'SELECT * FROM anomalies WHERE workspace_id = $1';
    const params: any[] = [workspaceId];

    if (type) {
      query += ` AND type = $${params.length + 1}`;
      params.push(type);
    }

    if (flagged !== undefined) {
      query += ` AND flagged = $${params.length + 1}`;
      params.push(flagged === 'true');
    }

    query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit);
    params.push(offset);

    const result = await db.query(query, params);
    const countResult = await db.query('SELECT COUNT(*) as total FROM anomalies WHERE workspace_id = $1', [workspaceId]);

    res.json({
      data: result.rows,
      total: countResult.rows[0].total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error) {
    console.error('Error fetching anomalies:', error);
    res.status(500).json({ error: 'Failed to fetch anomalies' });
  }
});

// Get single anomaly
router.get('/anomalies/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const workspaceId = req.workspaceId;
    if (!workspaceId) return res.status(401).json({ error: 'Unauthorized' });

    const db = await getDatabase();
    const result = await db.query(
      'SELECT * FROM anomalies WHERE id = $1 AND workspace_id = $2',
      [id, workspaceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Anomaly not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching anomaly:', error);
    res.status(500).json({ error: 'Failed to fetch anomaly' });
  }
});

// Update anomaly (flag/unflag, add feedback)
router.patch('/anomalies/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { flagged, feedback } = req.body;
    const workspaceId = req.workspaceId;
    if (!workspaceId) return res.status(401).json({ error: 'Unauthorized' });

    const db = await getDatabase();

    const updates: string[] = [];
    const values: any[] = [id, workspaceId];

    if (flagged !== undefined) {
      updates.push(`flagged = $${values.length + 1}`);
      values.push(flagged);
    }

    if (feedback !== undefined) {
      updates.push(`feedback = $${values.length + 1}`);
      values.push(feedback);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    const query = `UPDATE anomalies SET ${updates.join(', ')} WHERE id = $1 AND workspace_id = $2 RETURNING *`;
    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Anomaly not found' });
    }

    // Log feedback
    if (feedback) {
      const feedbackId = randomUUID();
      await db.query(
        'INSERT INTO user_feedback (id, workspace_id, anomaly_id, is_relevant, feedback_text) VALUES ($1, $2, $3, $4, $5)',
        [feedbackId, workspaceId, id, flagged !== false, feedback]
      );
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating anomaly:', error);
    res.status(500).json({ error: 'Failed to update anomaly' });
  }
});

// Get anomaly statistics
router.get('/stats/anomalies', async (req: AuthRequest, res: Response) => {
  try {
    const { days = 7 } = req.query;
    const workspaceId = req.workspaceId;
    if (!workspaceId) return res.status(401).json({ error: 'Unauthorized' });

    const db = await getDatabase();

    // Get trends
    const trends = await getAnomalyTrends(workspaceId, parseInt(days as string));

    // Get today's count
    const todayResult = await db.query(
      'SELECT COUNT(*) as count FROM anomalies WHERE workspace_id = $1 AND created_at > NOW() - INTERVAL \'1 day\'',
      [workspaceId]
    );

    // Get accuracy (based on feedback)
    const accuracyResult = await db.query(
      `SELECT
        COUNT(CASE WHEN is_relevant THEN 1 END) as relevant,
        COUNT(*) as total
       FROM user_feedback
       WHERE workspace_id = $1`,
      [workspaceId]
    );

    const accuracy =
      accuracyResult.rows[0].total > 0
        ? (accuracyResult.rows[0].relevant / accuracyResult.rows[0].total) * 100
        : 0;

    res.json({
      trends,
      todayCount: todayResult.rows[0].count,
      accuracy: accuracy.toFixed(1),
      feedbackCount: accuracyResult.rows[0].total,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Get patterns for a channel
router.get('/patterns/:channel', async (req: AuthRequest, res: Response) => {
  try {
    const { channel } = req.params;
    const workspaceId = req.workspaceId;
    if (!workspaceId) return res.status(401).json({ error: 'Unauthorized' });

    const db = await getDatabase();

    const result = await db.query(
      `SELECT id, keywords, channels, frequency, last_seen
       FROM patterns
       WHERE workspace_id = $1 AND $2 = ANY(channels)
       ORDER BY frequency DESC
       LIMIT 20`,
      [workspaceId, channel]
    );

    // Also fetch latest themes from Claude analysis
    const themes = await analyzePatterns(channel, workspaceId);

    res.json({
      patterns: result.rows,
      themes,
    });
  } catch (error) {
    console.error('Error fetching patterns:', error);
    res.status(500).json({ error: 'Failed to fetch patterns' });
  }
});

// Get channel statistics
router.get('/channels/stats', async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = req.workspaceId;
    if (!workspaceId) return res.status(401).json({ error: 'Unauthorized' });
    const db = await getDatabase();

    const result = await db.query(
      `SELECT
        channel,
        COUNT(*) as message_count,
        COUNT(DISTINCT user_id) as user_count,
        MAX(created_at) as last_message
       FROM messages
       WHERE workspace_id = $1
       AND created_at > NOW() - INTERVAL '7 days'
       GROUP BY channel
       ORDER BY message_count DESC`,
      [workspaceId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching channel stats:', error);
    res.status(500).json({ error: 'Failed to fetch channel statistics' });
  }
});

// Health check
router.get('/health', (_req: AuthRequest, res: Response) => {
  res.json({ status: 'ok' });
});

export default router;
