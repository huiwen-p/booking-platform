import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppError } from '../../../shared/errors/index.js';
import { ErrorResponse } from '../../../shared/types.js';

function isKnownPathWithDifferentMethod(pathname: string, method: string): boolean {
  const m = method.toUpperCase();
  if (pathname === '/health') {
    return m !== 'GET';
  }
  if (pathname === '/events') {
    return !['GET', 'POST'].includes(m);
  }
  if (/^\/events\/[^/]+$/.test(pathname)) {
    return !['GET', 'PUT', 'PATCH', 'DELETE'].includes(m);
  }
  if (pathname === '/bookings') {
    return !['GET', 'POST'].includes(m);
  }
  if (/^\/bookings\/[^/]+$/.test(pathname)) {
    return !['GET', 'DELETE'].includes(m);
  }
  return false;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const pathname = request.url?.split('?')[0] || request.url;
    const method = request.method || 'GET';

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorName = 'Internal Server Error';
    let message = 'An unexpected error occurred';

    if (exception instanceof AppError) {
      statusCode = exception.statusCode;
      errorName = exception.error;
      message = exception.message;
    } else if (
      typeof exception === 'object' &&
      exception !== null &&
      'statusCode' in exception &&
      'error' in exception
    ) {
      // In case instanceof AppError check fails across modules
      const appErr = exception as { statusCode: number; error: string; message: string };
      statusCode = appErr.statusCode;
      errorName = appErr.error;
      message = appErr.message;
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse();

      // Check for 405 Method Not Allowed translation on 404
      if (statusCode === HttpStatus.NOT_FOUND && isKnownPathWithDifferentMethod(pathname, method)) {
        statusCode = HttpStatus.METHOD_NOT_ALLOWED;
        errorName = 'Method Not Allowed';
        message = `Method ${method} not allowed for ${pathname}`;
      } else if (typeof res === 'string') {
        message = res;
        errorName = exception.name;
      } else if (typeof res === 'object' && res !== null) {
        const obj = res as Record<string, unknown>;
        message = (obj['message'] as string) || exception.message;
        errorName = (obj['error'] as string) || exception.name;
      }
    } else if (
      exception instanceof SyntaxError &&
      'body' in (exception as unknown as Record<string, unknown>)
    ) {
      // Body parser JSON parse error from express
      statusCode = HttpStatus.BAD_REQUEST;
      errorName = 'Bad Request';
      message = 'Malformed JSON payload';
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    const errorBody: ErrorResponse = {
      statusCode,
      error: errorName,
      message: Array.isArray(message) ? message.join(', ') : message,
      timestamp: new Date().toISOString(),
      path: pathname,
    };

    response.status(statusCode).json(errorBody);
  }
}
