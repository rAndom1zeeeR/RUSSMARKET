import { describe, expect, it } from "vitest";
import { MAX_PERIOD_DAYS, saveShiftsSchema, shiftsQuerySchema } from "./schemas";

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

describe("saveShiftsSchema: expectedUpdatedAt", () => {
  it("необязателен", () => {
    expect(saveShiftsSchema.safeParse({ upserts: [], deletes: [] }).success).toBe(true);
  });

  it("принимает ISO-время графика", () => {
    expect(
      saveShiftsSchema.safeParse({ upserts: [], deletes: [], expectedUpdatedAt: "2026-11-21T10:00:00.000Z" }).success
    ).toBe(true);
  });

  it.each(["вчера", "2026-11-21", "2026-11-21 10:00:00", 12345])("отклоняет %j", value => {
    expect(saveShiftsSchema.safeParse({ upserts: [], deletes: [], expectedUpdatedAt: value }).success).toBe(false);
  });
});

describe("shiftsQuerySchema: длина и порядок периода", () => {
  const parse = (from: string, to: string) => shiftsQuerySchema.safeParse({ from, to });

  it("принимает один день, неделю и месяц", () => {
    expect(parse("2026-11-21", "2026-11-21").success).toBe(true);
    expect(parse("2026-11-16", "2026-11-22").success).toBe(true);
    expect(parse("2026-12-01", "2026-12-31").success).toBe(true);
  });

  it(`принимает ровно ${MAX_PERIOD_DAYS} дней и отклоняет на день больше`, () => {
    expect(parse("2026-01-01", "2026-03-03").success).toBe(true); // 62 дня
    const tooLong = parse("2026-01-01", "2026-03-04"); // 63 дня
    expect(tooLong.success).toBe(false);
    expect(JSON.stringify(tooLong.error?.issues)).toContain("не может быть длиннее");
  });

  it("отклоняет период «задом наперёд»", () => {
    const result = parse("2026-11-22", "2026-11-16");
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain("позже конца");
  });

  it("отклоняет выгрузку «за всё время»", () => {
    expect(parse("1900-01-01", "2999-12-31").success).toBe(false);
  });

  it("отклоняет несуществующие даты правильного формата", () => {
    expect(parse("2026-13-45", "2026-13-46").success).toBe(false);
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
