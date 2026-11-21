import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import Database from "better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";
import { seedDatabase } from "../../prisma/seed";

const MARKER = ".initialized";

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
  return path.join(path.dirname(path.resolve(file)), MARKER);
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
 * First production boot (`INIT_DB=1`, no marker next to the database file):
 * apply migrations and seed. Later boots, including redeploys of the same volume, return immediately.
 */
export async function ensureDatabase(databaseUrl?: string): Promise<void> {
  if (process.env.INIT_DB !== "1") return;

  const url = databaseUrl ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const file = databaseFile(url);
  const marker = markerPath(file);
  if (existsSync(marker)) return;

  applyMigrations(file);

  const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });
  try {
    await seedDatabase(prisma);
  } finally {
    await prisma.$disconnect();
  }

  writeFileSync(marker, `${new Date().toISOString()}\n`);
}
