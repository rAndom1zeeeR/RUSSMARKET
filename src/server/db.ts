import "server-only";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

const DEFAULT_URL = "file:./prisma/data/dev.db";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function createClient(): PrismaClient {
  const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? DEFAULT_URL });
  return new PrismaClient({ adapter });
}

export const prisma = globalThis.__prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalThis.__prisma = prisma;
