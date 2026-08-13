import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  userId?: string;
  workspaceId?: string;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Invalid authorization header format' });
  }

  const token = parts[1];
  const secret = process.env.JWT_SECRET || 'default-secret-change-me';

  try {
    const decoded = jwt.verify(token, secret) as { workspaceId: string; userId: string };
    req.workspaceId = decoded.workspaceId;
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function generateToken(workspaceId: string, userId: string): string {
  const secret = process.env.JWT_SECRET || 'default-secret-change-me';
  return jwt.sign({ workspaceId, userId }, secret, { expiresIn: '24h' });
}
