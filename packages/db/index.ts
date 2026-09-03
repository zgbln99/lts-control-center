import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __ltsPrisma: PrismaClient | undefined;
}

export const prisma = globalThis.__ltsPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__ltsPrisma = prisma;
}

export * from '@prisma/client';
