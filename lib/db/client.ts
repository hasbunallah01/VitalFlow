/**
 * Prisma client singleton.
 *
 * In Next.js dev, hot-reload can create many PrismaClient instances and
 * exhaust the connection pool. The singleton pattern is the standard
 * workaround.
 *
 * In tests (vitest), we set the global instance to a fresh client per
 * test file so transaction rollbacks work cleanly.
 */

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
