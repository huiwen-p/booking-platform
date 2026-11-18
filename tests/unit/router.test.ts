import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { IncomingMessage, ServerResponse } from 'node:http';
import { NativeRouter } from '../../src/native/http/router.js';
import {
  MethodNotAllowedError,
  NotFoundError,
} from '../../src/shared/errors/index.js';

describe('Unit: Native Router', () => {
  it('should route matching method and path, extracting params correctly', async () => {
    const router = new NativeRouter();
    let handled = false;
    let extractedParam = '';

    router.get('/events/:id', (_req, _res, ctx) => {
      handled = true;
      extractedParam = ctx.params.id;
    });

    const mockReq = { method: 'GET' } as IncomingMessage;
    const mockRes = {} as ServerResponse;

    await router.handle(
      mockReq,
      mockRes,
      '/events/evt-123',
      new URLSearchParams()
    );

    assert.equal(handled, true);
    assert.equal(extractedParam, 'evt-123');
  });

  it('should throw MethodNotAllowedError (405) when path exists but method does not match', async () => {
    const router = new NativeRouter();
    router.get('/health', (_req, _res) => {});

    const mockReq = { method: 'POST' } as IncomingMessage;
    const mockRes = {} as ServerResponse;

    await assert.rejects(
      async () => {
        await router.handle(
          mockReq,
          mockRes,
          '/health',
          new URLSearchParams()
        );
      },
      (err: unknown) => {
        assert.ok(err instanceof MethodNotAllowedError);
        assert.equal((err as MethodNotAllowedError).statusCode, 405);
        return true;
      }
    );
  });

  it('should throw NotFoundError (404) when path does not match any registered route', async () => {
    const router = new NativeRouter();
    router.get('/health', (_req, _res) => {});

    const mockReq = { method: 'GET' } as IncomingMessage;
    const mockRes = {} as ServerResponse;

    await assert.rejects(
      async () => {
        await router.handle(
          mockReq,
          mockRes,
          '/unknown/path',
          new URLSearchParams()
        );
      },
      (err: unknown) => {
        assert.ok(err instanceof NotFoundError);
        assert.equal((err as NotFoundError).statusCode, 404);
        return true;
      }
    );
  });
});
