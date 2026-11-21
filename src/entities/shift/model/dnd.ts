import type { ShiftValue } from "./types";
import type { ShiftTemplateDTO } from "@/entities/shift-template/model/types";
import { templateValue } from "./value";

/** Контракт данных drag-and-drop между панелью шаблонов, ячейками и провайдером. */
export type DragData =
  | { kind: "template"; template: ShiftTemplateDTO }
  | { kind: "shift"; key: string; value: ShiftValue };

export function isDragData(value: unknown): value is DragData {
  if (typeof value !== "object" || value === null || !("kind" in value)) return false;
  return value.kind === "template" || value.kind === "shift";
}

interface DropAssignment {
  keys: string[];
  /** null — смена в этих ячейках удаляется. */
  value: ShiftValue | null;
}

export interface DropResult {
  assignments: DropAssignment[];
  /** Ячейки, которые нужно выделить после сброса (если не null). */
  select: string[] | null;
}

/**
 * Что делать при сбросе: шаблон → ячейка (или все выделенные, если цель в выделении),
 * смена → другая ячейка (перенос; `copy` — копирование без очистки источника).
 * Возвращает null, если сброс ничего не меняет.
 */
export function resolveDrop(
  data: DragData,
  targetKey: string,
  selection: ReadonlySet<string>,
  copy: boolean
): DropResult | null {
  if (data.kind === "template") {
    const keys = selection.has(targetKey) ? [...selection] : [targetKey];
    return { assignments: [{ keys, value: templateValue(data.template) }], select: null };
  }
  if (data.key === targetKey) return null;
  const assignments: DropAssignment[] = [{ keys: [targetKey], value: data.value }];
  if (!copy) assignments.push({ keys: [data.key], value: null });
  return { assignments, select: [targetKey] };
}
