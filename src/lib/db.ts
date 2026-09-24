import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma 8 + driver adapters: Prisma Client talks to Postgres straight
// through `pg` (no bundled Rust query-engine binary to download/ship).
// The dev-mode singleton avoids exhausting connections on hot-reload.
// https://www.prisma.io/docs/orm/overview/databases/postgresql#using-the-node-postgres-driver-adapter
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const db = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
