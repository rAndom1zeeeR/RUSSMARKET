"use client";
"use no memo"; // @tanstack/react-virtual возвращает нестабильные функции — компилятор тут не нужен

import type { EmployeeDTO } from "@/entities/employee/model/types";
import type { ShiftTone } from "@/entities/shift-template/model/styles";
import type { ShiftTemplateDTO } from "@/entities/shift-template/model/types";
import type { ShiftValue } from "@/entities/shift/model/types";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useRef, type PointerEvent, type ReactNode } from "react";
import { EmployeeCell } from "@/entities/employee/ui/employee-cell";
import { useScheduleStore } from "@/entities/schedule/model/store";
import { cellKey, parseCellKey } from "@/entities/shift/model/cell";
import { type CalendarView, type DateRange, dayOfMonth, weekdayShort } from "@/shared/lib/date";
import { cn } from "@/shared/lib/utils";
import { GridCell } from "./grid-cell";

const EMPLOYEE_COLUMN = 220;
const ROW_HEIGHT = 72;
const COVERAGE_HEIGHT = 48;
const HEADER_HEIGHT = { week: 48, month: 56 } as const;
const DAY_MIN_WIDTH = { week: 88, month: 64 } as const;

interface ScheduleGridProps {
  view: CalendarView;
  range: DateRange;
  employees: EmployeeDTO[];
  shifts: ReadonlyMap<string, ShiftValue>;
  coverage: ReadonlyMap<string, number>;
  templates: ShiftTemplateDTO[];
  /** Слот заголовка дня (меню быстрого назначения подставляется снаружи). */
  renderDayHeader: (date: string, label: ReactNode) => ReactNode;
}

export function ScheduleGrid({
  view,
  range,
  employees,
  shifts,
  coverage,
  templates,
  renderDayHeader,
}: ScheduleGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const selection = useScheduleStore(state => state.selection);
  const setSelection = useScheduleStore(state => state.setSelection);
  const toggleCell = useScheduleStore(state => state.toggleCell);
  const clearSelection = useScheduleStore(state => state.clearSelection);

  const dragRef = useRef<{ anchor: string; base: ReadonlySet<string> } | null>(null);

  const rowVirtualizer = useVirtualizer({
    count: employees.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 4,
  });

  const employeeIndex = new Map(employees.map((employee, index) => [employee.id, index]));
  const dayIndex = new Map(range.days.map((day, index) => [day, index]));
  const toneByTemplate = new Map<string, ShiftTone>(templates.map(template => [template.id, template.color]));

  const columns = `${EMPLOYEE_COLUMN}px repeat(${range.days.length}, minmax(${DAY_MIN_WIDTH[view]}px, 1fr))`;
  const minWidth = EMPLOYEE_COLUMN + range.days.length * DAY_MIN_WIDTH[view];

  const rectKeys = (fromKey: string, toKey: string): string[] => {
    const { employeeId: fromEmployee, date: fromDate } = parseCellKey(fromKey);
    const { employeeId: toEmployee, date: toDate } = parseCellKey(toKey);
    const r1 = employeeIndex.get(fromEmployee);
    const r2 = employeeIndex.get(toEmployee);
    const c1 = dayIndex.get(fromDate);
    const c2 = dayIndex.get(toDate);
    if (r1 === undefined || r2 === undefined || c1 === undefined || c2 === undefined) return [];
    const keys: string[] = [];
    for (let r = Math.min(r1, r2); r <= Math.max(r1, r2); r++) {
      const employee = employees[r];
      if (!employee) continue;
      for (let c = Math.min(c1, c2); c <= Math.max(c1, c2); c++) {
        const day = range.days[c];
        if (day) keys.push(cellKey(employee.id, day));
      }
    }
    return keys;
  };

  const handleCellPointerDown = (event: PointerEvent<HTMLDivElement>, employeeId: string, date: string) => {
    if (event.button !== 0) return;
    const key = cellKey(employeeId, date);
    const state = useScheduleStore.getState();

    if (event.shiftKey && state.selectionAnchor) {
      setSelection(rectKeys(state.selectionAnchor, key));
      return;
    }
    if (event.ctrlKey || event.metaKey) {
      toggleCell(key);
      return;
    }
    if (state.selection.size === 1 && state.selection.has(key)) {
      clearSelection();
      return;
    }
    setSelection([key], key);
    // Протяжка выделения — только с пустой ячейки (с заполненной начинается drag-and-drop).
    if (!shifts.has(key)) dragRef.current = { anchor: key, base: new Set() };
  };

  const handleCellPointerEnter = (employeeId: string, date: string) => {
    const drag = dragRef.current;
    if (!drag) return;
    setSelection(rectKeys(drag.anchor, cellKey(employeeId, date)), drag.anchor);
  };

  useEffect(() => {
    const stop = () => {
      dragRef.current = null;
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") useScheduleStore.getState().clearSelection();
    };
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <div
      ref={scrollRef}
      role="grid"
      aria-label="График смен"
      aria-rowcount={employees.length}
      aria-colcount={range.days.length}
      className={cn(
        "relative min-h-0 flex-1 overflow-auto",
        // В неделе горизонтального скролла нет — вертикальную полосу прячем, чтобы сетка занимала ровно 993 px, как в макете.
        view === "week" && "scrollbar-none [&::-webkit-scrollbar]:hidden"
      )}
    >
      <div style={{ minWidth }}>
        {/* Заголовок */}
        <div
          role="row"
          className="bg-surface border-line sticky top-0 z-20 grid border-b"
          style={{ gridTemplateColumns: columns, height: HEADER_HEIGHT[view] }}
        >
          <div
            role="columnheader"
            className="bg-surface text-muted-foreground sticky left-0 z-10 flex items-center px-3 text-base"
          >
            Сотрудник
          </div>
          {range.days.map(day => (
            <div key={day} role="columnheader" className="flex items-center justify-center">
              {renderDayHeader(
                day,
                view === "week" ? (
                  <span className="text-muted-foreground text-base">
                    {weekdayShort(day)} {dayOfMonth(day)}
                  </span>
                ) : (
                  <span className="flex flex-col items-center text-base leading-5">
                    <span className="text-muted-foreground text-sm">{weekdayShort(day)}</span>
                    <span>{dayOfMonth(day)}</span>
                  </span>
                )
              )}
            </div>
          ))}
        </div>

        {/* Строки сотрудников (виртуализированы) */}
        {employees.length === 0 ? (
          <div className="text-muted-foreground py-16 text-center text-sm">Сотрудники не найдены</div>
        ) : (
          <div className="relative" style={{ height: rowVirtualizer.getTotalSize() }}>
            {rowVirtualizer.getVirtualItems().map(virtualRow => {
              const employee = employees[virtualRow.index];
              if (!employee) return null;
              const striped = virtualRow.index % 2 === 1;
              return (
                <div
                  key={employee.id}
                  role="row"
                  aria-rowindex={virtualRow.index + 1}
                  className={cn("absolute top-0 left-0 grid w-full", striped && "bg-surface-alt")}
                  style={{
                    gridTemplateColumns: columns,
                    height: virtualRow.size,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <div
                    role="rowheader"
                    className={cn(
                      "sticky left-0 z-10 flex items-center px-2",
                      striped ? "bg-surface-alt" : "bg-surface"
                    )}
                  >
                    <EmployeeCell employee={employee} />
                  </div>
                  {range.days.map(day => {
                    const key = cellKey(employee.id, day);
                    const value = shifts.get(key);
                    return (
                      <GridCell
                        key={day}
                        employeeId={employee.id}
                        date={day}
                        value={value}
                        tone={value?.templateId ? (toneByTemplate.get(value.templateId) ?? "custom") : "custom"}
                        selected={selection.has(key)}
                        striped={striped}
                        view={view}
                        onCellPointerDown={handleCellPointerDown}
                        onCellPointerEnter={handleCellPointerEnter}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        {/* Покрытие */}
        <div
          role="row"
          className="bg-surface sticky bottom-0 z-20 grid"
          style={{ gridTemplateColumns: columns, height: COVERAGE_HEIGHT }}
        >
          <div className="bg-surface text-muted-foreground sticky left-0 z-10 flex items-center px-3 text-base">
            Покрытие
          </div>
          {range.days.map(day => {
            const count = coverage.get(day) ?? 0;
            return (
              <div
                key={day}
                role="gridcell"
                aria-label={`Покрытие ${day}: ${count}`}
                className={cn(
                  "flex items-center justify-center text-base transition-colors",
                  count > 0 ? "bg-brand-soft text-brand-ink" : "bg-danger-soft text-danger"
                )}
              >
                {count}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
