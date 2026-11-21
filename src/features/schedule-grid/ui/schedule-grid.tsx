"use client";
"use no memo"; // @tanstack/react-virtual возвращает нестабильные функции — компилятор тут не нужен

import type { EmployeeDTO } from "@/entities/employee/model/types";
import type { ShiftTone } from "@/entities/shift-template/model/styles";
import type { ShiftTemplateDTO } from "@/entities/shift-template/model/types";
import type { ShiftValue } from "@/entities/shift/model/types";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { EmployeeCell } from "@/entities/employee/ui/employee-cell";
import { useScheduleStore } from "@/entities/schedule/model/store";
import { cellKey, parseCellKey } from "@/entities/shift/model/cell";
import { type CalendarView, type DateRange, dayOfMonth, weekdayShort } from "@/shared/lib/date";
import { formatRangeFull } from "@/shared/lib/time";
import { useBreakpoint, type Breakpoint } from "@/shared/lib/use-breakpoint";
import { cn } from "@/shared/lib/utils";
import { GridCell } from "./grid-cell";

const COVERAGE_HEIGHT = 48;
const HEADER_HEIGHT = { week: 48, month: 56 } as const;

/** Размеры сетки по брейкпоинтам: lg — как в макете (220 / 72 / 88 / 64), на узких — компактнее. */
const GRID_SIZES: Record<
  Breakpoint,
  { employeeColumn: number; rowHeight: number; dayMin: Record<CalendarView, number> }
> = {
  sm: { employeeColumn: 116, rowHeight: 64, dayMin: { week: 60, month: 44 } },
  md: { employeeColumn: 180, rowHeight: 72, dayMin: { week: 76, month: 52 } },
  lg: { employeeColumn: 220, rowHeight: 72, dayMin: { week: 88, month: 64 } },
};

/** lg, но карточка уже не вмещает недельную сетку из макета (≈ 1200–1500 px экрана) — берём компактнее. */
const LG_COMPACT = { employeeColumn: 168, rowHeight: 72, dayMin: { week: 64, month: 52 } } as const;
const LG_FULL_WIDTH = 836;

interface ScheduleGridProps {
  view: CalendarView;
  range: DateRange;
  employees: EmployeeDTO[];
  shifts: ReadonlyMap<string, ShiftValue>;
  coverage: ReadonlyMap<string, number>;
  templates: ShiftTemplateDTO[];
  /** Слот заголовка дня (меню быстрого назначения подставляется снаружи). */
  renderDayHeader: (date: string, label: ReactNode) => ReactNode;
  /** Показаны данные прошлого периода, пока грузится новый: сетка приглушается и помечается `aria-busy`. */
  busy?: boolean;
}

export function ScheduleGrid({
  view,
  range,
  employees,
  shifts,
  coverage,
  templates,
  renderDayHeader,
  busy = false,
}: ScheduleGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const selection = useScheduleStore(state => state.selection);
  const setSelection = useScheduleStore(state => state.setSelection);
  const toggleCell = useScheduleStore(state => state.toggleCell);

  const dragRef = useRef<{ anchor: string } | null>(null);

  const breakpoint = useBreakpoint();
  // Ширина области сетки: по ней на lg выбираем полный или компактный вариант.
  const [areaWidth, setAreaWidth] = useState(Number.POSITIVE_INFINITY);
  const { employeeColumn, rowHeight, dayMin } =
    breakpoint === "lg" && areaWidth < LG_FULL_WIDTH ? LG_COMPACT : GRID_SIZES[breakpoint];

  // Горизонтальная прокрутка есть → полосы нужны; нет → прячем, чтобы сетка занимала всю ширину карточки.
  const [scrollsX, setScrollsX] = useState(false);

  const rowVirtualizer = useVirtualizer({
    count: employees.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan: 4,
  });

  useEffect(() => {
    rowVirtualizer.measure();
  }, [rowHeight, rowVirtualizer]);

  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (!element) return undefined;
    const update = () => {
      setAreaWidth(element.getBoundingClientRect().width);
      setScrollsX(element.scrollWidth > element.clientWidth + 1);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    if (element.firstElementChild) observer.observe(element.firstElementChild);
    return () => observer.disconnect();
  }, [view, range.days.length, employeeColumn, dayMin]);

  const employeeIndex = new Map(employees.map((employee, index) => [employee.id, index]));
  const dayIndex = new Map(range.days.map((day, index) => [day, index]));
  const toneByTemplate = new Map<string, ShiftTone>(templates.map(template => [template.id, template.color]));

  const columns = `${employeeColumn}px repeat(${range.days.length}, minmax(${dayMin[view]}px, 1fr))`;
  const minWidth = employeeColumn + range.days.length * dayMin[view];

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

  // Актуальные значения для стабильных обработчиков ячеек: ссылки на функции не меняются между рендерами,
  // поэтому `memo(GridCell)` пропускает ячейки, у которых ничего не изменилось.
  const latest = useRef({ shifts, rectKeys });
  useLayoutEffect(() => {
    latest.current = { shifts, rectKeys };
  });

  const handleCellPointerDown = useCallback((event: PointerEvent<HTMLDivElement>, employeeId: string, date: string) => {
    if (event.button !== 0) return;
    const key = cellKey(employeeId, date);
    const state = useScheduleStore.getState();

    // Тач: тап добавляет/убирает ячейку (нет Ctrl и протяжки — они конфликтуют со скроллом).
    if (event.pointerType === "touch") {
      state.toggleCell(key);
      return;
    }

    if (event.shiftKey && state.selectionAnchor) {
      state.setSelection(latest.current.rectKeys(state.selectionAnchor, key));
      return;
    }
    if (event.ctrlKey || event.metaKey) {
      state.toggleCell(key);
      return;
    }
    if (state.selection.size === 1 && state.selection.has(key)) {
      state.clearSelection();
      return;
    }
    state.setSelection([key], key);
    // Протяжка выделения — только с пустой ячейки (с заполненной начинается drag-and-drop).
    if (!latest.current.shifts.has(key)) dragRef.current = { anchor: key };
  }, []);

  const handleCellPointerEnter = useCallback((employeeId: string, date: string) => {
    const drag = dragRef.current;
    if (!drag) return;
    useScheduleStore
      .getState()
      .setSelection(latest.current.rectKeys(drag.anchor, cellKey(employeeId, date)), drag.anchor);
  }, []);

  // --- Клавиатура: roving tabindex, стрелки, Home/End, Space/Enter — выделить, Shift+стрелки — диапазон.
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const handleCellFocus = useCallback((key: string) => setFocusKey(key), []);

  const firstEmployee = employees[0];
  const firstDay = range.days[0];
  const firstKey = firstEmployee && firstDay ? cellKey(firstEmployee.id, firstDay) : null;
  const focusParsed = focusKey === null ? null : parseCellKey(focusKey);
  // Ячейка, на которой был фокус, могла исчезнуть (поиск, смена периода) — тогда табуляция возвращается к первой.
  const tabbableKey =
    focusParsed && employeeIndex.has(focusParsed.employeeId) && dayIndex.has(focusParsed.date) ? focusKey : firstKey;

  const focusCell = (key: string, row: number) => {
    setFocusKey(key);
    rowVirtualizer.scrollToIndex(row);
    // Строка может быть ещё не отрисована (виртуализация) — ждём её несколько кадров.
    let attempts = 0;
    const attempt = () => {
      const element = scrollRef.current?.querySelector<HTMLElement>(`[data-cell="${CSS.escape(key)}"]`);
      if (element) {
        element.focus();
        element.scrollIntoView({ block: "nearest", inline: "nearest" });
      } else if (attempts++ < 10) {
        requestAnimationFrame(attempt);
      }
    };
    attempt();
  };

  const handleGridKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const element = event.target instanceof HTMLElement ? event.target.closest<HTMLElement>("[data-cell]") : null;
    const key = element?.dataset.cell;
    if (!key) return;
    const { employeeId, date } = parseCellKey(key);
    const row = employeeIndex.get(employeeId);
    const column = dayIndex.get(date);
    if (row === undefined || column === undefined) return;

    let nextRow = row;
    let nextColumn = column;
    switch (event.key) {
      case "ArrowUp":
        nextRow = row - 1;
        break;
      case "ArrowDown":
        nextRow = row + 1;
        break;
      case "ArrowLeft":
        nextColumn = column - 1;
        break;
      case "ArrowRight":
        nextColumn = column + 1;
        break;
      case "Home":
        nextColumn = 0;
        break;
      case "End":
        nextColumn = range.days.length - 1;
        break;
      case " ":
      case "Enter":
        event.preventDefault();
        toggleCell(key);
        return;
      default:
        return;
    }

    event.preventDefault();
    nextRow = Math.min(Math.max(nextRow, 0), employees.length - 1);
    nextColumn = Math.min(Math.max(nextColumn, 0), range.days.length - 1);
    const nextEmployee = employees[nextRow];
    const nextDay = range.days[nextColumn];
    if (!nextEmployee || !nextDay) return;
    const nextKey = cellKey(nextEmployee.id, nextDay);
    if (nextKey === key) return;

    if (event.shiftKey) {
      const anchor = useScheduleStore.getState().selectionAnchor ?? key;
      setSelection(rectKeys(anchor, nextKey), anchor);
    }
    focusCell(nextKey, nextRow);
  };

  useEffect(() => {
    const stop = () => {
      dragRef.current = null;
    };
    const onKeyDown = (event: KeyboardEvent) => {
      // Esc, который уже обработал попап или диалог (они вызывают preventDefault), выделение не трогает.
      if (event.key === "Escape" && !event.defaultPrevented) useScheduleStore.getState().clearSelection();
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
      aria-busy={busy}
      tabIndex={-1}
      onKeyDown={handleGridKeyDown}
      className={cn(
        "relative max-h-[70dvh] min-h-0 flex-none overflow-auto transition-opacity lg:max-h-none lg:flex-1",
        !scrollsX && "scrollbar-none [&::-webkit-scrollbar]:hidden",
        busy && "opacity-60"
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
            className="bg-surface text-muted-foreground sticky left-0 z-10 flex items-center px-2 text-sm md:px-3 md:text-base"
          >
            Сотрудник
          </div>
          {range.days.map(day => (
            <div key={day} role="columnheader" className="flex items-center justify-center">
              {renderDayHeader(
                day,
                view === "week" ? (
                  <span className="text-muted-foreground text-sm md:text-base">
                    {weekdayShort(day)} {dayOfMonth(day)}
                  </span>
                ) : (
                  <span className="flex flex-col items-center text-sm leading-5 md:text-base">
                    <span className="text-muted-foreground text-xs md:text-sm">{weekdayShort(day)}</span>
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
                      "sticky left-0 z-10 flex items-center px-1.5 md:px-2",
                      striped ? "bg-surface-alt" : "bg-surface"
                    )}
                  >
                    <EmployeeCell employee={employee} />
                  </div>
                  {range.days.map(day => {
                    const key = cellKey(employee.id, day);
                    const value = shifts.get(key);
                    const label = `${employee.fullName}, ${weekdayShort(day)} ${dayOfMonth(day)}: ${
                      value ? formatRangeFull(value.start, value.end) : "нет смены"
                    }`;
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
                        label={label}
                        tabbable={key === tabbableKey}
                        onCellFocus={handleCellFocus}
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
          <div className="bg-surface text-muted-foreground sticky left-0 z-10 flex items-center px-2 text-sm md:px-3 md:text-base">
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
                  "flex items-center justify-center text-sm transition-colors md:text-base",
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
