import { before, after } from 'node:test';
import http from 'node:http';
import { AddressInfo } from 'node:net';
import { createNativeServer } from '../../src/native/server.js';
import { InMemoryStore } from '../../src/shared/storage/in-memory-store.js';
import { runApiContractSuite } from './api-contract-suite.js';

let server: http.Server;
let baseUrl = '';

before(async () => {
  InMemoryStore.getInstance().reset();
  server = createNativeServer();

  await new Promise<void>((resolve) => {
    // Listen on port 0 for an OS-assigned ephemeral port
    server.listen(0, () => {
      const addr = server.address() as AddressInfo;
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

runApiContractSuite('native', () => baseUrl);
