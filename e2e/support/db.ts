import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, unlinkSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import Database from "better-sqlite3";
import { DATABASE_URL, DB_FILE } from "./env";

const root = process.cwd();
const requireFromRoot = createRequire(path.join(root, "package.json"));

/**
 * Удаляет файл, если он есть. Именно unlinkSync: `rmSync(path, { force: true })` на Windows (Node 24)
 * в этой связке молча оставлял файл на месте, и следующая подготовка падала с «table already exists».
 */
function removeFile(file: string): void {
  try {
    unlinkSync(file);
  } catch (error) {
    if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") throw error;
  }
}

/** Создаёт пустую БД из реальных миграций Prisma (заменяет файл, если он остался с прошлого запуска). */
export function prepareDatabase(): void {
  const file = path.join(root, DB_FILE);
  mkdirSync(path.dirname(file), { recursive: true });
  for (const suffix of ["", "-journal", "-wal", "-shm"]) removeFile(`${file}${suffix}`);

  const sqlite = new Database(file);
  const migrations = path.join(root, "prisma", "migrations");
  // migration_lock.toml is a file. On Linux, open("…/migration_lock.toml/migration.sql") is ENOTDIR, not ENOENT.
  const names = readdirSync(migrations, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .toSorted();
  for (const name of names) {
    sqlite.exec(readFileSync(path.join(migrations, name, "migration.sql"), "utf8"));
  }
  sqlite.close();
}

/** Пересоздаёт данные сидером: каждый тест начинает с одинаковой базы. */
export function reseed(): void {
  execFileSync(process.execPath, [requireFromRoot.resolve("tsx/cli"), "prisma/seed.ts"], {
    cwd: root,
    env: { ...process.env, DATABASE_URL },
    stdio: "pipe",
  });
}
