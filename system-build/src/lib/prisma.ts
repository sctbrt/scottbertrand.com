// Prisma Client Singleton
// Prevents multiple instances in development due to hot reloading
// Configured for Vercel serverless with connection pooling via Prisma Data Proxy

import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    // Datasource URL is configured via DATABASE_URL env var
    // For Vercel Postgres, use connection pooling via DATABASE_URL (pooled)
    // and DATABASE_URL_UNPOOLED for migrations (set in schema.prisma directUrl)
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Graceful shutdown for serverless environments
// Note: In Vercel serverless, connections are managed automatically
// This helps with local development and long-running processes
if (process.env.NODE_ENV === 'production') {
  process.on('beforeExit', async () => {
    await prisma.$disconnect()
  })
}
