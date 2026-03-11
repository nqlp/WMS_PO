import { PrismaClient } from "@prisma/ezoko-client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrismaEzoko = globalThis as unknown as {
    prismaEzoko: PrismaClient;
    poolEzoko: Pool;
};

const pool = globalForPrismaEzoko.poolEzoko ?? new Pool({
    connectionString: process.env.EZOKO_DATABASE_URL,
});

const adapter = new PrismaPg(pool);

export const prismaEzoko = globalForPrismaEzoko.prismaEzoko || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
    globalForPrismaEzoko.prismaEzoko = prismaEzoko;
    globalForPrismaEzoko.poolEzoko = pool;
}

if (!process.env.EZOKO_DATABASE_URL) {
    throw new Error("EZOKO_DATABASE_URL is required.");
}
