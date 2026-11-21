import { beforeEach, describe, expect, it } from "vitest";
import { EMPLOYEES, resetDb } from "../../../tests/helpers/db";
import { prisma } from "../db";
import { listEmployees, listTemplates } from "./reference";

beforeEach(resetDb);

describe("listEmployees", () => {
  it("возвращает сотрудников в порядке sort с полным DTO", async () => {
    const employees = await listEmployees();
    expect(employees.map(employee => employee.id)).toEqual(EMPLOYEES.map(employee => employee.id));
    expect(employees[0]).toEqual({
      id: "emp-1",
      fullName: "Кузнецова Алина",
      role: "агент",
      monthlyHours: 24,
      avatarUrl: null,
    });
  });

  it("уважает поле sort, а не порядок вставки", async () => {
    await prisma.employee.update({ where: { id: "emp-1" }, data: { sort: 99 } });
    const employees = await listEmployees();
    expect(employees.map(employee => employee.id)).toEqual(["emp-2", "emp-1"]);
  });

  it("отдаёт аватар, если он задан", async () => {
    await prisma.employee.update({ where: { id: "emp-1" }, data: { avatarUrl: "/users/user1.png" } });
    expect((await listEmployees())[0]?.avatarUrl).toBe("/users/user1.png");
  });

  it("возвращает пустой список, если сотрудников нет", async () => {
    await prisma.shift.deleteMany();
    await prisma.employee.deleteMany();
    expect(await listEmployees()).toEqual([]);
  });
});

describe("listTemplates", () => {
  it("возвращает шаблоны по порядку: Утро, День, Вечер", async () => {
    const templates = await listTemplates();
    expect(templates.map(template => template.name)).toEqual(["Утро", "День", "Вечер"]);
    expect(templates[0]).toEqual({ id: "tpl-morning", name: "Утро", start: "07:00", end: "15:00", color: "indigo" });
  });

  it("цвета шаблонов — из допустимого набора", async () => {
    const colors = (await listTemplates()).map(template => template.color);
    expect(colors).toEqual(["indigo", "violet", "teal"]);
  });

  it("неизвестный цвет в БД превращается в indigo", async () => {
    await prisma.shiftTemplate.create({
      data: { id: "tpl-odd", name: "Ночь", start: "23:00", end: "07:00", color: "magenta", sort: 4 },
    });
    const odd = (await listTemplates()).find(template => template.id === "tpl-odd");
    expect(odd?.color).toBe("indigo");
  });
});
