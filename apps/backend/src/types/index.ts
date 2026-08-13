import { z } from 'zod';

export interface SlackMessage {
  id: string;
  text: string;
  channel: string;
  userId: string;
  timestamp: number;
  threadTs?: string;
}

export interface AnomalyAlert {
  id: string;
  type: 'duplicate' | 'spike' | 'anomaly';
  confidence: number;
  channel: string;
  messageIds: string[];
  context: Record<string, unknown>;
  flagged: boolean;
  feedback?: string;
  createdAt: Date;
}

export interface PatternCluster {
  id: string;
  keywords: string[];
  channels: string[];
  frequency: number;
  lastSeen: Date;
}

export const FlaggedItemSchema = z.object({
  id: z.string(),
  type: z.enum(['duplicate', 'spike', 'anomaly']),
  confidence: z.number().min(0).max(1),
  channel: z.string(),
  messageIds: z.array(z.string()),
  context: z.record(z.unknown()),
  flagged: z.boolean(),
  feedback: z.string().optional(),
  createdAt: z.date(),
});

export type FlaggedItem = z.infer<typeof FlaggedItemSchema>;

export interface ClaudeAnalysisResult {
  isDuplicate: boolean;
  confidence: number;
  summary: string;
  relatedMessages?: string[];
}

export interface AnomalyDetectionResult {
  isAnomaly: boolean;
  type: 'spike' | 'frequency' | 'pattern';
  confidence: number;
  description: string;
}
