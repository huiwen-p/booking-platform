import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { EventsModule } from './events/events.module.js';
import { BookingsModule } from './bookings/bookings.module.js';
import { HealthController } from './health/health.controller.js';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware.js';

@Module({
  imports: [EventsModule, BookingsModule],
  controllers: [HealthController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}
