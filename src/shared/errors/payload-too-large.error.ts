import { AppError } from './app-error.js';

export class PayloadTooLargeError extends AppError {
  constructor(message = 'Payload exceeds 1MB limit') {
    super(413, 'Payload Too Large', message);
  }
}
