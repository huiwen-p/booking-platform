import { Event, Booking } from '../types.js';

export class InMemoryStore {
  private static instance: InMemoryStore;

  public readonly events = new Map<string, Event>();
  public readonly bookings = new Map<string, Booking>();

  private constructor() {}

  public static getInstance(): InMemoryStore {
    if (!InMemoryStore.instance) {
      InMemoryStore.instance = new InMemoryStore();
    }
    return InMemoryStore.instance;
  }

  public findEventByCode(code: string): Event | undefined {
    for (const event of this.events.values()) {
      if (event.code.toLowerCase() === code.toLowerCase()) {
        return event;
      }
    }
    return undefined;
  }

  public findBookingsByEventId(eventId: string): Booking[] {
    const result: Booking[] = [];
    for (const booking of this.bookings.values()) {
      if (booking.eventId === eventId) {
        result.push(booking);
      }
    }
    return result;
  }

  public deleteEvent(id: string): boolean {
    const deleted = this.events.delete(id);
    if (deleted) {
      // Cascade delete or cancel related bookings
      for (const [bookingId, booking] of this.bookings.entries()) {
        if (booking.eventId === id) {
          this.bookings.delete(bookingId);
        }
      }
    }
    return deleted;
  }

  public reset(): void {
    this.events.clear();
    this.bookings.clear();
  }
}
