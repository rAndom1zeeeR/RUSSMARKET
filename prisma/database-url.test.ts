import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_DATABASE_URL, PROVIDER_PATHS, databaseProvider } from "./database-url";

describe("databaseProvider", () => {
  it.each([
    ["file:./prisma/data/dev.db", "sqlite"],
    ["file:/data/app.db", "sqlite"],
    ["file:C:/Users/me/app.db", "sqlite"],
    ["postgresql://user:pass@localhost:5432/app", "postgres"],
    ["postgres://user:pass@db.example.com/app?sslmode=require", "postgres"],
  ])("%s → %s", (url, expected) => {
    expect(databaseProvider(url)).toBe(expected);
  });

  it.each(["", "mysql://localhost/app", "http://localhost", "./dev.db", "postgresql:/missing-slash"])(
    "отклоняет «%s»",
    url => {
      expect(() => databaseProvider(url)).toThrow("Неподдерживаемый DATABASE_URL");
    }
  );

  it("не выдаёт пароль из URL в тексте ошибки", () => {
    expect(() => databaseProvider("mysql://admin:superSecret@host/db")).not.toThrow(/superSecret|admin/);
  });

  it("URL по умолчанию — локальная SQLite", () => {
    expect(databaseProvider(DEFAULT_DATABASE_URL)).toBe("sqlite");
  });
});

describe("PROVIDER_PATHS", () => {
  it.each(["sqlite", "postgres"] as const)("для %s схема и каталог миграций существуют", provider => {
    const { schema, migrations } = PROVIDER_PATHS[provider];
    expect(existsSync(path.join(process.cwd(), schema))).toBe(true);
    expect(existsSync(path.join(process.cwd(), migrations))).toBe(true);
  });

  it("у провайдеров разные схемы и миграции", () => {
    expect(PROVIDER_PATHS.sqlite.schema).not.toBe(PROVIDER_PATHS.postgres.schema);
    expect(PROVIDER_PATHS.sqlite.migrations).not.toBe(PROVIDER_PATHS.postgres.migrations);
  });
});
