export interface Event {
  id: string;
  code: string;
  title: string;
  description?: string;
  totalSeats: number;
  startsAt: string;
  createdAt: string;
  updatedAt: string;
}

export type BookingStatus = 'CONFIRMED' | 'CANCELLED';

export interface Booking {
  id: string;
  eventId: string;
  customerName: string;
  customerEmail: string;
  seatCount: number;
  status: BookingStatus;
  createdAt: string;
}

export interface CreateEventDto {
  code: string;
  title: string;
  description?: string;
  totalSeats: number;
  startsAt: string;
}

export interface UpdateEventDto {
  code: string;
  title: string;
  description?: string;
  totalSeats: number;
  startsAt: string;
}

export interface PatchEventDto {
  code?: string;
  title?: string;
  description?: string;
  totalSeats?: number;
  startsAt?: string;
}

export interface CreateBookingDto {
  eventId: string;
  customerName: string;
  customerEmail: string;
  seatCount?: number;
}

export interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string;
  timestamp: string;
  path: string;
}

export interface HealthResponse {
  status: string;
  engine: 'native' | 'nestjs';
  uptime: number;
  timestamp: string;
}
