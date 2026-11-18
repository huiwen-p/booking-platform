import { IncomingMessage, ServerResponse } from 'node:http';
import { RouteContext } from '../http/router.js';
import { sendJson } from '../http/response-helper.js';
import { HealthResponse } from '../../shared/types.js';

export function handleHealth(
  _req: IncomingMessage,
  res: ServerResponse,
  _ctx: RouteContext
): void {
  const response: HealthResponse = {
    status: 'ok',
    engine: 'native',
    uptime: Math.round(process.uptime() * 100) / 100,
    timestamp: new Date().toISOString(),
  };
  sendJson(res, 200, response);
}
