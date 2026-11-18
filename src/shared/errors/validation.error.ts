import { AppError } from './app-error.js';

export class ValidationError extends AppError {
  constructor(message = 'Validation failed') {
    super(422, 'Unprocessable Entity', message);
  }
}
