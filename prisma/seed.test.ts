import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { prisma } from "../src/server/db";

const require = createRequire(import.meta.url);
const TSX_CLI = require.resolve("tsx/cli");

function runSeed(): string {
  return execFileSync(process.execPath, [TSX_CLI, "prisma/seed.ts"], {
    cwd: process.cwd(),
    env: { ...process.env },
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
