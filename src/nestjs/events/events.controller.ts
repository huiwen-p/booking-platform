import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  HttpCode,
  Res,
  Inject,
} from '@nestjs/common';
import { Response } from 'express';
import { EventsService } from './events.service.js';
import {
  CreateEventDto,
  Event,
  PatchEventDto,
  UpdateEventDto,
} from '../../shared/types.js';

@Controller('events')
export class EventsController {
  constructor(@Inject(EventsService) private readonly eventsService: EventsService) {}

  @Get()
  findAll(@Query('code') code?: string): Event[] {
    return this.eventsService.findAll(code);
  }

  @Get(':id')
  findById(@Param('id') id: string): Event {
    return this.eventsService.findById(id);
  }

  @Post()
  @HttpCode(201)
  create(
    @Body() dto: CreateEventDto,
    @Res({ passthrough: true }) res: Response
  ): Event {
    const event = this.eventsService.create(dto);
    res.header('Location', `/events/${event.id}`);
    return event;
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEventDto): Event {
    return this.eventsService.update(id, dto);
  }

  @Patch(':id')
  patch(@Param('id') id: string, @Body() dto: PatchEventDto): Event {
    return this.eventsService.patch(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  delete(@Param('id') id: string): void {
    this.eventsService.delete(id);
  }
}
