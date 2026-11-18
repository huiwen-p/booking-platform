import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  HttpCode,
  Res,
  Inject,
} from '@nestjs/common';
import { Response } from 'express';
import { BookingsService } from './bookings.service.js';
import { Booking, CreateBookingDto } from '../../shared/types.js';

@Controller('bookings')
export class BookingsController {
  constructor(@Inject(BookingsService) private readonly bookingsService: BookingsService) {}

  @Get()
  findAll(@Query('eventId') eventId?: string): Booking[] {
    return this.bookingsService.findAll(eventId);
  }

  @Get(':id')
  findById(@Param('id') id: string): Booking {
    return this.bookingsService.findById(id);
  }

  @Post()
  @HttpCode(201)
  create(
    @Body() dto: CreateBookingDto,
    @Res({ passthrough: true }) res: Response
  ): Booking {
    const booking = this.bookingsService.create(dto);
    res.header('Location', `/bookings/${booking.id}`);
    return booking;
  }

  @Delete(':id')
  @HttpCode(204)
  delete(@Param('id') id: string): void {
    this.bookingsService.delete(id);
  }
}
