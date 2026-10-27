import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Prisma's default pool is (CPUs × 2 + 1), and Railway containers can report the host's CPU
// count, so cap it explicitly to stay under Postgres' max_connections.
function databaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  const limit = process.env.DB_CONNECTION_LIMIT;
  if (!url || !limit || url.includes("connection_limit=")) return url;
  return `${url}${url.includes("?") ? "&" : "?"}connection_limit=${limit}&pool_timeout=20`;
}

const url = databaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(url ? { datasourceUrl: url } : {}),
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
