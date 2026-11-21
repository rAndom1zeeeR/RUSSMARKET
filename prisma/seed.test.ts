import { execFileSync, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { prisma } from "../src/server/db";

const require = createRequire(import.meta.url);
const TSX_CLI = require.resolve("tsx/cli");

function runSeed(): string {
  return execFileSync(process.execPath, [TSX_CLI, "prisma/seed.ts", "--force"], {
    cwd: process.cwd(),
    env: { ...process.env },
    encoding: "utf8",
  });
}

/** Запуск без `--force`: код выхода и вывод нужны, чтобы проверить отказ. */
function runSeedGuarded(env: Record<string, string> = {}) {
  return spawnSync(process.execPath, [TSX_CLI, "prisma/seed.ts"], {
    cwd: process.cwd(),
    env: { ...process.env, ...env },
    encoding: "utf8",
  });
}

async function counts() {
  const [employees, templates, schedules, shifts] = await Promise.all([
    prisma.employee.count(),
    prisma.shiftTemplate.count(),
    prisma.schedule.count(),
    prisma.shift.count(),
  ]);
  return { employees, templates, schedules, shifts };
}

describe("сидер: предохранитель от затирания данных", () => {
  it("на пустой базе работает и без --force", async () => {
    await prisma.shift.deleteMany();
    await prisma.schedule.deleteMany();
    const result = runSeedGuarded();
    expect(result.status).toBe(0);
    expect((await counts()).schedules).toBe(1);
  });

  it("на непустой базе отказывается, ничего не меняет и объясняет, как пересоздать", async () => {
    runSeed();
    await prisma.employee.update({ where: { id: "emp-1" }, data: { fullName: "Правка пользователя" } });
    const before = await counts();

    const result = runSeedGuarded();

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("в базе уже есть графики");
    expect(result.stderr).toContain("pnpm db:reseed");
    expect(await counts()).toEqual(before);
    expect((await prisma.employee.findUnique({ where: { id: "emp-1" } }))?.fullName).toBe("Правка пользователя");
  });

  it("SEED_FORCE=1 разрешает пересоздание", async () => {
    runSeed();
    await prisma.employee.update({ where: { id: "emp-1" }, data: { fullName: "Правка пользователя" } });

    const result = runSeedGuarded({ SEED_FORCE: "1" });

    expect(result.status).toBe(0);
    expect((await prisma.employee.findUnique({ where: { id: "emp-1" } }))?.fullName).toBe("Кузнецова Алина");
  });

  it("--force разрешает пересоздание", async () => {
    runSeed();
    await prisma.shift.deleteMany();
    runSeed();
    expect((await counts()).shifts).toBeGreaterThan(0);
  });
});

describe("сидер", () => {
  it("создаёт 8 сотрудников, 3 шаблона, график и смены текущей недели", async () => {
    const output = runSeed();
    expect(output).toContain("8 сотрудников");

    const result = await counts();
    expect(result).toMatchObject({ employees: 8, templates: 3, schedules: 1 });
    expect(result.shifts).toBeGreaterThan(0);
  });

  it("идемпотентен: повторный запуск даёт те же данные, без дублей", async () => {
    runSeed();
    const first = await counts();
    runSeed();
    expect(await counts()).toEqual(first);
  });

  it("у каждого сотрудника есть фото", async () => {
    runSeed();
    const employees = await prisma.employee.findMany();
    expect(employees.every(employee => employee.avatarUrl?.startsWith("/users/user"))).toBe(true);
  });

  it("все смены ссылаются на существующие шаблоны и сотрудников, время в формате HH:mm", async () => {
    runSeed();
    const shifts = await prisma.shift.findMany();
    const templateIds = new Set((await prisma.shiftTemplate.findMany()).map(template => template.id));
    const timeFormat = /^\d\d:\d\d$/;
    expect(shifts.every(shift => timeFormat.test(shift.start) && timeFormat.test(shift.end))).toBe(true);
    expect(shifts.filter(shift => shift.templateId).every(shift => templateIds.has(shift.templateId ?? ""))).toBe(true);
  });
});
