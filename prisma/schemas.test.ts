import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PROVIDER_PATHS } from "./database-url";

const read = (file: string) => readFileSync(path.join(process.cwd(), file), "utf8").replaceAll("\r\n", "\n");

/** Всё, что идёт после блока datasource: сами модели. */
const modelsOf = (schema: string) => schema.slice(schema.indexOf("model "));

const sqliteSchema = read(PROVIDER_PATHS.sqlite.schema);
const postgresSchema = read(PROVIDER_PATHS.postgres.schema);
const modelNames = [...sqliteSchema.matchAll(/^model (\w+) \{/gm)].map(match => match[1]);

describe("схемы Prisma для SQLite и Postgres", () => {
  it("модели в обеих схемах идентичны: правки нужно вносить в обе", () => {
    expect(modelsOf(postgresSchema)).toBe(modelsOf(sqliteSchema));
  });

  it("провайдеры — sqlite и postgresql", () => {
    expect(sqliteSchema).toMatch(/provider\s*=\s*"sqlite"/);
    expect(postgresSchema).toMatch(/provider\s*=\s*"postgresql"/);
  });

  it("клиенты генерируются в разные каталоги и не затирают друг друга", () => {
    const outputOf = (schema: string) => /output\s*=\s*"([^"]+)"/.exec(schema)?.[1];
    expect(outputOf(sqliteSchema)).toBe("../src/generated/prisma");
    expect(outputOf(postgresSchema)).toBe("../../src/generated/prisma-postgres");
  });

  it("в схеме все четыре модели", () => {
    expect(modelNames).toEqual(["Employee", "ShiftTemplate", "Schedule", "Shift"]);
  });
});

describe("миграции", () => {
  const migrationsDir = (provider: keyof typeof PROVIDER_PATHS) => PROVIDER_PATHS[provider].migrations;
  const migrationSql = (provider: keyof typeof PROVIDER_PATHS) =>
    readdirSync(path.join(process.cwd(), migrationsDir(provider)), { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => read(path.join(migrationsDir(provider), entry.name, "migration.sql")))
      .join("\n");

  it("lock-файлы указывают свой провайдер", () => {
    expect(read(path.join(migrationsDir("sqlite"), "migration_lock.toml"))).toContain('provider = "sqlite"');
    expect(read(path.join(migrationsDir("postgres"), "migration_lock.toml"))).toContain('provider = "postgresql"');
  });

  it.each(["sqlite", "postgres"] as const)("%s: миграции создают таблицу каждой модели", provider => {
    const sql = migrationSql(provider);
    for (const name of modelNames) expect(sql).toContain(`CREATE TABLE "${name}"`);
  });

  it("Postgres: уникальный ключ смены, индекс и каскады на месте", () => {
    const sql = migrationSql("postgres");
    expect(sql).toContain('CREATE UNIQUE INDEX "Shift_scheduleId_employeeId_date_key"');
    expect(sql).toContain('CREATE INDEX "Shift_scheduleId_date_idx"');
    expect(sql).toContain("ON DELETE CASCADE");
    expect(sql).toContain("ON DELETE SET NULL");
  });

  it("Postgres: роль сотрудника по умолчанию — «агент», как в SQLite", () => {
    expect(migrationSql("postgres")).toContain(`"role" TEXT NOT NULL DEFAULT 'агент'`);
    expect(sqliteSchema).toContain('@default("агент")');
  });

  it("в Postgres-миграциях нет диалекта SQLite", () => {
    const sql = migrationSql("postgres");
    expect(sql).not.toContain("PRAGMA");
    expect(sql).not.toContain("RedefineTables");
  });
});
