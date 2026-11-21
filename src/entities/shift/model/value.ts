import type { ShiftValue } from "./types";
import type { ShiftTemplateDTO } from "@/entities/shift-template/model/types";
import { isValidTime } from "@/shared/lib/time";

export function templateValue(template: ShiftTemplateDTO): ShiftValue {
  return { start: template.start, end: template.end, templateId: template.id };
}

export function customValue(start: string, end: string): ShiftValue {
  return { start, end, templateId: null };
}

/** Проверка времени собственной смены. Возвращает текст ошибки или null. */
export function validateCustomTime(start: string, end: string): string | null {
  if (!isValidTime(start) || !isValidTime(end)) return "Укажите время начала и конца";
  if (start === end) return "Начало и конец не должны совпадать";
  return null;
}
