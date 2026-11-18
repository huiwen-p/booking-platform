import { IncomingMessage } from 'node:http';
import { Buffer } from 'node:buffer';
import { PayloadTooLargeError, MalformedJsonError } from '../../shared/errors/index.js';

export function parseJsonBody<T = unknown>(
  req: IncomingMessage,
  maxBytes = 1024 * 1024
): Promise<T> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let receivedBytes = 0;

    req.on('data', (chunk: Buffer) => {
      receivedBytes += chunk.length;
      if (receivedBytes > maxBytes) {
        req.destroy();
        return reject(new PayloadTooLargeError('Payload exceeds 1MB limit'));
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      if (chunks.length === 0) {
        return resolve({} as T);
      }

      const raw = Buffer.concat(chunks).toString('utf-8').trim();
      if (!raw) {
        return resolve({} as T);
      }

      try {
        const parsed = JSON.parse(raw);
        resolve(parsed as T);
      } catch {
        reject(new MalformedJsonError('Malformed JSON payload'));
      }
    });

    req.on('error', (err) => {
      reject(err);
    });
  });
}
