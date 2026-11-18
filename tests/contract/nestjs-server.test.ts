import 'reflect-metadata';
import { before, after } from 'node:test';
import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AddressInfo } from 'node:net';
import { AppModule } from '../../src/nestjs/app.module.js';
import { HttpExceptionFilter } from '../../src/nestjs/common/filters/http-exception.filter.js';
import { InMemoryStore } from '../../src/shared/storage/in-memory-store.js';
import { runApiContractSuite } from './api-contract-suite.js';

let app: INestApplication;
let baseUrl = '';

before(async () => {
  InMemoryStore.getInstance().reset();

  app = await NestFactory.create(AppModule, {
    logger: false, // Suppress logs during tests
  });

  app.useGlobalFilters(new HttpExceptionFilter());

  // Listen on port 0 for an OS-assigned ephemeral port
  await app.listen(0);

  const server = app.getHttpServer();
  const addr = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${addr.port}`;
});

after(async () => {
  if (app) {
    await app.close();
  }
});

runApiContractSuite('nestjs', () => baseUrl);
