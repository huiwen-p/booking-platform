import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = process.hrtime.bigint();
    const pathname = req.originalUrl?.split('?')[0] || req.url;

    res.on('finish', () => {
      const durationMs =
        Number(process.hrtime.bigint() - startTime) / 1_000_000;
      console.log(
        `[${new Date().toISOString()}] [NESTJS] ${req.method} ${pathname} -> ${res.statusCode} (${durationMs.toFixed(2)}ms)`
      );
    });

    next();
  }
}
