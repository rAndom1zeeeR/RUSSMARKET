import type { ShiftTemplateDTO } from "@/entities/shift-template/model/types";
import { describe, expect, it } from "vitest";
import { isDragData, resolveDrop, type DragData } from "./dnd";

const TEMPLATE: ShiftTemplateDTO = { id: "tpl-morning", name: "Утро", start: "07:00", end: "15:00", color: "indigo" };
const SHIFT_VALUE = { start: "10:00", end: "18:00", templateId: "tpl-day" };
const TEMPLATE_DATA: DragData = { kind: "template", template: TEMPLATE };
const SHIFT_DATA: DragData = { kind: "shift", key: "emp-1|2026-11-16", value: SHIFT_VALUE };

describe("isDragData", () => {
  it("узнаёт шаблон и смену", () => {
    expect(isDragData(TEMPLATE_DATA)).toBe(true);
    expect(isDragData(SHIFT_DATA)).toBe(true);
  });

  it.each([null, undefined, "template", 42, {}, { kind: "other" }])("отклоняет %j", value => {
    expect(isDragData(value)).toBe(false);
  });
});

describe("resolveDrop: шаблон", () => {
  it("назначает шаблон одной ячейке, если цель вне выделения", () => {
    const result = resolveDrop(TEMPLATE_DATA, "emp-2|2026-11-17", new Set(["emp-1|2026-11-16"]), false);
    expect(result).toEqual({
      assignments: [{ keys: ["emp-2|2026-11-17"], value: { start: "07:00", end: "15:00", templateId: "tpl-morning" } }],
      select: null,
    });
  });

  it("назначает шаблон всем выделенным, если цель в выделении", () => {
    const selection = new Set(["emp-1|2026-11-16", "emp-2|2026-11-17"]);
    const result = resolveDrop(TEMPLATE_DATA, "emp-2|2026-11-17", selection, false);
    expect(result?.assignments).toHaveLength(1);
    expect(result?.assignments[0]?.keys).toEqual(["emp-1|2026-11-16", "emp-2|2026-11-17"]);
  });

  it("не зависит от режима копирования", () => {
    const move = resolveDrop(TEMPLATE_DATA, "emp-2|2026-11-17", new Set(), false);
    const copy = resolveDrop(TEMPLATE_DATA, "emp-2|2026-11-17", new Set(), true);
    expect(copy).toEqual(move);
  });
});

describe("resolveDrop: смена", () => {
  it("переносит: ставит в цель и очищает источник", () => {
    const result = resolveDrop(SHIFT_DATA, "emp-2|2026-11-18", new Set(), false);
    expect(result).toEqual({
      assignments: [
        { keys: ["emp-2|2026-11-18"], value: SHIFT_VALUE },
        { keys: ["emp-1|2026-11-16"], value: null },
      ],
      select: ["emp-2|2026-11-18"],
    });
  });

  it("с Alt копирует: источник остаётся", () => {
    const result = resolveDrop(SHIFT_DATA, "emp-2|2026-11-18", new Set(), true);
    expect(result?.assignments).toEqual([{ keys: ["emp-2|2026-11-18"], value: SHIFT_VALUE }]);
  });

  it("сброс в ту же ячейку ничего не меняет", () => {
    expect(resolveDrop(SHIFT_DATA, "emp-1|2026-11-16", new Set(), false)).toBeNull();
  });
});
