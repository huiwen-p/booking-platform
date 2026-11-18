import { AppError } from './app-error.js';

export class MethodNotAllowedError extends AppError {
  constructor(message = 'Method Not Allowed') {
    super(405, 'Method Not Allowed', message);
  }
}
