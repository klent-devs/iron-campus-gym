import { ZodError } from 'zod';

/** Error with an HTTP status and a message that is safe to show to staff. */
export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function notFound(req, _res, next) {
  next(new HttpError(404, `Not found: ${req.method} ${req.originalUrl}`));
}

// Express needs all four arguments to treat this as an error handler.
export function errorHandler(err, _req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Please check the form.',
      fields: err.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
    });
  }

  // PostgreSQL constraint errors → friendly messages
  if (err.code === '23505') return res.status(409).json({ error: 'This record already exists.', detail: err.detail });
  if (err.code === '23503') return res.status(409).json({ error: 'This record is linked to other records.', detail: err.detail });
  if (err.code === '23514') return res.status(422).json({ error: 'That change breaks a gym rule.', detail: err.constraint });

  const status = err.status ?? 500;
  if (status >= 500) console.error(err);
  return res.status(status).json({
    error: status >= 500 ? 'Something went wrong. Please try again.' : err.message,
    ...(err.details ? { details: err.details } : {}),
  });
}
