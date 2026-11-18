import { IncomingMessage, ServerResponse } from 'node:http';
import { MethodNotAllowedError, NotFoundError } from '../../shared/errors/index.js';

export interface RouteContext {
  params: Record<string, string>;
  searchParams: URLSearchParams;
}

export type RouteHandler = (
  req: IncomingMessage,
  res: ServerResponse,
  context: RouteContext
) => Promise<void> | void;

interface RouteEntry {
  method: string;
  pattern: string;
  regex: RegExp;
  paramNames: string[];
  handler: RouteHandler;
}

export class NativeRouter {
  private routes: RouteEntry[] = [];

  public add(method: string, pattern: string, handler: RouteHandler): void {
    const paramNames: string[] = [];
    const regexPattern = pattern.replace(/:([a-zA-Z0-9_]+)/g, (_, name) => {
      paramNames.push(name);
      return `(?<${name}>[^/]+)`;
    });

    const regex = new RegExp(`^${regexPattern}$`);
    this.routes.push({
      method: method.toUpperCase(),
      pattern,
      regex,
      paramNames,
      handler,
    });
  }

  public get(pattern: string, handler: RouteHandler): void {
    this.add('GET', pattern, handler);
  }

  public post(pattern: string, handler: RouteHandler): void {
    this.add('POST', pattern, handler);
  }

  public put(pattern: string, handler: RouteHandler): void {
    this.add('PUT', pattern, handler);
  }

  public patch(pattern: string, handler: RouteHandler): void {
    this.add('PATCH', pattern, handler);
  }

  public delete(pattern: string, handler: RouteHandler): void {
    this.add('DELETE', pattern, handler);
  }

  public async handle(
    req: IncomingMessage,
    res: ServerResponse,
    pathname: string,
    searchParams: URLSearchParams
  ): Promise<void> {
    const requestMethod = (req.method || 'GET').toUpperCase();
    let methodMismatch = false;

    for (const route of this.routes) {
      const match = route.regex.exec(pathname);
      if (match) {
        if (route.method === requestMethod) {
          const params: Record<string, string> = match.groups ? { ...match.groups } : {};
          await route.handler(req, res, { params, searchParams });
          return;
        } else {
          methodMismatch = true;
        }
      }
    }

    if (methodMismatch) {
      throw new MethodNotAllowedError(`Method ${requestMethod} not allowed for ${pathname}`);
    }

    throw new NotFoundError(`Cannot ${requestMethod} ${pathname}`);
  }
}
