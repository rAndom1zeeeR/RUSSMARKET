import type { ShiftTemplateDTO } from "@/entities/shift-template/model/types";
import { describe, expect, it } from "vitest";
import { customValue, templateValue, validateCustomTime } from "./value";

const TEMPLATE: ShiftTemplateDTO = { id: "tpl-day", name: "День", start: "10:00", end: "18:00", color: "violet" };

describe("templateValue", () => {
  it("переносит время и id шаблона", () => {
    expect(templateValue(TEMPLATE)).toEqual({ start: "10:00", end: "18:00", templateId: "tpl-day" });
  });
});

describe("customValue", () => {
  it("своя смена не привязана к шаблону", () => {
    expect(customValue("09:00", "17:30")).toEqual({ start: "09:00", end: "17:30", templateId: null });
  });
});

describe("validateCustomTime", () => {
  it("принимает корректный интервал", () => {
    expect(validateCustomTime("09:00", "17:00")).toBeNull();
  });

  it("принимает смену через полночь", () => {
    expect(validateCustomTime("22:00", "06:00")).toBeNull();
  });

  it("требует заполненное время", () => {
    expect(validateCustomTime("", "17:00")).toBe("Укажите время начала и конца");
    expect(validateCustomTime("09:00", "")).toBe("Укажите время начала и конца");
    expect(validateCustomTime("25:00", "17:00")).toBe("Укажите время начала и конца");
  });

  it("не принимает одинаковые начало и конец", () => {
    expect(validateCustomTime("09:00", "09:00")).toBe("Начало и конец не должны совпадать");
  });
});
