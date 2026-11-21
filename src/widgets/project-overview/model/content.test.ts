import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ARCHITECTURE,
  DATABASE,
  EXTRAS,
  LAYERS_NOTE,
  LIMITATIONS,
  REQUIREMENT_GROUPS,
  TECH_GROUPS,
  TESTING,
} from "./content";

interface PackageJson {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

const pkg: PackageJson = JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
const installed = (name: string): string | undefined =>
  (pkg.dependencies[name] ?? pkg.devDependencies[name])?.replace(/^[\^~]/, "");

const allRequirements = REQUIREMENT_GROUPS.flatMap(group => group.items);

describe("требования ТЗ", () => {
  it("есть группы, и в каждой есть пункты", () => {
    expect(REQUIREMENT_GROUPS.length).toBeGreaterThan(0);
    for (const group of REQUIREMENT_GROUPS) {
      expect(group.title.trim()).not.toBe("");
      expect(group.items.length).toBeGreaterThan(0);
    }
  });

  it("статусы только done или partial, названия непустые и не повторяются", () => {
    const titles = allRequirements.map(item => item.title);
    expect(new Set(titles).size).toBe(titles.length);
    for (const item of allRequirements) {
      expect(item.title.trim()).not.toBe("");
      expect(["done", "partial"]).toContain(item.status);
    }
  });

  it("пункт с оговоркой всегда объясняет, в чём она", () => {
    for (const item of allRequirements.filter(requirement => requirement.status === "partial")) {
      expect(item.note?.trim().length ?? 0).toBeGreaterThan(10);
    }
  });

  it("покрывает все блоки ТЗ", () => {
    const text = [...REQUIREMENT_GROUPS.map(group => group.title), ...allRequirements.map(item => item.title)]
      .join(" | ")
      .toLowerCase();
    for (const keyword of [
      "поиск",
      "навигаци",
      "месяц",
      "быстрое назначение",
      "покрыти",
      "утро",
      "своя смена",
      "drag-and-drop",
      "сохранение",
      "frontend",
    ]) {
      expect(text).toContain(keyword);
    }
  });
});

describe("дополнения, архитектура, ограничения", () => {
  it("дополнения: уникальные названия и описания", () => {
    const titles = EXTRAS.map(extra => extra.title);
    expect(new Set(titles).size).toBe(titles.length);
    for (const extra of EXTRAS) expect(extra.text.trim().length).toBeGreaterThan(10);
  });

  it("архитектура — цепочка из пяти шагов от интерфейса до БД", () => {
    expect(ARCHITECTURE.map(step => step.title)).toEqual([
      "Интерфейс",
      "TanStack Query",
      "Route Handlers",
      "Prisma",
      "База",
    ]);
    expect(LAYERS_NOTE).toContain("shared");
  });

  it("ограничения перечислены и не пустые", () => {
    expect(LIMITATIONS.length).toBeGreaterThan(0);
    for (const item of LIMITATIONS) expect(item.trim()).not.toBe("");
  });
});

describe("раздел про базу данных", () => {
  it("объясняет роль SQLite, Postgres и шаги запуска на проде", () => {
    expect(DATABASE.reasons.length).toBeGreaterThanOrEqual(3);
    expect(DATABASE.readiness.length).toBeGreaterThanOrEqual(3);
    expect(DATABASE.steps).toHaveLength(4);
  });

  it("шаги запуска называют реальные команды и каталоги", () => {
    const steps = DATABASE.steps.join("\n");
    for (const mention of ["DATABASE_URL", "pnpm db:setup", "prisma/migrations", "prisma/postgres/migrations"]) {
      expect(steps).toContain(mention);
    }
  });

  it("говорит, что локально SQLite, Postgres проверяет CI, и предупреждает про сидер", () => {
    expect(DATABASE.caveat).toContain("SQLite");
    expect(DATABASE.caveat).toContain("postgres");
    expect(DATABASE.caveat).toContain("Сидер удаляет данные");
  });

  it("упомянутые каталоги и файлы существуют", () => {
    const files = [
      "prisma/schema.prisma",
      "prisma/postgres/schema.prisma",
      "prisma/migrations",
      "prisma/postgres/migrations",
      "src/server/create-client.ts",
    ];
    const missing = files.filter(file => !existsSync(path.join(process.cwd(), file)));
    expect(missing).toEqual([]);
  });
});

describe("раздел про тесты", () => {
  const vitestConfig = () => readFileSync(path.join(process.cwd(), "vitest.config.mts"), "utf8");

  it("описывает три проекта Vitest, как в конфиге", () => {
    expect(TESTING.projects.map(project => project.name)).toEqual(["unit", "server", "dom"]);
    for (const project of TESTING.projects) expect(vitestConfig()).toContain(`name: "${project.name}"`);
  });

  it("пороги покрытия совпадают с vitest.config.mts", () => {
    for (const [metric, value] of Object.entries(TESTING.thresholds)) {
      expect(vitestConfig(), `порог ${metric}`).toContain(`${metric}: ${value}`);
    }
  });

  it("E2E описан так же, как настроен: проект, порт, отдельная БД, команда", () => {
    const config = readFileSync(path.join(process.cwd(), "playwright.config.ts"), "utf8");
    const env = readFileSync(path.join(process.cwd(), "e2e", "support", "env.ts"), "utf8");
    expect(config).toContain('name: "desktop"');
    expect(config).toContain('name: "mobile"');
    expect(env).toContain("e2e.db");
    expect(env).toContain("3100");
    expect(TESTING.highlights.join(" ")).toContain("e2e.db");
    expect(TESTING.highlights.join(" ")).toContain("3100");
    expect(TESTING.commands.map(item => item.command)).toContain("pnpm e2e");
    expect(TESTING.e2e.scope).toContain("320");
  });

  it("команды существуют в package.json", () => {
    const { scripts } = JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
    const missing = TESTING.commands
      .map(({ command }) => command)
      .filter(command => !(command.replace("pnpm ", "") in scripts));
    expect(missing).toEqual([]);
  });

  it("описания непустые", () => {
    for (const project of TESTING.projects) expect(project.scope.length).toBeGreaterThan(20);
    expect(TESTING.highlights.length).toBeGreaterThanOrEqual(3);
  });
});

describe("технологии: версии совпадают с package.json", () => {
  const PACKAGE_BY_NAME: Record<string, string> = {
    "Next.js": "next",
    React: "react",
    TypeScript: "typescript",
    Prisma: "prisma",
    SQLite: "better-sqlite3",
    PostgreSQL: "@prisma/adapter-pg",
    zod: "zod",
    "TanStack Query": "@tanstack/react-query",
    Zustand: "zustand",
    "TanStack Virtual": "@tanstack/react-virtual",
    "dnd-kit": "@dnd-kit/core",
    "Tailwind CSS": "tailwindcss",
    "Radix UI": "radix-ui",
    "date-fns": "date-fns",
    oxlint: "oxlint",
    oxfmt: "oxfmt",
    Vitest: "vitest",
    Playwright: "@playwright/test",
  };

  const items = TECH_GROUPS.flatMap(group => group.items);

  it.each(Object.entries(PACKAGE_BY_NAME))("%s → %s", (name, dependency) => {
    const item = items.find(tech => tech.name === name);
    expect(item, `в content.ts нет «${name}»`).toBeDefined();
    const label = item?.version.split(" ").at(-1);
    expect(label, `у «${name}» не указана версия`).toBeDefined();
    expect(installed(dependency)?.startsWith(label ?? "?"), `«${name}»: ${label} ≠ ${installed(dependency)}`).toBe(
      true
    );
  });

  it("у каждой технологии есть назначение", () => {
    for (const item of items) expect(item.purpose.trim()).not.toBe("");
  });
});
