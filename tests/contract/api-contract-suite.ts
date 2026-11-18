import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Event, Booking, HealthResponse, ErrorResponse } from '../../src/shared/types.js';

export function runApiContractSuite(
  engineName: 'native' | 'nestjs',
  getBaseUrl: () => string
) {
  describe(`API Contract Suite [${engineName.toUpperCase()}]`, () => {
    let createdEventId = '';
    let createdBookingId = '';

    it('1. GET /health should return 200 OK with engine metadata', async () => {
      const res = await fetch(`${getBaseUrl()}/health`);
      assert.equal(res.status, 200);
      assert.match(
        res.headers.get('content-type') || '',
        /application\/json/i
      );

      const body = (await res.json()) as HealthResponse;
      assert.equal(body.status, 'ok');
      assert.equal(body.engine, engineName);
      assert.equal(typeof body.uptime, 'number');
      assert.ok(body.timestamp);
    });

    it('2. POST /events with valid data should return 201 Created and Location header', async () => {
      const payload = {
        code: `TECH-${Date.now()}`,
        title: 'Tech Summit 2026',
        description: 'Annual technology conference',
        totalSeats: 250,
        startsAt: '2026-12-15T09:00:00Z',
      };

      const res = await fetch(`${getBaseUrl()}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      assert.equal(res.status, 201);
      const location = res.headers.get('location');
      assert.ok(location, 'Expected Location header in 201 response');

      const body = (await res.json()) as Event;
      assert.ok(body.id);
      assert.equal(body.code, payload.code);
      assert.equal(body.title, payload.title);
      assert.equal(body.totalSeats, 250);
      assert.equal(location, `/events/${body.id}`);

      createdEventId = body.id;
    });

    it('3. POST /events with duplicate code should return 409 Conflict', async () => {
      const payload = {
        code: `DUP-${Date.now()}`,
        title: 'Duplicate Event Test',
        totalSeats: 100,
        startsAt: '2026-12-20T09:00:00Z',
      };

      // First create succeeds
      const res1 = await fetch(`${getBaseUrl()}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      assert.equal(res1.status, 201);

      // Second create with duplicate code fails
      const res2 = await fetch(`${getBaseUrl()}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      assert.equal(res2.status, 409);

      const body = (await res2.json()) as ErrorResponse;
      assert.equal(body.statusCode, 409);
      assert.equal(body.error, 'Conflict');
      assert.match(body.message, /already exists/i);
    });

    it('4. POST /events with malformed JSON body should return 400 Bad Request', async () => {
      const res = await fetch(`${getBaseUrl()}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"code": "BROKEN_JSON, missing_closing_bracket...',
      });

      assert.equal(res.status, 400);
      const body = (await res.json()) as ErrorResponse;
      assert.equal(body.statusCode, 400);
      assert.equal(body.error, 'Bad Request');
    });

    it('5. POST /events missing required fields should return 422 Unprocessable Entity', async () => {
      const invalidPayload = {
        title: 'No Code Provided',
        totalSeats: 50,
      };

      const res = await fetch(`${getBaseUrl()}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidPayload),
      });

      assert.equal(res.status, 422);
      const body = (await res.json()) as ErrorResponse;
      assert.equal(body.statusCode, 422);
      assert.equal(body.error, 'Unprocessable Entity');
    });

    it('6. GET /events should return 200 OK and array of events', async () => {
      const res = await fetch(`${getBaseUrl()}/events`);
      assert.equal(res.status, 200);

      const list = (await res.json()) as Event[];
      assert.ok(Array.isArray(list));
      assert.ok(list.length > 0);
      assert.ok(list.some((e) => e.id === createdEventId));
    });

    it('7. GET /events/:id with non-existent ID should return 404 Not Found', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const res = await fetch(`${getBaseUrl()}/events/${nonExistentId}`);
      assert.equal(res.status, 404);

      const body = (await res.json()) as ErrorResponse;
      assert.equal(body.statusCode, 404);
      assert.equal(body.error, 'Not Found');
    });

    it('8. PUT /events/:id should fully replace event (Idempotent 200 OK)', async () => {
      const putPayload = {
        code: `REPLACED-${Date.now()}`,
        title: 'Fully Replaced Event Title',
        description: 'New Description',
        totalSeats: 300,
        startsAt: '2026-12-30T10:00:00Z',
      };

      // Call once
      const res1 = await fetch(`${getBaseUrl()}/events/${createdEventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(putPayload),
      });
      assert.equal(res1.status, 200);
      const body1 = (await res1.json()) as Event;
      assert.equal(body1.title, putPayload.title);
      assert.equal(body1.totalSeats, 300);

      // Call second time with same payload (Idempotency check)
      const res2 = await fetch(`${getBaseUrl()}/events/${createdEventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(putPayload),
      });
      assert.equal(res2.status, 200);
    });

    it('9. PATCH /events/:id should partially update event (200 OK)', async () => {
      const patchPayload = {
        title: 'Patched Event Title Only',
      };

      const res = await fetch(`${getBaseUrl()}/events/${createdEventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchPayload),
      });
      assert.equal(res.status, 200);

      const body = (await res.json()) as Event;
      assert.equal(body.title, 'Patched Event Title Only');
      assert.equal(body.totalSeats, 300); // Unchanged from previous PUT
    });

    it('10. POST /bookings with non-existent eventId should return 404 Not Found', async () => {
      const nonExistentEventId = '11111111-1111-1111-1111-111111111111';
      const bookingPayload = {
        eventId: nonExistentEventId,
        customerName: 'Bob Customer',
        customerEmail: 'bob@example.com',
        seatCount: 2,
      };

      const res = await fetch(`${getBaseUrl()}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingPayload),
      });
      assert.equal(res.status, 404);

      const body = (await res.json()) as ErrorResponse;
      assert.equal(body.statusCode, 404);
      assert.equal(body.error, 'Not Found');
    });

    it('11. POST /bookings with valid eventId should return 201 Created and Location', async () => {
      const bookingPayload = {
        eventId: createdEventId,
        customerName: 'Alice Johnson',
        customerEmail: 'alice@example.com',
        seatCount: 3,
      };

      const res = await fetch(`${getBaseUrl()}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingPayload),
      });
      assert.equal(res.status, 201);

      const location = res.headers.get('location');
      assert.ok(location);

      const body = (await res.json()) as Booking;
      assert.ok(body.id);
      assert.equal(body.eventId, createdEventId);
      assert.equal(body.customerName, 'Alice Johnson');
      assert.equal(body.status, 'CONFIRMED');
      assert.equal(location, `/bookings/${body.id}`);

      createdBookingId = body.id;
    });

    it('12. DELETE /bookings/:id should return 204 No Content', async () => {
      const res = await fetch(`${getBaseUrl()}/bookings/${createdBookingId}`, {
        method: 'DELETE',
      });
      assert.equal(res.status, 204);
      const text = await res.text();
      assert.equal(text, '', 'Expected empty body for 204 No Content');
    });

    it('13. DELETE /events/:id should return 204 No Content (Idempotent)', async () => {
      const res1 = await fetch(`${getBaseUrl()}/events/${createdEventId}`, {
        method: 'DELETE',
      });
      assert.equal(res1.status, 204);
      const text1 = await res1.text();
      assert.equal(text1, '', 'Expected empty body for 204 No Content');

      // Second delete on same resource returns 204
      const res2 = await fetch(`${getBaseUrl()}/events/${createdEventId}`, {
        method: 'DELETE',
      });
      assert.equal(res2.status, 204);
    });

    it('14. Unsupported method on route should return 405 Method Not Allowed', async () => {
      const res = await fetch(`${getBaseUrl()}/health`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      assert.equal(res.status, 405);

      const body = (await res.json()) as ErrorResponse;
      assert.equal(body.statusCode, 405);
      assert.equal(body.error, 'Method Not Allowed');
    });
  });
}
