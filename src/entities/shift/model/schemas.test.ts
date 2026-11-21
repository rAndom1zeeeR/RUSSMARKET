import { describe, expect, it } from "vitest";
import { saveShiftsSchema, shiftsQuerySchema } from "./schemas";

const SHIFT = { employeeId: "emp-1", date: "2026-11-21", start: "09:00", end: "17:00", templateId: "tpl-day" };

describe("saveShiftsSchema", () => {
  it("принимает корректный diff", () => {
    const result = saveShiftsSchema.safeParse({
      upserts: [SHIFT, { ...SHIFT, date: "2026-11-22", templateId: null }],
      deletes: [{ employeeId: "emp-2", date: "2026-11-21" }],
    });
    expect(result.success).toBe(true);
  });

  it("принимает пустые списки", () => {
    expect(saveShiftsSchema.safeParse({ upserts: [], deletes: [] }).success).toBe(true);
  });

  it.each([
    ["время 25:00", { ...SHIFT, start: "25:00" }],
    ["время без нуля", { ...SHIFT, end: "7:00" }],
    ["минуты 60", { ...SHIFT, end: "12:60" }],
    ["дата в другом формате", { ...SHIFT, date: "21.11.2026" }],
    ["пустой сотрудник", { ...SHIFT, employeeId: "" }],
    ["пустой шаблон", { ...SHIFT, templateId: "" }],
    ["шаблон не задан", { employeeId: "emp-1", date: "2026-11-21", start: "09:00", end: "17:00" }],
  ])("отклоняет: %s", (_name, upsert) => {
    expect(saveShiftsSchema.safeParse({ upserts: [upsert], deletes: [] }).success).toBe(false);
  });

  it("отклоняет некорректное удаление", () => {
    expect(saveShiftsSchema.safeParse({ upserts: [], deletes: [{ employeeId: "emp-1" }] }).success).toBe(false);
  });

  it("ограничивает размер списков 5000 записей", () => {
    const many = (count: number) => Array.from({ length: count }, () => SHIFT);
    expect(saveShiftsSchema.safeParse({ upserts: many(5000), deletes: [] }).success).toBe(true);
    expect(saveShiftsSchema.safeParse({ upserts: many(5001), deletes: [] }).success).toBe(false);
  });

  it("требует оба списка", () => {
    expect(saveShiftsSchema.safeParse({ upserts: [] }).success).toBe(false);
  });
});

describe("shiftsQuerySchema", () => {
  it("принимает период", () => {
    expect(shiftsQuerySchema.parse({ from: "2026-11-16", to: "2026-11-22" })).toEqual({
      from: "2026-11-16",
      to: "2026-11-22",
    });
  });

  it("отклоняет отсутствующие и кривые даты", () => {
    expect(shiftsQuerySchema.safeParse({ from: null, to: null }).success).toBe(false);
    expect(shiftsQuerySchema.safeParse({ from: "2026-11-16", to: "завтра" }).success).toBe(false);
  });
});
