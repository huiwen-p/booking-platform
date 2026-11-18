import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { IncomingMessage } from 'node:http';
import { parseJsonBody } from '../../src/native/http/body-parser.js';
import {
  MalformedJsonError,
  PayloadTooLargeError,
} from '../../src/shared/errors/index.js';

function createMockRequest(chunks: Buffer[]): IncomingMessage {
  const readable = new Readable({
    read() {
      for (const chunk of chunks) {
        this.push(chunk);
      }
      this.push(null);
    },
  });
  return readable as unknown as IncomingMessage;
}

describe('Unit: Native Body Parser', () => {
  it('should parse valid JSON object', async () => {
    const data = { message: 'hello', count: 42 };
    const req = createMockRequest([Buffer.from(JSON.stringify(data))]);

    const result = await parseJsonBody<typeof data>(req);
    assert.deepEqual(result, data);
  });

  it('should resolve empty object when stream is empty', async () => {
    const req = createMockRequest([]);
    const result = await parseJsonBody(req);
    assert.deepEqual(result, {});
  });

  it('should reject with MalformedJsonError when JSON is invalid', async () => {
    const req = createMockRequest([Buffer.from('{"invalid": json...')]);

    await assert.rejects(
      async () => {
        await parseJsonBody(req);
      },
      (err: unknown) => {
        assert.ok(err instanceof MalformedJsonError);
        assert.equal((err as MalformedJsonError).statusCode, 400);
        return true;
      }
    );
  });

  it('should reject with PayloadTooLargeError when payload exceeds maxBytes limit', async () => {
    const largeChunk = Buffer.alloc(200, 'a');
    const req = createMockRequest([largeChunk]);

    await assert.rejects(
      async () => {
        // Set maxBytes limit to 100 bytes
        await parseJsonBody(req, 100);
      },
      (err: unknown) => {
        assert.ok(err instanceof PayloadTooLargeError);
        assert.equal((err as PayloadTooLargeError).statusCode, 413);
        return true;
      }
    );
  });
});
