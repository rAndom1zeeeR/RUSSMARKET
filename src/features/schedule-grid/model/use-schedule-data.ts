import type { ShiftValue } from "@/entities/shift/model/types";
import { useQuery } from "@tanstack/react-query";
import { useDeferredValue } from "react";
import { employeesQuery } from "@/entities/employee/api/queries";
import { useScheduleStore } from "@/entities/schedule/model/store";
import { templatesQuery } from "@/entities/shift-template/api/queries";
import { shiftsQuery } from "@/entities/shift/api/queries";
import { cellKey, parseCellKey } from "@/entities/shift/model/cell";
import { getRange } from "@/shared/lib/date";

/**
 * Единый источник данных календаря: серверные смены из TanStack Query
 * плюс наложенный черновик правок из Zustand.
 * Покрытие и счётчики шаблонов — производные, поэтому обновляются при любой правке.
 */
export function useScheduleData(scheduleId: string) {
  const view = useScheduleStore(state => state.view);
  const anchor = useScheduleStore(state => state.anchor);
  const search = useScheduleStore(state => state.search);
  const draft = useScheduleStore(state => state.draft);

  const range = getRange(view, anchor);

  const employeesResult = useQuery(employeesQuery);
  const templatesResult = useQuery(templatesQuery);
  const shiftsResult = useQuery(shiftsQuery(scheduleId, range.from, range.to));

  const deferredSearch = useDeferredValue(search).trim().toLowerCase();
  const allEmployees = employeesResult.data ?? [];
  const employees = deferredSearch
    ? allEmployees.filter(employee => employee.fullName.toLowerCase().includes(deferredSearch))
    : allEmployees;

  const templates = templatesResult.data ?? [];

  const shifts = new Map<string, ShiftValue>();
  for (const shift of shiftsResult.data ?? []) {
    shifts.set(cellKey(shift.employeeId, shift.date), {
      start: shift.start,
      end: shift.end,
      templateId: shift.templateId,
    });
  }
  for (const [key, value] of Object.entries(draft)) {
    const { date } = parseCellKey(key);
    if (date < range.from || date > range.to) continue;
    if (value) shifts.set(key, value);
    else shifts.delete(key);
  }

  const coverage = new Map<string, number>();
  const usage = new Map<string, number>();
  for (const [key, value] of shifts) {
    const { date } = parseCellKey(key);
    coverage.set(date, (coverage.get(date) ?? 0) + 1);
    if (value.templateId) usage.set(value.templateId, (usage.get(value.templateId) ?? 0) + 1);
  }

  return {
    view,
    range,
    employees,
    templates,
    shifts,
    coverage,
    usage,
    isLoading: employeesResult.isPending || templatesResult.isPending || shiftsResult.isPending,
    error: employeesResult.error ?? templatesResult.error ?? shiftsResult.error,
  };
}
