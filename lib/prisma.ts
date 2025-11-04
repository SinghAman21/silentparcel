// Import the generated Prisma client directly. The project generates the client
// into `lib/generated/prisma` (see `prisma/schema.prisma`). Importing from
// the generated folder avoids relying on an installed `@prisma/client` package
// and matches the project's current setup.
import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma: PrismaClient | undefined }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
