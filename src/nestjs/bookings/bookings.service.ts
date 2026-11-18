import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { InMemoryStore } from '../../shared/storage/in-memory-store.js';
import { Booking, CreateBookingDto } from '../../shared/types.js';
import { NotFoundError, ValidationError } from '../../shared/errors/index.js';

@Injectable()
export class BookingsService {
  private readonly store = InMemoryStore.getInstance();

  public findAll(eventIdFilter?: string): Booking[] {
    let result = Array.from(this.store.bookings.values());
    if (eventIdFilter) {
      result = result.filter((b) => b.eventId === eventIdFilter);
    }
    return result;
  }

  public findById(id: string): Booking {
    const booking = this.store.bookings.get(id);
    if (!booking) {
      throw new NotFoundError(`Booking with id '${id}' not found`);
    }
    return booking;
  }

  public create(dto: CreateBookingDto): Booking {
    if (!dto.eventId || typeof dto.eventId !== 'string') {
      throw new ValidationError("Field 'eventId' is required and must be a string");
    }
    if (!dto.customerName || typeof dto.customerName !== 'string') {
      throw new ValidationError("Field 'customerName' is required and must be a string");
    }
    if (!dto.customerEmail || typeof dto.customerEmail !== 'string') {
      throw new ValidationError("Field 'customerEmail' is required and must be a string");
    }

    const event = this.store.events.get(dto.eventId);
    if (!event) {
      throw new NotFoundError(`Event with id '${dto.eventId}' does not exist`);
    }

    const seatCount = dto.seatCount ?? 1;
    if (typeof seatCount !== 'number' || seatCount <= 0 || !Number.isInteger(seatCount)) {
      throw new ValidationError("Field 'seatCount' must be a positive integer");
    }

    const id = randomUUID();
    const newBooking: Booking = {
      id,
      eventId: dto.eventId,
      customerName: dto.customerName.trim(),
      customerEmail: dto.customerEmail.trim(),
      seatCount,
      status: 'CONFIRMED',
      createdAt: new Date().toISOString(),
    };

    this.store.bookings.set(id, newBooking);
    return newBooking;
  }

  public delete(id: string): void {
    const booking = this.store.bookings.get(id);
    if (booking) {
      booking.status = 'CANCELLED';
      this.store.bookings.set(id, booking);
    }
  }
}
