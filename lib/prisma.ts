import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

declare global {
  var prisma: PrismaClient | undefined;
  // eslint-disable-next-line no-var, vars-on-top
  var pool: Pool | undefined;
}
// Connection pool for PostgreSQL
const pool = global.pool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
})

// Prisma adapter for pg
const adapter = new PrismaPg(pool)

export const prisma = global.prisma ?? new PrismaClient({
  adapter,
  log: ['error', 'warn'],
})

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma
  global.pool = pool
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required.");
}
