import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ARCHITECTURE, DATABASE, EXTRAS, LAYERS_NOTE, LIMITATIONS, REQUIREMENT_GROUPS, TECH_GROUPS } from "./content";

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
      "SQLite",
    ]);
    expect(LAYERS_NOTE).toContain("shared");
  });

  it("ограничения перечислены и не пустые", () => {
    expect(LIMITATIONS.length).toBeGreaterThan(0);
    for (const item of LIMITATIONS) expect(item.trim()).not.toBe("");
  });
});

describe("раздел про базу данных", () => {
  it("объясняет выбор SQLite, готовность и шаги миграции", () => {
    expect(DATABASE.reasons.length).toBeGreaterThanOrEqual(3);
    expect(DATABASE.readiness.length).toBeGreaterThanOrEqual(3);
    expect(DATABASE.steps).toHaveLength(4);
  });

  it("шаги миграции называют реальные места правок", () => {
    const steps = DATABASE.steps.join("\n");
    for (const mention of [
      "schema.prisma",
      "src/server/db.ts",
      "prisma/seed.ts",
      "DATABASE_URL",
      "prisma/migrations",
    ]) {
      expect(steps).toContain(mention);
    }
  });

  it("честно оговаривает, что миграция не проверялась на Postgres", () => {
    expect(DATABASE.caveat).toContain("не запускалась");
  });

  it("файлы из шагов миграции существуют", () => {
    for (const file of ["prisma/schema.prisma", "src/server/db.ts", "prisma/seed.ts"]) {
      expect(() => readFileSync(path.join(process.cwd(), file), "utf8")).not.toThrow();
    }
  });
});

describe("технологии: версии совпадают с package.json", () => {
  const PACKAGE_BY_NAME: Record<string, string> = {
    "Next.js": "next",
    React: "react",
    TypeScript: "typescript",
    Prisma: "prisma",
    SQLite: "better-sqlite3",
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
