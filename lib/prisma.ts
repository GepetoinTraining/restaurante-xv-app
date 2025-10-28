import { PrismaClient } from "@prisma/client";

// This singleton pattern prevents multiple instances of Prisma Client
// from being created in development (due to Next.js hot-reloading).

declare global {
  // allow global `var` declarations
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    // (Optional) Uncomment the line below to log all queries to the console
    // log: ['query'],
  });

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}
