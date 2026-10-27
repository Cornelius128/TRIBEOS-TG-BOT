import * as Sentry from "@sentry/node";

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.RAILWAY_ENVIRONMENT ?? process.env.NODE_ENV ?? "development",
    tracesSampleRate: 0,
  });
}

export function captureError(err: unknown, context?: Record<string, unknown>) {
  console.error(err, context ?? "");
  if (dsn) Sentry.captureException(err, context ? { extra: context } : undefined);
}

export async function flushErrors() {
  if (dsn) await Sentry.flush(2000);
}
