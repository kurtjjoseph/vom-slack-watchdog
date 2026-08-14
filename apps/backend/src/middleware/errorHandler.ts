import { Request, Response, NextFunction } from 'express';
import * as Sentry from '@sentry/node';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
}

export function errorHandler(
  error: ApiError,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  console.error(`[${statusCode}] ${message}`, error);

  if (process.env.SENTRY_DSN) {
    Sentry.captureException(error);
  }

  res.status(statusCode).json({
    error: message,
    code: error.code || 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  });
}

export function createApiError(message: string, statusCode: number = 500, code?: string): ApiError {
  const error = new Error(message) as ApiError;
  error.statusCode = statusCode;
  error.code = code;
  return error;
}
