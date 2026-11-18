import { ServerResponse } from 'node:http';
import { AppError } from '../../shared/errors/index.js';
import { ErrorResponse } from '../../shared/types.js';

export function sendJson(
  res: ServerResponse,
  statusCode: number,
  data: unknown,
  extraHeaders: Record<string, string> = {}
): void {
  const payload = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    ...extraHeaders,
  });
  res.end(payload);
}

export function sendEmpty(
  res: ServerResponse,
  statusCode = 204,
  extraHeaders: Record<string, string> = {}
): void {
  res.writeHead(statusCode, {
    ...extraHeaders,
  });
  res.end();
}

export function sendError(
  res: ServerResponse,
  error: unknown,
  path: string
): void {
  const timestamp = new Date().toISOString();

  if (error instanceof AppError) {
    const errorBody: ErrorResponse = {
      statusCode: error.statusCode,
      error: error.error,
      message: error.message,
      timestamp,
      path,
    };
    sendJson(res, error.statusCode, errorBody);
    return;
  }

  const message = error instanceof Error ? error.message : 'Internal server error';
  const errorBody: ErrorResponse = {
    statusCode: 500,
    error: 'Internal Server Error',
    message,
    timestamp,
    path,
  };
  sendJson(res, 500, errorBody);
}
