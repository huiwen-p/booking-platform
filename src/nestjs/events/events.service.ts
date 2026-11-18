import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { InMemoryStore } from '../../shared/storage/in-memory-store.js';
import {
  CreateEventDto,
  Event,
  PatchEventDto,
  UpdateEventDto,
} from '../../shared/types.js';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../shared/errors/index.js';

@Injectable()
export class EventsService {
  private readonly store = InMemoryStore.getInstance();

  public findAll(codeFilter?: string): Event[] {
    let result = Array.from(this.store.events.values());
    if (codeFilter) {
      result = result.filter(
        (e) => e.code.toLowerCase() === codeFilter.toLowerCase()
      );
    }
    return result;
  }

  public findById(id: string): Event {
    const event = this.store.events.get(id);
    if (!event) {
      throw new NotFoundError(`Event with id '${id}' not found`);
    }
    return event;
  }

  public create(dto: CreateEventDto): Event {
    if (!dto.code || typeof dto.code !== 'string') {
      throw new ValidationError("Field 'code' is required and must be a string");
    }
    if (!dto.title || typeof dto.title !== 'string') {
      throw new ValidationError("Field 'title' is required and must be a string");
    }
    if (
      dto.totalSeats === undefined ||
      typeof dto.totalSeats !== 'number' ||
      dto.totalSeats <= 0 ||
      !Number.isInteger(dto.totalSeats)
    ) {
      throw new ValidationError(
        "Field 'totalSeats' is required and must be a positive integer"
      );
    }
    if (!dto.startsAt || typeof dto.startsAt !== 'string') {
      throw new ValidationError(
        "Field 'startsAt' is required and must be an ISO date string"
      );
    }

    const existing = this.store.findEventByCode(dto.code);
    if (existing) {
      throw new ConflictError(`Event with code '${dto.code}' already exists`);
    }

    const id = randomUUID();
    const now = new Date().toISOString();
    const newEvent: Event = {
      id,
      code: dto.code.trim(),
      title: dto.title.trim(),
      description: dto.description?.trim(),
      totalSeats: dto.totalSeats,
      startsAt: dto.startsAt,
      createdAt: now,
      updatedAt: now,
    };

    this.store.events.set(id, newEvent);
    return newEvent;
  }

  public update(id: string, dto: UpdateEventDto): Event {
    const existing = this.findById(id);

    if (!dto.code || typeof dto.code !== 'string') {
      throw new ValidationError("Field 'code' is required and must be a string");
    }
    if (!dto.title || typeof dto.title !== 'string') {
      throw new ValidationError("Field 'title' is required and must be a string");
    }
    if (
      dto.totalSeats === undefined ||
      typeof dto.totalSeats !== 'number' ||
      dto.totalSeats <= 0 ||
      !Number.isInteger(dto.totalSeats)
    ) {
      throw new ValidationError(
        "Field 'totalSeats' is required and must be a positive integer"
      );
    }
    if (!dto.startsAt || typeof dto.startsAt !== 'string') {
      throw new ValidationError("Field 'startsAt' is required and must be a string");
    }

    const duplicate = this.store.findEventByCode(dto.code);
    if (duplicate && duplicate.id !== id) {
      throw new ConflictError(`Event with code '${dto.code}' already exists`);
    }

    const updatedEvent: Event = {
      ...existing,
      code: dto.code.trim(),
      title: dto.title.trim(),
      description: dto.description?.trim(),
      totalSeats: dto.totalSeats,
      startsAt: dto.startsAt,
      updatedAt: new Date().toISOString(),
    };

    this.store.events.set(id, updatedEvent);
    return updatedEvent;
  }

  public patch(id: string, dto: PatchEventDto): Event {
    const existing = this.findById(id);

    if (dto.code !== undefined) {
      if (typeof dto.code !== 'string' || !dto.code.trim()) {
        throw new ValidationError("Field 'code' must be a non-empty string");
      }
      const duplicate = this.store.findEventByCode(dto.code);
      if (duplicate && duplicate.id !== id) {
        throw new ConflictError(`Event with code '${dto.code}' already exists`);
      }
      existing.code = dto.code.trim();
    }

    if (dto.title !== undefined) {
      if (typeof dto.title !== 'string' || !dto.title.trim()) {
        throw new ValidationError("Field 'title' must be a non-empty string");
      }
      existing.title = dto.title.trim();
    }

    if (dto.description !== undefined) {
      existing.description = dto.description.trim();
    }

    if (dto.totalSeats !== undefined) {
      if (
        typeof dto.totalSeats !== 'number' ||
        dto.totalSeats <= 0 ||
        !Number.isInteger(dto.totalSeats)
      ) {
        throw new ValidationError(
          "Field 'totalSeats' must be a positive integer"
        );
      }
      existing.totalSeats = dto.totalSeats;
    }

    if (dto.startsAt !== undefined) {
      if (typeof dto.startsAt !== 'string' || !dto.startsAt.trim()) {
        throw new ValidationError("Field 'startsAt' must be a valid date string");
      }
      existing.startsAt = dto.startsAt;
    }

    existing.updatedAt = new Date().toISOString();
    this.store.events.set(id, existing);
    return existing;
  }

  public delete(id: string): void {
    this.store.deleteEvent(id);
  }
}
