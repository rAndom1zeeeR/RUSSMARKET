import "server-only";
import type { PrismaClient } from "../generated/prisma/client";
import { DEFAULT_DATABASE_URL } from "../../prisma/database-url";
import { createPrismaClient } from "./create-client";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

/** База выбирается по `DATABASE_URL`: `file:` — SQLite (разработка), `postgresql://` — Postgres (прод). */
export const prisma =
  globalThis.__prisma ?? (await createPrismaClient(process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL));

if (process.env.NODE_ENV !== "production") globalThis.__prisma = prisma;
