import { AppError } from './app-error.js';

export class MalformedJsonError extends AppError {
  constructor(message = 'Malformed JSON payload') {
    super(400, 'Bad Request', message);
  }
}
