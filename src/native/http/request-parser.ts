import { IncomingMessage } from 'node:http';

export interface ParsedRequestInfo {
  pathname: string;
  searchParams: URLSearchParams;
}

export function parseRequestUrl(req: IncomingMessage): ParsedRequestInfo {
  const host = req.headers.host || 'localhost';
  const urlObj = new URL(req.url || '/', `http://${host}`);
  return {
    pathname: urlObj.pathname,
    searchParams: urlObj.searchParams,
  };
}
