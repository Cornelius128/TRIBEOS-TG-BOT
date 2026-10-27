import { PrismaClient } from "@prisma/client";

// Prisma's default pool is (CPUs × 2 + 1), and Railway containers can report the host's CPU
// count, so cap it explicitly to stay under Postgres' max_connections.
function databaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  const limit = process.env.DB_CONNECTION_LIMIT;
  if (!url || !limit || url.includes("connection_limit=")) return url;
  return `${url}${url.includes("?") ? "&" : "?"}connection_limit=${limit}&pool_timeout=20`;
}

const url = databaseUrl();

export const prisma = new PrismaClient({
  ...(url ? { datasourceUrl: url } : {}),
  log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
});
