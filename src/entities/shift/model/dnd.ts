import type { ShiftValue } from "./types";
import type { ShiftTemplateDTO } from "@/entities/shift-template/model/types";

/** Контракт данных drag-and-drop между панелью шаблонов, ячейками и провайдером. */
export type DragData =
  | { kind: "template"; template: ShiftTemplateDTO }
  | { kind: "shift"; key: string; value: ShiftValue };

export function isDragData(value: unknown): value is DragData {
  if (typeof value !== "object" || value === null || !("kind" in value)) return false;
  return value.kind === "template" || value.kind === "shift";
}
