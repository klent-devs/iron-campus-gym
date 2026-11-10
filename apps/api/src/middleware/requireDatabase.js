import { HttpError } from './errorHandler.js';

/**
 * Stops a request early with a clear message when DATABASE_URL is not set yet
 * (the module's service could not be created).
 */
export function requireDatabase(ready) {
  return (_req, _res, next) =>
    ready
      ? next()
      : next(
          new HttpError(
            503,
            "The database isn't set up yet. Copy .env.example to .env, set DATABASE_URL, then run npm run db:migrate.",
          ),
        );
}
