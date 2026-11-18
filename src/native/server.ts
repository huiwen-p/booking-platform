import http, { IncomingMessage, ServerResponse } from 'node:http';
import { NativeRouter } from './http/router.js';
import { parseRequestUrl } from './http/request-parser.js';
import { sendError } from './http/response-helper.js';
import { handleHealth } from './handlers/health.handler.js';
import {
  createEvent,
  deleteEvent,
  getEventById,
  getEvents,
  patchEvent,
  updateEvent,
} from './handlers/events.handler.js';
import {
  createBooking,
  deleteBooking,
  getBookingById,
  getBookings,
} from './handlers/bookings.handler.js';

export function createNativeServer(): http.Server {
  const router = new NativeRouter();

  // Health route
  router.get('/health', handleHealth);

  // Events routes
  router.get('/events', getEvents);
  router.get('/events/:id', getEventById);
  router.post('/events', createEvent);
  router.put('/events/:id', updateEvent);
  router.patch('/events/:id', patchEvent);
  router.delete('/events/:id', deleteEvent);

  // Bookings routes
  router.get('/bookings', getBookings);
  router.get('/bookings/:id', getBookingById);
  router.post('/bookings', createBooking);
  router.delete('/bookings/:id', deleteBooking);

  const server = http.createServer(
    async (req: IncomingMessage, res: ServerResponse) => {
      const startTime = process.hrtime.bigint();
      const { pathname, searchParams } = parseRequestUrl(req);

      res.on('finish', () => {
        const durationMs =
          Number(process.hrtime.bigint() - startTime) / 1_000_000;
        console.log(
          `[${new Date().toISOString()}] [NATIVE] ${req.method} ${pathname} -> ${res.statusCode} (${durationMs.toFixed(2)}ms)`
        );
      });

      try {
        await router.handle(req, res, pathname, searchParams);
      } catch (err) {
        sendError(res, err, pathname);
      }
    }
  );

  return server;
}
