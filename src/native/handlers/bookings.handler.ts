import { IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { RouteContext } from '../http/router.js';
import { parseJsonBody } from '../http/body-parser.js';
import { sendJson, sendEmpty } from '../http/response-helper.js';
import { InMemoryStore } from '../../shared/storage/in-memory-store.js';
import { NotFoundError, ValidationError } from '../../shared/errors/index.js';
import { Booking, CreateBookingDto } from '../../shared/types.js';

const store = InMemoryStore.getInstance();

export async function getBookings(
  _req: IncomingMessage,
  res: ServerResponse,
  ctx: RouteContext
): Promise<void> {
  const eventIdFilter = ctx.searchParams.get('eventId');
  let result = Array.from(store.bookings.values());

  if (eventIdFilter) {
    result = result.filter((b) => b.eventId === eventIdFilter);
  }

  sendJson(res, 200, result);
}

export async function getBookingById(
  _req: IncomingMessage,
  res: ServerResponse,
  ctx: RouteContext
): Promise<void> {
  const { id } = ctx.params;
  const booking = store.bookings.get(id);

  if (!booking) {
    throw new NotFoundError(`Booking with id '${id}' not found`);
  }

  sendJson(res, 200, booking);
}

export async function createBooking(
  req: IncomingMessage,
  res: ServerResponse,
  _ctx: RouteContext
): Promise<void> {
  const body = await parseJsonBody<CreateBookingDto>(req);

  if (!body.eventId || typeof body.eventId !== 'string') {
    throw new ValidationError("Field 'eventId' is required and must be a string");
  }
  if (!body.customerName || typeof body.customerName !== 'string') {
    throw new ValidationError("Field 'customerName' is required and must be a string");
  }
  if (!body.customerEmail || typeof body.customerEmail !== 'string') {
    throw new ValidationError("Field 'customerEmail' is required and must be a string");
  }

  const event = store.events.get(body.eventId);
  if (!event) {
    throw new NotFoundError(`Event with id '${body.eventId}' does not exist`);
  }

  const seatCount = body.seatCount ?? 1;
  if (typeof seatCount !== 'number' || seatCount <= 0 || !Number.isInteger(seatCount)) {
    throw new ValidationError("Field 'seatCount' must be a positive integer");
  }

  const id = randomUUID();
  const newBooking: Booking = {
    id,
    eventId: body.eventId,
    customerName: body.customerName.trim(),
    customerEmail: body.customerEmail.trim(),
    seatCount,
    status: 'CONFIRMED',
    createdAt: new Date().toISOString(),
  };

  store.bookings.set(id, newBooking);

  sendJson(res, 201, newBooking, {
    Location: `/bookings/${id}`,
  });
}

export async function deleteBooking(
  _req: IncomingMessage,
  res: ServerResponse,
  ctx: RouteContext
): Promise<void> {
  const { id } = ctx.params;
  const booking = store.bookings.get(id);
  if (booking) {
    booking.status = 'CANCELLED';
    store.bookings.set(id, booking);
  }
  sendEmpty(res, 204);
}
