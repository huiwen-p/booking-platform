import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn'],
  });

  app.useGlobalFilters(new HttpExceptionFilter());

  const PORT = parseInt(process.env.PORT || '3001', 10);
  await app.listen(PORT);
  console.log(`[NestJS Engine] Server is listening on http://localhost:${PORT}`);
}

bootstrap();
