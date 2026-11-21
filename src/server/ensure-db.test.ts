import { existsSync, mkdtempSync, rmSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { ensureDatabase } from "./ensure-db";

const directories: string[] = [];

function tempUrl(): string {
  const directory = mkdtempSync(path.join(tmpdir(), "ensure-db-"));
  directories.push(directory);
  const file = path.join(directory, "app.db").replaceAll("\\", "/");
  return `file:${file}`;
}

async function scheduleCount(url: string): Promise<number> {
  const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });
  try {
    return await prisma.schedule.count();
  } finally {
    await prisma.$disconnect();
  }
}

describe("ensureDatabase", () => {
  const previous = process.env.INIT_DB;

  afterEach(() => {
    if (previous === undefined) delete process.env.INIT_DB;
    else process.env.INIT_DB = previous;
    for (const directory of directories.splice(0)) {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("без INIT_DB ничего не создаёт", async () => {
    delete process.env.INIT_DB;
    const url = tempUrl();
    await ensureDatabase(url);
    expect(existsSync(url.slice("file:".length))).toBe(false);
  });

  it("без DATABASE_URL падает", async () => {
    process.env.INIT_DB = "1";
    const saved = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    try {
      await expect(ensureDatabase()).rejects.toThrow("DATABASE_URL is not set");
    } finally {
      if (saved === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = saved;
    }
  });

  it("отклоняет не-sqlite URL", async () => {
    process.env.INIT_DB = "1";
    await expect(ensureDatabase("postgres://localhost/app")).rejects.toThrow("sqlite file URL");
  });

  it("первый запуск накатывает миграции и сидер, повторный данные не трогает", async () => {
    process.env.INIT_DB = "1";
    const url = tempUrl();
    const file = url.slice("file:".length);

    await ensureDatabase(url);
    expect(await scheduleCount(url)).toBe(1);

    const sqlite = new Database(file);
    sqlite.prepare('DELETE FROM "Schedule"').run();
    sqlite.close();
    expect(await scheduleCount(url)).toBe(0);

    await ensureDatabase(url);
    expect(await scheduleCount(url)).toBe(0);

    unlinkSync(path.join(path.dirname(path.resolve(file)), ".initialized"));
    await ensureDatabase(url);
    expect(await scheduleCount(url)).toBe(1);
  });
});
