import { IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { RouteContext } from '../http/router.js';
import { parseJsonBody } from '../http/body-parser.js';
import { sendJson, sendEmpty } from '../http/response-helper.js';
import { InMemoryStore } from '../../shared/storage/in-memory-store.js';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../shared/errors/index.js';
import {
  CreateEventDto,
  Event,
  PatchEventDto,
  UpdateEventDto,
} from '../../shared/types.js';

const store = InMemoryStore.getInstance();

export async function getEvents(
  _req: IncomingMessage,
  res: ServerResponse,
  ctx: RouteContext
): Promise<void> {
  const codeFilter = ctx.searchParams.get('code');
  let result = Array.from(store.events.values());

  if (codeFilter) {
    result = result.filter(
      (e) => e.code.toLowerCase() === codeFilter.toLowerCase()
    );
  }

  sendJson(res, 200, result);
}

export async function getEventById(
  _req: IncomingMessage,
  res: ServerResponse,
  ctx: RouteContext
): Promise<void> {
  const { id } = ctx.params;
  const event = store.events.get(id);

  if (!event) {
    throw new NotFoundError(`Event with id '${id}' not found`);
  }

  sendJson(res, 200, event);
}

export async function createEvent(
  req: IncomingMessage,
  res: ServerResponse,
  _ctx: RouteContext
): Promise<void> {
  const body = await parseJsonBody<CreateEventDto>(req);

  if (!body.code || typeof body.code !== 'string') {
    throw new ValidationError("Field 'code' is required and must be a string");
  }
  if (!body.title || typeof body.title !== 'string') {
    throw new ValidationError("Field 'title' is required and must be a string");
  }
  if (
    body.totalSeats === undefined ||
    typeof body.totalSeats !== 'number' ||
    body.totalSeats <= 0 ||
    !Number.isInteger(body.totalSeats)
  ) {
    throw new ValidationError(
      "Field 'totalSeats' is required and must be a positive integer"
    );
  }
  if (!body.startsAt || typeof body.startsAt !== 'string') {
    throw new ValidationError(
      "Field 'startsAt' is required and must be an ISO date string"
    );
  }

  const existing = store.findEventByCode(body.code);
  if (existing) {
    throw new ConflictError(`Event with code '${body.code}' already exists`);
  }

  const id = randomUUID();
  const now = new Date().toISOString();
  const newEvent: Event = {
    id,
    code: body.code.trim(),
    title: body.title.trim(),
    description: body.description?.trim(),
    totalSeats: body.totalSeats,
    startsAt: body.startsAt,
    createdAt: now,
    updatedAt: now,
  };

  store.events.set(id, newEvent);

  sendJson(res, 201, newEvent, {
    Location: `/events/${id}`,
  });
}

export async function updateEvent(
  req: IncomingMessage,
  res: ServerResponse,
  ctx: RouteContext
): Promise<void> {
  const { id } = ctx.params;
  const existingEvent = store.events.get(id);

  if (!existingEvent) {
    throw new NotFoundError(`Event with id '${id}' not found`);
  }

  const body = await parseJsonBody<UpdateEventDto>(req);

  if (!body.code || typeof body.code !== 'string') {
    throw new ValidationError("Field 'code' is required and must be a string");
  }
  if (!body.title || typeof body.title !== 'string') {
    throw new ValidationError("Field 'title' is required and must be a string");
  }
  if (
    body.totalSeats === undefined ||
    typeof body.totalSeats !== 'number' ||
    body.totalSeats <= 0 ||
    !Number.isInteger(body.totalSeats)
  ) {
    throw new ValidationError(
      "Field 'totalSeats' is required and must be a positive integer"
    );
  }
  if (!body.startsAt || typeof body.startsAt !== 'string') {
    throw new ValidationError("Field 'startsAt' is required and must be a string");
  }

  const duplicate = store.findEventByCode(body.code);
  if (duplicate && duplicate.id !== id) {
    throw new ConflictError(`Event with code '${body.code}' already exists`);
  }

  const updatedEvent: Event = {
    ...existingEvent,
    code: body.code.trim(),
    title: body.title.trim(),
    description: body.description?.trim(),
    totalSeats: body.totalSeats,
    startsAt: body.startsAt,
    updatedAt: new Date().toISOString(),
  };

  store.events.set(id, updatedEvent);
  sendJson(res, 200, updatedEvent);
}

export async function patchEvent(
  req: IncomingMessage,
  res: ServerResponse,
  ctx: RouteContext
): Promise<void> {
  const { id } = ctx.params;
  const existingEvent = store.events.get(id);

  if (!existingEvent) {
    throw new NotFoundError(`Event with id '${id}' not found`);
  }

  const body = await parseJsonBody<PatchEventDto>(req);

  if (body.code !== undefined) {
    if (typeof body.code !== 'string' || !body.code.trim()) {
      throw new ValidationError("Field 'code' must be a non-empty string");
    }
    const duplicate = store.findEventByCode(body.code);
    if (duplicate && duplicate.id !== id) {
      throw new ConflictError(`Event with code '${body.code}' already exists`);
    }
    existingEvent.code = body.code.trim();
  }

  if (body.title !== undefined) {
    if (typeof body.title !== 'string' || !body.title.trim()) {
      throw new ValidationError("Field 'title' must be a non-empty string");
    }
    existingEvent.title = body.title.trim();
  }

  if (body.description !== undefined) {
    existingEvent.description = body.description.trim();
  }

  if (body.totalSeats !== undefined) {
    if (
      typeof body.totalSeats !== 'number' ||
      body.totalSeats <= 0 ||
      !Number.isInteger(body.totalSeats)
    ) {
      throw new ValidationError(
        "Field 'totalSeats' must be a positive integer"
      );
    }
    existingEvent.totalSeats = body.totalSeats;
  }

  if (body.startsAt !== undefined) {
    if (typeof body.startsAt !== 'string' || !body.startsAt.trim()) {
      throw new ValidationError("Field 'startsAt' must be a valid date string");
    }
    existingEvent.startsAt = body.startsAt;
  }

  existingEvent.updatedAt = new Date().toISOString();
  store.events.set(id, existingEvent);

  sendJson(res, 200, existingEvent);
}

export async function deleteEvent(
  _req: IncomingMessage,
  res: ServerResponse,
  ctx: RouteContext
): Promise<void> {
  const { id } = ctx.params;
  store.deleteEvent(id);
  sendEmpty(res, 204);
}
