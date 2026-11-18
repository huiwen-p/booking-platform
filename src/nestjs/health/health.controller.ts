import { Controller, Get } from '@nestjs/common';
import { HealthResponse } from '../../shared/types.js';

@Controller('health')
export class HealthController {
  @Get()
  getHealth(): HealthResponse {
    return {
      status: 'ok',
      engine: 'nestjs',
      uptime: Math.round(process.uptime() * 100) / 100,
      timestamp: new Date().toISOString(),
    };
  }
}
