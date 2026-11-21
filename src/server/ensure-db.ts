import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import Database from "better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";
import { seedDatabase } from "../../prisma/seed";

const DEFAULT_URL = "file:./prisma/data/dev.db";

// ponytail: standalone image has no Prisma CLI, so the first boot applies prisma/migrations
// with better-sqlite3 and then seeds. Ceiling: sqlite `file:` URLs and one replica.
// Postgres upgrade path: `prisma migrate deploy` in the runner instead of this applier.
const MIGRATIONS_TABLE = `
CREATE TABLE IF NOT EXISTS "_app_migrations" (
  "name" TEXT PRIMARY KEY NOT NULL
)`;

function databaseFile(databaseUrl: string): string {
  const prefix = "file:";
  if (!databaseUrl.startsWith(prefix)) {
    throw new Error(`DATABASE_URL must be a sqlite file URL, got ${databaseUrl}`);
  }
  return databaseUrl.slice(prefix.length);
}

function markerPath(file: string): string {
  return `${path.resolve(file)}.initialized`;
}

function countOf(row: unknown): number {
  if (typeof row !== "object" || row === null || !("n" in row)) return 0;
  if (typeof row.n === "number") return row.n;
  if (typeof row.n === "bigint") return Number(row.n);
  return 0;
}

function scheduleState(file: string): { table: boolean; count: number } {
  if (!existsSync(file)) return { table: false, count: 0 };
  const sqlite = new Database(file, { readonly: true, fileMustExist: true });
  try {
    const table = sqlite.prepare("SELECT 1 AS ok FROM sqlite_master WHERE type = 'table' AND name = 'Schedule'").get();
    if (!table) return { table: false, count: 0 };
    const row = sqlite.prepare("SELECT COUNT(*) AS n FROM Schedule").get();
    return { table: true, count: countOf(row) };
  } finally {
    sqlite.close();
  }
}

function migrationNames(row: unknown): string | null {
  if (typeof row !== "object" || row === null || !("name" in row)) return null;
  return typeof row.name === "string" ? row.name : null;
}

function applyMigrations(file: string): void {
  mkdirSync(path.dirname(file), { recursive: true });
  const sqlite = new Database(file);
  try {
    sqlite.pragma("foreign_keys = ON");
    sqlite.exec(MIGRATIONS_TABLE);
    const applied = new Set(
      sqlite
        .prepare("SELECT name FROM _app_migrations")
        .all()
        .map(migrationNames)
        .filter((name): name is string => name !== null)
    );
    const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
    const names = readdirSync(migrationsDir, { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name)
      .toSorted();
    const insert = sqlite.prepare('INSERT INTO "_app_migrations" (name) VALUES (?)');
    for (const name of names) {
      if (applied.has(name)) continue;
      sqlite.exec(readFileSync(path.join(migrationsDir, name, "migration.sql"), "utf8"));
      insert.run(name);
    }
  } finally {
    sqlite.close();
  }
}

/**
 * Production boot. Seeds only when this database file has no schedules yet and no marker.
 * A marker with an existing Schedule table means "already initialized" — deleting every
 * schedule in the UI must not bring the seed back on the next deploy.
 */
export async function ensureDatabase(databaseUrl?: string): Promise<void> {
  if (process.env.NODE_ENV !== "production") return;

  const url = databaseUrl ?? process.env.DATABASE_URL ?? DEFAULT_URL;
  const file = databaseFile(url);
  const marker = markerPath(file);
  const state = scheduleState(file);

  if (state.count > 0) {
    if (!existsSync(marker)) writeFileSync(marker, `${new Date().toISOString()}\n`);
    console.log(`[db] ${url} already has ${state.count} schedules`);
    return;
  }
  if (state.table && existsSync(marker)) {
    console.log(`[db] ${url} initialized earlier, skip seed`);
    return;
  }

  console.log(`[db] migrating and seeding ${url}`);
  applyMigrations(file);

  const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });
  try {
    await seedDatabase(prisma);
  } finally {
    await prisma.$disconnect();
  }

  writeFileSync(marker, `${new Date().toISOString()}\n`);
  console.log(`[db] seeded ${url}`);
}
