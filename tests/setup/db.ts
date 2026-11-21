import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { afterAll } from "vitest";

/**
 * Каждый тестовый файл получает свою пустую SQLite-базу, схема — из реальных миграций Prisma.
 * DATABASE_URL выставляется до импорта `@/server/db`, который читает его при загрузке.
 */
const directory = mkdtempSync(path.join(tmpdir(), "shifts-test-"));
const file = path.join(directory, "test.db").replaceAll("\\", "/");

const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
const sqlite = new Database(file);
// migration_lock.toml is a file. On Linux, open("…/migration_lock.toml/migration.sql") is ENOTDIR, not ENOENT.
const names = readdirSync(migrationsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .toSorted();
for (const name of names) {
  sqlite.exec(readFileSync(path.join(migrationsDir, name, "migration.sql"), "utf8"));
}
sqlite.close();

process.env.DATABASE_URL = `file:${file}`;

afterAll(async () => {
  const { prisma } = await import("@/server/db");
  await prisma.$disconnect();
  try {
    rmSync(directory, { recursive: true, force: true });
  } catch {
    // Windows может держать файл ещё мгновение — временный каталог всё равно в tmpdir.
  }
});
