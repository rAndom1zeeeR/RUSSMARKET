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

function setNodeEnv(value: string | undefined): void {
  if (value === undefined) {
    Reflect.deleteProperty(process.env, "NODE_ENV");
    return;
  }
  Reflect.set(process.env, "NODE_ENV", value);
}

describe("ensureDatabase", () => {
  const previousNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    setNodeEnv(previousNodeEnv);
    for (const directory of directories.splice(0)) {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("вне production ничего не создаёт", async () => {
    setNodeEnv("development");
    const url = tempUrl();
    await ensureDatabase(url);
    expect(existsSync(url.slice("file:".length))).toBe(false);
  });

  it("отклоняет не-sqlite URL", async () => {
    setNodeEnv("production");
    await expect(ensureDatabase("postgres://localhost/app")).rejects.toThrow("sqlite file URL");
  });

  it("первый запуск накатывает миграции и сидер, повторный данные не трогает", async () => {
    setNodeEnv("production");
    const url = tempUrl();
    const file = url.slice("file:".length);

    await ensureDatabase(url);
    expect(await scheduleCount(url)).toBe(1);

    await ensureDatabase(url);
    expect(await scheduleCount(url)).toBe(1);

    const sqlite = new Database(file);
    sqlite.prepare('DELETE FROM "Schedule"').run();
    sqlite.close();

    await ensureDatabase(url);
    expect(await scheduleCount(url)).toBe(0);

    unlinkSync(`${path.resolve(file)}.initialized`);
    await ensureDatabase(url);
    expect(await scheduleCount(url)).toBe(1);
  });
});
