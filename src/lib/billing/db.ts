import { PrismaClient } from "@prisma/client";

// Standard Next.js singleton pattern: avoid exhausting DB connections from
// hot-reloading in dev, where this module would otherwise re-run on every
// edit and create a new client each time.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
